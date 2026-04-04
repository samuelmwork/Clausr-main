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
          <button onClick={handleGoogle} 
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-2xl py-3.5 text-sm font-bold text-midnight hover:bg-slate-50 hover:shadow-sm transition-all mb-6 group active:scale-[0.98]">
            <svg width="20" height="20" viewBox="0 0 24 24" className="group-hover:scale-110 transition-transform"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Secure with Google
          </button>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
              <span className="bg-white px-4">Workspace Direct</span>
            </div>
          </div>

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
