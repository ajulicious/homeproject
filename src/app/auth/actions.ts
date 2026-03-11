'use server'
// Note: I'll use separate files for server actions to keep it clean.
// But for now let's create a server-side actions file.
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/')
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Cek email Anda untuk konfirmasi pendaftaran!' }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const headerList = await headers()
  const host = headerList.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  
  const siteUrl = `${protocol}://${host}`
  const redirectUrl = `${siteUrl}/auth/callback`
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    console.error('Google Sign-In Error:', error)
    return { error: error.message }
  }

  if (data.url) {
    redirect(data.url)
  }
}
