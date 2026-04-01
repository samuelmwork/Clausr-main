import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendAlertEmail } from '@/lib/resend'
import { format, parseISO } from 'date-fns'

export async function POST(req: Request) {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  // Find all unsent alerts due today
  const { data: alerts, error } = await supabase
    .from('alerts')
    .select(`
      *,
      contracts (
        id, org_id, vendor_name, end_date, value_annual, currency, auto_renews, owner_id
      )
    `)
    .eq('scheduled_for', today)
    .eq('sent', false)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!alerts || alerts.length === 0) return NextResponse.json({ sent: 0 })

  let sent = 0
  const errors: string[] = []

  for (const alert of alerts) {
    const contract = alert.contracts as {
      id: string; org_id: string; vendor_name: string; end_date: string
      value_annual: number; currency: string; auto_renews: boolean; owner_id?: string
    } | null
    if (!contract) continue

    // Send alert to all teammates in org (admin/editor/viewer)
    const { data: orgMembers = [], error: membersErr } = await supabase
      .from('members')
      .select('user_id, email, role, profiles(email)')
      .eq('org_id', contract.org_id)
      .in('role', ['admin', 'editor', 'viewer'])

    if (membersErr || !orgMembers?.length) continue

    const userIds = orgMembers.map(m => m.user_id).filter(Boolean)
    const memberEmailMap = new Map<string, string>()
    for (const member of orgMembers) {
      const email =
        member.email ||
        (member as { profiles?: { email?: string } })?.profiles?.email ||
        ''
      if (email && member.user_id) memberEmailMap.set(member.user_id, email)
    }

    // Fallback to auth users for any missing member email
    const missingUserIds = userIds.filter(id => !memberEmailMap.has(id))
    for (const userId of missingUserIds) {
      const { data } = await supabase.auth.admin.getUserById(userId)
      const email = data?.user?.email || ''
      if (email) memberEmailMap.set(userId, email)
    }

    const recipientEmails = Array.from(new Set(Array.from(memberEmailMap.values()).filter(Boolean)))
    if (!recipientEmails.length) continue

    try {
      await sendAlertEmail({
        to: recipientEmails,
        vendorName: contract.vendor_name,
        daysLeft: alert.days_before,
        endDate: format(parseISO(contract.end_date), 'dd MMM yyyy'),
        value: contract.value_annual || 0,
        currency: contract.currency || 'INR',
        contractId: contract.id,
        autoRenews: contract.auto_renews,
      })

      // Mark as sent
      await supabase.from('alerts').update({ sent: true, sent_at: new Date().toISOString() }).eq('id', alert.id)
      sent++
    } catch (emailErr) {
      errors.push(emailErr instanceof Error ? emailErr.message : 'Email failed')
    }
  }

  return NextResponse.json({ sent, errors, total: alerts.length })
}

// Allow GET for manual trigger in development
export async function GET() {
  return NextResponse.json({ message: 'Use POST with x-cron-secret header' })
}
