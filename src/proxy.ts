import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isSupabaseConfigured } from '@/lib/env'

// Next.js 16 renamed Middleware to Proxy. Same job: this runs before every
// matched request, refreshes the Supabase session cookie (tokens expire, and
// Server Components cannot write cookies), and bounces signed-out visitors.

const PUBLIC_ROUTES = ['/', '/login', '/auth/callback', '/auth/error']

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
}

export default async function proxy(request: NextRequest) {
  // No Supabase project yet — let every route through so the UI can be built
  // and previewed before the backend exists.
  if (!isSupabaseConfigured()) return NextResponse.next()

  // This response object is what we must ultimately return: the Supabase client
  // writes refreshed auth cookies onto it via setAll below.
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // Do not put any logic between creating the client and this call — it is what
  // refreshes an expired token, and skipping it logs users out at random.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && !isPublic(pathname)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname) // return here after signing in
    return NextResponse.redirect(loginUrl)
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/discover', request.url))
  }

  return response
}

export const config = {
  // Skip static assets and image optimization so the proxy only runs on pages.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
