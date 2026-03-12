"use client";
import { createClient } from "@/lib/supabase/client";
import type { Product, Technician } from "@/types";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const SANITARY_ITEMS = [
  "Kontejnerët e mbeturinave me kapak",
  "Pjesa ngarkuese e pastër",
  "Pajisjet e pastra",
  "Dyshemetë e pastra",
  "Pusetat e dyshemesë me rrjetë",
  "Distanca nga muri ruhet",
  "Ushqimi në kontejner të mbyllur",
  "Çarje / vrima në mure",
  "Banjo / tualetet e pastra",
  "Zyrat e pastra",
];

const ZONES = {
  green: [
    "Vendi i mbeturinave",
    "Shkurret e dendura",
    "Zonat e pajisjeve",
    "Mbajtëset e dritave",
    "Bazat e drunjëve",
    "Uji i ndenjur",
    "Vazot",
  ],
  yellow: [
    "Dyert dhe dritaret",
    "Rrjetat e marimangave",
    "Vendet e ventilimit",
    "Vendet e pushimit",
    "Kornizat e dritareve",
    "Plasaritjet dhe çarjet",
    "Strehët & baza e ndërtesës",
    "Ulluqat / mbledhësit e ujërave",
  ],
  red: [
    "Kuzhina",
    "Magazinë",
    "Tavanet e lëshuar",
    "Vendi i gatimit",
    "Banjo",
    "Depot",
    "Zonat me lagështi",
    "Vendet e pushimit",
    "Zyrat",
    "Çarjet dhe plasaritjet",
    "Kornizat e dyerve",
  ],
};

// Commonly used products — pill shortcuts
const COMMON_PRODUCTS = [
  "Solfac EW 50",
  "K-Othrine SC 25",
  "Cislin 10 EC",
  "Actellic 50 EC",
  "Ratimor Pasta",
  "Klerat Pellets",
  "Incidin Plus",
  "Menno Florades",
];

interface Props {
  technician: Technician | null;
}

export default function CertificateForm({ technician }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  const now = new Date();
  const autoDate = now.toISOString().split("T")[0];
  const autoTime = now.toTimeString().slice(0, 5);

  const [data, setData] = useState({
    service_date: autoDate,
    service_time: autoTime,
    client_name: "",
    client_branch: "",
    client_address: "",
    client_phone: "",
    client_email: "",
    service_types: [] as string[],
    pest_types: [] as string[],
    pest_other: "",
    products: [] as Product[],
    zones_green: [] as string[],
    zones_yellow: [] as string[],
    zones_red: [] as string[],
    sanitary_report: Object.fromEntries(
      SANITARY_ITEMS.map((i) => [i, null])
    ) as Record<string, "po" | "jo" | null>,
    notes: "",
    photoFiles: [] as File[],
    photoPreviewUrls: [] as string[],
  });

  const toggle = (arr: string[], val: string): string[] =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  // Toggle a common product in the products list
  const toggleCommonProduct = (name: string) => {
    setData((d) => {
      const exists = d.products.some((p) => p.emri === name);
      if (exists) {
        return { ...d, products: d.products.filter((p) => p.emri !== name) };
      }
      return { ...d, products: [...d.products, { emri: name, doza: "" }] };
    });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const previews = files.map((f) => URL.createObjectURL(f));
    setData((d) => ({
      ...d,
      photoFiles: [...d.photoFiles, ...files],
      photoPreviewUrls: [...d.photoPreviewUrls, ...previews],
    }));
    // Reset input so same file can be re-selected
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const removePhoto = (idx: number) => {
    setData((d) => {
      URL.revokeObjectURL(d.photoPreviewUrls[idx]);
      return {
        ...d,
        photoFiles: d.photoFiles.filter((_, i) => i !== idx),
        photoPreviewUrls: d.photoPreviewUrls.filter((_, i) => i !== idx),
      };
    });
  };

  const steps = ["Klienti", "Shërbimi", "Zonat", "Sanitaria", "Foto & Konfirmo"];

  const save = async (status: "draft" | "sent" = "draft") => {
    setSaving(true);
    setError("");
    try {
      const pest_types = [
        ...data.pest_types,
        ...(data.pest_other ? [data.pest_other] : []),
      ];
      const products = data.products.filter((p) => p.emri.trim());

      let techId = technician?.id;
      let techName = technician?.full_name;
      if (!techId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Jo i kyçur");
        const { data: t } = await supabase
          .from("technicians")
          .select("*")
          .eq("id", user.id)
          .single();
        if (t) {
          techId = t.id;
          techName = t.full_name;
        } else {
          techId = user.id;
          techName = user.email || "Teknik";
        }
      }

      const { data: cert, error: err } = await supabase
        .from("certificates")
        .insert({
          technician_id: techId,
          technician_name: techName,
          service_date: data.service_date,
          service_time: data.service_time || null,
          client_name: data.client_name,
          client_branch: data.client_branch || null,
          client_address: data.client_address || null,
          client_phone: data.client_phone || null,
          client_email: data.client_email || null,
          service_types: data.service_types,
          pest_types,
          products,
          zones_green: data.zones_green,
          zones_yellow: data.zones_yellow,
          zones_red: data.zones_red,
          sanitary_report: data.sanitary_report,
          notes: data.notes || null,
          status,
          photos: [],
        })
        .select()
        .single();

      if (err) throw err;

      // Upload photos to Supabase Storage
      if (data.photoFiles.length > 0) {
        const uploadedUrls: string[] = [];
        for (const file of data.photoFiles) {
          const ext = file.name.split(".").pop() || "jpg";
          const path = `photos/${cert.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from("certificates")
            .upload(path, file, { contentType: file.type });
          if (!uploadErr) {
            const { data: pub } = supabase.storage
              .from("certificates")
              .getPublicUrl(path);
            uploadedUrls.push(pub.publicUrl);
          }
        }
        if (uploadedUrls.length > 0) {
          await supabase
            .from("certificates")
            .update({ photos: uploadedUrls })
            .eq("id", cert.id);
        }
      }

      // If sent, trigger email via API
      if (status === "sent" && data.client_email) {
        await fetch("/api/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ certId: cert.id }),
        });
      }

      router.push(`/certificate/${cert.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gabim i panjohur");
      setSaving(false);
    }
  };

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold">Vërtetim i Ri</h1>
          <span className="font-mono text-sm text-gray-500">
            {step + 1} / {steps.length}
          </span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1a6b2a] rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex gap-1 mt-2">
          {steps.map((s, i) => (
            <span
              key={s}
              className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-1 text-center ${
                i === step
                  ? "bg-[#1a6b2a] text-white"
                  : i < step
                    ? "text-[#1a6b2a]"
                    : "text-gray-400"
              }`}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* STEP 0 – KLIENTI */}
      {step === 0 && (
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-lg mb-2">📋 Të dhënat e klientit</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Data *</label>
              <input
                type="date"
                className="input"
                value={data.service_date}
                onChange={(e) =>
                  setData((d) => ({ ...d, service_date: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="label">Ora e fillimit</label>
              <input
                type="time"
                className="input"
                value={data.service_time}
                onChange={(e) =>
                  setData((d) => ({ ...d, service_time: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Kompania / Emri *</label>
              <input
                type="text"
                className="input"
                placeholder="Restaurant XYZ"
                value={data.client_name}
                onChange={(e) =>
                  setData((d) => ({ ...d, client_name: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="label">Dega</label>
              <input
                type="text"
                className="input"
                placeholder="opsionale"
                value={data.client_branch}
                onChange={(e) =>
                  setData((d) => ({ ...d, client_branch: e.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <label className="label">Adresa</label>
            <input
              type="text"
              className="input"
              placeholder="Rr. ..."
              value={data.client_address}
              onChange={(e) =>
                setData((d) => ({ ...d, client_address: e.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Telefoni</label>
              <input
                type="tel"
                className="input"
                placeholder="+383 ..."
                value={data.client_phone}
                onChange={(e) =>
                  setData((d) => ({ ...d, client_phone: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="label">Email (për dërgim)</label>
              <input
                type="email"
                className="input"
                placeholder="klienti@email.com"
                value={data.client_email}
                onChange={(e) =>
                  setData((d) => ({ ...d, client_email: e.target.value }))
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 1 – SHËRBIMI */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-bold text-lg mb-4">🔬 Lloji i shërbimit</h2>
            <div className="flex flex-wrap gap-2">
              {["Dezinfektim", "Dezinsektim", "Deratizim"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setData((d) => ({
                      ...d,
                      service_types: toggle(d.service_types, s),
                    }))
                  }
                  className={`px-4 py-2 rounded-full border-2 font-semibold text-sm transition-all ${
                    data.service_types.includes(s)
                      ? "bg-[#1a6b2a] border-[#1a6b2a] text-white"
                      : "border-gray-200 text-gray-600 hover:border-[#1a6b2a]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-bold text-lg mb-4">🐛 Shërbimi për</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                "Milingonat",
                "Marimangat",
                "Brejtësit",
                "Buburrecat",
                "Mushkonjat",
              ].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    setData((d) => ({
                      ...d,
                      pest_types: toggle(d.pest_types, p),
                    }))
                  }
                  className={`px-4 py-2 rounded-full border-2 font-semibold text-sm transition-all ${
                    data.pest_types.includes(p)
                      ? "bg-yellow-400 border-yellow-400 text-gray-900"
                      : "border-gray-200 text-gray-600 hover:border-yellow-400"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div>
              <label className="label">Tjera</label>
              <input
                type="text"
                className="input"
                placeholder="lloje të tjera..."
                value={data.pest_other}
                onChange={(e) =>
                  setData((d) => ({ ...d, pest_other: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-bold text-lg mb-3">💊 Preparati</h2>

            {/* Quick-pick pill buttons */}
            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">
              Shpejtë — kliko për të shtuar
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {COMMON_PRODUCTS.map((name) => {
                const selected = data.products.some((p) => p.emri === name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleCommonProduct(name)}
                    className={`px-3 py-1.5 rounded-full border-2 font-semibold text-sm transition-all ${
                      selected
                        ? "bg-[#1a6b2a] border-[#1a6b2a] text-white"
                        : "border-gray-200 text-gray-600 hover:border-[#1a6b2a]"
                    }`}
                  >
                    {selected ? "✓ " : ""}{name}
                  </button>
                );
              })}
            </div>

            {/* Manual product rows */}
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">
                Të gjitha preparatet e zgjedhura / manual
              </p>
              <div className="grid grid-cols-[1fr_1fr_32px] gap-2 mb-2">
                <span className="label">Emri i preparatit</span>
                <span className="label">Doza / Shënim</span>
                <span></span>
              </div>
              {data.products.map((p, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_32px] gap-2 mb-2">
                  <input
                    type="text"
                    className="input"
                    placeholder="p.sh. Solfac EW 50"
                    value={p.emri}
                    onChange={(e) =>
                      setData((d) => {
                        const prods = [...d.products];
                        prods[i] = { ...prods[i], emri: e.target.value };
                        return { ...d, products: prods };
                      })
                    }
                  />
                  <input
                    type="text"
                    className="input"
                    placeholder="50ml/L"
                    value={p.doza}
                    onChange={(e) =>
                      setData((d) => {
                        const prods = [...d.products];
                        prods[i] = { ...prods[i], doza: e.target.value };
                        return { ...d, products: prods };
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setData((d) => ({
                        ...d,
                        products: d.products.filter((_, j) => j !== i),
                      }))
                    }
                    className="text-gray-400 hover:text-red-500 text-xl font-bold leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setData((d) => ({
                    ...d,
                    products: [...d.products, { emri: "", doza: "" }],
                  }))
                }
                className="text-sm font-semibold text-[#1a6b2a] border-2 border-dashed border-[#1a6b2a]/30 rounded-lg px-4 py-2 hover:bg-green-pale transition-colors mt-1"
              >
                + Shto preparat manual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2 – ZONAT */}
      {step === 2 && (
        <div className="card p-6">
          <h2 className="font-bold text-lg mb-4">🗺️ Mbrojtja në tre zona</h2>
          <div className="space-y-4">
            {[
              {
                key: "zones_green" as const,
                label: "🟢 Zona e Gjelbërt – Perimetri",
                color: "bg-[#1a6b2a]",
                items: ZONES.green,
              },
              {
                key: "zones_yellow" as const,
                label: "🟡 Zona e Verdhë – Hyrja",
                color: "bg-yellow-500",
                items: ZONES.yellow,
              },
              {
                key: "zones_red" as const,
                label: "🔴 Zona e Kuqe – Brendia",
                color: "bg-red-600",
                items: ZONES.red,
              },
            ].map((zone) => (
              <div
                key={zone.key}
                className="border border-gray-100 rounded-xl overflow-hidden"
              >
                <div
                  className={`${zone.color} text-white text-sm font-bold px-4 py-2`}
                >
                  {zone.label}
                </div>
                <div className="grid grid-cols-2 gap-1 p-3">
                  {zone.items.map((item) => (
                    <label
                      key={item}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-50 text-sm ${
                        data[zone.key].includes(item) ? "bg-green-pale" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="accent-[#1a6b2a] w-4 h-4"
                        checked={data[zone.key].includes(item)}
                        onChange={() =>
                          setData((d) => ({
                            ...d,
                            [zone.key]: toggle(d[zone.key], item),
                          }))
                        }
                      />
                      <span className="font-medium">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3 – SANITARIA */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="bg-red-600 text-white text-sm font-bold px-4 py-2">
              🏥 Raporti Sanitar
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2 text-xs font-bold text-gray-500 uppercase">
                    Artikulli
                  </th>
                  <th className="text-center px-4 py-2 text-xs font-bold text-gray-500 uppercase w-16">
                    Po
                  </th>
                  <th className="text-center px-4 py-2 text-xs font-bold text-gray-500 uppercase w-16">
                    Jo
                  </th>
                </tr>
              </thead>
              <tbody>
                {SANITARY_ITEMS.map((item, i) => (
                  <tr
                    key={item}
                    className={`border-b border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                  >
                    <td className="px-4 py-2.5 text-sm font-medium">{item}</td>
                    <td className="text-center px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setData((d) => ({
                            ...d,
                            sanitary_report: {
                              ...d.sanitary_report,
                              [item]: "po",
                            },
                          }))
                        }
                        className={`w-7 h-7 rounded-full border-2 transition-all mx-auto flex items-center justify-center ${
                          data.sanitary_report[item] === "po"
                            ? "bg-[#1a6b2a] border-[#1a6b2a] text-white text-xs font-bold"
                            : "border-gray-300 hover:border-[#1a6b2a]"
                        }`}
                      >
                        {data.sanitary_report[item] === "po" ? "✓" : ""}
                      </button>
                    </td>
                    <td className="text-center px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setData((d) => ({
                            ...d,
                            sanitary_report: {
                              ...d.sanitary_report,
                              [item]: "jo",
                            },
                          }))
                        }
                        className={`w-7 h-7 rounded-full border-2 transition-all mx-auto flex items-center justify-center ${
                          data.sanitary_report[item] === "jo"
                            ? "bg-red-600 border-red-600 text-white text-xs font-bold"
                            : "border-gray-300 hover:border-red-400"
                        }`}
                      >
                        {data.sanitary_report[item] === "jo" ? "✓" : ""}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card p-6">
            <label className="label">📝 Shënim</label>
            <textarea
              className="input min-h-[100px]"
              placeholder="Vërejtje, rekomandime..."
              value={data.notes}
              onChange={(e) =>
                setData((d) => ({ ...d, notes: e.target.value }))
              }
            />
          </div>
        </div>
      )}

      {/* STEP 4 – FOTO & KONFIRMO */}
      {step === 4 && (
        <div className="space-y-4">
          {/* Photo upload */}
          <div className="card p-6">
            <h2 className="font-bold text-lg mb-3">📸 Foto (opsionale)</h2>
            <p className="text-xs text-gray-400 mb-3">
              Bashkëngjit foto nga vendi i punës
            </p>

            {data.photoPreviewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {data.photoPreviewUrls.map((url, idx) => (
                  <div key={idx} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoSelect}
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="w-full border-2 border-dashed border-[#1a6b2a]/30 rounded-xl py-4 text-sm font-semibold text-[#1a6b2a] hover:bg-green-pale transition-colors flex items-center justify-center gap-2"
            >
              📷 Zgjedh foto
            </button>
          </div>

          {/* Review & confirm */}
          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-lg">✅ Konfirmo vërtetimin</h2>
            <ReviewRow label="Klienti" value={data.client_name} />
            <ReviewRow label="Adresa" value={data.client_address} />
            <ReviewRow label="Email" value={data.client_email} />
            <ReviewRow
              label="Data"
              value={`${data.service_date}${data.service_time ? " ora " + data.service_time : ""}`}
            />
            <ReviewRow label="Shërbimi" value={data.service_types.join(", ")} />
            <ReviewRow
              label="Dëmtuesit"
              value={[...data.pest_types, data.pest_other]
                .filter(Boolean)
                .join(", ")}
            />
            <ReviewRow
              label="Preparati"
              value={data.products
                .filter((p) => p.emri)
                .map((p) => `${p.emri}${p.doza ? " (" + p.doza + ")" : ""}`)
                .join(", ")}
            />
            <ReviewRow
              label="Zona e gjelbërt"
              value={data.zones_green.join(", ")}
            />
            <ReviewRow
              label="Zona e verdhë"
              value={data.zones_yellow.join(", ")}
            />
            <ReviewRow label="Zona e kuqe" value={data.zones_red.join(", ")} />
            {data.photoFiles.length > 0 && (
              <ReviewRow
                label="Foto"
                value={`${data.photoFiles.length} foto të bashkëngjitura`}
              />
            )}

            <div className="border-t pt-4 mt-2 space-y-3">
              <button
                onClick={() => save("draft")}
                disabled={saving}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                {saving ? "⟳ Duke ruajtur..." : "💾 Ruaj si Draft"}
              </button>
              {data.client_email && (
                <button
                  onClick={() => save("sent")}
                  disabled={saving}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {saving
                    ? "⟳ Duke dërguar..."
                    : "📧 Ruaj & Dërgo Email te Klienti"}
                </button>
              )}
              {!data.client_email && (
                <p className="text-xs text-gray-400 text-center">
                  Shto email-in e klientit për ta dërguar direkt
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Nav buttons */}
      <div className="flex justify-between mt-6">
        {step > 0 ? (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="btn-secondary"
          >
            ← Kthehu
          </button>
        ) : (
          <div />
        )}
        {step < steps.length - 1 && (
          <button
            onClick={() => {
              if (step === 0 && !data.client_name) {
                setError("Emri i klientit është i detyrueshëm");
                return;
              }
              setError("");
              setStep((s) => s + 1);
            }}
            className="btn-primary"
          >
            Vazhdo →
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between border-b border-gray-50 pb-2">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide w-32 flex-shrink-0">
        {label}
      </span>
      <span className="text-sm font-medium text-gray-800 text-right">
        {value || "—"}
      </span>
    </div>
  );
}
