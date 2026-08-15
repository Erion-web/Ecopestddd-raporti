import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protected routes — require login.
  // NOTE: viewing a single certificate (/certificate/[id]) is intentionally
  // public so PDFs/reports can be shared with clients without an account.
  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname === '/certificate/new' ||
    /^\/certificate\/[^/]+\/edit$/.test(pathname)

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Deactivated technicians lose all access, even with a valid session
  if (isProtected && user) {
    const { data: tech } = await supabase
      .from('technicians').select('active').eq('id', user.id).single()
    if (tech && tech.active === false) {
      await supabase.auth.signOut()
      const url = new URL('/login', request.url)
      url.searchParams.set('error', 'deactivated')
      return NextResponse.redirect(url)
    }
  }

  // Already logged in, redirect away from login
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/certificate/sign).*)'],
}
