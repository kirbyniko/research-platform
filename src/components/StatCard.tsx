interface StatCardProps {
  number: number;
  label: string;
  highlight?: boolean;
}

export function StatCard({ number, label, highlight = false }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className={`stat-number ${highlight ? 'death-date' : ''}`}>
        {number}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
