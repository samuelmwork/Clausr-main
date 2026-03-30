import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createServiceClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/permissions'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(req: Request) {
  try {
    const { amount, planId, orgId } = await req.json()
    const supabase = createServiceClient()

    // Log keys presence (without values)
    console.log('Razorpay keys present:', {
      key_id: !!process.env.RAZORPAY_KEY_ID,
      key_secret: !!process.env.RAZORPAY_KEY_SECRET,
    })

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Missing Razorpay env vars' }, { status: 500 })
    }

    // Verify user is authenticated and is an admin
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an admin in this organization
    const userRole = await getUserRole(supabase, orgId)
    if (!['admin', 'editor'].includes(userRole || '')) {
      return NextResponse.json(
        { error: 'Only admins or editors can manage billing' },
        { status: 403 }
      )
    }

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `clausr_${orgId}_${planId}`.slice(0, 40),
      notes: { orgId, planId },
    }).catch((error) => {
      console.error('Razorpay create order failed:', error)
      throw new Error(`Razorpay: ${error.description || error.message || 'Failed to create order'}`)
    })

    // Log the activity
    await supabase.from('activity_log').insert({
      org_id: orgId,
      user_id: user.id,
      action: `Initiated payment for plan ${planId}`,
    })

    return NextResponse.json({
      orderId: order.id,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Billing order error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
