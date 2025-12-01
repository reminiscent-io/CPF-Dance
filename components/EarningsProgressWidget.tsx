'use client'

import { useState } from 'react'

interface UnpaidClass {
  id: string
  title: string
  start_time: string
  studio?: { name: string } | null
  outstanding: number
}

interface EarningsProgressWidgetProps {
  total: number
  collected: number
  outstanding: number
  classes: number
  unpaidClasses?: UnpaidClass[]
  onRemindClick?: (classId: string, className: string) => void
  isReminding?: boolean
}

export function EarningsProgressWidget({
  total,
  collected,
  outstanding,
  classes,
  unpaidClasses = [],
  onRemindClick,
  isReminding = false
}: EarningsProgressWidgetProps) {
  const [expandedOutstanding, setExpandedOutstanding] = useState(false)
  const percentage = total > 0 ? (collected / total) * 100 : 0
  const circumference = 2 * Math.PI * 45

  return (
    <div className="bg-gradient-to-br from-charcoal-50 to-champagne-100 rounded-2xl p-8 border border-gold-200">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        {/* Circular Progress */}
        <div className="flex justify-center">
          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="#e5e0d5"
                strokeWidth="8"
              />
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="#d4929b"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (circumference * percentage) / 100}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold text-charcoal-900">
                {Math.round(percentage)}%
              </div>
              <div className="text-sm text-charcoal-600">Collected</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-6">
          <div>
            <div className="text-sm font-semibold text-charcoal-700 mb-1 tracking-wide">
              TOTAL VALUE
            </div>
            <div className="text-4xl font-bold text-charcoal-950">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(total)}
            </div>
            <div className="text-sm text-charcoal-600 mt-1">
              from {classes} {classes === 1 ? 'class' : 'classes'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white bg-opacity-50 rounded-lg p-4 border border-gold-100">
              <div className="text-xs font-semibold text-green-700 uppercase mb-2">
                Collected
              </div>
              <div className="text-2xl font-bold text-green-900">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(collected)}
              </div>
            </div>

            {/* Outstanding - Now Interactive */}
            <button
              onClick={() => setExpandedOutstanding(!expandedOutstanding)}
              className="bg-white bg-opacity-50 rounded-lg p-4 border border-gold-100 hover:bg-opacity-75 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-amber-700 uppercase">
                  Outstanding
                </div>
                <span className={`text-amber-700 transition-transform duration-300 inline-block ${
                    expandedOutstanding ? 'rotate-180' : ''
                  }`}>
                  ▼
                </span>
              </div>
              <div className="text-2xl font-bold text-amber-900">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(outstanding)}
              </div>
              {unpaidClasses.length > 0 && (
                <div className="text-xs text-amber-600 mt-1">
                  {unpaidClasses.length} {unpaidClasses.length === 1 ? 'class' : 'classes'} unpaid
                </div>
              )}
            </button>
          </div>

          {/* Expanded Outstanding Details Accordion */}
          {expandedOutstanding && unpaidClasses.length > 0 && (
            <div className="col-span-2 md:col-span-2 mt-4 pt-4 border-t border-gold-200">
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {unpaidClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-start justify-between gap-3 p-3 bg-white bg-opacity-50 rounded-lg hover:bg-opacity-75 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-charcoal-900 truncate text-sm">
                        {cls.title}
                      </div>
                      <div className="text-xs text-charcoal-600 mt-1 space-y-0.5">
                        {cls.studio?.name && (
                          <div>{cls.studio.name}</div>
                        )}
                        <div>
                          {new Date(cls.start_time).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="font-bold text-amber-900 text-sm">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD'
                        }).format(cls.outstanding)}
                      </div>
                      <button
                        onClick={() => onRemindClick?.(cls.id, cls.title)}
                        disabled={isReminding}
                        className="text-xs px-2 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-700 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {isReminding ? 'Sending...' : 'Remind'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
