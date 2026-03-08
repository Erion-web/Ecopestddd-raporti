# 🌿 EcoPest DDD – Sistemi i Vërtetimeve

Web app full-stack për digitalizimin e procesit të vërtetimeve të shërbimit DDD.

## 🛠️ Stack Teknologjik

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend/Databaza**: Supabase (PostgreSQL + Auth + Storage)
- **Email**: Resend
- **PDF**: jsPDF (client-side)
- **Hosting**: Vercel

---

## 🚀 Setup Hap-pas-Hapi

### 1. Klono dhe instalo

```bash
git clone https://github.com/YOUR_USERNAME/ecopest-ddd.git
cd ecopest-ddd
npm install
```

### 2. Krijo projektin në Supabase

1. Shko te [supabase.com](https://supabase.com) → **New Project**
2. Emërtoje `ecopest-ddd`
3. Zgjidh rajonin më të afërt (Frankfurt)
4. Shko te **Settings → API** dhe kopjo:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Ekzekuto SQL-in e databazës

1. Supabase Dashboard → **SQL Editor** → **New Query**
2. Kopjo gjithçka nga `supabase/migrations/001_initial_schema.sql`
3. Klikoje **Run**

### 4. Krijo llogarinë e parë (Admin)

1. Supabase → **Authentication → Users → Invite user**
2. Shto email-in tënd
3. Pas regjistrimit, shko te **SQL Editor** dhe ekzekuto:

```sql
INSERT INTO technicians (id, full_name, email, role)
VALUES (
  'UUID-PREJ-AUTH-USERS',  -- kopjo nga Authentication → Users
  'Emri Juaj',
  'email@juaj.com',
  'admin'
);
```

### 5. Konfiguro Resend (Email)

1. Shko te [resend.com](https://resend.com) → **API Keys → Create API Key**
2. Shto domain-in tënd (ose përdor `onboarding@resend.dev` për test)

### 6. Krijo `.env.local`

```bash
cp .env.local.example .env.local
# Pastaj hape dhe plotëso vlerat
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyXXXXXX
RESEND_API_KEY=re_XXXXXXX
RESEND_FROM_EMAIL=noreply@domain-juaj.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 7. Starto lokalisht

```bash
npm run dev
# Hap: http://localhost:3000
```

---

## 📦 Deploy në Vercel

```bash
# 1. Krijo repo GitHub dhe push
git init && git add . && git commit -m "Initial commit"
git remote add origin https://github.com/YOUR/ecopest-ddd.git
git push -u origin main

# 2. Vercel
# Shko te vercel.com → New Project → Import nga GitHub
# Shto Environment Variables (të njëjtat si .env.local, por me URL-in e Vercel)
# NEXT_PUBLIC_APP_URL=https://ecopest-ddd.vercel.app
```

---

## 📁 Struktura e Projektit

```
ecopest-ddd/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Redirect → dashboard/login
│   │   ├── layout.tsx                # Root layout
│   │   ├── globals.css
│   │   ├── login/page.tsx            # Faqja e hyrjes
│   │   ├── dashboard/
│   │   │   ├── layout.tsx            # Layout me navbar
│   │   │   └── page.tsx              # Dashboard + statistika
│   │   ├── certificate/
│   │   │   ├── new/page.tsx          # Formulari i ri (wizard)
│   │   │   └── [id]/page.tsx         # Detajet e vërtetimit
│   │   ├── sign/[id]/page.tsx        # Faqja publike për nënshkrim
│   │   └── api/
│   │       ├── email/route.ts        # Dërgo email me Resend
│   │       └── auth/callback/route.ts
│   ├── components/
│   │   ├── forms/CertificateForm.tsx # Formulari wizard 5-hap
│   │   └── ui/
│   │       ├── DashboardNav.tsx
│   │       └── CertificateDetail.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser client
│   │   │   └── server.ts             # Server client
│   │   ├── pdf.ts                    # Gjenero PDF
│   │   └── email.ts                  # Template email
│   ├── types/index.ts                # TypeScript types
│   └── middleware.ts                 # Auth protection
├── supabase/
│   └── migrations/001_initial_schema.sql
├── .env.local.example
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## ✨ Features

| Feature | Status |
|---|---|
| Login i sigurt për teknikët | ✅ |
| Formular wizard 5 hapa | ✅ |
| Ruajtje në PostgreSQL | ✅ |
| Numër serial automatik | ✅ |
| Dashboard me filtrim/kërkim | ✅ |
| Gjenero PDF profesional | ✅ |
| Dërgim email automatik (Resend) | ✅ |
| Link publik për klientin | ✅ |
| Nënshkrim dixhital (canvas) | ✅ |
| Admin sheh të gjitha; teknik sheh vetin | ✅ |
| Row Level Security (RLS) | ✅ |

---

## 🔒 Siguria

- Supabase RLS: çdo teknik sheh vetëm vërtetimet e tij
- Admin ka qasje të plotë
- Middleware i Next.js mbron të gjitha routes private
- Faqja `/sign/:id` është publike (vetëm për nënshkrim)

---

## 📞 Kontakt

**EcoPest DDD** · Tel: +383 46 10 80 30 · Web: ecopest-ddd.com
# Ecopestddd-raporti
