# ICE Deaths Documentation Project

A documentation-first investigative website presenting verified records of deaths connected to U.S. Immigration and Customs Enforcement (ICE).

## Principles

- **Accuracy over persuasion** - Facts speak for themselves
- **Chronology over opinion** - Let timelines tell the story
- **Documentation over narrative** - Sources are everything
- **Separation of facts, analysis, and advocacy** - Clear distinctions
- **No ideological language in case files** - Neutral presentation

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Data Storage**: Local JSON files in `/data/cases/`
- **Deployment**: Static-site compatible (Vercel/Netlify)

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
```

This runs schema validation before building. The build will fail if any case files have missing required fields.

### Export Data

```bash
npm run export-data
```

Generates `public/exports/ice-deaths-data.json` and `public/exports/ice-deaths-data.csv`.

## Project Structure

```
├── data/
│   └── cases/              # Case JSON files (YYYY-MM-DD-lastname.json)
├── public/
│   └── exports/            # Generated CSV/JSON exports
├── scripts/
│   ├── validate-cases.js   # Build-time schema validation
│   └── export-data.js      # Data export script
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── cases/          # Case index and detail pages
│   │   ├── data/           # Data download page
│   │   ├── methodology/    # Documentation methodology
│   │   └── patterns/       # Pattern analysis page
│   ├── components/         # React components
│   ├── lib/                # Data loading utilities
│   └── types/              # TypeScript types
```

## Adding a Case

1. Create a new file in `data/cases/` named `YYYY-MM-DD-lastname.json`
2. Copy the template from `data/cases/_template.json`
3. Fill in all required fields
4. Run `npm run validate` to check for errors
5. Commit the new file

### Required Fields

- `id` - Must match filename (without .json)
- `name` - Full name of the deceased
- `age` - Age at time of death
- `nationality` - Country of origin
- `date_of_death` - YYYY-MM-DD format
- `facility` - Object with `name`, `state`, `type`
- `custody_status` - "Detained", "Released", or "Other"
- `category` - Array of categories (e.g., "Medical neglect")
- `official_cause_of_death` - Official statement
- `timeline` - Array of dated events
- `sources` - At least one source with title, publisher, date, url

## Deployment

The project is configured for static export. Deploy to any static host:

### Vercel

```bash
npm install -g vercel
vercel
```

### Netlify

Connect your repository and set:
- Build command: `npm run build`
- Publish directory: `out`

## License

This project is open source. Data is provided for research, journalism, and public interest purposes.
