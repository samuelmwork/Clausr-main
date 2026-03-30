import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, parseISO, addMonths, subMonths } from 'date-fns'
import { daysUntil, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: members } = await supabase
    .from('members').select('org_id').eq('user_id', user.id).order('created_at', { ascending: false })
  const member = members?.[0]
  if (!member) redirect('/auth/login')

  const baseDate = searchParams.month ? parseISO(`${searchParams.month}-01`) : new Date()
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
    if (d <= 30) return { bg: 'bg-red-100 text-red-700', label: '≤30d' }
    if (d <= 60) return { bg: 'bg-amber-100 text-amber-700', label: '30-60d' }
    return { bg: 'bg-green-100 text-green-700', label: '60d+' }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">Calendar</h1>
        <div className="flex items-center gap-3">
          <Link href={`/calendar?month=${prevMonth}`} className="text-muted hover:text-slate-600 p-1">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <span className="font-semibold text-navy min-w-36 text-center">{format(baseDate, 'MMMM yyyy')}</span>
          <Link href={`/calendar?month=${nextMonth}`} className="text-muted hover:text-slate-600 p-1">
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span> ≤30d</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> 30–60d</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span> 60d+</span>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 bg-page border-b border-border">
          {weekDays.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-muted uppercase py-3 border-b border-border">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: startPadding }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[6rem] border-b border-r border-gray-50 bg-page/50" />
          ))}

          {days.map(day => {
            const key = format(day, 'yyyy-MM-dd')
            const dayContracts = contractsByDay[key] || []
            const isToday = isSameDay(day, new Date())

            return (
              <div key={key} className="min-h-[6rem] border-b border-r border-gray-50 p-2">
                <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                  isToday ? 'bg-brand text-white' : 'text-muted'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayContracts.slice(0, 3).map(c => {
                    const d = daysUntil(c.end_date)
                    const { bg } = urgencyDot(d)
                    return (
                      <Link key={c.id} href={`/contracts/${c.id}`}
                        className={`flex items-center gap-1 rounded px-1.5 py-0.5 truncate ${bg} hover:opacity-80 transition-opacity`}>
                        <span className="text-[9px] font-medium leading-tight">
                          {c.vendor_name}
                        </span>
                      </Link>
                    )
                  })}
                  {dayContracts.length > 3 && (
                    <span className="text-[9px] text-muted">+{dayContracts.length - 3} more</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {(contracts || []).length > 0 && (
        <div className="mt-6 bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-navy text-sm">{(contracts || []).length} contracts this month</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(contracts || []).sort((a, b) => a.end_date.localeCompare(b.end_date)).map(c => {
              const d = daysUntil(c.end_date)
              const { bg } = urgencyDot(d)
              return (
                <Link key={c.id} href={`/contracts/${c.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-page transition-colors">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${bg.split(' ')[0]}`}></span>
                  <span className="flex-1 text-sm font-medium text-navy">{c.vendor_name}</span>
                  <span className="text-xs text-muted">{format(parseISO(c.end_date), 'dd MMM')}</span>
                  {c.value_annual ? <span className="text-sm text-slate-600">{formatCurrency(c.value_annual, c.currency)}</span> : null}
                  {c.auto_renews && <span className="text-xs bg-expiring-bg text-expiring-text px-2 py-0.5 rounded-full">Auto</span>}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
