'use client'

import { useState, useEffect, useCallback } from 'react'

const CONSENT_STORAGE_KEY = 'gdpr_consent'
const GEO_CHECK_KEY = 'gdpr_geo_checked'

interface ConsentState {
  necessary: boolean // Always true - auth cookies
  analytics: boolean // Google Analytics - requires opt-in
  timestamp: number
}

// EU/EEA country codes that require GDPR compliance
const GDPR_COUNTRIES = new Set([
  // EU Member States
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  // EEA (non-EU)
  'IS', 'LI', 'NO',
  // UK (post-Brexit still has similar requirements)
  'GB',
  // Switzerland (similar privacy laws)
  'CH'
])

export default function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [analyticsConsent, setAnalyticsConsent] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check if user needs to see the banner
  useEffect(() => {
    const checkConsent = async () => {
      // Check if consent already given
      const storedConsent = localStorage.getItem(CONSENT_STORAGE_KEY)
      if (storedConsent) {
        try {
          const consent: ConsentState = JSON.parse(storedConsent)
          // Consent is valid for 1 year
          if (Date.now() - consent.timestamp < 365 * 24 * 60 * 60 * 1000) {
            setAnalyticsConsent(consent.analytics)
            if (consent.analytics) {
              enableAnalytics()
            }
            setIsLoading(false)
            return
          }
        } catch {
          // Invalid stored consent, continue to geo check
        }
      }

      // Check if we already determined user's location
      const geoChecked = sessionStorage.getItem(GEO_CHECK_KEY)
      if (geoChecked === 'non-gdpr') {
        // User is in US or other non-GDPR country, enable analytics
        enableAnalytics()
        setIsLoading(false)
        return
      }

      if (geoChecked === 'gdpr') {
        // User is in GDPR region, show banner
        setShowBanner(true)
        setIsLoading(false)
        return
      }

      // Fetch user's country from IP
      try {
        const response = await fetch('https://ipapi.co/json/', {
          signal: AbortSignal.timeout(5000)
        })

        if (response.ok) {
          const data = await response.json()
          const countryCode = data.country_code

          if (countryCode && !GDPR_COUNTRIES.has(countryCode)) {
            // Non-GDPR country (including US), enable analytics automatically
            sessionStorage.setItem(GEO_CHECK_KEY, 'non-gdpr')
            enableAnalytics()
            setIsLoading(false)
            return
          }
        }
      } catch {
        // On error, assume GDPR compliance needed (conservative approach)
      }

      // GDPR country or couldn't determine - show banner
      sessionStorage.setItem(GEO_CHECK_KEY, 'gdpr')
      setShowBanner(true)
      setIsLoading(false)
    }

    checkConsent()
  }, [])

  const enableAnalytics = useCallback(() => {
    // Initialize Google Analytics if not already done
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted'
      })
    }
  }, [])

  const saveConsent = useCallback((analytics: boolean) => {
    const consent: ConsentState = {
      necessary: true,
      analytics,
      timestamp: Date.now()
    }
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent))
    setAnalyticsConsent(analytics)

    if (analytics) {
      enableAnalytics()
    }

    setShowBanner(false)
    setShowPreferences(false)
  }, [enableAnalytics])

  const handleAcceptAll = useCallback(() => {
    saveConsent(true)
  }, [saveConsent])

  const handleAcceptNecessary = useCallback(() => {
    saveConsent(false)
  }, [saveConsent])

  const handleSavePreferences = useCallback(() => {
    saveConsent(analyticsConsent)
  }, [saveConsent, analyticsConsent])

  // Don't render anything while checking
  if (isLoading || !showBanner) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] safe-bottom">
      <div className="bg-white border-t border-champagne-200 shadow-soft-lg">
        {!showPreferences ? (
          // Main banner
          <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-charcoal-700">
                  We use cookies to improve your experience. Essential cookies keep the site working.
                  Analytics cookies help us understand how you use the site.{' '}
                  <a
                    href="/privacy-policy"
                    className="text-ballet-pink-600 hover:text-ballet-pink-700 underline"
                  >
                    Learn more
                  </a>
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                <button
                  onClick={() => setShowPreferences(true)}
                  className="px-4 py-2 text-sm font-medium text-charcoal-600 hover:text-charcoal-800 transition-colors"
                >
                  Preferences
                </button>
                <button
                  onClick={handleAcceptNecessary}
                  className="px-4 py-2 text-sm font-medium text-charcoal-700 bg-champagne-100 hover:bg-champagne-200 rounded-lg transition-colors"
                >
                  Necessary only
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-4 py-2 text-sm font-medium text-white bg-ballet-pink-600 hover:bg-ballet-pink-700 rounded-lg transition-colors"
                >
                  Accept all
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Preferences panel
          <div className="max-w-4xl mx-auto px-4 py-5 sm:px-6">
            <h3 className="text-lg font-semibold text-charcoal-900 mb-4">
              Cookie Preferences
            </h3>

            <div className="space-y-4 mb-5">
              {/* Necessary cookies */}
              <div className="flex items-start justify-between gap-4 p-3 bg-champagne-50 rounded-lg">
                <div>
                  <p className="font-medium text-charcoal-800">Essential Cookies</p>
                  <p className="text-sm text-charcoal-600 mt-1">
                    Required for authentication and core functionality. Cannot be disabled.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-10 h-6 bg-ballet-pink-600 rounded-full relative">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </div>
                </div>
              </div>

              {/* Analytics cookies */}
              <div className="flex items-start justify-between gap-4 p-3 bg-champagne-50 rounded-lg">
                <div>
                  <p className="font-medium text-charcoal-800">Analytics Cookies</p>
                  <p className="text-sm text-charcoal-600 mt-1">
                    Help us understand how visitors interact with the site to improve the experience.
                  </p>
                </div>
                <button
                  onClick={() => setAnalyticsConsent(!analyticsConsent)}
                  className={`flex-shrink-0 w-10 h-6 rounded-full relative transition-colors ${
                    analyticsConsent ? 'bg-ballet-pink-600' : 'bg-charcoal-300'
                  }`}
                  aria-label={analyticsConsent ? 'Disable analytics' : 'Enable analytics'}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                      analyticsConsent ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <button
                onClick={() => setShowPreferences(false)}
                className="px-4 py-2 text-sm font-medium text-charcoal-600 hover:text-charcoal-800 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSavePreferences}
                className="px-4 py-2 text-sm font-medium text-white bg-ballet-pink-600 hover:bg-ballet-pink-700 rounded-lg transition-colors"
              >
                Save preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Type declaration for gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}
