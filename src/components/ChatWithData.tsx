import React, { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  ScatterChart, Scatter, ResponsiveContainer
} from "recharts";

export default function ChatWithData({ dataset }: { dataset: any[] }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [charts, setCharts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function ask() {
    if (!question) return alert("Please type a question first.");
    setLoading(true);
    setAnswer(null);
    setCharts([]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, dataset }),
      });
      const data = await res.json();
      setAnswer(data.answer || "No answer.");
      setPreview(Array.isArray(data.data_preview) ? data.data_preview : []);
      setCharts(Array.isArray(data.charts) ? data.charts : []);
    } catch (err) {
      console.error("Chat error:", err);
      setAnswer("⚠️ Error contacting AI.");
    }
    setLoading(false);
  }

  function renderChart(chart: any, index: number) {
    const data = preview;
    if (!data.length || !chart.x || !chart.y) {
      return <p key={index}>⚠️ Invalid chart config.</p>;
    }

    switch (chart.type) {
      case "bar":
        return (
          <ResponsiveContainer key={index} width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chart.x} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={chart.y} fill="#60a5fa" />
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer key={index} width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chart.x} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={chart.y} stroke="#34d399" />
            </LineChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer key={index} width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                dataKey={chart.y}
                nameKey={chart.x}
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={["#60a5fa", "#34d399", "#fbbf24"][i % 3]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case "scatter":
        return (
          <ResponsiveContainer key={index} width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid />
              <XAxis dataKey={chart.x} />
              <YAxis dataKey={chart.y} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={data} fill="#f87171" />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return <p key={index}>❌ Unsupported chart type: {chart.type}</p>;
    }
  }

  return (
    <div className="p-6 rounded-xl shadow-md bg-gray-900 text-white">
      <h2 className="text-xl font-bold mb-4">💬 Chat with Data</h2>

      <textarea
        className="w-full p-3 rounded text-black mb-3"
        placeholder="Ask a question about your dataset..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      <button
        onClick={ask}
        disabled={loading}
        className="bg-blue-600 px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Thinking..." : "Ask AI"}
      </button>

      {answer && (
        <div className="mt-6">
          <h3 className="font-semibold mb-1">AI Answer:</h3>
          <p className="text-gray-300">{answer}</p>
        </div>
      )}

      {preview.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">📊 Data Preview:</h3>
          <pre className="text-xs bg-gray-800 p-3 rounded overflow-x-auto">
            {JSON.stringify(preview.slice(0, 10), null, 2)}
          </pre>
        </div>
      )}

      {charts.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">📈 Suggested Charts:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {charts.map((chart, i) => renderChart(chart, i))}
          </div>
        </div>
      )}
    </div>
  );
}



