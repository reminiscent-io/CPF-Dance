'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import './landing.css'

const StudioCarousel = dynamic(() => import('@/components/StudioCarousel'), {
  loading: () => null,
  ssr: false,
})

const HERO_IMAGE =
  'https://nuuuzezbglgtsuorhinw.supabase.co/storage/v1/object/public/Public_Images/IMG_6579_medium.jpg'
const ABOUT_IMAGE =
  'https://nuuuzezbglgtsuorhinw.supabase.co/storage/v1/object/public/Public_Images/IMG_6563_medium.jpg'

const services = [
  {
    num: '01',
    title: 'Private Lessons',
    body: 'One-on-one instruction tailored to your level, your style, and your timeline. Every session builds on the last.',
  },
  {
    num: '02',
    title: 'Lesson Feedback',
    body: 'Detailed written notes after every session. Drills, corrections, and progress tracking you can reference anytime.',
  },
  {
    num: '03',
    title: 'Studio Programs',
    body: "Partner with CPF Dance to elevate your studio's curriculum and give your instructors a modern feedback platform.",
  },
]

const stats = [
  { num: '500+', label: 'Students Trained' },
  { num: '15+', label: 'Years Teaching' },
  { num: '7', label: 'Partner Studios' },
]

export default function HomePage() {
  // ----- Studio Inquiry modal state (preserved from prior page) -----
  const [showInquiryModal, setShowInquiryModal] = useState(false)
  const [formData, setFormData] = useState({
    studio_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    message: '',
  })
  const [formStep, setFormStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // ----- UI / scroll state -----
  const [navScrolled, setNavScrolled] = useState(false)
  const heroImgRef = useRef<HTMLDivElement>(null)
  const aboutSectionRef = useRef<HTMLElement>(null)
  const servicesSectionRef = useRef<HTMLElement>(null)
  const ctaInnerRef = useRef<HTMLDivElement>(null)

  // Nav scroll state
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 50)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // IntersectionObserver reveals
  useEffect(() => {
    const targets = [
      aboutSectionRef.current,
      servicesSectionRef.current,
      ctaInnerRef.current,
    ].filter(Boolean) as Element[]

    if (targets.length === 0) return

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.2 }
    )

    targets.forEach((t) => io.observe(t))
    return () => io.disconnect()
  }, [])

  // Desktop-only parallax on hero image
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth <= 768) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let ticking = false
    let lastY = window.scrollY

    const update = () => {
      ticking = false
      if (heroImgRef.current) {
        heroImgRef.current.style.transform = `translateY(${lastY * 0.08}px) scale(1)`
      }
    }

    const onScroll = () => {
      lastY = window.scrollY
      if (!ticking) {
        window.requestAnimationFrame(update)
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ----- Inquiry form handlers (preserved) -----
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')
    setSubmitSuccess(false)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('studio_inquiries')
        .insert([formData])
      if (error) throw error
      setSubmitSuccess(true)
      setFormData({
        studio_name: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        message: '',
      })
      setFormStep(0)
      setTimeout(() => {
        setShowInquiryModal(false)
        setSubmitSuccess(false)
      }, 3000)
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit inquiry. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStepContent = () => {
    switch (formStep) {
      case 0:
        return {
          label: 'I am representing',
          inputName: 'studio_name',
          placeholder: 'Your Studio Name',
          value: formData.studio_name,
        }
      case 1:
        return {
          label: 'My name is',
          inputName: 'contact_name',
          placeholder: 'Your Name',
          value: formData.contact_name,
        }
      case 2:
        return {
          label: 'You can reach me at',
          inputName: 'contact_email',
          placeholder: 'your@email.com',
          type: 'email',
          value: formData.contact_email,
        }
      case 3:
        return {
          label: 'My phone number is',
          inputName: 'contact_phone',
          placeholder: '(555) 123-4567',
          type: 'tel',
          value: formData.contact_phone,
        }
      case 4:
        return {
          label: 'Tell us more',
          inputName: 'message',
          placeholder: 'How can we work together...',
          isTextarea: true,
          value: formData.message,
        }
      default:
        return null
    }
  }

  const handleFormStepSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formStep < 4) setFormStep(formStep + 1)
    else handleSubmit(e)
  }

  const openInquiryModal = () => setShowInquiryModal(true)

  return (
    <main className="lp">
      {/* ========================= NAV ========================= */}
      <nav className={`lp-nav ${navScrolled ? 'lp-nav--scrolled' : ''}`}>
        <div className="lp-nav__inner">
          <Link href="/" className="lp-logo">
            CPF Dance
          </Link>
          <div className="lp-nav__links">
            <button
              type="button"
              onClick={openInquiryModal}
              className="lp-nav__link"
            >
              Studio Inquiry
            </button>
            <Link
              href="/login?portal=dancer"
              className="lp-nav__link lp-nav__link--bordered"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* ========================= HERO ========================= */}
      <section className="lp-hero" aria-label="Hero">
        <div className="lp-hero__grid">
          <div className="lp-hero__content">
            <span className="lp-eyebrow">World-Class Dance Instruction</span>
            <h1 className="lp-hero__title">
              <span className="lp-hero__title-line">
                <span>Precision.</span>
              </span>
              <span className="lp-hero__title-line">
                <span>Passion.</span>
              </span>
              <span className="lp-hero__title-line">
                <span>Performance.</span>
              </span>
            </h1>
            <p className="lp-hero__body">
              Connect with a world-class instructor. Get detailed feedback after
              every lesson. Track your growth and see how far you&rsquo;ve come.
            </p>
            <div className="lp-hero__ctas">
              <Link href="/signup?role=dancer" className="lp-btn lp-btn--gold">
                <span>Get Started</span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link href="/login?portal=dancer" className="lp-link">
                Already a member? Sign In
              </Link>
            </div>
          </div>

          <div className="lp-hero__media" aria-hidden="true">
            <div ref={heroImgRef} className="lp-hero__img-wrap">
              <img
                src={HERO_IMAGE}
                alt=""
                className="lp-hero__img"
                loading="eager"
                fetchPriority="high"
              />
              <div className="lp-hero__img-fade" />
            </div>
          </div>
        </div>

        <div className="lp-hero__scroll" aria-hidden="true">
          Scroll
        </div>
      </section>

      {/* ========================= TRUST BAR ========================= */}
      <div className="lp-trust">
        <div className="lp-trust__label">Trusted by Top Studios &amp; Programs</div>
        <StudioCarousel />
      </div>

      {/* ========================= ABOUT ========================= */}
      <section ref={aboutSectionRef} className="lp-section lp-about" aria-label="About CPF Dance">
        <div className="lp-about__grid">
          <div className="lp-about__media">
            <img src={ABOUT_IMAGE} alt="Courtney teaching a private lesson" />
            <div className="lp-curtain" aria-hidden="true" />
          </div>
          <div className="lp-about__text">
            <span className="lp-eyebrow">The CPF Difference</span>
            <h2 className="lp-about__title">Every lesson moves you forward.</h2>
            <p className="lp-about__body">
              CPF Dance pairs you with an elite instructor who builds a
              personalized curriculum around your goals. After every session,
              you receive detailed written feedback so nothing gets lost between
              lessons.
            </p>
            <div className="lp-about__stats">
              {stats.map((s) => (
                <div key={s.label} className="lp-stat">
                  <div className="lp-stat__num">{s.num}</div>
                  <div className="lp-stat__label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================= SERVICES ========================= */}
      <section
        ref={servicesSectionRef}
        className="lp-section lp-services"
        aria-label="What we offer"
      >
        <div className="lp-services__inner">
          <div className="lp-services__head">
            <span className="lp-eyebrow">What We Offer</span>
            <h2>Built around how dancers actually learn.</h2>
          </div>
          <div className="lp-services__grid">
            {services.map((svc) => (
              <article key={svc.num} className="lp-card">
                <div className="lp-card__num">{svc.num}</div>
                <h3 className="lp-card__title">{svc.title}</h3>
                <p className="lp-card__body">{svc.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ========================= BOTTOM CTA ========================= */}
      <section className="lp-section lp-cta" aria-label="Get started">
        <div ref={ctaInnerRef} className="lp-cta__inner lp-reveal">
          <h2 className="lp-cta__title">
            Ready to level up your <em>technique?</em>
          </h2>
          <p className="lp-cta__body">
            Start with a single lesson. See the difference for yourself.
          </p>
          <Link href="/signup?role=dancer" className="lp-btn lp-btn--dark">
            <span>Book Your First Lesson</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* ========================= FOOTER ========================= */}
      <footer className="lp-footer">
        <div className="lp-footer__inner">
          <div className="lp-footer__logo">CPF Dance</div>
          <div className="lp-footer__copy">
            &copy; {new Date().getFullYear()} CPF Dance LLC. All rights reserved.
          </div>
        </div>
      </footer>

      {/* ========================= STUDIO INQUIRY MODAL ========================= */}
      <Modal
        isOpen={showInquiryModal}
        onClose={() => {
          setShowInquiryModal(false)
          setSubmitSuccess(false)
          setFormStep(0)
        }}
        title="Studio Partnership Inquiry"
        size="lg"
      >
        <div className="mb-4">
          <p className="text-charcoal-700 leading-relaxed">
            Interested in bringing our expertise to your studio? Let&rsquo;s connect.
          </p>
        </div>
        {submitSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="text-2xl font-semibold text-charcoal-950 mb-2">
              Thank You!
            </div>
            <p className="text-charcoal-800 leading-relaxed">
              We&rsquo;ve received your inquiry and will be in touch shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleFormStepSubmit} className="space-y-6">
            <div className="flex gap-2 justify-center">
              {[0, 1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-2 w-12 rounded-full transition-all ${
                    step <= formStep ? 'bg-rose-600' : 'bg-charcoal-200'
                  }`}
                />
              ))}
            </div>

            <div className="space-y-6">
              <div className="text-center">
                <p className="text-lg text-charcoal-800 mb-4">
                  <span className="font-semibold">{getStepContent()?.label}</span>
                </p>
                {getStepContent()?.isTextarea ? (
                  <Textarea
                    name={getStepContent()?.inputName || ''}
                    rows={4}
                    required
                    value={getStepContent()?.value || ''}
                    onChange={handleInputChange}
                    placeholder={getStepContent()?.placeholder}
                    className="w-full text-center"
                  />
                ) : (
                  <Input
                    name={getStepContent()?.inputName || ''}
                    type={getStepContent()?.type || 'text'}
                    required
                    value={getStepContent()?.value || ''}
                    onChange={handleInputChange}
                    placeholder={getStepContent()?.placeholder}
                    className="w-full text-center"
                  />
                )}
              </div>

              {submitError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-center">{submitError}</p>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                {formStep > 0 && (
                  <button
                    type="button"
                    onClick={() => setFormStep(formStep - 1)}
                    className="px-4 py-2 border border-charcoal-300 text-charcoal-700 rounded-lg hover:bg-charcoal-50 transition-colors"
                  >
                    ← Back
                  </button>
                )}
                {formStep === 4 ? (
                  <button
                    type="submit"
                    disabled={isSubmitting || !getStepContent()?.value}
                    className="px-6 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-initial"
                  >
                    {isSubmitting ? 'Submitting...' : 'Send Inquiry'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setFormStep(formStep + 1)}
                    disabled={!getStepContent()?.value}
                    className="px-6 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-initial"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </Modal>
    </main>
  )
}
