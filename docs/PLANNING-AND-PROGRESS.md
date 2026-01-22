# Research Platform - Planning and Progress Tracker

**Last Updated:** January 22, 2026  
**Current Phase:** Media System Integration & Verification Enhancement

---

## 🎯 Current System State

### Database (Neon PostgreSQL - Production)
- **Applied Migrations:** 001-017
  - 001: Core platform schema (projects, record_types, records, field_definitions, etc.)
  - 002: Project tags system
  - 003: File upload system
  - 014: Advanced workflow settings
  - 015: Verification system (verification_requests, verification_results, verification_sessions, etc.)
  - 016: Verifier role system (verifier_stats, user verifier columns)
  - 017: **NEW** Media system and default field settings (record_media table, use_quotes/use_sources/use_media columns)

### Core Architecture
- **Framework:** Next.js 14 (App Router)
- **Database:** Neon PostgreSQL (serverless)
- **Deployment:** Vercel (production)
- **Authentication:** Custom JWT-based auth system
- **Styling:** Tailwind CSS

---

## ✅ Completed Features

### 1. Platform Foundation
- [x] Multi-project architecture
- [x] Record types (customizable schemas per project)
- [x] Field definitions with groups
- [x] Guest submission forms
- [x] Role-based permissions (owner, editor, reviewer, validator, viewer)

### 2. Workflow System
- [x] Three-stage workflow: Submission → Review → Validation → Verified
- [x] Status tracking (pending_review, pending_validation, verified, rejected, archived)
- [x] Internal validation checkboxes for field verification
- [x] Record type settings for workflow customization

### 3. Default Data Types
- [x] **Quotes** (record_quotes table)
  - Quote text, source, source_url, source_date, source_type
  - Field linking (which fields the quote supports)
  - Source type classification (primary/secondary)
- [x] **Sources** (record_sources table)
  - URL, title, source_type, accessed_date, archived_url, notes
  - Field linking
- [x] **Media** (record_media table) 🆕
  - Video, image, audio, document, embed types
  - Auto-detection of providers (YouTube, Vimeo, Twitter)
  - Embed URL generation
  - Metadata (thumbnail, duration, file_size, mime_type)
  - Field linking

### 4. Third-Party Verification System
- [x] Verification levels (0=None, 1=Self-Verified, 2=Audit-Ready, 3=Independently Verified)
- [x] Verification scopes (record-level hash vs field-level granular)
- [x] Verification requests with assignment to verifiers
- [x] Verifier dashboard and queue
- [x] Verification page with:
  - Full inline record display
  - Field-by-field checkboxes
  - Quote verification checkboxes 🆕
  - Source verification checkboxes 🆕
  - Sticky scrollable panel
  - Verification result tracking (passed/partial/failed)
- [x] Verification results display on record detail pages
- [x] Verification activity tracking

### 5. Public Viewing
- [x] Public records list (card-based layout for non-authenticated users)
- [x] Record detail pages with article-style presentation
- [x] Color-coded quotes by source type:
  - Blue cards for primary sources
  - Amber cards for secondary sources
  - Legend showing source type indicators
- [x] Verification badges (✓✓✓ Independently Verified)
- [x] Verified field/quote/source indicators
- [x] Smart navigation (authenticated users → dashboard, public viewers → records list)

### 6. Media Embedding System 🆕
- [x] MediaEmbed React component
- [x] Provider support:
  - YouTube (responsive iframe)
  - Vimeo (responsive iframe)
  - Twitter/X (link with CTA)
  - Direct images (full-width with captions)
  - Direct video files (HTML5 player)
  - Direct audio files (HTML5 player)
  - Generic iframes (sandboxed)
- [x] Media API routes (GET, POST, PATCH, DELETE)
- [x] Media display on record detail pages

---

## 🚧 In Progress

### Current Sprint Goals
1. ~~Media system foundation~~ ✅ DONE
2. Media UI for adding/managing media during review/validation
3. Record type settings UI for enabling/disabling quotes/sources/media
4. Media verification checkboxes (like quotes/sources)

---

## 📋 Planned Features

### Phase 1: Media System Completion (Next)
- [ ] UI form to add media links during record review/validation
- [ ] Media upload during record creation/editing
- [ ] Record type settings page UI:
  - Toggle `use_quotes` per record type
  - Toggle `use_sources` per record type
  - Toggle `use_media` per record type
- [ ] Media management section in validation page (similar to quotes/sources)
- [ ] Media verification checkboxes in verification page
- [ ] Thumbnail generation for videos (external service integration)

### Phase 2: Advanced Features
- [ ] Proposed changes system (track edit suggestions)
- [ ] Change history/audit log
- [ ] Duplicate detection improvements
- [ ] Advanced search and filtering
- [ ] Export functionality (JSON, CSV)
- [ ] API documentation (OpenAPI/Swagger)

### Phase 3: Analytics & Reporting
- [ ] Record statistics dashboard
- [ ] Verification metrics (completion rate, time-to-verify)
- [ ] User activity reports
- [ ] Data quality indicators

### Phase 4: Collaboration
- [ ] Comments system on records
- [ ] Real-time notifications
- [ ] Activity feed
- [ ] Collaborative editing

---

## 🗂️ Database Schema Overview

### Core Tables
- `projects` - Multi-tenant project containers
- `record_types` - Customizable schemas per project (now includes use_quotes, use_sources, use_media)
- `field_groups` - Organize fields into collapsible sections
- `field_definitions` - Field schema with types and validation
- `records` - Actual data records with JSONB data column

### Default Data Type Tables
- `record_quotes` - Quotes supporting record fields
- `record_sources` - Source citations with URLs
- `record_media` - Media attachments (videos, images, audio, documents) 🆕

### Verification System Tables
- `verification_requests` - Request for 3rd party verification
- `verification_results` - Granular verification outcomes (field/quote/source level)
- `verification_sessions` - Session tracking for verifiers
- `verification_history` - Audit trail of verification actions
- `verification_disputes` - Challenges to verification results
- `verification_feedback` - Verifier feedback on records
- `case_verifications` - Legacy verification tracking
- `verifier_stats` - Verifier performance metrics

### User & Permission Tables
- `users` - User accounts (includes is_verifier, verifier_since, verifier_specialty columns)
- `project_members` - User-project-role associations
- `project_invitations` - Pending invitations

### Workflow Tables
- `tags` - Categorization tags
- `record_tags` - Tag associations
- `proposed_changes` - Edit suggestions (placeholder)

---

## 🎨 UI/UX Patterns

### Record Detail Page Structure
1. **Header**
   - Back navigation (context-aware: dashboard for authenticated, records list for public)
   - Verification level badge (when applicable)
2. **Title/Summary Section**
   - Record type, date
   - Main title field
   - Summary field (if present)
3. **Main Content**
   - Fields rendered as narrative sections
   - Verified fields show inline "✓ Verified" badge
   - Inline footnote references [1], [2], etc.
4. **References Section**
   - Color-coded quote cards (blue=primary, amber=secondary)
   - Legend showing source types
   - Verified quotes show checkmark
5. **Sources Section**
   - Clickable source links
   - Source type badges
   - Verified sources show checkmark
6. **Media Section** 🆕
   - Embedded videos, images, audio
   - Provider-specific rendering
7. **Record Metadata** (authenticated users only)
   - Status, workflow stages
   - Submission/review/validation details
   - Action buttons (Review, Validate, Propose Edit, Request Verification, Delete)

### Verification Page Structure
1. **Header** - Request details, status
2. **Main Column (Scrollable)**
   - Full record display inline
   - Each field with checkbox and value
   - Quotes under their linked fields with checkboxes
   - Sources list with checkboxes
   - Media items with checkboxes (TODO)
3. **Sticky Right Panel**
   - Verification checklist
   - Notes/caveats textarea
   - Action buttons (Mark as Passed/Partial/Failed)

---

## 🔧 Technical Decisions

### 1. Default Data Types (Quotes, Sources, Media)
**Decision:** Make these built-in table structures rather than custom fields  
**Rationale:**
- Need special handling (linking, verification, display)
- Consistent across all projects
- Can be enabled/disabled per record type via settings

### 2. Verification Levels
**Decision:** Four-level system (0-3)  
**Rationale:**
- 0=None: No verification needed
- 1=Self-Verified: Internal team verified
- 2=Audit-Ready: Ready for external review
- 3=Independently Verified: Completed by 3rd party
- Provides clear progression and trust indicators

### 3. Field Linking for Quotes/Sources/Media
**Decision:** TEXT[] array of field slugs  
**Rationale:**
- Simple, flexible
- Easy to query which quotes support a field
- Doesn't require complex junction tables

### 4. JSONB for Record Data
**Decision:** Store field values in JSONB column  
**Rationale:**
- Flexible schema per record type
- PostgreSQL JSONB performance is excellent
- Can index specific fields if needed
- Allows dynamic field definitions

### 5. Color-Coded Sources
**Decision:** Blue for primary, amber for secondary  
**Rationale:**
- Visual distinction at a glance
- Helps readers assess source quality
- Non-intrusive styling

---

## 🐛 Known Issues

### High Priority
- [ ] Database migration runner has connection string parsing issues with quotes in .env files
  - **Workaround:** Use Vercel deployment to run migrations automatically
  - **Solution:** Create more robust migration runner script

### Medium Priority
- [ ] Record type settings UI doesn't exist yet for use_quotes/use_sources/use_media toggles
- [ ] Media verification not integrated into verification page yet
- [ ] No UI for adding media during review/validation workflow

### Low Priority
- [ ] Twitter/X embeds show as links only (not embedded tweets)
  - **Note:** Would require Twitter API integration or embed script
- [ ] No thumbnail generation for videos
- [ ] No media file size validation

---

## 📊 API Routes Structure

### Records
- `GET/POST /api/projects/[slug]/records` - List/create records
- `GET/PATCH/DELETE /api/projects/[slug]/records/[recordId]` - Individual record operations
- `POST /api/projects/[slug]/records/[recordId]/request-verification` - Request 3rd party verification
- `POST /api/projects/[slug]/records/[recordId]/verify-field` - Internal field verification

### Quotes
- `GET/POST /api/projects/[slug]/records/[recordId]/quotes` - List/create quotes
- `PATCH/DELETE /api/projects/[slug]/records/[recordId]/quotes/[quoteId]` - Update/delete

### Sources
- `GET/POST /api/projects/[slug]/records/[recordId]/sources` - List/create sources
- `PATCH/DELETE /api/projects/[slug]/records/[recordId]/sources/[sourceId]` - Update/delete

### Media 🆕
- `GET/POST /api/projects/[slug]/records/[recordId]/media` - List/create media
- `PATCH/DELETE /api/projects/[slug]/records/[recordId]/media/[mediaId]` - Update/delete

### Verification
- `GET /api/admin/verification-requests` - List all verification requests
- `GET/POST /api/admin/verification-requests/[requestId]` - Get/update specific request
- `POST /api/admin/verification-requests/[requestId]/complete` - Complete verification

### Admin
- `GET /api/admin/verifiers` - List verifiers
- `GET/PATCH /api/admin/verifiers/[verifierId]` - Manage verifier

---

## 🎓 Key Concepts for Future Reference

### Verification Workflow
1. **Request Creation:** User clicks "Request 3rd Party Verification" on a validated record
2. **Assignment:** Admin assigns request to a verifier
3. **Review:** Verifier opens verification page, sees full record with checkboxes
4. **Granular Verification:** Verifier checks off each field/quote/source individually
5. **Completion:** Verifier marks as passed/partial/failed with optional notes
6. **Result Storage:** Individual verification results stored in verification_results table
7. **Display:** Record detail page shows ✓ indicators next to verified items

### Field Linking
Quotes, sources, and media can be linked to specific fields:
- Stored as TEXT[] array: `["field_slug_1", "field_slug_2"]`
- Displayed inline under the field on record pages
- Helps readers understand which evidence supports which claim

### Provider Detection (Media)
The media API automatically detects URLs and extracts embed information:
- YouTube: Extracts video ID, creates embed URL
- Vimeo: Extracts video ID, creates player URL
- Direct media: Detects file extensions (.mp4, .jpg, .mp3, etc.)
- Falls back to generic embed for unknown types

---

## 📝 Notes for Future Development

### When Adding New Features
1. Check if database migration is needed
2. Update TypeScript types in `src/types/platform.ts`
3. Create API routes in `src/app/api/`
4. Build UI components in `src/components/` or page-specific locations
5. Update this document with progress
6. Test with real data on local environment
7. Deploy to production via Git push + Vercel

### When Troubleshooting
1. Check browser console for client-side errors
2. Check Vercel function logs for API errors
3. Check database schema in Neon console
4. Verify environment variables are set correctly
5. Check that migrations have run on production database

### Code Style Guidelines
- Use TypeScript for all new code
- Follow existing patterns for API routes (requireServerAuth, error handling)
- Use Tailwind for styling
- Keep components small and focused
- Document complex logic with comments
- Use meaningful variable names

---

## 🚀 Deployment Process

1. **Development**
   - Make changes locally
   - Test with `npm run dev`
   - Build with `npm run build` to check for errors

2. **Commit**
   - Stage changes: `git add -A`
   - Commit with descriptive message: `git commit -m "..."`
   - Push to GitHub: `git push`

3. **Deploy**
   - Vercel auto-deploys on push to main branch
   - Or manual deploy: `vercel --prod`
   - Check deployment logs at vercel.com

4. **Verify**
   - Test on production URL
   - Check that migrations ran (if added)
   - Verify new features work correctly

---

## 📞 Integration Points

### Current Integrations
- Neon PostgreSQL (database)
- Vercel (hosting, serverless functions)
- GitHub (version control, CI/CD)

### Potential Future Integrations
- AWS S3 / Cloudflare R2 (media storage)
- OpenAI / Anthropic (AI-assisted verification)
- Twitter API (proper tweet embeds)
- YouTube API (video metadata, thumbnails)
- SendGrid / Resend (email notifications)
- Stripe (premium features, subscriptions)

---

**End of Document**

*This document should be updated regularly as features are completed, issues are discovered, and architectural decisions are made.*
