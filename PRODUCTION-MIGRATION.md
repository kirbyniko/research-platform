# Running Database Migration on Production

## Option 1: Using Vercel CLI (Recommended)

1. Install Vercel CLI if you haven't:
   ```bash
   npm install -g vercel
   ```

2. Run the migration script with production DATABASE_URL:
   ```bash
   vercel env pull .env.production
   node scripts/run-guest-submission-migration.js
   ```

## Option 2: Using Neon Console

1. Go to [Neon Console](https://console.neon.tech)
2. Navigate to your project
3. Open SQL Editor
4. Copy and paste the contents of `scripts/add-guest-submission-columns.sql`
5. Execute the SQL

## Option 3: Using psql

If you have your Neon connection string:

```bash
psql "YOUR_NEON_CONNECTION_STRING" -f scripts/add-guest-submission-columns.sql
```

## Verify Migration

After running, verify with:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'incidents' 
AND column_name = 'submitter_ip';
```

You should see one row with:
- column_name: submitter_ip
- data_type: character varying

## What This Migration Does

- ✅ Adds `submitter_ip` column to track guest submissions
- ✅ Creates indexes for efficient querying by role and status
- ✅ Updates existing records with null submitter_role to 'unknown'
- ✅ Adds documentation comments to columns

## After Migration

The production API will now:
- Accept guest submissions (no API key needed)
- Rate limit guests to 5 submissions/hour
- Rate limit authenticated users to 60 submissions/minute
- Track submission type and IP for guests
