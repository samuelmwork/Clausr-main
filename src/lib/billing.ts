export const PLAN_LIMITS = {
  free: 2,
  starter: 10,
  pro: 25,
  team: 100,
} as const

export type BillingPlanId = keyof typeof PLAN_LIMITS
export type PaidPlanId = Exclude<BillingPlanId, 'free'>

const PAID_PLANS: PaidPlanId[] = ['starter', 'pro', 'team']

export function isPaidPlan(planId: string): planId is PaidPlanId {
  return PAID_PLANS.includes(planId as PaidPlanId)
}

export function getPlanLimit(planId: BillingPlanId): number {
  return PLAN_LIMITS[planId]
}

export function getRazorpayPlanId(planId: PaidPlanId): string | null {
  const mapping: Record<PaidPlanId, string | undefined> = {
    starter: process.env.RAZORPAY_PLAN_ID_STARTER,
    pro: process.env.RAZORPAY_PLAN_ID_PRO,
    team: process.env.RAZORPAY_PLAN_ID_TEAM,
  }

  return mapping[planId] || null
}

export function getErrorMessage(err: unknown): string {
  // Handle standard Error objects
  if (err instanceof Error) {
    return err.message
  }

  // Handle Razorpay error objects and other plain objects
  if (typeof err === 'object' && err !== null) {
    const errorObj = err as any
    
    // Razorpay standard error structure: { error: { description, code, ... } }
    if (errorObj.error && typeof errorObj.error === 'object') {
      return errorObj.error.description || errorObj.error.code || JSON.stringify(errorObj.error)
    }

    // fallback for objects with message or description
    return errorObj.message || errorObj.description || JSON.stringify(err)
  }

  return String(err)
}
