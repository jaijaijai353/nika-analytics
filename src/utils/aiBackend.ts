
export async function fetchInsightsFromBackend(rows: any[]) {
  try {
    const res = await fetch("http://localhost:8000/api/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: rows }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
