# ICE Deaths Documentation Project

## Project Overview
A documentation-first investigative website presenting verified records of deaths connected to U.S. Immigration and Customs Enforcement (ICE).

## Tech Stack
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS (minimal, neutral)
- **Data Storage**: Local JSON files in `/data/cases/`
- **Deployment**: Static-site compatible (Vercel/Netlify)

## Non-Negotiable Principles
- Accuracy over persuasion
- Chronology over opinion
- Documentation over narrative
- Separation of facts, analysis, and advocacy
- No ideological language in case files

## Data Model
Each death is stored as a single file: `YYYY-MM-DD-lastname.json` in `/data/cases/`

## Presentation Rules
- White background, black text
- No stock images
- Red used only for dates of death or delays
- No adjectives in case content
- Quotes must be attributed
- ICE statements shown verbatim when available

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production (includes schema validation)
- `npm run lint` - Run linter
