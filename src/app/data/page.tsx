import { getAllCasesFromDb } from '@/lib/cases-db';
import { getCaseStats } from '@/lib/cases';

export default async function DataPage() {
  const cases = await getAllCasesFromDb();
  const stats = getCaseStats(cases);

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Data Download</h1>
      <p className="text-gray-600 mb-8">
        Download the complete dataset for research and analysis.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Available Formats</h2>
        
        <div className="space-y-4">
          <div className="border border-gray-200 p-4">
            <h3 className="font-semibold mb-2">JSON Format</h3>
            <p className="text-sm text-gray-600 mb-4">
              Full dataset with all fields, suitable for programmatic analysis.
            </p>
            <a 
              href="/exports/ice-deaths-data.json" 
              download
              className="inline-block px-4 py-2 bg-black text-white text-sm hover:bg-gray-800"
            >
              Download JSON
            </a>
          </div>

          <div className="border border-gray-200 p-4">
            <h3 className="font-semibold mb-2">CSV Format</h3>
            <p className="text-sm text-gray-600 mb-4">
              Flattened dataset for spreadsheet applications. Some nested 
              fields are simplified.
            </p>
            <a 
              href="/exports/ice-deaths-data.csv" 
              download
              className="inline-block px-4 py-2 bg-black text-white text-sm hover:bg-gray-800"
            >
              Download CSV
            </a>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Dataset Statistics</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Total Records</dt>
            <dd className="font-semibold">{stats.totalDeaths}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Facilities Represented</dt>
            <dd className="font-semibold">{stats.facilitiesCount}</dd>
          </div>
          <div>
            <dt className="text-gray-500">States Represented</dt>
            <dd className="font-semibold">{stats.statesCount}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Deaths This Year</dt>
            <dd className="font-semibold">{stats.deathsThisYear}</dd>
          </div>
        </dl>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Data Schema</h2>
        <p className="text-sm text-gray-600 mb-4">
          Each record includes the following fields:
        </p>
        <pre className="bg-gray-50 border border-gray-200 p-4 text-xs overflow-x-auto">
{`{
  "id": "string (YYYY-MM-DD-lastname)",
  "name": "string",
  "age": "number",
  "nationality": "string",
  "date_of_death": "string (YYYY-MM-DD)",
  "facility": {
    "name": "string",
    "state": "string (2-letter code)",
    "type": "ICE facility | ICE-contracted jail | Other"
  },
  "custody_status": "Detained | Released | Other",
  "category": ["string"],
  "official_cause_of_death": "string",
  "timeline": [{
    "date": "string (YYYY-MM-DD)",
    "event": "string"
  }],
  "discrepancies": [{
    "ice_claim": "string",
    "counter_evidence": "string"
  }],
  "sources": [{
    "title": "string",
    "publisher": "string",
    "date": "string (YYYY-MM-DD)",
    "url": "string"
  }],
  "notes": "string (optional)"
}`}
        </pre>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Terms of Use</h2>
        <p className="text-sm text-gray-700 mb-4">
          This data is provided for research, journalism, and public interest 
          purposes. When using this data, please:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
          <li>Credit &quot;ICE Deaths Documentation Project&quot; as the source</li>
          <li>Do not use the data for harassment or doxing</li>
          <li>Verify information against original sources for critical applications</li>
          <li>Report any errors you discover</li>
        </ul>
      </section>
    </div>
  );
}
