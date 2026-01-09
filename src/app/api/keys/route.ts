import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireServerAuth } from '@/lib/server-auth';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';
import crypto from 'crypto';

// Helper to get current user from auth result
async function getCurrentUser(request: NextRequest) {
  try {
    const authResult = await requireServerAuth(request, 'user');
    if ('error' in authResult) {
      console.log('getCurrentUser: Auth failed with error:', authResult.error);
      return null;
    }
    console.log('getCurrentUser: Auth successful for user:', authResult.user.email);
    return authResult.user;
  } catch (error) {
    console.error('getCurrentUser: Exception during auth:', error);
    return null;
  }
}

// Get user from API key
async function getUserFromApiKey(apiKey: string) {
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  const result = await pool.query(`
    SELECT u.id, u.email, u.name, u.role, ak.permissions, ak.expires_at
    FROM api_keys ak
    JOIN users u ON ak.user_id = u.id
    WHERE ak.key_hash = $1 
      AND ak.revoked = false 
      AND ak.expires_at > NOW()
  `, [keyHash]);
  
  if (result.rows[0]) {
    // Update last_used_at
    await pool.query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = $1',
      [keyHash]
    );
    return result.rows[0];
  }
  return null;
}

// Generate a new API key
function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomBytes = crypto.randomBytes(24);
  const key = 'ice_' + randomBytes.toString('base64url');
  const prefix = key.slice(0, 8);
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return { key, prefix, hash };
}

// GET - List user's API keys
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const result = await pool.query(`
      SELECT 
        id, 
        key_prefix, 
        name, 
        permissions,
        expires_at, 
        last_used_at, 
        revoked,
        created_at
      FROM api_keys 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [user.id]);
    
    return NextResponse.json({
      keys: result.rows,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }
}

// POST - Create a new API key
export async function POST(request: NextRequest) {
  // Rate limit: 10 key creations per day
  const rateLimitResponse = rateLimit(request, RateLimitPresets.apiKeyCreation, 'api-key-create');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      console.error('API Keys POST: No user found in session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('API Keys POST: User authenticated:', { id: user.id, email: user.email, role: user.role });
    
    // Only users with role >= 'user' can create keys
    if (!['user', 'analyst', 'admin'].includes(user.role)) {
      console.error('API Keys POST: Insufficient role:', user.role);
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const body = await request.json();
    const { name, expiresInDays = 30 } = body;
    
    console.log('API Keys POST: Request body:', { name, expiresInDays });
    
    if (!name || name.length < 3) {
      console.error('API Keys POST: Invalid key name:', name);
      return NextResponse.json({ error: 'Key name must be at least 3 characters' }, { status: 400 });
    }
    
    // Limit expiration to max 90 days for non-admins
    const maxDays = user.role === 'admin' ? 365 : 90;
    const days = Math.min(expiresInDays, maxDays);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    
    // Generate the key
    const { key, prefix, hash } = generateApiKey();
    
    // Determine permissions based on role
    const permissions = user.role === 'analyst' || user.role === 'admin' 
      ? ['submit', 'verify', 'analyze']
      : ['submit'];
    
    // Check existing key count (limit to 5 active keys)
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM api_keys WHERE user_id = $1 AND revoked = false AND expires_at > NOW()',
      [user.id]
    );
    
    if (parseInt(countResult.rows[0].count) >= 5 && user.role !== 'admin') {
      return NextResponse.json({ error: 'Maximum 5 active keys allowed' }, { status: 400 });
    }
    
    // Insert the key
    const result = await pool.query(`
      INSERT INTO api_keys (user_id, key_hash, key_prefix, name, permissions, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, key_prefix, name, permissions, expires_at, created_at
    `, [user.id, hash, prefix, name, JSON.stringify(permissions), expiresAt]);
    
    console.log('API Keys POST: Key created successfully:', result.rows[0]);
    
    return NextResponse.json({
      message: 'API key created successfully',
      key: key, // Only returned once! User must save it.
      keyData: result.rows[0],
      warning: 'Save this key now. It will not be shown again.'
    });
    
  } catch (error) {
    console.error('Error creating API key:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json({ 
      error: 'Failed to create API key', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// DELETE - Revoke an API key
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');
    
    if (!keyId) {
      return NextResponse.json({ error: 'Key ID required' }, { status: 400 });
    }
    
    // Only allow users to revoke their own keys (or admin can revoke any)
    const whereClause = user.role === 'admin' 
      ? 'id = $1'
      : 'id = $1 AND user_id = $2';
    const params = user.role === 'admin' ? [keyId] : [keyId, user.id];
    
    const result = await pool.query(`
      UPDATE api_keys 
      SET revoked = true, revoked_at = NOW()
      WHERE ${whereClause}
      RETURNING id, key_prefix
    `, params);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Key not found or access denied' }, { status: 404 });
    }
    
    return NextResponse.json({
      message: 'API key revoked successfully',
      key: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error revoking API key:', error);
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }
}
