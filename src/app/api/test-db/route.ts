import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query('SELECT NOW()');
    return NextResponse.json({ 
      success: true, 
      time: result.rows[0].now,
      dbConfigured: !!process.env.DATABASE_URL 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      dbUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
    }, { status: 500 });
  }
}
