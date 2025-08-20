// api/chat.ts - Vercel Serverless Function for Vite + React
// NOTE: Contains a hardcoded API key per user's request. Do NOT commit this for public repos.
import type { VercelRequest, VercelResponse } from "@vercel/node";

// ⚠️ SECURITY WARNING: This is hardcoded for convenience only.
// Move this to an environment variable (process.env.OPENAI_API_KEY) for production.
const OPENAI_API_KEY = "REPLACE_WITH_YOUR_OPENAI_KEY";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { question, dataset } = req.body || {};
    if (!question || !Array.isArray(dataset)) {
      return res.status(400).json({ error: "Missing 'question' or 'dataset' array in body." });
    }

    const sample = dataset.slice(0, 50); // keep payload small

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: [
              "You are a strict JSON generator for data analysis.",
              "Always reply with a single JSON object with EXACT keys:",
              "{",
              '  "answer": string,',
              '  "data_preview": array of objects (up to 10 rows),',
              '  "charts": array of objects like { "type": "bar|line|pie|scatter", "x": string, "y": string }',
              "}",
              "Do not include any extra commentary."
            ].join(" ")
          },
          {
            role: "user",
            content: JSON.stringify({
              question,
              dataset_sample: sample
            })
          }
        ]
      })
    });

    const data = await openaiRes.json();
    const text = data?.choices?.[0]?.message?.content || "";

    let payload: any = null;
    try {
      payload = JSON.parse(text);
    } catch (_e) {
      // Fallback if model didn't return strict JSON
      payload = {
        answer: text || "No answer from model.",
        data_preview: sample.slice(0, 10),
        charts: []
      };
    }

    // Basic shape safety
    if (!payload || typeof payload !== "object") {
      payload = { answer: "No answer.", data_preview: sample.slice(0, 10), charts: [] };
    }
    if (!Array.isArray(payload.data_preview)) {
      payload.data_preview = sample.slice(0, 10);
    }
    if (!Array.isArray(payload.charts)) {
      payload.charts = [];
    }

    return res.status(200).json(payload);
  } catch (err: any) {
    console.error("Serverless error:", err?.stack || err);
    return res.status(500).json({ error: "Failed to contact OpenAI" });
  }
}
