import { redirect, notFound } from 'next/navigation';
import pool from '@/lib/db';

// Make this page dynamic - no static generation
export const dynamic = 'force-dynamic';

interface CasePageProps {
  params: Promise<{ id: string }>;
}

// Legacy /cases/[id] page - redirect to /incidents/[id] if the incident is verified
export default async function CasePage({ params }: CasePageProps) {
  const { id } = await params;
  
  // Check if there's a verified incident with a matching incident_id
  const client = await pool.connect();
  try {
    // Try to find a verified incident that matches this case ID
    const result = await client.query(`
      SELECT id FROM incidents 
      WHERE (incident_id = $1 OR incident_id ILIKE $2)
      AND verification_status = 'verified'
      LIMIT 1
    `, [id, `%${id}%`]);
    
    if (result.rows.length > 0) {
      // Redirect to the verified incident
      redirect(`/incidents/${result.rows[0].id}`);
    }
    
    // If no verified incident found, show not found
    // (Don't expose unverified data through legacy URLs)
    notFound();
  } finally {
    client.release();
  }
}
