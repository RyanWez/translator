import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

export const runtime = 'nodejs'; // Use Node.js runtime instead of edge for broader compatibility if needed
export const maxDuration = 60; // Allow 60 seconds execution time for Image payload parsing via Gemini

export async function POST(req: NextRequest) {
  try {
    const { text, targetLanguageName, image } = await req.json();

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
      model: 'gemma-4-26b-a4b-it',
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

    const encoder = new TextEncoder();
    
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
