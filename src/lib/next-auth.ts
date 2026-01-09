import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import pool from './db';

// Types are extended in src/types/next-auth.d.ts

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  debug: true, // Enable debug logging
  callbacks: {
    async signIn({ user, account }) {
      console.log('[NextAuth] signIn callback triggered for:', user.email);
      if (!user.email) {
        console.error('[NextAuth] signIn failed: no email');
        return false;
      }
      
      try {
        // Check if user exists in our database
        const result = await pool.query(
          'SELECT id, role FROM users WHERE email = $1',
          [user.email]
        );

        // Determine role: admin if it's the ADMIN_EMAIL, otherwise 'user'
        const isAdmin = user.email === process.env.ADMIN_EMAIL;
        const defaultRole = isAdmin ? 'admin' : 'user';

        if (result.rows.length === 0) {
          // Create new user
          await pool.query(
            `INSERT INTO users (email, name, role, email_verified, auth_provider) 
             VALUES ($1, $2, $3, true, 'google')`,
            [user.email, user.name, defaultRole]
          );
          console.log(`Created new ${defaultRole} user:`, user.email);
        } else {
          // Update existing user's auth provider
          // If user is admin email and not already admin, upgrade them
          if (isAdmin && result.rows[0].role !== 'admin') {
            await pool.query(
              `UPDATE users SET auth_provider = 'google', name = COALESCE($2, name), role = 'admin' WHERE email = $1`,
              [user.email, user.name]
            );
            console.log('Upgraded user to admin:', user.email);
          } else {
            await pool.query(
              `UPDATE users SET auth_provider = 'google', name = COALESCE($2, name) WHERE email = $1`,
              [user.email, user.name]
            );
          }
        }
        
        return true;
      } catch (error) {
        console.error('Error during sign in:', error);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user?.email) {
        // Fetch user role from database
        try {
          const result = await pool.query(
            'SELECT id, role, name FROM users WHERE email = $1',
            [user.email]
          );
          if (result.rows.length > 0) {
            token.userId = result.rows[0].id;
            token.role = result.rows[0].role;
            token.dbName = result.rows[0].name;
            console.log('[NextAuth] JWT callback - user loaded:', { 
              email: user.email, 
              id: token.userId, 
              role: token.role 
            });
          } else {
            console.warn('[NextAuth] JWT callback - user not found in DB:', user.email);
          }
        } catch (error) {
          console.error('[NextAuth] Error fetching user role:', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Extend session with custom fields - cast to unknown first to avoid type overlap errors
        const extendedUser = session.user as unknown as { id?: number; role?: string; name?: string | null };
        extendedUser.id = token.userId as number | undefined;
        extendedUser.role = token.role as string | undefined;
        if (token.dbName) {
          extendedUser.name = token.dbName as string;
        }
        console.log('[NextAuth] Session callback:', { 
          email: session.user.email, 
          id: extendedUser.id, 
          role: extendedUser.role 
        });
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  session: {
    strategy: 'jwt',
  },
  trustHost: true,
});
