'use client'

import { useEffect, useRef, useState } from 'react'

// A composite sample, written from the shape and phrasing of Courtney's real
// lesson notes. It is not any one dancer's note.
const note = {
  title: 'Attack, turnout, and kicks',
  opening:
    'Great work today! When you take up more space and commit to the attack, it truly makes a difference for you.',
  points: [
    {
      label: 'Turnout.',
      text: ' Keep feeling the rotation from your hips, even when you are working in parallel.'
    },
    {
      label: 'Arms.',
      text: ' Articulate the pathway from elbow to wrist to fingertips, with the speed from elbow to fingertips slightly faster.'
    },
    {
      label: 'Ribs.',
      text: ' When you reach up, keep your abs engaged so your ribs don’t release.'
    },
    {
      label: 'Kicks.',
      text: ' Tune into the height on the very first kick. You never know which kick is being watched in an audition, so we will fine-tune every one.'
    }
  ],
  closing: 'We will drill the turn into the kicks next time. Great work as always!',
  sign: 'Courtney'
}

// Where each piece of the note starts, counting characters in reading order.
let cursor = 0
const at = (text: string) => {
  const from = cursor
  cursor += text.length
  return from
}
const starts = {
  title: at(note.title),
  opening: at(note.opening),
  points: note.points.map((point) => ({ label: at(point.label), text: at(point.text) })),
  closing: at(note.closing),
  sign: at(note.sign)
}
const noteLength = cursor

const CHARS_PER_SECOND = 280
const START_DELAY_MS = 250

// The note types itself out once as it scrolls into view, on the same trigger
// as the data-reveal fade around it. Until then, and for reduced-motion
// visitors or anyone without IntersectionObserver, the whole note is written.
function useTypewriter(total: number) {
  const ref = useRef<HTMLElement>(null)
  const [typed, setTyped] = useState(total)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!('IntersectionObserver' in window)) return
    if (el.getBoundingClientRect().top < window.innerHeight) return

    let timeout: ReturnType<typeof setTimeout> | undefined
    let frame = 0
    let start = 0

    const tick = (now: number) => {
      if (!start) start = now
      const next = Math.min(total, Math.floor(((now - start) / 1000) * CHARS_PER_SECOND))
      setTyped(next)
      if (next < total) frame = requestAnimationFrame(tick)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        setTyped(0)
        timeout = setTimeout(() => {
          frame = requestAnimationFrame(tick)
        }, START_DELAY_MS)
      },
      { rootMargin: '0px 0px -10% 0px' }
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
      clearTimeout(timeout)
      cancelAnimationFrame(frame)
    }
  }, [total])

  return { ref, typed }
}

// The full text is always laid out, and the unwritten part is only made
// transparent, so the note never reflows as it types and screen readers get
// all of it.
function Typed({ text, shown, caret }: { text: string; shown: number; caret: boolean }) {
  const cut = Math.max(0, Math.min(text.length, shown))
  return (
    <>
      {text.slice(0, cut)}
      {caret && <span className="lp-note__caret" aria-hidden="true" />}
      {cut < text.length && <span className="lp-note__unwritten">{text.slice(cut)}</span>}
    </>
  )
}

export function SampleNote() {
  const { ref, typed } = useTypewriter(noteLength)
  const typing = typed < noteLength

  const type = (text: string, from: number) => {
    const caret = typing && typed >= from && typed < from + text.length
    return <Typed text={text} shown={typed - from} caret={caret} />
  }

  return (
    <article ref={ref} className="lp-note" aria-label="Sample lesson note" data-reveal>
      <header className="lp-note__meta">
        <span>Private lesson</span>
        <span>Tuesday, October 14</span>
      </header>
      <h3 className="lp-note__title">{type(note.title, starts.title)}</h3>
      <div className="lp-note__body">
        <p>{type(note.opening, starts.opening)}</p>
        <ol>
          {note.points.map((point, i) => (
            <li
              key={point.label}
              className={typed > starts.points[i].label ? undefined : 'lp-note__point--unwritten'}
            >
              <strong>{type(point.label, starts.points[i].label)}</strong>
              {type(point.text, starts.points[i].text)}
            </li>
          ))}
        </ol>
        <p>{type(note.closing, starts.closing)}</p>
      </div>
      <footer className="lp-note__sign">{type(note.sign, starts.sign)}</footer>
    </article>
  )
}
