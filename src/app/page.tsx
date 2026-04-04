import Link from 'next/link'
import Image from 'next/image'
import { Bell, Calendar, Star, Users, FileText, LayoutDashboard, Check } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface">
      <nav className="sticky bg-surface/90 backdrop-blur border-b border-border top-0 z-50 h-16">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl border border-border bg-surface shadow-sm flex items-center justify-center overflow-hidden">
              <Image
                src="/Logo.png"
                alt="Clausr logo"
                width={44}
                height={44}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <span className="font-bold text-navy text-2xl tracking-tight">Clausr</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-slate-600 hover:text-gray-900 transition-colors">
              Sign in
            </Link>
            <Link href="/auth/signup" className="text-sm bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors font-semibold">
              Start free
            </Link>
          </div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-4 pt-24 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
          India-first · ₹0 to start
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-navy leading-tight mb-7 max-w-4xl mx-auto">
          Stop missing vendor contract renewals
        </h1>
        <p className="text-xl text-muted mb-10 max-w-3xl mx-auto leading-relaxed">
          Clausr tracks every vendor contract, sends renewal alerts 90 days out, and gives your team a single source of truth — no more chasing spreadsheets or missing deadlines.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/signup" className="bg-brand text-white px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-brand-dark transition-colors">
            Start free — no credit card
          </Link>
          <Link href="/auth/login" className="bg-surface text-slate-700 px-8 py-3.5 rounded-xl font-semibold text-base border border-border hover:bg-page transition-colors">
            Sign in
          </Link>
        </div>
        <p className="text-xs text-muted mt-4">Free plan: 2 contracts forever. Upgrade anytime.</p>
      </section>

      <section className="bg-midnight-light py-14">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10 text-center">
          {[
            { value: '₹0', label: 'Free plan forever' },
            { value: '10 min', label: 'to set up completely' },
            { value: '2 contracts', label: 'included on free plan' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-sm text-indigo-300">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-24">
        <h2 className="text-3xl font-bold text-navy text-center mb-12">Everything you need, nothing you don&apos;t</h2>
        <div className="grid md:grid-cols-3 gap-7">
          {[
            { icon: Bell, title: 'Smart renewal alerts', desc: 'Automated email alerts at 90, 60, 30, 14, 7, and 1 day before every contract renewal or expiry. One-click actions directly from email.' },
            { icon: Calendar, title: 'Calendar view', desc: 'Monthly calendar showing all upcoming renewals colour-coded by urgency. Red = urgent, amber = coming up, green = safe.' },
            { icon: Star, title: 'Vendor health scores', desc: 'Rate each vendor on delivery, support, and value. Know which contracts are worth renewing before the clock runs out.' },
            { icon: Users, title: 'Team access', desc: 'Invite your finance and ops team. Assign contract owners. Role-based permissions (Admin / Editor / Viewer).' },
            { icon: FileText, title: 'Contract storage', desc: 'Upload PDFs and store them alongside contract details. No more digging through email attachments at renewal time.' },
            { icon: LayoutDashboard, title: 'Spend dashboard', desc: 'See your total committed vendor spend at a glance. Filter by category, owner, or renewal month.' },
          ].map(f => (
            <div key={f.title} className="bg-surface border border-border rounded-xl p-6 hover:border-blue-100 transition-colors">
              <f.icon className="w-8 h-8 text-brand mb-3" />
              <h3 className="font-semibold text-navy mb-2">{f.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-page py-24">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-navy text-center mb-3">Simple pricing. No traps.</h2>
          <p className="text-muted text-center mb-14">Per organisation — not per seat. Your whole team included.</p>
          <div className="grid md:grid-cols-3 gap-7">
            {[
              { name: 'Free', price: '₹0', period: 'forever', features: ['2 contracts', '1 user', 'Email alerts (1 day)', 'Calendar view'], cta: 'Start free', highlight: false },
              { name: 'Starter', price: '₹399', period: '/month', features: ['10 contracts', '2 users', 'File uploads', 'Smart alerts', 'Dashboard + overall spend'], cta: 'Start Starter', highlight: true },
              { name: 'Pro', price: '₹799', period: '/month', features: ['25 contracts', '5 users', 'WhatsApp renewal alerts', 'CSV import', 'Activity log'], cta: 'Start Pro', highlight: false },
            ].map(p => (
              <div key={p.name} className={`rounded-xl p-6 ${p.highlight ? 'bg-brand text-white' : 'bg-surface border border-border'}`}>
                <div className={`text-sm font-semibold mb-1 ${p.highlight ? 'text-blue-200' : 'text-muted'}`}>{p.name}</div>
                <div className={`text-3xl font-bold mb-0.5 ${p.highlight ? 'text-white' : 'text-navy'}`}>{p.price}</div>
                <div className={`text-sm mb-5 ${p.highlight ? 'text-blue-200' : 'text-muted'}`}>{p.period}</div>
                <ul className="space-y-2 mb-6">
                  {p.features.map(f => (
                    <li key={f} className={`text-sm flex items-center gap-2 ${p.highlight ? 'text-blue-100' : 'text-slate-600'}`}>
                      <span className={p.highlight ? 'text-blue-200' : 'text-green-500'}><Check className="w-4 h-4" /></span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/signup" className={`block text-center py-2.5 rounded-lg text-sm font-semibold transition-colors ${p.highlight ? 'bg-surface text-brand hover:bg-blue-50' : 'bg-brand text-white hover:bg-brand-dark'}`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md border border-border bg-surface shadow-sm flex items-center justify-center overflow-hidden">
              <Image
                src="/Logo.png"
                alt="Clausr logo"
                width={28}
                height={28}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-semibold text-navy">Clausr</span>
            <span className="text-muted text-sm">· India-first vendor contract intelligence</span>
          </div>
          <div className="text-sm text-muted">
            © 2026 Clausr · <Link href="/auth/login" className="hover:text-slate-600">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
