import { useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function readError(response) {
  try {
    const data = await response.json();
    return typeof data.detail === "string" ? data.detail : "Something went wrong.";
  } catch {
    return "Something went wrong.";
  }
}

function App() {
  const [file, setFile] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [uploaded, setUploaded] = useState(null);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setError(null);
    setResult(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`${API_URL}/documents`, { method: "POST", body: form });
      if (!response.ok) throw new Error(await readError(response));
      const data = await response.json();
      setSessionId(data.session_id);
      setUploaded(data);
    } catch (e) {
      setSessionId(null);
      setUploaded(null);
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!sessionId || !question.trim()) return;
    setError(null);
    setAsking(true);
    try {
      const form = new FormData();
      form.append("session_id", sessionId);
      form.append("question", question);
      const response = await fetch(`${API_URL}/ask`, { method: "POST", body: form });
      if (!response.ok) throw new Error(await readError(response));
      setResult(await response.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="app">
      <h1>Ask My Docs</h1>

      <section className="card">
        <h2>1. Upload a document</h2>
        <input
          type="file"
          accept=".txt,.md,.pdf"
          onChange={(e) => setFile(e.target.files[0] ?? null)}
        />
        <button onClick={handleUpload} disabled={!file || uploading}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
        {uploaded && (
          <p className="ok">
            {uploaded.source} is ready ({uploaded.chunks} parts).
          </p>
        )}
      </section>

      <section className="card">
        <h2>2. Ask a question</h2>
        <form onSubmit={handleAsk}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What is the upload limit?"
            disabled={!sessionId}
          />
          <button type="submit" disabled={!sessionId || !question.trim() || asking}>
            {asking ? "Thinking..." : "Ask"}
          </button>
        </form>
      </section>

      {error && <p className="error">{error}</p>}

      {result && (
        <section className="card">
          <h2>Answer</h2>
          <p className="answer">{result.answer}</p>
          {result.sources.length > 0 && (
            <>
              <h3>Sources</h3>
              <ul>
                {result.sources.map((s, i) => (
                  <li key={i}>
                    [{i + 1}] {s.source}, part {s.position}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}

export default App;