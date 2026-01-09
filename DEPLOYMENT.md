# Deployment Guide - ICE Deaths Documentation

## Quick Deploy (Free Tier)

### Option 1: Vercel + Neon (Recommended)

**Total Cost: $0/month** for prototype usage

#### Step 1: Database (Neon)

1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project (free tier: 0.5GB storage)
3. Copy your connection string: `postgresql://user:pass@host/db?sslmode=require`
4. Run the schema:
   ```bash
   psql "YOUR_CONNECTION_STRING" -f scripts/db-schema.sql
   psql "YOUR_CONNECTION_STRING" -f scripts/incidents-schema.sql
   ```

#### Step 2: Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repo
3. Add environment variables:
   ```
   DATABASE_URL=postgresql://... (from Neon)
   NEXT_PUBLIC_DESCOPE_PROJECT_ID=your-descope-id
   DESCOPE_MANAGEMENT_KEY=your-key
   JWT_SECRET=generate-a-random-string
   APP_URL=https://your-app.vercel.app
   ```
4. Deploy!

#### Step 3: File Uploads (Optional)

For PDF uploads, add Vercel Blob:
```bash
npm install @vercel/blob
```

Or use Uploadthing (free tier available):
```bash
npm install uploadthing @uploadthing/react
```

---

### Option 2: Railway (All-in-One)

**Cost: $5/month credit (free)**

1. Go to [railway.app](https://railway.app)
2. Create new project → Deploy from GitHub
3. Add PostgreSQL service
4. Railway auto-detects Next.js and sets up build
5. Add environment variables in dashboard

---

### Option 3: Render

**Cost: Free tier (750 hours/month)**

1. Go to [render.com](https://render.com)
2. Create Web Service → Connect GitHub
3. Create PostgreSQL database (free for 90 days, then $7/mo)
4. Configure environment variables

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXT_PUBLIC_DESCOPE_PROJECT_ID` | ✅ | Descope auth project ID |
| `DESCOPE_MANAGEMENT_KEY` | ✅ | Descope management API key |
| `JWT_SECRET` | ✅ | Secret for JWT tokens |
| `APP_URL` | ✅ | Your deployed app URL |
| `ADMIN_EMAIL` | ✅ | Email for first admin user |
| `SMTP_*` | Optional | Email sending (for verification) |
| `OLLAMA_URL` | Optional | Usually `http://localhost:11434` |
| `OPENAI_API_KEY` | Optional | Fallback for AI analysis |
| `ANTHROPIC_API_KEY` | Optional | Fallback for AI analysis |

---

## AI Features (Ollama)

The AI document analysis runs **locally on users' machines** via Ollama. This means:

- ✅ Documents stay private (never sent to cloud)
- ✅ Free to use (no API costs)
- ✅ Works offline
- ⚠️ Users need to install Ollama on their computer

### For Users:

1. Download Ollama from [ollama.ai/download](https://ollama.ai/download)
2. Open terminal and run: `ollama pull llama3.2`
3. Keep Ollama running while using the app

### Cloud Fallback (Optional):

If you want AI to work without Ollama, add API keys:
- `OPENAI_API_KEY` - Uses GPT-4 ($0.01-0.03 per analysis)
- `ANTHROPIC_API_KEY` - Uses Claude ($0.01-0.02 per analysis)

---

## Database Schema Setup

After creating your database, run these scripts in order:

```bash
# Core schema
psql $DATABASE_URL -f scripts/db-schema.sql

# Incidents system
psql $DATABASE_URL -f scripts/incidents-schema.sql

# Role-based access
psql $DATABASE_URL -f scripts/rbac-schema.sql

# Edit suggestions
psql $DATABASE_URL -f scripts/edit-suggestions-schema.sql

# Documents & quotes
psql $DATABASE_URL -f scripts/add-documents-tables.sql

# Bug reports
psql $DATABASE_URL -f scripts/bug-reports-table.sql
```

---

## File Storage

### Local Development
Files stored in `uploads/documents/` directory.

### Production (Serverless)
Serverless platforms don't have persistent disk storage. Options:

1. **Vercel Blob** - $0 for first 1GB
   ```bash
   npm install @vercel/blob
   ```

2. **Cloudflare R2** - $0 for first 10GB
   
3. **AWS S3** - ~$0.023/GB/month

4. **Uploadthing** - Free tier available

---

## Security Checklist

- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Set `APP_URL` to your actual domain
- [ ] Configure `ADMIN_EMAIL` before first signup
- [ ] Enable HTTPS (automatic on Vercel/Railway/Render)
- [ ] Review rate limits in `src/lib/rate-limit.ts`

---

## Estimated Costs

| Tier | Monthly Cost | Capacity |
|------|--------------|----------|
| **Prototype** | $0 | ~1,000 users, 500MB data |
| **Small** | $5-10 | ~5,000 users, 2GB data |
| **Medium** | $25-50 | ~50,000 users, 10GB data |

Most hosting costs come from database storage, not compute.
