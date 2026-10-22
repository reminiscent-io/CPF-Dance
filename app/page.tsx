'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/auth/hooks'
import { getHomePathForRole } from '@/lib/auth/portal-routing'
import { SampleNote } from './sample-note'
import './landing.css'

const IMAGES = 'https://nuuuzezbglgtsuorhinw.supabase.co/storage/v1/object/public/Public_Images'

// Every studio Courtney has taught at in some capacity. Set as a printed
// credits list, the way a program's bio page would, rather than as logos.
const taughtAt = [
  { name: 'Broadway Dance Center', href: 'https://broadwaydancecenter.com/faculty/courtney-file' },
  { name: 'Broadway Dance Academy' },
  { name: 'The Brooklyn Dance Centers' },
  { name: 'Chorus Line Dance Studio' },
  { name: 'Exactitude Dance' },
  { name: 'Positions Dance Studio' },
  { name: 'Studio One' },
  { name: 'The Academy Charter School' }
]

const dancerIndex = [
  {
    id: 'lessons',
    title: 'Private lessons',
    description: "One-on-one instruction, booked on Courtney's calendar."
  },
  {
    id: 'classes',
    title: 'Classes and workshops',
    description: 'Group classes and workshops near you.'
  },
  {
    id: 'journal',
    title: 'Your own record',
    description: 'Your notes, goals, and breakthroughs, in your own words.'
  }
]

// Sections marked data-reveal fade in once as they scroll into view. Anything
// already on screen when the page hydrates is left alone, so no copy is ever
// hidden waiting on JavaScript, and reduced-motion visitors get no reveal.
function useScrollReveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute('data-reveal', 'shown')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -10% 0px' }
    )

    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) return
      el.setAttribute('data-reveal', 'pending')
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])
}

export default function HomePage() {
  const { profile } = useUser()
  useScrollReveal()

  // A signed-in visitor gets a way back into their portal instead of a
  // sign-in link. Roles with no portal fall through to the signed-out view.
  const homePath = getHomePathForRole(profile?.role)
  const homeLabel = homePath === '/dancer' ? 'Your notes' : 'Your portal'

  return (
    <main className="lp">
      <nav className="lp-nav" aria-label="Main">
        <Link href="/" className="lp-nav__mark">
          CPF Dance
        </Link>
        {homePath ? (
          <Link href={homePath} className="lp-link">
            {homeLabel}
          </Link>
        ) : (
          <Link href="/login?portal=dancer" className="lp-link">
            Sign in
          </Link>
        )}
      </nav>

      {/* Cover */}
      <section className="lp-cover" aria-labelledby="lp-cover-title">
        <div className="lp-cover__photo lp-cover__photo--phone" aria-hidden="true">
          <Image
            src={`${IMAGES}/CR6_4040.jpg`}
            alt=""
            fill
            priority
            sizes="(min-width: 768px) 0px, 100vw"
          />
        </div>

        <div className="lp-cover__copy">
          <span className="lp-eyebrow">Private lessons, classes and workshops</span>
          <h1 id="lp-cover-title" className="lp-cover__name">
            <span>Courtney</span>
            <span>File</span>
          </h1>
          <p className="lp-cover__body">
            Former Radio City Rockette, Broadway Dance Center faculty, and a New
            York-area dance instructor dedicated to growing the next generation
            of talented dancers.
          </p>
          <div className="lp-actions">
            {homePath ? (
              <Link href={homePath} className="lp-button lp-button--rose">
                {homeLabel}
              </Link>
            ) : (
              <>
                <Link href="/signup?role=dancer" className="lp-button lp-button--rose">
                  Create your account
                </Link>
                <Link href="/login?portal=dancer" className="lp-link">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="lp-cover__plates" aria-hidden="true">
          {['IMG_6563_medium.jpg', 'IMG_6565_medium.jpg'].map((file) => (
            <div key={file} className="lp-cover__photo">
              <Image
                src={`${IMAGES}/${file}`}
                alt=""
                fill
                priority
                sizes="(max-width: 767px) 0px, (max-width: 1099px) 50vw, 33vw"
              />
            </div>
          ))}
        </div>
      </section>

      {/* About the artist */}
      <section className="lp-about" aria-labelledby="lp-about-title" data-reveal>
        <figure className="lp-about__portrait">
          <Image
            src={`${IMAGES}/IMG_6579_medium.jpg`}
            alt="Courtney File in a black leotard and sheer sleeves, mid-movement in the studio."
            fill
            sizes="(max-width: 767px) 480px, 40vw"
          />
        </figure>

        <div className="lp-about__text">
          <span className="lp-eyebrow">About the artist</span>
          <h2 id="lp-about-title" className="lp-about__title">
            A Rockette&rsquo;s precision, taught one dancer at a time.
          </h2>
          <div className="lp-about__bio">
            <p>
              Courtney spent more than a decade performing professionally,
              including with the{' '}
              <a
                href="https://www.longislandpress.com/2023/12/01/a-day-in-the-life-of-a-radio-city-rockette/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Radio City Rockettes
              </a>
              .
            </p>
            <p>
              Her teaching starts with clean technique, then the artistry it makes
              possible.
            </p>
            <p>
              Whether you are new to dance or refining an advanced practice, you
              work from a plan written for your own goals.
            </p>
          </div>

          <dl className="lp-credits">
            <dt>Performed with</dt>
            <dd>
              <ul>
                <li>Radio City Rockettes</li>
              </ul>
            </dd>
            <dt>Has taught at</dt>
            <dd>
              <ul>
                {taughtAt.map((studio) => (
                  <li key={studio.name}>
                    {studio.href ? (
                      <a href={studio.href} target="_blank" rel="noopener noreferrer">
                        {studio.name}
                      </a>
                    ) : (
                      studio.name
                    )}
                  </li>
                ))}
              </ul>
            </dd>
          </dl>
        </div>
      </section>

      {/* The notes */}
      <section className="lp-notes" aria-labelledby="lp-notes-title">
        <p className="lp-notes__quote" data-reveal>
          Most dancers leave class with nothing written down: no notes on what to
          work on, no record of how far they have come.
        </p>

        <div className="lp-notes__spread">
          <div className="lp-notes__head" data-reveal>
            <span className="lp-eyebrow">For dancers</span>
            <h2 id="lp-notes-title" className="lp-notes__title">
              After every lesson, a page like this.
            </h2>
            <p className="lp-notes__stand">
              Courtney writes to you after each lesson. It waits on your phone, so
              you walk into the studio knowing exactly what to work on.
            </p>
          </div>

          <SampleNote />

          <ul className="lp-notes__index" data-reveal>
            {dancerIndex.map((item) => (
              <li key={item.id}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Join */}
      <section className="lp-join" aria-labelledby="lp-join-title" data-reveal>
        <h2 id="lp-join-title" className="lp-join__title">
          Join the studio.
        </h2>
        <p className="lp-join__body">
          Create an account to book private lessons, sign up for classes, and read
          Courtney&rsquo;s notes.
        </p>
        <div className="lp-actions">
          {homePath ? (
            <Link href={homePath} className="lp-button lp-button--gold">
              {homeLabel}
            </Link>
          ) : (
            <>
              <Link href="/signup?role=dancer" className="lp-button lp-button--gold">
                Create your account
              </Link>
              <Link href="/login?portal=dancer" className="lp-link">
                Already a member? Sign in
              </Link>
            </>
          )}
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer__top">
          <div className="lp-footer__contact">
            <span className="lp-nav__mark">CPF Dance</span>
            <a href="mailto:info@cpfdance.com">info@cpfdance.com</a>
            <a href="https://instagram.com/courtneyfiledance" target="_blank" rel="noopener noreferrer">
              Instagram @courtneyfiledance
            </a>
          </div>
          <StudioInquiry />
        </div>

        <div className="lp-footer__legal">
          <p>&copy; {new Date().getFullYear()} CPF Dance LLC</p>
          <div>
            <Link href="/terms-of-service">Terms of Service</Link>
            <Link href="/privacy-policy">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

const emptyInquiry = {
  studio_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  message: ''
}

type InquiryField = keyof typeof emptyInquiry

function validateInquiry(data: typeof emptyInquiry) {
  const errors: Partial<Record<InquiryField, string>> = {}
  if (!data.studio_name.trim()) errors.studio_name = 'Add the name of your studio.'
  if (!data.contact_name.trim()) errors.contact_name = 'Add your name.'
  if (!/^\S+@\S+\.\S+$/.test(data.contact_email.trim())) {
    errors.contact_email = 'Add an email address Courtney can reply to.'
  }
  if (!data.message.trim()) errors.message = 'Tell Courtney a little about what you have in mind.'
  return errors
}

// Studios are a secondary audience, so the inquiry lives in the footer as a
// single line that opens a short form in place.
function StudioInquiry() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState(emptyInquiry)
  const [errors, setErrors] = useState<Partial<Record<InquiryField, string>>>({})
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const field = e.target.name as InquiryField
    setData({ ...data, [field]: e.target.value })
    if (errors[field]) setErrors({ ...errors, [field]: undefined })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const found = validateInquiry(data)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setStatus('submitting')
    const supabase = createClient()
    const { error } = await supabase.from('studio_inquiries').insert([
      {
        studio_name: data.studio_name.trim(),
        contact_name: data.contact_name.trim(),
        contact_email: data.contact_email.trim(),
        contact_phone: data.contact_phone.trim() || null,
        message: data.message.trim()
      }
    ])

    if (error) {
      setStatus('error')
      return
    }
    setStatus('sent')
    setData(emptyInquiry)
  }

  return (
    <div className="lp-inquiry">
      <p className="lp-inquiry__lead">Studios: bring Courtney in for classes, workshops, or a season.</p>

      {status === 'sent' ? (
        <p className="lp-inquiry__sent" role="status">
          Thank you. Courtney will be in touch by email.
        </p>
      ) : (
        <>
          <button
            type="button"
            className="lp-link lp-link--ink"
            aria-expanded={open}
            aria-controls="lp-inquiry-form"
            onClick={() => setOpen(!open)}
          >
            {open ? 'Close the inquiry form' : 'Send a studio inquiry'}
          </button>

          <div className="lp-inquiry__drawer" data-open={open}>
            <form
              id="lp-inquiry-form"
              className="lp-inquiry__form"
              onSubmit={handleSubmit}
              noValidate
              inert={!open}
            >
              <Input label="Studio" name="studio_name" value={data.studio_name} onChange={handleChange} error={errors.studio_name} autoComplete="organization" />
              <Input label="Your name" name="contact_name" value={data.contact_name} onChange={handleChange} error={errors.contact_name} autoComplete="name" />
              <Input label="Email" name="contact_email" type="email" value={data.contact_email} onChange={handleChange} error={errors.contact_email} autoComplete="email" />
              <Input label="Phone (optional)" name="contact_phone" type="tel" value={data.contact_phone} onChange={handleChange} autoComplete="tel" />
              <div className="lp-inquiry__wide">
                <Textarea label="What do you have in mind?" name="message" rows={4} value={data.message} onChange={handleChange} error={errors.message} />
              </div>
              {status === 'error' && (
                <p className="lp-inquiry__wide lp-inquiry__error" role="alert">
                  That did not send. Try again, or email info@cpfdance.com.
                </p>
              )}
              <div className="lp-inquiry__wide">
                <Button type="submit" disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Sending…' : 'Send inquiry'}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
