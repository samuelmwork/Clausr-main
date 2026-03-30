import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'Clausr — Vendor Contract Intelligence',
  description: 'Track, manage, and never miss a vendor contract renewal. Built for Indian SMBs.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-page text-slate-800 antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
