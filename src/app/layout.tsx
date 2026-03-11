import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/navbar'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Renovation Tracker',
  description: 'Memonitor progress pekerjaan renovasi secara real-time',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className="antialiased">
      <body className={`${inter.className} min-h-screen bg-neutral-50 flex flex-col`}>
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-4 md:py-8">
          {children}
        </main>
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
