interface EarningsProgressWidgetProps {
  total: number
  collected: number
  outstanding: number
  classes: number
}

export function EarningsProgressWidget({
  total,
  collected,
  outstanding,
  classes
}: EarningsProgressWidgetProps) {
  const percentage = total > 0 ? (collected / total) * 100 : 0
  const circumference = 2 * Math.PI * 45

  return (
    <div className="bg-gradient-to-br from-charcoal-50 to-champagne-100 rounded-2xl p-8 border border-gold-200">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        {/* Circular Progress */}
        <div className="flex justify-center">
          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              {/* Background circle */}
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="#e5e0d5"
                strokeWidth="8"
              />
              {/* Progress circle */}
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

            <div className="bg-white bg-opacity-50 rounded-lg p-4 border border-gold-100">
              <div className="text-xs font-semibold text-amber-700 uppercase mb-2">
                Outstanding
              </div>
              <div className="text-2xl font-bold text-amber-900">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(outstanding)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
