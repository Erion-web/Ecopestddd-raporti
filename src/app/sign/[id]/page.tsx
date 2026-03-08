'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SignPage({ params }: { params: { id: string } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cert, setCert] = useState<Record<string, unknown> | null>(null)
  const [signed, setSigned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('certificates').select('*').eq('id', params.id).single()
      .then(({ data }) => {
        setCert(data)
        if (data?.status === 'signed') setSigned(true)
      })
  }, [params.id])

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e, canvas)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1a1d23'
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const stopDraw = () => setIsDrawing(false)

  const clearSig = () => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const saveSig = async () => {
    const canvas = canvasRef.current!
    const sig = canvas.toDataURL('image/png')
    setSaving(true)
    await supabase.from('certificates').update({
      client_signature: sig,
      status: 'signed',
      signed_at: new Date().toISOString(),
    }).eq('id', params.id)
    setSaving(false)
    setSigned(true)
  }

  if (!cert) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin text-4xl">⟳</div>
    </div>
  )

  if (signed) return (
    <div className="min-h-screen flex items-center justify-center bg-green-pale px-4">
      <div className="text-center card p-8 max-w-sm w-full">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-[#1a6b2a] mb-2">Nënshkruar!</h1>
        <p className="text-gray-600">Vërtetimi u nënshkrua me sukses.</p>
        <p className="text-sm text-gray-400 mt-4">EcoPest DDD · +383 46 10 80 30</p>
      </div>
    </div>
  )

  const c = cert as Record<string, unknown>

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#1a6b2a] rounded-2xl mb-3">
            <span className="text-white font-mono font-bold text-lg">DDD</span>
          </div>
          <h1 className="text-xl font-bold">EcoPest DDD</h1>
          <p className="text-sm text-gray-500">Vërtetim Shërbimi #{c.serial_no as number}</p>
        </div>

        {/* Cert summary */}
        <div className="card p-5 mb-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Klienti</span><span className="font-semibold">{c.client_name as string}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Data</span><span className="font-mono">{c.service_date as string}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Shërbimi</span><span className="font-semibold">{(c.service_types as string[])?.join(', ')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Teknik</span><span>{c.technician_name as string}</span></div>
          </div>
        </div>

        {/* Signature */}
        <div className="card p-5">
          <h2 className="font-bold mb-3">✍️ Nënshkruani këtu</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              width={380}
              height={150}
              className="w-full touch-none cursor-crosshair"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={clearSig} className="btn-secondary flex-1 text-sm py-2">🗑️ Fshi</button>
            <button onClick={saveSig} disabled={saving} className="btn-primary flex-1 text-sm py-2">
              {saving ? '⟳ Duke ruajtur...' : '✅ Konfirmo Nënshkrimin'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Duke nënshkruar, konfirmoni marrjen e shërbimit DDD.<br/>
          EcoPest DDD © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
