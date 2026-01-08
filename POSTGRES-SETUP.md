# PostgreSQL Setup Instructions

## 1. Create the database

```powershell
psql -U postgres
```

Then in psql:
```sql
CREATE DATABASE ice_deaths;
\c ice_deaths
```

## 2. Run the schema

```powershell
psql -U postgres -d ice_deaths -f scripts/db-schema.sql
```

## 3. Migrate existing JSON data to PostgreSQL

```powershell
$env:DATABASE_URL="postgresql://postgres:password@localhost:5432/ice_deaths"; node scripts/migrate-to-postgres.js
```

## 4. Restart the dev server

The dev server should automatically pick up the changes. If not, restart it.

## What Changed

- **Database**: All case data now stored in PostgreSQL
- **API Route**: `/api/cases` - POST endpoint to save cases
- **Editor**: "Save to Database" button saves directly to PostgreSQL (no more downloading JSON files)
- **Static Export**: Disabled to enable API routes and dynamic data

## Database Schema

- `cases` - Main case information
- `facilities` - Facility details
- `timeline_events` - Timeline entries
- `discrepancies` - ICE claims vs evidence
- `sources` - Source citations
- `categories` - Case categories

## Usage

1. Click "Edit Case Data" on any case page
2. Edit fields in Form or JSON mode
3. Click "Save to Database" to persist changes immediately
4. Changes are live instantly - no rebuild needed
