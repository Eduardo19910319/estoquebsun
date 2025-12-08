import { GoogleGenAI, Type } from "@google/genai";

// Helper to check if API key exists
export const hasApiKey = (): boolean => !!process.env.API_KEY;

export const parseProductDescription = async (description: string) => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Extract product details from this text: "${description}". If specific fields are missing, make a reasonable guess based on fashion context or leave blank.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "A short, catchy product name" },
          category: { type: Type.STRING, description: "Category like Vestido, Calça, Blusa" },
          size: { type: Type.STRING, description: "Size like P, M, G, 38, 40" },
          color: { type: Type.STRING, description: "Primary color" },
          price: { type: Type.NUMBER, description: "Selling price" },
          cost: { type: Type.NUMBER, description: "Cost price (estimated as 50% of price if not mentioned)" },
        },
        required: ["name", "price"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
};