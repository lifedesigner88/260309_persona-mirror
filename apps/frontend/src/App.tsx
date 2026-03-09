import { useState } from "react";
import { Link, Outlet } from "react-router-dom";

export function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>PersonaMirror</h1>
      <nav style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <Link to="/">Home</Link>
        <Link to="/capture">Capture</Link>
      </nav>
      <Outlet />
    </main>
  );
}

export function HomePage() {
  const [result, setResult] = useState<string>("not checked");
  const [loading, setLoading] = useState<boolean>(false);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

  async function checkHealth() {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/health`);
      const data = (await response.json()) as { status?: string };
      setResult(data.status ?? "unknown");
    } catch {
      setResult("request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <p>Phase 0 frontend scaffold is ready.</p>
      <button type="button" onClick={checkHealth} disabled={loading}>
        {loading ? "Checking..." : "Check Backend Health"}
      </button>
      <p>health: {result}</p>
    </section>
  );
}

export function CapturePage() {
  return <p>Camera/Mic capture UI will be implemented in Phase 1.</p>;
}
