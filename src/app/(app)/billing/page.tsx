import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RazorpayButton from './RazorpayButton'
import { Permissions, type Role } from '@/lib/permissions'
import { CreditCard, Check, Sparkles, ShieldCheck } from 'lucide-react'

const PLANS = [
  {
    id: 'free', 
    name: 'Free', 
    price: 0, 
    priceLabel: '₹0', 
    period: '/ month',
    description: 'Perfect for individuals starting out.',
    features: [
      { text: '1 User access', live: true },
      { text: 'Track up to 2 contracts', live: true },
      { text: 'Renewal email alerts (1 day)', live: true },
      { text: 'Global calendar view', live: true },
      { text: 'Basic dashboard stats', live: true },
    ],
    highlight: false,
  },
  {
    id: 'starter', 
    name: 'Starter', 
    priceLabel: '₹399', 
    period: '/ month',
    description: 'For founders who need precision control.',
    features: [
      { text: '2 User accounts', live: true },
      { text: 'Up to 10 contracts', live: true },
      { text: 'PDF / DOCX uploads', live: true },
      { text: 'Smart multi-renewal alerts', live: true },
      { text: 'Full financial overview', live: true },
    ],
    highlight: true,
  },
  {
    id: 'pro', 
    name: 'Pro', 
    priceLabel: '₹799', 
    period: '/ month',
    description: 'For teams scaling their operations.',
    features: [
      { text: 'Up to 25 contracts', live: true },
      { text: 'Up to 5 team members', live: true },
      { text: 'Shared workspace + collab', live: true },
      { text: 'Priority dashboard analysis', live: true },
      { text: 'Everything in Starter', live: true },
      { text: 'WhatsApp alerts (beta)', live: false },
    ],
    highlight: false,
  },
]

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: members } = await supabase
    .from('members').select('org_id, role, organisations(*)').eq('user_id', user.id).order('created_at', { ascending: false })
  const member = members?.[0]
  if (!member) redirect('/auth/login')

  const org = (member as { organisations?: { name?: string; plan?: string; contract_limit?: number } }).organisations
  const currentPlan = org?.plan || 'free'

  const userRole = member.role as Role
  const canManageBilling = Permissions.canManageBilling(userRole)
  if (!canManageBilling) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-white border border-slate-200/60 rounded-[2rem] p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-rose-500">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-display font-bold text-midnight mb-2 tracking-tight">Access Restricted</h1>
          <p className="text-slate-600 mb-8 max-w-sm mx-auto">
            Only administrators are authorized to manage billing and subscription settings.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex bg-brand text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand/20"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const { count: contractCount } = await supabase
    .from('contracts')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', member.org_id)
    .neq('status', 'cancelled')

  const usedContracts = Number(contractCount || 0)
  const contractLimit = org?.contract_limit || 2
  const isProPlan = currentPlan === 'pro'
  const usageDisplay = isProPlan ? `${usedContracts}` : `${usedContracts} of ${contractLimit}`
  const usagePercent = (Number(contractCount) || 0) / contractLimit

  const usageBarColor = usagePercent >= 1 ? 'bg-rose-500' : usagePercent > 0.8 ? 'bg-amber-400' : 'bg-brand'

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-midnight tracking-tight">Billing & Plan</h1>
        <p className="text-muted text-sm mt-1">Manage your professional subscription and usage.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
        {/* Current Plan Overview */}
        <div className="lg:col-span-2 bg-midnight rounded-[2rem] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-[0.2em] mb-2">Current Active Subscription</p>
              <h2 className="text-white text-3xl font-display font-bold tracking-tight capitalize">{currentPlan} Plan</h2>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">Active Status</span>
                <span className="text-white/40 text-[10px] font-medium tracking-wide">Next billing date: Coming soon</span>
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <Sparkles className="w-7 h-7" />
            </div>
          </div>

          <div className="relative z-10 mt-8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white text-sm font-bold tracking-tight">Contract Usage</p>
              <p className="text-slate-400 text-sm font-medium">{usageDisplay} contracts</p>
            </div>
            <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div
                className={`h-full ${usageBarColor} rounded-full transition-all duration-1000 ease-out shadow-lg`}
                style={{ width: `${Math.min(100, usagePercent * 100)}%` }}
              />
            </div>
            {!isProPlan && (Number(contractCount) || 0) >= contractLimit && (
              <p className="text-rose-400 text-[10px] font-bold uppercase tracking-wider mt-3">Usage limit reached. Please upgrade to continue adding contracts.</p>
            )}
          </div>
        </div>

        {/* Payment History Peek / Card */}
        <div className="bg-white border border-slate-200/60 rounded-[2rem] p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-6 border border-slate-100">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-midnight font-display font-bold text-lg mb-1 tracking-tight">Secure Payments</h3>
            <p className="text-muted text-sm leading-relaxed">Transactions are handled via Razorpay with industry-standard 256-bit encryption.</p>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6">Payment Method: Razorpay</p>
        </div>
      </div>

      <div className="mb-8 text-center sm:text-left">
        <h2 className="text-2xl font-display font-bold text-midnight tracking-tight">Select your plan</h2>
        <p className="text-muted text-sm mt-1">Upgrade to unlock higher limits and advanced automation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {PLANS.map(plan => (
          <div key={plan.id}
            className={`rounded-[2.5rem] p-1 flex flex-col transition-all duration-300 ${
              plan.highlight 
                ? 'bg-gradient-to-b from-indigo-500 via-indigo-600 to-indigo-700 shadow-2xl shadow-indigo-500/20 scale-105 z-10' 
                : 'bg-slate-200 shadow-sm border border-transparent'
            }`}>
            <div className={`flex-1 rounded-[2.3rem] p-8 md:p-10 flex flex-col ${
              plan.highlight ? 'bg-white' : 'bg-slate-50'
            }`}>
              <div className="flex items-center justify-between mb-8">
                <div className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full ${
                  plan.highlight ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200/50 text-slate-500'
                }`}>
                  {plan.id === currentPlan ? 'Active Plan' : plan.id === 'starter' ? 'Best Value' : 'Standard'}
                </div>
                {plan.highlight && <Sparkles className="w-5 h-5 text-indigo-500 fill-indigo-500/20" />}
              </div>

              <div className="mb-10">
                <h3 className="text-2xl font-display font-bold text-midnight tracking-tight">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-4xl font-display font-extrabold text-midnight tracking-tighter">{plan.priceLabel}</span>
                  <span className="text-slate-400 font-semibold text-sm">{plan.period}</span>
                </div>
                <p className="text-slate-500 text-sm mt-4 leading-relaxed font-medium">{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-12 flex-1">
                {plan.features.map(f => (
                  <li key={f.text} className="flex items-start gap-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      f.live ? (plan.highlight ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500') : 'bg-slate-100 text-slate-300'
                    }`}>
                      {f.live ? <Check className="w-3 h-3" strokeWidth={4} /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                    </div>
                    <span className={`text-sm font-semibold tracking-tight ${
                      f.live ? 'text-slate-600' : 'text-slate-400 italic'
                    }`}>
                      {f.text}
                      {!f.live && <span className="ml-1 text-[9px] uppercase tracking-tighter opacity-70">(soon)</span>}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-8">
                {plan.id === currentPlan ? (
                  <div className={`w-full text-center text-sm font-bold py-4 rounded-2xl border ${
                    plan.highlight ? 'border-indigo-100 bg-indigo-50 text-indigo-600' : 'border-slate-200 bg-white text-slate-800'
                  }`}>
                    Current Subscription
                  </div>
                ) : plan.id === 'free' ? (
                   <div className="w-full text-center text-xs font-bold py-4 rounded-2xl text-slate-400 bg-slate-100 cursor-not-allowed">
                    Downgrade unavailable
                  </div>
                ) : (
                  <RazorpayButton
                    planId={plan.id}
                    planName={plan.name}
                    orgId={member.org_id}
                    userEmail={user.email || ''}
                    userName={user.user_metadata?.full_name || ''}
                    currentPlan={currentPlan}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 pt-8 border-t border-slate-100 text-center">
        <p className="text-slate-400 text-xs font-medium max-w-xl mx-auto leading-relaxed">
          Need a custom plan for a larger organization? <br className="hidden sm:block" />
          Contact us at <a href="mailto:support.clausr@gmail.com" className="text-brand font-bold hover:underline">support.clausr@gmail.com</a> for enterprise options.
        </p>
      </div>
    </div>
  )
}
