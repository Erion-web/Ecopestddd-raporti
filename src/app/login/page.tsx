'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ose fjalëkalimi i gabuar.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-pale to-gray-100 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-[#04442F] rounded-2xl shadow-xl px-6 py-4 mb-4">
            <img src="/logo.svg" alt="EcoPest DDD" className="h-12 w-auto brightness-0 invert" />
          </div>
          <p className="text-gray-500 text-sm mt-2">Sistemi i Vërtetimeve</p>
        </div>

        {/* Form */}
        <div className="card p-8 shadow-xl">
          <h2 className="text-lg font-bold mb-6 text-center">Hyr në sistem</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="teknik@ecopest.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Fjalëkalimi</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-center flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <><span className="animate-spin">⟳</span> Duke hyrë...</>
              ) : (
                '→ Hyr'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          EcoPest DDD © {new Date().getFullYear()} · Tel: +383 46 10 80 30
        </p>
      </div>
    </div>
  )
}
