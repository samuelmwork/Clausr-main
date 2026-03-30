import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const protectedPaths = ['/dashboard', '/contracts', '/calendar', '/billing', '/settings']
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p))
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isVerifyPage = request.nextUrl.pathname.startsWith('/auth/verify')
  let emailVerified: boolean | null = null

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (user && isProtected) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email_verified')
      .eq('id', user.id)
      .single()

    emailVerified = Boolean(profile?.email_verified)

    if (!emailVerified) {
      const verifyUrl = new URL('/auth/verify', request.url)
      if (user.email) verifyUrl.searchParams.set('email', user.email)
      return NextResponse.redirect(verifyUrl)
    }
  }

  if (user && isAuthPage) {
    if (isVerifyPage) {
      if (emailVerified === null) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email_verified')
          .eq('id', user.id)
          .single()
        emailVerified = Boolean(profile?.email_verified)
      }

      if (!emailVerified) return response
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
