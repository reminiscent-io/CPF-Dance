'use client'

import { useState, type CSSProperties, type KeyboardEvent } from 'react'
import { RATING_WORDS } from '@/lib/class-feedback'

const STARS = [1, 2, 3, 4, 5] as const
const STAR_PATH =
  'M12 2.75l2.83 5.73 6.33.92-4.58 4.46 1.08 6.3L12 17.18l-5.66 2.98 1.08-6.3-4.58-4.46 6.33-.92L12 2.75z'
// Four-point twinkle, for the sparks
const TWINKLE_PATH = 'M12 0c.9 6.4 5.6 11.1 12 12-6.4.9-11.1 5.6-12 12-.9-6.4-5.6-11.1-12-12 6.4-.9 11.1-5.6 12-12z'

interface Spark {
  dx: number
  dy: number
  size: number
  rotate: number
  tone: 'rose' | 'gold'
  shape: 'twinkle' | 'dot'
}

// Fixed, not random: the same burst every time, and render stays pure
const SPARKS: Spark[] = Array.from({ length: 9 }, (_, i) => {
  const angle = (i / 9) * Math.PI * 2 + (i % 2 ? 0.25 : -0.1)
  const distance = 34 + ((i * 7) % 4) * 8
  return {
    dx: Math.round(Math.cos(angle) * distance),
    dy: Math.round(Math.sin(angle) * distance) - 6,
    size: i % 3 === 0 ? 12 : 8,
    rotate: (i * 47) % 180,
    tone: i % 2 ? 'gold' : 'rose',
    shape: i % 3 === 2 ? 'dot' : 'twinkle',
  }
})

export interface StarRatingProps {
  value: number | null
  onChange: (rating: number) => void
  label?: string
}

/**
 * Five tappable stars. Picking a rating pops the stars in, left to right;
 * five stars bursts each one into sparks and says so. Motion stays off for
 * anyone who has asked their device for less of it.
 */
export function StarRating({ value, onChange, label = 'Overall experience' }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  // Bumped on every pick so the animations replay, even on the same star
  const [burst, setBurst] = useState(0)

  const shown = hovered ?? value ?? 0

  const pick = (rating: number) => {
    onChange(rating)
    setBurst(b => b + 1)
    if (rating === 5) navigator.vibrate?.([10, 40, 10])
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = value ?? 0
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      pick(Math.min(5, current + 1))
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      pick(Math.max(1, current - 1))
    }
  }

  const word = value ? RATING_WORDS[value] : null

  return (
    <div>
      <p id="star-rating-label" className="mb-1 text-sm font-medium text-charcoal-500">
        {label}
      </p>
      <div
        role="radiogroup"
        aria-labelledby="star-rating-label"
        onKeyDown={onKeyDown}
        onPointerLeave={() => setHovered(null)}
        className="-ml-2 flex items-center"
      >
        {STARS.map((star, index) => {
          const filled = star <= shown
          const tabbable = value ? value === star : star === 1
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
              tabIndex={tabbable ? 0 : -1}
              onClick={() => pick(star)}
              onPointerEnter={event => {
                if (event.pointerType === 'mouse') setHovered(star)
              }}
              className="relative flex h-14 w-14 items-center justify-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 [-webkit-tap-highlight-color:transparent]"
            >
              <span
                key={`${burst}-${star}`}
                className={`inline-flex ${burst > 0 && star <= (value ?? 0) ? 'feedback-star-pop' : ''}`}
                style={{ animationDelay: `${index * 55}ms` }}
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className={`h-[2.5rem] w-[2.5rem] transition-colors duration-150 ${
                    filled ? 'fill-gold-600 text-gold-700' : 'fill-transparent text-champagne-700'
                  }`}
                >
                  <path d={STAR_PATH} stroke="currentColor" strokeWidth={1.25} strokeLinejoin="round" />
                </svg>
              </span>

              {value === 5 && burst > 0 && (
                <span key={`sparks-${burst}`} aria-hidden="true" className="pointer-events-none absolute inset-0">
                  {SPARKS.map((spark, i) => (
                    <span
                      key={i}
                      className={`feedback-spark ${spark.tone === 'gold' ? 'text-gold-500' : 'text-rose-500'}`}
                      style={
                        {
                          '--dx': `${spark.dx}px`,
                          '--dy': `${spark.dy}px`,
                          '--rot': `${spark.rotate}deg`,
                          width: spark.size,
                          height: spark.size,
                          marginLeft: -spark.size / 2,
                          marginTop: -spark.size / 2,
                          animationDelay: `${index * 70 + 60}ms`,
                        } as CSSProperties
                      }
                    >
                      {spark.shape === 'twinkle' ? (
                        <svg viewBox="0 0 24 24" className="h-full w-full fill-current">
                          <path d={TWINKLE_PATH} />
                        </svg>
                      ) : (
                        <span className="block h-full w-full scale-50 rounded-full bg-current" />
                      )}
                    </span>
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="min-h-[2.75rem]" aria-live="polite">
        {value === 5 ? (
          <p key={`yay-${burst}`} className="feedback-yay font-display text-3xl font-semibold italic tracking-tight text-rose-700">
            {word}
          </p>
        ) : word ? (
          <p className="pt-1 text-sm text-charcoal-500">{word}</p>
        ) : null}
      </div>
    </div>
  )
}
