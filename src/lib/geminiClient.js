import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction: "Você é um especialista em Psicologia do Esporte com 20 anos de experiência. Analise o texto do scout e retorne estritamente um JSON com: Scores (0-100): lideranca, adaptabilidade, resiliencia, inteligencia_tatica, estabilidade_emocional; temperamento (até 6 palavras); pontos_fortes e pontos_fracos (arrays); tags_personalidade (array); analise_completa (máx 120 palavras). Regra de Ouro: Não use markdown, retorne apenas o objeto JSON.",
});

export const analyzePsychology = async (scoutText) => {
  try {
    const result = await model.generateContent(scoutText);
    const response = await result.response;
    const text = response.text();
    
    // Safety check to ensure we only return JSON
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
};

export default analyzePsychology;
