'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Infographic, NarrativeBlock } from '@/types/platform';
import { DotGridPreview } from '@/components/infographics/DotGridPreview';
import { CounterPreview } from '@/components/infographics/CounterPreview';
import { InfographicViewer } from '@/components/infographics/InfographicViewer';
import { ScrollytellingConfig } from '@/components/infographics/engine/ScrollytellingEngine';

// Simple icon components
const CheckBadgeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ShareIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
  </svg>
);

interface InfographicData {
  records?: Array<Record<string, unknown>>;
  count: number;
  groupedData?: Record<string, { count: number }>;
  colorGroups?: Record<string, { count: number; color?: string }>;
}

export default function PublicInfographicPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const isEmbed = searchParams?.get('embed') === 'true';
  
  const [infographic, setInfographic] = useState<Infographic | null>(null);
  const [data, setData] = useState<InfographicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInfographic();
  }, [resolvedParams.id]);

  async function fetchInfographic() {
    try {
      // Try public endpoint first
      let url = `/api/infographics/${resolvedParams.id}${isEmbed ? '?embed=true' : ''}`;
      let res = await fetch(url);
      
      // If 404, try preview endpoint (for authenticated members viewing drafts)
      if (res.status === 404) {
        url = `/api/infographics/${resolvedParams.id}/preview${isEmbed ? '?embed=true' : ''}`;
        res = await fetch(url);
      }
      
      if (!res.ok) {
        if (res.status === 404) {
          setError('Infographic not found');
        } else if (res.status === 401) {
          setError('Sign in to preview this infographic');
        } else if (res.status === 403) {
          setError('Access denied');
        } else {
          throw new Error('Failed to load');
        }
        return;
      }
      
      const result = await res.json();
      setInfographic(result.infographic);
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load infographic');
    } finally {
      setLoading(false);
    }
  }

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: infographic?.name,
          text: infographic?.description,
          url
        });
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard');
    }
  };

  const renderVisualization = () => {
    if (!infographic || !data) return null;

    // Check for scrollytelling config
    const config = infographic.config as unknown as Record<string, unknown>;
    if (config?.scenes && Array.isArray(config.scenes)) {
      // Use the full scrollytelling viewer
      return (
        <InfographicViewer
          infographic={{
            id: infographic.id,
            title: infographic.name,
            description: infographic.description,
            config: config as unknown as ScrollytellingConfig,
            verification_status: infographic.verification_status,
            theme: config.theme as 'light' | 'dark'
          }}
          data={data.records || []}
        />
      );
    }

    switch (infographic.component_type) {
      case 'dot-grid':
        return (
          <DotGridPreview 
            config={infographic.config as any} 
            data={data}
            narrative={infographic.narrative_content}
            animated={true}
          />
        );
      case 'counter':
        return (
          <CounterPreview 
            config={infographic.config as any} 
            count={data.count}
            narrative={infographic.narrative_content}
          />
        );
      default:
        return (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">Visualization: {infographic.component_type}</p>
            <p>Data points: {data.count}</p>
          </div>
        );
    }
  };

  // Check if this is a scrollytelling infographic for full-page experience
  const isScrollytelling = infographic && 
    (infographic.config as unknown as Record<string, unknown>)?.scenes && 
    Array.isArray((infographic.config as unknown as Record<string, unknown>).scenes);

  // Embed mode - minimal chrome
  if (isEmbed) {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-gray-400">Loading...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-red-500">{error}</div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-white p-6">
        {infographic && (
          <>
            {/* Minimal header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{infographic.name}</h1>
              {infographic.description && (
                <p className="text-gray-500 mt-1">{infographic.description}</p>
              )}
            </div>
            
            {/* Visualization */}
            {renderVisualization()}
            
            {/* Attribution */}
            <div className="mt-6 pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
              <a 
                href={`${typeof window !== 'undefined' ? window.location.origin : ''}/infographics/${infographic.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-600"
              >
                View on {infographic.project?.name || 'Research Platform'}
              </a>
            </div>
          </>
        )}
      </div>
    );
  }

  // Full page view
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading infographic...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">{error}</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (!infographic) return null;

  // For scrollytelling, render full-page experience without header chrome
  if (isScrollytelling) {
    return renderVisualization();
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ← Home
            </Link>
            {infographic.project && (
              <span className="text-gray-400">|</span>
            )}
            {infographic.project && (
              <span className="text-sm text-gray-500">
                {infographic.project.name}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {infographic.verification_status === 'verified' && (
              <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                <CheckBadgeIcon className="w-4 h-4" />
                Verified
              </span>
            )}
            <button
              onClick={handleShare}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Share"
            >
              <ShareIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {infographic.name}
          </h1>
          {infographic.description && (
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              {infographic.description}
            </p>
          )}
        </div>

        {/* Visualization */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 mb-12">
          {renderVisualization()}
        </div>

        {/* Metadata */}
        <div className="text-center text-sm text-gray-400 space-y-2">
          <p>
            Data last updated: {new Date(infographic.updated_at || infographic.created_at).toLocaleDateString()}
          </p>
          {infographic.record_type && (
            <p>
              Based on {data?.count || 0} verified {infographic.record_type.name.toLowerCase()} records
            </p>
          )}
          {infographic.verified_at && (
            <p>
              Content verified on {new Date(infographic.verified_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">
            Created with Research Platform
          </p>
          {infographic.allow_embed && (
            <details className="mt-4 text-left max-w-lg mx-auto">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Embed this infographic
              </summary>
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <code className="text-xs text-gray-600 break-all">
                  {`<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/infographics/${infographic.id}?embed=true" width="100%" height="600" frameborder="0"></iframe>`}
                </code>
                <button
                  onClick={() => {
                    const code = `<iframe src="${window.location.origin}/infographics/${infographic.id}?embed=true" width="100%" height="600" frameborder="0"></iframe>`;
                    navigator.clipboard.writeText(code);
                    alert('Embed code copied!');
                  }}
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  Copy embed code
                </button>
              </div>
            </details>
          )}
        </div>
      </footer>
    </div>
  );
}
