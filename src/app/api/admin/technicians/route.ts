import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Jo i kyçur" }, { status: 401 });

  const { data: caller } = await supabase
    .from("technicians")
    .select("role")
    .eq("id", user.id)
    .single();
  if (caller?.role !== "admin")
    return NextResponse.json({ error: "Nuk keni leje" }, { status: 403 });

  const { full_name, email, phone, password, role } = await req.json();
  if (!full_name || !email || !password) {
    return NextResponse.json(
      { error: "Emri, email dhe fjalëkalimi janë të detyrueshëm" },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Fjalëkalimi duhet të ketë të paktën 6 karaktere" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (createErr || !created.user) {
    return NextResponse.json(
      { error: createErr?.message || "Gabim gjatë krijimit të llogarisë" },
      { status: 400 }
    );
  }

  const { error: insertErr } = await admin.from("technicians").insert({
    id: created.user.id,
    full_name,
    email,
    phone: phone || null,
    role: role === "admin" ? "admin" : "technician",
    active: true,
  });

  if (insertErr) {
    // Roll back the auth user so we don't leave an orphaned account
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: insertErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Jo i kyçur" }, { status: 401 });

  const { data: caller } = await supabase
    .from("technicians")
    .select("role")
    .eq("id", user.id)
    .single();
  if (caller?.role !== "admin")
    return NextResponse.json({ error: "Nuk keni leje" }, { status: 403 });

  const { id, full_name, email, phone } = await req.json();
  if (!id || !full_name || !email) {
    return NextResponse.json(
      { error: "Emri dhe email janë të detyrueshëm" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: current, error: currentErr } = await admin
    .from("technicians")
    .select("email")
    .eq("id", id)
    .single();
  if (currentErr || !current)
    return NextResponse.json({ error: "Teknik nuk u gjet" }, { status: 404 });

  // Keep the Auth login email in sync if it changed
  if (current.email !== email) {
    const { error: authErr } = await admin.auth.admin.updateUserById(id, {
      email,
    });
    if (authErr)
      return NextResponse.json({ error: authErr.message }, { status: 400 });
  }

  const { error: updateErr } = await admin
    .from("technicians")
    .update({ full_name, email, phone: phone || null })
    .eq("id", id);
  if (updateErr)
    return NextResponse.json({ error: updateErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
