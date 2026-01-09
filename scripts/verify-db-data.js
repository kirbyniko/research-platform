/**
 * Quick DB Verification Script
 * 
 * This script directly queries the database to verify data integrity
 * Run with: node scripts/verify-db-data.js
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const INCIDENT_ID = process.argv[2] || 42;

async function verify() {
  console.log(`\n========================================`);
  console.log(`DATABASE VERIFICATION - Incident ${INCIDENT_ID}`);
  console.log(`========================================\n`);

  try {
    // 1. Basic incident data
    const incident = await pool.query(
      'SELECT id, incident_id, victim_name, incident_type, city, state, facility, summary, verification_status FROM incidents WHERE id = $1',
      [INCIDENT_ID]
    );
    
    if (incident.rows.length === 0) {
      console.log('❌ Incident not found!');
      return;
    }
    
    console.log('--- INCIDENT ---');
    console.log(JSON.stringify(incident.rows[0], null, 2));

    // 2. Type-specific details
    const details = await pool.query(
      'SELECT detail_type, details FROM incident_details WHERE incident_id = $1',
      [INCIDENT_ID]
    );
    console.log('\n--- TYPE-SPECIFIC DETAILS ---');
    if (details.rows.length === 0) {
      console.log('(none saved)');
    } else {
      details.rows.forEach(row => {
        console.log(`\n${row.detail_type}:`);
        console.log(JSON.stringify(row.details, null, 2));
      });
    }

    // 3. Agencies
    const agencies = await pool.query(
      'SELECT id, agency, role FROM incident_agencies WHERE incident_id = $1',
      [INCIDENT_ID]
    );
    console.log('\n--- AGENCIES ---');
    if (agencies.rows.length === 0) {
      console.log('(none)');
    } else {
      agencies.rows.forEach(a => console.log(`  - ${a.agency} (role: ${a.role || 'n/a'})`));
    }

    // 4. Violations
    const violations = await pool.query(
      'SELECT id, violation_type, description, constitutional_basis FROM incident_violations WHERE incident_id = $1',
      [INCIDENT_ID]
    );
    console.log('\n--- VIOLATIONS ---');
    if (violations.rows.length === 0) {
      console.log('(none)');
    } else {
      violations.rows.forEach(v => {
        console.log(`  - ${v.violation_type}`);
        if (v.description) console.log(`    Description: ${v.description}`);
        if (v.constitutional_basis) console.log(`    Case Law: ${v.constitutional_basis}`);
      });
    }

    // 5. Sources
    const sources = await pool.query(
      'SELECT id, url, title, publication, source_type FROM incident_sources WHERE incident_id = $1',
      [INCIDENT_ID]
    );
    console.log('\n--- SOURCES ---');
    if (sources.rows.length === 0) {
      console.log('(none)');
    } else {
      sources.rows.forEach(s => console.log(`  - [${s.id}] ${s.title || s.url} (${s.source_type})`));
    }

    // 6. Quotes
    const quotes = await pool.query(
      'SELECT id, quote_text, category, source_id, verified FROM incident_quotes WHERE incident_id = $1',
      [INCIDENT_ID]
    );
    
    // Get field links separately
    const fieldLinks = await pool.query(
      'SELECT quote_id, array_agg(field_name) as fields FROM quote_field_links WHERE incident_id = $1 GROUP BY quote_id',
      [INCIDENT_ID]
    );
    const linkMap = {};
    fieldLinks.rows.forEach(r => { linkMap[r.quote_id] = r.fields; });
    
    console.log('\n--- QUOTES ---');
    if (quotes.rows.length === 0) {
      console.log('(none)');
    } else {
      quotes.rows.forEach(q => {
        console.log(`  - [${q.id}] "${q.quote_text.substring(0, 50)}..."`);
        console.log(`    Category: ${q.category || 'n/a'}, Verified: ${q.verified}, Source: ${q.source_id || 'n/a'}`);
        if (linkMap[q.id]?.length) console.log(`    Linked to: ${linkMap[q.id].join(', ')}`);
      });
    }

    // 7. Timeline
    const timeline = await pool.query(
      'SELECT id, event_date, description, sequence_order, source_id FROM incident_timeline WHERE incident_id = $1 ORDER BY sequence_order, event_date',
      [INCIDENT_ID]
    );
    console.log('\n--- TIMELINE ---');
    if (timeline.rows.length === 0) {
      console.log('(none)');
    } else {
      timeline.rows.forEach(t => console.log(`  - [${t.sequence_order || '?'}] ${t.event_date || 'no date'}: ${t.description}`));
    }

    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Incident Type: ${incident.rows[0].incident_type}`);
    console.log(`Details Saved: ${details.rows.length > 0 ? details.rows.map(d => d.detail_type).join(', ') : 'none'}`);
    console.log(`Agencies: ${agencies.rows.length}`);
    console.log(`Violations: ${violations.rows.length}`);
    console.log(`Sources: ${sources.rows.length}`);
    console.log(`Quotes: ${quotes.rows.length}`);
    console.log(`Timeline Entries: ${timeline.rows.length}`);
    console.log('');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

verify();
