import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'

const PLAN_LIMITS: Record<string, number> = {
  starter: 25,
  pro: 999,
  team: 9999,
}

export async function POST(req: Request) {
  try {
    const { planId, orgId, paymentId, orderId, signature } = await req.json()

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${orderId}|${paymentId}`)
      .digest('hex')

    if (expectedSig !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Update org plan
    const supabase = createServiceClient()
    const limit = PLAN_LIMITS[planId] || 5
    await supabase
      .from('organisations')
      .update({
        plan: planId,
        contract_limit: limit,
        subscription_status: 'active',
        razorpay_subscription_id: paymentId,
      })
      .eq('id', orgId)

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
