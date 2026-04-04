'use client'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getUserRole } from '@/lib/permissions'
import { User, Shield, Users, Mail, Building, Plus, Trash2, LogOut, CheckCircle2, AlertTriangle } from 'lucide-react'

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
  const [members, setMembers]   = useState<any[]>([])
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = useState('free')
  const [currentUserId, setCurrentUserId] = useState('')
  const orgChannelRef = useRef<any>(null)

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  async function loadOrganizationMembers(targetOrgId: string) {
    if (!targetOrgId) return false
    try {
      const memberRes = await fetch(`/api/members?orgId=${targetOrgId}`)
      const memberBody = await memberRes.json()
      if (Array.isArray(memberBody.data)) {
        setMembers(memberBody.data)
        return true
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
        const org = (m as any).organisations
        setOrgId(org?.id || '')
        setOrgName(org?.name || '')
        setCurrentPlan(org?.plan || 'free')
        const role = await getUserRole(supabase, org?.id || '')
        setUserRole(role)
        await loadOrganizationMembers(org?.id || '')
      }
    }
    load()
  }, [supabase])

  async function saveProfile() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').update({ full_name: profile.full_name }).eq('id', user!.id)
    
    if (userRole === 'admin' && orgId) {
      await supabase.from('organisations').update({ name: orgName }).eq('id', orgId)
      await supabase.from('activity_log').insert({
        org_id: orgId,
        user_id: user!.id,
        action: `Updated configuration settings`,
      })
    }
    
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function sendInvite() {
    if (!inviteEmail || !orgId) return
    if (!isValidEmail(inviteEmail)) return
    setInviteLoading(true)
    try {
      const res = await fetch('/api/invite/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, email: inviteEmail, role: inviteRole, inviterName: profile.full_name, orgName }),
      })
      if (res.ok) {
        setInviteEmail('')
        loadOrganizationMembers(orgId)
      }
    } catch (err) {
      console.error(err)
    }
    setInviteLoading(false)
  }

  async function removeMember(memberId: string) {
    if (!confirm('Permanently remove this member?')) return
    setRemovingMemberId(memberId)
    try {
      await supabase.from('members').delete().eq('id', memberId)
      await loadOrganizationMembers(orgId)
    } finally {
      setRemovingMemberId(null)
    }
  }

  async function changeMemberRole(memberId: string, newRole: string) {
    setChangingRoleFor(memberId)
    try {
      await supabase.from('members').update({ role: newRole }).eq('id', memberId)
      await loadOrganizationMembers(orgId)
    } finally {
      setChangingRoleFor(null)
    }
  }

  const canManageTeam = userRole === 'admin'

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-display font-bold text-midnight tracking-tight">Settings</h1>
        <p className="text-muted text-sm mt-1">Manage your professional profile and workspace configuration.</p>
      </div>

      <div className="space-y-8">
        {/* Profile & Org Section */}
        <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 md:p-10 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-500">
              <User className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-display font-bold text-midnight tracking-tight">Workspace Identity</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
                  <User className="w-3 h-3" /> Personal Name
                </label>
                <input 
                  value={profile.full_name} 
                  onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-midnight shadow-inner focus:ring-2 focus:ring-brand/20 transition-all outline-none" 
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
                  <Mail className="w-3 h-3" /> Email Address
                </label>
                <div className="w-full bg-slate-100/50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-400 cursor-not-allowed">
                  {profile.email}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
                  <Building className="w-3 h-3" /> Organisation
                </label>
                <input 
                  value={orgName} 
                  onChange={e => setOrgName(e.target.value)}
                  disabled={!canManageTeam}
                  placeholder="Organisation name"
                  className={`w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-midnight shadow-inner focus:ring-2 focus:ring-brand/20 transition-all outline-none ${
                    !canManageTeam ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
                  <Shield className="w-3 h-3" /> Current Role
                </label>
                <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-2.5 rounded-2xl">
                   <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                   <span className="text-xs font-black uppercase tracking-[0.1em] text-brand">{userRole || 'Loading...'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-50 flex items-center justify-end">
             <button onClick={saveProfile} disabled={saving}
              className="bg-midnight text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-slate-900 transition-all shadow-xl shadow-midnight/20 active:scale-[0.98] disabled:opacity-50 flex items-center gap-2">
              {saving ? 'Processing...' : saved ? <><CheckCircle2 className="w-4 h-4" /> Changes Saved</> : 'Sync Workspace'}
            </button>
          </div>
        </div>

        {/* Team Management Section */}
        <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 md:p-10 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-500">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-midnight tracking-tight">Governance & Team</h2>
                <p className="text-xs text-slate-400 font-medium">Manage members and permission protocols.</p>
              </div>
            </div>
            
            {canManageTeam && (
              <div className="flex items-center gap-2 translate-y-2">
                 {/* Team Limit UI */}
                {(() => {
                  const PLAN_LIMITS = { free: 1, starter: 2, pro: 5 } as any
                  const teamLimit = PLAN_LIMITS[currentPlan] || 1
                  const isLimitReached = members.length >= teamLimit
                  if (isLimitReached) return (
                    <Link href="/billing" className="bg-amber-50 text-amber-700 border border-amber-200 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3" /> Limit Reached: Upgrade
                    </Link>
                  )
                  return <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{members.length} of {teamLimit} seats occupied</span>
                })()}
              </div>
            )}
          </div>

          <div className="space-y-3 mb-10">
            {members.length === 0 ? (
              <div className="py-12 bg-slate-50 border border-slate-100 rounded-3xl text-center space-y-2 text-slate-400 font-medium italic">
                Scanning for workspace members...
              </div>
            ) : (
              members.map(m => (
                <div key={m.id} className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-3xl group hover:border-slate-200 transition-all">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 font-black text-sm group-hover:border-brand/20 group-hover:text-brand transition-all shadow-sm">
                      {(m.display_name || m.profile?.full_name || 'U').charAt(0)}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-midnight truncate">
                          {m.display_name || m.profile?.full_name || 'Unknown User'}
                        </p>
                        {m.user_id === currentUserId && <span className="text-[8px] font-black bg-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">You</span>}
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5 uppercase tracking-tighter">{m.profile?.email || 'Encrypted Identity'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {canManageTeam && m.user_id !== currentUserId ? (
                      <>
                        <select
                          value={m.role}
                          onChange={e => changeMemberRole(m.id, e.target.value)}
                          disabled={changingRoleFor === m.id}
                          className="bg-white border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest px-3 py-1.5 outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer shadow-sm transition-all"
                        >
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button
                          onClick={() => removeMember(m.id)}
                          disabled={removingMemberId === m.id}
                          className="p-2 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-slate-500 shadow-sm">{m.role}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {canManageTeam && (() => {
            const PLAN_LIMITS = { free: 1, starter: 2, pro: 5 } as any
            const teamLimit = PLAN_LIMITS[currentPlan] || 1
            if (members.length < teamLimit) return (
              <div className="p-8 bg-midnight rounded-[2rem] border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl pointer-events-none" />
                <h3 className="text-white font-display font-bold text-lg mb-6 tracking-tight flex items-center gap-3">
                   <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
                      <Plus className="w-4 h-4" />
                   </div>
                   Invite Executive Teammate
                </h3>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <input 
                      value={inviteEmail} 
                      onChange={e => setInviteEmail(e.target.value)}
                      type="email" 
                      placeholder="teammate@company.com"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-white shadow-inner focus:ring-2 focus:ring-indigo-500/40 transition-all outline-none placeholder:text-slate-600" 
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  </div>
                  <div className="flex gap-3">
                    <select 
                      value={inviteRole} 
                      onChange={e => setInviteRole(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-xs font-black uppercase tracking-widest text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer transition-all"
                    >
                      <option value="editor" className="bg-midnight">Editor</option>
                      <option value="viewer" className="bg-midnight">Viewer</option>
                      <option value="admin" className="bg-midnight">Admin</option>
                    </select>
                    <button 
                      onClick={sendInvite} 
                      disabled={inviteLoading || !inviteEmail}
                      className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/30 active:scale-95 disabled:opacity-30 flex-shrink-0"
                    >
                      {inviteLoading ? 'Sending...' : 'Invite'}
                    </button>
                  </div>
                </div>
              </div>
            )
            return null
          })()}
        </div>

        {/* Security / Account Section */}
        <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 md:p-10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
              <LogOut className="w-6 h-6 rotate-180" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-midnight tracking-tight leading-tight">Session Termination</h2>
              <p className="text-xs text-slate-500 font-medium">Safely sign out of your Clausr workspace.</p>
            </div>
          </div>
          <button 
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/')
            }}
            className="w-full md:w-auto px-10 py-3.5 border-2 border-slate-100 rounded-2xl text-sm font-black uppercase tracking-widest text-slate-400 hover:border-slate-200 hover:text-midnight transition-all hover:bg-slate-50"
          >
            End current session
          </button>
        </div>
      </div>

      <div className="mt-16 text-center">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Clausr v0.1.0 • Privacy Secure • Encrypted</p>
      </div>
    </div>
  )
}
