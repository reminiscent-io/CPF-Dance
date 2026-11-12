import { Input } from '@/components/ui'
import type { CreateClassData } from '@/lib/types'
import { parseCurrency } from './class-helpers'

// Full-run pricing for a linked workshop. The class's own pricing above is
// what one day costs on its own.
export function WorkshopPricingFields({
  values,
  onChange,
}: {
  values: Pick<CreateClassData, 'workshop_price' | 'workshop_signup_url' | 'workshop_full_only'>
  onChange: (patch: Pick<CreateClassData, 'workshop_price' | 'workshop_signup_url' | 'workshop_full_only'>) => void
}) {
  return (
    <div className="space-y-3 pt-3 border-t border-rose-200">
      <div>
        <h4 className="text-sm font-medium text-charcoal-950">Full workshop pricing</h4>
        <p className="text-xs text-charcoal-500">
          The pricing above is what a single day costs. Set the price for all days together here.
        </p>
      </div>
      <Input
        label="Full workshop price per person ($)"
        type="number"
        min="0"
        step="0.01"
        value={values.workshop_price ?? ''}
        onChange={(e) => onChange({ workshop_price: parseCurrency(e.target.value) ?? null })}
        placeholder="e.g., 300.00"
      />
      <Input
        label="Full workshop sign-up link"
        type="url"
        value={values.workshop_signup_url || ''}
        onChange={(e) => onChange({ workshop_signup_url: e.target.value })}
        placeholder="https://buy.stripe.com/..."
      />
      <p className="text-xs text-charcoal-500 -mt-2">
        Optional: dancers buying the whole workshop go here to pay. The External Sign-up Link stays the single-day link.
      </p>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="workshop_full_only"
          checked={values.workshop_full_only || false}
          onChange={(e) => onChange({ workshop_full_only: e.target.checked })}
          className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-champagne-200 rounded"
        />
        <label htmlFor="workshop_full_only" className="text-sm font-medium text-charcoal-700 cursor-pointer">
          Full workshop only (no single-day drop-ins)
        </label>
      </div>
    </div>
  )
}
