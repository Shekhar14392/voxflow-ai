import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface KnowledgeBase {
  id: string;
  name: string;
  documents: { id: string; status: string }[];
}

export default function Knowledge() {
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [kbName, setKbName] = useState("");
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ content: string }[]>([]);

  async function load() {
    setBases(await apiFetch("/api/v1/knowledge"));
  }

  useEffect(() => {
    load().catch(() => (window.location.href = "/login"));
  }, []);

  async function createKb(e: React.FormEvent) {
    e.preventDefault();
    if (!kbName.trim()) return;
    await apiFetch("/api/v1/knowledge", { method: "POST", body: JSON.stringify({ name: kbName }) });
    setKbName("");
    load();
  }

  async function addDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedKbId || !docContent.trim()) return;
    await apiFetch(`/api/v1/knowledge/${selectedKbId}/documents`, {
      method: "POST",
      body: JSON.stringify({ title: docTitle || "Untitled", content: docContent }),
    });
    setDocTitle("");
    setDocContent("");
    load();
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const data = await apiFetch("/api/v1/knowledge/search", {
      method: "POST",
      body: JSON.stringify({ query: searchQuery }),
    });
    setSearchResults(data.results);
  }

  return (
    <main style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>Knowledge Base (free — Postgres full-text search, no API key)</h1>

      <form onSubmit={createKb} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input placeholder="New knowledge base name" value={kbName} onChange={(e) => setKbName(e.target.value)} />
        <button type="submit">Create</button>
      </form>

      <ul>
        {bases.map((kb) => (
          <li key={kb.id} style={{ marginBottom: 8 }}>
            <button onClick={() => setSelectedKbId(kb.id)} style={{ fontWeight: selectedKbId === kb.id ? "bold" : "normal" }}>
              {kb.name} ({kb.documents.length} docs)
            </button>
          </li>
        ))}
      </ul>

      {selectedKbId && (
        <form onSubmit={addDocument} style={{ display: "flex", flexDirection: "column", gap: 8, margin: "16px 0" }}>
          <h3>Add document (paste text — no PDF upload needed for free mode)</h3>
          <input placeholder="Title" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
          <textarea
            placeholder="Paste business info, FAQs, policies..."
            value={docContent}
            onChange={(e) => setDocContent(e.target.value)}
            rows={6}
          />
          <button type="submit">Add to knowledge base</button>
        </form>
      )}

      <hr style={{ margin: "24px 0" }} />

      <form onSubmit={runSearch} style={{ display: "flex", gap: 8 }}>
        <input placeholder="Search your knowledge base..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <button type="submit">Search</button>
      </form>
      <ul>
        {searchResults.map((r, i) => (
          <li key={i} style={{ marginTop: 8 }}>{r.content}</li>
        ))}
      </ul>
    </main>
  );
}
