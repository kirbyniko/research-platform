import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import pool from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface User {
  id: number;
  email: string;
  name: string | null;
  role: 'admin' | 'editor' | 'viewer';
  email_verified: boolean;
}

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

export async function createUser(email: string, password: string, name?: string): Promise<{ user?: User; error?: string; verificationToken?: string }> {
  const client = await pool.connect();
  try {
    // Check if email exists
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return { error: 'Email already registered' };
    }

    const passwordHash = await hashPassword(password);
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Check if this is the admin email
    const isAdmin = email === process.env.ADMIN_EMAIL;
    const role = isAdmin ? 'admin' : 'viewer';

    const result = await client.query(
      `INSERT INTO users (email, password_hash, name, role, verification_token, verification_expires)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, name, role, email_verified`,
      [email, passwordHash, name || null, role, verificationToken, verificationExpires]
    );

    return {
      user: result.rows[0],
      verificationToken,
    };
  } finally {
    client.release();
  }
}

export async function verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE users 
       SET email_verified = TRUE, verification_token = NULL, verification_expires = NULL
       WHERE verification_token = $1 AND verification_expires > NOW()
       RETURNING id`,
      [token]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Invalid or expired verification token' };
    }

    return { success: true };
  } finally {
    client.release();
  }
}

export async function loginUser(email: string, password: string): Promise<{ user?: User; token?: string; error?: string }> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, email, password_hash, name, role, email_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return { error: 'Invalid email or password' };
    }

    const user = result.rows[0];
    const validPassword = await verifyPassword(password, user.password_hash);

    if (!validPassword) {
      return { error: 'Invalid email or password' };
    }

    if (!user.email_verified) {
      return { error: 'Please verify your email before logging in' };
    }

    // Update last login
    await client.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        email_verified: user.email_verified,
      },
      token,
    };
  } finally {
    client.release();
  }
}

export async function getUserFromToken(token: string): Promise<User | null> {
  const payload = verifyToken(token);
  if (!payload) return null;

  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, email, name, role, email_verified FROM users WHERE id = $1',
      [payload.userId]
    );

    if (result.rows.length === 0) return null;

    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function requestPasswordReset(email: string): Promise<{ success: boolean; resetToken?: string }> {
  const client = await pool.connect();
  try {
    const resetToken = generateVerificationToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const result = await client.query(
      `UPDATE users SET reset_token = $1, reset_expires = $2 WHERE email = $3 RETURNING id`,
      [resetToken, resetExpires, email]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists
      return { success: true };
    }

    return { success: true, resetToken };
  } finally {
    client.release();
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const client = await pool.connect();
  try {
    const passwordHash = await hashPassword(newPassword);

    const result = await client.query(
      `UPDATE users 
       SET password_hash = $1, reset_token = NULL, reset_expires = NULL
       WHERE reset_token = $2 AND reset_expires > NOW()
       RETURNING id`,
      [passwordHash, token]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Invalid or expired reset token' };
    }

    return { success: true };
  } finally {
    client.release();
  }
}

// Middleware helper to check authentication
export function requireAuth(requiredRole?: 'admin' | 'editor' | 'viewer') {
  return async (request: Request): Promise<{ user: User } | { error: string; status: number }> => {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Unauthorized', status: 401 };
    }

    const token = authHeader.substring(7);
    const user = await getUserFromToken(token);

    if (!user) {
      return { error: 'Invalid or expired token', status: 401 };
    }

    if (!user.email_verified) {
      return { error: 'Email not verified', status: 403 };
    }

    if (requiredRole) {
      const roleHierarchy = { admin: 3, editor: 2, viewer: 1 };
      if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
        return { error: 'Insufficient permissions', status: 403 };
      }
    }

    return { user };
  };
}
