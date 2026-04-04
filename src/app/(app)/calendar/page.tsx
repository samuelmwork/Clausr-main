import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, parseISO, addMonths, subMonths } from 'date-fns'
import { daysUntil, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowUpRight } from 'lucide-react'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: members } = await supabase
    .from('members').select('org_id').eq('user_id', user.id).order('created_at', { ascending: false })
  const member = members?.[0]
  if (!member) redirect('/auth/login')

  const baseDate = resolvedSearchParams.month ? parseISO(`${resolvedSearchParams.month}-01`) : new Date()
  const monthStart = startOfMonth(baseDate)
  const monthEnd   = endOfMonth(baseDate)
  const prevMonth  = format(subMonths(baseDate, 1), 'yyyy-MM')
  const nextMonth  = format(addMonths(baseDate, 1), 'yyyy-MM')

  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, vendor_name, end_date, value_annual, currency, auto_renews, status')
    .eq('org_id', member.org_id)
    .gte('end_date', format(monthStart, 'yyyy-MM-dd'))
    .lte('end_date', format(monthEnd, 'yyyy-MM-dd'))
    .neq('status', 'cancelled')

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPadding = getDay(monthStart)

  const contractsByDay: Record<string, typeof contracts> = {}
  for (const c of contracts || []) {
    const key = c.end_date
    if (!contractsByDay[key]) contractsByDay[key] = []
    contractsByDay[key]!.push(c)
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const urgencyDot = (d: number) => {
    if (d <= 30) return { bg: 'bg-rose-500', text: 'text-rose-500', card: 'bg-rose-50 border-rose-100' }
    if (d <= 60) return { bg: 'bg-amber-500', text: 'text-amber-500', card: 'bg-amber-50 border-amber-100' }
    return { bg: 'bg-emerald-500', text: 'text-emerald-500', card: 'bg-emerald-50 border-emerald-100' }
  }

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-display font-bold text-midnight tracking-tight">Calendar</h1>
          <p className="text-muted text-sm mt-1">Contract renewal schedule for <span className="text-midnight font-bold">{format(baseDate, 'MMMM yyyy')}</span>.</p>
        </div>
        
        <div className="flex items-center justify-between md:justify-end gap-4 bg-white border border-slate-200/60 p-2 rounded-2xl shadow-sm">
          <Link href={`/calendar?month=${prevMonth}`} className="p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all text-slate-400 hover:text-midnight">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 px-2">
            <CalendarIcon className="w-4 h-4 text-brand" />
            <span className="font-display font-bold text-midnight text-base tracking-tight min-w-[120px] text-center">
              {format(baseDate, 'MMMM yyyy')}
            </span>
          </div>
          <Link href={`/calendar?month=${nextMonth}`} className="p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all text-slate-400 hover:text-midnight">
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mb-6 px-4 py-3 bg-slate-50/50 rounded-2xl border border-slate-100 w-fit mx-auto md:mx-0">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <span className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" /> High Urgency
        </span>
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" /> Medium
        </span>
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" /> Safe
        </span>
      </div>

      <div className="bg-white border border-slate-200/60 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/30">
          {weekDays.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-bold text-slate-400 uppercase py-4 tracking-[0.2em]">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: startPadding }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[100px] border-b border-r border-slate-50 bg-slate-50/10" />
          ))}

          {days.map(day => {
            const key = format(day, 'yyyy-MM-dd')
            const dayContracts = contractsByDay[key] || []
            const isToday = isSameDay(day, new Date())

            return (
              <div key={key} className="min-h-[100px] border-b border-r border-slate-50 p-3 group hover:bg-slate-50/50 transition-colors">
                <div className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-xl mb-2 transition-all ${
                  isToday ? 'bg-brand text-white shadow-lg shadow-brand/20 ring-4 ring-brand/10' : 'text-slate-400 group-hover:text-midnight group-hover:bg-white group-hover:shadow-sm'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayContracts.slice(0, 3).map(c => {
                    const d = daysUntil(c.end_date)
                    const { bg } = urgencyDot(d)
                    return (
                      <Link key={c.id} href={`/contracts/${c.id}`}
                        className="flex items-center gap-1.5 group/contract">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${bg}`} />
                        <span className="text-[10px] font-bold text-slate-600 truncate group-hover/contract:text-brand transition-colors">
                          {c.vendor_name}
                        </span>
                      </Link>
                    )
                  })}
                  {dayContracts.length > 3 && (
                    <span className="text-[9px] font-bold text-slate-300 block pl-3 uppercase tracking-tighter">+{dayContracts.length - 3} others</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {contracts && contracts.length > 0 && (
        <div className="mt-12 bg-white border border-slate-200/60 rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
            <h2 className="font-display font-bold text-midnight text-lg tracking-tight">Monthly Recap</h2>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1 rounded-lg">
              {contracts.length} Events Scheduled
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {(contracts || []).sort((a, b) => a.end_date.localeCompare(b.end_date)).map(c => {
              const d = daysUntil(c.end_date)
              const { card, text } = urgencyDot(d)
              return (
                <Link key={c.id} href={`/contracts/${c.id}`}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 px-8 py-5 hover:bg-slate-50/50 transition-all group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-brand/10 group-hover:text-brand transition-all">
                        <ArrowUpRight className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-midnight group-hover:text-brand transition-colors">{c.vendor_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Due {format(parseISO(c.end_date), 'EEEE, do MMMM')}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-black text-midnight">{c.value_annual ? formatCurrency(c.value_annual, c.currency) : '—'}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Annual Spend</p>
                    </div>
                    <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest shadow-sm ${card} ${text}`}>
                      {urgentLabel(d)}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function urgentLabel(d: number) {
  if (d <= 30) return 'Immediate Action'
  if (d <= 60) return 'Priority Watch'
  return 'Stable'
}
