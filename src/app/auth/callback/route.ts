import { NextResponse } from 'next/server'
// The client-side createClient can't be used here, but we can't use our supabase-server either because it might not handle the specific callback logic.
// Actually, using createServerClient directly from @supabase/ssr is the standard way.
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get('next') ?? '/'

  console.log('Auth Callback triggered:', request.url)
  
  if (code) {
    console.log('Code found, attempting exchange...')
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch (error) {
              console.error('Error setting cookies in callback:', error)
            }
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
        console.log('Exchange successful, redirecting...')
        const forwardedHost = request.headers.get('x-forwarded-host')
        const isLocalEnv = process.env.NODE_ENV === 'development'
        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${next}`)
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`)
        } else {
          return NextResponse.redirect(`${origin}${next}`)
        }
    } else {
      console.error('Auth code exchange error details:', JSON.stringify(error, null, 2))
    }
  }

  console.error('Final failure: Missing code or exchange failed. Redirecting to error page.')
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
