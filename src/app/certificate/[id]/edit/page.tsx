import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import CertificateForm from '@/components/forms/CertificateForm'
import type { Technician } from '@/types'

export default async function EditCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tech } = await supabase
    .from('technicians').select('*').eq('id', user.id).single() as { data: Technician | null }
  const isAdmin = tech?.role === 'admin'

  const { data: cert, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !cert) notFound()

  const isOwner = user.id === cert.technician_id
  if (!isOwner && !isAdmin) notFound()

  return (
    <div>
      <CertificateForm technician={tech} certificate={cert} isAdmin={isAdmin} />
    </div>
  )
}
