import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import OpenAI from 'openai';

interface DataAnalysis {
  totalRecords: number;
  fields: {
    name: string;
    type: string;
    uniqueValues?: number;
    sampleValues?: unknown[];
    dateRange?: { earliest: string; latest: string };
    nullCount?: number;
    totalCount?: number;
  }[];
  suggestedVisualizations: unknown[];
}

interface GenerateRequest {
  prompt: string;
  dataAnalysis: DataAnalysis;
  recordTypeId?: number;
  sampleData?: Record<string, unknown>[];
  model?: string;
  // Refinement support
  previousConfig?: Record<string, unknown>;
  refinementFeedback?: string;
}

// =============================================================================
// STATE-OF-THE-ART AI PROMPT FOR INFOGRAPHIC GENERATION
// =============================================================================

const SYSTEM_PROMPT = `You are a world-class data visualization storyteller, creating visceral, scroll-driven narratives.

## CRITICAL RULES

1. **ALWAYS use the RECOMMENDED_COLORBY_FIELD** - Never generate dotGrid/humanGrid without colorBy
2. **NEVER show "Unknown" categories** - Only color by fields that have real data
3. **Each scene must use actual field data** - Reference the specific fields and their values
4. **Start with total impact, then drill into patterns**
5. **End with the single most surprising/important finding**
6. **Use the actual values from the data** - Don't make up categories

## SCENE PACING (4-5 scenes max)

Scene 1: THE HOOK - A single powerful number (use counter with dataBinding type:"count")
Scene 2: THE SCALE - Show what that number looks like (dotGrid or humanGrid) WITH colorBy using RECOMMENDED field
Scene 3: THE PATTERN - What's hidden in the data? Use pieChart or barChart with RECOMMENDED_GROUPBY_FIELD
Scene 4: THE INSIGHT - The most surprising finding from the data (humanScale comparison OR specific breakdown)
(Optional Scene 5: THE TREND - If good date data exists, show timeline)

## VISUALIZATION TYPES & WHEN TO USE THEM

### counter - USE FOR: Opening scene with total number
Config: { "suffix": " records" or " people", "fontSize": "8rem" }
dataBinding: { "type": "count" }

### dotGrid - USE FOR: Showing scale of total, MUST include colorBy
REQUIRED CONFIG - Use the RECOMMENDED_COLORBY_FIELD and its actual values:
{
  "dotsPerRow": 20,
  "dotSize": 12,
  "dotGap": 4,
  "colorBy": "RECOMMENDED_COLORBY_FIELD",
  "colorMap": { "actual_value_1": "#3B82F6", "actual_value_2": "#EF4444" },
  "colorLegend": [
    { "label": "Actual Value 1", "color": "#3B82F6", "description": "X records" },
    { "label": "Actual Value 2", "color": "#EF4444", "description": "Y records" }
  ],
  "showLegend": true,
  "legendPosition": "top-right"
}
dataBinding: { "type": "records" }

### humanGrid - USE FOR: Data about people specifically
Config: Same as dotGrid, ALWAYS include colorBy with RECOMMENDED field
dataBinding: { "type": "records" }

### pieChart - USE FOR: Showing proportions when 3-7 categories
Config: { "groupBy": "RECOMMENDED_GROUPBY_FIELD" }
dataBinding: { "type": "groupBy", "field": "RECOMMENDED_GROUPBY_FIELD" }

### comparison - USE FOR: Horizontal bars comparing categories (up to 8)
Config: { "groupBy": "RECOMMENDED_GROUPBY_FIELD" }
dataBinding: { "type": "groupBy", "field": "RECOMMENDED_GROUPBY_FIELD" }

### barChart - USE FOR: Vertical bars, good for ranked categories
Config: { "groupBy": "RECOMMENDED_GROUPBY_FIELD" }
dataBinding: { "type": "groupBy", "field": "RECOMMENDED_GROUPBY_FIELD" }

### humanScale - USE FOR: Making large numbers relatable
Config: { "comparison": "That's X school buses full of people" }
dataBinding: { "type": "count" }

### timeline - USE FOR: ONLY if date field has >70% fill rate
Config: { "dateField": "fieldName", "groupBy": "year" }
dataBinding: { "type": "groupBy", "field": "date_field" }

## COLOR PALETTE (use these colors)
- Blue: #3B82F6 (primary/neutral)
- Red: #EF4444 (danger/critical)
- Green: #10B981 (positive/success)
- Yellow: #F59E0B (warning/caution)
- Purple: #8B5CF6 (special/unique)
- Pink: #EC4899 (secondary)
- Cyan: #06B6D4 (info)
- Orange: #F97316 (attention)
- Gray: #6B7280 (unknown/other - use sparingly)

## CRITICAL DON'TS

❌ NEVER use colorBy: "Unknown" or show 100% one color
❌ NEVER hardcode values like "value": 150 - use dataBinding instead
❌ NEVER create a dotGrid/humanGrid without colorBy field
❌ NEVER use a colorMap with values that don't exist in the data
❌ NEVER show timeline if date field has low fill rate
❌ NEVER use generic text like "Why does this matter" without specific data

## CRITICAL DO'S

✅ ALWAYS use the RECOMMENDED_COLORBY_FIELD provided in the context
✅ ALWAYS build colorMap from ACTUAL values shown in the data
✅ ALWAYS include dataBinding in every scene
✅ ALWAYS use specific numbers in narrativeSubtext (e.g., "23 of 114 cases")
✅ ALWAYS make colorLegend match the actual colorMap values

## OUTPUT FORMAT (JSON only, no markdown)`;

const EXAMPLE_OUTPUT = `Good example (uses actual data bindings and real field values):
{
  "title": "114 Incidents in Detention",
  "theme": "dark",
  "scenes": [
    {
      "id": "scene-1",
      "narrativeText": "114 documented incidents.",
      "narrativeSubtext": "Since records began, 114 incidents have been documented at detention facilities.",
      "visualizationType": "counter",
      "dataBinding": { "type": "count" },
      "visualizationConfig": { "suffix": " incidents", "fontSize": "8rem" }
    },
    {
      "id": "scene-2",
      "narrativeText": "Each dot is an incident waiting for justice.",
      "narrativeSubtext": "Color shows severity: Critical cases in red, others in blue and amber.",
      "visualizationType": "dotGrid",
      "dataBinding": { "type": "records" },
      "visualizationConfig": { 
        "dotsPerRow": 15, 
        "dotSize": 18, 
        "colorBy": "severity",
        "colorMap": { "Critical": "#EF4444", "High": "#F97316", "Medium": "#F59E0B", "Low": "#3B82F6" },
        "showLegend": true,
        "colorLegend": [
          { "label": "Critical", "color": "#EF4444", "description": "Immediate danger" },
          { "label": "High", "color": "#F97316", "description": "Serious concern" },
          { "label": "Medium", "color": "#F59E0B", "description": "Needs attention" },
          { "label": "Low", "color": "#3B82F6", "description": "Minor issues" }
        ]
      }
    },
    {
      "id": "scene-3",
      "narrativeText": "Medical neglect leads the way.",
      "narrativeSubtext": "The most common incident type, affecting dozens of detainees.",
      "visualizationType": "pieChart",
      "dataBinding": { "type": "groupBy", "field": "incident_type" },
      "visualizationConfig": { "groupBy": "incident_type" }
    },
    {
      "id": "scene-4",
      "narrativeText": "One incident every 3 days.",
      "narrativeSubtext": "At this rate, hundreds more will be documented by next year.",
      "visualizationType": "humanScale",
      "dataBinding": { "type": "count" },
      "visualizationConfig": { "comparison": "That's roughly one incident every 3 days over this period" }
    }
  ]
}`;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body: GenerateRequest = await request.json();
    const { 
      prompt, 
      dataAnalysis, 
      recordTypeId, 
      sampleData, 
      model = 'gpt-4o-mini',
      previousConfig,
      refinementFeedback 
    } = body;
    
    // Validate model choice
    const allowedModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'];
    const selectedModel = allowedModels.includes(model) ? model : 'gpt-4o-mini';
    
    // For refinement, only feedback is required
    const isRefinement = !!previousConfig && !!refinementFeedback;
    
    if (!isRefinement && (!prompt || !dataAnalysis)) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt, dataAnalysis' },
        { status: 400 }
      );
    }
    
    // Get project info
    const projectResult = await pool.query(
      'SELECT id, name FROM projects WHERE slug = $1',
      [slug]
    );
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const project = projectResult.rows[0];
    
    // Get record type info if specified
    let recordTypeName = 'records';
    if (recordTypeId) {
      const rtResult = await pool.query(
        'SELECT name FROM record_types WHERE id = $1',
        [recordTypeId]
      );
      if (rtResult.rows.length > 0) {
        recordTypeName = rtResult.rows[0].name;
      }
    }
    
    // Analyze the data to provide richer context with DATA QUALITY info
    const fieldInsights = dataAnalysis.fields.map(f => {
      // Calculate fill rate if we have the counts, otherwise assume complete
      const fillRate = (f.totalCount && f.nullCount !== undefined) 
        ? ((f.totalCount - f.nullCount) / f.totalCount * 100).toFixed(0)
        : '100';
      let insight = `- ${f.name} (${f.type}) - ${fillRate}% filled`;
      if (f.uniqueValues) insight += ` [${f.uniqueValues} unique values]`;
      if (f.sampleValues?.length) insight += ` Examples: ${f.sampleValues.slice(0, 5).join(', ')}`;
      if (f.dateRange) insight += ` Range: ${f.dateRange.earliest} to ${f.dateRange.latest}`;
      // Add data quality warning
      if (parseInt(fillRate) < 50) insight += ` ⚠️ LOW DATA QUALITY - avoid using for visualization`;
      return insight;
    }).join('\n');
    
    // Find good fields for visualization
    const goodFields = dataAnalysis.fields.filter(f => {
      const fillRate = (f.totalCount && f.nullCount !== undefined) 
        ? (f.totalCount - f.nullCount) / f.totalCount 
        : 1;
      return fillRate > 0.7 && f.type === 'string' && f.uniqueValues && f.uniqueValues >= 2 && f.uniqueValues <= 15;
    });
    
    const goodDateFields = dataAnalysis.fields.filter(f => {
      const fillRate = (f.totalCount && f.nullCount !== undefined)
        ? (f.totalCount - f.nullCount) / f.totalCount
        : 1;
      return fillRate > 0.7 && f.type === 'date';
    });
    
    // Find the BEST field for colorBy (highest fill rate, good number of values)
    const bestColorByField = goodFields.length > 0 
      ? goodFields.sort((a, b) => {
          // Prefer fields with 3-8 unique values (not too many, not too few)
          const aScore = (a.uniqueValues && a.uniqueValues >= 3 && a.uniqueValues <= 8) ? 100 : 50;
          const bScore = (b.uniqueValues && b.uniqueValues >= 3 && b.uniqueValues <= 8) ? 100 : 50;
          return bScore - aScore;
        })[0]
      : null;
    
    // Get actual values for the recommended colorBy field from sample data
    let colorByValues: string[] = [];
    if (bestColorByField && sampleData && sampleData.length > 0) {
      const valueSet = new Set<string>();
      sampleData.forEach(record => {
        const val = record[bestColorByField.name];
        if (val !== null && val !== undefined && val !== '') {
          valueSet.add(String(val));
        }
      });
      colorByValues = Array.from(valueSet).slice(0, 10);
    }
    
    // Build comprehensive user prompt
    const userPromptForAI = `
# DATA CONTEXT

Project: "${project.name}"
Total Records: ${dataAnalysis.totalRecords.toLocaleString()} ${recordTypeName}

## Field Analysis (with data quality)
${fieldInsights}

## ⭐ MANDATORY: USE THESE SPECIFIC FIELDS

### RECOMMENDED_COLORBY_FIELD: "${bestColorByField?.name || 'none'}"
${bestColorByField ? `Actual values in data: ${colorByValues.join(', ')}
Use these EXACT values in your colorMap!` : 'No good colorBy field - use simple visualizations only'}

### RECOMMENDED_GROUPBY_FIELD: "${goodFields[0]?.name || 'none'}"
${goodFields.length > 0 ? `Alternative groupBy fields: ${goodFields.slice(1, 4).map(f => f.name).join(', ')}` : ''}

${goodDateFields.length > 0
  ? `### DATE_FIELD for timeline: "${goodDateFields[0].name}" (${goodDateFields[0].dateRange?.earliest} to ${goodDateFields[0].dateRange?.latest})`
  : '### NO DATE FIELD - Do NOT use timeline visualization'}

## Sample Data (showing actual values)
${sampleData ? JSON.stringify(sampleData.slice(0, 5), null, 2) : 'No sample data'}

# USER'S REQUEST
"${prompt}"

# YOUR TASK

Create a 4-5 scene scrollytelling infographic that:
1. Opens with a counter showing ${dataAnalysis.totalRecords} (use dataBinding type:"count")
2. Scene 2 MUST use dotGrid or humanGrid with colorBy: "${bestColorByField?.name || 'none'}" using ACTUAL values: ${colorByValues.join(', ')}
3. Scene 3: Use pieChart or barChart with groupBy: "${goodFields[0]?.name || 'none'}"
4. Scene 4: humanScale comparison making ${dataAnalysis.totalRecords} relatable
5. Each scene MUST have a dataBinding object

## CRITICAL COLORMAP REQUIREMENT
For dotGrid/humanGrid, build colorMap from THESE actual values:
${colorByValues.length > 0 ? `{
${colorByValues.map((v, i) => `  "${v}": "${['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'][i % 8]}"`).join(',\n')}
}` : '(no values available)'}

${EXAMPLE_OUTPUT}`;

    // Build refinement prompt if this is a refinement request
    let refinementPrompt = '';
    if (isRefinement && previousConfig && refinementFeedback) {
      refinementPrompt = `
# REFINEMENT REQUEST

You have an existing infographic to improve. 

## DATA CONTEXT (same data as before)
Total Records: ${dataAnalysis?.totalRecords || 0}
RECOMMENDED_COLORBY_FIELD: "${bestColorByField?.name || 'none'}"
Actual colorBy values: ${colorByValues.join(', ')}
RECOMMENDED_GROUPBY_FIELD: "${goodFields[0]?.name || 'none'}"

## Current Configuration:
\`\`\`json
${JSON.stringify(previousConfig, null, 2)}
\`\`\`

## User's Feedback:
"${refinementFeedback}"

## Common Fixes:
1. **"visualization is squished/small"** → dotsPerRow: 25-30, dotSize: 15-20
2. **"100% one color/Unknown"** → MUST use colorBy: "${bestColorByField?.name}" with colorMap using: ${colorByValues.join(', ')}
3. **"off screen/cut off"** → Reduce dotsPerRow to 15-20, or reduce dotSize
4. **"boring/generic"** → Add specific numbers, use the actual data values
5. **"can't read legend"** → showLegend: true, legendPosition: "top-right"

## Critical Requirements:
- EVERY dotGrid/humanGrid MUST have colorBy: "${bestColorByField?.name}" 
- colorMap MUST use actual values: ${colorByValues.map(v => `"${v}"`).join(', ')}
- EVERY scene MUST have dataBinding object

Return a COMPLETE updated infographic JSON.
`;
    }

    const finalUserPrompt = isRefinement 
      ? refinementPrompt 
      : userPromptForAI;

    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(generateFallbackInfographic(dataAnalysis, prompt, recordTypeName));
    }
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const completion = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: finalUserPrompt }
      ],
      temperature: isRefinement ? 0.5 : 0.8, // Lower temp for refinement (more predictable)
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });
    
    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response from AI');
    }
    
    // Parse and validate the response
    const generated = JSON.parse(responseText);
    
    // Ensure all scenes have proper IDs
    if (generated.scenes) {
      generated.scenes = generated.scenes.map((scene: Record<string, unknown>, index: number) => ({
        ...scene,
        id: scene.id || `scene-${index + 1}`
      }));
    }
    
    // Calculate and attach usage info
    const usage = completion.usage;
    if (usage) {
      // Pricing per 1K tokens
      const pricing: Record<string, { input: number; output: number }> = {
        'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
        'gpt-4o': { input: 0.005, output: 0.015 },
        'gpt-4-turbo': { input: 0.01, output: 0.03 }
      };
      const modelPricing = pricing[selectedModel] || pricing['gpt-4o-mini'];
      const inputCost = (usage.prompt_tokens / 1000) * modelPricing.input;
      const outputCost = (usage.completion_tokens / 1000) * modelPricing.output;
      
      generated.usage = {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        cost: inputCost + outputCost,
        model: selectedModel
      };
    }
    
    return NextResponse.json(generated);
    
  } catch (error) {
    console.error('Infographic generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}

// Fallback when OpenAI isn't available
function generateFallbackInfographic(
  dataAnalysis: DataAnalysis,
  prompt: string,
  recordTypeName: string
) {
  const totalRecords = dataAnalysis.totalRecords;
  const dateField = dataAnalysis.fields.find(f => f.type === 'date');
  const categoryField = dataAnalysis.fields.find(
    f => f.type === 'string' && f.uniqueValues && f.uniqueValues < 15
  );
  
  // Generate color map if category field exists
  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
  const colorMap: Record<string, string> = {};
  
  if (categoryField?.sampleValues) {
    categoryField.sampleValues.forEach((val, i) => {
      colorMap[String(val)] = colors[i % colors.length];
    });
  }
  
  return {
    title: `${recordTypeName} Overview`,
    description: `An interactive visualization of ${totalRecords.toLocaleString()} ${recordTypeName}`,
    theme: 'light',
    estimatedImpact: 'This visualization uses scale and human icons to create emotional connection',
    scenes: [
      {
        id: 'scene-1',
        narrativeText: `${totalRecords.toLocaleString()} ${recordTypeName}.`,
        narrativeSubtext: 'Each icon represents one individual.',
        visualizationType: 'counter',
        visualizationConfig: {
          value: totalRecords,
          duration: 2500,
          fontSize: '8rem'
        },
        emotionalTone: 'neutral'
      },
      {
        id: 'scene-2',
        narrativeText: 'These are not just numbers.',
        narrativeSubtext: 'Behind every data point is a human story.',
        visualizationType: 'humanGrid',
        visualizationConfig: {
          dotsPerRow: Math.min(20, Math.ceil(Math.sqrt(totalRecords))),
          dotSize: totalRecords > 500 ? 10 : 16,
          colorBy: categoryField?.name,
          colorMap
        },
        emotionalTone: 'somber'
      },
      ...(categoryField ? [{
        id: 'scene-3',
        narrativeText: `Broken down by ${categoryField.name}:`,
        narrativeSubtext: categoryField.sampleValues?.slice(0, 3).join(', ') + '...',
        visualizationType: 'dotGrid',
        visualizationConfig: {
          dotsPerRow: Math.min(25, Math.ceil(Math.sqrt(totalRecords))),
          dotSize: totalRecords > 500 ? 8 : 12,
          colorBy: categoryField.name,
          colorMap,
          showLegend: true
        },
        emotionalTone: 'neutral'
      }] : []),
      ...(dateField?.dateRange ? [{
        id: 'scene-4',
        narrativeText: `From ${new Date(dateField.dateRange.earliest).getFullYear()} to ${new Date(dateField.dateRange.latest).getFullYear()}`,
        narrativeSubtext: 'The timeline of events.',
        visualizationType: 'timeline',
        visualizationConfig: {
          dateField: dateField.name,
          groupBy: 'year'
        },
        emotionalTone: 'somber'
      }] : [])
    ].filter(Boolean)
  };
}
