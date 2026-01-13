# Security Audit & Deployment Checklist

## Completed Security Measures

### Access Control
- ✅ Legal Help section restricted to analyst+ roles only
- ✅ All API endpoints use `requireServerAuth()` or `optionalServerAuth()` for authentication
- ✅ Guest submissions have rate limiting (5/hour)
- ✅ Analyst-only endpoints protected with role checks
- ✅ Admin panel requires admin role
- ✅ Two-analyst review system prevents self-verification

### Data Protection
- ✅ Database credentials stored in environment variables
- ✅ No sensitive data exposed in client-side code
- ✅ NextAuth session management configured
- ✅ Password hashing with bcrypt (if using legacy auth)
- ✅ SQL injection protection via parameterized queries

### Rate Limiting
- ✅ Guest incident submission: 5/hour (very strict)
- ✅ Authenticated incident submission: 60/minute (standard)
- ✅ Quote extraction: 30/minute (moderate)
- ✅ API keys: 60/minute per endpoint

### User Interface
- ✅ Site-wide beta disclaimer added
- ✅ Legal disclaimer on legal help pages
- ✅ Navigation restricted based on user role
- ✅ Proper error messages without exposing internals

## Pre-Deployment Checklist

### Environment Variables (Vercel/Production)
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `NEXTAUTH_URL` - Production URL (e.g., https://yourdomain.com)
- [ ] `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- [ ] `ADMIN_EMAIL` - First admin user email
- [ ] `SMTP_*` - Email configuration (if using email verification)
- [ ] `DESCOPE_PROJECT_ID` - If using Descope auth
- [ ] `DESCOPE_MANAGEMENT_KEY` - If using Descope auth

### Database Setup
- [ ] Run all migration scripts in `/scripts/` directory
- [ ] Verify database schema is up to date
- [ ] Create initial admin user
- [ ] Test database connection from production

### Security Hardening
- [ ] Verify all API routes have proper authentication
- [ ] Check rate limiting is active
- [ ] Confirm no .env files in repository
- [ ] Review all user inputs for sanitization
- [ ] Test file upload restrictions (if applicable)

### Testing
- [ ] Test user registration/login flow
- [ ] Test analyst dashboard with multiple users
- [ ] Test guest submission flow
- [ ] Verify legal help pages require authentication
- [ ] Test all CRUD operations with proper permissions

### Monitoring
- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Configure uptime monitoring
- [ ] Set up database backup schedule
- [ ] Review server logs regularly

## Known Limitations (Beta)

1. **Data Verification**: All data is currently unverified - users are warned via banner
2. **Legal Tools**: Restricted to analysts only during beta
3. **Guest Submissions**: Require manual analyst review before publication
4. **Two-Analyst Review**: Cases need two independent analysts before validation phase

## Deployment Commands

```bash
# 1. Build locally to test
npm run build

# 2. Deploy to Vercel
vercel --prod

# 3. Or push to main branch (if auto-deploy is enabled)
git push origin main
```

## Post-Deployment Verification

1. Visit production URL and verify disclaimer is visible
2. Test authentication flow
3. Verify legal help pages are hidden from public
4. Create test guest submission
5. Check database connectivity
6. Monitor error logs for first 24 hours

## Emergency Procedures

### If Database Compromised
1. Rotate `DATABASE_URL` immediately
2. Change all user passwords
3. Audit all recent database queries
4. Notify affected users

### If Sensitive Data Exposed
1. Take site offline immediately
2. Rotate all secrets (`NEXTAUTH_SECRET`, API keys)
3. Review git history for exposed credentials
4. Update security measures before redeployment

## Security Contacts

- Security issues: [Add security contact email]
- Incident response: [Add emergency contact]
