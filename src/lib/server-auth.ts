import { NextRequest } from 'next/server';
import { auth } from '@/lib/next-auth';
import { getUserFromToken, getUserFromApiKey } from '@/lib/auth';

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

    // 2. Check Bearer token (API key or legacy JWT)
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
