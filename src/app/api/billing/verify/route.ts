import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { isPaidPlan, getPlanLimit, getErrorMessage } from '@/lib/billing'

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

    const supabase = createAdminClient()
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
      action: `Activated ${planId} subscription`,
      details: {
        payment_id: paymentId,
        subscription_id: subscriptionId,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = getErrorMessage(err)
    console.error('Billing verification error:', message, err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
