require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createTestSubmissions() {
  console.log('Creating test guest submissions with full details...\n');

  const submissions = [
    {
      victimName: 'Maria Garcia Rodriguez',
      dateOfDeath: '2025-12-15',
      location: 'El Paso',
      facility: 'El Paso Processing Center',
      incidentType: 'death_in_custody',
      age: 34,
      gender: 'Female',
      nationality: 'Mexico',
      city: 'El Paso',
      state: 'Texas',
      agencies: { ice: true, cbp: true, local_police: true },
      causeOfDeath: 'Medical neglect - untreated pneumonia',
      mannerOfDeath: 'Accident',
      custodyDuration: 45,
      medicalDenied: true,
      description: 'Maria requested medical attention for severe respiratory symptoms for 3 weeks before her death. Multiple sick call requests were ignored or dismissed as "minor complaints."',
      sources: [
        { url: 'https://example.com/maria-garcia-case', quote: 'Family reports multiple denied medical requests' }
      ],
      media: [
        { url: 'https://www.bigfootdigital.co.uk/wp-content/uploads/2020/07/image-optimisation-scaled.jpg', description: 'Facility where Maria was detained', type: 'image' }
      ],
      email: 'advocate@example.org'
    },
    {
      victimName: 'Carlos Santos',
      dateOfDeath: '2026-01-05',
      location: 'Phoenix',
      facility: 'Eloy Detention Center',
      incidentType: 'shooting',
      age: 28,
      gender: 'Male',
      nationality: 'Honduras',
      city: 'Phoenix',
      state: 'Arizona',
      agencies: { ice: true, border_patrol: true, state_police: true },
      shotsFired: 8,
      weaponType: 'Service pistol',
      bodycamAvailable: true,
      victimArmed: false,
      shootingContext: 'During attempted deportation - Carlos allegedly fled vehicle during transport',
      description: 'Carlos was shot 8 times by ICE officers during a transport. Witnesses reported he was unarmed and attempting to run away when shot in the back.',
      sources: [
        { url: 'https://example.com/santos-shooting', quote: 'Eight shots fired at fleeing detainee' },
        { url: 'https://example.com/witness-statements', quote: 'He was running away with his hands up' }
      ],
      media: [
        { url: 'https://www.bigfootdigital.co.uk/wp-content/uploads/2020/07/image-optimisation-scaled.jpg', description: 'Scene of shooting', type: 'image' }
      ],
      email: 'reporter@news.com'
    },
    {
      victimName: 'Ahmed Hassan',
      dateOfDeath: '2025-11-20',
      location: 'Newark',
      facility: 'Essex County Correctional Facility',
      incidentType: 'use_of_force',
      age: 42,
      gender: 'Male',
      nationality: 'Somalia',
      city: 'Newark',
      state: 'New Jersey',
      agencies: { ice: true, local_police: true, private_contractor: true },
      forceTypes: { restraint_chair: true, pepper_spray: true, physical_restraint: true },
      victimRestrained: true,
      victimComplying: true,
      description: 'Ahmed died after being placed in a restraint chair for 6 hours following a verbal altercation. Staff used pepper spray while he was already restrained. Medical examiner ruled death due to positional asphyxiation.',
      causeOfDeath: 'Positional asphyxiation',
      mannerOfDeath: 'Homicide',
      custodyDuration: 180,
      sources: [
        { url: 'https://example.com/hassan-restraint-death', quote: 'Restrained for 6 hours in chair designed for 2 hour maximum use' },
        { url: 'https://example.com/medical-examiner-report', quote: 'Death ruled homicide due to positional asphyxiation' }
      ],
      media: [
        { url: 'https://www.bigfootdigital.co.uk/wp-content/uploads/2020/07/image-optimisation-scaled.jpg', description: 'Restraint chair similar to one used', type: 'image' }
      ],
      email: null
    },
    {
      victimName: 'Rosa Mendez',
      dateOfDeath: '2025-10-30',
      location: 'Laredo',
      facility: 'South Texas Family Residential Center',
      incidentType: 'death_in_custody',
      age: 29,
      gender: 'Female',
      nationality: 'Guatemala',
      city: 'Laredo',
      state: 'Texas',
      agencies: { ice: true, dhs: true, private_contractor: true },
      causeOfDeath: 'Suicide by hanging',
      mannerOfDeath: 'Suicide',
      custodyDuration: 90,
      medicalDenied: true,
      description: 'Rosa had been separated from her 4-year-old daughter and repeatedly requested mental health services. Staff documented her declining mental state but no psychiatric evaluation was provided. She was found unresponsive in her cell.',
      sources: [
        { url: 'https://example.com/mendez-suicide', quote: 'Multiple requests for mental health services documented but not fulfilled' },
        { url: 'https://example.com/family-separation-impacts', quote: 'Mother separated from young child showed severe depression' }
      ],
      media: [],
      email: 'humanrights@advocacy.org'
    },
    {
      victimName: 'David Chen',
      dateOfDeath: '2026-01-10',
      location: 'San Francisco',
      facility: 'ICE San Francisco Field Office',
      incidentType: 'death_in_custody',
      age: 55,
      gender: 'Male',
      nationality: 'China',
      city: 'San Francisco',
      state: 'California',
      agencies: { ice: true, unknown: true },
      causeOfDeath: 'Diabetic ketoacidosis',
      mannerOfDeath: 'Natural',
      custodyDuration: 14,
      medicalDenied: true,
      description: 'David, a diabetic, was held for 2 weeks without his insulin medication. Despite repeated requests and visible symptoms of hyperglycemia (extreme thirst, frequent urination, confusion), medical staff did not provide treatment until he became unresponsive.',
      sources: [
        { url: 'https://example.com/chen-diabetes-death', quote: 'Known diabetic denied insulin for 14 days' }
      ],
      media: [
        { url: 'https://www.bigfootdigital.co.uk/wp-content/uploads/2020/07/image-optimisation-scaled.jpg', description: 'San Francisco ICE facility', type: 'image' }
      ],
      email: 'familymember@email.com'
    }
  ];

  for (const submission of submissions) {
    try {
      const result = await pool.query(`
        INSERT INTO guest_submissions (
          status,
          submission_data,
          ip_address,
          email,
          created_at
        )
        VALUES (
          'pending',
          $1,
          '::1',
          $2,
          NOW()
        )
        RETURNING id, submission_data->>'victimName' as name
      `, [JSON.stringify(submission), submission.email || null]);
      
      console.log(`✓ Created submission for ${result.rows[0].name} (ID: ${result.rows[0].id})`);
    } catch (error) {
      console.error(`✗ Failed to create submission for ${submission.victimName}:`, error.message);
    }
  }

  console.log('\nDone! Created 5 test submissions with full details.');
  await pool.end();
  process.exit(0);
}

createTestSubmissions().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
