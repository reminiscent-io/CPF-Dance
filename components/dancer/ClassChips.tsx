import { CheckIcon } from '@heroicons/react/24/outline'

const CLASS_TYPE_LABEL: Record<string, string> = {
  group: 'Group',
  private: 'Private',
  workshop: 'Workshop',
  master_class: 'Master class',
  competition_choreography: 'Competition choreography',
}

const CHIP = 'inline-flex items-center text-[11px] font-medium tracking-[0.08em] uppercase px-2 py-0.5 rounded-sm'

export function ClassTypeChip({ type }: { type: string }) {
  const isPremium = type === 'master_class'
  const label = CLASS_TYPE_LABEL[type] ?? type.replace(/_/g, ' ')
  return (
    <span className={`${CHIP} ${isPremium ? 'bg-gold-100 text-gold-800' : 'bg-champagne-100 text-charcoal-600'}`}>
      {label}
    </span>
  )
}

export function StatusChip({
  tone,
  children,
}: {
  tone: 'rose' | 'gold' | 'neutral'
  children: React.ReactNode
}) {
  const styles = {
    rose: 'bg-rose-100 text-rose-700',
    gold: 'bg-gold-100 text-gold-800',
    neutral: 'bg-champagne-100 text-charcoal-600',
  }
  return <span className={`${CHIP} ${styles[tone]}`}>{children}</span>
}

/** A held spot in one of Courtney's open classes. Gilt, because it is confirmed. */
export function EnrolledMark() {
  return (
    <span className={`${CHIP} gap-1 bg-gold-100 text-gold-800`}>
      <CheckIcon className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />
      Enrolled
    </span>
  )
}
