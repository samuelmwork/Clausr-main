'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LogIn, ArrowRight, ShieldCheck } from 'lucide-react'

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
        setError('Verification required. Please check your inbox.')
        setShowVerifyAction(true)
      } else {
        setError(error?.message || 'Authentication failed. Please check your credentials.')
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
      setError('Please verify your email address before continuing.')
      setShowVerifyAction(true)
      setLoading(false)
      return
    }

    const onboardRes = await fetch('/api/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: data.user.id,
        orgName: (data.user.user_metadata?.org_name as string) || 'Personal Workspace',
        fullName: (data.user.user_metadata?.full_name as string) || '',
        inviteToken: null,
      }),
    })
    
    if (!onboardRes.ok) {
       router.push('/dashboard') // Proceed anyway, onboarding middle-ware should catch it or it's already done
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
    <div className="min-h-screen bg-page flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-xl shadow-indigo-500/10 border border-slate-100 flex items-center justify-center group-hover:scale-105 transition-transform">
              <img src="/Logo.png" alt="Clausr" className="w-8 h-8 object-contain" />
            </div>
            <span className="font-display font-black text-midnight text-2xl tracking-tighter">Clausr</span>
          </Link>
          <h1 className="text-3xl font-display font-black text-midnight tracking-tight">Access Portal</h1>
          <p className="text-slate-500 font-medium mt-2">Manage your high-stakes contracts with precision.</p>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 p-8 md:p-10 shadow-2xl shadow-indigo-500/5">

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold px-4 py-3 rounded-2xl flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4 shrink-0" />
                 {error}
              </div>
            )}
            
            {showVerifyAction && (
              <button
                type="button"
                className="text-xs bg-indigo-50 text-indigo-600 font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-colors"
                onClick={() => router.push(`/auth/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`)}
              >
                Complete Identity Verification
              </button>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 pl-1">Professional Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-midnight shadow-inner focus:ring-2 focus:ring-brand/20 transition-all outline-none placeholder:text-slate-300"
                placeholder="exec@company.com" 
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between pl-1">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Security Phrase</label>
              </div>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-midnight shadow-inner focus:ring-2 focus:ring-brand/20 transition-all outline-none placeholder:text-slate-300"
                placeholder="••••••••" 
              />
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-midnight text-white py-4 rounded-2xl text-sm font-black uppercase tracking-[0.15em] hover:bg-slate-900 transition-all shadow-xl shadow-midnight/10 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? 'Processing...' : <><LogIn className="w-4 h-4" /> Open Workspace</>}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-sm font-medium text-slate-500">
              New lead? <Link href="/auth/signup" className="text-brand font-bold hover:underline inline-flex items-center gap-1">Register Workspace <ArrowRight className="w-3 h-3" /></Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
