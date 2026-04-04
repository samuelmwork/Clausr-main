'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, daysUntil, urgencyColor, urgencyLabel, contractTypeLabel, computeContractStatus } from '@/lib/utils'
import { getUserRole, Permissions } from '@/lib/permissions'
import type { Contract } from '@/types'
import { Plus, Search, Filter, ChevronRight, FileText } from 'lucide-react'

const CONTRACT_TYPES = [
  { value: '', label: 'All types' },
  { value: 'saas', label: 'SaaS' },
  { value: 'services', label: 'Services' },
  { value: 'lease', label: 'Lease' },
  { value: 'nda', label: 'NDA' },
  { value: 'employment', label: 'Employment' },
  { value: 'other', label: 'Other' },
]

const STATUS_FILTERS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'expiring', label: 'Expiring' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-active-bg text-active-text border border-emerald-100',
  expiring: 'bg-expiring-bg text-expiring-text border border-amber-100',
  expired: 'bg-expired-bg text-expired-text border border-rose-100',
  cancelled: 'bg-cancelled-bg text-cancelled-text border border-slate-100',
  renewed: 'bg-renewed-bg text-renewed-text border border-blue-100',
}

export default function ContractsPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [userRole, setUserRole] = useState<'admin' | 'editor' | 'viewer' | null>(null)
  
  const statusFilter = searchParams.get('status') || ''
  const typeFilter = searchParams.get('type') || ''

  useEffect(() => {
    async function loadContracts() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: members } = await supabase
        .from('members').select('*, organisations(*)').eq('user_id', user.id).order('created_at', { ascending: false })
      const member = members?.[0]
      if (!member) { setLoading(false); return }

      const role = await getUserRole(supabase, member.org_id)
      setUserRole(role)

      let query = supabase
        .from('contracts')
        .select('*')
        .eq('org_id', member.org_id)
        .order('end_date', { ascending: true })

      if (typeFilter) query = query.eq('contract_type', typeFilter)
      if (searchQuery) query = query.ilike('vendor_name', `%${searchQuery}%`)

      const { data, error } = await query
      if (error) console.error('Contracts page query error:', error)

      const normalized = (data || []).map(contract => ({
        ...contract,
        status: computeContractStatus(contract.status, contract.end_date),
      }))

      const filteredByStatus = statusFilter
        ? normalized.filter(contract => {
            if (statusFilter === 'active') return contract.status === 'active'
            if (statusFilter === 'expiring') return contract.status === 'active' || contract.status === 'expiring'
            if (statusFilter === 'expired') return contract.status === 'expired'
            if (statusFilter === 'cancelled') return contract.status === 'cancelled'
            return true
          })
        : normalized

      setContracts(filteredByStatus)
      setLoading(false)
    }
    loadContracts()
  }, [statusFilter, typeFilter, searchQuery, supabase, router])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    if (searchQuery) params.set('q', searchQuery)
    else params.delete('q')
    router.push(`/contracts?${params.toString()}`)
  }

  function updateFilter(key: 'status' | 'type', value: string) {
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    if (value) params.set(key, value)
    else params.delete(key)
    if (searchQuery) params.set('q', searchQuery)
    router.push(`/contracts?${params.toString()}`)
  }

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center animate-pulse">
            <FileText className="w-6 h-6 text-slate-300" />
          </div>
          <div className="text-muted text-sm font-medium animate-pulse">Fetching your contracts...</div>
        </div>
      </div>
    )
  }

  const canAdd = Permissions.canAddContract(userRole)

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-midnight tracking-tight">Contracts</h1>
          <p className="text-muted text-sm mt-1">You have <span className="text-midnight font-bold">{contracts.length}</span> active vendor contracts.</p>
        </div>
        {canAdd && (
          <Link href="/contracts/new"
            className="bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-dark transition-all flex items-center gap-2 shadow-lg shadow-brand/20 active:scale-[0.98]">
            <Plus className="w-4 h-4" />
            <span>New contract</span>
          </Link>
        )}
      </div>

      {/* Modern Filter Section */}
      <div className="bg-white border border-slate-200/60 rounded-[2rem] p-4 mb-8 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <form onSubmit={handleSearch} className="relative w-full md:flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            name="q"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vendor name or keyword…"
            className="w-full bg-slate-50 border-none rounded-2xl pl-11 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all placeholder:text-slate-400 outline-none"
          />
        </form>
        
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100">
            {STATUS_FILTERS.slice(0, 4).map(f => (
              <button
                key={f.value}
                onClick={() => updateFilter('status', f.value)}
                className={`text-[11px] px-4 py-1.5 rounded-xl font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  statusFilter === f.value 
                    ? 'bg-white text-brand shadow-sm ring-1 ring-slate-200' 
                    : 'text-slate-500 hover:text-midnight'
                }`}>
                {f.label.split(' ')[0]}
              </button>
            ))}
          </div>
          
          <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block" />
          
          <select
            value={typeFilter}
            onChange={(e) => updateFilter('type', e.target.value)}
            className="bg-slate-50 border-none rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer">
            {CONTRACT_TYPES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-white border border-slate-200/60 rounded-[2rem] py-32 text-center px-8 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-100">
            <Search className="w-10 h-10 text-slate-200" />
          </div>
          <h3 className="text-midnight font-display font-bold text-xl mb-2">No contracts found</h3>
          <p className="text-muted text-sm max-w-sm mx-auto mb-10 font-medium">Try adjusting your search or filters to find what you&apos;re looking for.</p>
          {canAdd && (
            <Link href="/contracts/new" className="inline-flex bg-brand text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-brand-dark transition-all shadow-xl shadow-brand/20">
              Create a new contract
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200/60 rounded-[2rem] overflow-hidden shadow-sm">
          {/* Table for Desktop */}
          <table className="w-full text-left border-collapse hidden md:table">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Vendor & Service</th>
                <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Value (Annual)</th>
                <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Renewal Date</th>
                <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Timeline</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {contracts.map(c => {
                const days = daysUntil(c.end_date)
                return (
                  <tr key={c.id} className="group hover:bg-slate-50/50 transition-all">
                    <td className="px-8 py-5">
                      <Link href={`/contracts/${c.id}`} className="block">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-brand/10 group-hover:text-brand transition-all">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-midnight group-hover:text-brand transition-colors">{c.vendor_name}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{contractTypeLabel(c.contract_type)}</p>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-8 py-5 font-bold text-slate-700">
                      {c.value_annual ? formatCurrency(c.value_annual, c.currency) : <span className="text-slate-300 font-medium">—</span>}
                    </td>
                    <td className="px-8 py-5 font-medium text-slate-600 text-sm">
                      {formatDate(c.end_date)}
                    </td>
                    <td className="px-8 py-5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${STATUS_COLORS[c.status] || ''}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${urgencyColor(days)} shadow-sm whitespace-nowrap`}>
                        {urgencyLabel(days)}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <Link href={`/contracts/${c.id}`} className="p-2 rounded-xl hover:bg-slate-100 transition-all inline-block">
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-midnight transition-colors" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Cards for Mobile */}
          <div className="md:hidden divide-y divide-slate-50">
            {contracts.map(c => {
              const days = daysUntil(c.end_date)
              return (
                <Link key={c.id} href={`/contracts/${c.id}`}
                  className="flex flex-col gap-4 p-6 hover:bg-slate-50/50 transition-all active:bg-slate-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-midnight">{c.vendor_name}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{contractTypeLabel(c.contract_type)}</p>
                      </div>
                    </div>
                    <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${STATUS_COLORS[c.status] || ''}`}>
                      {c.status}
                    </div>
                  </div>
                  
                  <div className="flex items-end justify-between mt-2">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Value & Growth</p>
                      <p className="font-bold text-midnight">{c.value_annual ? formatCurrency(c.value_annual, c.currency) : '—'}</p>
                    </div>
                    <div className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg ${urgencyColor(days)} shadow-sm`}>
                      {urgencyLabel(days)}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
