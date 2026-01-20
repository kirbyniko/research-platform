'use client';

export default function ProjectTeam({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Team Management</h1>
        <p className="text-gray-600">Coming soon...</p>
      </div>
    </div>
  );
}
