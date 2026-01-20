import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import jwt from 'jsonwebtoken';

// POST /api/auth/dev-login - Development-only login bypass
// Usage: POST with { "email": "admin@test.com", "devKey": "ice-deaths-dev-2024" }
export async function POST(request: NextRequest) {
  // Only allow in development or with specific dev key
  const isDev = process.env.NODE_ENV === 'development';
  const devKeyAllowed = process.env.DEV_LOGIN_KEY;
  
  if (!isDev && !devKeyAllowed) {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }
  
  try {
    const { email, devKey } = await request.json();
    
    // Verify dev key if in production
    if (!isDev && devKey !== devKeyAllowed) {
      return NextResponse.json({ error: 'Invalid dev key' }, { status: 401 });
    }
    
    // Find or create user
    let userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    let user = userResult.rows[0];
    
    if (!user) {
      // Create admin user for dev
      const createResult = await pool.query(
        `INSERT INTO users (email, name, role, email_verified) 
         VALUES ($1, $2, 'admin', true) 
         RETURNING *`,
        [email, email.split('@')[0]]
      );
      user = createResult.rows[0];
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        role: user.role 
      },
      process.env.AUTH_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );
    
    // Set cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    });
    
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    return response;
  } catch (error) {
    console.error('Dev login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
