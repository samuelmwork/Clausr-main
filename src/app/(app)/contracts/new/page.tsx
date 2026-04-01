'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Upload, FileText, X, Lock } from 'lucide-react'

const CONTRACT_TYPES = [
  { value: 'saas', label: 'SaaS Subscription' },
  { value: 'services', label: 'Services Agreement' },
  { value: 'lease', label: 'Lease / Rental' },
  { value: 'nda', label: 'NDA' },
  { value: 'employment', label: 'Employment' },
  { value: 'other', label: 'Other' },
]

export default function NewContractPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [fileUrl, setFileUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [plan, setPlan] = useState<string>('free')
  const [fetchingPlan, setFetchingPlan] = useState(true)

  const isPaidPlan = plan !== 'free'

  useEffect(() => {
    supabase.from('members').select('org_id, organisations!inner(plan)')
      .then(({ data }) => {
        if (data?.[0]) {
          const org = (data[0] as { organisations?: { plan?: string } }).organisations
          setPlan(org?.plan || 'free')
        }
        setFetchingPlan(false)
      })
  }, [supabase])

  const [form, setForm] = useState({
    vendor_name: '', contract_type: 'saas', value_annual: '',
    currency: 'INR', start_date: '', end_date: '',
    auto_renews: false, notice_days: '30', notes: '',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('File must be under 10MB'); return }
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const path = `${user!.id}/${Date.now()}-${file.name}`
    const { data, error: uploadErr } = await supabase.storage
      .from('contracts').upload(path, file, { cacheControl: '3600' })
    if (uploadErr) { setError(uploadErr.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('contracts').getPublicUrl(data.path)
    setFileUrl(publicUrl)
    setFileName(file.name)
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: members } = await supabase
        .from('members').select('org_id').eq('user_id', user.id).order('created_at', { ascending: false })
      const member = members?.[0]
      if (!member) throw new Error('No organisation found')

      const { error: insertErr } = await supabase.from('contracts').insert({
        org_id: member.org_id,
        vendor_name: form.vendor_name,
        contract_type: form.contract_type,
        value_annual: form.value_annual ? parseFloat(form.value_annual) : 0,
        currency: form.currency,
        start_date: form.start_date || null,
        end_date: form.end_date,
        auto_renews: form.auto_renews,
        notice_days: parseInt(form.notice_days) || 30,
        notes: form.notes,
        owner_id: user.id,
        file_url: fileUrl || null,
        file_name: fileName || null,
      })
      if (insertErr) throw insertErr
      router.push('/contracts')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/contracts" className="text-muted hover:text-slate-600 transition-colors text-sm">← Contracts</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-slate-600">New contract</span>
      </div>
      <h1 className="text-2xl font-bold text-navy mb-5">Add contract</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="bg-expired-bg border border-expired-text text-expired-text text-sm px-4 py-3 rounded-xl">{error}</div>}

        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-navy text-sm">Contract details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Vendor name <span className="text-red-500">*</span></label>
              <input value={form.vendor_name} onChange={set('vendor_name')} required
                placeholder="e.g. Salesforce, AWS, Notion"
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contract type</label>
              <select value={form.contract_type} onChange={set('contract_type')}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-surface">
                {CONTRACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notice period (days)</label>
              <input type="number" value={form.notice_days} onChange={set('notice_days')} min={0} max={365}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent" />
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-navy text-sm">Financial details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Annual value</label>
              <input type="number" value={form.value_annual} onChange={set('value_annual')} placeholder="0"
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
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-navy text-sm">Dates</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start date</label>
              <input type="date" value={form.start_date} onChange={set('start_date')}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End / renewal date <span className="text-red-500">*</span></label>
              <input type="date" value={form.end_date} onChange={set('end_date')} required
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent" />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input type="checkbox" className="sr-only peer"
                checked={form.auto_renews}
                onChange={e => setForm(f => ({ ...f, auto_renews: e.target.checked }))} />
              <div className="w-10 h-5 bg-gray-200 peer-checked:bg-brand rounded-full transition-colors"></div>
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-surface rounded-full transition-transform peer-checked:translate-x-5"></div>
            </div>
            <span className="text-sm text-slate-700">This contract auto-renews</span>
            {form.auto_renews && <span className="text-xs bg-expiring-bg text-expiring-text px-2 py-0.5 rounded-full">Action required before end date</span>}
          </label>
        </div>

        {isPaidPlan && (
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-navy text-sm">Contract file (optional)</h2>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              {fileName ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5 text-muted" />
                  <span className="text-sm font-medium text-slate-700">{fileName}</span>
                  <button type="button" onClick={() => { setFileUrl(''); setFileName('') }} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                    <X className="w-3 h-3" /> Remove
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto mb-2 text-brand" />
                  <label className="cursor-pointer">
                    <span className="text-sm text-brand font-medium hover:underline">
                      {uploading ? 'Uploading…' : 'Choose PDF or click to upload'}
                    </span>
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                  <p className="text-xs text-muted mt-1">PDF, DOC up to 10MB</p>
                </>
              )}
            </div>
          </div>
        )}

        {isPaidPlan && (
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="font-semibold text-navy text-sm mb-3">Notes (optional)</h2>
            <textarea value={form.notes} onChange={set('notes')} rows={3}
              placeholder="Any important details, negotiation notes, contacts…"
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent resize-none" />
          </div>
        )}

        {!fetchingPlan && !isPaidPlan && (
          <div className="bg-surface border border-border rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-muted" />
              <div>
                <p className="text-sm font-medium text-slate-700">File uploads & notes</p>
                <p className="text-xs text-muted">Available on Starter plan</p>
              </div>
            </div>
            <Link href="/billing" className="text-xs text-brand hover:underline font-medium">
              Upgrade →
            </Link>
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="flex-1 bg-brand text-white py-3 rounded-xl text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60">
            {loading ? 'Saving…' : 'Save contract'}
          </button>
          <Link href="/contracts" className="px-6 py-3 rounded-xl border border-border text-sm font-semibold text-slate-600 hover:bg-page transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
