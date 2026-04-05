import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createServiceClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/permissions'
import { isPaidPlan, getPlanLimit, getRazorpayPlanId, getErrorMessage } from '@/lib/billing'

export async function POST(req: Request) {
  try {
    const { planId, orgId } = await req.json() as { planId?: string; orgId?: string }
    const supabase = await createServiceClient()

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
      .select('razorpay_subscription_id, subscription_status, plan')
      .eq('id', orgId)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // If there's an existing active subscription, cancel it immediately before upgrading
    if (org.razorpay_subscription_id && ['active', 'authenticated', 'created'].includes(org.subscription_status || '')) {
      try {
        await razorpay.subscriptions.cancel(org.razorpay_subscription_id, false)
        console.log(`Cancelled old subscription ${org.razorpay_subscription_id} for org ${orgId}`)
      } catch (cancelErr: unknown) {
        const errorMsg = getErrorMessage(cancelErr)
        // If it's already cancelled/completed, we can safely continue
        const ignoreErrors = ['cancelled', 'completed', 'not found', 'terminated']
        const shouldIgnore = ignoreErrors.some(term => errorMsg.toLowerCase().includes(term))

        if (!shouldIgnore) {
          console.error('Failed to cancel old subscription:', errorMsg, cancelErr)
          return NextResponse.json(
            { error: `Failed to cancel existing subscription before upgrade: ${errorMsg}` },
            { status: 500 }
          )
        }
        console.log(`Old subscription ${org.razorpay_subscription_id} already in a terminal state: ${errorMsg}`)
      }

      await supabase.from('activity_log').insert({
        org_id: orgId,
        user_id: user.id,
        action: `Cancelled old ${org.plan} subscription for upgrade to ${planId}`,
        details: { old_subscription_id: org.razorpay_subscription_id },
      })
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id: razorpayPlanId,
      customer_notify: 1,
      quantity: 1,
      total_count: 360, // keep total duration within 30 years for UPI authorizations
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
    const message = getErrorMessage(err)
    console.error('Billing order error:', message, err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
