const fs = require('fs');
const path = require('path');

const CASES_DIR = path.join(process.cwd(), 'data', 'cases');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'exports');

function getAllCases() {
  if (!fs.existsSync(CASES_DIR)) {
    return [];
  }

  const files = fs.readdirSync(CASES_DIR);
  const cases = [];

  for (const file of files) {
    if (file.endsWith('.json') && !file.startsWith('_')) {
      const filePath = path.join(CASES_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const caseData = JSON.parse(content);
      cases.push(caseData);
    }
  }

  return cases.sort((a, b) => 
    new Date(b.date_of_death).getTime() - new Date(a.date_of_death).getTime()
  );
}

function toCSV(cases) {
  if (cases.length === 0) return '';

  const headers = [
    'id',
    'name',
    'age',
    'nationality',
    'date_of_death',
    'facility_name',
    'facility_state',
    'facility_type',
    'custody_status',
    'categories',
    'official_cause_of_death',
    'notes'
  ];

  const rows = cases.map(c => [
    c.id,
    `"${c.name.replace(/"/g, '""')}"`,
    c.age,
    c.nationality,
    c.date_of_death,
    `"${c.facility.name.replace(/"/g, '""')}"`,
    c.facility.state,
    c.facility.type,
    c.custody_status,
    `"${c.category.join('; ')}"`,
    `"${c.official_cause_of_death.replace(/"/g, '""')}"`,
    `"${(c.notes || '').replace(/"/g, '""')}"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function main() {
  console.log('Exporting case data...\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const cases = getAllCases();

  if (cases.length === 0) {
    console.log('No cases to export.');
    return;
  }

  // Export JSON
  const jsonPath = path.join(OUTPUT_DIR, 'ice-deaths-data.json');
  fs.writeFileSync(jsonPath, JSON.stringify(cases, null, 2));
  console.log(`✓ Exported JSON: ${jsonPath}`);

  // Export CSV
  const csvPath = path.join(OUTPUT_DIR, 'ice-deaths-data.csv');
  fs.writeFileSync(csvPath, toCSV(cases));
  console.log(`✓ Exported CSV: ${csvPath}`);

  console.log(`\nExported ${cases.length} cases.`);
}

main();
