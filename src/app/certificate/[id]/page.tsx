import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CertificateDetail from '@/components/ui/CertificateDetail'

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: cert, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !cert) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const isOwner = user?.id === cert.technician_id

  return <CertificateDetail cert={cert} isOwner={isOwner} />
}
