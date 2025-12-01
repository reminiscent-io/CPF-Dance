'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'
import StudioCarousel from '@/components/StudioCarousel'

const portals = [
  {
    id: 'dancer',
    title: 'Dancer Portal',
    description: 'Track your progress, view classes, and manage your dance journey',
    image: 'https://images.unsplash.com/photo-1555656220-46e30749d330?',
    link: '/login?portal=dancer'
  },
  {
    id: 'instructor',
    title: 'Instructor Portal',
    description: 'Manage students, schedule classes, and provide notes to dancers',
    image: 'https://images.unsplash.com/photo-1685339009948-d807094b1457?',
    link: '/login?portal=instructor'
  },
  {
    id: 'studio',
    title: 'Studio Portal',
    description: 'Connect with instructors and track payments',
    image: 'https://images.unsplash.com/photo-1677603142181-6e49eb1a3c10?',
    link: '/login?portal=studio'
  }
]

const learnFromTheBestImages = [
  'https://nuuuzezbglgtsuorhinw.supabase.co/storage/v1/object/public/Public_Images/CR6_4040.jpeg',
  'https://nuuuzezbglgtsuorhinw.supabase.co/storage/v1/object/public/Public_Images/IMG_6563.jpeg',
  'https://nuuuzezbglgtsuorhinw.supabase.co/storage/v1/object/public/Public_Images/IMG_6565.jpeg',
  'https://nuuuzezbglgtsuorhinw.supabase.co/storage/v1/object/public/Public_Images/IMG_6579.jpeg',
]

const features = [
  {
    id: 'progress',
    title: 'Progress Tracking',
    description: 'Detailed instructor notes and progress reports to monitor your development',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bgGradient: 'from-rose-500 to-rose-600'
  },
  {
    id: 'scheduling',
    title: 'Easy Scheduling',
    description: 'Intuitive calendar system for managing classes and private lessons',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    bgGradient: 'from-mauve-500 to-mauve-600'
  },
  {
    id: 'payments',
    title: 'Secure Payments',
    description: 'Safe and convenient payment processing for lessons and classes',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    bgGradient: 'from-rose-500 to-mauve-600'
  },
  {
    id: 'lessons',
    title: 'Private Lessons',
    description: 'Request and schedule one-on-one instruction at your convenience',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    bgGradient: 'from-mauve-500 to-rose-600'
  }
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
  const [heroHeight] = useState(55)
  const [showNav, setShowNav] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [featuresCarouselIndex, setFeaturesCarouselIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [taglineIndex, setTaglineIndex] = useState(0)
  const [taglineKey, setTaglineKey] = useState(0)
  const [imageIndex, setImageIndex] = useState(0)
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const heroContentRef = useRef<HTMLDivElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const featuresCarouselRef = useRef<HTMLDivElement>(null)

  const taglineRoles = ['Dancers', 'Instructors', 'Studios']

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

  // Optimized Ken Burns effect - GPU-accelerated (transform + opacity only)
  const imageVariants = {
    enter: {
      opacity: 0,
      scale: 1.08,
      x: 0,
      y: 0
    },
    center: {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      transition: {
        duration: 1.5,
        ease: [0.25, 0.1, 0.25, 1], // smooth easeInOut
        opacity: { duration: 1.2 }
      }
    },
    exit: {
      opacity: 0,
      scale: 0.92,
      x: 0,
      y: 0,
      transition: {
        duration: 1.2,
        ease: [0.25, 0.1, 0.25, 1]
      }
    }
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
    } catch (error: any) {
      setSubmitError(error.message || 'Failed to submit inquiry. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const scrollToInquiry = () => {
    document.getElementById('studio-inquiry')?.scrollIntoView({ behavior: 'smooth' })
  }

  const nextPortal = () => {
    setCarouselIndex((prev) => (prev + 1) % portals.length)
  }

  const prevPortal = () => {
    setCarouselIndex((prev) => (prev - 1 + portals.length) % portals.length)
  }

  const nextFeature = () => {
    setFeaturesCarouselIndex((prev) => (prev + 1) % features.length)
  }

  const prevFeature = () => {
    setFeaturesCarouselIndex((prev) => (prev - 1 + features.length) % features.length)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return
    
    const touchEnd = e.changedTouches[0].clientX
    const distance = touchStart - touchEnd
    const minSwipeDistance = 50 // minimum distance in pixels to trigger swipe
    
    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Swiped left, go to next portal
        nextPortal()
      } else {
        // Swiped right, go to previous portal
        prevPortal()
      }
    }
    
    setTouchStart(0)
  }

  // Preload images for smooth transitions
  useEffect(() => {
    const preloadImages = async () => {
      const imagePromises = learnFromTheBestImages.map((src) => {
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.src = src
          img.onload = resolve
          img.onerror = reject
        })
      })

      try {
        await Promise.all(imagePromises)
        setImagesLoaded(true)
      } catch (error) {
        console.error('Failed to preload images:', error)
        setImagesLoaded(true) // Still set to true to show images
      }
    }

    preloadImages()
  }, [])

  useEffect(() => {
    // Show nav after short delay
    const navTimer = setTimeout(() => {
      setShowNav(true)
    }, 1000)

    return () => {
      clearTimeout(navTimer)
    }
  }, [])

  // Tagline rotation effect
  useEffect(() => {
    const taglineTimer = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % taglineRoles.length)
      setTaglineKey((prev) => prev + 1)
    }, 4000)

    return () => clearInterval(taglineTimer)
  }, [])

  // Image cycling effect
  useEffect(() => {
    const imageTimer = setInterval(() => {
      setImageIndex((prev) => (prev + 1) % learnFromTheBestImages.length)
    }, 5000)

    return () => clearInterval(imageTimer)
  }, [])

  return (
    <main className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav 
        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-br from-rose-50 via-mauve-50 to-cream-50 border-b border-rose-200 shadow-sm"
        style={{
          opacity: showNav ? 1 : 0,
          transform: showNav ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out',
          pointerEvents: showNav ? 'auto' : 'none'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-rose-600 to-mauve-600 bg-clip-text text-transparent">
            CPF Dance
          </Link>
          <div className="flex gap-4">
            <Link 
              href="/login?portal=dancer"
              className="text-gray-700 hover:text-rose-600 transition-colors font-medium"
            >
              Login
            </Link>
            <button 
              onClick={scrollToInquiry}
              className="text-gray-700 hover:text-rose-600 transition-colors font-medium"
            >
              Inquiry
            </button>
          </div>
        </div>
      </nav>

      <section 
        className="relative flex flex-col justify-center bg-gradient-to-br from-rose-50 via-mauve-50 to-cream-50 overflow-hidden"
        style={{
          height: `${heroHeight}vh`,
          transition: 'height 2s ease-in-out'
        }}
      >
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-rose-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-mauve-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-32 text-left" ref={heroContentRef}>
          <motion.h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}>
            Professional Precision
            <span className="block bg-gradient-to-r from-rose-600 to-mauve-600 bg-clip-text text-transparent mt-2">
              Dance Instruction
            </span>
          </motion.h1>
          <motion.p className="text-xl sm:text-2xl text-gray-700 mb-4 max-w-4xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.4 }}>
            <span className="typewriter" key={taglineKey}>
              <span className="typewriter-fade">
                A comprehensive platform built by dancers for <span className="text-rose-600 font-semibold">{taglineRoles[taglineIndex]}</span>
              </span>
            </span>
          </motion.p>
        </div>
      </section>

      <section id="portals" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Select Your Portal
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Access your personalized dashboard based on your role
            </p>
          </div>

          {/* Desktop Grid - Hidden on mobile */}
          <motion.div className="hidden md:grid grid-cols-3 gap-8 mb-20" variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {portals.map((portal) => (
              <motion.div key={portal.id} variants={itemVariants} whileHover="hover">
                <Card hover className="text-center overflow-hidden p-0 flex flex-col h-full" style={{ cursor: 'pointer' }}>
                  <motion.div className="relative w-full h-48 overflow-hidden">
                    <img
                      src={portal.image}
                      alt={portal.title}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="text-2xl font-semibold text-gray-900 mb-3">{portal.title}</h3>
                      <p className="text-gray-600 mb-6">
                        {portal.description}
                      </p>
                    </div>
                    <Link href={portal.link}>
                      <Button size="lg" className="w-full flex flex-col items-center justify-center gap-1">
                        <span>Log-in</span>
                        <span className="text-xs italic font-normal">or sign-up</span>
                      </Button>
                    </Link>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Mobile Carousel - Visible only on mobile */}
          <div className="md:hidden mb-20">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={prevPortal}
                className="flex-shrink-0 p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Previous portal"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex-1 overflow-hidden" ref={carouselRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                <Card hover className="text-center overflow-hidden p-0 flex flex-col">
                  <div className="relative w-full h-48 overflow-hidden">
                    <img
                      src={portals[carouselIndex].image}
                      alt={portals[carouselIndex].title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="text-2xl font-semibold text-gray-900 mb-3">{portals[carouselIndex].title}</h3>
                      <p className="text-gray-600 mb-6">
                        {portals[carouselIndex].description}
                      </p>
                    </div>
                    <Link href={portals[carouselIndex].link}>
                      <Button size="lg" className="w-full flex flex-col items-center justify-center gap-1">
                        <span>Log-in</span>
                        <span className="text-xs italic font-normal">or sign-up</span>
                      </Button>
                    </Link>
                  </div>
                </Card>
              </div>

              <button
                onClick={nextPortal}
                className="flex-shrink-0 p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Next portal"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Carousel Indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {portals.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCarouselIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === carouselIndex ? 'bg-rose-600' : 'bg-gray-300'
                  }`}
                  aria-label={`Go to portal ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Useful tools to keep track of notes, progress, classes, and payments for dancers, instructors, and studios
            </p>
          </div>

          {/* Desktop Bento Grid - Hidden on mobile */}
          <motion.div
            className="hidden md:grid md:grid-cols-4 md:grid-rows-4 gap-4 mb-20 h-[600px]"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* Progress Tracking - Large Card (2x2) */}
            <motion.div
              variants={itemVariants}
              className="md:col-span-2 md:row-span-2 group"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className={`relative h-full bg-gradient-to-br ${features[0].bgGradient} rounded-3xl p-8 overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300`}>
                {/* Animated background elements */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl animate-pulse"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full blur-2xl animate-pulse delay-1000"></div>
                </div>

                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <motion.div
                      className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
                    >
                      {features[0].icon}
                    </motion.div>
                    <h3 className="text-3xl font-bold text-white mb-4">{features[0].title}</h3>
                    <p className="text-white/90 text-lg leading-relaxed">
                      {features[0].description}
                    </p>
                  </div>

                  {/* Decorative chart visualization */}
                  <div className="flex gap-2 items-end h-24 mt-6">
                    {[40, 65, 45, 80, 60, 90, 70].map((height, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 bg-white/30 backdrop-blur-sm rounded-t-lg"
                        initial={{ height: 0 }}
                        whileInView={{ height: `${height}%` }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        viewport={{ once: true }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Easy Scheduling - Tall Card (1x2) */}
            <motion.div
              variants={itemVariants}
              className="md:col-span-1 md:row-span-2 group"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className={`relative h-full bg-gradient-to-br ${features[1].bgGradient} rounded-3xl p-6 overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300`}>
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white rounded-full blur-3xl animate-pulse"></div>
                </div>

                <div className="relative z-10 h-full flex flex-col">
                  <motion.div
                    className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                  >
                    {features[1].icon}
                  </motion.div>
                  <h3 className="text-2xl font-bold text-white mb-3">{features[1].title}</h3>
                  <p className="text-white/90 leading-relaxed">
                    {features[1].description}
                  </p>

                  {/* Mini calendar grid */}
                  <div className="mt-auto grid grid-cols-7 gap-1">
                    {Array.from({ length: 28 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className={`aspect-square rounded-sm ${
                          [5, 8, 12, 19, 23].includes(i)
                            ? 'bg-white/40'
                            : 'bg-white/10'
                        }`}
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: i * 0.01 }}
                        viewport={{ once: true }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Secure Payments - Wide Card (2x2) */}
            <motion.div
              variants={itemVariants}
              className="md:col-span-1 md:row-span-2 group"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className={`relative h-full bg-gradient-to-br ${features[2].bgGradient} rounded-3xl p-6 overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300`}>
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl animate-pulse delay-500"></div>
                </div>

                <div className="relative z-10 h-full flex flex-col">
                  <motion.div
                    className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                  >
                    {features[2].icon}
                  </motion.div>
                  <h3 className="text-2xl font-bold text-white mb-3">{features[2].title}</h3>
                  <p className="text-white/90 leading-relaxed mb-6">
                    {features[2].description}
                  </p>

                  {/* Credit card mockup */}
                  <div className="mt-auto">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-10 h-8 bg-yellow-400/80 rounded"></div>
                        <div className="text-white/60 text-xs">•••• 4242</div>
                      </div>
                      <div className="text-white/90 text-sm font-semibold">Secure Payment</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Private Lessons - Wide Card (2x1) */}
            <motion.div
              variants={itemVariants}
              className="md:col-span-2 md:row-span-2 group"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className={`relative h-full bg-gradient-to-br ${features[3].bgGradient} rounded-3xl p-6 overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300`}>
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-white rounded-full blur-3xl animate-pulse delay-700"></div>
                </div>

                <div className="relative z-10 h-full flex items-center gap-6">
                  <motion.div
                    className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
                  >
                    {features[3].icon}
                  </motion.div>

                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-3">{features[3].title}</h3>
                    <p className="text-white/90 leading-relaxed">
                      {features[3].description}
                    </p>
                  </div>

                  {/* User avatars */}
                  <div className="hidden lg:flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white/40"
                        initial={{ x: 20, opacity: 0 }}
                        whileInView={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.4, delay: i * 0.1 }}
                        viewport={{ once: true }}
                      >
                        <div className="w-8 h-8 bg-white/50 rounded-full"></div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Mobile Carousel - Visible only on mobile */}
          <div className="md:hidden mb-20">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={prevFeature}
                className="flex-shrink-0 p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Previous feature"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex-1 overflow-hidden" ref={featuresCarouselRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                <div className={`relative bg-gradient-to-br ${features[featuresCarouselIndex].bgGradient} rounded-3xl p-6 overflow-hidden shadow-lg min-h-[280px]`}>
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white rounded-full blur-3xl animate-pulse"></div>
                  </div>

                  <div className="relative z-10">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4">
                      {features[featuresCarouselIndex].icon}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">{features[featuresCarouselIndex].title}</h3>
                    <p className="text-white/90 leading-relaxed">
                      {features[featuresCarouselIndex].description}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={nextFeature}
                className="flex-shrink-0 p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Next feature"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Carousel Indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {features.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setFeaturesCarouselIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === featuresCarouselIndex ? 'bg-rose-600' : 'bg-gray-300'
                  }`}
                  aria-label={`Go to feature ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-gray-50 to-rose-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                Learn from the Best
              </h2>
              <div className="space-y-4 text-lg text-gray-700">
                <p>
                  With over a decade of professional experience, including performances with the world-renowned 
                  <span className="font-semibold text-rose-700"> Radio City Rockettes</span>, Courtney brings 
                  unparalleled expertise to every lesson.
                </p>
                <p>
                  Her precision-based approach focuses on technique, artistry, and personal growth, ensuring 
                  each dancer reaches their full potential while developing confidence and grace.
                </p>
                <p>
                  Whether you're a beginner discovering your passion or an advanced dancer refining your skills, 
                  you'll receive personalized instruction tailored to your goals.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-rose-200">
                  <span className="text-sm font-medium text-gray-700">Radio City Rockettes</span>
                </div>
                <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-rose-200">
                  <span className="text-sm font-medium text-gray-700">Professional Performer</span>
                </div>
                <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-rose-200">
                  <span className="text-sm font-medium text-gray-700">Precision Technique</span>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="relative">
                <div className="aspect-[3/4] bg-gradient-to-br from-rose-200 to-mauve-200 rounded-2xl shadow-2xl overflow-hidden relative">
                  <AnimatePresence initial={false}>
                    <motion.img
                      key={imageIndex}
                      src={learnFromTheBestImages[imageIndex]}
                      alt="Courtney - Professional Dancer and Instructor"
                      className="w-full h-full object-cover absolute inset-0"
                      style={{
                        willChange: 'transform, opacity',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'translate3d(0, 0, 0)',
                        WebkitTransform: 'translate3d(0, 0, 0)'
                      }}
                      variants={imageVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      loading="eager"
                    />
                  </AnimatePresence>
                </div>
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-rose-400 rounded-full mix-blend-multiply filter blur-2xl opacity-30"></div>
                <div className="absolute -top-6 -left-6 w-32 h-32 bg-mauve-400 rounded-full mix-blend-multiply filter blur-2xl opacity-30"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="studio-inquiry" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Studio Partnership Inquiry
            </h2>
            <p className="text-xl text-gray-600">
              Interested in bringing our expertise to your studio? Let's connect.
            </p>
          </div>

          <Card padding="lg">
            {submitSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">Thank You!</h3>
                <p className="text-gray-600 mb-6">
                  We've received your inquiry and will be in touch shortly.
                </p>
                <Button onClick={() => setSubmitSuccess(false)}>
                  Submit Another Inquiry
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="Studio Name"
                  name="studio_name"
                  type="text"
                  required
                  value={formData.studio_name}
                  onChange={handleInputChange}
                  placeholder="Your CPF Dance"
                />

                <Input
                  label="Contact Name"
                  name="contact_name"
                  type="text"
                  required
                  value={formData.contact_name}
                  onChange={handleInputChange}
                  placeholder="John Smith"
                />

                <div className="grid sm:grid-cols-2 gap-6">
                  <Input
                    label="Email"
                    name="contact_email"
                    type="email"
                    required
                    value={formData.contact_email}
                    onChange={handleInputChange}
                    placeholder="contact@studio.com"
                  />

                  <Input
                    label="Phone"
                    name="contact_phone"
                    type="tel"
                    required
                    value={formData.contact_phone}
                    onChange={handleInputChange}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <Textarea
                  label="Message"
                  name="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Tell us about your studio and how we can work together..."
                />

                {submitError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700">{submitError}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? 'Submitting...' : 'Send Inquiry'}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </section>

      <StudioCarousel />

      <footer className="bg-mauve-700 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" >
          <div className="space-y-4 mb-8">
            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <h4 className="text-xl font-semibold text-white mb-4">Quick Links</h4>
                <ul className="space-y-2">
                  <li>
                    <Link href="/login" className="text-white hover:text-rose-400 transition-colors">
                      Login
                    </Link>
                  </li>
                  <li>
                    <Link href="/signup" className="text-white hover:text-rose-400 transition-colors">
                      Sign Up
                    </Link>
                  </li>
                  <li>
                    <button onClick={scrollToInquiry} className="text-white hover:text-rose-400 transition-colors">
                      Studio Inquiry
                    </button>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-xl font-semibold text-white mb-4">Contact</h4>
                <ul className="space-y-2 text-white">
                  <li>Email: info@cpfdance.com</li>
                  <li>
                    <a 
                      href="https://instagram.com/courtneyfiledance" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-white hover:text-rose-400 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.322a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/>
                      </svg>
                      @courtneyfiledance
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-8 text-center text-white">
            <p>&copy; {new Date().getFullYear()} <a href="https://reminiscent.io" target="_blank" rel="noopener noreferrer" className="hover:text-rose-400 transition-colors">Reminiscent Technologies LLC</a>. All rights reserved.</p>
            <div className="mt-4 text-sm text-gray-400 space-x-4">
              <Link href="/terms-of-service" className="hover:text-rose-400 transition-colors">
                Terms of Service
              </Link>
              <span>•</span>
              <Link href="/privacy-policy" className="hover:text-rose-400 transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
