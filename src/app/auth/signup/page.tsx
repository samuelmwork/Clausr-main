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
