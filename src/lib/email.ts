// src/lib/email.ts
import { Resend } from 'resend'
import type { Certificate } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendCertificateEmail(cert: Certificate, pdfUrl: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'EcoPest DDD <noreply@ecopest-ddd.com>',
    to: cert.client_email!,
    cc: ['info@ecopest-ddd.com'],
    subject: `Vërtetim Shërbimi DDD – ${cert.client_name} (${cert.client_email}) (Nr. ${cert.serial_no})`,
    html: `
<!DOCTYPE html>
<html lang="sq">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f5f7; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 32px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #1a6b2a; padding: 28px 32px; }
    .header h1 { color: white; margin: 0; font-size: 22px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px; }
    .body { padding: 32px; }
    .greeting { font-size: 16px; color: #1a1d23; margin-bottom: 16px; }
    .info-box { background: #f4f5f7; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #6b7280; font-weight: 600; }
    .info-value { color: #1a1d23; font-weight: 500; }
    .btn { display: inline-block; background: #1a6b2a; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; margin: 16px 0; }
    .btn-sign { display: inline-block; background: #f5c518; color: #1a1d23; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; margin: 8px 0; }
    .footer { background: #f4f5f7; padding: 20px 32px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
    .badge { display: inline-block; background: #e8f5eb; color: #1a6b2a; border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 700; margin: 4px; }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>🌿 EcoPest DDD</h1>
    <p>Dezinfektim • Dezinsektim • Deratizim</p>
  </div>
  <div class="body">
    <p class="greeting">I/E nderuar <strong>${cert.client_name}</strong>,</p>
    <p style="color:#4b5563;font-size:14px;line-height:1.6">
      Ju faleminderit që zgjodhët shërbimet tona! Bashkëlidhur gjeni vërtetimin e shërbimit
      DDD të kryer në objektin tuaj.
    </p>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Nr. Serik</span>
        <span class="info-value">#${cert.serial_no}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Data e shërbimit</span>
        <span class="info-value">${cert.service_date}${cert.service_time ? ' ora ' + cert.service_time : ''}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Shërbimi i kryer</span>
        <span class="info-value">${cert.service_types.join(', ')}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Teknik</span>
        <span class="info-value">${cert.technician_name}</span>
      </div>
      ${cert.pest_types.length ? `
      <div class="info-row">
        <span class="info-label">Trajtim për</span>
        <span class="info-value">${cert.pest_types.join(', ')}</span>
      </div>` : ''}
    </div>

    <div style="text-align:center;margin:24px 0">
      <a href="${pdfUrl}" class="btn">📄 Shkarko PDF</a>
      <br>
      <a href="${appUrl}/sign/${cert.id}" class="btn-sign">✍️ Nënshkruaj Vërtetimin</a>
    </div>

    <p style="color:#6b7280;font-size:13px;line-height:1.6">
      Nëse keni ndonjë pyetje ose nevojë për shërbime shtesë, mos hezitoni të na kontaktoni.
    </p>
  </div>
  <div class="footer">
    <strong style="color:#1a6b2a">EcoPest DDD</strong><br>
    Tel: +383 46 10 80 30 | Web: ecopest-ddd.com<br>
    <span style="font-size:11px">Ky email është dërguar automatikisht. Ju lutem mos i përgjigjeni.</span>
  </div>
</div>
</body>
</html>
    `,
  })

  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`)
  return data
}
