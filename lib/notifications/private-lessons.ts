import { sendEmail } from '@/lib/gmail/client'

const COURTNEY_EMAIL = 'courtney@cpfdance.com'

function escape(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatEt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

interface NotifyArgs {
  to?: string
}

async function safeSend(subject: string, body: string, to: string = COURTNEY_EMAIL): Promise<void> {
  try {
    await sendEmail({ to, subject, body })
  } catch (error) {
    console.error('[notify] sendEmail failed:', subject, error)
  }
}

export async function notifyRequestSubmitted(args: {
  dancerName: string
  focus: string
  preferredDates: string[]
  additionalNotes: string | null
  hasCredits: boolean
  remainingCredits: number
} & NotifyArgs): Promise<void> {
  const dates = args.preferredDates.length
    ? `<p><strong>Preferred dates:</strong> ${escape(args.preferredDates.join(', '))}</p>`
    : ''
  const notes = args.additionalNotes
    ? `<p><strong>Notes:</strong> ${escape(args.additionalNotes)}</p>`
    : ''
  const credit = args.hasCredits
    ? `<p style="color:#0a7c2c"><strong>Credit on file:</strong> ${args.remainingCredits} remaining.</p>`
    : `<p style="color:#a4243b"><strong>No credits</strong> — dancer will pay day-of via Venmo or cash.</p>`

  await safeSend(
    `New private lesson request — ${args.dancerName}`,
    `<h2>${escape(args.dancerName)} submitted a private lesson request</h2>
<p><strong>Focus:</strong> ${escape(args.focus)}</p>
${dates}
${notes}
${credit}
<p><a href="https://cpfdance.com/instructor/requests">Open instructor portal →</a></p>`,
    args.to
  )
}

export async function notifyClassScheduled(args: {
  dancerName: string
  startTimeIso: string
  paymentMode: 'credit' | 'day_of'
  packName: string | null
  remainingAfter: number
  dayOfPrice: number | null
} & NotifyArgs): Promise<void> {
  const payment = args.paymentMode === 'credit'
    ? `<p><strong>Payment:</strong> 1 credit used from ${escape(args.packName ?? 'pack')} (${args.remainingAfter} remaining).</p>`
    : `<p><strong>Payment:</strong> day-of, $${args.dayOfPrice?.toFixed(2) ?? 'TBD'} via Venmo or cash.</p>`

  await safeSend(
    `Private lesson scheduled — ${args.dancerName}`,
    `<h2>Private lesson scheduled</h2>
<p><strong>Dancer:</strong> ${escape(args.dancerName)}</p>
<p><strong>When:</strong> ${escape(formatEt(args.startTimeIso))} ET</p>
${payment}`,
    args.to
  )
}

export async function notifyCancellation(args: {
  dancerName: string
  startTimeIso: string
  cancelledBy: 'dancer' | 'instructor'
  reason: string | null
  creditOutcome: 'refunded' | 'forfeited' | 'no_credit'
} & NotifyArgs): Promise<void> {
  const outcome = args.creditOutcome === 'refunded'
    ? '<p style="color:#0a7c2c"><strong>Credit refunded.</strong></p>'
    : args.creditOutcome === 'forfeited'
    ? '<p style="color:#a4243b"><strong>Credit forfeited (cancelled inside 24 hours).</strong></p>'
    : '<p>No credit was on this lesson.</p>'

  await safeSend(
    `Private lesson cancelled — ${args.dancerName}`,
    `<h2>Private lesson cancelled by ${args.cancelledBy === 'dancer' ? args.dancerName : 'instructor'}</h2>
<p><strong>Dancer:</strong> ${escape(args.dancerName)}</p>
<p><strong>Was scheduled for:</strong> ${escape(formatEt(args.startTimeIso))} ET</p>
${args.reason ? `<p><strong>Reason:</strong> ${escape(args.reason)}</p>` : ''}
${outcome}`,
    args.to
  )
}

export async function notifyDancerVirtualLesson(args: {
  to: string
  dancerName: string
  startTimeIso: string
  meetUrl: string
}): Promise<void> {
  if (!args.to) return

  await safeSend(
    'Your virtual lesson with Courtney',
    `<h2>You have a virtual lesson scheduled</h2>
<p>Hi ${escape(args.dancerName)},</p>
<p>Your private lesson with Courtney will be held over Google Meet.</p>
<p><strong>When:</strong> ${escape(formatEt(args.startTimeIso))} ET</p>
<p style="margin:24px 0">
  <a href="${escape(args.meetUrl)}" style="background:#a4243b;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Join Google Meet</a>
</p>
<p>Or paste this link into your browser at lesson time:<br>
<a href="${escape(args.meetUrl)}">${escape(args.meetUrl)}</a></p>
<p>You should also receive a Google Calendar invite for this lesson.</p>`,
    args.to
  )
}

export async function notifyRescheduleRequested(args: {
  dancerName: string
  startTimeIso: string
  proposedDates: string[]
  reason: string | null
} & NotifyArgs): Promise<void> {
  const proposed = args.proposedDates.length
    ? `<p><strong>Proposed dates:</strong> ${escape(args.proposedDates.join(', '))}</p>`
    : '<p><em>No specific dates suggested.</em></p>'

  await safeSend(
    `Reschedule request — ${args.dancerName}`,
    `<h2>${escape(args.dancerName)} asked to reschedule</h2>
<p><strong>Currently scheduled:</strong> ${escape(formatEt(args.startTimeIso))} ET</p>
${proposed}
${args.reason ? `<p><strong>Reason:</strong> ${escape(args.reason)}</p>` : ''}
<p><a href="https://cpfdance.com/instructor">Open instructor dashboard →</a></p>`,
    args.to
  )
}
