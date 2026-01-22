import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/next-auth';
import pool from '@/lib/db';
import crypto from 'crypto';

/**
 * Generate an extension token for the authenticated user
 * 
 * This token can be used by the browser extension to make API calls
 * without requiring the user to stay logged into the website.
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated via NextAuth session
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const extensionId = body.extensionId || 'unknown';

    // Get user from database
    const userResult = await pool.query(
      'SELECT id, email, role, name FROM users WHERE email = $1',
      [session.user.email]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // Generate a secure token
    const token = `ext_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Store the token in the database
    // First, check if extension_tokens table exists, if not create it
    await pool.query(`
      CREATE TABLE IF NOT EXISTS extension_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        extension_id TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        last_used_at TIMESTAMP,
        revoked BOOLEAN DEFAULT FALSE
      )
    `);

    // Create index if not exists
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_extension_tokens_token ON extension_tokens(token)
    `);

    // Revoke any existing tokens for this user/extension combo
    await pool.query(
      `UPDATE extension_tokens SET revoked = TRUE 
       WHERE user_id = $1 AND extension_id = $2 AND revoked = FALSE`,
      [user.id, extensionId]
    );

    // Insert new token
    await pool.query(
      `INSERT INTO extension_tokens (user_id, token, extension_id, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, token, extensionId, expiresAt]
    );

    console.log(`[Extension Auth] Generated token for user ${user.email}, extension ${extensionId}`);

    return NextResponse.json({
      token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.email.split('@')[0],
        role: user.role
      }
    });

  } catch (error) {
    console.error('[Extension Auth] Error generating token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}

/**
 * Validate an extension token
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  request.headers.get('x-extension-token');

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    // Look up the token
    const result = await pool.query(
      `SELECT et.*, u.email, u.role, u.name
       FROM extension_tokens et
       JOIN users u ON et.user_id = u.id
       WHERE et.token = $1 AND et.revoked = FALSE AND et.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const tokenData = result.rows[0];

    // Update last used timestamp
    await pool.query(
      'UPDATE extension_tokens SET last_used_at = NOW() WHERE id = $1',
      [tokenData.id]
    );

    return NextResponse.json({
      valid: true,
      user: {
        id: tokenData.user_id,
        email: tokenData.email,
        name: tokenData.name || tokenData.email.split('@')[0],
        role: tokenData.role
      },
      expiresAt: tokenData.expires_at
    });

  } catch (error) {
    console.error('[Extension Auth] Error validating token:', error);
    return NextResponse.json(
      { error: 'Failed to validate token' },
      { status: 500 }
    );
  }
}
