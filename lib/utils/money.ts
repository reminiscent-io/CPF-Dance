/**
 * Money handling.
 *
 * Every money column in the database is DECIMAL(10, 2) — exact. JavaScript
 * numbers are IEEE-754 doubles — not exact. Any arithmetic done on dollars as
 * doubles can land on a value the column cannot hold (1.5h x $33.33/hr is
 * 49.995) or drift a fraction of a cent (3 x 16.67 is 50.010000000000005).
 *
 * So: do the arithmetic in integer cents, convert back at the boundary.
 */

/**
 * Convert a dollar amount to whole cents, rounding half away from zero.
 *
 * A naive Math.round(dollars * 100) is wrong at half-cent boundaries, because
 * the multiplication lands just below the .5 it should sit on: 1.005 * 100 is
 * 100.49999999999999, which rounds down and loses the cent. Re-reading the
 * product at 15 significant digits discards that representation error before
 * rounding.
 */
export function dollarsToCents(dollars: number): number {
  if (!Number.isFinite(dollars)) return 0
  const scaled = Number((dollars * 100).toPrecision(15))
  return Math.sign(scaled) * Math.round(Math.abs(scaled))
}

/** Convert whole cents back to a dollar amount safe to store in DECIMAL(10, 2). */
export function centsToDollars(cents: number): number {
  return cents / 100
}

/**
 * Parse user-entered currency text into whole cents.
 * Returns undefined for empty or non-numeric input; 0 is a real value.
 */
export function parseCurrencyToCents(value: string | null | undefined): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined
  const dollars = parseFloat(value)
  if (Number.isNaN(dollars)) return undefined
  return dollarsToCents(dollars)
}

/** Sum whole-cent amounts. Integer addition, so no drift. */
export function sumCents(cents: number[]): number {
  return cents.reduce((total, c) => total + c, 0)
}

/** Format whole cents for display, e.g. 1205 -> "$12.05". */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(centsToDollars(cents))
}
