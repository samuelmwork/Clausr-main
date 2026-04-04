import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getInitials } from '@/lib/utils'
import SignOutButton from '@/components/SignOutButton'
import { LayoutDashboard, FileText, Calendar, CreditCard, Settings } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contracts', label: 'Contracts', icon: FileText },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const planConfig: Record<string, { bg: string; text: string }> = {
  free: { bg: 'bg-slate-800', text: 'text-slate-300' },
  test: { bg: 'bg-emerald-500/10', text: 'text-emerald-400 border border-emerald-500/20' },
  starter: { bg: 'bg-indigo-600', text: 'text-white' },
  pro: { bg: 'bg-indigo-500', text: 'text-white ring-1 ring-white/20' },
  team: { bg: 'bg-violet-600', text: 'text-white' },
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  const { data: members } = await supabase
    .from('members').select('*, organisations(*)').eq('user_id', user.id).order('created_at', { ascending: false })

  const member = members?.[0]
  if (!member) redirect('/auth/login')

  const org = (member as { organisations?: { name?: string; plan?: string } } | null)?.organisations
  const plan = org?.plan || 'free'
  const planStyles = planConfig[plan] || planConfig.free
  const organisationName = org?.name || 'Organisation'

  return (
    <div className="min-h-screen bg-page md:h-screen md:p-2 lg:p-4">

      {/* ── Mobile top header (visible only on < md) ─────────────── */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-surface border-b border-border sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg border border-border overflow-hidden flex items-center justify-center bg-slate-50">
            <Image src="/Logo.png" alt="Clausr" width={24} height={24} className="w-full h-full object-contain p-1" priority />
          </div>
          <span className="text-midnight font-display font-bold text-base tracking-tight">Clausr</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-brand/10">
          {getInitials(profile?.full_name || user.email)}
        </div>
      </header>

      {/* ── Desktop: sidebar + main ──────────────────────────────── */}
      <div className="md:flex md:h-full md:gap-3 lg:gap-4 md:overflow-hidden">

        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 bg-midnight rounded-[2rem] shadow-2xl flex-col flex-shrink-0 border border-white/5 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,rgba(79,70,229,0.15)_0,transparent_50%)] pointer-events-none" />
          
          <div className="px-6 py-8 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center shadow-inner">
                <Image src="/Logo.png" alt="Clausr logo" width={28} height={28} className="w-full h-full object-contain p-1.5" priority />
              </div>
              <span className="text-white font-display font-bold text-xl tracking-tight">Clausr</span>
            </div>
            {org && (
              <div className="mt-6 px-1">
                <p className="text-slate-400 text-xs font-medium tracking-wide truncate opacity-80">{organisationName}</p>
                <span className={`text-[10px] font-bold rounded-lg px-2 py-1 mt-2 inline-block uppercase tracking-wider ${planStyles.bg} ${planStyles.text}`}>
                  {plan}
                </span>
              </div>
            )}
          </div>

          <nav className="flex-1 px-4 py-2 space-y-1 relative z-10">
            {navItems.map(item => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all group active:scale-[0.98]">
                  <Icon className="w-4.5 h-4.5 group-hover:text-brand transition-colors" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="px-4 py-6 border-t border-white/5 relative z-10">
            <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-white/5 mb-4">
              <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-lg">
                {getInitials(profile?.full_name || user.email)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate leading-tight">{profile?.full_name || 'User'}</p>
                <p className="text-slate-500 text-[11px] truncate mt-0.5">{user.email}</p>
              </div>
            </div>
            <div className="px-1">
              <SignOutButton />
            </div>
          </div>
        </aside>

        {/* Page content */}
        <main className="flex-1 md:overflow-y-auto md:bg-surface md:border md:border-slate-200/60 md:rounded-[2rem] md:shadow-sm pb-24 md:pb-0 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(79,70,229,0.02)_0,transparent_30%)] pointer-events-none" />
          <div className="relative z-10 h-full">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile bottom tab bar (visible only on < md) ─────────── */}
      <nav
        className="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-midnight/95 backdrop-blur-xl border border-white/10 flex items-stretch rounded-2xl shadow-2xl overflow-hidden px-2"
        style={{ paddingBottom: 'calc(4px + env(safe-area-inset-bottom))', paddingTop: '4px' }}
      >
        {navItems.map(item => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2 text-slate-400 hover:text-brand transition-all active:scale-90"
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
