import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Cormorant_Garamond, Manrope } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui'
import { RegisterServiceWorker } from './register-sw'

const cormorant = Cormorant_Garamond({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-cormorant',
  display: 'swap',
})

const manrope = Manrope({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Dance Teaching Schedule',
  description: 'Professional dance teaching schedule management system',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Dance Schedule',
  },
  icons: [
    { rel: 'icon', url: '/favicon.ico' },
    { rel: 'apple-touch-icon', url: '/icon-192.png' },
  ],
  themeColor: '#c75a6d',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#c75a6d',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${manrope.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#c75a6d" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Dance Schedule" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-JYEPWDHDW0" />
        <Script id="google-analytics">
          {`window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-JYEPWDHDW0');`}
        </Script>
      </head>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
        <RegisterServiceWorker />
      </body>
    </html>
  )
}
