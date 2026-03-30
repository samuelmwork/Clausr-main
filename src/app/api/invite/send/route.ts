import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendInviteEmail } from '@/lib/resend'
import { getUserRole } from '@/lib/permissions'

export async function POST(req: Request) {
  try {
    const { orgId, email, role, inviterName, orgName } = await req.json()
    const supabase = createServiceClient()

    // Get the current user to verify they're an admin
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an admin in this organization
    const userRole = await getUserRole(supabase, orgId)
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can invite members' },
        { status: 403 }
      )
    }

    // Verify the org exists and user is a member
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, organisations(name)')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'You are not a member of this organization' },
        { status: 403 }
      )
    }

    // Insert invitation
    const { data: invitation, error: insertErr } = await supabase
      .from('invitations')
      .insert({ org_id: orgId, email, role, invited_by: user.id })
      .select()
      .single()
    if (insertErr) throw insertErr

    // Log the activity
    await supabase.from('activity_log').insert({
      org_id: orgId,
      user_id: user.id,
      action: `Invited ${email} as ${role}`,
    })

    // Send email
    const appUrl = process.env.APP_URL || 'http://localhost:3000'
    const inviteUrl = `${appUrl}/invite/${invitation.token}`
    if (process.env.NODE_ENV === 'development') {
      console.log(`Invite URL for ${email}: ${inviteUrl}`)
    }
    await sendInviteEmail({
      to: email,
      orgName,
      inviterName,
      inviteUrl,
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Invite send error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
