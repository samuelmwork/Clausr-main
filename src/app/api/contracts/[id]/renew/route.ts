import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(
  _: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const serviceSupabase = await createServiceClient()
  const resolvedParams = await params
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  }

  const contractId = resolvedParams.id
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('org_id')
    .eq('id', contractId)
    .single()

  if (contractError || !contract) {
    return NextResponse.json({ error: 'Contract not found.' }, { status: 404 })
  }

  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('role, org_id')
    .eq('user_id', user.id)
    .eq('org_id', contract.org_id)
    .single()

  if (memberError || !member || !['admin', 'editor'].includes(member.role)) {
    return NextResponse.json({ error: 'You do not have permission to renew this contract.' }, { status: 403 })
  }

  const { data: updatedContracts, error: updateError } = await serviceSupabase
    .from('contracts')
    .update({ status: 'renewed' })
    .eq('id', contractId)
    .select('id')

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  if (!updatedContracts || updatedContracts.length === 0) {
    return NextResponse.json({ error: 'Contract update failed.' }, { status: 500 })
  }

  const { data: deletedAlerts, error: deleteAlertsError } = await serviceSupabase
    .from('alerts')
    .delete()
    .eq('contract_id', contractId)
    .select('id')

  if (deleteAlertsError) {
    console.error('Renewal alert delete error:', deleteAlertsError)
    return NextResponse.json({ error: deleteAlertsError.message }, { status: 500 })
  }

  const { data: contractAfter, error: contractAfterError } = await serviceSupabase
    .from('contracts')
    .select('status')
    .eq('id', contractId)
    .single()

  if (contractAfterError || !contractAfter) {
    return NextResponse.json({ error: contractAfterError?.message || 'Failed to verify contract after update.' }, { status: 500 })
  }

  const { error: activityError } = await serviceSupabase.from('activity_log').insert({
    contract_id: contractId,
    org_id: contract.org_id,
    user_id: user.id,
    action: 'Contract marked as Renewed',
  })

  if (activityError) {
    console.error('Renewal activity log error:', activityError)
  }

  return NextResponse.json({
    success: true,
    contractStatus: contractAfter.status,
    deletedAlertsCount: deletedAlerts?.length ?? 0,
  })
}
