import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createServiceClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/permissions'
import { isPaidPlan, getPlanLimit, getRazorpayPlanId } from '@/lib/billing'

export async function POST(req: Request) {
  try {
    const { planId, orgId } = await req.json() as { planId?: string; orgId?: string }
    const supabase = createServiceClient()

    if (!orgId || !planId) {
      return NextResponse.json({ error: 'Missing orgId or planId' }, { status: 400 })
    }

    if (!isPaidPlan(planId)) {
      return NextResponse.json({ error: 'Invalid paid plan' }, { status: 400 })
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Missing Razorpay API env vars' }, { status: 500 })
    }

    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Missing RAZORPAY_WEBHOOK_SECRET. Configure webhook secret before creating subscriptions.' },
        { status: 500 }
      )
    }

    const razorpayPlanId = getRazorpayPlanId(planId)
    if (!razorpayPlanId) {
      return NextResponse.json(
        { error: `Missing Razorpay plan mapping for ${planId}` },
        { status: 500 }
      )
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

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

    const { data: org } = await supabase
      .from('organisations')
      .select('razorpay_subscription_id, subscription_status')
      .eq('id', orgId)
      .single()

    if (org?.razorpay_subscription_id && ['active', 'authenticated'].includes(org.subscription_status || '')) {
      return NextResponse.json(
        { error: 'An active subscription already exists for this organization.' },
        { status: 409 }
      )
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id: razorpayPlanId,
      customer_notify: 1,
      quantity: 1,
      total_count: 1200,
      notes: { orgId, planId },
    }).catch((error) => {
      console.error('Razorpay create subscription failed:', error)
      throw new Error(`Razorpay: ${error.description || error.message || 'Failed to create subscription'}`)
    })

    await supabase
      .from('organisations')
      .update({
        razorpay_subscription_id: subscription.id,
        subscription_status: subscription.status || 'created',
      })
      .eq('id', orgId)

    // Log the activity
    await supabase.from('activity_log').insert({
      org_id: orgId,
      user_id: user.id,
      action: `Created ${planId} subscription`,
      details: {
        subscription_id: subscription.id,
        status: subscription.status || 'created',
        plan_limit: getPlanLimit(planId),
      },
    })

    return NextResponse.json({
      subscriptionId: subscription.id,
      key: process.env.RAZORPAY_KEY_ID,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Billing order error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
