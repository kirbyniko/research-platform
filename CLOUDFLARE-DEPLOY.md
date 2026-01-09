# Deploy to Cloudflare Pages (Simpler Alternative)

If Vercel is causing issues, use Cloudflare Pages - it's what you used for civitracker.

## Option A: Quick Fix for Vercel

Add this to prevent database calls during build:

**In `next.config.js`:**
```js
module.exports = {
  // ... existing config
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Skip database queries during build
  env: {
    SKIP_BUILD_STATIC_GENERATION: 'true',
  },
}
```

Then wrap database calls:
```typescript
// In page.tsx files
if (process.env.SKIP_BUILD_STATIC_GENERATION) {
  return <div>Loading...</div>;
}
```

## Option B: Use Cloudflare Pages + D1

1. **Deploy:**
   ```bash
   npm install -g wrangler
   wrangler pages deploy out
   ```

2. **Database:** Use Cloudflare D1 (SQLite) instead of PostgreSQL
   - Free tier: unlimited reads, 100k writes/day
   - No connection issues during build

3. **Auth:** Works same as Vercel

**Trade-offs:**
- ✅ Easier deployment (like civitracker)
- ✅ Free tier more generous
- ⚠️ Need to migrate from PostgreSQL to D1 (SQLite)

## Option C: Keep Vercel, Skip Database at Build

Set `DATABASE_URL` as a secret only available at runtime, not build time.

In Vercel Dashboard:
- Remove `DATABASE_URL` from environment variables
- Add it only to "Production" and "Preview" (not "Development")
- Check "Encrypted"

This makes Next.js skip static generation that needs DB.
