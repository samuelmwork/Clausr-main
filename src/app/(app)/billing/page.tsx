import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RazorpayButton from './RazorpayButton'
import { Permissions, type Role } from '@/lib/permissions'
import { CreditCard, Check } from 'lucide-react'

const PLANS = [
  {
    id: 'free', 
    name: 'FREE', 
    price: 0, 
    priceLabel: '₹0 / month', 
    period: '',
    description: 'Try it. No card. No risk.',
    features: [
      { text: '1 user', live: true },
      { text: 'Track up to 5 contracts', live: true },
      { text: 'Renewal email alerts', live: true },
      { text: 'Calendar view', live: true },
      { text: 'Dashboard overview', live: true },
    ],
    highlight: false,
  },
  {
    id: 'starter', 
    name: 'STARTER', 
    priceLabel: '₹999 / month', 
    period: '',
    description: 'For founders who want control without chaos.',
    features: [
      { text: '2 Users', live: true },
      { text: 'Up to 25 contracts', live: true },
      { text: 'Upload PDF / DOCX contracts', live: true },
      { text: 'Smart renewal alerts (90/60/30/14/7/1 days)', live: true },
      { text: 'Dashboard + overall spend', live: true },
    ],
    highlight: true,
  },
  {
    id: 'pro', 
    name: 'PRO', 
    priceLabel: '₹1,999 / month', 
    period: '',
    description: 'For growing teams managing contracts together.',
    features: [
      { text: 'Unlimited contracts', live: true },
      { text: 'Up to 5 team members', live: true },
      { text: 'Assign contract owners', live: true },
      { text: 'Shared workspace for ops + finance', live: true },
      { text: 'Everything in Starter', live: true },
      { text: 'CSV import', live: false },
      { text: 'WhatsApp renewal alerts', live: false },
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
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-surface border border-border rounded-xl p-6">
          <h1 className="text-2xl font-bold text-navy mb-2">Permission Denied</h1>
          <p className="text-sm text-slate-600 mb-4">
            Visitors do not have access to billing settings.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-brand text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-dark transition-colors"
          >
            Go to Dashboard
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
  const contractLimit = org?.contract_limit || 5
  const isProPlan = currentPlan === 'pro'
  const usageDisplay = isProPlan ? `${usedContracts}` : `${usedContracts} / ${contractLimit}`
  const usagePercent = (Number(contractCount) || 0) / contractLimit

  const usageBarColor = usagePercent >= 1 ? 'bg-red-500' : usagePercent > 0.8 ? 'bg-amber-400' : 'bg-brand'

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-5 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-navy">Billing & Plan</h1>
        <p className="text-muted text-sm mt-0.5">Manage your subscription</p>
      </div>

      <div className="bg-navy rounded-xl p-5 mb-5 md:mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <p className="text-white/60 text-xs md:text-sm mb-1">Current plan</p>
          <p className="text-white text-xl md:text-2xl font-bold capitalize">{currentPlan}</p>
          <p className="text-white/60 text-xs md:text-sm mt-1">
            {usageDisplay} contracts used
          </p>
        </div>
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-surface/10 flex items-center justify-center shrink-0">
          <CreditCard className="w-6 h-6 md:w-7 md:h-7 text-white" />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4 md:p-5 mb-5 md:mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs md:text-sm font-medium text-slate-700">Contract usage</span>
          <span className="text-xs md:text-sm text-muted">{usageDisplay}</span>
        </div>
        {!isProPlan && (
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${usageBarColor} rounded-full transition-all`}
              style={{ width: `${Math.min(100, usagePercent * 100)}%` }}
            />
          </div>
        )}
        {!isProPlan && (Number(contractCount) || 0) >= contractLimit && (
          <p className="text-xs text-red-600 mt-2">Limit reached. Upgrade to add more contracts.</p>
        )}
      </div>

      <div className="mb-3">
        <h2 className="text-lg font-semibold text-navy">Choose your plan</h2>
        <p className="text-sm text-muted mt-1">Simple pricing with clear limits and room to grow.</p>
      </div>

      <div className="grid gap-4 md:gap-6 md:grid-cols-2 xl:grid-cols-3 mb-10">
        {PLANS.map(plan => (
          <div key={plan.id}
            className={`rounded-2xl border p-5 md:p-6 shadow-sm flex flex-col min-h-[480px] md:min-h-[520px] ${
              plan.id === currentPlan
                ? 'border-brand bg-blue-50/60'
                : plan.highlight
                ? 'border-brand bg-surface'
                : 'border-border bg-surface'
            }`}>
            <div className="flex items-center gap-2 min-h-7 mb-4">
              {plan.id === 'starter' && (
                <div className="text-xs bg-brand text-white px-2.5 py-1 rounded-full inline-block font-medium">Most Popular</div>
              )}
              {plan.id === currentPlan && (
                <div className="text-xs bg-active-bg text-active-text px-2.5 py-1 rounded-full inline-block font-medium">Current</div>
              )}
            </div>

            <div className="mb-5">
              <div className="font-bold text-navy text-3xl tracking-tight">{plan.name}</div>
              <div className="text-3xl font-bold text-brand mt-2">{plan.priceLabel}</div>
              <p className="text-sm text-muted mt-3 leading-relaxed">{plan.description}</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map(f => (
                <li key={f.text} className="text-sm flex items-start gap-2">
                  {f.live ? (
                    <span className="text-green-500 mt-0.5 shrink-0"><Check className="w-4 h-4" /></span>
                  ) : (
                    <span className="text-amber-400 text-xs mt-0.5 shrink-0">◷</span>
                  )}
                  <span className={f.live ? 'text-slate-600 leading-6' : 'text-muted italic leading-6'}>
                    {f.text}
                    {!f.live && ' — soon'}
                  </span>
                </li>
              ))}
            </ul>

            {plan.id === 'free' ? (
              currentPlan === 'free' ? (
                <div className="text-center text-sm text-active-text font-semibold py-3 bg-active-bg rounded-xl mt-auto">✓ Current Plan</div>
              ) : (
                <div className="text-center text-sm text-muted py-3 bg-page border border-border rounded-xl mt-auto cursor-not-allowed">Downgrade not available</div>
              )
            ) : plan.id === currentPlan ? (
              <div className="flex flex-col gap-2 mt-auto">
                <div className="text-center text-sm text-active-text font-semibold py-3 bg-active-bg rounded-xl">✓ Active Plan</div>
              </div>
            ) : (
              <div className="mt-auto">
                <RazorpayButton
                  planId={plan.id}
                  planName={plan.name}
                  orgId={member.org_id}
                  userEmail={user.email || ''}
                  userName={user.user_metadata?.full_name || ''}
                  currentPlan={currentPlan}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-sm text-muted text-center mt-2">
        Payments are processed securely via Razorpay. No card details stored on our servers.
        Cancel anytime by emailing <a href="mailto:support.clausr@gmail.com" className="text-brand hover:underline">support.clausr@gmail.com</a>
      </p>
    </div>
  )
}
