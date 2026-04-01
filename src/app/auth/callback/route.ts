import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const inviteToken = searchParams.get('invite')
  const queryOrgName = searchParams.get('orgName')?.trim() || ''
  if (code) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code)
    if (user) {
      const metadataOrgName =
        typeof user.user_metadata?.org_name === 'string'
          ? user.user_metadata.org_name.trim()
          : ''
      const fallbackOrgName = user.user_metadata?.full_name
        ? `${user.user_metadata.full_name}'s Workspace`
        : 'My Workspace'
      const orgName = queryOrgName || metadataOrgName || fallbackOrgName

        // If inviteToken exists, invite onboarding should be processed even if user already belongs to some org
      if (inviteToken) {
        const inviteRes = await fetch(`${origin}/api/onboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            orgName,
            fullName: user.user_metadata?.full_name || '',
            inviteToken: inviteToken,
          }),
        })

        const inviteData = await inviteRes.json()
        console.log('Invite onboarding result:', inviteData)
      } else {
        const { data: member } = await supabase
          .from('members').select('id').eq('user_id', user.id).single()

        if (!member) {
          await fetch(`${origin}/api/onboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              orgName,
              fullName: user.user_metadata?.full_name || '',
            }),
          })
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }
  return NextResponse.redirect(`${origin}/auth/login`)
}
