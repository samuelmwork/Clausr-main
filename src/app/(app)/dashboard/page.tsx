import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate, daysUntil, urgencyColor, urgencyLabel, contractTypeLabel, computeContractStatus } from '@/lib/utils'
import { Permissions, type Role } from '@/lib/permissions'
import type { Contract } from '@/types'

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
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-navy">Dashboard</h1>
          <p className="text-muted text-sm mt-0.5">Your vendor contract overview</p>
        </div>
        {canAddContract && (
          <Link href="/contracts/new"
            className="bg-brand text-white px-3 py-2 md:px-4 md:py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-dark transition-colors flex items-center gap-1.5">
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">Add contract</span>
            <span className="sm:hidden">Add</span>
          </Link>
        )}
      </div>

      {org && stats.total >= (org.contract_limit || 5) * 0.8 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-amber-800 text-sm">
            <strong>Heads up:</strong> You&apos;re using {stats.total} of {org.contract_limit} contracts on your {org.plan} plan.
          </p>
          <Link href="/billing" className="text-sm font-semibold text-amber-800 underline">Upgrade</Link>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-5 md:mb-6">
        {[
          { label: 'Total', value: stats.total, bg: 'bg-surface', border: 'border-border', text: 'text-navy' },
          { label: 'Active', value: stats.active, bg: 'bg-active-bg', border: 'border-border', text: 'text-active-text' },
          { label: 'Expiring', value: stats.expiring, bg: 'bg-expiring-bg', border: 'border-border', text: 'text-expiring-text' },
          { label: 'Expired', value: stats.expired, bg: 'bg-expired-bg', border: 'border-border', text: 'text-expired-text' },
          { label: 'This month', value: stats.thisMonth, bg: 'bg-brand-light', border: 'border-border', text: 'text-brand' },
          ...(org?.plan !== 'free' ? [{ label: 'Annual spend', value: formatCurrency(stats.totalSpend), bg: 'bg-surface', border: 'border-border', text: 'text-navy', small: true }] : []),
        ].map(card => (
          <div key={card.label} className={`${card.bg} ${card.border} border rounded-xl p-3 md:p-4`}>
            <div className={`${card.text} ${'small' in card ? 'text-base md:text-lg' : 'text-xl md:text-2xl'} font-bold`}>{card.value}</div>
            <div className="text-[10px] md:text-xs text-muted mt-0.5 md:mt-1 leading-tight">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-navy text-sm">Upcoming renewals</h2>
          <Link href="/contracts" className="text-sm text-brand hover:underline">View all →</Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted text-sm mb-4">No upcoming renewals</p>
            {canAddContract ? (
              <Link href="/contracts/new" className="bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-dark transition-colors">
                Add your first contract
              </Link>
            ) : (
              <p className="text-sm text-muted">You do not have permission to add contracts.</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {upcoming.map(c => {
              const days = daysUntil(c.end_date)
              return (
                <Link key={c.id} href={`/contracts/${c.id}`}
                  className="flex items-center gap-3 px-4 md:px-5 py-3.5 md:py-4 hover:bg-page transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-navy text-sm truncate group-hover:text-brand">{c.vendor_name}</span>
                      <span className="hidden sm:inline text-xs bg-gray-100 text-slate-600 px-2 py-0.5 rounded-full flex-shrink-0">{contractTypeLabel(c.contract_type)}</span>
                      {c.auto_renews && <span className="hidden sm:inline text-xs bg-expiring-bg text-expiring-text px-2 py-0.5 rounded-full flex-shrink-0">Auto</span>}
                    </div>
                    <div className="text-xs text-muted mt-0.5">Ends {formatDate(c.end_date)}</div>
                  </div>
                  <div className="hidden sm:block text-sm text-slate-700 font-medium flex-shrink-0">
                    {c.value_annual ? formatCurrency(c.value_annual, c.currency) : '—'}
                  </div>
                  <div className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${urgencyColor(days)}`}>
                    {urgencyLabel(days)}
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
