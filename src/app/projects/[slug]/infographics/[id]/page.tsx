'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Infographic, NarrativeBlock, InfographicConfig } from '@/types/platform';
import { 
  DotGridPreview,
  CounterPreview,
  ConfigEditor,
  NarrativeEditor,
  InfographicViewer, 
  InfographicCreator 
} from '@/components/infographics';
import { InfographicAIAssistant, AIGeneratedInfographic } from '@/components/infographics/ai/InfographicAIAssistant';
import { ScrollytellingConfig } from '@/components/infographics/engine/ScrollytellingEngine';
import { SceneEditor, Scene } from '@/components/infographics/editor/SceneEditor';

// Simple icon components
const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);
const EyeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const Cog6ToothIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const DocumentTextIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const GlobeAltIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);
const CheckBadgeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const PlayIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

type TabType = 'preview' | 'scrollytelling' | 'config' | 'narrative' | 'publish';

interface InfographicData {
  records?: Array<Record<string, unknown>>;
  count: number;
  groupedData?: Record<string, { count: number; records?: unknown[] }>;
  colorGroups?: Record<string, { count: number; color?: string }>;
  fields?: Array<{ slug: string; name: string; type: string }>;
}

export default function InfographicEditorPage({ 
  params 
}: { 
  params: Promise<{ slug: string; id: string }> 
}) {
  const resolvedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<TabType>('preview');
  const [infographic, setInfographic] = useState<Infographic | null>(null);
  const [data, setData] = useState<InfographicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    if (status === 'authenticated') {
      fetchInfographic();
    }
  }, [status, resolvedParams.slug, resolvedParams.id]);

  async function fetchInfographic() {
    try {
      setLoading(true);
      
      // Fetch project info for role
      const projectRes = await fetch(`/api/projects/${resolvedParams.slug}`);
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setUserRole(projectData.role);
      }
      
      // Fetch infographic
      const res = await fetch(
        `/api/projects/${resolvedParams.slug}/infographics/${resolvedParams.id}`
      );
      
      if (!res.ok) {
        throw new Error('Failed to fetch infographic');
      }
      
      const infographicData = await res.json();
      setInfographic(infographicData.infographic);
      
      // Fetch visualization data
      const dataRes = await fetch(
        `/api/projects/${resolvedParams.slug}/infographics/${resolvedParams.id}/data`
      );
      
      if (dataRes.ok) {
        const vizData = await dataRes.json();
        setData(vizData.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load infographic');
    } finally {
      setLoading(false);
    }
  }

  const handleConfigChange = useCallback((newConfig: InfographicConfig) => {
    if (!infographic) return;
    setInfographic({ ...infographic, config: newConfig });
    setHasUnsavedChanges(true);
  }, [infographic]);

  const handleNarrativeChange = useCallback((newNarrative: NarrativeBlock[]) => {
    if (!infographic) return;
    setInfographic({ ...infographic, narrative_content: newNarrative });
    setHasUnsavedChanges(true);
  }, [infographic]);

  const handleSave = async () => {
    if (!infographic) return;
    
    setSaving(true);
    try {
      const res = await fetch(
        `/api/projects/${resolvedParams.slug}/infographics/${resolvedParams.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: infographic.config,
            narrative_content: infographic.narrative_content
          })
        }
      );
      
      if (!res.ok) throw new Error('Failed to save');
      
      setHasUnsavedChanges(false);
      setLastSaveTime(new Date());
    } catch (err) {
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!infographic) return;
    
    if (!confirm('Are you sure you want to publish this infographic? It will be publicly accessible.')) {
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch(
        `/api/projects/${resolvedParams.slug}/infographics/${resolvedParams.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'published',
            is_public: true
          })
        }
      );
      
      if (!res.ok) throw new Error('Failed to publish');
      
      const data = await res.json();
      setInfographic(data.infographic);
    } catch (err) {
      alert('Failed to publish');
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async () => {
    if (!infographic) return;
    
    setSaving(true);
    try {
      const res = await fetch(
        `/api/projects/${resolvedParams.slug}/infographics/${resolvedParams.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'draft',
            is_public: false
          })
        }
      );
      
      if (!res.ok) throw new Error('Failed to unpublish');
      
      const data = await res.json();
      setInfographic(data.infographic);
    } catch (err) {
      alert('Failed to unpublish');
    } finally {
      setSaving(false);
    }
  };

  const canEdit = userRole && ['owner', 'admin', 'analyst'].includes(userRole);
  const canPublish = userRole && ['owner', 'admin'].includes(userRole);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error || !infographic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Infographic not found'}</p>
          <Link
            href={`/projects/${resolvedParams.slug}/infographics`}
            className="text-blue-600 hover:underline"
          >
            Back to Infographics
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${resolvedParams.slug}/infographics`}
              className="text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{infographic.name}</h1>
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <span className="capitalize">{infographic.component_type.replace('-', ' ')}</span>
                <span>•</span>
                <span className="capitalize">{infographic.scope_type.replace('_', ' ')} scope</span>
                {infographic.status === 'published' && (
                  <>
                    <span>•</span>
                    <GlobeAltIcon className="w-3 h-3 text-green-500" />
                    <span className="text-green-600">Published</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <span className="text-sm text-orange-600 font-medium">● Unsaved changes</span>
            )}
            {lastSaveTime && !hasUnsavedChanges && (
              <span className="text-sm text-green-600 font-medium">✓ Saved</span>
            )}
            
            {canEdit && (
              <button
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
            
            {infographic.status === 'published' && (
              <Link
                href={`/infographics/${infographic.id}`}
                target="_blank"
                className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
              >
                <EyeIcon className="w-4 h-4" />
                View Public
              </Link>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 flex gap-1 border-t border-gray-100">
          {[
            { id: 'preview', label: 'Preview', icon: PlayIcon },
            { id: 'scrollytelling', label: 'Scrollytelling', icon: SparklesIcon },
            { id: 'config', label: 'Configuration', icon: Cog6ToothIcon },
            { id: 'narrative', label: 'Narrative', icon: DocumentTextIcon },
            { id: 'publish', label: 'Publish', icon: GlobeAltIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {activeTab === 'preview' && (
          <PreviewTab 
            infographic={infographic} 
            data={data} 
          />
        )}
        
        {activeTab === 'scrollytelling' && (
          <ScrollytellingTab
            infographic={infographic}
            data={data}
            projectSlug={resolvedParams.slug}
            onConfigChange={handleConfigChange}
            canEdit={canEdit || false}
          />
        )}
        
        {activeTab === 'config' && (
          <ConfigTab 
            infographic={infographic} 
            data={data}
            onChange={handleConfigChange}
            disabled={!canEdit}
          />
        )}
        
        {activeTab === 'narrative' && (
          <NarrativeTab 
            infographic={infographic}
            onChange={handleNarrativeChange}
            disabled={!canEdit}
          />
        )}
        
        {activeTab === 'publish' && (
          <PublishTab 
            infographic={infographic}
            projectSlug={resolvedParams.slug}
            canPublish={canPublish || false}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
            saving={saving}
          />
        )}
      </main>
    </div>
  );
}

// Preview Tab
function PreviewTab({ 
  infographic, 
  data 
}: { 
  infographic: Infographic; 
  data: InfographicData | null;
}) {
  const renderVisualization = () => {
    if (!data) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-400">
          No data available
        </div>
      );
    }

    // Check if this has scrollytelling config
    const config = infographic.config as unknown as Record<string, unknown>;
    if (config?.scenes && Array.isArray(config.scenes)) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">
            This infographic uses Scrollytelling mode.
          </p>
          <Link 
            href={`/infographics/${infographic.id}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <PlayIcon className="w-4 h-4" />
            View Full Experience
          </Link>
        </div>
      );
    }

    switch (infographic.component_type) {
      case 'dot-grid':
        return (
          <DotGridPreview 
            config={infographic.config as any} 
            data={data}
            narrative={infographic.narrative_content}
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
          <div className="flex items-center justify-center h-64 text-gray-400">
            <div className="text-center">
              <p className="text-lg mb-2">Preview not yet available</p>
              <p className="text-sm">Component type: {infographic.component_type}</p>
              <p className="text-sm">Data count: {data.count}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Title area */}
          {(infographic.config as any).title && (
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">
                {(infographic.config as any).title}
              </h2>
              {(infographic.config as any).subtitle && (
                <p className="text-gray-500 mt-1">{(infographic.config as any).subtitle}</p>
              )}
            </div>
          )}
          
          {/* Visualization */}
          <div className="p-6">
            {renderVisualization()}
          </div>
          
          {/* Data summary */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-sm text-gray-500">
            <div className="flex items-center justify-between">
              <span>Total records: {data?.count || 0}</span>
              <span>Last updated: {new Date(infographic.updated_at).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Scrollytelling Tab - The new emotional storytelling experience
function ScrollytellingTab({
  infographic,
  data,
  projectSlug,
  onConfigChange,
  canEdit
}: {
  infographic: Infographic;
  data: InfographicData | null;
  projectSlug: string;
  onConfigChange: (config: InfographicConfig) => void;
  canEdit: boolean;
}) {
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showRefine, setShowRefine] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  
  // Convert records to array format for visualization
  const recordsArray = data?.records || [];
  
  // Check if scrollytelling is already configured
  const config = infographic.config as unknown as Record<string, unknown>;
  const hasScrollytelling = Boolean(config?.scenes && Array.isArray(config.scenes));
  const scenesCount = hasScrollytelling ? (config.scenes as unknown[]).length : 0;
  const scenes = hasScrollytelling ? (config.scenes as Scene[]) : [];
  
  const handleAIGenerate = useCallback(async (result: AIGeneratedInfographic) => {
    if (!infographic) return;
    
    // Convert AI result to scrollytelling config
    const scrollytellingConfig: ScrollytellingConfig = {
      scenes: result.scenes.map(scene => ({
        id: scene.id,
        narrativeText: scene.narrativeText,
        narrativeSubtext: scene.narrativeSubtext,
        visualizationType: scene.visualizationType as any,
        visualizationConfig: scene.visualizationConfig,
        filterRecords: scene.filterRecords,
        highlightRecordIds: scene.highlightRecordIds
      })),
      stickyContent: 'visualization',
      showProgress: true,
      theme: result.theme
    };
    
    // Merge with existing config - cast to unknown first to avoid type issues
    const newConfig = {
      ...infographic.config as object,
      ...scrollytellingConfig,
      title: result.title
    } as InfographicConfig;
    
    // Call the parent's onConfigChange callback
    onConfigChange(newConfig);
    
    // Auto-save immediately
    try {
      const res = await fetch(
        `/api/projects/${projectSlug}/infographics/${infographic.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: newConfig,
            narrative_content: infographic.narrative_content
          })
        }
      );
      
      if (!res.ok) throw new Error('Failed to save');
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
    
    setShowAIAssistant(false);
    setShowRefine(false);
  }, [infographic, onConfigChange, projectSlug]);
  
  // AI Refinement handler
  const handleRefine = useCallback(async () => {
    if (!refineFeedback.trim() || !config) return;
    
    setIsRefining(true);
    try {
      const response = await fetch(`/api/projects/${projectSlug}/infographics/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: '',
          dataAnalysis: { 
            totalRecords: recordsArray.length, 
            fields: (data?.fields || []).map(f => ({ name: f.slug, type: f.type })), 
            suggestedVisualizations: [] 
          },
          recordTypeId: infographic.record_type_id,
          sampleData: recordsArray.slice(0, 10),
          previousConfig: {
            title: (config.title as string) || infographic.name,
            theme: (config.theme as string) || 'dark',
            scenes: scenes.map(s => ({
              id: s.id,
              narrativeText: s.narrativeText,
              narrativeSubtext: s.narrativeSubtext,
              visualizationType: s.visualizationType,
              visualizationConfig: s.visualizationConfig,
              emotionalTone: 'neutral'
            }))
          },
          refinementFeedback: refineFeedback.trim()
        })
      });
      
      if (!response.ok) throw new Error('Refinement failed');
      
      const result = await response.json();
      await handleAIGenerate(result);
      setRefineFeedback('');
    } catch (error) {
      console.error('Refinement failed:', error);
      alert('Failed to refine. Please try again.');
    } finally {
      setIsRefining(false);
    }
  }, [refineFeedback, config, projectSlug, recordsArray, data?.fields, infographic, scenes, handleAIGenerate]);
  
  const handleScenesChange = useCallback(async (newScenes: Scene[]) => {
    if (!infographic) return;
    
    const newConfig = {
      ...infographic.config as object,
      scenes: newScenes
    } as InfographicConfig;
    
    onConfigChange(newConfig);
    
    // Auto-save
    try {
      const res = await fetch(
        `/api/projects/${projectSlug}/infographics/${infographic.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: newConfig,
            narrative_content: infographic.narrative_content
          })
        }
      );
      
      if (!res.ok) throw new Error('Failed to save');
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  }, [infographic, onConfigChange, projectSlug]);
  
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Scrollytelling Experience</h2>
              <p className="text-gray-500">
                Create an emotional, scroll-driven narrative that moves people
              </p>
            </div>
            {canEdit && !hasScrollytelling && (
              <button
                onClick={() => setShowAIAssistant(!showAIAssistant)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 
                           text-white rounded-lg hover:from-purple-600 hover:to-blue-600"
              >
                <SparklesIcon className="w-5 h-5" />
                {showAIAssistant ? 'Hide AI Assistant' : 'Create with AI'}
              </button>
            )}
          </div>
          
          {/* Stats */}
          <div className="flex gap-6 text-sm">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <span className="text-gray-500">Records:</span>
              <span className="ml-2 font-semibold">{recordsArray.length.toLocaleString()}</span>
            </div>
            {hasScrollytelling && (
              <div className="bg-green-100 rounded-lg px-4 py-2">
                <span className="text-green-700">✓ Scrollytelling configured</span>
                <span className="ml-2 font-semibold">
                  {scenesCount} scenes
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* AI Assistant */}
        {showAIAssistant && (
          <div className="mb-8">
            <InfographicAIAssistant
              projectSlug={projectSlug}
              recordTypeId={infographic.record_type_id || undefined}
              data={recordsArray}
              onGenerateInfographic={handleAIGenerate}
            />
          </div>
        )}
        
        {/* Preview or Setup */}
        {hasScrollytelling ? (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{(config.title as string) || 'Untitled'}</h3>
                  <p className="text-sm text-gray-500">
                    {(config.scenes as unknown[]).length} scenes configured
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link
                    href={`/infographics/${infographic.id}`}
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    <PlayIcon className="w-4 h-4" />
                    Full Screen
                  </Link>
                  {canEdit && (
                    <>
                      <button
                        onClick={() => { setShowRefine(!showRefine); setShowEditor(false); }}
                        className={`px-4 py-2 border rounded-lg transition flex items-center gap-2 ${
                          showRefine 
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-purple-300 text-purple-600 hover:bg-purple-50'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {showRefine ? 'Hide Refine' : 'Refine with AI'}
                      </button>
                      <button
                        onClick={() => { setShowEditor(!showEditor); setShowRefine(false); }}
                        className={`px-4 py-2 border rounded-lg transition ${
                          showEditor 
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {showEditor ? '✓ Editing' : '✏️ Edit'}
                      </button>
                      <button
                        onClick={() => setShowAIAssistant(true)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        🔄 Regenerate
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* AI Refinement Panel */}
            {showRefine && canEdit && (
              <div className="p-6 border-b bg-purple-50">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold">Refine with AI</h3>
                      <p className="text-sm text-gray-500">Describe what you&apos;d like to improve</p>
                    </div>
                  </div>
                  
                  <textarea
                    value={refineFeedback}
                    onChange={(e) => setRefineFeedback(e.target.value)}
                    placeholder="Example: 'Make the visualizations bigger and more impactful. The dot grid in scene 2 should fill more of the screen. Add more emotional language to the narrative.'"
                    className="w-full h-28 p-4 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none bg-white"
                  />
                  
                  <div className="mt-3 flex gap-3">
                    <button
                      onClick={() => setShowRefine(false)}
                      className="px-4 py-2 border rounded-lg hover:bg-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRefine}
                      disabled={isRefining || !refineFeedback.trim()}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 
                                 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isRefining ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Refining...
                        </>
                      ) : (
                        'Apply Improvements'
                      )}
                    </button>
                  </div>
                  
                  <div className="mt-3 text-xs text-purple-600">
                    💡 Tips: Ask for bigger visuals, different colors, shorter text, or specific field comparisons
                  </div>
                </div>
              </div>
            )}
            
            {/* Scene Editor (when enabled) */}
            {showEditor && canEdit && (
              <div className="p-6 border-b bg-gray-50">
                <SceneEditor
                  scenes={scenes}
                  onChange={handleScenesChange}
                  availableFields={data?.fields || []}
                  dataPreview={recordsArray}
                />
              </div>
            )}
            
            {/* Scene list (read-only summary when not editing) */}
            {!showEditor && !showRefine && (
              <div className="p-6">
                <h4 className="text-sm font-medium text-gray-500 mb-4">Scenes</h4>
                <div className="space-y-3 mb-8">
                  {(config.scenes as Array<{ id: string; narrativeText: string; visualizationType: string }>).map((scene, index) => (
                    <div 
                      key={scene.id}
                      className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{scene.narrativeText}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Visualization: {scene.visualizationType}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Inline Preview */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-4">Preview (scroll down)</h4>
                  <div className="border rounded-xl overflow-hidden bg-gray-950 max-h-[600px] overflow-y-auto">
                    <InfographicViewer
                      infographic={{
                        id: infographic.id,
                        title: (config.title as string) || infographic.name,
                        description: infographic.description,
                        config: config as unknown as ScrollytellingConfig,
                        theme: (config.theme as 'light' | 'dark') || 'dark'
                      }}
                      data={recordsArray}
                    />
                  </div>
                </div>
                
                {canEdit && (
                  <button
                    onClick={() => setShowEditor(true)}
                    className="mt-4 w-full py-3 text-center border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition"
                  >
                    ✏️ Click to edit scenes
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-6">
              <SparklesIcon className="w-8 h-8 text-purple-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              Transform your data into a story
            </h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Use AI to analyze your {recordsArray.length.toLocaleString()} records and create 
              an emotionally impactful scrollytelling experience that moves people.
            </p>
            <button
              onClick={() => setShowAIAssistant(true)}
              disabled={!canEdit || recordsArray.length === 0}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 
                         text-white rounded-lg hover:from-purple-600 hover:to-blue-600 
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SparklesIcon className="w-5 h-5" />
              Get Started with AI
            </button>
            {recordsArray.length === 0 && (
              <p className="text-sm text-red-500 mt-3">
                No records found. Make sure data is available for this infographic.
              </p>
            )}
          </div>
        )}
        
        {/* Reference inspirations */}
        <div className="mt-8 p-6 bg-gray-50 rounded-xl">
          <h4 className="font-medium mb-3">Inspiration</h4>
          <p className="text-sm text-gray-500 mb-4">
            Create experiences like these influential data visualizations:
          </p>
          <div className="flex gap-4">
            <a 
              href="https://mkorostoff.github.io/1-pixel-wealth/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 p-4 bg-white rounded-lg border hover:border-blue-300 transition-colors"
            >
              <span className="font-medium">One Pixel Wealth</span>
              <p className="text-sm text-gray-500 mt-1">Scroll to visualize wealth inequality</p>
            </a>
            <a 
              href="https://mkorostoff.github.io/incarceration-in-real-numbers/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 p-4 bg-white rounded-lg border hover:border-blue-300 transition-colors"
            >
              <span className="font-medium">Incarceration in Real Numbers</span>
              <p className="text-sm text-gray-500 mt-1">Human icons tell the prison story</p>
            </a>
          </div>
        </div>
      </div>
      
      {/* AI Assistant Modal */}
      {showAIAssistant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="relative">
              <button
                onClick={() => setShowAIAssistant(false)}
                className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-100"
              >
                ✕
              </button>
              <InfographicAIAssistant
                projectSlug={projectSlug}
                data={recordsArray}
                recordTypeId={infographic.record_type_id || undefined}
                onGenerateInfographic={(result) => {
                  handleAIGenerate(result);
                  setShowAIAssistant(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Config Tab
function ConfigTab({ 
  infographic, 
  data,
  onChange,
  disabled 
}: { 
  infographic: Infographic; 
  data: InfographicData | null;
  onChange: (config: InfographicConfig) => void;
  disabled: boolean;
}) {
  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <ConfigEditor
          componentType={infographic.component_type}
          config={infographic.config}
          fields={data?.fields || []}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// Narrative Tab
function NarrativeTab({ 
  infographic,
  onChange,
  disabled 
}: { 
  infographic: Infographic;
  onChange: (narrative: NarrativeBlock[]) => void;
  disabled: boolean;
}) {
  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <NarrativeEditor
          narrative={infographic.narrative_content}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// Publish Tab
function PublishTab({ 
  infographic,
  projectSlug,
  canPublish,
  onPublish,
  onUnpublish,
  saving
}: { 
  infographic: Infographic;
  projectSlug: string;
  canPublish: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
  saving: boolean;
}) {
  const publicUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/infographics/${infographic.id}`
    : '';
  
  const embedCode = `<iframe src="${publicUrl}?embed=true" width="100%" height="600" frameborder="0"></iframe>`;

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Current Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Publication Status</h3>
          
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-3 h-3 rounded-full ${
              infographic.status === 'published' ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            <div>
              <span className="font-medium capitalize">
                {infographic.status === 'published' ? 'Published' : infographic.status.replace('_', ' ')}
              </span>
              {infographic.is_public && (
                <span className="text-sm text-gray-500 ml-2">• Publicly accessible</span>
              )}
            </div>
          </div>
          
          {canPublish ? (
            infographic.status === 'published' ? (
              <button
                onClick={onUnpublish}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                {saving ? 'Processing...' : 'Unpublish'}
              </button>
            ) : (
              <button
                onClick={onPublish}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Publishing...' : 'Publish Now'}
              </button>
            )
          ) : (
            <p className="text-sm text-gray-500">
              You don't have permission to publish. Contact a project admin.
            </p>
          )}
        </div>

        {/* Verification */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Verification</h3>
          
          <div className="flex items-center gap-3 mb-4">
            {infographic.verification_status === 'verified' ? (
              <>
                <CheckBadgeIcon className="w-6 h-6 text-green-500" />
                <div>
                  <span className="font-medium text-green-700">Verified</span>
                  {infographic.verified_at && (
                    <p className="text-sm text-gray-500">
                      on {new Date(infographic.verified_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <span className="text-gray-500">Not yet verified</span>
            )}
          </div>
          
          {infographic.verification_notes && (
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-1">Verification Notes:</p>
              <p className="text-gray-600">{infographic.verification_notes}</p>
            </div>
          )}
        </div>

        {/* Share / Embed */}
        {infographic.status === 'published' && (
          <>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Share</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Public URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={publicUrl}
                    readOnly
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(publicUrl)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            {infographic.allow_embed && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">Embed Code</h3>
                
                <div className="mb-2">
                  <textarea
                    value={embedCode}
                    readOnly
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono bg-gray-50"
                  />
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(embedCode)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Copy Embed Code
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
