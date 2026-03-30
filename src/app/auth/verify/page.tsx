'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const inviteToken = searchParams.get('invite')
  const initialEmail = useMemo(() => searchParams.get('email') || '', [searchParams])

  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const normalizedEmail = email.trim().toLowerCase()

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const token = otp.trim()
    if (!normalizedEmail || !token) {
      setError('Email and OTP are required')
      setLoading(false)
      return
    }

    const { data, error: verifyErr } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token,
      type: 'signup',
    })

    if (verifyErr || !data.user) {
      setError(verifyErr?.message || 'OTP verification failed')
      setLoading(false)
      return
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ email_verified: true })
      .eq('id', data.user.id)
    if (profileErr) {
      setError(profileErr.message || 'Email verified, but profile update failed')
      setLoading(false)
      return
    }

    const onboardRes = await fetch('/api/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: data.user.id,
        orgName: (data.user.user_metadata?.org_name as string) || 'My Workspace',
        fullName: (data.user.user_metadata?.full_name as string) || '',
        inviteToken: inviteToken || null,
      }),
    })

    if (!onboardRes.ok) {
      let message = 'OTP verified, but onboarding failed'
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

  async function handleResend() {
    setResending(true)
    setError('')
    setSuccess('')

    if (!normalizedEmail) {
      setError('Enter your email first')
      setResending(false)
      return
    }

    const { error: resendErr } = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail,
    })

    if (resendErr) {
      setError(resendErr.message || 'Failed to resend OTP')
      setResending(false)
      return
    }

    setSuccess('A new OTP has been sent to your email.')
    setResending(false)
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-navy rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <span className="font-bold text-navy text-xl">Clausr</span>
          </Link>
          <h1 className="text-2xl font-bold text-navy">Verify your email</h1>
          <p className="text-muted text-sm mt-1">Enter the OTP sent to your inbox</p>
        </div>

        <div className="bg-surface rounded-xl border border-border p-6">
          <form onSubmit={handleVerify} className="space-y-4">
            {error && <div className="bg-expired-bg border border-expired-text text-expired-text text-sm px-3 py-2 rounded-lg">{error}</div>}
            {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg">{success}</div>}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">OTP code</label>
              <input
                required
                value={otp}
                onChange={e => setOtp(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent tracking-[0.2em]"
                placeholder="123456"
                inputMode="numeric"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60"
            >
              {loading ? 'Verifying…' : 'Verify and continue'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="w-full mt-3 border border-border py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-page transition-colors disabled:opacity-60"
          >
            {resending ? 'Resending…' : 'Resend OTP'}
          </button>

          <p className="text-center text-sm text-muted mt-5">
            Back to <Link href="/auth/login" className="text-brand font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-page" />}>
      <VerifyEmailContent />
    </Suspense>
  )
}
