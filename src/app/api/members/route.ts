import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const orgId = url.searchParams.get('orgId')
  if (!orgId) {
    return NextResponse.json({ error: 'Missing orgId' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Get members in organization
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('id, user_id, role, created_at, name, email')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })

  if (membersError) {
    console.error('Members lookup error:', membersError)
    return NextResponse.json({ error: membersError.message || 'Could not load members' }, { status: 500 })
  }

  const userIds = members?.map(m => m.user_id).filter(Boolean) ?? []

  // Profile data for member users
  const { data: profiles = [] } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds)

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

  // fallback to auth user metadata for any missing profile case
  const missingIds = userIds.filter(id => !profileMap.has(id))
  const authUsers: any[] = []
  for (const id of missingIds) {
    const { data, error } = await supabase.auth.admin.getUserById(id)
    if (error) {
      console.warn(`getUserById ${id} error:`, error.message)
    } else if (data?.user) {
      authUsers.push(data.user)
    }
  }
  const authUserMap = new Map(authUsers.map((u: any) => [u.id, u]))

  const enriched = members.map(member => {
    const profile = profileMap.get(member.user_id)
    const authUser = authUserMap.get(member.user_id)

    return {
      ...member,
      profiles: {
        full_name: member.name || profile?.full_name || (authUser?.user_metadata as any)?.full_name || '',
        email: member.email || profile?.email || authUser?.email || '',
      },
      display_name: [
        member.name,
        profile?.full_name,
        (authUser?.user_metadata as any)?.full_name,
        authUser?.email,
        member.email,
        profile?.email,
        'Team member',
      ].find(Boolean) || `Member ${String(member.user_id || '').slice(0, 8)}`,
    }
  })

  return NextResponse.json({ data: enriched || [] })
}
