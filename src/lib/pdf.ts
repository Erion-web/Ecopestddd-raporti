// src/lib/pdf.ts
// Generates the DDD certificate PDF using jsPDF
import type { Certificate } from '@/types'

export async function generateCertificatePDF(cert: Certificate): Promise<Blob> {
  // Dynamic import — jsPDF is client-side only
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const W = 210, ml = 14, mr = 14, cw = W - ml - mr
  let y = 14

  const GREEN: [number,number,number] = [26, 107, 42]
  const YELLOW: [number,number,number] = [245, 197, 24]
  const RED: [number,number,number] = [192, 57, 43]
  const LGRAY: [number,number,number] = [244, 245, 247]
  const BORDER: [number,number,number] = [221, 225, 231]

  // ── Header bar ──
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text('ECOPEST DDD', ml, 12)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Dezinfektim  •  Dezinsektim  •  Deratizim', ml, 20)

  // Meta right
  doc.setFontSize(9)
  doc.text(`Nr. Serik: ${cert.serial_no}`, W - mr, 8, { align: 'right' })
  doc.text(`Nr. Kërkesës: ${cert.request_no}`, W - mr, 14, { align: 'right' })
  doc.text(`Nr. Referencës: ${cert.reference_no}`, W - mr, 20, { align: 'right' })
  doc.text(`Data: ${cert.service_date}  Ora: ${cert.service_time || '—'}`, W - mr, 26, { align: 'right' })

  y = 36

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...GREEN)
  doc.text('VËRTETIM SHËRBIMI DDD', ml, y)
  y += 10

  const sectionHeader = (title: string, color: [number,number,number]) => {
    doc.setFillColor(...color)
    doc.rect(ml, y, cw, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text(title.toUpperCase(), ml + 3, y + 5)
    y += 10
  }

  const fieldBox = (label: string, value: string, x: number, w: number, sy: number) => {
    doc.setFillColor(...LGRAY)
    doc.setDrawColor(...BORDER)
    doc.rect(x, sy, w, 9, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)
    doc.text(label, x + 2, sy + 3.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    doc.text(String(value || '—').substring(0, 45), x + 2, sy + 7.5)
  }

  // ── Klienti ──
  sectionHeader('Klienti', GREEN)
  fieldBox('Kompania / Emri', cert.client_name, ml, cw * 0.6, y)
  fieldBox('Dega', cert.client_branch || '', ml + cw * 0.6 + 2, cw * 0.4 - 2, y)
  y += 11
  fieldBox('Adresa', cert.client_address || '', ml, cw * 0.6, y)
  fieldBox('Telefoni', cert.client_phone || '', ml + cw * 0.6 + 2, cw * 0.4 - 2, y)
  y += 11
  fieldBox('Email', cert.client_email || '', ml, cw, y)
  y += 13

  // ── Shërbimi ──
  sectionHeader('Shërbimi i Kryer', GREEN)
  doc.setFillColor(...LGRAY)
  doc.setDrawColor(...BORDER)
  doc.rect(ml, y, cw, 8, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(30, 30, 30)
  doc.text(cert.service_types.join('   |   ') || '—', ml + 3, y + 5.5)
  y += 11

  if (cert.pest_types.length) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)
    doc.text('Shërbimi për: ' + cert.pest_types.join(', '), ml, y + 4)
    y += 8
  }

  // Products table
  if (cert.products.length) {
    doc.setFillColor(...BORDER)
    doc.rect(ml, y, cw * 0.65, 6, 'F')
    doc.rect(ml + cw * 0.65 + 1, y, cw * 0.35 - 1, 6, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(60, 60, 60)
    doc.text('Emri i Preparatit', ml + 2, y + 4)
    doc.text('Doza / Shënim', ml + cw * 0.65 + 3, y + 4)
    y += 7

    cert.products.forEach(p => {
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(...BORDER)
      doc.rect(ml, y, cw * 0.65, 6, 'FD')
      doc.rect(ml + cw * 0.65 + 1, y, cw * 0.35 - 1, 6, 'FD')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(30, 30, 30)
      doc.text(p.emri || '', ml + 2, y + 4)
      doc.text(p.doza || '—', ml + cw * 0.65 + 3, y + 4)
      y += 7
    })
    y += 3
  }

  // ── Zonat ──
  if (y > 200) { doc.addPage(); y = 14 }
  sectionHeader('Mbrojtja në Tre Zona', GREEN)

  const zoneW = (cw - 4) / 3
  const zoneColors: [number,number,number][] = [GREEN, [212, 160, 23], RED]
  const zoneNames = ['Zona e Gjelbërt (Perimetri)', 'Zona e Verdhë (Hyrja)', 'Zona e Kuqe (Brendia)']
  const zoneData = [cert.zones_green, cert.zones_yellow, cert.zones_red]
  const zoneStartY = y
  let maxZoneH = 0

  zoneData.forEach((items, i) => {
    const x = ml + i * (zoneW + 2)
    doc.setFillColor(...zoneColors[i])
    doc.rect(x, zoneStartY, zoneW, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(255, 255, 255)
    doc.text(zoneNames[i], x + 2, zoneStartY + 5)
    let zy = zoneStartY + 12
    items.forEach(it => {
      doc.setFillColor(...zoneColors[i])
      doc.circle(x + 3.5, zy - 1.5, 1.2, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(30, 30, 30)
      doc.text(it, x + 7, zy)
      zy += 5
    })
    if (!items.length) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text('(asnjë)', x + 2, zoneStartY + 14)
      zy = zoneStartY + 16
    }
    maxZoneH = Math.max(maxZoneH, zy - zoneStartY)
  })
  y = zoneStartY + maxZoneH + 6

  // ── Raporti Sanitar ──
  if (y > 230) { doc.addPage(); y = 14 }
  sectionHeader('Raporti Sanitar', RED)

  const sanEntries = Object.entries(cert.sanitary_report)
  const colW2 = cw / 2 - 2
  let rowY = y

  sanEntries.forEach(([item, val], idx) => {
    const xPos = idx % 2 === 0 ? ml : ml + colW2 + 4
    if (idx % 2 === 0 && idx > 0) rowY += 7

    doc.setFillColor(idx % 4 < 2 ? 248 : 244, 250, 244)
    doc.setDrawColor(...BORDER)
    doc.rect(xPos, rowY, colW2, 6, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(30, 30, 30)
    doc.text(item.substring(0, 35), xPos + 2, rowY + 4)

    if (val) {
      doc.setFillColor(...(val === 'po' ? GREEN : RED))
      doc.roundedRect(xPos + colW2 - 13, rowY + 1, 11, 4, 1, 1, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(255, 255, 255)
      doc.text(val.toUpperCase(), xPos + colW2 - 7.5, rowY + 4, { align: 'center' })
    }
  })

  y = rowY + 12

  // Notes
  if (cert.notes) {
    if (y > 250) { doc.addPage(); y = 14 }
    sectionHeader('Shënim', GREEN)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    const lines = doc.splitTextToSize(cert.notes, cw - 4)
    doc.text(lines, ml + 2, y)
    y += lines.length * 5 + 6
  }

  // Signature
  if (cert.client_signature) {
    if (y > 240) { doc.addPage(); y = 14 }
    sectionHeader('Nënshkrimi i Klientit', GREEN)
    try {
      doc.addImage(cert.client_signature, 'PNG', ml, y, 60, 20)
      y += 25
    } catch {}
  }

  // Signature lines
  if (y > 260) { doc.addPage(); y = 14 }
  y += 8
  doc.setDrawColor(...BORDER)
  doc.line(ml, y, ml + 55, y)
  doc.line(ml + 70, y, ml + 125, y)
  doc.line(ml + 140, y, W - mr, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('Teknik: ' + cert.technician_name, ml, y + 5)
  doc.text('Emri i klientit', ml + 70, y + 5)
  doc.text('Nënshkrimi', ml + 140, y + 5)

  // Footer on all pages
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFillColor(...GREEN)
    doc.rect(0, 284, 210, 13, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.text('Tel: +383 46 10 80 30', ml, 291)
    doc.text('Web: ecopest-ddd.com', W / 2, 291, { align: 'center' })
    doc.text(`Faqja ${i} / ${pageCount}`, W - mr, 291, { align: 'right' })
  }

  return doc.output('blob')
}
