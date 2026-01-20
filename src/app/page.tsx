import Link from 'next/link';
import { auth } from '@/lib/next-auth';

export default async function HomePage() {
  const session = await auth();
  
  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Research Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          A multi-project research documentation platform with verified records,
          quote tracking, and collaborative workflows.
        </p>
        
        {session ? (
          <Link
            href="/projects"
            className="inline-block px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            Go to Your Projects
          </Link>
        ) : (
          <Link
            href="/api/auth/signin"
            className="inline-block px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            Sign In to Get Started
          </Link>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-lg mb-2">Custom Projects</h3>
          <p className="text-gray-600 text-sm">
            Create projects with custom record types and fields tailored to your research needs.
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-lg mb-2">Verification Workflow</h3>
          <p className="text-gray-600 text-sm">
            Guest submissions flow through Review then Validation before publication.
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-lg mb-2">Quote Tracking</h3>
          <p className="text-gray-600 text-sm">
            Link quotes and sources to specific fields for transparent documentation.
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-6">How It Works</h2>
        <div className="space-y-4">
          <div className="flex items-start space-x-4">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">1</span>
            <div>
              <h4 className="font-medium">Create a Project</h4>
              <p className="text-sm text-gray-600">Define your research area with a name, description, and team members.</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">2</span>
            <div>
              <h4 className="font-medium">Define Record Types</h4>
              <p className="text-sm text-gray-600">Create custom record types with the fields you need.</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">3</span>
            <div>
              <h4 className="font-medium">Collect and Verify Data</h4>
              <p className="text-sm text-gray-600">Accept submissions, review with supporting quotes, then validate for publication.</p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-gray-500 mt-8">
        Built for transparent, verifiable research documentation.
      </p>
    </div>
  );
}
