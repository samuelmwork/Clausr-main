'use client'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getUserRole } from '@/lib/permissions'

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState({ full_name: '', email: '' })
  const [orgName, setOrgName]   = useState('')
  const [orgId, setOrgId]       = useState('')
  const [userRole, setUserRole] = useState<'admin' | 'editor' | 'viewer' | null>(null)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole]   = useState('editor')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [members, setMembers]   = useState<Array<{ id: string; user_id: string; role: string; profile: { full_name?: string; email?: string }; display_name: string; profiles?: { full_name?: string; email?: string } }>>([])
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = useState('free')
  const [currentUserId, setCurrentUserId] = useState('')
  const orgChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  async function loadOrganizationMembers(targetOrgId: string) {
    if (!targetOrgId) {
      setMembers([])
      return false
    }

    try {
      const memberRes = await fetch(`/api/members?orgId=${targetOrgId}`)
      if (!memberRes.ok) {
        console.error(`Members API failed: ${memberRes.status} ${memberRes.statusText}`)
        throw new Error(`HTTP ${memberRes.status}`)
      }

      const memberBody = await memberRes.json()
      if (Array.isArray(memberBody.data)) {
        setMembers(memberBody.data)
        return true
      } else {
        console.warn('Invalid members data:', memberBody)
      }
    } catch (err) {
      console.error('Failed to load members:', err)
    }
    return false
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (p) setProfile({ full_name: p.full_name || '', email: p.email || user.email || '' })

      const { data: members } = await supabase.from('members').select('org_id, organisations(*)').eq('user_id', user.id).order('created_at', { ascending: false })
      const m = members?.[0]
      if (m) {
        const org = (m as { organisations?: { id?: string; name?: string; plan?: string } }).organisations
        setOrgId(org?.id || '')
        setOrgName(org?.name || '')
        setCurrentPlan(org?.plan || 'free')

        const role = await getUserRole(supabase, org?.id || '')
        setUserRole(role)

        const loadedMembers = await loadOrganizationMembers(org?.id || '')
        if (loadedMembers) return

        setMembers([
          {
            id: user.id,
            user_id: user.id,
            role: role || 'viewer',
            profile: { full_name: p?.full_name || '', email: p?.email || user.email || '' },
            display_name: p?.full_name || user.email || 'You',
            profiles: { full_name: p?.full_name || '', email: p?.email || user.email || '' },
          },
        ])
      }
    }
    load()

    return () => {
      if (orgChannelRef.current) {
        supabase.removeChannel(orgChannelRef.current)
        orgChannelRef.current = null
      }
    }
  }, [supabase])

  // Subscribe to org name changes in real-time so all teammates see updates
  useEffect(() => {
    if (!orgId) return

    // Remove any existing channel before creating a new one
    if (orgChannelRef.current) {
      supabase.removeChannel(orgChannelRef.current)
    }

    const channel = supabase
      .channel(`org-name-${orgId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'organisations', filter: `id=eq.${orgId}` },
        (payload) => {
          const newName = (payload.new as { name?: string }).name
          if (newName !== undefined) {
            setOrgName(newName)
          }
        }
      )
      .subscribe()

    orgChannelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      orgChannelRef.current = null
    }
  }, [orgId, supabase])

  async function saveProfile() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').update({ full_name: profile.full_name }).eq('id', user!.id)
    
    if (userRole === 'admin' && orgId) {
      await supabase.from('organisations').update({ name: orgName }).eq('id', orgId)
      await supabase.from('activity_log').insert({
        org_id: orgId,
        user_id: user!.id,
        action: `Changed organization name to "${orgName}"`,
      })
    }
    
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function sendInvite() {
    if (!inviteEmail || !orgId) return
    if (!isValidEmail(inviteEmail)) {
      alert('Please enter a valid email address')
      return
    }
    setInviteLoading(true)
    try {
      const res = await fetch('/api/invite/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          email: inviteEmail,
          role: inviteRole,
          inviterName: profile.full_name,
          orgName,
        }),
      })

      const text = await res.text()
      let body = {} as any
      try { body = JSON.parse(text) } catch { body = { error: text || 'Invalid JSON response' } }

      if (res.ok) {
        setInviteEmail('')
        alert(`Invite sent to ${inviteEmail}`)

        await loadOrganizationMembers(orgId)
      } else {
        console.error('Invite send failure', { status: res.status, statusText: res.statusText, body })
        alert(body.error || body.message || `Failed to send invite (${res.status})`)
      }
    } catch (err) {
      console.error('Invite send exception', err)
      const message = err instanceof Error ? err.message : String(err)
      alert(`Failed to send invite: ${message}`)
    }
    setInviteLoading(false)
  }

  async function removeMember(memberId: string) {
    if (!confirm('Remove this team member? They will lose access to all contracts.')) return
    setRemovingMemberId(memberId)
    try {
      const member = members.find(m => m.id === memberId)
      const { error } = await supabase.from('members').delete().eq('id', memberId)
      if (error) throw error

      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('activity_log').insert({
        org_id: orgId,
        user_id: user?.id,
        action: `Removed member ${member?.profiles?.email || 'unknown'}`,
      })

      await loadOrganizationMembers(orgId)
      alert('Member removed')
    } catch (err) {
      alert('Failed to remove member')
    } finally {
      setRemovingMemberId(null)
    }
  }

  async function changeMemberRole(memberId: string, newRole: string) {
    setChangingRoleFor(memberId)
    try {
      const member = members.find(m => m.id === memberId)
      const { error } = await supabase
        .from('members')
        .update({ role: newRole })
        .eq('id', memberId)
      
      if (error) throw error

      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('activity_log').insert({
        org_id: orgId,
        user_id: user?.id,
        action: `Changed ${member?.profiles?.email || 'member'} role to ${newRole}`,
      })

      await loadOrganizationMembers(orgId)
    } catch (err) {
      alert('Failed to change role')
    } finally {
      setChangingRoleFor(null)
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut()
      console.log('Signed out successfully')
      router.push('/')
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }

  const canManageTeam = userRole === 'admin'

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-navy">Settings</h1>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-navy">Profile</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Role:</span>
            <span className="text-xs font-semibold bg-gray-100 text-slate-600 px-2 py-1 rounded-full capitalize">
              {userRole || 'loading'}
            </span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
          <input value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input value={profile.email} disabled
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-page text-muted" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Organisation name</label>
          <input 
            value={orgName} 
            onChange={e => setOrgName(e.target.value)}
            disabled={!canManageTeam}
            className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent ${
              !canManageTeam 
                ? 'border-border bg-page text-muted cursor-not-allowed' 
                : 'border-border'
            }`}
          />
          {!canManageTeam && <p className="text-xs text-muted mt-1">Only admins can change organization name</p>}
        </div>
        <button onClick={saveProfile} disabled={saving}
          className="bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-navy">Team members</h2>
        {members.length === 0 ? (
          <p className="text-sm text-muted py-4">No team members yet</p>
        ) : (
          members.map(m => (
            <div key={m.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-navy truncate">
                  {m.display_name || m.profile?.full_name || m.profiles?.full_name || 'Unknown'}
                  {m.user_id === currentUserId ? ' (You)' : ''}
                </p>
                <p className="text-xs text-slate-500 truncate">{m.profile?.email || m.profiles?.email || 'No email on file'}</p>
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                {canManageTeam ? (
                  <>
                    <select
                      value={m.role}
                      onChange={e => changeMemberRole(m.id, e.target.value)}
                      disabled={changingRoleFor === m.id}
                      className="text-xs bg-gray-100 text-slate-600 px-2 py-1 rounded-full border-0 cursor-pointer disabled:opacity-60"
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={() => removeMember(m.id)}
                      disabled={removingMemberId === m.id}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-60 font-semibold"
                    >
                      {removingMemberId === m.id ? 'Removing…' : 'Remove'}
                    </button>
                  </>
                ) : (
                  <span className="text-xs bg-gray-100 text-slate-600 px-2 py-1 rounded-full capitalize">{m.role}</span>
                )}
              </div>
            </div>
          ))
        )}

        {(() => {
          const PLAN_LIMITS = { free: 1, test: 2, starter: 2, pro: 5 } as const
          const teamLimit = PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS] || Infinity
          const isLimitReached = members.length >= teamLimit
          const nextPlan = currentPlan === 'free'
            ? 'starter'
            : currentPlan === 'starter' || currentPlan === 'test'
            ? 'pro'
            : null
          
          if (isLimitReached) {
            return (
              <div className="pt-3 border-t border-border p-4 bg-amber-50 rounded-lg">
                <h3 className="text-sm font-medium text-slate-700 mb-2">Invite teammate</h3>
                <p className="text-xs text-slate-600 mb-3">
                  {currentPlan} plan supports up to {teamLimit} user{teamLimit > 1 ? 's' : ''}.{' '}
                  <Link href="/billing" className="text-brand hover:underline font-semibold">
                    Upgrade to {nextPlan} 
                  </Link> to add more team members.
                </p>
              </div>
            )
          }
          
          return (
            <div className="pt-3 border-t border-border">
              <h3 className="text-sm font-medium text-slate-700 mb-3">Invite teammate</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  type="email" placeholder="colleague@company.com"
                  className="flex-1 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent" />
                <div className="flex gap-2">
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                    className="flex-1 sm:flex-none border border-border rounded-lg px-3 py-2.5 text-sm bg-surface focus:outline-none">
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={sendInvite} disabled={inviteLoading}
                    className="bg-brand text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60 flex-shrink-0">
                    {inviteLoading ? 'Sending…' : 'Invite'}
                  </button>
                </div>
              </div>
            </div>
          )
        })()}
        {!canManageTeam && (
          <p className="text-xs text-muted py-2">Only admins can invite or remove team members.</p>
        )}
      </div>

      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="font-semibold text-navy mb-4">Account</h2>
        <button onClick={signOut}
          className="border border-border text-slate-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-page transition-colors">
          Sign out
        </button>
      </div>
    </div>
  )
}
