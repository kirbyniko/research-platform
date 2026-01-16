// Complete database backup script
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function backupDatabase() {
  const client = await pool.connect();
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupDir = path.join(__dirname, '..', 'backups');
    
    // Create backups directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupFile = path.join(backupDir, `ice-deaths-backup-${timestamp}.json`);
    
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║       ICE DEATHS DATABASE BACKUP UTILITY               ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log(`📦 Starting backup at ${new Date().toLocaleString()}\n`);
    
    const backup = {
      metadata: {
        timestamp: new Date().toISOString(),
        database: 'neondb',
        version: '1.0'
      },
      tables: {}
    };
    
    // Backup incidents table
    console.log('📋 Backing up incidents table...');
    const incidents = await client.query('SELECT * FROM incidents ORDER BY id');
    backup.tables.incidents = {
      count: incidents.rows.length,
      data: incidents.rows
    };
    console.log(`   ✅ ${incidents.rows.length} incidents backed up`);
    
    // Backup incident_sources table
    console.log('📎 Backing up incident_sources table...');
    const sources = await client.query('SELECT * FROM incident_sources ORDER BY id');
    backup.tables.incident_sources = {
      count: sources.rows.length,
      data: sources.rows
    };
    console.log(`   ✅ ${sources.rows.length} sources backed up`);
    
    // Backup incident_quotes table
    console.log('💬 Backing up incident_quotes table...');
    const quotes = await client.query('SELECT * FROM incident_quotes ORDER BY id');
    backup.tables.incident_quotes = {
      count: quotes.rows.length,
      data: quotes.rows
    };
    console.log(`   ✅ ${quotes.rows.length} quotes backed up`);
    
    // Get summary statistics
    console.log('\n📊 Generating summary statistics...');
    const stats = await client.query(`
      SELECT 
        incident_type, 
        COUNT(*) as count,
        COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified_count
      FROM incidents
      GROUP BY incident_type
      ORDER BY count DESC
    `);
    backup.statistics = {
      by_type: stats.rows,
      total_incidents: incidents.rows.length,
      total_sources: sources.rows.length,
      total_quotes: quotes.rows.length
    };
    
    // Write backup to file
    console.log(`\n💾 Writing backup to file...`);
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    
    const fileSizeMB = (fs.statSync(backupFile).size / (1024 * 1024)).toFixed(2);
    
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              BACKUP COMPLETED SUCCESSFULLY             ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log(`📁 File: ${backupFile}`);
    console.log(`📏 Size: ${fileSizeMB} MB`);
    console.log(`\n📊 Summary:`);
    console.log(`   • ${backup.statistics.total_incidents} incidents`);
    console.log(`   • ${backup.statistics.total_sources} sources`);
    console.log(`   • ${backup.statistics.total_quotes} quotes`);
    console.log(`\n✨ Your data is safe!\n`);
    
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

backupDatabase().catch(console.error);
