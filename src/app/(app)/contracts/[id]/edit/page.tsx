'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Lock } from 'lucide-react'

const CONTRACT_TYPES = [
  { value: 'saas', label: 'SaaS Subscription' },
  { value: 'services', label: 'Services Agreement' },
  { value: 'lease', label: 'Lease / Rental' },
  { value: 'nda', label: 'NDA' },
  { value: 'employment', label: 'Employment' },
  { value: 'other', label: 'Other' },
]

export default function EditContractPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [plan, setPlan] = useState<string>('free')
  const [form, setForm] = useState({
    vendor_name: '', contract_type: 'saas', value_annual: '',
    currency: 'INR', start_date: '', end_date: '',
    auto_renews: false, notice_days: '30', notes: '',
  })

  const isPaidPlan = plan !== 'free'
  const contractId = params?.id || ''
  const invalidId = !contractId || contractId === 'undefined'

  useEffect(() => {
    supabase.from('members').select('org_id, organisations!inner(plan)')
      .then(({ data }) => {
        if (data?.[0]) {
          const org = (data[0] as { organisations?: { plan?: string } }).organisations
          setPlan(org?.plan || 'free')
        }
      })
  }, [supabase])

  useEffect(() => {
    if (invalidId) return

    supabase.from('contracts').select('*').eq('id', contractId).single()
      .then(({ data }) => {
        if (data) setForm({
          vendor_name: data.vendor_name || '',
          contract_type: data.contract_type || 'saas',
          value_annual: data.value_annual?.toString() || '',
          currency: data.currency || 'INR',
          start_date: data.start_date || '',
          end_date: data.end_date || '',
          auto_renews: data.auto_renews || false,
          notice_days: data.notice_days?.toString() || '30',
          notes: data.notes || '',
        })
        setFetching(false)
      })
  }, [invalidId, contractId, supabase])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  if (invalidId) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-sm text-red-600">
        Invalid contract id
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error: updateErr } = await supabase.from('contracts').update({
      vendor_name: form.vendor_name,
      contract_type: form.contract_type,
      value_annual: form.value_annual ? parseFloat(form.value_annual) : 0,
      currency: form.currency,
      start_date: form.start_date || null,
      end_date: form.end_date,
      auto_renews: form.auto_renews,
      notice_days: parseInt(form.notice_days) || 30,
      notes: form.notes,
    }).eq('id', contractId)

    if (updateErr) {
      setError(updateErr.message)
      setLoading(false)
    } else {
      router.push(`/contracts/${contractId}`)
    }
  }

  if (fetching) return <div className="p-6 max-w-5xl mx-auto text-muted text-sm">Loading…</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-5 text-sm">
        <Link href={`/contracts/${contractId}`} className="text-muted hover:text-slate-600">← Contract</Link>
        <span className="text-gray-300">/</span>
        <span className="text-slate-600">Edit</span>
      </div>
      <h1 className="text-2xl font-bold text-navy mb-5">Edit contract</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="bg-expired-bg border border-expired-text text-expired-text text-sm px-4 py-3 rounded-xl">{error}</div>}

        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Vendor name</label>
              <input value={form.vendor_name} onChange={set('vendor_name')} required
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={form.contract_type} onChange={set('contract_type')}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-surface">
                {CONTRACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notice period (days)</label>
              <input type="number" value={form.notice_days} onChange={set('notice_days')}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Annual value</label>
              <input type="number" value={form.value_annual} onChange={set('value_annual')}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
              <select value={form.currency} onChange={set('currency')}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-surface">
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start date</label>
              <input type="date" value={form.start_date} onChange={set('start_date')}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End date</label>
              <input type="date" value={form.end_date} onChange={set('end_date')} required
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent" />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input type="checkbox" className="sr-only peer" checked={form.auto_renews}
                onChange={e => setForm(f => ({ ...f, auto_renews: e.target.checked }))} />
              <div className="w-10 h-5 bg-gray-200 peer-checked:bg-brand rounded-full transition-colors"></div>
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-surface rounded-full transition-transform peer-checked:translate-x-5"></div>
            </div>
            <span className="text-sm text-slate-700">Auto-renews</span>
          </label>
          {isPaidPlan && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={set('notes')} rows={3}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent resize-none" />
            </div>
          )}
          {!isPaidPlan && (
            <div className="flex items-center justify-between bg-surface border border-border rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted" />
                <span className="text-sm text-muted">Notes (Starter plan)</span>
              </div>
              <Link href="/billing" className="text-xs text-brand hover:underline font-medium">Upgrade →</Link>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="flex-1 bg-brand text-white py-3 rounded-xl text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60">
            {loading ? 'Saving…' : 'Save changes'}
          </button>
          <Link href={`/contracts/${params.id}`}
            className="px-6 py-3 rounded-xl border border-border text-sm font-semibold text-slate-600 hover:bg-page transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
