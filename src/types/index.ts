export type Plan = 'free' | 'starter' | 'pro' | 'team'
export type ContractType = 'saas' | 'services' | 'lease' | 'nda' | 'employment' | 'other'
export type ContractStatus = 'active' | 'expiring' | 'expired' | 'cancelled' | 'renewed'
export type MemberRole = 'admin' | 'editor' | 'viewer'

export interface Organisation {
  id: string
  name: string
  plan: Plan
  contract_limit: number
  razorpay_subscription_id?: string
  subscription_status?: string
  created_at: string
}

export interface Profile {
  id: string
  full_name: string
  email: string
  avatar_url?: string
}

export interface Member {
  id: string
  org_id: string
  user_id: string
  role: MemberRole
  created_at: string
  name?: string
  email?: string
  profiles?: Profile
  display_name?: string
}

export interface Contract {
  id: string
  org_id: string
  vendor_name: string
  contract_type: ContractType
  value_annual: number
  currency: string
  start_date?: string
  end_date: string
  auto_renews: boolean
  notice_days: number
  owner_id?: string
  status: ContractStatus
  file_url?: string
  file_name?: string
  notes?: string
  vendor_score?: number
  tags?: string[]
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface Alert {
  id: string
  contract_id: string
  days_before: number
  scheduled_for: string
  sent: boolean
  sent_at?: string
}

export interface ActivityLog {
  id: string
  contract_id?: string
  org_id: string
  user_id?: string
  action: string
  details?: Record<string, unknown>
  created_at: string
  profiles?: Profile
}

export interface DashboardStats {
  total: number
  active: number
  expiring: number
  expired: number
  total_spend: number
  renewing_this_month: number
}

export const PLAN_LIMITS: Record<Plan, number> = {
  free: 5,
  starter: 25,
  pro: 999,
  team: 9999,
}

export const PLAN_PRICES: Record<string, { amount: number; label: string }> = {
  starter: { amount: 99900, label: '₹999/month' },
  pro:     { amount: 299900, label: '₹2,999/month' },
  team:    { amount: 699900, label: '₹6,999/month' },
}
