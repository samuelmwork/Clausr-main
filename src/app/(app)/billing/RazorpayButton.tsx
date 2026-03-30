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
  amount: number
  orgId: string
  userEmail: string
  userName: string
}

export default function RazorpayButton({ planId, planName, amount, orgId, userEmail, userName }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handlePayment() {
    setLoading(true)
    try {
      // 1. Create Razorpay order
      const res = await fetch('/api/billing/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, amount, orgId }),
      })
      const { orderId, key } = await res.json()

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
        amount,
        currency: 'INR',
        name: 'Clausr',
        description: `${planName} Plan`,
        order_id: orderId,
        prefill: { name: userName, email: userEmail },
        theme: { color: '#185FA5' },
        handler: async function(response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) {
          // 4. Verify payment
          await fetch('/api/billing/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              planId, orgId,
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
            }),
          })
          router.refresh()
          router.push('/dashboard')
        },
      })
      rzp.open()
    } catch (err) {
      console.error('Payment error:', err)
      alert('Payment failed. Please try again.')
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="w-full bg-[#185FA5] text-white py-2 rounded-lg text-sm font-semibold hover:bg-[#0C447C] transition-colors disabled:opacity-60">
      {loading ? 'Loading…' : `Upgrade to ${planName}`}
    </button>
  )
}
