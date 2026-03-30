'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, daysUntil, urgencyColor, urgencyLabel, contractTypeLabel, computeContractStatus } from '@/lib/utils'
import { getUserRole, Permissions } from '@/lib/permissions'
import type { Contract } from '@/types'

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
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'expiring', label: 'Expiring' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-active-bg text-active-text',
  expiring: 'bg-expiring-bg text-expiring-text',
  expired: 'bg-expired-bg text-expired-text',
  cancelled: 'bg-cancelled-bg text-cancelled-text',
  renewed: 'bg-renewed-bg text-renewed-text',
}

export default function ContractsPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [userRole, setUserRole] = useState<'admin' | 'editor' | 'viewer' | null>(null)
  const [orgId, setOrgId] = useState('')

  const statusFilter = searchParams.get('status') || ''
  const typeFilter = searchParams.get('type') || ''

  useEffect(() => {
    async function loadContracts() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      console.log('DEBUG: Auth user:', user?.id || 'No user')
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: members } = await supabase
        .from('members').select('*, organisations(*)').eq('user_id', user.id).order('created_at', { ascending: false })
      const member = members?.[0]
      console.log('DEBUG: Member:', member)
      if (!member) {
        console.error('No member/org found')
        setLoading(false)
        return
      }

      setOrgId(member.org_id)

      const role = await getUserRole(supabase, member.org_id)
      setUserRole(role)

      const { data: rawContracts } = await supabase
        .from('contracts')
        .select('*', { count: 'exact' })
        .eq('org_id', member.org_id)
      console.log('DEBUG: Raw contracts count for org', member.org_id, ':', rawContracts?.length || 0)

      let query = supabase
        .from('contracts')
        .select('*')
        .eq('org_id', member.org_id)
        .order('end_date', { ascending: true })

      if (typeFilter) query = query.eq('contract_type', typeFilter)
      if (searchQuery) query = query.ilike('vendor_name', `%${searchQuery}%`)

      const { data, error } = await query
      console.log('DEBUG: Filtered contracts:', data?.length || 0, 'Error:', error)
      console.log('DEBUG: Filters - status:', statusFilter, 'type:', typeFilter, 'search:', searchQuery)
      if (error) {
        console.error('Contracts page query error:', error)
      }

      const normalized = (data || []).map(contract => ({
        ...contract,
        status: computeContractStatus(contract.status, contract.end_date),
      }))

      const statusCounts = normalized.reduce((acc, contract) => {
        acc[contract.status] = (acc[contract.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      console.log('DEBUG: Status counts:', statusCounts)

      const filteredByStatus = statusFilter
        ? normalized.filter(contract => {
            if (statusFilter === 'active') {
              return contract.status === 'active'
            }
            if (statusFilter === 'expiring') {
              return contract.status === 'active' || contract.status === 'expiring'
            }
            if (statusFilter === 'expired') {
              return contract.status === 'expired'
            }
            if (statusFilter === 'cancelled') {
              return contract.status === 'cancelled'
            }
            return true
          })
        : normalized

      console.log('DEBUG: Filtered by status', statusFilter, filteredByStatus.length)
      setContracts(filteredByStatus)

      setLoading(false)
    }
    loadContracts()
  }, [statusFilter, typeFilter, searchQuery, supabase, router])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    if (searchQuery) {
      params.set('q', searchQuery)
    } else {
      params.delete('q')
    }
    router.push(`/contracts?${params.toString()}`)
  }

  function updateFilter(key: 'status' | 'type', value: string) {
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    if (searchQuery) params.set('q', searchQuery)
    router.push(`/contracts?${params.toString()}`)
  }

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-center py-16">
          <div className="text-muted text-sm">Loading contracts...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-navy">Contracts</h1>
          <p className="text-muted text-sm mt-0.5">{contracts.length} contracts</p>
        </div>
        {Permissions.canAddContract(userRole) && (
          <Link href="/contracts/new"
            className="bg-brand text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-dark transition-colors">
            + Add contract
          </Link>
        )}
      </div>

      <div className="bg-surface border border-border rounded-xl p-4 mb-5 flex flex-wrap gap-3 items-center">
        <form onSubmit={handleSearch} className="flex-1 min-w-48">
          <input
            name="q"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vendor name…"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent" />
        </form>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => updateFilter('status', f.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                statusFilter === f.value
                  ? 'bg-brand text-white' : 'bg-gray-100 text-slate-600 hover:bg-gray-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={typeFilter}
          onChange={(e) => updateFilter('type', e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent">
          {CONTRACT_TYPES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {contracts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted text-sm mb-4">No contracts found.</p>
            {Permissions.canAddContract(userRole) && (
              <Link href="/contracts/new" className="bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
                Add your first contract
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-page border-b border-border">
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted uppercase tracking-wide">Vendor</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted uppercase tracking-wide">Type</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted uppercase tracking-wide">Value/yr</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted uppercase tracking-wide">End date</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted uppercase tracking-wide">Days left</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contracts.map(c => {
                const days = daysUntil(c.end_date)
                return (
                  <tr key={c.id} className="hover:bg-page transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-navy text-sm">{c.vendor_name}</span>
                        {c.auto_renews && <span className="text-xs bg-expiring-bg text-expiring-text px-1.5 py-0.5 rounded-full">Auto</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs bg-gray-100 text-slate-600 px-2 py-1 rounded-full">{contractTypeLabel(c.contract_type)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-700">
                      {c.value_annual ? formatCurrency(c.value_annual, c.currency) : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{formatDate(c.end_date)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[c.status] || ''}`}>
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${urgencyColor(days)}`}>
                        {urgencyLabel(days)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/contracts/${c.id}`} className="text-sm text-brand hover:underline font-medium">
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
