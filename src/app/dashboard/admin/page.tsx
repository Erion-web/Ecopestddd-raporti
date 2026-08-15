import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminPanel from "@/components/ui/AdminPanel";
import type { Technician } from "@/types";

export interface ClientSummary {
  key: string;
  name: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  totalServices: number;
  lastServiceDate: string;
  nextServiceDate: string | null;
  lastStatus: string;
  technicianNames: string[];
}

export interface TechStat {
  total: number;
  thisMonth: number;
  draft: number;
  sent: number;
  signed: number;
  archived: number;
  lastActivity: string | null;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = (await supabase
    .from("technicians")
    .select("*")
    .eq("id", user.id)
    .single()) as { data: Technician | null };

  if (me?.role !== "admin") redirect("/dashboard");

  const { data: technicians } = (await supabase
    .from("technicians")
    .select("*")
    .order("created_at", { ascending: true })) as { data: Technician[] | null };

  const { data: certs } = await supabase
    .from("certificates")
    .select(
      "id, technician_id, technician_name, client_name, client_phone, client_address, client_email, status, service_date, next_service_date, created_at"
    )
    .order("service_date", { ascending: false });

  const now = new Date();
  const techStats: Record<string, TechStat> = {};
  const clientsMap = new Map<string, ClientSummary>();

  const globalStats = {
    total: certs?.length || 0,
    thisMonth: 0,
    draft: 0,
    sent: 0,
    signed: 0,
    archived: 0,
  };

  for (const c of certs || []) {
    const created = new Date(c.created_at);
    const isThisMonth =
      created.getMonth() === now.getMonth() &&
      created.getFullYear() === now.getFullYear();

    if (isThisMonth) globalStats.thisMonth++;
    if (c.status in globalStats)
      (globalStats as unknown as Record<string, number>)[c.status]++;

    // Per-technician stats
    if (c.technician_id) {
      const t = (techStats[c.technician_id] ||= {
        total: 0,
        thisMonth: 0,
        draft: 0,
        sent: 0,
        signed: 0,
        archived: 0,
        lastActivity: null,
      });
      t.total++;
      if (isThisMonth) t.thisMonth++;
      if (c.status in t) (t as unknown as Record<string, number>)[c.status]++;
      if (!t.lastActivity || c.created_at > t.lastActivity)
        t.lastActivity = c.created_at;
    }

    // Client aggregation
    const key = `${c.client_name}|${c.client_phone || ""}`;
    const existing = clientsMap.get(key);
    if (!existing) {
      clientsMap.set(key, {
        key,
        name: c.client_name,
        phone: c.client_phone,
        address: c.client_address,
        email: c.client_email,
        totalServices: 1,
        lastServiceDate: c.service_date,
        nextServiceDate: c.next_service_date,
        lastStatus: c.status,
        technicianNames: c.technician_name ? [c.technician_name] : [],
      });
    } else {
      existing.totalServices++;
      if (c.service_date > existing.lastServiceDate) {
        existing.lastServiceDate = c.service_date;
        existing.lastStatus = c.status;
        existing.nextServiceDate = c.next_service_date;
      }
      if (
        c.technician_name &&
        !existing.technicianNames.includes(c.technician_name)
      ) {
        existing.technicianNames.push(c.technician_name);
      }
      if (!existing.address && c.client_address)
        existing.address = c.client_address;
      if (!existing.email && c.client_email) existing.email = c.client_email;
      if (!existing.phone && c.client_phone) existing.phone = c.client_phone;
    }
  }

  const clients = Array.from(clientsMap.values()).sort(
    (a, b) => (a.lastServiceDate < b.lastServiceDate ? 1 : -1)
  );

  return (
    <AdminPanel
      technicians={technicians || []}
      techStats={techStats}
      clients={clients}
      globalStats={globalStats}
      totalClients={clients.length}
    />
  );
}
