'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { Certificate } from '@/types'
import { generateCertificatePDF } from '@/lib/pdf'

const STATUS_COLORS: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-500',
  sent:     'bg-blue-100 text-blue-600',
  signed:   'bg-green-pale text-[#04442F]',
  archived: 'bg-gray-200 text-gray-500',
}
const STATUS_LABELS: Record<string, string> = {
  draft: '📝 Draft', sent: '📧 Dërguar', signed: '✅ Nënshkruar', archived: '📦 Arkivuar',
}

export default function CertificateDetail({ cert, isOwner }: { cert: Certificate; isOwner: boolean }) {
  const [sending, setSending] = useState(false)
  const [copying, setCopying] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState('')

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const downloadPDF = async () => {
    const blob = await generateCertificatePDF(cert)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Vertetim_DDD_${cert.client_name}_${cert.service_date}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const sendEmail = async () => {
    if (!cert.client_email) return
    setSending(true)
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certId: cert.id }),
      })
      if (!res.ok) throw new Error('Gabim')
      showMsg('✅ Email u dërgua!')
    } catch {
      showMsg('❌ Gabim gjatë dërgimit')
    }
    setSending(false)
  }

  const copyLink = async () => {
    const link = `${window.location.origin}/sign/${cert.id}`
    await navigator.clipboard.writeText(link)
    setCopying(true)
    showMsg('✅ Link-u u kopjua!')
    setTimeout(() => setCopying(false), 2000)
  }

  const deleteCert = async () => {
    if (!confirm('A je i sigurt? Ky vërtetim do të fshihet përgjithmonë!')) return
    setDeleting(true)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { error } = await supabase.from('certificates').delete().eq('id', cert.id)
    if (error) { showMsg('❌ Gabim gjatë fshirjes'); setDeleting(false); return }
    window.location.href = '/dashboard'
  }

  return (
    <div className="max-w-xl mx-auto pb-8">

      {/* ── TOP NAV ── */}
      <div className="flex items-center justify-between mb-4">
        <Link href="/dashboard"
          className="flex items-center gap-1.5 text-gray-500 font-semibold text-sm active:scale-95 transition-transform">
          ← Dashboard
        </Link>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[cert.status]}`}>
          {STATUS_LABELS[cert.status]}
        </span>
      </div>

      {/* ── HERO CARD ── */}
      <div className="bg-[#04442F] rounded-2xl p-5 mb-4 text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-mono text-white/60 text-xs mb-1">#{cert.serial_no}</div>
            <h1 className="text-xl font-bold leading-tight">{cert.client_name}</h1>
            {cert.client_branch && (
              <div className="text-white/70 text-sm mt-0.5">{cert.client_branch}</div>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-mono text-white/70 text-xs">{cert.service_date}</div>
            {cert.service_time && (
              <div className="font-mono text-white/50 text-xs">{cert.service_time}</div>
            )}
          </div>
        </div>

        {/* Service chips */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {cert.service_types?.map(s => (
            <span key={s} className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
              {s}
            </span>
          ))}
          {cert.pest_types?.map(p => (
            <span key={p} className="bg-yellow-400/30 text-yellow-200 text-xs font-semibold px-3 py-1 rounded-full">
              {p}
            </span>
          ))}
        </div>

        {/* Technician */}
        <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-2">
          <span className="text-white/50 text-xs">🔧 Teknik:</span>
          <span className="text-white/90 text-xs font-semibold">{cert.technician_name}</span>
        </div>
      </div>

      {/* ── TOAST MSG ── */}
      {msg && (
        <div className={`rounded-xl px-4 py-3 mb-4 text-sm font-semibold text-center transition-all ${
          msg.startsWith('✅') ? 'bg-green-pale text-[#04442F]' : 'bg-red-50 text-red-600'
        }`}>{msg}</div>
      )}

      {/* ── ACTION BUTTONS ── */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <button onClick={downloadPDF}
          className="flex items-center justify-center gap-2 bg-[#04442F] text-white font-bold py-3.5 rounded-xl text-sm active:scale-95 transition-transform shadow-sm">
          📄 Shkarko PDF
        </button>
        {cert.client_email ? (
          <button onClick={sendEmail} disabled={sending}
            className="flex items-center justify-center gap-2 bg-yellow-400 text-gray-900 font-bold py-3.5 rounded-xl text-sm active:scale-95 transition-transform shadow-sm disabled:opacity-60">
            {sending ? '⟳ Duke dërguar...' : '📧 Dërgo Email'}
          </button>
        ) : (
          <div className="flex items-center justify-center bg-gray-100 text-gray-400 font-semibold py-3.5 rounded-xl text-xs text-center px-2">
            📧 Nuk ka email
          </div>
        )}
        <button onClick={copyLink}
          className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 border-2 border-blue-200 font-bold py-3.5 rounded-xl text-sm active:scale-95 transition-transform col-span-1">
          {copying ? '✅ U kopjua!' : '🔗 Kopjo Link'}
        </button>
        {isOwner && (
          <button onClick={deleteCert} disabled={deleting}
            className="flex items-center justify-center gap-2 bg-red-50 text-red-600 border-2 border-red-200 font-bold py-3.5 rounded-xl text-sm active:scale-95 transition-transform disabled:opacity-60">
            {deleting ? '⟳...' : '🗑️ Fshi'}
          </button>
        )}
      </div>

      {/* ── INFO SECTIONS ── */}

      {/* Klienti */}
      <Section title="📋 Klienti" color="green">
        <InfoRow label="Kompania" value={cert.client_name} />
        <InfoRow label="Dega" value={cert.client_branch} />
        <InfoRow label="Adresa" value={cert.client_address} />
        <InfoRow label="Telefoni" value={cert.client_phone} phone />
        <InfoRow label="Email" value={cert.client_email} />
      </Section>

      {/* Preparati */}
      {cert.products?.length > 0 && (
        <Section title="💊 Preparati" color="green">
          {cert.products.map((p, i) => (
            <div key={i} className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
              <span className="font-semibold text-gray-800 text-sm">{p.emri}</span>
              {p.doza && <span className="text-gray-500 text-sm font-mono">{p.doza}</span>}
            </div>
          ))}
        </Section>
      )}

      {/* Zonat */}
      <Section title="🗺️ Zonat e Trajtuara" color="green">
        {[
          { label: '🟢 Perimetri', items: cert.zones_green },
          { label: '🟡 Hyrja',     items: cert.zones_yellow },
          { label: '🔴 Brendia',   items: cert.zones_red },
        ].map(z => z.items?.length ? (
          <div key={z.label} className="py-2.5 border-b border-gray-50 last:border-0">
            <div className="text-xs font-bold text-gray-500 mb-1.5">{z.label}</div>
            <div className="flex flex-wrap gap-1">
              {z.items.map(item => (
                <span key={item} className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-lg font-medium">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null)}
      </Section>

      {/* Raporti Sanitar */}
      <Section title="🏥 Raporti Sanitar" color="red">
        {Object.entries(cert.sanitary_report || {}).map(([k, v]) => (
          <div key={k} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-700 flex-1 pr-3">{k}</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${
              v === 'po'  ? 'bg-green-pale text-[#04442F]' :
              v === 'jo'  ? 'bg-red-50 text-red-600' :
                            'bg-gray-100 text-gray-400'
            }`}>
              {v ? v.toUpperCase() : '—'}
            </span>
          </div>
        ))}
      </Section>

      {/* Shënim */}
      {cert.notes && (
        <Section title="📝 Shënim" color="green">
          <p className="text-sm text-gray-700 leading-relaxed py-1">{cert.notes}</p>
        </Section>
      )}

      {/* Nënshkrimi */}
      {cert.client_signature && (
        <Section title="✍️ Nënshkrimi i Klientit" color="green">
          <div className="bg-gray-50 rounded-xl p-3 mt-1">
            <img src={cert.client_signature} alt="Nënshkrimi" className="max-h-24 mx-auto" />
          </div>
          {cert.signed_at && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              Nënshkruar: {cert.signed_at.slice(0, 16).replace('T', ' ora ')}
            </p>
          )}
        </Section>
      )}

      {/* Next service */}
      {cert.next_service_date && (
        <div className="mt-4 bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">🔔</span>
          <div>
            <div className="font-bold text-gray-800 text-sm">Shërbimi i ardhshëm</div>
            <div className="font-mono text-yellow-700 font-bold">{cert.next_service_date}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, color, children }: {
  title: string; color: 'green' | 'red'; children: React.ReactNode
}) {
  return (
    <div className="card overflow-hidden mb-3">
      <div className={`px-4 py-3 text-white text-xs font-bold uppercase tracking-wider ${
        color === 'red' ? 'bg-red-500' : 'bg-[#04442F]'
      }`}>{title}</div>
      <div className="px-4 py-1">{children}</div>
    </div>
  )
}

function InfoRow({ label, value, phone }: { label: string; value?: string | null; phone?: boolean }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 gap-3">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wide flex-shrink-0">{label}</span>
      {phone ? (
        <a href={`tel:${value}`} className="text-sm font-semibold text-[#04442F] underline-offset-2">
          📞 {value}
        </a>
      ) : (
        <span className="text-sm font-semibold text-gray-800 text-right">{value}</span>
      )}
    </div>
  )
}
