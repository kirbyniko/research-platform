import { Pool } from 'pg';

// Handle missing DATABASE_URL during build
const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV !== 'production') {
  console.warn('DATABASE_URL not set - database features will be unavailable');
}

const pool = new Pool({
  connectionString: connectionString || 'postgresql://localhost:5432/fallback',
  // Don't fail immediately if connection is bad during build
  max: connectionString ? 20 : 0,
});

export default pool;
