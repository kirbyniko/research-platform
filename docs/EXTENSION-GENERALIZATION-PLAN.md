# Extension Generalization Plan

## Goal
Transform the hard-coded ICE Deaths browser extension into a generalized research platform extension that works with ANY project configured in the platform.

## ✅ COMPLETED

### Phase 1: Core Infrastructure
- [x] Created `project-api.js` - API module for multi-project operations
- [x] Created `dynamic-form.js` - Dynamic form renderer from field definitions
- [x] Updated `manifest.json` - Changed name to "Research Platform", version 2.0
- [x] Added project context bar to `sidepanel.html`
- [x] Added project/record-type selectors to UI

### Phase 2: State Management
- [x] Added multi-project state variables to `sidepanel.js`
- [x] Added multi-project state variables to `background.js`
- [x] Implemented `initProjectContext()` function
- [x] Implemented `loadProjects()` function
- [x] Implemented `selectProject()` function
- [x] Implemented `selectRecordType()` function

### Phase 3: Dynamic Context Menus
- [x] Added `PROJECT_CHANGED` message handler in background.js
- [x] Added `RECORD_TYPE_CHANGED` message handler in background.js
- [x] Implemented `buildContextMenusFromDynamicFields()` function
- [x] Context menus now rebuild when record type changes

### Phase 4: Configuration Updates
- [x] Changed default API URL to `https://research-platform-beige.vercel.app`
- [x] Updated reset button to use new production URL
- [x] Updated API URL display in settings

## 🔄 STILL NEEDED (Future Work)

### Dynamic Form Rendering
The form currently still uses the legacy ICE Deaths hard-coded fields. To fully generalize:
- [ ] Replace static form sections with dynamic form container
- [ ] Call `DynamicForm.render()` when record type is selected
- [ ] Handle form data collection with `DynamicForm.collectValues()`
- [ ] Implement conditional visibility with `DynamicForm.applyConditionalVisibility()`

### API Call Updates
The save/load functions still use old endpoints. Need to update:
- [ ] `saveCase()` → use `/api/projects/[slug]/records`
- [ ] Quote operations → use `/api/projects/[slug]/records/[id]/quotes`
- [ ] Source operations → use `/api/projects/[slug]/records/[id]/sources`
- [ ] Review queue → use `/api/projects/[slug]/records?status=pending_review`

### UI Polish
- [ ] Show project name in header
- [ ] Update tab labels dynamically based on record type
- [ ] Add record type icon to UI

## API Mapping (Reference)

| Old Endpoint | New Endpoint |
|-------------|--------------|
| `/api/incidents` | `/api/projects/[slug]/records` |
| `/api/incidents/[id]` | `/api/projects/[slug]/records/[id]` |
| `/api/incidents/[id]/quotes` | `/api/projects/[slug]/records/[id]/quotes` |
| `/api/incidents/[id]/sources` | `/api/projects/[slug]/records/[id]/sources` |
| `/api/auth/me` | `/api/auth/me` (unchanged) |

## How to Test

1. Load the extension from `c:\Users\nikow\research-platform\extension`
2. Open the sidepanel
3. Go to Settings tab and add your API key
4. Project selector should populate with available projects
5. Select a project → record type selector enables
6. Select a record type → context menus rebuild with that type's fields
7. Right-click selected text → should see field groups from the selected record type

## Files Modified

- `extension/manifest.json` - Updated name, version, API URLs
- `extension/sidepanel.html` - Added project context bar, scripts
- `extension/sidepanel.js` - Added project selection logic
- `extension/background.js` - Added dynamic menu building
- `extension/project-api.js` - NEW: API module
- `extension/dynamic-form.js` - NEW: Form renderer
