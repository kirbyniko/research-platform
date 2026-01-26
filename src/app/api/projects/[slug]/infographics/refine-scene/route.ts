import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

interface RefineSceneRequest {
  scene: {
    id: string;
    narrativeText: string;
    narrativeSubtext?: string;
    visualizationType: string;
    visualizationConfig: Record<string, unknown>;
    emotionalTone?: string;
  };
  feedback: string;
  dataCount: number;
  allScenes: Array<{ id: string; type: string; text: string }>;
}

const SYSTEM_PROMPT = `You are an expert at refining individual scenes in data visualizations.

Given a scene configuration and user feedback, return an IMPROVED version of that scene.

## RULES
1. Keep the same id
2. Keep the scene's purpose/message unless asked to change it
3. Return ONLY the refined scene object, not the full infographic
4. Apply the user's feedback precisely

## AVAILABLE VISUALIZATION TYPES
- counter: Big number display (config: value, suffix, fontSize)
- dotGrid: Grid of dots (config: dotsPerRow, dotSize, colorBy, colorMap, showLegend, legendPosition)
- humanGrid: Grid of person icons (config: same as dotGrid)
- pieChart: Pie/donut chart (config: groupBy, colorMap)
- barChart: Vertical bars (config: groupBy)
- comparison: Horizontal bars (config: groupBy)
- humanScale: Number with relatable comparison (config: value, comparison)
- timeline: Time-based chart (config: dateField, groupBy)

## SIZE GUIDELINES
- dotGrid/humanGrid: dotsPerRow 15-25, dotSize 10-20
- legendPosition: 'top-right' is usually best
- showLegend: true (always show legend for colored visualizations)

## OUTPUT FORMAT
Return a single JSON object with the scene properties. Example:
{
  "id": "scene-2",
  "narrativeText": "Short punchy statement",
  "narrativeSubtext": "Supporting detail with numbers",
  "visualizationType": "dotGrid",
  "visualizationConfig": { ... },
  "emotionalTone": "neutral"
}`;

export async function POST(
  request: NextRequest,
) {
  try {
    const body: RefineSceneRequest = await request.json();
    const { scene, feedback, dataCount, allScenes } = body;
    
    if (!scene || !feedback) {
      return NextResponse.json(
        { error: 'Missing required fields: scene, feedback' },
        { status: 400 }
      );
    }
    
    if (!process.env.OPENAI_API_KEY) {
      // Return original scene if no API key
      return NextResponse.json(scene);
    }
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const userPrompt = `
## CURRENT SCENE
\`\`\`json
${JSON.stringify(scene, null, 2)}
\`\`\`

## CONTEXT
- Total data records: ${dataCount.toLocaleString()}
- Other scenes in this infographic: ${allScenes.map(s => `${s.id}: ${s.type} - "${s.text}"`).join(', ')}

## USER'S FEEDBACK
"${feedback}"

## YOUR TASK
Apply the user's feedback to improve this scene. Return the refined scene as JSON.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.5,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    });
    
    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response from AI');
    }
    
    const refinedScene = JSON.parse(responseText);
    
    // Ensure the ID is preserved
    refinedScene.id = scene.id;
    
    return NextResponse.json(refinedScene);
    
  } catch (error) {
    console.error('Scene refinement error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Refinement failed' },
      { status: 500 }
    );
  }
}
