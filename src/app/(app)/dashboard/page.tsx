import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate, daysUntil, urgencyColor, urgencyLabel, contractTypeLabel, computeContractStatus } from '@/lib/utils'
import { Permissions, type Role } from '@/lib/permissions'
import type { Contract } from '@/types'
import { Plus, ArrowRight, AlertCircle, FileText } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: members } = await supabase
    .from('members').select('org_id, role, organisations(*)').eq('user_id', user.id).order('created_at', { ascending: false })
  const member = members?.[0]
  if (!member) redirect('/auth/login')

  const orgId = member.org_id
  const userRole = member.role as Role
  const canAddContract = Permissions.canAddContract(userRole)
  const { data: contracts, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('org_id', orgId)
    .neq('status', 'cancelled')
    .order('end_date', { ascending: true })

  if (error) {
    console.error('Dashboard contracts query error:', error)
  }

  const all = ((contracts || []) as Contract[]).map(contract => ({
    ...contract,
    status: computeContractStatus(contract.status, contract.end_date),
  }))
  const now = new Date()
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const stats = {
    total: all.length,
    active: all.filter(c => c.status === 'active').length,
    expiring: all.filter(c => c.status === 'expiring').length,
    expired: all.filter(c => c.status === 'expired').length,
    totalSpend: all.reduce((s, c) => s + (c.value_annual || 0), 0),
    thisMonth: all.filter(c => {
      const d = new Date(c.end_date)
      return d >= now && d <= thisMonthEnd
    }).length,
  }

  const upcoming = all.filter(c => c.status !== 'expired').slice(0, 8)

  const org = (member as { organisations?: { name?: string; plan?: string; contract_limit?: number } }).organisations

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-midnight tracking-tight">Overview</h1>
          <p className="text-muted text-sm mt-1">Manage and track your vendor contract lifecycle.</p>
        </div>
        {canAddContract && (
          <Link href="/contracts/new"
            className="bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-dark transition-all flex items-center gap-2 shadow-lg shadow-brand/20 active:scale-[0.98]">
            <Plus className="w-4 h-4" />
            <span>New contract</span>
          </Link>
        )}
      </div>

      {org && stats.total >= (org.contract_limit || 2) * 0.8 && (
        <div className="mb-8 bg-amber-50/50 backdrop-blur-sm border border-amber-200/50 rounded-2xl px-5 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
              <AlertCircle className="w-4 h-4" />
            </div>
            <p className="text-amber-900 text-sm font-medium">
              You&apos;re using <span className="font-bold">{stats.total}</span> of <span className="font-bold">{org.contract_limit}</span> contracts on your <span className="capitalize">{org.plan}</span> plan.
            </p>
          </div>
          <Link href="/billing" className="text-sm font-bold text-amber-800 hover:text-amber-950 transition-colors">Upgrade →</Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-10">
        {[
          { label: 'Total Contracts', value: stats.total, bg: 'bg-white', text: 'text-midnight' },
          { label: 'Active', value: stats.active, bg: 'bg-white', text: 'text-active-text', border: 'border-emerald-100' },
          { label: 'Expiring Soon', value: stats.expiring, bg: 'bg-white', text: 'text-expiring-text', border: 'border-amber-100' },
          { label: 'Expired', value: stats.expired, bg: 'bg-white', text: 'text-expired-text', border: 'border-rose-100' },
          { label: 'Renewals This Month', value: stats.thisMonth, bg: 'bg-brand-light/50', text: 'text-brand' },
          ...(org?.plan !== 'free' ? [{ label: 'Annual Spend', value: formatCurrency(stats.totalSpend), bg: 'bg-midnight', text: 'text-white', dark: true }] : []),
        ].map(card => (
          <div key={card.label} className={`${card.bg} ${card.border || 'border-slate-200/60'} border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group`}>
            <div className={`${card.text} font-display font-bold text-2xl tracking-tight mb-1`}>{card.value}</div>
            <div className={`text-[11px] font-bold uppercase tracking-wider ${card.dark ? 'text-slate-400' : 'text-muted'}`}>{card.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200/60 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-midnight text-lg tracking-tight">Upcoming renewals</h2>
          <Link href="/contracts" className="text-sm font-bold text-brand hover:text-brand-dark transition-colors flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        
        {upcoming.length === 0 ? (
          <div className="py-24 text-center px-8">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <FileText className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-midnight font-bold text-lg mb-1">No upcoming renewals</h3>
            <p className="text-muted text-sm mb-8 max-w-sm mx-auto">Your contracts are all up to date. Add a new one to start tracking.</p>
            {canAddContract && (
              <Link href="/contracts/new" className="inline-flex bg-brand text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand/20 active:scale-[0.98]">
                Add your first contract
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {upcoming.map(c => {
              const days = daysUntil(c.end_date)
              return (
                <Link key={c.id} href={`/contracts/${c.id}`}
                  className="flex items-center gap-6 px-8 py-5 hover:bg-slate-50/50 transition-all group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-midnight text-base truncate group-hover:text-brand transition-colors">{c.vendor_name}</span>
                      <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md group-hover:bg-brand/10 group-hover:text-brand transition-all">{contractTypeLabel(c.contract_type)}</span>
                      {c.auto_renews && (
                        <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse sm:hidden" />
                      )}
                    </div>
                    <div className="text-xs text-muted font-medium mt-1">Ends {formatDate(c.end_date)}</div>
                  </div>
                  
                  <div className="hidden md:flex flex-col items-end gap-1">
                    <div className="text-sm text-midnight font-bold">
                      {c.value_annual ? formatCurrency(c.value_annual, c.currency) : '—'}
                    </div>
                    <div className="text-[10px] text-muted font-bold tracking-wider uppercase">Annual Value</div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 min-w-[100px]">
                    <div className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${urgencyColor(days)} shadow-sm`}>
                      {urgencyLabel(days)}
                    </div>
                    {c.auto_renews && (
                      <span className="hidden sm:inline text-[9px] font-bold text-brand uppercase tracking-tighter">Auto-Renews</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
