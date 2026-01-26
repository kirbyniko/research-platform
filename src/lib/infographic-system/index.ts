/**
 * Infographic System - Main Export
 * 
 * Comprehensive system for AI-powered infographic generation
 * including comparisons, examples, styles, and prompt building.
 */

// Comparison Library - 30+ relatable comparisons
export {
  COMPARISON_UNITS,
  TIME_FRAMES,
  STYLE_PRESETS,
  HISTORICAL_EVENTS,
  generateComparisons,
  getDiverseComparisons,
  generateTimeComparison,
  findHistoricalComparisons,
  getComparisonOptionsForPrompt,
  getStylePreset,
  getRecommendedStyles,
  type ComparisonUnit,
  type TimeFrame,
  type GeneratedComparison,
  type InfographicStylePreset,
  type HistoricalEvent
} from './comparison-library';

// Example Library - Diverse AI examples
export {
  EXAMPLE_INFOGRAPHICS,
  getRandomExample,
  getExampleByStyle,
  getExampleSet,
  formatExamplesForPrompt,
  type ExampleInfographic
} from './example-library';

// Prompt Builder - Dynamic prompt generation
export {
  buildSystemPrompt,
  buildUserPrompt,
  buildRefinementPrompt,
  buildSceneRefinementPrompt,
  type PromptContext
} from './prompt-builder';
