import { Case } from '@/types/case';

interface CaseListItemProps {
  caseData: Case;
}

export function CaseListItem({ caseData }: CaseListItemProps) {
  return (
    <a 
      href={`/cases/${caseData.id}`} 
      className="case-list-item block hover:bg-gray-50"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <span className="font-medium">{caseData.name}</span>
          <span className="text-gray-500 ml-2">
            {caseData.age}, {caseData.nationality}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="death-date font-medium">
            {caseData.date_of_death}
          </span>
          <span className="text-gray-500">
            {caseData.facility.name}, {caseData.facility.state}
          </span>
        </div>
      </div>
      <div className="mt-1 text-sm text-gray-600">
        {caseData.category.join(' · ')}
      </div>
    </a>
  );
}
