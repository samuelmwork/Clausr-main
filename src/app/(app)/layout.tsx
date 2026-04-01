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
    <div className="h-screen bg-page p-4">
      <div className="flex h-full gap-4 overflow-hidden">
      <aside className="w-64 bg-surface border border-border rounded-3xl shadow-sm flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl border border-border bg-surface overflow-hidden flex items-center justify-center">
              <Image
                src="/Logo.png"
                alt="Clausr logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
                priority
              />
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

      <main className="flex-1 overflow-y-auto bg-surface border border-border rounded-3xl shadow-sm">
        {children}
      </main>
      </div>
    </div>
  )
}
