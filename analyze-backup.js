const fs = require('fs');
const data = JSON.parse(fs.readFileSync('backups/ice-deaths-backup-2026-01-15T11-13-54.json', 'utf8'));

console.log('=== BACKUP DATA ANALYSIS ===\n');
console.log('Tables found:', Object.keys(data.tables));

Object.entries(data.tables).forEach(([name, table]) => {
  console.log(`\n${name}: ${table.count} records`);
  
  if (table.count > 0 && table.data[0]) {
    console.log('  Fields:', Object.keys(table.data[0]).join(', '));
    
    // Sample first record
    console.log('  Sample:');
    const sample = table.data[0];
    Object.entries(sample).slice(0, 10).forEach(([k, v]) => {
      const displayValue = v === null ? '(null)' : 
                          typeof v === 'string' && v.length > 60 ? v.substring(0, 60) + '...' : v;
      console.log(`    ${k}: ${displayValue}`);
    });
  }
});

// Also check statistics if present
if (data.statistics) {
  console.log('\n=== STATISTICS ===');
  console.log(JSON.stringify(data.statistics, null, 2));
}
