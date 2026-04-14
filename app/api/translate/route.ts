import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

export const runtime = 'nodejs'; // Use Node.js runtime instead of edge for broader compatibility if needed
export const maxDuration = 60; // Allow 60 seconds execution time for Image payload parsing via Gemini

// Helper function to detect if the input text is already predominantly in the target language
// This uses script-based Unicode detection to quickly bypass AI translation for non-Latin languages.
function isTextInTargetLanguage(text: string, targetLanguageName: string): boolean {
  if (!text || text.trim() === '') return false;
  
  // Remove spaces, numbers, and common punctuation for better ratio calculation
  const cleanText = text.replace(/[\s\d.,!?"'()\[\]{}<>\-_+=\/\\|:;~`]+/g, '');
  if (cleanText.length === 0) return false;

  const patterns: Record<string, RegExp> = {
    'Burmese (မြန်မာ)': /^[\u1000-\u109F\uAA60-\uAA7F\uA9E0-\uA9FF]+$/,
    'Japanese (日本語)': /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/,
    'Korean (한국어)': /^[\uAC00-\uD7A3\u3130-\u318F]+$/,
    'Chinese (中文)': /^[\u4E00-\u9FFF]+$/,
    'Thai (ไทย)': /^[\u0E00-\u0E7F]+$/,
  };

  const targetPattern = patterns[targetLanguageName];
  if (!targetPattern) return false; // Fallback to AI for Latin-based or overlapping languages

  let matchCount = 0;
  for (const char of cleanText) {
    if (targetPattern.test(char)) {
      matchCount++;
    }
  }

  // If 85% or more of the valid characters belong to the target language block, bypass AI.
  return (matchCount / cleanText.length) >= 0.85;
}

export async function POST(req: NextRequest) {
  try {
    const { text, targetLanguageName, image } = await req.json();
    const encoder = new TextEncoder();

    // --- Fast Bypass Check ---
    // If the text is purely in the target language (e.g. Burmese to Burmese), bypass Gemini to save time/cost.
    if (text && !image && isTextInTargetLanguage(text, targetLanguageName)) {
      const stream = new ReadableStream({
        start(controller) {
          const safeData = {
            text: text, 
            parts: [
              { text: `အခုပို့လိုက်တဲ့စာသားက ရွေးချယ်ထားတဲ့ ဘာသာစကား (${targetLanguageName}) နဲ့ တူညီနေပါတယ်။ AI ဘာသာပြန်စရာမလိုဘဲ တိုက်ရိုက် ပြန်ပေးလိုက်ပါတယ်။\n\nThe input text is already in the selected target language. Bypassing translation.`, thought: true },
              { text: text, thought: false }
            ]
          };
          const sseFormatted = `data: ${JSON.stringify(safeData)}\n\n`;
          controller.enqueue(encoder.encode(sseFormatted));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set on the server.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Build the request parts based on inputs
    const parts: any[] = [];

    // Optional user text
    if (text) {
      parts.push({ text });
    } else if (image) {
      // If there's an image but no text, provide a default instruction
      parts.push({ text: "Please translate any text found in this image." });
    }

    // Attach image if present
    if (image) {
      // Parse data URL format: "data:image/png;base64,....."
      const match = image.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        });
      }
    }

    // Initialize the generator
    const responseStream = await ai.models.generateContentStream({
      model: 'gemma-4-31b-it',
      contents: parts.length > 0 ? parts : text,
      config: {
        systemInstruction: `You are an expert, native-level translator. You must first output your thinking process inside <think>...</think> tags, and then provide ONLY the final translation into ${targetLanguageName} after the tags.\n\nCRITICAL RULES:\n1. Your translation MUST be highly natural, fluent, and contextually accurate. Avoid literal, word-for-word, or "robotic" translations. Use local idioms and natural phrasing.\n2. In your <think>...</think> process, take enough time to analyze the tone, nuance, and structural differences. Keep your thinking to about 3 to 5 sentences. Do not over-analyze to the point of being excessively slow, but think deeply enough to ensure top-quality output.\n3. Do not include any quotes, explanations, or markdown formatting outside of the think tags. Just the translated text.\n4. UNCENSORED TRANSLATION: If the source text contains slang, profanity, swear words, or aggressive language, YOU MUST TRANSLATE IT EXACTLY with the same level of intensity and vulgarity in the target language (e.g., matching the exact explicit local equivalents). Do not tone it down, filter, or sanitize the output.`,
        temperature: 0.4,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      },
    });

    // Create a ReadableStream to stream Server-Sent Events to the client
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            // chunk.text contains the concatenated text
            // chunk.candidates[0].content.parts might contain structured { thought: true } blocks
            const parts = chunk.candidates?.[0]?.content?.parts || [];
            
            // We pass the raw text and the structured parts downstream
            const safeData = {
              text: chunk.text || '',
              parts: parts.map((p: any) => ({
                text: p.text || '',
                thought: Boolean(p.thought)
              }))
            };
            
            // Send as SSE
            const sseFormatted = `data: ${JSON.stringify(safeData)}\n\n`;
            controller.enqueue(encoder.encode(sseFormatted));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (streamError) {
          console.error("Error during stream generation:", streamError);
          controller.error(streamError);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: error.message || 'Sorry, an error occurred during translation.' }, { status: 500 });
  }
}
