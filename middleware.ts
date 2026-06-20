import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: Do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAdminRoute = path.startsWith('/admin')
  const isAuthRoute = path.startsWith('/auth')
  const isAdmin = user?.user_metadata?.is_admin === true

  // Protect all /admin routes: require a logged-in admin.
  if (isAdminRoute) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.searchParams.set('redirect', path)
      return NextResponse.redirect(url)
    }
    if (!isAdmin) {
      // Logged in but not an admin -> send to a forbidden notice.
      const url = request.nextUrl.clone()
      url.pathname = '/auth/forbidden'
      return NextResponse.redirect(url)
    }
  }

  // If an admin is already logged in, skip the login page.
  if (isAuthRoute && path !== '/auth/forbidden' && isAdmin) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/auth/:path*'],
}
