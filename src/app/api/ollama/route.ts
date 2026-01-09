import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';

export const runtime = 'nodejs';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

// Model recommendations based on VRAM
const MODEL_RECOMMENDATIONS = {
  4: ['llama3.2:1b', 'phi3:mini', 'qwen2.5:1.5b'],
  6: ['llama3.2:3b', 'phi3:medium', 'mistral:7b-instruct-q4_0'],
  8: ['llama3.1:8b', 'mistral:7b-instruct', 'qwen2.5:7b'],
  12: ['llama3.1:8b', 'mixtral:8x7b-instruct-q4_0', 'qwen2.5:14b'],
  16: ['llama3.1:70b-instruct-q4_0', 'mixtral:8x7b', 'qwen2.5:32b-instruct-q4_0'],
  24: ['llama3.1:70b', 'mixtral:8x22b-instruct-q4_0', 'qwen2.5:72b-instruct-q4_0'],
};

// GET - Check Ollama status and list models
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireServerAuth(request, 'editor');
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // Check if Ollama is running
    const vramParam = request.nextUrl.searchParams.get('vram');
    
    try {
      const response = await fetch(`${OLLAMA_URL}/api/tags`);
      
      if (!response.ok) {
        return NextResponse.json({
          available: false,
          error: 'Ollama is not running',
        });
      }

      const data = await response.json();
      const installedModels = data.models || [];

      // Get recommendations based on VRAM
      let recommendations: string[] = [];
      if (vramParam) {
        const vram = parseInt(vramParam);
        const closestVram = Object.keys(MODEL_RECOMMENDATIONS)
          .map(Number)
          .sort((a, b) => Math.abs(a - vram) - Math.abs(b - vram))[0];
        recommendations = MODEL_RECOMMENDATIONS[closestVram as keyof typeof MODEL_RECOMMENDATIONS] || [];
      }

      return NextResponse.json({
        available: true,
        url: OLLAMA_URL,
        installedModels: installedModels.map((m: any) => ({
          name: m.name,
          size: m.size,
          modified: m.modified_at,
        })),
        recommendations: vramParam ? recommendations : [],
        vramSpecified: vramParam ? parseInt(vramParam) : null,
      });
    } catch (error) {
      return NextResponse.json({
        available: false,
        error: 'Cannot connect to Ollama. Is it installed and running?',
        installUrl: 'https://ollama.ai/download',
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check Ollama status' },
      { status: 500 }
    );
  }
}

// POST - Pull/download a model
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireServerAuth(request, 'editor');
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { action, model } = await request.json();

    if (action === 'pull' && model) {
      // Trigger model download
      const response = await fetch(`${OLLAMA_URL}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model }),
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to pull model: ${response.statusText}` },
          { status: 500 }
        );
      }

      // Stream the download progress
      const reader = response.body?.getReader();
      if (!reader) {
        return NextResponse.json({ error: 'No response body' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Model ${model} download started. Check Ollama terminal for progress.`,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error managing Ollama model:', error);
    return NextResponse.json(
      { error: 'Failed to manage model' },
      { status: 500 }
    );
  }
}
