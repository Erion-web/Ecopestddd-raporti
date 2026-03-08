import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Certificate, Technician } from '@/types'

const statusColors: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-100 text-blue-700',
  signed:   'bg-green-pale text-[#1a6b2a]',
  archived: 'bg-gray-200 text-gray-500',
}
const statusLabels: Record<string, string> = {
  draft: 'Draft', sent: 'Dërguar', signed: 'Nënshkruar', archived: 'Arkivuar',
}

function daysUntil(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: tech } = await supabase
    .from('technicians').select('*').eq('id', user!.id).single() as { data: Technician }

  const params = await searchParams
  const q = params.q || ''
  const statusFilter = params.status || ''
  const tab = params.tab || 'list'
  const isAdmin = tech?.role === 'admin'

  // Certificates for list
  let query = supabase
    .from('certificates')
    .select('*')
    .order('created_at', { ascending: false })
  if (!isAdmin) query = query.eq('technician_id', user!.id)
  if (statusFilter) query = query.eq('status', statusFilter)
  if (q) query = query.ilike('client_name', `%${q}%`)
  const { data: certs } = await query.limit(50) as { data: Certificate[] }

  // All certs for stats + reminders
  const allQuery = isAdmin
    ? supabase.from('certificates').select('id, status, created_at, next_service_date, client_name, client_phone, serial_no, service_date')
    : supabase.from('certificates').select('id, status, created_at, next_service_date, client_name, client_phone, serial_no, service_date').eq('technician_id', user!.id)
  const { data: allCerts } = await allQuery

  const now = new Date()
  const stats = {
    total: allCerts?.length || 0,
    this_month: allCerts?.filter(c => {
      const d = new Date(c.created_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length || 0,
    sent: allCerts?.filter(c => c.status === 'sent').length || 0,
    signed: allCerts?.filter(c => c.status === 'signed').length || 0,
  }

  // Reminders: due within 30 days or overdue
  const reminders = (allCerts || [])
    .filter(c => c.next_service_date)
    .map(c => ({ ...c, days: daysUntil(c.next_service_date) }))
    .filter(c => c.days <= 30)
    .sort((a, b) => a.days - b.days)

  const overdueCount = reminders.filter(r => r.days < 0).length
  const urgentCount = reminders.filter(r => r.days >= 0 && r.days <= 7).length

  return (
    <div className="pb-6">

      {/* ── REMINDER ALERT BANNER ── */}
      {reminders.length > 0 && (
        <a href="/dashboard?tab=reminders" className="block mb-4">
          <div className={`rounded-2xl p-4 flex items-center gap-3 shadow-sm ${
            overdueCount > 0 ? 'bg-red-500 text-white' :
            urgentCount > 0  ? 'bg-orange-500 text-white' :
                               'bg-yellow-400 text-gray-900'
          }`}>
            <div className="text-3xl flex-shrink-0">
              {overdueCount > 0 ? '🚨' : urgentCount > 0 ? '⚠️' : '🔔'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base leading-tight">
                {overdueCount > 0
                  ? `${overdueCount} klient${overdueCount > 1 ? 'ë' : ''} me shërbim të vonuar!`
                  : urgentCount > 0
                  ? `${urgentCount} klient${urgentCount > 1 ? 'ë' : ''} duhet thirrur këtë javë!`
                  : `${reminders.length} klient${reminders.length > 1 ? 'ë' : ''} brenda 30 ditëve`
                }
              </div>
              <div className="text-sm opacity-75 mt-0.5">Shtyp për të parë listën →</div>
            </div>
            <div className={`text-2xl font-bold font-mono w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              overdueCount > 0 ? 'bg-white/25' : 'bg-black/10'
            }`}>{reminders.length}</div>
          </div>
        </a>
      )}

      {/* ── STATS GRID ── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { label: 'Gjithsej', val: stats.total,      icon: '📋', border: 'border-[#1a6b2a]', bg: 'bg-green-pale' },
          { label: 'Këtë muaj', val: stats.this_month, icon: '📅', border: 'border-yellow-400', bg: 'bg-yellow-pale' },
          { label: 'Dërguar',   val: stats.sent,       icon: '📧', border: 'border-blue-400',   bg: 'bg-blue-50' },
          { label: 'Nënshkruar',val: stats.signed,     icon: '✅', border: 'border-[#2d8a40]',  bg: 'bg-green-pale' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border-2 ${s.border} rounded-2xl p-4`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-3xl font-bold font-mono text-gray-900">{s.val}</div>
            <div className="text-xs text-gray-500 font-bold uppercase tracking-wide mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
        {[
          { key: 'list',      label: '📋 Vërtetime' },
          { key: 'reminders', label: `🔔 Reminders${reminders.length > 0 ? ` (${reminders.length})` : ''}` },
        ].map(t => (
          <a key={t.key} href={`/dashboard?tab=${t.key}`}
            className={`flex-1 text-center py-2.5 rounded-lg text-sm font-bold transition-all ${
              tab === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}
          >{t.label}</a>
        ))}
      </div>

      {/* ── REMINDERS TAB ── */}
      {tab === 'reminders' && (
        <div className="space-y-3">
          {reminders.length === 0 && (
            <div className="card p-12 text-center text-gray-400">
              <div className="text-5xl mb-3">✅</div>
              <div className="font-semibold text-gray-500">Asnjë reminder për momentin</div>
              <div className="text-sm text-gray-400 mt-1">Kur t'i afrohet data e 5 muajve, do të shfaqen këtu</div>
            </div>
          )}
          {reminders.map(r => {
            const isOverdue = r.days < 0
            const isUrgent  = r.days >= 0 && r.days <= 7
            return (
              <div key={r.id} className={`rounded-2xl p-4 border-2 ${
                isOverdue ? 'border-red-400 bg-red-50' :
                isUrgent  ? 'border-orange-400 bg-orange-50' :
                            'border-yellow-300 bg-yellow-50'
              }`}>
                <div className="flex items-start gap-3">
                  <div className="text-2xl mt-0.5">
                    {isOverdue ? '🚨' : isUrgent ? '⚠️' : '🔔'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 text-base">{r.client_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Shërbimi i fundit: <span className="font-mono font-semibold">{r.service_date}</span>
                    </div>
                    <div className={`text-sm font-bold mt-1.5 ${
                      isOverdue ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-yellow-700'
                    }`}>
                      {isOverdue
                        ? `Vonuar ${Math.abs(r.days)} ditë — thirreni menjëherë!`
                        : r.days === 0
                        ? 'Sot duhet thirrur!'
                        : `Pas ${r.days} ditëve (${r.next_service_date})`
                      }
                    </div>
                    <div className="flex gap-2 mt-3">
                      {r.client_phone && (
                        <a href={`tel:${r.client_phone}`}
                          className="flex items-center gap-1.5 bg-[#1a6b2a] text-white px-4 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform">
                          📞 Thirr tani
                        </a>
                      )}
                      <Link href={`/certificate/${r.id}`}
                        className="flex items-center gap-1 bg-white border-2 border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold">
                        Shiko →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── LIST TAB ── */}
      {tab === 'list' && (
        <>
          {/* Search */}
          <form method="GET" className="flex gap-2 mb-3">
            <input type="hidden" name="tab" value="list" />
            <input name="q" defaultValue={q} placeholder="🔍 Kërko klientin..."
              className="input flex-1 text-base py-3.5 rounded-xl" />
            <button type="submit" className="btn-primary px-4 rounded-xl text-sm">Kërko</button>
          </form>

          {/* Status filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-3" style={{scrollbarWidth:'none'}}>
            {[
              { val: '',        label: 'Të gjitha' },
              { val: 'draft',   label: '📝 Draft' },
              { val: 'sent',    label: '📧 Dërguar' },
              { val: 'signed',  label: '✅ Nënshkruar' },
            ].map(s => (
              <a key={s.val}
                href={`/dashboard?tab=list&status=${s.val}${q ? '&q='+q : ''}`}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                  statusFilter === s.val
                    ? 'bg-[#1a6b2a] text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >{s.label}</a>
            ))}
          </div>

          {/* Cards */}
          <div className="space-y-2.5">
            {!certs?.length && (
              <div className="card p-12 text-center text-gray-400">
                <div className="text-5xl mb-3">📋</div>
                <div className="font-semibold text-gray-500 mb-2">Nuk ka vërtetime</div>
                <Link href="/certificate/new"
                  className="inline-block bg-[#1a6b2a] text-white px-5 py-2.5 rounded-xl font-bold text-sm">
                  + Krijo të parin
                </Link>
              </div>
            )}
            {certs?.map(cert => (
              <Link key={cert.id} href={`/certificate/${cert.id}`}
                className="block card p-4 active:scale-[0.98] transition-transform">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-mono text-xs text-gray-400 font-bold">#{cert.serial_no}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusColors[cert.status]}`}>
                        {statusLabels[cert.status]}
                      </span>
                    </div>
                    <div className="font-bold text-gray-900 text-base leading-tight truncate">
                      {cert.client_name}
                    </div>
                    {cert.client_address && (
                      <div className="text-xs text-gray-400 truncate mt-0.5">{cert.client_address}</div>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {cert.service_types?.map(s => (
                        <span key={s} className="bg-green-pale text-[#1a6b2a] text-xs font-semibold px-2 py-0.5 rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                    <div className="font-mono text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                      {cert.service_date}
                    </div>
                    <div className="text-gray-300 text-xl leading-none mt-1">›</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
