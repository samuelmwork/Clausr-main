'use client'
import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const unwrappedParams = use(params)
  const token = unwrappedParams.token
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [invitation, setInvitation] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadInvitation() {
      try {
        const { data, error } = await supabase
          .from('invitations')
          .select('*, organisations(name)')
          .eq('token', token)
          .maybeSingle()

        if (error) {
          console.error('Invite query error:', error)
          setError('Unable to load invitation (supabase error). Check console for details.')
          return
        }

        if (!data) {
          setError('Invalid or expired invitation')
          return
        }

        if (data.accepted) {
          setError('Invitation already accepted')
          return
        }

        const { data: authData } = await supabase.auth.getUser()
        setCurrentUser(authData?.user || null)

        setInvitation(data)
      } catch (err) {
        console.error('Unexpected invitation load error:', err)
        setError('Unable to load invitation. Please refresh and try again.')
      } finally {
        setLoading(false)
      }
    }

    setLoading(true)
    setError('')
    loadInvitation()
  }, [token, supabase])

  async function acceptInvitation() {
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/auth/signup?invite=${token}`)
      return
    }

    if (user.email !== invitation.email) {
      setError(`You are logged in as ${user.email}. Please sign out to accept this invitation for ${invitation.email}.`)
      setLoading(false)
      return
    }

    // Use the API route instead of direct Supabase calls
    try {
      console.log('Accepting invitation with token:', token)
      const res = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          inviteToken: token,
        }),
      })

      console.log('API response status:', res.status)
      const responseData = await res.json()
      console.log('API response data:', responseData, 'status', res.status)

      if (!res.ok) {
        const message = responseData?.error || responseData?.message || `Failed to accept invitation (status ${res.status})`
        setError(message)
        setLoading(false)
        return
      }

      const { orgId } = responseData
      console.log('Successfully joined org:', orgId)
      router.push('/dashboard')
    } catch (err) {
      console.error('Accept invitation error:', err)
      const message = err instanceof Error ? err.message : String(err)
      setError(`Failed to accept invitation: ${message}`)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#185FA5] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-[#0B1F3A] mb-2">Invitation Error</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link href="/auth/login" className="bg-[#185FA5] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#0C447C] transition-colors">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-surface border border-border rounded-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">📧</div>
          <h1 className="text-2xl font-bold text-[#0B1F3A]">Team Invitation</h1>
          <p className="text-slate-600 mt-2">
            You&apos;ve been invited to join <strong>{invitation.organisations?.name}</strong> as a <strong>{invitation.role}</strong>.
          </p>
        </div>

        {currentUser && currentUser.email !== invitation.email ? (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <p className="mb-3">
              You are currently logged in as <strong>{currentUser.email}</strong>. This invitation is for <strong>{invitation.email}</strong>.
            </p>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                // Force a full reload to clear any cached states
                window.location.reload()
              }}
              className="w-full bg-white border border-amber-300 text-amber-900 py-2 rounded font-semibold hover:bg-amber-100 transition-colors"
            >
              Sign out to continue
            </button>
          </div>
        ) : (
          <button
            onClick={acceptInvitation}
            disabled={loading}
            className="w-full bg-[#185FA5] text-white py-3 rounded-lg font-semibold hover:bg-[#0C447C] transition-colors disabled:opacity-60 mb-4">
            {loading ? 'Accepting...' : 'Accept Invitation'}
          </button>
        )}

        <p className="text-xs text-muted text-center">
          By accepting, you&apos;ll have access to all contracts and team features.
        </p>
      </div>
    </div>
  )
}
