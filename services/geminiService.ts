
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionResult } from "../types";

export const analyzeAudio = async (apiKey: string, base64Data: string, mimeType: string): Promise<ExtractionResult> => {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: "この音声ファイルを解析し、以下の情報を抽出してください。音声は電話の録音や留守番電話の可能性があります。\n1. 全文書き起こし\n2. 相手の氏名（不明な場合は空文字）\n3. 折り返しの電話番号（不明な場合は空文字）\n4. 推定される性別（male, female, unknownのいずれか）\n5. 抽出の信頼度(0-1)\n6. 会話の短い要約\n結果は必ず指定されたJSON形式で返してください。",
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transcription: { type: Type.STRING },
          name: { type: Type.STRING },
          phoneNumber: { type: Type.STRING },
          gender: { type: Type.STRING, enum: ['male', 'female', 'unknown'] },
          confidence: { type: Type.NUMBER },
          summary: { type: Type.STRING },
        },
        required: ["transcription", "name", "phoneNumber", "gender", "confidence", "summary"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from AI model");
  }

  return JSON.parse(text) as ExtractionResult;
};
