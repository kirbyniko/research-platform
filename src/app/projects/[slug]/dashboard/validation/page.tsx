'use client';

export default function DashboardValidation({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Validation Queue</h1>
        <p className="text-gray-600">Records pending validation will appear here</p>
      </div>
    </div>
  );
}
