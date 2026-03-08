import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CertificateForm from '@/components/forms/CertificateForm'

export default async function NewCertificatePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tech } = await supabase
    .from('technicians').select('*').eq('id', user.id).single()

  return (
    <div>
      <CertificateForm technician={tech} />
    </div>
  )
}
