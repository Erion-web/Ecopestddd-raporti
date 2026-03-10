import { sendCertificateEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { certId } = await req.json();
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch cert
    const { data: cert, error } = await supabase
      .from("certificates")
      .select("*")
      .eq("id", certId)
      .single();
    if (error || !cert)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!cert.client_email)
      return NextResponse.json({ error: "No client email" }, { status: 400 });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://ecopestddd-raporti.vercel.app";
    const pdfUrl = `${appUrl}/api/certificates/${certId}/pdf`;

    await sendCertificateEmail(cert, pdfUrl);

    // Update status to 'sent'
    await supabase
      .from("certificates")
      .update({ status: "sent" })
      .eq("id", certId);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("Email error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
