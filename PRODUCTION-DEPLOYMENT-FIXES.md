# Production Deployment Issues & Fixes

## Current Status (2026-01-22)

### ❌ Errors on Production
1. **500 Error on `/api/admin/verifiers`** - Migration 016 not run
2. **500 Error on record type creation** - Unknown cause (check logs)
3. **"No users found" in admin** - ✅ FIXED (API response format)

---

## Required Actions

### 1. Run Migration 016 on Production Database

**Migration file:** `scripts/migrations/016-verifier-role-system.sql`

**What it adds:**
- `is_verifier` flag on users table
- `verifier_stats` table
- Verifier assignment tracking
- Views for verifier workload

**To run:**
```bash
# Connect to production Postgres
psql $DATABASE_URL -f scripts/migrations/016-verifier-role-system.sql
```

### 2. Verify Users Table Has `name` Column

The system assumes users have a `name` column. Check your auth provider setup.

**If missing, add it:**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
```

### 3. Deploy Latest Code

Latest fixes include:
- ✅ Removed "Create Project" button from admin dashboard
- ✅ Fixed users API response format
- ✅ Improved empty state messaging

```bash
git add .
git commit -m "Fix admin UI and API responses"
git push
```

---

## Verification Checklist

After deployment, test these flows:

### ✅ Admin Dashboard
- [ ] Go to `/admin`
- [ ] Click "Users" tab - should show user list (not "no users found")
- [ ] Click "Verification" tab - should show queue
- [ ] Click "Manage Verifiers" - should load without 500 error

### ✅ Verifier Management
- [ ] Go to `/admin/verifiers`
- [ ] Add yourself as a verifier
- [ ] Set specialties and max concurrent (e.g., 5)

### ✅ Request Verification
- [ ] Go to any verified record
- [ ] Click "Request 3rd Party Verification"
- [ ] Choose scope (Full Record or Data Items)
- [ ] Submit - should see in admin queue

### ✅ Verifier Portal
- [ ] Go to `/verify`
- [ ] Should see assigned/available requests
- [ ] Claim a request
- [ ] Complete verification

---

## Common Issues

### "No users found" in admin
**Cause:** Users are created through authentication (Descope/NextAuth)
**Solution:** Users will appear after they log in. This is expected for new deployments.

### 500 on `/api/admin/verifiers`
**Cause:** Migration 016 not run
**Solution:** Run migration 016 on production database

### "Cannot create record type"
**Cause:** Likely missing columns from migration 015 (workflow_config, display_config) or permissions issue
**Actions to check:**
1. Check Vercel function logs for actual error message
2. Verify migration 015 was run on production:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'record_types' 
   AND column_name IN ('workflow_config', 'display_config');
   ```
3. If columns missing, run migration 015 on production
4. Check if you have `manage_record_types` permission on the project

### Quota not enforcing
**Cause:** `verification_quota_monthly` not set on projects
**Solution:** Run this on existing projects:
```sql
UPDATE projects 
SET verification_quota_monthly = 5,
    verification_quota_used = 0,
    verification_quota_reset_date = CURRENT_DATE
WHERE verification_quota_monthly IS NULL;
```

---

## Database Schema Status

| Table/Column | Migration | Status |
|--------------|-----------|--------|
| `projects.verification_quota_monthly` | 015 | ✅ Should exist |
| `users.is_verifier` | 016 | ❌ Need to run |
| `verifier_stats` table | 016 | ❌ Need to run |
| `verification_requests` table | 015 | ✅ Should exist |
| `verification_results` table | 015 | ✅ Should exist |

---

## Next Steps

1. **Run migration 016** on production
2. **Deploy latest code** with UI fixes
3. **Test the complete flow** using checklist above
4. **Check Vercel logs** for record type creation error
5. **Add yourself as verifier** in `/admin/verifiers`
