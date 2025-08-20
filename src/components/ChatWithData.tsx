import React, { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, ScatterChart, Scatter
} from "recharts";

export default function ChatWithData({ dataset }: { dataset: any[] }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [charts, setCharts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function ask() {
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
      setPreview(data.data_preview || []);
      setCharts(data.charts || []);
    } catch {
      setAnswer("Error contacting AI.");
    }
    setLoading(false);
  }

  function renderChart(chart: any, index: number) {
    const data = preview;
    if (!data.length) return null;

    switch (chart.type) {
      case "bar":
        return (
          <BarChart key={index} width={400} height={250} data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chart.x} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={chart.y} fill="#8884d8" />
          </BarChart>
        );

      case "line":
        return (
          <LineChart key={index} width={400} height={250} data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chart.x} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={chart.y} stroke="#82ca9d" />
          </LineChart>
        );

      case "pie":
        return (
          <PieChart key={index} width={400} height={250}>
            <Pie
              data={data}
              dataKey={chart.y}
              nameKey={chart.x}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              label
            >
              {data.map((_, i) => (
                <Cell key={i} fill={["#8884d8", "#82ca9d", "#ffc658"][i % 3]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        );

      case "scatter":
        return (
          <ScatterChart key={index} width={400} height={250}>
            <CartesianGrid />
            <XAxis dataKey={chart.x} name={chart.x} />
            <YAxis dataKey={chart.y} name={chart.y} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={data} fill="#8884d8" />
          </ScatterChart>
        );

      default:
        return <p key={index}>Unsupported chart type: {chart.type}</p>;
    }
  }

  return (
    <div className="p-4 border rounded shadow-md bg-white">
      <h2 className="text-xl font-bold mb-2">Chat with Data</h2>
      <textarea
        className="border w-full p-2 rounded mb-2"
        placeholder="Ask a question about your dataset..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <button
        onClick={ask}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? "Thinking..." : "Ask"}
      </button>

      {answer && (
        <div className="mt-4">
          <h3 className="font-semibold">Answer:</h3>
          <p>{answer}</p>
        </div>
      )}

      {preview.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold">Data Preview:</h3>
          <pre className="text-sm bg-gray-100 p-2 rounded overflow-x-auto">
            {JSON.stringify(preview, null, 2)}
          </pre>
        </div>
      )}

      {charts.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Charts:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {charts.map((chart, i) => renderChart(chart, i))}
          </div>
        </div>
      )}
    </div>
  );
}


