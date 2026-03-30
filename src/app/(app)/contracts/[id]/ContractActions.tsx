'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getUserRole, Permissions } from '@/lib/permissions'

export default function ContractActions({
  contractId, status, orgId, defaultAction,
}: {
  contractId: string
  status: string
  orgId: string
  defaultAction?: string
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'admin' | 'editor' | 'viewer' | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadRole() {
      const role = await getUserRole(supabase, orgId)
      setUserRole(role)
    }
    loadRole()
  }, [orgId, supabase])

  async function updateStatus(newStatus: string, action: string) {
    setLoading(newStatus)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('contracts')
      .update({ status: newStatus })
      .eq('id', contractId)
    if (!error) {
      await supabase.from('activity_log').insert({
        contract_id: contractId,
        org_id: orgId,
        user_id: user?.id,
        action: `Contract marked as ${action}`,
      })
      router.refresh()
    }
    setLoading(null)
  }

  async function deleteContract() {
    if (!confirm('Delete this contract? This cannot be undone.')) return
    setLoading('delete')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('contracts').delete().eq('id', contractId)
    if (!error) {
      await supabase.from('activity_log').insert({
        org_id: orgId,
        user_id: user?.id,
        action: 'Deleted a contract',
      })
      router.push('/contracts')
    } else {
      alert('Failed to delete contract')
      setLoading(null)
    }
  }

  const isRenewed = status === 'renewed'
  const canEdit = Permissions.canEditContract(userRole)
  const canDelete = Permissions.canDeleteContract(userRole)

  if (!userRole) {
    return <div className="bg-surface border border-border rounded-xl p-5">Loading...</div>
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
      <h2 className="font-semibold text-navy text-sm">Actions</h2>

      {!isRenewed && (
        <button
          onClick={() => updateStatus('renewed', 'Renewed')}
          disabled={!canEdit || !!loading}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            canEdit
              ? 'bg-brand text-white hover:bg-brand-dark disabled:opacity-60'
              : 'bg-gray-100 text-muted cursor-not-allowed'
          }`}
          title={!canEdit ? 'Only Editors and Admins can mark contracts as renewed' : ''}
        >
          {loading === 'renewed' ? 'Saving…' : '✓ Mark as renewed'}
        </button>
      )}

      <div className="pt-3 border-t border-border">
        <button onClick={deleteContract} disabled={!!loading || !canDelete}
          className={`w-full text-sm py-1.5 transition-colors disabled:opacity-60 ${
            canDelete
              ? 'text-red-500 hover:text-red-700'
              : 'text-muted cursor-not-allowed'
          }`}>
          {loading === 'delete' ? 'Deleting…' : 'Delete contract'}
        </button>
      </div>
    </div>
  )
}
