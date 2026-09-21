import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface Lead {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  status: string;
}

const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "BOOKED", "CONVERTED", "LOST"];

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });

  async function load() {
    setLeads(await apiFetch("/api/v1/leads"));
  }

  useEffect(() => {
    load().catch(() => (window.location.href = "/login"));
  }, []);

  async function createLead(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch("/api/v1/leads", { method: "POST", body: JSON.stringify(form) });
    setForm({ name: "", phone: "", email: "" });
    load();
  }

  async function updateStatus(id: string, status: string) {
    await apiFetch(`/api/v1/leads/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  }

  return (
    <main style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>Leads</h1>

      <form onSubmit={createLead} style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <button type="submit">Add lead</button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Name</th>
            <th style={{ textAlign: "left" }}>Contact</th>
            <th style={{ textAlign: "left" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td>{lead.name ?? "—"}</td>
              <td>{lead.phone ?? lead.email ?? "—"}</td>
              <td>
                <select value={lead.status} onChange={(e) => updateStatus(lead.id, e.target.value)}>
                  {STAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
