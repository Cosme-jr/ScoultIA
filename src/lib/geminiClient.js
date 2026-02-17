// geminiClient.js — ScoutAI Pro
// Usando Groq (gratuito, 14.400 req/dia, sem cartão)

import Groq from "groq-sdk";

const client = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

const MODEL = "llama-3.3-70b-versatile"; // melhor modelo gratuito do Groq

export const analyzePsychology = async (scoutText) => {
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `Você é um especialista em Psicologia do Esporte com 20 anos de experiência.
Analise o texto do scout e retorne APENAS um JSON válido com:
lideranca (0-100), adaptabilidade (0-100), resiliencia (0-100),
inteligencia_tatica (0-100), estabilidade_emocional (0-100),
temperamento (até 6 palavras), pontos_fortes (array),
pontos_fracos (array), tags_personalidade (array),
analise_completa (máx 120 palavras).
NUNCA use markdown. Retorne apenas o objeto JSON.`,
      },
      {
        role: "user",
        content: `Texto para análise: ${scoutText}`,
      },
    ],
    temperature: 0.4,
    max_tokens: 1024,
  });

  const text = completion.choices[0].message.content;
  return JSON.parse(text.replace(/```json|```/g, "").trim());
};

export const analyzeTechnicalScout = async (scoutText) => {
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `Você é um coordenador técnico de futebol de elite.
Analise o relatório e retorne APENAS um JSON válido com:
{ "atleta": "string", "posicao": "string",
  "notas": { "tecnica": 0.0, "tatica": 0.0, "fisica": 0.0, "psicologica": 0.0 },
  "resumo": "máx 80 palavras" }
Notas de 0 a 10. NUNCA use markdown. Retorne apenas o JSON.`,
      },
      {
        role: "user",
        content: `Relatório: ${scoutText}`,
      },
    ],
    temperature: 0.4,
    max_tokens: 512,
  });

  const text = completion.choices[0].message.content;
  return JSON.parse(text.replace(/```json|```/g, "").trim());
};

export default analyzeTechnicalScout;


