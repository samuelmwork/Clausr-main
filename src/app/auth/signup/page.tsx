'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, ArrowRight, ShieldCheck, Mail, Building2, UserCircle2, Lock } from 'lucide-react'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')

    if (!isValidEmail(email.trim())) {
      setError('Please enter a valid business email.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setLoading(false)
      return
    }

    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: fullName, org_name: orgName },
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      router.push(`/auth/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`)
    }
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
      <div className="absolute top-0 right-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-[500px] relative z-10">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-xl shadow-indigo-500/10 border border-slate-100 flex items-center justify-center group-hover:scale-105 transition-transform">
              <img src="/Logo.png" alt="Clausr" className="w-8 h-8 object-contain" />
            </div>
            <span className="font-display font-black text-midnight text-2xl tracking-tighter">Clausr</span>
          </Link>
          <h1 className="text-3xl font-display font-black text-midnight tracking-tight leading-tight">Initialize Workspace</h1>
          <p className="text-slate-500 font-medium mt-2">Join elite operators managing $1B+ in vendor risk.</p>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 p-8 md:p-10 shadow-2xl shadow-indigo-500/5">
          <button onClick={handleGoogle} 
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-2xl py-3.5 text-sm font-bold text-midnight hover:bg-slate-50 transition-all mb-8 group active:scale-[0.98]">
            <svg width="20" height="20" viewBox="0 0 24 24" className="group-hover:scale-110 transition-transform"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Onboard via Google
          </button>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
              <span className="bg-white px-6">Direct Registration</span>
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-bold px-4 py-3 rounded-2xl flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4 shrink-0" strokeWidth={3} />
                 {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 pl-1">Legal Name</label>
                <div className="relative">
                  <UserCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input value={fullName} onChange={e => setFullName(e.target.value)} required 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-midnight shadow-inner focus:ring-2 focus:ring-brand/20 outline-none placeholder:text-slate-300"
                    placeholder="Full Name" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 pl-1">Organisation</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input value={orgName} onChange={e => setOrgName(e.target.value)} required
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-midnight shadow-inner focus:ring-2 focus:ring-brand/20 outline-none placeholder:text-slate-300"
                    placeholder="Company Name" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 pl-1">Professional Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-midnight shadow-inner focus:ring-2 focus:ring-brand/20 outline-none placeholder:text-slate-300"
                  placeholder="name@company.com" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 pl-1">Secure Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-midnight shadow-inner focus:ring-2 focus:ring-brand/20 outline-none placeholder:text-slate-300"
                  placeholder="Min. 6 Characters" />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-midnight text-white py-4 mt-6 rounded-[1.5rem] text-sm font-black uppercase tracking-[0.2em] hover:bg-slate-950 transition-all shadow-2xl shadow-midnight/20 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? 'Initializing...' : <><Sparkles className="w-4 h-4" /> Create Workspace</>}
            </button>
          </form>

          <p className="text-center text-sm font-medium text-slate-500 mt-10">
            Already registered? <Link href="/auth/login" className="text-brand font-black hover:underline inline-flex items-center gap-1">Secure Sign In <ArrowRight className="w-3 h-3" /></Link>
          </p>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Corporate Protocol compliant • SES 256 Encryption</p>
        </div>
      </div>
    </div>
  )
}
