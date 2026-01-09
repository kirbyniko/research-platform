/**
 * Review Form API Test Script
 * 
 * This script tests all API endpoints used by the review form to verify
 * data is correctly saved to and retrieved from the database.
 * 
 * Run with: npx ts-node scripts/test-review-form.ts
 * 
 * Prerequisites: 
 * - Dev server running on localhost:3000
 * - Valid session cookie (run logged in as admin)
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// Test incident ID - change this to a real incident ID in your DB
const TEST_INCIDENT_ID = process.env.TEST_INCIDENT_ID || '42';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

// Helper to make authenticated API calls
async function apiCall(endpoint: string, method: string, body?: unknown, cookie?: string): Promise<{ ok: boolean; status: number; data: unknown }> {
  const url = `${BASE_URL}/api/incidents/${TEST_INCIDENT_ID}/${endpoint}`;
  
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { 'Cookie': cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: err instanceof Error ? err.message : 'Network error' } };
  }
}

function logResult(name: string, passed: boolean, error?: string, details?: string) {
  results.push({ name, passed, error, details });
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}${error ? `: ${error}` : ''}${details ? ` (${details})` : ''}`);
}

async function runTests(sessionCookie: string) {
  console.log('\n========================================');
  console.log('REVIEW FORM API TESTS');
  console.log(`Testing incident: ${TEST_INCIDENT_ID}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log('========================================\n');

  // ==========================================
  // 1. INCIDENT DETAILS (Basic Fields)
  // ==========================================
  console.log('\n--- 1. INCIDENT DETAILS (PUT /api/incidents/[id]) ---\n');

  const testIncidentData = {
    victim_name: `Test Victim ${Date.now()}`,
    incident_date: '2024-03-15',
    incident_type: 'shooting',
    city: 'Test City',
    state: 'TX',
    facility: 'Test Detention Center',
    summary: 'Test summary for automated testing',
    subject_age: 35,
    subject_gender: 'male',
    subject_nationality: 'Mexico',
  };

  // Test PUT incident details
  const incidentPut = await apiCall('', 'PUT', testIncidentData, sessionCookie);
  logResult('Update incident basic details', incidentPut.ok, incidentPut.ok ? undefined : JSON.stringify(incidentPut.data));

  // Verify data was saved by fetching
  const incidentGet = await apiCall('verify-field', 'GET', undefined, sessionCookie);
  if (incidentGet.ok) {
    const incident = (incidentGet.data as { incident: Record<string, unknown> }).incident;
    const victimMatch = incident?.victim_name === testIncidentData.victim_name;
    const cityMatch = incident?.city === testIncidentData.city;
    logResult('Verify incident data persisted', victimMatch && cityMatch, 
      victimMatch && cityMatch ? undefined : `victim_name: ${incident?.victim_name}, city: ${incident?.city}`);
  } else {
    logResult('Verify incident data persisted', false, 'Could not fetch incident');
  }

  // ==========================================
  // 2. TYPE-SPECIFIC DETAILS
  // ==========================================
  console.log('\n--- 2. TYPE-SPECIFIC DETAILS (PUT /api/incidents/[id]/details) ---\n');

  // Test Shooting Details
  const shootingDetails = {
    shooting_fatal: true,
    shots_fired: 5,
    weapon_type: 'handgun',
    victim_armed: false,
    warning_given: true,
    bodycam_available: true,
    shooting_context: 'Test shooting context',
  };

  const shootingPut = await apiCall('details', 'PUT', { details: shootingDetails }, sessionCookie);
  logResult('Save shooting details', shootingPut.ok, shootingPut.ok ? undefined : JSON.stringify(shootingPut.data));

  // Verify shooting details
  const shootingGet = await apiCall('details', 'GET', undefined, sessionCookie);
  if (shootingGet.ok) {
    const details = (shootingGet.data as { details: Record<string, unknown> }).details || {};
    const fatalMatch = details.shooting_fatal === true;
    const shotsMatch = details.shots_fired === 5;
    logResult('Verify shooting details persisted', fatalMatch && shotsMatch,
      fatalMatch && shotsMatch ? undefined : `fatal: ${details.shooting_fatal}, shots: ${details.shots_fired}`);
  } else {
    logResult('Verify shooting details persisted', false, 'Could not fetch details');
  }

  // Test Death Details (change type first)
  await apiCall('', 'PUT', { incident_type: 'death_in_custody' }, sessionCookie);
  
  const deathDetails = {
    cause_of_death: 'Test cause',
    official_cause: 'Test official cause',
    autopsy_available: true,
    medical_neglect_alleged: true,
    death_circumstances: 'Test circumstances',
  };

  const deathPut = await apiCall('details', 'PUT', { details: deathDetails }, sessionCookie);
  logResult('Save death details', deathPut.ok, deathPut.ok ? undefined : JSON.stringify(deathPut.data));

  // Verify death details
  const deathGet = await apiCall('details', 'GET', undefined, sessionCookie);
  if (deathGet.ok) {
    const details = (deathGet.data as { details: Record<string, unknown> }).details || {};
    const causeMatch = details.cause_of_death === 'Test cause';
    logResult('Verify death details persisted', causeMatch, 
      causeMatch ? undefined : `cause_of_death: ${details.cause_of_death}`);
  }

  // Test Excessive Force Details
  await apiCall('', 'PUT', { incident_type: 'excessive_force' }, sessionCookie);

  const forceDetails = {
    force_types: ['physical', 'taser', 'pepper_spray'],
    injuries_sustained: 'Bruises, taser burns',
    victim_restrained: true,
    victim_complying: true,
    video_evidence: true,
    hospitalization_required: false,
  };

  const forcePut = await apiCall('details', 'PUT', { details: forceDetails }, sessionCookie);
  logResult('Save excessive force details', forcePut.ok, forcePut.ok ? undefined : JSON.stringify(forcePut.data));

  // Verify force details
  const forceGet = await apiCall('details', 'GET', undefined, sessionCookie);
  if (forceGet.ok) {
    const details = (forceGet.data as { details: Record<string, unknown> }).details || {};
    const typesMatch = Array.isArray(details.force_types) && details.force_types.includes('taser');
    logResult('Verify force details persisted', typesMatch,
      typesMatch ? undefined : `force_types: ${JSON.stringify(details.force_types)}`);
  }

  // Test Arrest Details
  await apiCall('', 'PUT', { incident_type: 'arrest' }, sessionCookie);

  const arrestDetails = {
    arrest_reason: 'Test arrest reason',
    arrest_charges: 'Test charges',
    warrant_present: false,
    selective_enforcement: true,
    arrest_context: 'Test context',
  };

  const arrestPut = await apiCall('details', 'PUT', { details: arrestDetails }, sessionCookie);
  logResult('Save arrest details', arrestPut.ok, arrestPut.ok ? undefined : JSON.stringify(arrestPut.data));

  // Test Medical Neglect Details
  await apiCall('', 'PUT', { incident_type: 'medical_neglect' }, sessionCookie);

  const medicalDetails = {
    medical_condition: 'Test condition',
    treatment_denied: 'Test treatment denied',
    requests_documented: true,
    resulted_in_death: false,
  };

  const medicalPut = await apiCall('details', 'PUT', { details: medicalDetails }, sessionCookie);
  logResult('Save medical neglect details', medicalPut.ok, medicalPut.ok ? undefined : JSON.stringify(medicalPut.data));

  // Test Protest Suppression Details
  await apiCall('', 'PUT', { incident_type: 'protest_suppression' }, sessionCookie);

  const protestDetails = {
    protest_topic: 'Immigration rights',
    protest_size: '100-200',
    permitted: true,
    dispersal_method: 'tear_gas',
    arrests_made: 15,
  };

  const protestPut = await apiCall('details', 'PUT', { details: protestDetails }, sessionCookie);
  logResult('Save protest suppression details', protestPut.ok, protestPut.ok ? undefined : JSON.stringify(protestPut.data));

  // Reset to shooting for other tests
  await apiCall('', 'PUT', { incident_type: 'shooting' }, sessionCookie);

  // ==========================================
  // 3. SOURCES
  // ==========================================
  console.log('\n--- 3. SOURCES (POST/DELETE /api/incidents/[id]/sources) ---\n');

  const testSource = {
    url: `https://test-source-${Date.now()}.com/article`,
    title: 'Test Source Article',
    publication: 'Test Publication',
    source_type: 'news_article',
  };

  const sourcePost = await apiCall('sources', 'POST', testSource, sessionCookie);
  const sourceId = sourcePost.ok ? (sourcePost.data as { id: number }).id : null;
  logResult('Add source', sourcePost.ok && !!sourceId, sourcePost.ok ? `ID: ${sourceId}` : JSON.stringify(sourcePost.data));

  // Verify source was added
  const sourcesGet = await apiCall('verify-field', 'GET', undefined, sessionCookie);
  if (sourcesGet.ok && sourceId) {
    const sources = (sourcesGet.data as { sources: Array<{ id: number; url: string }> }).sources || [];
    const found = sources.find(s => s.id === sourceId);
    logResult('Verify source persisted', !!found, found ? undefined : 'Source not found in list');
  }

  // ==========================================
  // 4. QUOTES
  // ==========================================
  console.log('\n--- 4. QUOTES (POST/PUT/PATCH/DELETE /api/incidents/[id]/quotes) ---\n');

  const testQuote = {
    text: `Test quote text ${Date.now()}`,
    category: 'witness_statement',
    source_id: sourceId,
  };

  const quotePost = await apiCall('quotes', 'POST', testQuote, sessionCookie);
  const quoteId = quotePost.ok ? (quotePost.data as { id: number }).id : null;
  logResult('Add quote', quotePost.ok && !!quoteId, quotePost.ok ? `ID: ${quoteId}` : JSON.stringify(quotePost.data));

  // Test linking quote to field
  if (quoteId) {
    const linkQuote = await apiCall('quotes', 'PUT', { quote_id: quoteId, linked_fields: ['victim_name', 'city'] }, sessionCookie);
    logResult('Link quote to fields', linkQuote.ok, linkQuote.ok ? undefined : JSON.stringify(linkQuote.data));

    // Test verify quote
    const verifyQuote = await apiCall('quotes', 'PATCH', { quote_id: quoteId, verified: true }, sessionCookie);
    logResult('Verify quote', verifyQuote.ok, verifyQuote.ok ? undefined : JSON.stringify(verifyQuote.data));

    // Verify quote changes persisted
    const quotesGet = await apiCall('verify-field', 'GET', undefined, sessionCookie);
    if (quotesGet.ok) {
      const quotes = (quotesGet.data as { quotes: Array<{ id: number; linked_fields: string[]; verified: boolean }> }).quotes || [];
      const found = quotes.find(q => q.id === quoteId);
      const linkedCorrectly = found?.linked_fields?.includes('victim_name');
      const verifiedCorrectly = found?.verified === true;
      logResult('Verify quote field links persisted', !!linkedCorrectly, linkedCorrectly ? undefined : `linked_fields: ${JSON.stringify(found?.linked_fields)}`);
      logResult('Verify quote verification persisted', !!verifiedCorrectly, verifiedCorrectly ? undefined : `verified: ${found?.verified}`);
    }
  }

  // ==========================================
  // 5. AGENCIES
  // ==========================================
  console.log('\n--- 5. AGENCIES (POST/DELETE /api/incidents/[id]/agencies) ---\n');

  const testAgency = { agency: 'ice_ere' };

  // First delete if exists (cleanup)
  await apiCall('agencies', 'DELETE', { agency: 'ice_ere' }, sessionCookie);

  const agencyPost = await apiCall('agencies', 'POST', testAgency, sessionCookie);
  const agencyId = agencyPost.ok ? (agencyPost.data as { id: number }).id : null;
  logResult('Add agency', agencyPost.ok && !!agencyId, agencyPost.ok ? `ID: ${agencyId}` : JSON.stringify(agencyPost.data));

  // Verify agency was added
  const agenciesGet = await apiCall('verify-field', 'GET', undefined, sessionCookie);
  if (agenciesGet.ok) {
    const agencies = (agenciesGet.data as { agencies: Array<{ id: number; agency: string }> }).agencies || [];
    const found = agencies.find(a => a.agency === 'ice_ere');
    logResult('Verify agency persisted', !!found, found ? undefined : 'Agency not found in list');
  }

  // ==========================================
  // 6. VIOLATIONS
  // ==========================================
  console.log('\n--- 6. VIOLATIONS (POST/PUT/DELETE /api/incidents/[id]/violations) ---\n');

  const testViolation = { violation_type: '4th_amendment' };

  // First delete if exists (cleanup)
  const existingViolations = (agenciesGet.data as { violations: Array<{ id: number; violation_type: string }> }).violations || [];
  const existing4th = existingViolations.find(v => v.violation_type === '4th_amendment');
  if (existing4th) {
    await apiCall('violations', 'DELETE', { violation_id: existing4th.id }, sessionCookie);
  }

  const violationPost = await apiCall('violations', 'POST', testViolation, sessionCookie);
  const violationId = violationPost.ok ? (violationPost.data as { id: number }).id : null;
  logResult('Add violation', violationPost.ok && !!violationId, violationPost.ok ? `ID: ${violationId}` : JSON.stringify(violationPost.data));

  // Test update violation with description and case law
  if (violationId) {
    const violationUpdate = await apiCall('violations', 'PUT', {
      violation_id: violationId,
      violation_type: '4th_amendment',
      description: 'Test violation description',
      constitutional_basis: 'Graham v. Connor (1989)',
    }, sessionCookie);
    logResult('Update violation with description and case law', violationUpdate.ok, violationUpdate.ok ? undefined : JSON.stringify(violationUpdate.data));

    // Verify violation changes persisted
    const violationsGet = await apiCall('verify-field', 'GET', undefined, sessionCookie);
    if (violationsGet.ok) {
      const violations = (violationsGet.data as { violations: Array<{ id: number; description: string; constitutional_basis: string }> }).violations || [];
      const found = violations.find(v => v.id === violationId);
      const descMatch = found?.description === 'Test violation description';
      const basisMatch = found?.constitutional_basis === 'Graham v. Connor (1989)';
      logResult('Verify violation description persisted', descMatch, descMatch ? undefined : `description: ${found?.description}`);
      logResult('Verify violation case law persisted', basisMatch, basisMatch ? undefined : `constitutional_basis: ${found?.constitutional_basis}`);
    }
  }

  // ==========================================
  // 7. TIMELINE
  // ==========================================
  console.log('\n--- 7. TIMELINE (POST/DELETE /api/incidents/[id]/timeline) ---\n');

  const testTimeline = {
    event_date: '2024-03-15',
    description: 'Test timeline event',
    sequence_order: 1,
    source_id: sourceId,
  };

  const timelinePost = await apiCall('timeline', 'POST', testTimeline, sessionCookie);
  const timelineId = timelinePost.ok ? (timelinePost.data as { id: number }).id : null;
  logResult('Add timeline entry', timelinePost.ok && !!timelineId, timelinePost.ok ? `ID: ${timelineId}` : JSON.stringify(timelinePost.data));

  // Verify timeline was added
  const timelineGet = await apiCall('verify-field', 'GET', undefined, sessionCookie);
  if (timelineGet.ok) {
    const timeline = (timelineGet.data as { timeline: Array<{ id: number; description: string }> }).timeline || [];
    const found = timeline.find(t => t.id === timelineId);
    logResult('Verify timeline entry persisted', !!found, found ? undefined : 'Timeline entry not found in list');
  }

  // ==========================================
  // CLEANUP (Optional - comment out to keep test data)
  // ==========================================
  console.log('\n--- CLEANUP ---\n');

  if (timelineId) {
    const timelineDel = await apiCall('timeline', 'DELETE', { entry_id: timelineId }, sessionCookie);
    logResult('Delete timeline entry', timelineDel.ok);
  }

  if (quoteId) {
    const quoteDel = await apiCall('quotes', 'DELETE', { quote_id: quoteId }, sessionCookie);
    logResult('Delete quote', quoteDel.ok);
  }

  if (sourceId) {
    const sourceDel = await apiCall('sources', 'DELETE', { source_id: sourceId }, sessionCookie);
    logResult('Delete source', sourceDel.ok);
  }

  if (agencyId) {
    const agencyDel = await apiCall('agencies', 'DELETE', { agency_id: agencyId }, sessionCookie);
    logResult('Delete agency', agencyDel.ok);
  }

  if (violationId) {
    const violationDel = await apiCall('violations', 'DELETE', { violation_id: violationId }, sessionCookie);
    logResult('Delete violation', violationDel.ok);
  }

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log('\n========================================');
  console.log('TEST SUMMARY');
  console.log('========================================\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.error || 'Unknown error'}`);
    });
  }

  return failed === 0;
}

// Main execution
async function main() {
  // For testing, you need to provide a session cookie
  // Get this from your browser's dev tools after logging in
  const sessionCookie = process.env.SESSION_COOKIE || '';
  
  if (!sessionCookie) {
    console.log(`
⚠️  No session cookie provided!

To run these tests, you need to:
1. Log into the app in your browser
2. Open DevTools > Application > Cookies
3. Copy the value of 'next-auth.session-token' cookie
4. Run: SESSION_COOKIE="your-cookie-value" TEST_INCIDENT_ID=42 npx ts-node scripts/test-review-form.ts

Or run the simplified version that doesn't require auth:
npx ts-node scripts/test-review-form.ts --no-auth
`);

    // Run without auth to test what we can
    if (process.argv.includes('--no-auth')) {
      console.log('Running tests without authentication (expecting 401 errors)...\n');
      await runTests('');
    }
    return;
  }

  const success = await runTests(sessionCookie);
  process.exit(success ? 0 : 1);
}

main().catch(console.error);
