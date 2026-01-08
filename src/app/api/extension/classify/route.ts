import { NextRequest, NextResponse } from 'next/server';

// Sentence classification using Ollama
async function classifySentence(sentence: string): Promise<{ category: string; confidence: number }> {
  const prompt = `Classify this sentence from a news article about a death in immigration detention. 
Respond with ONLY one word from: timeline, official, medical, legal, context, irrelevant

Categories:
- timeline: Events with dates/times (arrests, transfers, medical incidents, death)
- official: ICE/government statements, official communications
- medical: Health conditions, symptoms, treatments, medical staff actions
- legal: Immigration status, court cases, legal proceedings
- context: Background info about the person, family, general conditions
- irrelevant: Not related to the death case (ads, navigation, general news)

Sentence: "${sentence}"

Category:`;

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.1:8b',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 10
        }
      })
    });

    if (!response.ok) {
      return { category: 'context', confidence: 0.5 };
    }

    const data = await response.json();
    const responseText = data.response?.toLowerCase().trim() || '';
    
    // Extract category from response
    const categories = ['timeline', 'official', 'medical', 'legal', 'context', 'irrelevant'];
    let category = 'context';
    let confidence = 0.5;
    
    for (const cat of categories) {
      if (responseText.includes(cat)) {
        category = cat;
        confidence = 0.85;
        break;
      }
    }
    
    return { category, confidence };
  } catch (error) {
    console.error('Ollama classification error:', error);
    return { category: 'context', confidence: 0.5 };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sentences } = await request.json();
    
    if (!sentences || !Array.isArray(sentences)) {
      return NextResponse.json(
        { error: 'sentences array is required' },
        { status: 400 }
      );
    }
    
    // Classify each sentence
    const classifications = await Promise.all(
      sentences.map(async (sentence: string) => {
        // Skip very short sentences
        if (sentence.length < 20) {
          return { text: sentence, category: 'irrelevant', confidence: 0.9 };
        }
        
        const { category, confidence } = await classifySentence(sentence);
        return { text: sentence, category, confidence };
      })
    );
    
    return NextResponse.json({ classifications });
  } catch (error) {
    console.error('Classification error:', error);
    return NextResponse.json(
      { error: 'Classification failed' },
      { status: 500 }
    );
  }
}
