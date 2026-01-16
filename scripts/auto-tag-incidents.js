/**
 * Auto-tag all incidents in the database
 * Applies intelligent tagging based on incident data
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.prod.temp' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Auto-tagging logic (JavaScript version of auto-tagger.ts)
function generateTags(incident) {
  const tags = new Set();
  const summary = (incident.summary || '').toLowerCase();
  const allText = summary;

  // Incident type-based tags
  if (incident.incident_type) {
    const typeMap = {
      'detention_death': ['Death in Custody'],
      'death_in_custody': ['Death in Custody'],
      'death_during_operation': ['Death During Enforcement'],
      'shooting': ['Use of Force', 'Shooting'],
      'excessive_force': ['Use of Force', 'Police Brutality'],
      'injury': ['Physical Harm'],
      'assault': ['Physical Harm', 'Use of Force'],
      'medical_neglect': ['Medical Neglect', 'Healthcare Denial'],
      'wrongful_detention': ['False Imprisonment', 'Due Process Violation'],
      'wrongful_arrest': ['False Imprisonment', 'Due Process Violation'],
      'deportation': ['Deportation'],
      'wrongful_deportation': ['Deportation', 'Due Process Violation'],
      'family_separation': ['Family Separation'],
      'workplace_raid': ['Workplace Enforcement'],
      'rights_violation': ['Constitutional Rights'],
      'protest_suppression': ['First Amendment', 'Protest'],
      'detention_abuse': ['Cruel Treatment', 'Conditions of Confinement'],
      'retaliation': ['Retaliation'],
    };
    
    const typeTags = typeMap[incident.incident_type] || [];
    typeTags.forEach(tag => tags.add(tag));
  }

  // Text-based pattern detection
  const patterns = {
    // Medical issues
    'Medical Neglect': ['medical neglect', 'denied treatment', 'refused medical', 'no medical care', 'delayed treatment', 'untreated condition'],
    'Mental Health Crisis': ['mental health', 'suicide', 'self-harm', 'psychiatric', 'mental illness', 'psychological'],
    'COVID-19': ['covid', 'coronavirus', 'pandemic'],
    
    // Manner of death/harm
    'Suicide': ['suicide', 'took his own life', 'took her own life', 'self-inflicted'],
    'Shooting': ['shot', 'gunshot', 'fired', 'shooting'],
    'Cardiac Event': ['heart attack', 'cardiac', 'heart failure'],
    'Respiratory Illness': ['pneumonia', 'respiratory', 'breathing', 'asthma', 'lung'],
    
    // Vulnerable populations
    'Asylum Seeker': ['asylum', 'asylum seeker', 'refugee'],
    'DACA Recipient': ['daca', 'dreamer'],
    'Elderly': ['elderly', 'senior'],
    'Minor': ['minor', 'child', 'juvenile', 'teenager'],
    
    // Systemic issues
    'Prolonged Detention': ['years in detention', 'months in detention', 'prolonged detention', 'lengthy detention', '3+ months'],
    'Communication Denied': ['family could not reach', 'denied access to family', 'no communication', 'isolated from family', 'barefoot'],
    'Rapid Deterioration': ['rapidly deteriorated', 'sudden decline', 'died within days', 'died within hours'],
    'Delayed Response': ['delayed', 'slow response', 'hours before treatment'],
    
    // Specific circumstances
    'In Transit': ['during transport', 'while being transferred', 'in transit', 'en route'],
    'Bystander Victim': ['bystander', 'not a target', 'innocent', 'community member', 'not yet publicly released', 'legal observer'],
    'Journalist': ['journalist', 'reporter', 'press', 'op-ed', 'publishing'],
    'Legal Observer': ['legal observer', 'documenting'],
    'Protest-Related': ['protest', 'demonstration', 'rally'],
    
    // Facility conditions
    'Overcrowding': ['overcrowded', 'overcrowding'],
    'Solitary Confinement': ['solitary', 'isolation cell'],
    'Facility Abuse': ['unnecessarily cruel', 'cruel conditions', 'inhumane'],
    
    // Judge/Court mentions
    'Judicial Finding': ['judge found', 'court ruled', 'judge called', 'unnecessarily cruel', 'unconstitutional conditions'],
    
    // Permanent harm
    'Permanent Injury': ['permanently', 'blinded', 'disabled', 'paralyzed'],
    
    // Investigation
    'Federal Investigation': ['fbi', 'federal investigation', 'jointly investigating'],
    
    // Labeling/Terrorism
    'Labeled Terrorist': ['domestic terrorist', 'terrorist label'],
    
    // Military/Veteran
    'Military Veteran': ['army veteran', 'military veteran', 'veteran'],
  };

  for (const [tag, keywords] of Object.entries(patterns)) {
    if (keywords.some(keyword => allText.includes(keyword))) {
      tags.add(tag);
    }
  }

  // Age-based tags
  if (incident.subject_age !== undefined && incident.subject_age !== null) {
    if (incident.subject_age < 18) tags.add('Minor');
    if (incident.subject_age >= 65) tags.add('Elderly');
    if (incident.subject_age <= 25) tags.add('Young Adult');
  }

  return Array.from(tags).sort();
}

async function autoTagIncidents() {
  console.log('\n🏷️  AUTO-TAGGING INCIDENTS\n');
  
  try {
    // Get all incidents
    const result = await pool.query(`
      SELECT id, incident_id, incident_type, summary, subject_age, tags
      FROM incidents
      ORDER BY id
    `);
    
    console.log(`Found ${result.rowCount} incidents\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const incident of result.rows) {
      const currentTags = incident.tags || [];
      const suggestedTags = generateTags(incident);
      
      // Merge current tags with suggested tags (keep user-added tags)
      const mergedTags = Array.from(new Set([...currentTags, ...suggestedTags])).sort();
      
      if (mergedTags.length === 0) {
        console.log(`  ⊘ ${incident.incident_id}: No tags generated`);
        skippedCount++;
        continue;
      }
      
      // Update incident with tags
      await pool.query(`
        UPDATE incidents 
        SET tags = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [mergedTags, incident.id]);
      
      const added = mergedTags.filter(t => !currentTags.includes(t));
      if (added.length > 0) {
        console.log(`  ✓ ${incident.incident_id}:`);
        console.log(`    Added: ${added.join(', ')}`);
        if (currentTags.length > 0) {
          console.log(`    Kept: ${currentTags.join(', ')}`);
        }
        updatedCount++;
      } else {
        console.log(`  = ${incident.incident_id}: No changes (already tagged)`);
      }
    }
    
    console.log(`\n✅ Complete!`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Unchanged: ${result.rowCount - updatedCount - skippedCount}`);
    console.log(`   No tags: ${skippedCount}`);
    
    // Show tag distribution
    console.log('\n📊 TAG DISTRIBUTION:\n');
    const tagDist = await pool.query(`
      SELECT unnest(tags) as tag, COUNT(*) as count
      FROM incidents
      WHERE tags IS NOT NULL
      GROUP BY tag
      ORDER BY count DESC, tag
    `);
    
    tagDist.rows.forEach(row => {
      console.log(`   ${row.tag}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

autoTagIncidents();
