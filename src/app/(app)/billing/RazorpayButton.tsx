'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void }
  }
}

interface Props {
  planId: string
  planName: string
  orgId: string
  userEmail: string
  userName: string
  currentPlan?: string
}

type RazorpaySuccessResponse = {
  razorpay_payment_id: string
  razorpay_subscription_id: string
  razorpay_signature: string
}

export default function RazorpayButton({ planId, planName, orgId, userEmail, userName, currentPlan }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const isPaidCurrentPlan = currentPlan && currentPlan !== 'free'
  const buttonLabel = loading
    ? 'Loading…'
    : isPaidCurrentPlan
    ? `Switch to ${planName}`
    : `Upgrade to ${planName}`

  async function handlePayment() {
    // Warn user if they're switching from an active paid plan
    if (isPaidCurrentPlan) {
      const confirmed = window.confirm(
        `You are currently on the ${currentPlan?.toUpperCase()} plan.\n\nSwitching to ${planName} will immediately cancel your current subscription and start a new one.\n\nContinue?`
      )
      if (!confirmed) return
    }
    setLoading(true)
    try {
      // 1. Create Razorpay subscription
      const res = await fetch('/api/billing/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, orgId }),
      })

      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to create subscription')
      }

      const { subscriptionId, key } = payload as { subscriptionId: string; key: string }

      // 2. Load Razorpay script
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://checkout.razorpay.com/v1/checkout.js'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load Razorpay'))
          document.body.appendChild(script)
        })
      }

      // 3. Open checkout
      const rzp = new window.Razorpay({
        key,
        currency: 'INR',
        name: 'Clausr',
        description: `${planName} Plan`,
        subscription_id: subscriptionId,
        prefill: { name: userName, email: userEmail },
        theme: { color: '#185FA5' },
        handler: async function(response: RazorpaySuccessResponse) {
          // 4. Verify payment
          const verifyRes = await fetch('/api/billing/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              planId,
              orgId,
              paymentId: response.razorpay_payment_id,
              subscriptionId: response.razorpay_subscription_id,
              signature: response.razorpay_signature,
            }),
          })

          if (!verifyRes.ok) {
            const verifyPayload = await verifyRes.json().catch(() => ({}))
            throw new Error(verifyPayload.error || 'Payment verification failed')
          }

          router.refresh()
          router.push('/dashboard')
        },
      })
      rzp.open()
    } catch (err) {
      console.error('Payment error:', err)
      const message = err instanceof Error ? err.message : 'Payment failed. Please try again.'
      alert(message)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="w-full bg-[#185FA5] text-white py-2 rounded-lg text-sm font-semibold hover:bg-[#0C447C] transition-colors disabled:opacity-60">
      {buttonLabel}
    </button>
  )
}
