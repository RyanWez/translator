import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs'; // Use Node.js runtime instead of edge for broader compatibility if needed

export async function POST(req: NextRequest) {
  try {
    const { text, targetLanguageName } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set on the server.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Initialize the generator
    const responseStream = await ai.models.generateContentStream({
      model: 'gemma-4-26b-a4b-it',
      contents: text,
      config: {
        systemInstruction: `You are a direct translator. You must first output your thinking process inside <think>...</think> tags, and then provide ONLY the final translation into ${targetLanguageName} after the tags. Do not include any quotes, explanations, original text, or markdown formatting outside of the think tags.`,
        temperature: 0.3,
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
