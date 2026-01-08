export default function MethodologyPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Methodology</h1>
      <p className="text-gray-600 mb-8">
        How we document and verify cases.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Inclusion Criteria</h2>
        <p className="mb-4">
          A death is included in this database if it meets ALL of the following criteria:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>
            The individual was in ICE custody at the time of death, or died 
            shortly after release while their death is connected to conditions 
            of detention
          </li>
          <li>
            The death has been reported by at least one credible source 
            (see Source Standards below)
          </li>
          <li>
            Basic identifying information is available (name, approximate date)
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Source Standards</h2>
        <p className="mb-4">
          We accept the following source types, listed in order of priority:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Official ICE press releases or statements</li>
          <li>Court documents, autopsy reports, and government records</li>
          <li>
            Reporting from established news organizations with editorial 
            standards (e.g., AP, Reuters, major newspapers)
          </li>
          <li>Reports from human rights organizations with documented methodology</li>
          <li>Local news coverage with named sources</li>
        </ol>
        <p className="mt-4 text-sm text-gray-600">
          Social media posts, anonymous claims, and unverified reports are 
          not sufficient for inclusion.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Data Entry Process</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>A death is identified through news monitoring or official releases</li>
          <li>
            A case file is created with all available information from 
            primary sources
          </li>
          <li>Timeline events are extracted from source documents</li>
          <li>
            Discrepancies between official statements and other evidence 
            are noted without editorial comment
          </li>
          <li>The case is validated against our schema before publication</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">What We Do Not Include</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Opinion, editorial commentary, or characterization</li>
          <li>Adjectives describing conditions (e.g., &quot;horrific,&quot; &quot;negligent&quot;)</li>
          <li>Speculation about causes or responsibility</li>
          <li>Photographs of deceased individuals</li>
          <li>Information that could endanger family members</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Updates and Corrections</h2>
        <p className="mb-4">
          Case files are updated when:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Autopsy results become available</li>
          <li>New source material is published</li>
          <li>Errors are identified and verified</li>
        </ul>
        <p className="mt-4">
          All changes are tracked in version control. Previous versions of 
          case files can be viewed in the project&apos;s Git history.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Contact</h2>
        <p className="text-gray-700">
          To report an error, suggest a correction, or submit documentation 
          for a case, please open an issue on our GitHub repository or 
          contact us via email.
        </p>
        <p className="mt-4 text-sm text-gray-500">
          [Contact information placeholder - replace with actual contact details]
        </p>
      </section>
    </div>
  );
}
