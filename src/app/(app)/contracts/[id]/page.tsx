import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate, daysUntil, urgencyColor, urgencyLabel, contractTypeLabel } from '@/lib/utils'
import ContractActions from './ContractActions'
import { FileText } from 'lucide-react'

export default async function ContractDetailPage({ params, searchParams }: {
  params: { id: string }
  searchParams: { action?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  if (!params?.id || params.id === 'undefined') {
    console.error('Invalid contract id param:', params)
    notFound()
  }

  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', params.id)
    .single()
  if (contractError) {
    console.error('Contract detail query error:', contractError)
  }
  if (!contract) notFound()

  const { data: member } = await supabase
    .from('members')
    .select('org_id, role, organisations!inner(plan)')
    .eq('user_id', user.id)
    .eq('org_id', contract.org_id)
    .single()

  if (!member) notFound()

  const org = (member as { organisations?: { plan?: string } }).organisations
  const plan = org?.plan || 'free'
  const isPaidPlan = plan !== 'free'

  const { data: activity, error: activityError } = await supabase
    .from('activity_log')
    .select('*')
    .eq('contract_id', params.id)
    .order('created_at', { ascending: false })
    .limit(10)
  if (activityError) {
    console.error('Activity log query error:', activityError)
  }

  const days = daysUntil(contract.end_date)
  const canEdit = member.role === 'admin' || member.role === 'editor'

  const infoRows = [
    { label: 'Vendor', value: contract.vendor_name },
    { label: 'Type', value: contractTypeLabel(contract.contract_type) },
    { label: 'Annual value', value: contract.value_annual ? formatCurrency(contract.value_annual, contract.currency) : '—' },
    { label: 'Start date', value: contract.start_date ? formatDate(contract.start_date) : '—' },
    { label: 'End date', value: formatDate(contract.end_date) },
    { label: 'Notice period', value: `${contract.notice_days} days` },
    { label: 'Auto-renews', value: contract.auto_renews ? 'Yes — action required' : 'No' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/contracts" className="text-muted hover:text-slate-600">Contracts</Link>
        <span className="text-gray-300">/</span>
        <span className="text-slate-700 font-medium">{contract.vendor_name}</span>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        <div className="md:col-span-2 space-y-5">
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-navy">{contract.vendor_name}</h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs bg-gray-100 text-slate-600 px-2 py-1 rounded-full">{contractTypeLabel(contract.contract_type)}</span>
                  {contract.auto_renews && <span className="text-xs bg-expiring-bg text-expiring-text px-2 py-1 rounded-full">Auto-renews</span>}
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${urgencyColor(days)}`}>{urgencyLabel(days)}</span>
                </div>
              </div>
              {canEdit && (
                <Link href={`/contracts/${contract.id}/edit`}
                  className="text-sm border border-border px-3 py-1.5 rounded-lg text-slate-600 hover:bg-page transition-colors">
                  Edit
                </Link>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-3">
              {infoRows.map(row => (
                <div key={row.label}>
                  <dt className="text-xs text-muted mb-0.5">{row.label}</dt>
                  <dd className="text-sm font-medium text-navy">{row.value}</dd>
                </div>
              ))}
            </dl>

            {isPaidPlan && contract.notes && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted mb-1">Notes</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{contract.notes}</p>
              </div>
            )}

            {isPaidPlan && contract.file_url && (
              <div className="mt-4 pt-4 border-t border-border">
                <a href={contract.file_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-brand hover:underline">
                  <FileText className="w-4 h-4" /> {contract.file_name || 'View contract PDF'}
                </a>
              </div>
            )}
          </div>

          {activity && activity.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-5">
              <h2 className="font-semibold text-navy mb-4 text-sm">Activity</h2>
              <div className="space-y-3">
                {activity.map((log: { id: string; action: string; created_at: string; profiles?: { full_name?: string } }) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm text-slate-700">{log.action}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {log.profiles?.full_name && `${log.profiles.full_name} · `}
                        {formatDate(log.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {member.role !== 'viewer' && (
            <ContractActions
              contractId={contract.id}
              status={contract.status}
              orgId={contract.org_id}
              defaultAction={searchParams.action}
            />
          )}

          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="font-semibold text-navy mb-3 text-sm">Alert schedule</h2>
            <div className="space-y-2">
              {[90, 60, 30, 14, 7, 1].map(d => {
                const alertDate = new Date(contract.end_date)
                alertDate.setDate(alertDate.getDate() - d)
                const isPast = alertDate < new Date()
                const isToday = alertDate.toDateString() === new Date().toDateString()
                return (
                  <div key={d} className={`flex items-center justify-between text-xs ${isPast ? 'opacity-40' : ''}`}>
                    <span className={`font-medium ${isPast ? 'text-muted' : 'text-navy'}`}>{d} days before</span>
                    <span className={isPast ? 'text-muted' : 'text-slate-600'}>{formatDate(alertDate.toISOString())}</span>
                    {isToday && !isPast && <span className="text-xs bg-expiring-bg text-expiring-text px-1.5 py-0.5 rounded-full">Today</span>}
                    {!isToday && <span className={isPast ? 'text-muted' : 'text-muted'}>{isPast ? 'Sent' : 'Scheduled'}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
