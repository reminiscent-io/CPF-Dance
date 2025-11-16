import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Dance Schedule Management',
  description: 'Professional dance teaching schedule management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
