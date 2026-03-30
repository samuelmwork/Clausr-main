'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
        return
      }
      router.push('/auth/login')
    } catch (err) {
      console.error('Sign out error:', err)
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={signingOut}
      className="w-full text-left px-3 py-2 text-slate-500 hover:text-navy text-xs font-medium transition-colors rounded-lg hover:bg-brand-light disabled:opacity-70"
    >
      {signingOut ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
