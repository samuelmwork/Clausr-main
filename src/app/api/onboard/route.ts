import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { userId, orgName, fullName, inviteToken } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Update profile name if provided
    if (fullName) {
      await supabase.from('profiles').upsert({ id: userId, full_name: fullName })
    }

    // Check if already has org
    let invitation = null
    if (inviteToken) {
      // First get the invitation to check membership
      const { data: inviteData, error: inviteErr } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', inviteToken)
        .eq('accepted', false)
        .single()
      if (inviteErr) {
        console.error('Invite lookup error:', inviteErr)
        return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 })
      }
      if (!inviteData) {
        return NextResponse.json({ error: 'Invitation not found or already accepted' }, { status: 404 })
      }
      invitation = inviteData

      // Check if already a member of this org
      const { data: existingMember } = await supabase
        .from('members').select('id').eq('user_id', userId).eq('org_id', invitation.org_id).single()
      if (existingMember) {
        console.log('User already member of this org, marking invitation accepted and updating member timestamp')

        // Update member created_at to make this the current org
        const { error: memberUpdateErr } = await supabase
          .from('members')
          .update({ created_at: new Date().toISOString() })
          .eq('id', existingMember.id)

        if (memberUpdateErr) {
          console.error('Error updating existing member record:', memberUpdateErr)
          return NextResponse.json({ error: 'Membership update failed' }, { status: 500 })
        }

        // Mark invitation accepted for visibility
        const { error: acceptErr } = await supabase
          .from('invitations')
          .update({ accepted: true })
          .eq('id', invitation.id)

        if (acceptErr) {
          console.error('Error marking invitation accepted:', acceptErr)
          return NextResponse.json({ error: 'Failed to mark invitation accepted' }, { status: 500 })
        }

        return NextResponse.json({ ok: true, orgId: invitation.org_id })
      }
    } else {
      // Check if already has any org (for new signups)
      const { data: existingMember } = await supabase
        .from('members').select('id').eq('user_id', userId).single()
      if (existingMember) return NextResponse.json({ ok: true })
    }

    if (invitation) {

      console.log('Found invitation:', invitation)
      console.log('User ID:', userId)

      // Get the current user's email to verify it matches the invitation
      const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(userId)
      if (userErr || !userData.user) {
        console.error('User lookup error:', userErr)
        return NextResponse.json({ error: 'Signed in user not found' }, { status: 404 })
      }

      console.log('User email:', userData.user.email)
      console.log('Invitation email:', invitation.email)

      // In development, allow any email to accept invites (since all emails go to your test account)
      const isDev = process.env.NODE_ENV === 'development'
      if (!isDev && userData.user.email !== invitation.email) {
        const message = `This invitation is for ${invitation.email}, but you're signed in as ${userData.user.email}`
        console.error('Invitation mismatch:', message)
        return NextResponse.json({ error: message }, { status: 403 })
      }

      // Verify user exists in auth.users before inserting to members
      if (!userData.user) {
        console.error('Auth user not found:', userId)
        return NextResponse.json({ error: 'User not found in auth.users' }, { status: 404 })
      }

      // Create member
      const { error: memberErr } = await supabase
        .from('members').insert({
          org_id: invitation.org_id,
          user_id: userId,
          role: invitation.role,
          invited_by: invitation.invited_by,
        })
      if (memberErr) {
        console.error('Member creation error:', memberErr)
        throw memberErr
      }

      // Mark accepted
      const { error: updateErr } = await supabase
        .from('invitations')
        .update({ accepted: true })
        .eq('id', invitation.id)

      if (updateErr) {
        console.error('Invitation update error:', updateErr)
        return NextResponse.json({ error: 'Failed to finalize invitation acceptance' }, { status: 500 })
      }

      console.log('Successfully accepted invitation for org:', invitation.org_id)
      return NextResponse.json({ ok: true, orgId: invitation.org_id })
    } else {
      // Ensure user exists in auth.users
      const { data: userData } = await supabase.auth.admin.getUserById(userId)
      if (!userData?.user) {
        return NextResponse.json({ error: 'User not found in auth.users. Please sign out and sign in again.' }, { status: 400 })
      }

      // Enforce unique email across profiles (case-insensitive)
      const normalizedEmail = (userData.user.email || '').trim()
      if (normalizedEmail) {
        const { data: existingProfileByEmail, error: existingProfileErr } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', normalizedEmail)
          .neq('id', userId)
          .limit(1)

        if (existingProfileErr) {
          console.error('Profile email uniqueness check failed:', existingProfileErr)
          return NextResponse.json({ error: 'Could not verify email uniqueness' }, { status: 500 })
        }

        if (existingProfileByEmail && existingProfileByEmail.length > 0) {
          return NextResponse.json(
            { error: 'This email is already registered. Please sign in instead of creating a new account.' },
            { status: 409 }
          )
        }
      }

      // Create organisation
      const { data: org, error: orgErr } = await supabase
        .from('organisations').insert({ name: orgName || 'My Workspace', plan: 'free', contract_limit: 5 })
        .select().single()
      if (orgErr) throw orgErr

      // Create member (admin)
      const { error: memberErr } = await supabase
        .from('members').insert({ org_id: org.id, user_id: userId, role: 'admin' })
      if (memberErr) throw memberErr

      return NextResponse.json({ ok: true, orgId: org.id })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Unhandled error in /api/onboard:', err)
    return NextResponse.json({ error: message || 'Unknown error in onboarding' }, { status: 500 })
  }
}
