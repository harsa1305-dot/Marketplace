// src/middleware.ts — Next.js 15 Auth Guard
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_ROUTES = [
  '/dashboard', '/cart', '/checkout',
  '/orders', '/profile', '/store', '/chat',
]
const AUTH_ROUTES = ['/login', '/register', '/forgot-password']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Jika Environment Variables belum disetel di Vercel, jangan crash dengan 500
  if (!supabaseUrl || !supabaseAnonKey) {
    return response
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const { pathname } = request.nextUrl

    // Halaman etalase toko publik (/store/[id]) dapat dilihat oleh siapa saja tanpa login
    const isPublicStorePage = /^\/store\/\d+$/.test(pathname)
    const isProtected = !isPublicStorePage && PROTECTED_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))
    if (isProtected && !user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const isAuthRoute = AUTH_ROUTES.some(r => pathname.startsWith(r))
    if (isAuthRoute && user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  } catch (error) {
    console.error('Middleware execution error:', error)
    return response
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|api/webhooks).*)'],
}
