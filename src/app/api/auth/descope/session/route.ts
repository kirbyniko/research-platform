import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { sessionToken } = await request.json();

    if (!sessionToken) {
      console.error('No session token provided');
      return NextResponse.json(
        { error: 'Session token required' },
        { status: 400 }
      );
    }

    // Decode JWT without validation (client-side validation already done)
    let payload;
    try {
      payload = JSON.parse(
        Buffer.from(sessionToken.split('.')[1], 'base64').toString()
      );
      console.log('Decoded JWT payload:', payload);
    } catch (decodeError) {
      console.error('JWT decode error:', decodeError);
      return NextResponse.json(
        { error: 'Invalid session token' },
        { status: 400 }
      );
    }

    const email = payload.email || payload.sub;
    const name = payload.name || email?.split('@')[0];
    const descopeId = payload.sub;

    console.log('User info from JWT:', { email, name, descopeId });

    // Check if user exists in our database
    const client = await pool.connect();
    try {
      console.log('Querying database for user:', email);
      let userResult = await client.query(
        'SELECT id, email, name, role, descope_id FROM users WHERE email = $1 OR descope_id = $2',
        [email, descopeId]
      );

      console.log('User query result:', userResult.rows);
      let user;

      if (userResult.rows.length === 0) {
        // Create new user
        const role = email === process.env.ADMIN_EMAIL ? 'admin' : 'editor';
        
        console.log('Creating new user with role:', role);
        const insertResult = await client.query(
          `INSERT INTO users (email, name, role, email_verified, descope_id) 
           VALUES ($1, $2, $3, true, $4) 
           RETURNING id, email, name, role`,
          [email, name, role, descopeId]
        );
        
        user = insertResult.rows[0];
        console.log('Created user:', user);
      } else {
        user = userResult.rows[0];
        console.log('Found existing user:', user);
        
        // Update descope_id if not set
        if (!user.descope_id) {
          console.log('Updating descope_id for user');
          await client.query(
            'UPDATE users SET descope_id = $1 WHERE id = $2',
            [descopeId, user.id]
          );
        }
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Descope session validation error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Session validation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
