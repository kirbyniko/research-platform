# Advanced Settings - Access Guide

## Where to Find Everything

### Record Type Settings (Guest Forms, Quote Requirements, Validation)

**Access Path:**
1. Go to your project: `/projects/{your-project-slug}`
2. Click on any Record Type (e.g., "Death Records", "Incident Reports")
3. Click the **"Advanced Settings"** button

**Or directly:** `/projects/{project-slug}/record-types/{type-slug}/settings`

**What You Can Configure:**
- **Guest Form Mode:**
  - Custom (select specific fields)
  - Mirror Review (guest sees same as review form)
  - Disabled (no guest submissions)
  
- **Analyst Skip Guest Form:** Allow analysts to submit directly via review form

- **Quote Requirements:**
  - Require quotes for review approval
  - Require sources for all quotes
  - Role-based bypass (which roles can skip quote requirements)

- **Validation Requirements:**
  - Require all fields verified to publish
  - Role-based bypass (which roles can skip validation)

- **Per-Field Settings:**
  - Which fields require quotes
  - Which fields show in guest form (when using Custom mode)

---

### Database & Storage Usage

**Access Path:**
1. Go to project settings: `/projects/{your-project-slug}/settings`
2. Click the **Storage** tab
3. Click **"View detailed usage →"**

**Or directly:** `/projects/{project-slug}/settings/usage`

**What You Can View:**
- Storage overview (media + database)
- Record/quote/source/field counts
- Records breakdown by type
- Records breakdown by status (draft, pending_review, etc.)
- Total database size estimate

---

## Example Workflows

### Setting Up a Public Guest Form

1. **Go to Record Type Settings** (path above)
2. **Guest Form Mode:** Select "Custom"
3. **Guest Form Fields Section:** Check which fields to show
4. **Quote Requirements:** Enable if needed
5. **Save Settings**

### Requiring Quotes for Review

1. **Go to Record Type Settings**
2. Enable **"Require quotes for review approval"**
3. Scroll to **"Per-Field Quote Requirements"**
4. Check "Requires quote" for specific fields
5. Optionally: Enable role-based bypass for admins
6. **Save Settings**

### Analysts Submit Directly (Skip Guest Form)

1. **Go to Record Type Settings**
2. Enable **"Analysts can skip guest form"**
3. **Save Settings**
4. Analysts now see review form when creating records

---

## Database Migration Status

✅ Migration `014-advanced-settings.sql` has been applied
- Added columns to `record_types`, `field_definitions`, `project_storage_usage`, `users`
- Created functions: `calculate_project_database_usage()`, `update_project_storage_usage()`

## API Endpoints

- `GET/PATCH /api/projects/[slug]/record-types/[type]/settings` - Record type settings
- `GET /api/projects/[slug]/usage/database` - Database usage stats
- `PATCH /api/projects/[slug]/record-types/[type]/fields/[fieldId]` - Field visibility

---

## Quick Reference

| Feature | Location | Path |
|---------|----------|------|
| Guest form config | Record Type Settings | `/projects/{slug}/record-types/{type}/settings` |
| Quote requirements | Record Type Settings | Same as above |
| Field visibility | Record Type Settings | Same as above |
| Database usage | Storage > Usage | `/projects/{slug}/settings/usage` |
| Storage plans | Project Settings > Storage | `/projects/{slug}/settings` (Storage tab) |

---

## Documentation

Full technical details: [ADVANCED-SETTINGS-PLAN.md](./ADVANCED-SETTINGS-PLAN.md)
