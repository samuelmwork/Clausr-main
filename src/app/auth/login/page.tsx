'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showVerifyAction, setShowVerifyAction] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const isUnverifiedError = (message: string) =>
    /email.*(not confirmed|not verified)|confirm your email/i.test(message)

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setShowVerifyAction(false)
    const normalizedEmail = email.trim().toLowerCase()

    if (!isValidEmail(normalizedEmail)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
    if (error || !data.user) {
      if (error?.message && isUnverifiedError(error.message)) {
        setError('Your email is not verified yet. Enter the OTP we sent to complete signup.')
        setShowVerifyAction(true)
      } else {
        setError(error?.message || 'Login failed')
      }
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email_verified')
      .eq('id', data.user.id)
      .single()

    if (!profile?.email_verified) {
      await supabase.auth.signOut()
      setError('Verify your email with OTP before logging in.')
      setShowVerifyAction(true)
      setLoading(false)
      return
    }

    // Ensure member/org exists in case a previous signup got interrupted.
    const onboardRes = await fetch('/api/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: data.user.id,
        orgName: (data.user.user_metadata?.org_name as string) || 'My Workspace',
        fullName: (data.user.user_metadata?.full_name as string) || '',
        inviteToken: null,
      }),
    })
    if (!onboardRes.ok) {
      let message = 'Login succeeded but onboarding failed'
      try {
        const body = await onboardRes.json()
        message = body?.error || message
      } catch {}
      setError(message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <img src="/Logo.png" alt="Clausr logo" className="w-8 h-8 object-contain" />
            <span className="font-bold text-navy text-xl">Clausr</span>
          </Link>
          <h1 className="text-2xl font-bold text-navy">Welcome back</h1>
          <p className="text-muted text-sm mt-1">Sign in to your account</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-6">
          <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-3 border border-border rounded-lg py-2.5 text-sm font-medium text-slate-700 hover:bg-page transition-colors mb-5">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs text-muted bg-surface px-2">or</div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && <div className="bg-expired-bg border border-expired-text text-expired-text text-sm px-3 py-2 rounded-lg">{error}</div>}
            {showVerifyAction && (
              <button
                type="button"
                className="text-sm text-brand font-medium hover:underline"
                onClick={() => router.push(`/auth/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`)}
              >
                Verify email with OTP
              </button>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="you@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-brand text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="text-center text-sm text-muted mt-5">
            No account? <Link href="/auth/signup" className="text-brand font-medium hover:underline">Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
