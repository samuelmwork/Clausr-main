'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function SignupForm() {
  const [form, setForm] = useState({ name: '', orgName: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [invitation, setInvitation] = useState<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite')
  const supabase = createClient()

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  useEffect(() => {
    if (inviteToken) {
      supabase
        .from('invitations')
        .select('*, organisations(name)')
        .eq('token', inviteToken)
        .single()
        .then(({ data, error }) => {
          if (data && !data.accepted) {
            setInvitation(data)
            setForm(f => ({ ...f, email: data.email }))
          } else if (error) {
            setError('Invalid invitation')
          }
        })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteToken])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const normalizedEmail = form.email.trim().toLowerCase()

    if (!isValidEmail(normalizedEmail)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    if (!invitation) {
      const orgName = String(form.orgName || '').trim()
      if (!orgName) {
        setError('Please enter your company name')
        setLoading(false)
        return
      }

      const checkRes = await fetch('/api/org/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName }),
      })

      if (!checkRes.ok) {
        const body = await checkRes.json().catch(() => ({}))
        setError(body?.error || 'Organization already exists')
        setLoading(false)
        return
      }
    }

    if (invitation && normalizedEmail !== String(invitation.email || '').trim().toLowerCase() && process.env.NODE_ENV !== 'development') {
      setError('Email must match the invitation')
      setLoading(false)
      return
    }

    const { data, error: signupErr } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: form.password,
      options: {
        data: {
          full_name: form.name,
          org_name: invitation ? null : form.orgName,
          invite_token: inviteToken || null,
        },
      },
    })

    if (signupErr) {
      setError(signupErr.message)
      setLoading(false)
      return
    }

    // Supabase can return no error for existing users in some configurations.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setError('An account with this email already exists. Please sign in instead.')
      setLoading(false)
      return
    }

    const params = new URLSearchParams({ email: normalizedEmail })
    if (inviteToken) params.set('invite', inviteToken)
    router.push(`/auth/verify?${params.toString()}`)
  }

  async function handleGoogle() {
    if (!invitation) {
      const orgName = String(form.orgName || '').trim()
      if (!orgName) {
        setError('Please enter your company name before continuing with Google')
        return
      }

      const checkRes = await fetch('/api/org/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName }),
      })

      if (!checkRes.ok) {
        const body = await checkRes.json().catch(() => ({}))
        setError(body?.error || 'Organization already exists')
        return
      }
    }

    const params = new URLSearchParams()
    if (inviteToken) params.set('invite', inviteToken)
    if (!invitation && form.orgName.trim()) params.set('orgName', form.orgName.trim())
    const redirectTo = `${window.location.origin}/auth/callback${params.toString() ? `?${params.toString()}` : ''}`

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
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
          <h1 className="text-2xl font-bold text-navy">Create your account</h1>
          <p className="text-muted text-sm mt-1">
            {invitation ? `Join ${invitation.organisations?.name} as ${invitation.role}` : 'Free plan · 5 contracts · No credit card'}
          </p>
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
          <form onSubmit={handleSignup} className="space-y-4">
            {error && <div className="bg-expired-bg border border-expired-text text-expired-text text-sm px-3 py-2 rounded-lg">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Your name</label>
              <input value={form.name} onChange={set('name')} required placeholder="Arjun Sharma"
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent" />
            </div>
            {!invitation && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company name</label>
                <input value={form.orgName} onChange={set('orgName')} required placeholder="Acme Pvt Ltd"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Work email</label>
              <input type="email" value={form.email} onChange={set('email')} required placeholder="you@company.com"
                className={`w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent ${invitation ? 'bg-page' : ''}`} disabled={!!invitation} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input type="password" value={form.password} onChange={set('password')} required placeholder="Min 8 characters" minLength={8}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-brand text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60">
              {loading ? 'Creating account…' : 'Create free account'}
            </button>
          </form>
          <p className="text-center text-sm text-muted mt-5">
            Already have an account? <Link href="/auth/login" className="text-brand font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <img src="/Logo.png" alt="Clausr logo" className="w-8 h-8 object-contain" />
            <span className="font-bold text-navy text-xl">Clausr</span>
          </Link>
        </div>
        <div className="bg-surface rounded-xl border border-border p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-100 rounded-lg"></div>
            <div className="h-10 bg-gray-100 rounded-lg"></div>
            <div className="h-10 bg-gray-100 rounded-lg"></div>
            <div className="h-10 bg-gray-100 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SignupForm />
    </Suspense>
  )
}
