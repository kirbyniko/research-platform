'use client';

interface CaseFiltersProps {
  years: number[];
  states: string[];
  categories: string[];
  facilities: string[];
}

export function CaseFilters({ years, states, categories, facilities }: CaseFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <select className="filter-select" aria-label="Filter by year">
        <option value="">All years</option>
        {years.map(year => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>

      <select className="filter-select" aria-label="Filter by state">
        <option value="">All states</option>
        {states.map(state => (
          <option key={state} value={state}>{state}</option>
        ))}
      </select>

      <select className="filter-select" aria-label="Filter by category">
        <option value="">All categories</option>
        {categories.map(category => (
          <option key={category} value={category}>{category}</option>
        ))}
      </select>

      <select className="filter-select" aria-label="Filter by facility">
        <option value="">All facilities</option>
        {facilities.map(facility => (
          <option key={facility} value={facility}>{facility}</option>
        ))}
      </select>
    </div>
  );
}
