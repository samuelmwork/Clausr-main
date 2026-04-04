import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate, daysUntil, urgencyColor, urgencyLabel, contractTypeLabel } from '@/lib/utils'
import ContractActions from './ContractActions'
import { FileText, ChevronLeft, Calendar, User, Building2, Clock, CheckCircle2, History } from 'lucide-react'

export default async function ContractDetailPage({ params, searchParams }: {
  params: { id: string } | Promise<{ id: string }>
  searchParams: { action?: string } | Promise<{ action?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const resolvedParams = await params
  if (!resolvedParams?.id || resolvedParams.id === 'undefined') {
    notFound()
  }

  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', resolvedParams.id)
    .single()
  
  if (contractError || !contract) notFound()

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
  const resolvedSearchParams = await searchParams

  const { data: activity } = await supabase
    .from('activity_log')
    .select('*, profiles(full_name)')
    .eq('contract_id', resolvedParams.id)
    .order('created_at', { ascending: false })
    .limit(8)

  const days = daysUntil(contract.end_date)
  const canEdit = member.role === 'admin' || member.role === 'editor'
  
  const statusLabel = contract.status === 'renewed' ? 'Renewed' : urgencyLabel(days)
  const statusColor = contract.status === 'renewed'
    ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
    : urgencyColor(days)

  let fileHref = contract.file_url
  if (fileHref) {
    const match = fileHref.match(/\/public\/contracts\/(.+)$/)
    const path = match ? match[1] : fileHref
    const { data: signed } = await supabase.storage.from('contracts').createSignedUrl(path, 60 * 60)
    if (signed?.signedUrl) fileHref = signed.signedUrl
  }

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 mb-8 text-sm font-medium">
        <Link href="/contracts" className="text-slate-400 hover:text-brand transition-colors flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          Contracts
        </Link>
        <span className="text-slate-200">/</span>
        <span className="text-midnight truncate max-w-[200px]">{contract.vendor_name}</span>
      </nav>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          {/* Main Info Card */}
          <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 md:p-10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-slate-50/50 rounded-bl-[100px] -z-10" />
            
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border ${statusColor}`}>
                    {statusLabel}
                  </span>
                  {contract.auto_renews && (
                    <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      Auto-Renewal
                    </span>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-black text-midnight tracking-tight leading-tight">
                  {contract.vendor_name}
                </h1>
                <p className="text-slate-500 font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  {contractTypeLabel(contract.contract_type)} Vendor Contract
                </p>
              </div>

              {canEdit && (
                <Link href={`/contracts/${contract.id}/edit`}
                  className="inline-flex items-center gap-2 bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold border border-slate-200 hover:bg-white hover:shadow-md transition-all active:scale-[0.98]">
                  Edit details
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 border-t border-slate-100 pt-10">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Annual Expenditure</p>
                <p className="text-xl font-display font-black text-midnight">
                  {contract.value_annual ? formatCurrency(contract.value_annual, contract.currency) : '—'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Renewal Cycle Ends</p>
                <p className="text-xl font-display font-black text-midnight">
                  {formatDate(contract.end_date)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Notice Window</p>
                <p className="text-xl font-display font-black text-midnight">
                  {contract.notice_days} Days
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mt-10">
               <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contract Inception</p>
                <p className="font-bold text-slate-700">{contract.start_date ? formatDate(contract.start_date) : '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Auto-Renewal Protocol</p>
                <p className="font-bold text-slate-700">{contract.auto_renews ? 'Active' : 'Manual Renegotiation'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Internal Category</p>
                <p className="font-bold text-slate-700 capitalize">{contract.contract_type}</p>
              </div>
            </div>

            {isPaidPlan && (contract.notes || contract.file_url) && (
              <div className="mt-12 space-y-6 pt-10 border-t border-slate-100">
                {contract.notes && (
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Executive Summary / Notes</h3>
                    <div className="bg-slate-50/50 rounded-2xl p-6 text-sm text-slate-700 leading-relaxed font-medium border border-slate-100">
                      {contract.notes}
                    </div>
                  </div>
                )}
                
                {contract.file_url && (
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Document Repository</h3>
                    <a href={fileHref} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 bg-white border border-slate-200 p-4 rounded-2xl hover:border-brand hover:shadow-sm transition-all group w-full sm:w-auto">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-brand transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="pr-4">
                        <p className="text-sm font-bold text-midnight truncate max-w-[240px]">{contract.file_name || 'View Core Contract PDF'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Verified Official Document</p>
                      </div>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Activity Logs Section */}
          <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 md:p-10 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-400">
                <History className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-display font-bold text-midnight tracking-tight">Audit Trail & Activity</h2>
            </div>
            
            {activity && activity.length > 0 ? (
              <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                {activity.map((log: any) => (
                  <div key={log.id} className="relative flex items-start gap-4 pl-8">
                    <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white border-4 border-slate-100 z-10 shadow-sm" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-800 font-bold tracking-tight">{log.action}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                          <User className="w-2.5 h-2.5" />
                          {log.profiles?.full_name || 'System'}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 font-medium">No recorded activity for this contract.</div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* Action Center Sidebar */}
          {member.role !== 'viewer' && (
            <div className="bg-slate-50 border border-slate-200 rounded-[2rem] overflow-hidden">
               <ContractActions
                contractId={contract.id}
                status={contract.status}
                orgId={contract.org_id}
                defaultAction={resolvedSearchParams?.action}
              />
            </div>
          )}

          {/* Alert Schedule Sidebar */}
          <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-500">
                <Clock className="w-4 h-4" />
              </div>
              <h2 className="text-base font-display font-bold text-midnight tracking-tight">Notification Protocol</h2>
            </div>
            
            <div className="space-y-4">
              {[90, 60, 30, 14, 7, 1].map(d => {
                const alertDate = new Date(contract.end_date)
                alertDate.setDate(alertDate.getDate() - d)
                const isPast = alertDate < new Date()
                const isToday = alertDate.toDateString() === new Date().toDateString()
                
                return (
                  <div key={d} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    isToday ? 'bg-indigo-50 border-indigo-200 shadow-sm' : isPast ? 'bg-slate-50/50 border-transparent opacity-50' : 'bg-white border-slate-100'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isPast ? 'bg-slate-200 text-slate-400' : 'bg-white border border-slate-200 text-midnight shadow-sm'
                      }`}>
                        {isPast ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-[10px] font-bold">{d}</span>}
                      </div>
                      <div>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${isPast ? 'text-slate-400' : 'text-slate-500'}`}>T-{d} Days</p>
                        <p className={`text-xs font-bold leading-none mt-0.5 ${isPast ? 'text-slate-400' : 'text-midnight'}`}>{formatDate(alertDate.toISOString())}</p>
                      </div>
                    </div>
                    <div>
                      {isToday && !isPast ? (
                        <span className="text-[8px] font-black bg-indigo-500 text-white px-2 py-1 rounded-md uppercase tracking-[0.15em] animate-pulse">Running</span>
                      ) : (
                        <span className={`text-[8px] font-bold uppercase tracking-[0.1em] ${isPast ? 'text-slate-300' : 'text-slate-400'}`}>
                          {isPast ? 'Transmitted' : 'Scheduled'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-[10px] text-slate-400 font-medium text-center mt-6 italic">Alerts are sent to all workspace administrators.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
