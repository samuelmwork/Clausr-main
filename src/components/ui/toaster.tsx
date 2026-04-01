'use client'
import { useState, useCallback, useEffect } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

let toastFn: ((msg: string, type?: Toast['type']) => void) | null = null

export function toast(message: string, type: Toast['type'] = 'success') {
  if (toastFn) toastFn(message, type)
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  useEffect(() => {
    toastFn = addToast
    return () => { toastFn = null }
  }, [addToast])

  const colors: Record<Toast['type'], string> = {
    success: 'bg-active-text text-white',
    error: 'bg-expired-text text-white',
    info: 'bg-brand text-white',
  }

  return (
    <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`${colors[t.type]} px-4 py-3 rounded-xl text-sm font-medium shadow-lg animate-in slide-in-from-bottom-2 duration-200`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
