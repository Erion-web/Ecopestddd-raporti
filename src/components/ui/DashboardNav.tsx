'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Technician } from '@/types'

export default function DashboardNav({ technician }: { technician: Technician | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isNew = pathname.includes('/certificate/new')
  const isDash = pathname === '/dashboard'

  return (
    <>
      {/* ── TOP BAR ── */}
      <nav className="bg-[#04442F] text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between h-14">
          <Link href="/dashboard" className="flex items-center">
            <img src="/logo.svg" alt="EcoPest DDD" className="h-8 w-auto brightness-0 invert" />
          </Link>

          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold leading-none">{technician?.full_name || 'Teknik'}</div>
              <div className="text-xs text-white/60">{technician?.role === 'admin' ? '👑 Admin' : '🔧 Teknik'}</div>
            </div>
            <button onClick={logout}
              className="text-white/70 hover:text-white text-sm p-2 rounded-lg hover:bg-white/10 transition-colors">
              Dil
            </button>
          </div>
        </div>
      </nav>

      {/* ── BOTTOM NAV (mobile) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-inset-bottom md:hidden">
        <div className="flex items-center max-w-2xl mx-auto">
          <Link href="/dashboard" className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${
            isDash ? 'text-[#04442F]' : 'text-gray-400'
          }`}>
            <span className="text-xl">{isDash ? '🏠' : '🏡'}</span>
            <span className="text-xs font-semibold">Dashboard</span>
          </Link>

          {/* Big center button */}
          <div className="flex-shrink-0 px-4">
            <Link href="/certificate/new"
              className="flex items-center justify-center w-14 h-14 bg-[#8BC53F] rounded-2xl shadow-lg shadow-[#8BC53F]/40 active:scale-95 transition-transform -mt-5">
              <span className="text-white text-2xl font-bold leading-none">+</span>
            </Link>
          </div>

          <Link href="/dashboard?tab=reminders" className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${
            pathname.includes('reminders') ? 'text-[#8BC53F]' : 'text-gray-400'
          }`}>
            <span className="text-xl">🔔</span>
            <span className="text-xs font-semibold">Reminders</span>
          </Link>
        </div>
      </div>
    </>
  )
}
