"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Technician } from "@/types";
import type { ClientSummary, TechStat } from "@/app/dashboard/admin/page";

interface Props {
  technicians: Technician[];
  techStats: Record<string, TechStat>;
  clients: ClientSummary[];
  globalStats: {
    total: number;
    thisMonth: number;
    draft: number;
    sent: number;
    signed: number;
    archived: number;
  };
  totalClients: number;
}

export default function AdminPanel({
  technicians,
  techStats,
  clients,
  globalStats,
  totalClients,
}: Props) {
  const supabase = createClient();
  const [techs, setTechs] = useState(technicians);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [tab, setTab] = useState<"technicians" | "clients">("technicians");

  const [newTech, setNewTech] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    role: "technician" as "technician" | "admin",
  });

  const addTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch("/api/admin/technicians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTech),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gabim i panjohur");

      const { data } = await supabase
        .from("technicians")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) setTechs(data);

      setNewTech({
        full_name: "",
        email: "",
        phone: "",
        password: "",
        role: "technician",
      });
      setShowAddForm(false);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Gabim i panjohur");
    }
    setSaving(false);
  };

  const toggleActive = async (t: Technician) => {
    const { error } = await supabase
      .from("technicians")
      .update({ active: !t.active })
      .eq("id", t.id);
    if (!error)
      setTechs((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, active: !x.active } : x))
      );
  };

  const changeRole = async (t: Technician, role: "admin" | "technician") => {
    const { error } = await supabase
      .from("technicians")
      .update({ role })
      .eq("id", t.id);
    if (!error)
      setTechs((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, role } : x))
      );
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", email: "", phone: "" });
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const startEdit = (t: Technician) => {
    setEditingId(t.id);
    setEditError("");
    setEditForm({ full_name: t.full_name, email: t.email, phone: t.phone || "" });
  };

  const saveEdit = async (t: Technician) => {
    setEditSaving(true);
    setEditError("");
    try {
      const res = await fetch("/api/admin/technicians", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, ...editForm }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gabim i panjohur");

      setTechs((prev) =>
        prev.map((x) =>
          x.id === t.id
            ? { ...x, full_name: editForm.full_name, email: editForm.email, phone: editForm.phone || undefined }
            : x
        )
      );
      setEditingId(null);
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Gabim i panjohur");
    }
    setEditSaving(false);
  };

  const filteredClients = clients.filter((c) =>
    !clientQuery
      ? true
      : c.name.toLowerCase().includes(clientQuery.toLowerCase()) ||
        c.phone?.includes(clientQuery) ||
        c.address?.toLowerCase().includes(clientQuery.toLowerCase())
  );

  return (
    <div className="pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">👑 Paneli i Adminit</h1>
        <Link href="/dashboard" className="text-sm text-gray-500 font-semibold">
          ← Dashboard
        </Link>
      </div>

      {/* ── GLOBAL STATS ── */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        {[
          { label: "Vërtetime", val: globalStats.total, icon: "📋" },
          { label: "Klientë", val: totalClients, icon: "🏢" },
          { label: "Teknikë", val: techs.length, icon: "🧑‍🔧" },
          { label: "Këtë muaj", val: globalStats.thisMonth, icon: "📅" },
          { label: "Dërguar", val: globalStats.sent, icon: "📧" },
          { label: "Nënshkruar", val: globalStats.signed, icon: "✅" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-green-pale border-2 border-[#1a6b2a]/30 rounded-2xl p-3"
          >
            <div className="text-xl mb-0.5">{s.icon}</div>
            <div className="text-2xl font-bold font-mono text-gray-900">
              {s.val}
            </div>
            <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wide">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
        {[
          { key: "technicians" as const, label: "🧑‍🔧 Teknikët" },
          { key: "clients" as const, label: `🏢 Klientët (${totalClients})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 text-center py-2.5 rounded-lg text-sm font-bold transition-all ${
              tab === t.key ? "bg-white shadow text-gray-900" : "text-gray-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TECHNICIANS TAB ── */}
      {tab === "technicians" && (
        <div className="space-y-3">
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="w-full bg-[#04442F] text-white font-bold py-3 rounded-xl text-sm active:scale-95 transition-transform"
          >
            {showAddForm ? "✕ Mbyll" : "+ Shto Teknik të Ri"}
          </button>

          {showAddForm && (
            <form
              onSubmit={addTechnician}
              className="card p-5 space-y-3"
            >
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
                  {formError}
                </div>
              )}
              <div>
                <label className="label">Emri i plotë *</label>
                <input
                  type="text"
                  className="input"
                  value={newTech.full_name}
                  onChange={(e) =>
                    setNewTech((d) => ({ ...d, full_name: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label className="label">Email *</label>
                <input
                  type="email"
                  className="input"
                  value={newTech.email}
                  onChange={(e) =>
                    setNewTech((d) => ({ ...d, email: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label className="label">Telefoni</label>
                <input
                  type="tel"
                  className="input"
                  value={newTech.phone}
                  onChange={(e) =>
                    setNewTech((d) => ({ ...d, phone: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="label">Fjalëkalimi fillestar *</label>
                <input
                  type="text"
                  className="input"
                  value={newTech.password}
                  onChange={(e) =>
                    setNewTech((d) => ({ ...d, password: e.target.value }))
                  }
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className="label">Roli</label>
                <select
                  className="input"
                  value={newTech.role}
                  onChange={(e) =>
                    setNewTech((d) => ({
                      ...d,
                      role: e.target.value as "admin" | "technician",
                    }))
                  }
                >
                  <option value="technician">🔧 Teknik</option>
                  <option value="admin">👑 Admin</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full"
              >
                {saving ? "⟳ Duke krijuar..." : "✅ Krijo Teknikun"}
              </button>
            </form>
          )}

          {techs.map((t) => {
            const s = techStats[t.id];
            const isEditing = editingId === t.id;
            return (
              <div key={t.id} className="card p-4">
                {isEditing ? (
                  <div className="space-y-2 mb-3">
                    {editError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
                        {editError}
                      </div>
                    )}
                    <div>
                      <label className="label">Emri i plotë</label>
                      <input
                        type="text"
                        className="input"
                        value={editForm.full_name}
                        onChange={(e) =>
                          setEditForm((d) => ({ ...d, full_name: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input
                        type="email"
                        className="input"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm((d) => ({ ...d, email: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Telefoni</label>
                      <input
                        type="tel"
                        className="input"
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm((d) => ({ ...d, phone: e.target.value }))
                        }
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setEditingId(null)}
                        className="btn-secondary flex-1 text-sm py-2"
                      >
                        Anulo
                      </button>
                      <button
                        onClick={() => saveEdit(t)}
                        disabled={editSaving}
                        className="btn-primary flex-1 text-sm py-2"
                      >
                        {editSaving ? "⟳ Duke ruajtur..." : "✅ Ruaj"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="font-bold text-gray-900">
                        {t.full_name}{" "}
                        {!t.active && (
                          <span className="text-xs text-red-500 font-semibold">
                            (Joaktiv)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{t.email}</div>
                      {t.phone && (
                        <div className="text-xs text-gray-400">{t.phone}</div>
                      )}
                    </div>
                    <select
                      className="text-xs font-bold border-2 border-gray-200 rounded-lg px-2 py-1"
                      value={t.role}
                      onChange={(e) =>
                        changeRole(t, e.target.value as "admin" | "technician")
                      }
                    >
                      <option value="technician">🔧 Teknik</option>
                      <option value="admin">👑 Admin</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-3 text-xs text-gray-500 font-mono mb-3">
                  <span>📋 {s?.total || 0}</span>
                  <span>📅 {s?.thisMonth || 0} këtë muaj</span>
                  <span>✅ {s?.signed || 0}</span>
                  {s?.lastActivity && (
                    <span>
                      🕓 {s.lastActivity.slice(0, 10)}
                    </span>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard?tab=list&technician=${t.id}`}
                      className="flex-1 text-center bg-blue-50 text-blue-700 border-2 border-blue-200 font-bold py-2 rounded-lg text-xs"
                    >
                      Shiko vërtetimet →
                    </Link>
                    <button
                      onClick={() => startEdit(t)}
                      className="flex-1 font-bold py-2 rounded-lg text-xs border-2 bg-yellow-50 text-yellow-700 border-yellow-300"
                    >
                      ✏️ Edito
                    </button>
                    <button
                      onClick={() => toggleActive(t)}
                      className={`flex-1 font-bold py-2 rounded-lg text-xs border-2 ${
                        t.active
                          ? "bg-red-50 text-red-600 border-red-200"
                          : "bg-green-pale text-[#04442F] border-[#04442F]/20"
                      }`}
                    >
                      {t.active ? "Çaktivizo" : "Aktivizo"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── CLIENTS TAB ── */}
      {tab === "clients" && (
        <div>
          <input
            className="input mb-3"
            placeholder="🔍 Kërko klientin (emër, telefon, adresë)..."
            value={clientQuery}
            onChange={(e) => setClientQuery(e.target.value)}
          />
          <div className="space-y-2.5">
            {filteredClients.length === 0 && (
              <div className="card p-12 text-center text-gray-400">
                Nuk u gjet asnjë klient
              </div>
            )}
            {filteredClients.map((c) => (
              <div key={c.key} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 truncate">
                      {c.name}
                    </div>
                    {c.address && (
                      <div className="text-xs text-gray-400 truncate">
                        {c.address}
                      </div>
                    )}
                    {c.phone && (
                      <a
                        href={`tel:${c.phone}`}
                        className="text-xs text-[#04442F] font-semibold"
                      >
                        📞 {c.phone}
                      </a>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-xs text-gray-400">
                      {c.totalServices} shërbime
                    </div>
                    <div className="font-mono text-xs text-gray-400">
                      {c.lastServiceDate}
                    </div>
                  </div>
                </div>
                {c.technicianNames.length > 0 && (
                  <div className="text-xs text-gray-400 mt-2">
                    🔧 {c.technicianNames.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
