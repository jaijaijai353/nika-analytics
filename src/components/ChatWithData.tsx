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
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!dataset || !dataset.data) return;
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, dataset: dataset.data })
      });
      const j = await res.json();
      setAnswer(j.answer || "No answer.");
      setPreview(Array.isArray(j.data_preview) ? j.data_preview : []);
      setSuggestions(Array.isArray(j.charts) ? j.charts : []);
    } catch (e) {
      setAnswer("❌ Failed to reach /api/chat. Check deployment.");
    } finally {
      setLoading(false);
    }
  };

  const renderChart = (s: any) => {
    if (!s || !dataset?.rows) return null;
    const data = dataset.rows;
    switch (s.type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={s.x} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={s.y} />
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={s.x} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={s.y} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data} dataKey={s.y} nameKey={s.x} cx="50%" cy="50%" outerRadius={100} label>
                {data.map((_: any, idx: number) => (<Cell key={idx} />))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      case "scatter":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid />
              <XAxis dataKey={s.x} />
              <YAxis dataKey={s.y} />
              <Tooltip />
              <Scatter data={data} />
            </ScatterChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-gray-800 bg-[#0F1418]">
      <div className="text-sm text-gray-200 mb-2">Chat with Data (backend-powered)</div>
      <div className="flex gap-2">
        <input
          className="flex-1 bg-black/40 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100"
          placeholder="e.g., top 5 by revenue, sum of sales by region"
          value={question}
          onChange={e => setQuestion(e.target.value)}
        />
        <button onClick={ask} disabled={loading} className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm">
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
                  <th key={k} className="text-left pr-3 py-1 border-b border-gray-700">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, idx) => (
                <tr key={idx}>
                  {Object.keys(preview[0]).map((k) => (
                    <td key={k} className="pr-3 py-1 border-b border-gray-800">{String(row[k])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mt-4 space-y-4">
          {suggestions.map((s, idx) => (
            <div key={idx} className="border border-gray-700 rounded-lg p-3 bg-black/30">
              <div className="text-sm text-gray-400 mb-2">Suggested {s.type} chart</div>
              {renderChart(s)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatWithData;
