import { NextRequest } from 'next/server';
import { auth } from '@/lib/next-auth';
import { getUserFromToken, getUserFromApiKey } from '@/lib/auth';
import pool from '@/lib/db';

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  role: 'guest' | 'user' | 'analyst' | 'admin' | 'editor' | 'viewer';
}

type RoleLevel = 'guest' | 'viewer' | 'user' | 'editor' | 'analyst' | 'admin';

const roleHierarchy: Record<RoleLevel, number> = {
  guest: 0,
  viewer: 1,
  user: 2,
  editor: 3,
  analyst: 4,
  admin: 5,
};

/**
 * Get user from extension token
 */
async function getUserFromExtensionToken(token: string): Promise<AuthUser | null> {
  try {
    const result = await pool.query(
      `SELECT et.user_id, u.email, u.role, u.name
       FROM extension_tokens et
       JOIN users u ON et.user_id = u.id
       WHERE et.token = $1 AND et.revoked = FALSE AND et.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    
    // Update last used timestamp (fire and forget)
    pool.query(
      'UPDATE extension_tokens SET last_used_at = NOW() WHERE token = $1',
      [token]
    ).catch(() => {});

    return {
      id: row.user_id,
      email: row.email,
      name: row.name || null,
      role: row.role as RoleLevel,
    };
  } catch (error) {
    console.error('[getUserFromExtensionToken] Error:', error);
    return null;
  }
}

/**
 * Unified authentication function that checks NextAuth session,
 * Bearer tokens (API keys and JWTs), and legacy cookies.
 */
export async function requireServerAuth(
  request: NextRequest,
  requiredRole?: RoleLevel
): Promise<{ user: AuthUser } | { error: string; status: number }> {
  try {
    // 1. Check NextAuth session first
    const session = await auth();
    if (session?.user) {
      const user: AuthUser = {
        id: (session.user as { id?: number }).id || 0,
        email: session.user.email!,
        name: session.user.name || null,
        role: ((session.user as { role?: string }).role || 'user') as RoleLevel,
      };

      console.log('[requireServerAuth] User from session:', user);
      console.log('[requireServerAuth] Required role:', requiredRole);
      console.log('[requireServerAuth] User role level:', roleHierarchy[user.role]);
      console.log('[requireServerAuth] Required role level:', requiredRole ? roleHierarchy[requiredRole] : 'none');

      // Check role requirement
      if (requiredRole && !hasRequiredRole(user.role, requiredRole)) {
        console.log('[requireServerAuth] Role check FAILED');
        return { error: 'Insufficient permissions', status: 403 };
      }

      console.log('[requireServerAuth] Role check PASSED');
      return { user };
    }

    // 2. Check Bearer token (API key, extension token, or legacy JWT)
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // Check if it's a database API key (starts with 'ice_')
      if (token.startsWith('ice_')) {
        const apiKeyUser = await getUserFromApiKey(token);
        if (apiKeyUser) {
          const user: AuthUser = {
            id: apiKeyUser.id,
            email: apiKeyUser.email,
            name: apiKeyUser.name,
            role: apiKeyUser.role as RoleLevel,
          };

          if (requiredRole && !hasRequiredRole(user.role, requiredRole)) {
            return { error: 'Insufficient permissions', status: 403 };
          }

          return { user };
        }
        return { error: 'Invalid or expired API key', status: 401 };
      }

      // Check if it's an extension token (starts with 'ext_')
      if (token.startsWith('ext_')) {
        const extUser = await getUserFromExtensionToken(token);
        if (extUser) {
          if (requiredRole && !hasRequiredRole(extUser.role, requiredRole)) {
            return { error: 'Insufficient permissions', status: 403 };
          }
          return { user: extUser };
        }
        return { error: 'Invalid or expired extension token', status: 401 };
      }

      // Try as legacy JWT
      const jwtUser = await getUserFromToken(token);
      if (jwtUser) {
        const user: AuthUser = {
          id: jwtUser.id,
          email: jwtUser.email,
          name: jwtUser.name,
          role: jwtUser.role as RoleLevel,
        };

        if (requiredRole && !hasRequiredRole(user.role, requiredRole)) {
          return { error: 'Insufficient permissions', status: 403 };
        }

        return { user };
      }
    }
    
    // 2b. Check X-API-Key or X-Extension-Token header (used by browser extension)
    const xApiKey = request.headers.get('X-API-Key');
    const xExtToken = request.headers.get('X-Extension-Token');
    
    if (xExtToken && xExtToken.startsWith('ext_')) {
      const extUser = await getUserFromExtensionToken(xExtToken);
      if (extUser) {
        if (requiredRole && !hasRequiredRole(extUser.role, requiredRole)) {
          return { error: 'Insufficient permissions', status: 403 };
        }
        return { user: extUser };
      }
      return { error: 'Invalid or expired extension token', status: 401 };
    }
    
    if (xApiKey && xApiKey.startsWith('ice_')) {
      const apiKeyUser = await getUserFromApiKey(xApiKey);
      if (apiKeyUser) {
        const user: AuthUser = {
          id: apiKeyUser.id,
          email: apiKeyUser.email,
          name: apiKeyUser.name,
          role: apiKeyUser.role as RoleLevel,
        };

        if (requiredRole && !hasRequiredRole(user.role, requiredRole)) {
          return { error: 'Insufficient permissions', status: 403 };
        }

        return { user };
      }
      return { error: 'Invalid or expired API key', status: 401 };
    }

    // 3. Check legacy auth_token cookie
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map(c => {
          const [key, ...val] = c.trim().split('=');
          return [key, val.join('=')];
        })
      );

      if (cookies.auth_token) {
        const cookieUser = await getUserFromToken(cookies.auth_token);
        if (cookieUser) {
          const user: AuthUser = {
            id: cookieUser.id,
            email: cookieUser.email,
            name: cookieUser.name,
            role: cookieUser.role as RoleLevel,
          };

          if (requiredRole && !hasRequiredRole(user.role, requiredRole)) {
            return { error: 'Insufficient permissions', status: 403 };
          }

          return { user };
        }
      }
    }

    return { error: 'Unauthorized', status: 401 };
  } catch (error) {
    console.error('[requireServerAuth] Error:', error);
    return { error: 'Authentication failed', status: 500 };
  }
}

/**
 * Optional authentication - returns user if authenticated, null if not.
 * Never returns an error for unauthenticated requests.
 */
export async function optionalServerAuth(
  request: NextRequest
): Promise<{ user: AuthUser | null }> {
  const result = await requireServerAuth(request);
  if ('error' in result) {
    return { user: null };
  }
  return result;
}

function hasRequiredRole(userRole: RoleLevel, requiredRole: RoleLevel): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Legacy wrapper for backward compatibility.
 * Returns a function that can be called with a request.
 */
export function requireAuth(requiredRole?: RoleLevel) {
  return async (request: NextRequest) => {
    return requireServerAuth(request, requiredRole);
  };
}
