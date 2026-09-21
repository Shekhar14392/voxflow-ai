import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface Agent {
  id: string;
  name: string;
  state: string;
  businessName?: string;
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [newAgentName, setNewAgentName] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [testReply, setTestReply] = useState<string | null>(null);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);

  async function loadAgents() {
    const data = await apiFetch("/api/v1/agents");
    setAgents(data);
  }

  useEffect(() => {
    loadAgents().catch(() => {
      window.location.href = "/login";
    });
  }, []);

  async function createAgent(e: React.FormEvent) {
    e.preventDefault();
    if (!newAgentName.trim()) return;
    await apiFetch("/api/v1/agents", {
      method: "POST",
      body: JSON.stringify({
        name: newAgentName,
        systemInstructions: `You are an AI voice assistant representing ${newAgentName}. Be concise, helpful, and identify yourself as an AI assistant when asked.`,
      }),
    });
    setNewAgentName("");
    loadAgents();
  }

  async function testAgent(agentId: string) {
    setActiveAgentId(agentId);
    const result = await apiFetch(`/api/v1/agents/${agentId}/test`, {
      method: "POST",
      body: JSON.stringify({ message: testMessage }),
    });
    setTestReply(result.content);
  }

  return (
    <main style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>Your Agents</h1>

      <form onSubmit={createAgent} style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          placeholder="New agent name"
          value={newAgentName}
          onChange={(e) => setNewAgentName(e.target.value)}
        />
        <button type="submit">Create agent</button>
      </form>

      <ul>
        {agents.map((a) => (
          <li key={a.id} style={{ marginBottom: 16, border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
            <strong>{a.name}</strong> — {a.state}
            <div style={{ marginTop: 8 }}>
              <input
                placeholder="Say something to test..."
                value={activeAgentId === a.id ? testMessage : ""}
                onChange={(e) => setTestMessage(e.target.value)}
                style={{ marginRight: 8 }}
              />
              <button onClick={() => testAgent(a.id)}>Test agent</button>
            </div>
            {activeAgentId === a.id && testReply && (
              <p style={{ marginTop: 8, fontStyle: "italic" }}>{testReply}</p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
