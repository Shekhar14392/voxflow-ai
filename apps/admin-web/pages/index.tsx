import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface DashboardData {
  totals: { organizations: number; agents: number; calls: number; leads: number; activeSubscriptions: number };
  recentOrganizations: { id: string; name: string; status: string; createdAt: string }[];
}

interface Org {
  id: string;
  name: string;
  status: string;
  plan?: { name: string } | null;
  _count: { agents: number; calls: number; leads: number; members: number };
}

export default function AdminDashboard() {
  const [adminKey, setAdminKey] = useState("");
  const [keySaved, setKeySaved] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("adminKey");
    if (stored) {
      setAdminKey(stored);
      setKeySaved(true);
    }
  }, []);

  async function adminFetch(path: string) {
    const res = await fetch(`${API_URL}${path}`, { headers: { "x-admin-key": adminKey } });
    if (!res.ok) throw new Error((await res.json()).error ?? "Request failed");
    return res.json();
  }

  async function load() {
    setError(null);
    try {
      setData(await adminFetch("/api/v1/admin/dashboard"));
      setOrgs(await adminFetch("/api/v1/admin/organizations"));
    } catch (e: any) {
      setError(e.message);
    }
  }

  function saveKey(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem("adminKey", adminKey);
    setKeySaved(true);
  }

  useEffect(() => {
    if (keySaved) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keySaved]);

  async function toggleSuspend(org: Org) {
    const newStatus = org.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    await fetch(`${API_URL}/api/v1/admin/organizations/${org.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  }

  if (!keySaved) {
    return (
      <main style={{ maxWidth: 400, margin: "80px auto", fontFamily: "sans-serif" }}>
        <h1>VoxFlow Admin</h1>
        <form onSubmit={saveKey} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="password"
            placeholder="Admin key (ADMIN_API_KEY)"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
          />
          <button type="submit">Enter</button>
        </form>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 800, margin: "24px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <h1>Super Admin Dashboard</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, margin: "16px 0" }}>
          {Object.entries(data.totals).map(([key, value]) => (
            <div key={key} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: "bold" }}>{value}</div>
              <div style={{ fontSize: 12, color: "#666" }}>{key}</div>
            </div>
          ))}
        </div>
      )}

      <h2>Organizations</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Name</th>
            <th style={{ textAlign: "left" }}>Plan</th>
            <th style={{ textAlign: "left" }}>Agents</th>
            <th style={{ textAlign: "left" }}>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((org) => (
            <tr key={org.id}>
              <td>{org.name}</td>
              <td>{org.plan?.name ?? "—"}</td>
              <td>{org._count.agents}</td>
              <td>{org.status}</td>
              <td>
                <button onClick={() => toggleSuspend(org)}>
                  {org.status === "ACTIVE" ? "Suspend" : "Activate"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
