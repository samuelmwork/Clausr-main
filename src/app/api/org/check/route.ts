import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { orgName } = await req.json() as { orgName?: string }
    const normalizedOrgName = String(orgName || '').trim()

    if (!normalizedOrgName) {
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('organisations')
      .select('id')
      .ilike('name', normalizedOrgName)
      .limit(1)

    if (error) {
      console.error('Org existence check failed:', error)
      return NextResponse.json({ error: 'Could not verify organisation uniqueness' }, { status: 500 })
    }

    if (data && data.length > 0) {
      return NextResponse.json({ exists: true, error: 'Organization already exists' }, { status: 409 })
    }

    return NextResponse.json({ exists: false })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
