import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { getPlanLimit, isPaidPlan } from '@/lib/billing'

export const runtime = 'nodejs'

type WebhookEventPayload = {
  event?: string
  payload?: {
    subscription?: {
      entity?: {
        id?: string
        status?: string
        notes?: Record<string, string>
      }
    }
    payment?: {
      entity?: {
        subscription_id?: string
        status?: string
        notes?: Record<string, string>
      }
    }
  }
}

function isValidSignature(signature: string, body: string, secret: string): boolean {
  const digest = crypto.createHmac('sha256', secret).update(body).digest('hex')
  const digestBuffer = Buffer.from(digest)
  const signatureBuffer = Buffer.from(signature)

  if (digestBuffer.length !== signatureBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(digestBuffer, signatureBuffer)
}

function extractSubscription(payload: WebhookEventPayload): {
  subscriptionId: string | null
  status: string | null
  notes: Record<string, string>
} {
  const subEntity = payload.payload?.subscription?.entity
  if (subEntity?.id) {
    return {
      subscriptionId: subEntity.id,
      status: subEntity.status || null,
      notes: subEntity.notes || {},
    }
  }

  const paymentEntity = payload.payload?.payment?.entity
  if (paymentEntity?.subscription_id) {
    return {
      subscriptionId: paymentEntity.subscription_id,
      status: paymentEntity.status || null,
      notes: paymentEntity.notes || {},
    }
  }

  return {
    subscriptionId: null,
    status: null,
    notes: {},
  }
}

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-razorpay-signature')
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: 'Missing webhook signature or secret' }, { status: 401 })
    }

    const rawBody = await req.text()
    if (!isValidSignature(signature, rawBody, webhookSecret)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody) as WebhookEventPayload
    const event = payload.event || 'unknown'
    const { subscriptionId, status, notes } = extractSubscription(payload)

    if (!subscriptionId) {
      return NextResponse.json({ ok: true, ignored: true, reason: 'No subscription id' })
    }

    const supabase = createAdminClient()

    let orgIdFromDb: string | null = null
    let currentPlan: string = 'free'

    const { data: existingOrg } = await supabase
      .from('organisations')
      .select('id, plan')
      .eq('razorpay_subscription_id', subscriptionId)
      .maybeSingle()

    if (existingOrg?.id) {
      orgIdFromDb = existingOrg.id
      currentPlan = existingOrg.plan || 'free'
    } else if (notes.orgId) {
      const { data: orgById } = await supabase
        .from('organisations')
        .select('id, plan')
        .eq('id', notes.orgId)
        .maybeSingle()

      if (orgById?.id) {
        orgIdFromDb = orgById.id
        currentPlan = orgById.plan || 'free'
      }
    }

    if (!orgIdFromDb) {
      return NextResponse.json({ ok: true, ignored: true, reason: 'No matching org' })
    }

    const updates: Record<string, string | number> = {
      razorpay_subscription_id: subscriptionId,
      subscription_status: status || 'unknown',
    }

    const activateEvents = new Set([
      'subscription.authenticated',
      'subscription.activated',
      'subscription.charged',
      'subscription.resumed',
    ])
    const downgradeEvents = new Set([
      'subscription.cancelled',
      'subscription.completed',
      'subscription.halted',
    ])

    const requestedPlan = notes.planId
    const shouldActivatePaid = activateEvents.has(event)
    const shouldDowngrade = downgradeEvents.has(event)

    if (shouldActivatePaid) {
      const fallbackPlan = isPaidPlan(currentPlan) ? currentPlan : null
      const paidPlan = requestedPlan && isPaidPlan(requestedPlan)
        ? requestedPlan
        : fallbackPlan

      if (paidPlan) {
        updates.plan = paidPlan
        updates.contract_limit = getPlanLimit(paidPlan)
      }
    } else if (shouldDowngrade) {
      updates.plan = 'free'
      updates.contract_limit = getPlanLimit('free')
      updates.subscription_status = 'inactive'
    }

    await supabase
      .from('organisations')
      .update(updates)
      .eq('id', orgIdFromDb)

    await supabase.from('activity_log').insert({
      org_id: orgIdFromDb,
      action: `Billing webhook: ${event}`,
      details: {
        subscription_id: subscriptionId,
        status: status || 'unknown',
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Billing webhook error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

