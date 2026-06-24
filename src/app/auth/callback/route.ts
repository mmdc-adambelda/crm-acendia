import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Handles Supabase auth redirects — password reset emails, magic links, OAuth.
 * Supabase appends ?code=xxx to the redirect URL; we exchange it for a session.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Exchange failed — send back to login with an error flag
  return NextResponse.redirect(`${origin}/login?error=link-expired`)
}
