import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Manrope } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { ToastProvider } from '@/components/ui'
import { RegisterServiceWorker } from './register-sw'
import CookieConsentBanner from '@/components/CookieConsentBanner'

const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant-garamond',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CPF Dance — Precision. Passion. Performance.',
  description: 'Connect with a world-class instructor, receive detailed feedback after every lesson, and track your growth as a dancer.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CPF Dance',
  },
  icons: [
    { rel: 'icon', url: '/favicon.ico' },
    { rel: 'apple-touch-icon', url: '/icon-192.png' },
  ],
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
    <html lang="en" className={`${cormorantGaramond.variable} ${manrope.variable}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Google Analytics with Consent Mode - defaults to denied, updated by CookieConsentBanner */}
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-JYEPWDHDW0" />
        <Script id="google-analytics">
          {`window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', {
    'analytics_storage': 'denied'
  });
  gtag('js', new Date());
  gtag('config', 'G-JYEPWDHDW0');`}
        </Script>
      </head>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
        <CookieConsentBanner />
        <RegisterServiceWorker />
      </body>
    </html>
  )
}
