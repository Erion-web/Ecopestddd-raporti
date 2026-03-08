export type Role = 'admin' | 'technician'
export type CertStatus = 'draft' | 'sent' | 'signed' | 'archived'

export interface Technician {
  id: string
  full_name: string
  email: string
  phone?: string
  role: Role
  active: boolean
  created_at: string
}

export interface Product {
  emri: string
  doza: string
}

export interface Certificate {
  id: string
  serial_no: number
  request_no: string
  reference_no: string
  technician_id: string
  technician_name: string
  client_name: string
  client_branch?: string
  client_address?: string
  client_phone?: string
  client_email?: string
  service_date: string
  service_time?: string
  service_types: string[]
  pest_types: string[]
  products: Product[]
  zones_green: string[]
  zones_yellow: string[]
  zones_red: string[]
  sanitary_report: Record<string, 'po' | 'jo' | null>
  notes?: string
  status: CertStatus
  client_signature?: string
  signed_at?: string
  pdf_path?: string
  next_service_date?: string
  created_at: string
  updated_at: string
}

export type CertificateInsert = Omit<Certificate,
  'id' | 'serial_no' | 'created_at' | 'updated_at' | 'signed_at' | 'pdf_path'
>

export interface DashboardStats {
  total: number
  draft: number
  sent: number
  signed: number
  this_month: number
}
