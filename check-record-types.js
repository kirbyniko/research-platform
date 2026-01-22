import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function main() {
  // Check record types for project-a
  const recordTypes = await sql`
    SELECT id, slug, name, project_id 
    FROM record_types 
    WHERE project_id = (SELECT id FROM projects WHERE slug = 'project-a')
    ORDER BY id
  `;
  console.log('Record Types for project-a:');
  console.log(JSON.stringify(recordTypes, null, 2));
  
  // Check if media field exists in field_definitions
  const mediaFields = await sql`
    SELECT fd.id, fd.key, fd.name, fd.field_type, rt.slug as record_type
    FROM field_definitions fd
    JOIN record_types rt ON fd.record_type_id = rt.id
    WHERE fd.key LIKE '%media%' OR fd.field_type = 'file' OR fd.field_type = 'media'
    LIMIT 20
  `;
  console.log('\nMedia-related fields:');
  console.log(JSON.stringify(mediaFields, null, 2));
  
  // Check records with type 'statement'
  const statementRecords = await sql`
    SELECT r.id, r.status, rt.slug as record_type
    FROM records r
    JOIN record_types rt ON r.record_type_id = rt.id
    WHERE rt.slug LIKE '%statement%'
    LIMIT 10
  `;
  console.log('\nStatement records:');
  console.log(JSON.stringify(statementRecords, null, 2));
}

main().catch(console.error);
