import { NextRequest, NextResponse } from 'next/server';
import descopeClient from '@/lib/descope';

export interface DescopeUser {
  id: number;
  email: string;
  name: string | null;
  role: 'admin' | 'editor' | 'viewer';
}

export async function requireDescopeAuth(role?: 'admin' | 'editor' | 'viewer') {
  return async (request: NextRequest): Promise<{ user: DescopeUser } | { error: string; status: number }> => {
    try {
      // Get token from Authorization header
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');

      console.log('[descope-auth] Token present:', !!token);

      if (!token) {
        return { error: 'Unauthorized', status: 401 };
      }

      // Decode JWT (already validated by Descope client-side)
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      );

      const email = payload.email || payload.sub;
      const descopeId = payload.sub;

      console.log('[descope-auth] JWT - email:', email, 'descopeId:', descopeId);

      // Get user from database
      const pool = (await import('@/lib/db')).default;
      const client = await pool.connect();
      
      try {
        const result = await client.query(
          'SELECT id, email, name, role FROM users WHERE descope_id = $1 OR email = $2',
          [descopeId, email]
        );

        console.log('[descope-auth] DB rows found:', result.rows.length);

        if (result.rows.length === 0) {
          return { error: 'User not found', status: 404 };
        }

        const user = result.rows[0];
        console.log('[descope-auth] User:', user.email, 'role:', user.role);

        // Check role requirement
        if (role) {
          const roleHierarchy = { viewer: 1, editor: 2, admin: 3 };
          const requiredLevel = roleHierarchy[role];
          const userLevel = roleHierarchy[user.role as keyof typeof roleHierarchy];

          if (userLevel < requiredLevel) {
            return { error: 'Insufficient permissions', status: 403 };
          }
        }

        return { user };
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Auth error:', error);
      return { error: 'Authentication failed', status: 500 };
    }
  };
}
