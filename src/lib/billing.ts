export const PLAN_LIMITS = {
  free: 5,
  test: 25,
  starter: 25,
  pro: 999,
  team: 9999,
} as const

export type BillingPlanId = keyof typeof PLAN_LIMITS
export type PaidPlanId = Exclude<BillingPlanId, 'free'>

const PAID_PLANS: PaidPlanId[] = ['test', 'starter', 'pro', 'team']

export function isPaidPlan(planId: string): planId is PaidPlanId {
  return PAID_PLANS.includes(planId as PaidPlanId)
}

export function getPlanLimit(planId: BillingPlanId): number {
  return PLAN_LIMITS[planId]
}

export function getRazorpayPlanId(planId: PaidPlanId): string | null {
  const mapping: Record<PaidPlanId, string | undefined> = {
    test: process.env.RAZORPAY_PLAN_ID_TEST,
    starter: process.env.RAZORPAY_PLAN_ID_STARTER,
    pro: process.env.RAZORPAY_PLAN_ID_PRO,
    team: process.env.RAZORPAY_PLAN_ID_TEAM,
  }

  return mapping[planId] || null
}
