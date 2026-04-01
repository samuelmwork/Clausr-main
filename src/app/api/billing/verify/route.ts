import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/permissions'
import { isPaidPlan, getPlanLimit } from '@/lib/billing'

export async function POST(req: Request) {
  try {
    const { planId, orgId, paymentId, subscriptionId, signature } = await req.json() as {
      planId?: string
      orgId?: string
      paymentId?: string
      subscriptionId?: string
      signature?: string
    }

    if (!planId || !orgId || !paymentId || !subscriptionId || !signature) {
      return NextResponse.json({ error: 'Missing payment verification fields' }, { status: 400 })
    }

    if (!isPaidPlan(planId)) {
      return NextResponse.json({ error: 'Invalid paid plan' }, { status: 400 })
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Missing Razorpay key secret' }, { status: 500 })
    }

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${paymentId}|${subscriptionId}`)
      .digest('hex')

    if (expectedSig !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = await createServiceClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(supabase, orgId)
    if (!['admin', 'editor'].includes(userRole || '')) {
      return NextResponse.json(
        { error: 'Only admins or editors can manage billing' },
        { status: 403 }
      )
    }

    const limit = getPlanLimit(planId)
    await supabase
      .from('organisations')
      .update({
        plan: planId,
        contract_limit: limit,
        subscription_status: 'active',
        razorpay_subscription_id: subscriptionId,
      })
      .eq('id', orgId)

    await supabase.from('activity_log').insert({
      org_id: orgId,
      user_id: user.id,
      action: `Activated ${planId} subscription`,
      details: {
        payment_id: paymentId,
        subscription_id: subscriptionId,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
