// api/chat.ts - Vercel Serverless Function for Vite + React
import type { VercelRequest, VercelResponse } from "@vercel/node";

// ✅ Secure: Read API key from environment variable
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing OpenAI API key. Set OPENAI_API_KEY in Vercel env." });
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
        temperature: 0,
        response_format: { type: "json_object" }, // 👈 enforce JSON only
        messages: [
          {
            role: "system",
            content:
              "You are a data analysis assistant. ALWAYS respond with a strict JSON object only. Format:\n" +
              "{\n" +
              '  "answer": string,\n' +
              '  "data_preview": array of objects (max 10 rows),\n' +
              '  "charts": array of objects like { "type": "bar|line|pie|scatter", "x": string, "y": string }\n' +
              "}\n" +
              "Never include explanations, markdown, or text outside the JSON object."
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

    console.log("RAW MODEL RESPONSE:", text); // 👈 Debugging

    let payload: any = null;
    try {
      payload = JSON.parse(text);
    } catch (_e) {
      payload = {
        answer: "Model did not return valid JSON.",
        data_preview: sample.slice(0, 10),
        charts: []
      };
    }

    // ✅ Safety checks
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



