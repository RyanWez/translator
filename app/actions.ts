'use server';

import { GoogleGenAI } from '@google/genai';

export async function translateText(text: string, targetLanguageName: string) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set on the server.");
    }
    
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemma-4-26b-a4b-it',
      contents: text,
      config: {
        systemInstruction: `You are a direct translator. Translate the user's input into ${targetLanguageName}. Provide ONLY the translation. Do not include any quotes, explanations, original text, or markdown formatting. Just the translated text.`,
        temperature: 0.3,
      },
    });

    return { success: true, text: response.text || 'Translation failed.' };
  } catch (error: any) {
    console.error('Translation error:', error);
    return { success: false, error: 'Sorry, an error occurred during translation.' };
  }
}
