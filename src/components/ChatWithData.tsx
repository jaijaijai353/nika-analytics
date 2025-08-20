import React, { useState } from "react";
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";

type Props = { dataset: any };

const ChatWithData: React.FC<Props> = ({ dataset }) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!dataset || !dataset.data) return;
    setLoading(true);
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`, // <- from .env
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: `You are a data analyst. Dataset sample: ${JSON.stringify(
                dataset.data.slice(0, 20)
              )}\nQuestion: ${question}`,
            },
          ],
        }),
      });

      const j = await res.json();
      setAnswer(j.choices?.[0]?.message?.content || "No answer.");
      setPreview(dataset.data.slice(0, 5));
      setSuggestions([
        {
          type: "bar",
          x: Object.keys(dataset.data[0])[0],
          y: Object.keys(dataset.data[0])[1],
        },
      ]);
    } catch (e) {
      setAnswer("❌ Failed to call OpenAI API. Check your key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-gray-800 bg-[#0F1418]">
      <div className="text-sm text-gray-200 mb-2">Chat with Data (AI-powered)</div>
      <div className="flex gap-2">
        <input
          className="flex-1 bg-black/40 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100"
          placeholder="e.g., top 5 by revenue, sum of sales by region"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button
          onClick={ask}
          disabled={loading}
          className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm"
        >
          {loading ? "Asking..." : "Ask"}
        </button>
      </div>

      {answer && <div className="mt-3 text-gray-300 text-sm">💡 {answer}</div>}

      {preview.length > 0 && (
        <div className="mt-3 max-h-60 overflow-auto text-xs text-gray-200">
          <table className="min-w-full">
            <thead>
              <tr>
                {Object.keys(preview[0]).map((k) => (
                  <th
                    key={k}
                    className="text-left pr-3 py-1 border-b border-gray-700"
                  >
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, idx) => (
                <tr key={idx}>
                  {Object.keys(preview[0]).map((k) => (
                    <td
                      key={k}
                      className="pr-3 py-1 border-b border-gray-800"
                    >
                      {String(row[k])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ChatWithData;

