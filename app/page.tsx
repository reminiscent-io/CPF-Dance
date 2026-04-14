'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import './landing.css'

const StudioCarousel = dynamic(() => import('@/components/StudioCarousel'), {
  loading: () => null,
  ssr: false
})

const dancerFeatures = [
  {
    id: 'progress',
    title: 'Track Your Progress',
    description: 'See detailed feedback from your instructor — lesson by lesson',
    icon: (
      <svg className="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    id: 'classes',
    title: 'Browse Classes',
    description: 'Find group classes and workshops near you',
    icon: (
      <svg className="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )
  },
  {
    id: 'lessons',
    title: 'Private Lessons',
    description: 'Book personalized one-on-one instruction',
    icon: (
      <svg className="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )
  },
  {
    id: 'journal',
    title: 'Personal Journal',
    description: 'Capture your own notes, goals, and breakthroughs',
    icon: (
      <svg className="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    )
  }
]

const instructorFeatures = [
  {
    id: 'students',
    title: 'Student Management',
    description: 'Track student progress and attendance',
    icon: (
      <svg className="w-5 h-5 text-mauve-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  {
    id: 'scheduling',
    title: 'Class Scheduling',
    description: 'Create and manage class schedules',
    icon: (
      <svg className="w-5 h-5 text-mauve-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    id: 'notes',
    title: 'Progress Notes',
    description: 'Provide detailed feedback to dancers',
    icon: (
      <svg className="w-5 h-5 text-mauve-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    )
  },
  {
    id: 'payments',
    title: 'Payment Tracking',
    description: 'Monitor payments and invoices',
    icon: (
      <svg className="w-5 h-5 text-mauve-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )
  }
]

const learnFromTheBestImages = [
  'https://nuuuzezbglgtsuorhinw.supabase.co/storage/v1/object/public/Public_Images/IMG_6579_medium.jpg',
  'https://nuuuzezbglgtsuorhinw.supabase.co/storage/v1/object/public/Public_Images/IMG_6563_medium.jpg',
  'https://nuuuzezbglgtsuorhinw.supabase.co/storage/v1/object/public/Public_Images/IMG_6565_medium.jpg',
]

export default function HomePage() {
  const [formData, setFormData] = useState({
    studio_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [formStep, setFormStep] = useState(0)
  const [heroHeight] = useState(55)
  const [showNav, setShowNav] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [showInquiryModal, setShowInquiryModal] = useState(false)
  const heroContentRef = useRef<HTMLDivElement>(null)
  const galleryRef = useRef<HTMLDivElement>(null)

  // Framer Motion variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  }

  const cardHoverVariants = {
    hover: { y: -8, transition: { duration: 0.3 } }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
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
        message: ''
      })
      setFormStep(0)
      // Close modal after a delay to show success message
      setTimeout(() => {
        setShowInquiryModal(false)
        setSubmitSuccess(false)
      }, 3000)
    } catch (error: any) {
      setSubmitError(error.message || 'Failed to submit inquiry. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFormStepNext = () => {
    if (formStep < 4) {
      setFormStep(formStep + 1)
    }
  }

  const handleFormStepPrev = () => {
    if (formStep > 0) {
      setFormStep(formStep - 1)
    }
  }

  const handleFormStepSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formStep < 4) {
      handleFormStepNext()
    } else {
      handleSubmit(e)
    }
  }

  const getStepContent = () => {
    switch (formStep) {
      case 0:
        return {
          label: "I am representing",
          inputName: "studio_name",
          placeholder: "Your Studio Name",
          value: formData.studio_name
        }
      case 1:
        return {
          label: "My name is",
          inputName: "contact_name",
          placeholder: "Your Name",
          value: formData.contact_name
        }
      case 2:
        return {
          label: "You can reach me at",
          inputName: "contact_email",
          placeholder: "your@email.com",
          type: "email",
          value: formData.contact_email
        }
      case 3:
        return {
          label: "My phone number is",
          inputName: "contact_phone",
          placeholder: "(555) 123-4567",
          type: "tel",
          value: formData.contact_phone
        }
      case 4:
        return {
          label: "Tell us more",
          inputName: "message",
          placeholder: "How can we work together...",
          isTextarea: true,
          value: formData.message
        }
      default:
        return null
    }
  }

  const openInquiryModal = () => {
    setShowInquiryModal(true)
  }

  const handleLoginClick = () => {
    setLoginLoading(true)
  }

  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    // Show nav immediately for faster perceived load
    setShowNav(true)
  }, [])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Scroll listener for parallax effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <main className="min-h-screen bg-white marketing-page overflow-x-hidden">
      {/* Navigation Bar */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-br from-rose-50 via-mauve-50 to-cream-50 border-b border-rose-200 shadow-sm"
        style={{
          opacity: showNav ? 1 : 0,
          transform: showNav ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out',
          pointerEvents: showNav ? 'auto' : 'none',
          paddingTop: 'max(env(safe-area-inset-top), 0px)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-rose-600 to-mauve-600 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-family-display)' }}>
            CPF Dance
          </Link>
          <div className="flex gap-4">
            <Link 
              href="/login?portal=dancer"
              className="text-gray-700 hover:text-rose-600 transition-colors font-medium flex items-center gap-2"
              onClick={handleLoginClick}
            >
              {loginLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" strokeWidth={2} stroke="currentColor" opacity="0.25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Loading...</span>
                </>
              ) : (
                'Login'
              )}
            </Link>
            <button
              onClick={openInquiryModal}
              className="text-gray-700 hover:text-rose-600 transition-colors font-medium"
            >
              Studio Inquiry
            </button>
          </div>
        </div>
      </nav>

      <section className="lp lp-hero relative overflow-hidden" aria-label="Hero">
        {/* Mobile: Single hero image background with centered text */}
        <div className="md:hidden relative min-h-[100svh] flex flex-col justify-center">
          <div className="absolute inset-x-0 bottom-0 top-14">
            <img
              src="https://nuuuzezbglgtsuorhinw.supabase.co/storage/v1/object/public/Public_Images/CR6_4040.jpg"
              alt=""
              className="w-full h-full object-cover object-top"
              aria-hidden="true"
            />
          </div>
          <div className="absolute inset-0 bg-white/75"></div>
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

          <div className="relative w-full px-4 sm:px-6 py-12 pt-24 text-center" ref={heroContentRef}>
            <motion.h1
              className="text-4xl sm:text-5xl font-bold text-charcoal-950 mb-6"
              initial={isMounted ? { opacity: 0, y: -20 } : false}
              animate={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              Precision. Passion.
              <span className="block bg-gradient-to-r from-rose-600 via-gold-600 to-gold-700 bg-clip-text text-transparent mt-2">
                Performance.
              </span>
            </motion.h1>
            <motion.p
              className="text-lg sm:text-xl text-charcoal-800 mb-8 max-w-3xl mx-auto leading-relaxed"
              initial={isMounted ? { opacity: 0 } : false}
              animate={isMounted ? { opacity: 1 } : { opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.4 }}
            >
              Connect with a world-class instructor. Get detailed feedback after every lesson. See how far you've come.
            </motion.p>
            <motion.div
              className="flex flex-col gap-4 justify-center items-center"
              initial={isMounted ? { opacity: 0, y: 20 } : false}
              animate={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
            >
              <Link href="/signup?role=dancer">
                <Button variant="gold" size="lg" className="text-lg px-8 py-3">
                  Get Started
                </Button>
              </Link>
              <Link
                href="/login?portal=dancer"
                className="text-lg font-semibold text-charcoal-700 hover:text-gold-700 transition-colors"
                onClick={handleLoginClick}
              >
                Already a member? Sign In →
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Desktop: Left third text on cream background, right two-thirds two images */}
        <div className="hidden md:grid lp-hero__grid">
          <div className="lp-hero__content">
            <motion.span
              className="lp-eyebrow"
              initial={isMounted ? { opacity: 0, y: 10 } : false}
              animate={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              World-Class Dance Instruction
            </motion.span>
            <motion.h1
              className="lp-hero__title"
              initial={isMounted ? { opacity: 0, y: -20 } : false}
              animate={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              Precision. Passion.
              <span className="block bg-gradient-to-r from-rose-600 via-gold-600 to-gold-700 bg-clip-text text-transparent mt-2">
                Performance.
              </span>
            </motion.h1>
            <motion.p
              className="lp-hero__body"
              initial={isMounted ? { opacity: 0 } : false}
              animate={isMounted ? { opacity: 1 } : { opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.4 }}
            >
              Connect with a world-class instructor. Get detailed feedback after every lesson. See how far you've come.
            </motion.p>
            <motion.div
              className="lp-hero__ctas"
              initial={isMounted ? { opacity: 0, y: 20 } : false}
              animate={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
            >
              <Link href="/signup?role=dancer">
                <Button variant="gold" size="lg" className="text-lg px-8 py-3">
                  Get Started
                </Button>
              </Link>
              <Link
                href="/login?portal=dancer"
                className="text-base font-semibold text-charcoal-700 hover:text-gold-700 transition-colors"
                onClick={handleLoginClick}
              >
                Already a member? Sign In →
              </Link>
            </motion.div>
          </div>

          <div className="lp-hero__media-split" aria-hidden="true">
            {learnFromTheBestImages.slice(1, 3).map((image, idx) => (
              <div key={idx}>
                <img src={image} alt="" loading="eager" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Studio Carousel - Right after hero */}
      <StudioCarousel />

      {/* Problem Statement */}
      <section className="py-12 sm:py-16 bg-charcoal-900 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.p
            className="text-xl sm:text-2xl leading-relaxed"
            style={{ fontFamily: 'var(--font-family-display)' }}
            initial={isMounted ? { opacity: 0, y: 20 } : false}
            whileInView={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            In dance, real feedback is rare. Most dancers leave class with nothing written down, no notes on what to work on, no record of progress.
          </motion.p>
          <motion.p
            className="mt-4 text-lg text-rose-300 font-medium"
            initial={isMounted ? { opacity: 0 } : false}
            whileInView={isMounted ? { opacity: 1 } : { opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            CPF Dance changes that.
          </motion.p>
        </div>
      </section>

      {/* Learn from the Best Section - About Courtney */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-1 lg:order-1">
              <h2 className="mb-8" style={{ fontFamily: 'var(--font-family-display)' }}>
                Learn from the Best
              </h2>
              <div className="space-y-4 text-lg text-charcoal-800 leading-relaxed">
                <p>
                  With over a decade of professional experience, including performances with the world-renowned
                  <span className="font-semibold text-rose-700"> Radio City Rockettes</span>, Courtney brings
                  unparalleled expertise to every lesson.
                </p>
                <p>
                  Her precision-based approach focuses on technique, artistry, and personal growth, so
                  every dancer can reach their full potential while developing confidence and grace.
                </p>
                <p>
                  Whether you're a beginner discovering your passion or an advanced dancer refining your skills,
                  you'll receive personalized instruction tailored to your goals.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="https://www.longislandpress.com/2023/12/01/a-day-in-the-life-of-a-radio-city-rockette/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-rose-50 rounded-full shadow-sm border border-rose-300 hover:bg-rose-100 hover:border-rose-400 transition-colors"
                >
                  <span className="text-sm font-medium text-rose-700">Radio City Rockettes →</span>
                </a>
                <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-rose-200">
                  <span className="text-sm font-medium text-charcoal-900">Professional Performer</span>
                </div>
                <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-rose-200">
                  <span className="text-sm font-medium text-charcoal-900">Precision Technique</span>
                </div>
                <a
                  href="https://broadwaydancecenter.com/faculty/courtney-file"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-rose-50 rounded-full shadow-sm border border-rose-300 hover:bg-rose-100 hover:border-rose-400 transition-colors"
                >
                  <span className="text-sm font-medium text-rose-700">Broadway Dance Center Instructor →</span>
                </a>
              </div>
            </div>
            <div className="order-2 lg:order-2">
              <div className="relative">
                {/* Swipable Gallery */}
                <div
                  ref={galleryRef}
                  className="flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide bg-white"
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  }}
                  onScroll={(e) => {
                    const scrollLeft = e.currentTarget.scrollLeft
                    const itemWidth = e.currentTarget.scrollWidth / learnFromTheBestImages.length
                    const index = Math.round(scrollLeft / itemWidth)
                    setGalleryIndex(index)
                  }}
                >
                  {learnFromTheBestImages.map((image, idx) => (
                    <div
                      key={idx}
                      className="flex-shrink-0 w-full snap-center"
                    >
                      <div className="aspect-[3/4] rounded-2xl shadow-2xl overflow-hidden">
                        <img
                          src={image}
                          alt={`Courtney - Professional Dancer and Instructor ${idx + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Gallery Indicators */}
                <div className="flex justify-center gap-2 mt-4">
                  {learnFromTheBestImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (galleryRef.current) {
                          const itemWidth = galleryRef.current.scrollWidth / learnFromTheBestImages.length
                          galleryRef.current.scrollTo({
                            left: itemWidth * idx,
                            behavior: 'smooth'
                          })
                        }
                      }}
                      className={`h-2 rounded-full transition-all ${
                        idx === galleryIndex
                          ? 'w-8 bg-rose-600'
                          : 'w-2 bg-gray-300 hover:bg-gray-400'
                      }`}
                      aria-label={`Go to image ${idx + 1}`}
                    />
                  ))}
                </div>

                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-rose-400 rounded-full mix-blend-multiply filter blur-2xl opacity-30"></div>
                <div className="absolute -top-6 -left-6 w-32 h-32 bg-mauve-400 rounded-full mix-blend-multiply filter blur-2xl opacity-30"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dancer Portal Section - Editorial card style */}
      <section id="dancer-portal" className="lp lp-dancers">
        <div className="lp-dancers__bg">
          <img
            src="https://images.unsplash.com/photo-1674221525704-f4b2aa13df2c"
            alt=""
            aria-hidden="true"
          />
        </div>
        <div className="lp-dancers__overlay" />

        <div className="lp-dancers__inner">
          <motion.div
            className="lp-dancers__head"
            initial={isMounted ? { opacity: 0, y: 20 } : false}
            whileInView={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="lp-eyebrow">For Dancers</span>
            <h2>Built for dancers who take their training seriously.</h2>
          </motion.div>

          <div className="lp-dancers__grid">
            {dancerFeatures.map((feature, index) => (
              <motion.article
                key={feature.id}
                className="lp-dancer-card"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
              >
                <div className="lp-dancer-card__num">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <h3 className="lp-dancer-card__title">{feature.title}</h3>
                <p className="lp-dancer-card__body">{feature.description}</p>
              </motion.article>
            ))}
          </div>

          <div className="lp-dancers__ctas">
            <Link href="/signup?role=dancer">
              <Button variant="gold" size="lg" className="text-lg px-8 py-3">
                Join Now
              </Button>
            </Link>
            <Link
              href="/login?portal=dancer"
              className="lp-link"
              onClick={handleLoginClick}
            >
              {loginLoading ? 'Logging in…' : 'Already a member? Sign In →'}
            </Link>
          </div>
        </div>
      </section>

      {/* Instructor Portal Section - Secondary (temporarily hidden) */}
      {false && (
      <section id="instructor-portal" className="relative py-16 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1679389657556-f0d695d0dfc2"
            alt="Dance instructor"
            className="w-full h-full object-cover"
          />
        </div>

        {/* White Opaque Overlay */}
        <div className="absolute inset-0 bg-white/60 z-10"></div>

        {/* Content */}
        <div className="relative z-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={isMounted ? { opacity: 0, y: 20 } : false}
            whileInView={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-gradient-to-br from-champagne-50/90 to-ballet-pink-50/90 backdrop-blur-sm p-6 sm:p-8 lg:p-10 shadow-2xl">
              <div className="text-center mb-6">
                <h2 className="mb-4" style={{ fontFamily: 'var(--font-family-display)' }}>
                  For Instructors
                </h2>
                <p className="text-lg text-charcoal-800 leading-relaxed">
                  Professional tools to manage your studio, track student progress, and streamline your teaching
                </p>
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="inline-block mt-3 px-4 py-1.5 bg-gradient-to-r from-gold-500 to-gold-600 text-white text-sm font-semibold rounded-full shadow-md"
                >
                  Available by Invitation
                </motion.span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
                {instructorFeatures.map((feature, index) => (
                  <motion.div
                    key={feature.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.1,
                      ease: [0.25, 0.46, 0.45, 0.94]
                    }}
                    whileHover={{
                      scale: 1.02,
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      transition: { duration: 0.2 }
                    }}
                    className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-white/60 shadow-sm cursor-default"
                  >
                    <motion.div
                      className="flex-shrink-0 mt-0.5"
                      initial={{ scale: 0, rotate: -180 }}
                      whileInView={{ scale: 1, rotate: 0 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.5,
                        delay: index * 0.1 + 0.2,
                        type: "spring",
                        stiffness: 200
                      }}
                    >
                      {feature.icon}
                    </motion.div>
                    <div>
                      <div className="font-semibold text-charcoal-950 text-base">{feature.title}</div>
                      <p className="text-sm text-charcoal-700 mt-0.5">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <Link href="/login?portal=instructor" className="block" onClick={handleLoginClick}>
                <Button size="lg" variant="outline" className="w-full text-lg py-3 border-2 border-mauve-600 text-mauve-700 hover:bg-mauve-50 flex items-center justify-center gap-2" disabled={loginLoading}>
                  {loginLoading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" strokeWidth={2} stroke="currentColor" opacity="0.25" />
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Loading...</span>
                    </>
                  ) : (
                    'Request Access'
                  )}
                </Button>
              </Link>
            </Card>
          </motion.div>
        </div>
      </section>
      )}

      {/* Studio Inquiry Modal */}
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
            Interested in bringing our expertise to your studio? Let's connect.
          </p>
        </div>

        {submitSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-2xl font-semibold text-charcoal-950 mb-2">Thank You!</div>
            <p className="text-charcoal-800 leading-relaxed">
              We've received your inquiry and will be in touch shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleFormStepSubmit} className="space-y-6">
            {/* Progress Indicator */}
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

            {/* Conversational Form Step */}
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

              {/* Navigation Buttons */}
              <div className="flex gap-3 justify-center">
                {formStep > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFormStepPrev}
                  >
                    ← Back
                  </Button>
                )}
                {formStep === 4 ? (
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting || !getStepContent()?.value}
                    className="flex-1 sm:flex-initial"
                  >
                    {isSubmitting ? 'Submitting...' : 'Send Inquiry'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleFormStepNext}
                    disabled={!getStepContent()?.value}
                    className="flex-1 sm:flex-initial"
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>
          </form>
        )}
      </Modal>

      <footer className="bg-charcoal-950 text-white/80 py-6 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6 mb-4">
            <div>
              <div className="text-xs font-semibold text-gold-400 uppercase tracking-[0.2em] mb-2">Quick Links</div>
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                <li>
                  <Link href="/login" className="hover:text-gold-400 transition-colors">
                    Login
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="hover:text-gold-400 transition-colors">
                    Sign Up
                  </Link>
                </li>
                <li>
                  <button onClick={openInquiryModal} className="hover:text-gold-400 transition-colors">
                    Studio Inquiry
                  </button>
                </li>
              </ul>
            </div>

            <div className="md:text-right">
              <div className="text-xs font-semibold text-gold-400 uppercase tracking-[0.2em] mb-2">Contact</div>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 md:justify-end">
                <li>
                  <a
                    href="mailto:info@cpfdance.com"
                    className="hover:text-gold-400 transition-colors"
                  >
                    info@cpfdance.com
                  </a>
                </li>
                <li>
                  <a
                    href="https://instagram.com/courtneyfiledance"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gold-400 transition-colors inline-flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.322a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/>
                    </svg>
                    @courtneyfiledance
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-3 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-white/60">
            <p>&copy; {new Date().getFullYear()} CPF Dance LLC. All rights reserved.</p>
            <div className="space-x-3">
              <Link href="/terms-of-service" className="hover:text-gold-400 transition-colors">
                Terms of Service
              </Link>
              <span>•</span>
              <Link href="/privacy-policy" className="hover:text-gold-400 transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
