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
  free: { bg: 'bg-brand-light', text: 'text-brand' },
  test: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  starter: { bg: 'bg-brand', text: 'text-white' },
  pro: { bg: 'bg-navy', text: 'text-blue-300 border border-brand/40' },
  team: { bg: 'bg-amber-900/30', text: 'text-amber-300' },
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
    <div className="min-h-screen bg-page md:h-screen md:p-4">

      {/* ── Mobile top header (visible only on < md) ─────────────── */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-surface border-b border-border sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg border border-border overflow-hidden flex items-center justify-center bg-surface">
            <Image src="/Logo.png" alt="Clausr" width={28} height={28} className="w-full h-full object-contain" priority />
          </div>
          <span className="text-navy font-bold text-sm tracking-tight">Clausr</span>
          {org && (
            <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ml-0.5 ${planStyles.bg} ${planStyles.text}`}>
              {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </span>
          )}
        </div>
        <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-white text-[10px] font-bold">
          {getInitials(profile?.full_name || user.email)}
        </div>
      </header>

      {/* ── Desktop: sidebar + main ──────────────────────────────── */}
      <div className="md:flex md:h-full md:gap-4 md:overflow-hidden">

        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 bg-surface border border-border rounded-3xl shadow-sm flex-col flex-shrink-0">
          <div className="px-5 py-5 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl border border-border bg-surface overflow-hidden flex items-center justify-center">
                <Image src="/Logo.png" alt="Clausr logo" width={32} height={32} className="w-full h-full object-contain" priority />
              </div>
              <span className="text-navy font-bold text-base tracking-tight">Clausr</span>
            </div>
            {org && (
              <div className="mt-3">
                <p className="text-slate-600 text-xs font-semibold tracking-wide truncate">{organisationName}</p>
                <span className={`text-[9px] font-semibold rounded-full px-2 py-0.5 mt-1 inline-block ${planStyles.bg} ${planStyles.text}`}>
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </span>
              </div>
            )}
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-navy hover:bg-brand-light transition-colors group">
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="px-3 py-4 border-t border-border">
            <div className="flex items-center gap-3 px-3">
              <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {getInitials(profile?.full_name || user.email)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-navy text-xs font-semibold truncate">{profile?.full_name || 'User'}</p>
                <p className="text-muted text-[10px] tracking-wide truncate">{organisationName}</p>
              </div>
            </div>
            <div className="mt-2">
              <SignOutButton />
            </div>
          </div>
        </aside>

        {/* Page content — scrollable on desktop, natural on mobile */}
        <main className="flex-1 md:overflow-y-auto md:bg-surface md:border md:border-border md:rounded-3xl md:shadow-sm pb-24 md:pb-0">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom tab bar (visible only on < md) ─────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {navItems.map(item => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] text-slate-400 hover:text-brand transition-colors active:scale-95"
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold leading-tight">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
