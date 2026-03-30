import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInDays, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd MMM yyyy')
}

export function daysUntil(date: string) {
  return differenceInDays(parseISO(date), new Date())
}

export function urgencyColor(days: number) {
  if (days <= 0)  return 'text-red-600 bg-red-50'
  if (days <= 30) return 'text-red-600 bg-red-50'
  if (days <= 60) return 'text-amber-600 bg-amber-50'
  return 'text-green-700 bg-green-50'
}

export function urgencyLabel(days: number) {
  if (days <= 0)  return 'Expired'
  if (days === 1) return 'Tomorrow'
  if (days <= 7)  return `${days}d left`
  if (days <= 30) return `${days}d left`
  return `${days} days`
}

export function contractTypeLabel(type: string) {
  const map: Record<string, string> = {
    saas: 'SaaS', services: 'Services', lease: 'Lease',
    nda: 'NDA', employment: 'Employment', other: 'Other',
  }
  return map[type] ?? type
}

export function planLabel(plan: string) {
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

export function getInitials(name?: string) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function computeContractStatus(status: string, end_date: string) {
  if (status === 'cancelled' || status === 'renewed') return status

  const days = daysUntil(end_date)
  if (days <= 0) return 'expired'
  if (days <= 30) return 'expiring'
  return 'active'
}
