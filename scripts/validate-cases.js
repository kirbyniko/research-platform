const fs = require('fs');
const path = require('path');

const CASES_DIR = path.join(process.cwd(), 'data', 'cases');

const REQUIRED_FIELDS = [
  'id',
  'name',
  'age',
  'nationality',
  'date_of_death',
  'facility',
  'custody_status',
  'category',
  'official_cause_of_death',
  'timeline',
  'sources'
];

const FACILITY_REQUIRED_FIELDS = ['name', 'state', 'type'];
const VALID_CUSTODY_STATUS = ['Detained', 'Released', 'Other'];
const VALID_FACILITY_TYPES = ['ICE facility', 'ICE-contracted jail', 'Other'];

function validateDateFormat(date) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) return false;
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

function validateCase(caseData, filename) {
  const errors = [];

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (caseData[field] === undefined || caseData[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate ID matches filename
  const expectedId = filename.replace('.json', '');
  if (caseData.id !== expectedId) {
    errors.push(`ID "${caseData.id}" does not match filename "${expectedId}"`);
  }

  // Validate date_of_death format
  if (caseData.date_of_death && !validateDateFormat(caseData.date_of_death)) {
    errors.push(`Invalid date_of_death format: ${caseData.date_of_death}. Expected YYYY-MM-DD`);
  }

  // Validate facility object
  if (caseData.facility) {
    for (const field of FACILITY_REQUIRED_FIELDS) {
      if (!caseData.facility[field]) {
        errors.push(`Missing required facility field: ${field}`);
      }
    }
    if (caseData.facility.type && !VALID_FACILITY_TYPES.includes(caseData.facility.type)) {
      errors.push(`Invalid facility type: ${caseData.facility.type}. Valid types: ${VALID_FACILITY_TYPES.join(', ')}`);
    }
  }

  // Validate custody_status
  if (caseData.custody_status && !VALID_CUSTODY_STATUS.includes(caseData.custody_status)) {
    errors.push(`Invalid custody_status: ${caseData.custody_status}. Valid statuses: ${VALID_CUSTODY_STATUS.join(', ')}`);
  }

  // Validate category is array
  if (caseData.category && !Array.isArray(caseData.category)) {
    errors.push('category must be an array');
  }

  // Validate timeline
  if (caseData.timeline) {
    if (!Array.isArray(caseData.timeline)) {
      errors.push('timeline must be an array');
    } else {
      caseData.timeline.forEach((event, index) => {
        if (!event.date) {
          errors.push(`Timeline event ${index + 1} missing date`);
        } else if (!validateDateFormat(event.date)) {
          errors.push(`Timeline event ${index + 1} has invalid date format: ${event.date}`);
        }
        if (!event.event) {
          errors.push(`Timeline event ${index + 1} missing event description`);
        }
      });
    }
  }

  // Validate sources
  if (caseData.sources) {
    if (!Array.isArray(caseData.sources)) {
      errors.push('sources must be an array');
    } else if (caseData.sources.length === 0) {
      errors.push('At least one source is required');
    } else {
      caseData.sources.forEach((source, index) => {
        if (!source.title) errors.push(`Source ${index + 1} missing title`);
        if (!source.publisher) errors.push(`Source ${index + 1} missing publisher`);
        if (!source.url) errors.push(`Source ${index + 1} missing url`);
      });
    }
  }

  // Validate age is positive number
  if (caseData.age !== undefined && (typeof caseData.age !== 'number' || caseData.age < 0)) {
    errors.push('age must be a positive number');
  }

  return errors;
}

function main() {
  console.log('Validating case files...\n');

  if (!fs.existsSync(CASES_DIR)) {
    console.log('No cases directory found. Creating empty directory.');
    fs.mkdirSync(CASES_DIR, { recursive: true });
    return;
  }

  const files = fs.readdirSync(CASES_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('_'));

  if (jsonFiles.length === 0) {
    console.log('No case files found.');
    return;
  }

  let hasErrors = false;
  let validCount = 0;

  for (const file of jsonFiles) {
    const filePath = path.join(CASES_DIR, file);
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const caseData = JSON.parse(content);
      const errors = validateCase(caseData, file);

      if (errors.length > 0) {
        hasErrors = true;
        console.error(`❌ ${file}:`);
        errors.forEach(err => console.error(`   - ${err}`));
        console.log('');
      } else {
        validCount++;
        console.log(`✓ ${file}`);
      }
    } catch (err) {
      hasErrors = true;
      console.error(`❌ ${file}: Invalid JSON - ${err.message}`);
    }
  }

  console.log(`\nValidation complete: ${validCount}/${jsonFiles.length} files valid`);

  if (hasErrors) {
    console.error('\nBuild failed due to validation errors.');
    process.exit(1);
  }
}

main();
