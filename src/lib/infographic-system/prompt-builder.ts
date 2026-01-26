/**
 * Enhanced AI System Prompts for Infographic Generation
 * 
 * Separates creativity guidance from technical requirements.
 * Includes diverse comparison examples and style guidance.
 */

import { 
  generateComparisons, 
  generateTimeComparison, 
  findHistoricalComparisons,
  getComparisonOptionsForPrompt,
  STYLE_PRESETS,
  InfographicStylePreset 
} from './comparison-library';
import { getExampleSet, formatExamplesForPrompt } from './example-library';

// =============================================================================
// CORE SYSTEM PROMPT - Creative and Technical Guidance Combined
// =============================================================================

export function buildSystemPrompt(): string {
  return `You are a world-class data visualization storyteller. Your creations make people FEEL numbers, not just see them.

## YOUR PHILOSOPHY

You don't make charts. You create experiences that change how people understand data.

**Your inspirations:**
- "One Pixel Wealth" - scrolling through billions makes wealth inequality visceral
- "If the Moon Were Only 1 Pixel" - scale through tedium and emptiness
- "Incarceration in Real Numbers" - each icon is a human being

**Your principles:**
1. SHOW, don't tell. Let the visualization do the work.
2. Every number is a person (when it is). Make that real.
3. Comparisons must be CONCRETE and RELATABLE (buses, classrooms, families)
4. Pacing matters. Slow reveals build tension.
5. The "oh shit" moment. Every infographic needs one gut-punch.
6. Minimal text. Maximum impact.

## CRITICAL TECHNICAL REQUIREMENTS

1. **ALWAYS use dataBinding** - Every scene needs: \`"dataBinding": { "type": "count" | "records" | "groupBy", ... }\`
2. **ALWAYS use the RECOMMENDED_COLORBY_FIELD** when using dotGrid/humanGrid
3. **NEVER show "Unknown" as a majority** - Only use fields with real, diverse values
4. **Use ACTUAL field values** in colorMap - Don't invent categories
5. **Valid visualization types:** counter, dotGrid, humanGrid, pieChart, barChart, humanScale, timeline

## VISUALIZATION CONFIGS

### counter
\`\`\`json
{ 
  "visualizationType": "counter",
  "dataBinding": { "type": "count" },
  "visualizationConfig": { "suffix": " deaths", "fontSize": "8rem" }
}
\`\`\`

### dotGrid / humanGrid (REQUIRES colorBy with real field!)
\`\`\`json
{
  "visualizationType": "humanGrid",
  "dataBinding": { "type": "records" },
  "visualizationConfig": { 
    "dotsPerRow": 20,
    "dotSize": 16,
    "dotGap": 6,
    "colorBy": "ACTUAL_FIELD_NAME",
    "colorMap": { "ActualValue1": "#EF4444", "ActualValue2": "#3B82F6" },
    "showLegend": true,
    "legendPosition": "bottom"
  }
}
\`\`\`

### humanScale (for relatable comparisons)
\`\`\`json
{
  "visualizationType": "humanScale",
  "dataBinding": { "type": "count" },
  "visualizationConfig": { "comparison": "That's X school buses full of people" }
}
\`\`\`

### pieChart / barChart
\`\`\`json
{
  "visualizationType": "pieChart",
  "dataBinding": { "type": "groupBy", "field": "category_field" },
  "visualizationConfig": { "groupBy": "category_field" }
}
\`\`\`

## COMPARISON TYPES TO USE (BE CREATIVE - DON'T ALWAYS USE BUSES!)

Pick DIFFERENT comparison types for each infographic:

**VEHICLES:** school buses (72), city buses (40), airplanes (180), jumbo jets (400), subway cars (150)
**SPACES:** classrooms (25), movie theaters (200), stadiums (70,000), churches (300), concert venues (5,000)
**POPULATION:** families (4), neighborhoods (2,500), villages (1,000), small towns (5,000), high schools (1,500)
**TIME:** "One every X days", "X per week", "Another one every X hours"
**HISTORICAL:** Compare to Titanic (1,517), 9/11 (2,977), Pearl Harbor (2,403), Katrina (1,836)

**IMPORTANT:** Vary your comparisons! Don't always use school buses. Mix vehicle + space + time comparisons.

## COLOR PALETTE
- Blue: #3B82F6 (primary)
- Red: #EF4444 (danger/deaths)
- Green: #10B981 (positive)
- Yellow: #F59E0B (warning)
- Purple: #8B5CF6 (special)
- Pink: #EC4899 (secondary)
- Orange: #F97316 (attention)
- Gray: #6B7280 (unknown - use sparingly!)

## OUTPUT FORMAT
Return only valid JSON. No markdown code blocks. No explanation text.`;
}

// =============================================================================
// DYNAMIC USER PROMPT BUILDER
// =============================================================================

export interface PromptContext {
  projectName: string;
  recordTypeName: string;
  totalRecords: number;
  fieldInsights: string;
  bestColorByField: string | null;
  colorByValues: string[];
  bestGroupByField: string | null;
  groupByFields: string[];
  dateField: string | null;
  dateRange: { earliest: string; latest: string } | null;
  sampleData?: Record<string, unknown>[];
  userPrompt: string;
  selectedStyle?: string;
}

export function buildUserPrompt(context: PromptContext): string {
  const {
    projectName,
    recordTypeName,
    totalRecords,
    fieldInsights,
    bestColorByField,
    colorByValues,
    bestGroupByField,
    groupByFields,
    dateField,
    dateRange,
    sampleData,
    userPrompt,
    selectedStyle
  } = context;
  
  // Generate comparison options for this specific count
  const comparisons = generateComparisons(totalRecords);
  const topComparisons = comparisons.slice(0, 6).map(c => `- ${c.text}`).join('\n');
  
  // Generate time-based comparisons if we have date data
  let timeComparisons = '';
  if (dateRange) {
    const startYear = new Date(dateRange.earliest).getFullYear();
    const endYear = new Date(dateRange.latest).getFullYear();
    const years = Math.max(1, endYear - startYear);
    const timeTexts = generateTimeComparison(totalRecords, years);
    timeComparisons = `\n## TIME-BASED COMPARISONS (choose one!):\n${timeTexts.map(t => `- "${t}"`).join('\n')}`;
  }
  
  // Historical comparisons
  const historical = findHistoricalComparisons(totalRecords, 1);
  const historicalText = historical.length > 0 
    ? `\n## HISTORICAL COMPARISONS:\n${historical.slice(0, 3).map(h => `- ${h.text}`).join('\n')}`
    : '';
  
  // Get style preset if specified
  const stylePreset = selectedStyle 
    ? STYLE_PRESETS.find(s => s.id === selectedStyle)
    : null;
  
  const styleInstructions = stylePreset 
    ? `\n## STYLE DIRECTIVE:\n${stylePreset.promptModifier}`
    : '';
  
  // Get diverse examples
  const examples = getExampleSet(2);
  const examplesText = formatExamplesForPrompt(examples);
  
  // Build colorMap suggestion
  const colorMapSuggestion = colorByValues.length > 0 
    ? `{
${colorByValues.map((v, i) => `  "${v}": "${['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'][i % 8]}"`).join(',\n')}
}`
    : '(no categorical values)';

  return `
# DATA CONTEXT

**Project:** "${projectName}"
**Total Records:** ${totalRecords.toLocaleString()} ${recordTypeName}

## Field Analysis
${fieldInsights}

## MANDATORY FIELDS TO USE

**COLORBY_FIELD:** "${bestColorByField || 'none'}"
${colorByValues.length > 0 ? `Actual values: ${colorByValues.join(', ')}` : 'No good colorBy field available'}

**GROUPBY_FIELD:** "${bestGroupByField || 'none'}"
${groupByFields.length > 1 ? `Alternatives: ${groupByFields.slice(1, 4).join(', ')}` : ''}

${dateField && dateRange ? `**DATE_FIELD:** "${dateField}" (${dateRange.earliest} to ${dateRange.latest})` : '**NO DATE FIELD** - Do not use timeline'}

## COMPARISON OPTIONS FOR ${totalRecords} RECORDS

${topComparisons}
${timeComparisons}
${historicalText}

**IMPORTANT:** Choose DIVERSE comparisons! Don't just use buses every time.
${styleInstructions}

## SAMPLE DATA (real values from the dataset)
${sampleData ? JSON.stringify(sampleData.slice(0, 3), null, 2) : 'No sample data'}

## COLOR MAP TO USE FOR DOTGRID/HUMANGRID
${colorMapSuggestion}

# USER'S REQUEST
"${userPrompt}"

# DIVERSE EXAMPLES (vary your approach!)
${examplesText}

# YOUR TASK

Create a 4-5 scene scrollytelling infographic that:
1. Opens with impact (counter showing ${totalRecords})
2. Makes it visceral (dotGrid or humanGrid with colorBy: "${bestColorByField || 'none'}")
3. Reveals a pattern (pieChart or barChart with groupBy: "${bestGroupByField || 'none'}")
4. Provides human-scale comparison (DON'T USE BUSES if other examples did!)
5. Every scene has a dataBinding object

Return valid JSON only.`;
}

// =============================================================================
// REFINEMENT PROMPT BUILDER
// =============================================================================

export function buildRefinementPrompt(
  context: PromptContext,
  previousConfig: Record<string, unknown>,
  feedback: string
): string {
  const comparisons = generateComparisons(context.totalRecords);
  
  return `
# REFINEMENT REQUEST

You have an existing infographic to improve based on user feedback.

## CURRENT CONFIGURATION
\`\`\`json
${JSON.stringify(previousConfig, null, 2)}
\`\`\`

## USER FEEDBACK
"${feedback}"

## DATA CONTEXT
Total Records: ${context.totalRecords}
COLORBY_FIELD: "${context.bestColorByField || 'none'}"
Actual values: ${context.colorByValues.join(', ')}
GROUPBY_FIELD: "${context.bestGroupByField || 'none'}"

## AVAILABLE COMPARISON OPTIONS
${comparisons.slice(0, 8).map(c => `- ${c.text}`).join('\n')}

## COMMON REFINEMENT PATTERNS

| User says | You should |
|-----------|------------|
| "too small/squished" | Increase dotSize to 16-20, reduce dotsPerRow to 15-18 |
| "all one color/Unknown" | Change colorBy to "${context.bestColorByField}", use proper colorMap |
| "boring comparison" | Use a DIFFERENT comparison type (not buses!) |
| "too much text" | Reduce narrativeSubtext, let visuals speak |
| "more emotional" | Use humanGrid, add families/children comparisons |
| "more analytical" | Add pieChart/barChart, include specific numbers |
| "different colors" | Update colorMap with new color values |
| "bigger numbers" | Increase counter fontSize to "10rem" or "12rem" |

## REQUIREMENTS
- Keep all existing dataBinding types
- Ensure every dotGrid/humanGrid has colorBy with actual field
- Return COMPLETE updated JSON configuration

Return the refined infographic JSON only.`;
}

// =============================================================================
// SCENE-SPECIFIC REFINEMENT PROMPT
// =============================================================================

export function buildSceneRefinementPrompt(
  sceneConfig: Record<string, unknown>,
  sceneIndex: number,
  feedback: string,
  context: PromptContext
): string {
  return `
# SINGLE SCENE REFINEMENT

Refine only this one scene based on user feedback.

## CURRENT SCENE (Scene ${sceneIndex + 1})
\`\`\`json
${JSON.stringify(sceneConfig, null, 2)}
\`\`\`

## USER FEEDBACK
"${feedback}"

## DATA CONTEXT
Total: ${context.totalRecords}
ColorBy field: "${context.bestColorByField}" with values: ${context.colorByValues.join(', ')}
GroupBy field: "${context.bestGroupByField}"

## COMPARISON SUGGESTIONS (if humanScale)
${generateComparisons(context.totalRecords).slice(0, 5).map(c => `- ${c.text}`).join('\n')}

Return ONLY the refined scene JSON object.`;
}

export default {
  buildSystemPrompt,
  buildUserPrompt,
  buildRefinementPrompt,
  buildSceneRefinementPrompt
};
