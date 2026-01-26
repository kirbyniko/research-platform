// Infographic visualization components
export { DotGridPreview } from './DotGridPreview';
export { CounterPreview } from './CounterPreview';
export { ConfigEditor } from './ConfigEditor';
export { NarrativeEditor } from './NarrativeEditor';

// Scrollytelling Engine
export { 
  ScrollytellingEngine, 
  ScrollytellingEngineMobile,
  ScrollytellingResponsive 
} from './engine/ScrollytellingEngine';
export type { Scene, ScrollytellingConfig } from './engine/ScrollytellingEngine';

// Enhanced Visualizations
export { 
  EnhancedDotGrid, 
  EnhancedCounter, 
  HumanGrid 
} from './visualizations/EnhancedVisualizations';

// AI Assistant
export { 
  InfographicAIAssistant,
  analyzeData 
} from './ai/InfographicAIAssistant';
export type { 
  DataAnalysis, 
  FieldAnalysis, 
  VisualizationSuggestion,
  AIGeneratedInfographic 
} from './ai/InfographicAIAssistant';

// Complete Viewer/Creator
export { 
  InfographicViewer, 
  InfographicCreator 
} from './InfographicViewer';
