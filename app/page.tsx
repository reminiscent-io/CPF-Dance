'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'
import StudioCarousel from '@/components/StudioCarousel'

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
  const [heroHeight, setHeroHeight] = useState(100)

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setHeroHeight(0)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <main className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav 
        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-br from-rose-50 via-mauve-50 to-cream-50 border-b border-rose-200 shadow-sm"
        style={{
          opacity: heroHeight <= 10 ? 1 : 0,
          transform: heroHeight <= 10 ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out',
          pointerEvents: heroHeight <= 10 ? 'auto' : 'none'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-rose-600 to-mauve-600 bg-clip-text text-transparent">
            Dance Studio
          </Link>
          <div className="flex gap-4">
            <button 
              onClick={() => document.getElementById('portals')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-gray-700 hover:text-rose-600 transition-colors font-medium"
            >
              Portals
            </button>
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
        className="relative flex items-center justify-center bg-gradient-to-br from-rose-50 via-mauve-50 to-cream-50 overflow-hidden"
        style={{
          height: `${heroHeight}vh`,
          transition: 'height 2s ease-in-out'
        }}
      >
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-rose-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-mauve-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 animate-slideDown">
            Professional Precision
            <span className="block bg-gradient-to-r from-rose-600 to-mauve-600 bg-clip-text text-transparent mt-2">
              Dance Instruction
            </span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto animate-slideUp">
            Track progress, manage schedules, and elevate your dance journey with expert guidance
          </p>
        </div>
      </section>

      <section id="portals" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Choose Your Portal
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Access your personalized dashboard based on your role
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <Card hover className="text-center overflow-hidden p-0">
              <div className="relative w-full h-48 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1555656220-46e30749d330?"
                  alt="Dancer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">Dancer Portal</h3>
                <p className="text-gray-600 mb-6">
                  Track your progress, view classes, and manage your dance journey
                </p>
                <Link href="/login?portal=dancer">
                  <Button size="lg" className="w-full">
                    Join or Log In
                  </Button>
                </Link>
              </div>
            </Card>

            <Card hover className="text-center overflow-hidden p-0">
              <div className="relative w-full h-48 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1685339009948-d807094b1457?"
                  alt="Instructor"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">Instructor Portal</h3>
                <p className="text-gray-600 mb-6">
                  Manage students, schedule classes, and track student progress
                </p>
                <Link href="/login?portal=instructor">
                  <Button size="lg" className="w-full">
                    Join or Log In
                  </Button>
                </Link>
              </div>
            </Card>

            <Card hover className="text-center overflow-hidden p-0">
              <div className="relative w-full h-48 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1677603142181-6e49eb1a3c10?"
                  alt="Studio"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">Studio Portal</h3>
                <p className="text-gray-600 mb-6">
                  Oversee operations, manage locations, and coordinate schedules
                </p>
                <Link href="/login?portal=studio">
                  <Button size="lg" className="w-full">
                    Join or Log In
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              A comprehensive platform designed for dancers, instructors, and studios
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card hover className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Progress Tracking</h3>
              <p className="text-gray-600">
                Detailed instructor notes and progress reports to monitor your development
              </p>
            </Card>

            <Card hover className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-mauve-500 to-mauve-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Easy Scheduling</h3>
              <p className="text-gray-600">
                Intuitive calendar system for managing classes and private lessons
              </p>
            </Card>

            <Card hover className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-mauve-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure Payments</h3>
              <p className="text-gray-600">
                Safe and convenient payment processing for lessons and classes
              </p>
            </Card>

            <Card hover className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-mauve-500 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Private Lessons</h3>
              <p className="text-gray-600">
                Request and schedule one-on-one instruction at your convenience
              </p>
            </Card>
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
                  Whether you&apos;re a beginner discovering your passion or an advanced dancer refining your skills, 
                  you&apos;ll receive personalized instruction tailored to your goals.
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
                <div className="aspect-[3/4] bg-gradient-to-br from-rose-200 to-mauve-200 rounded-2xl shadow-2xl overflow-hidden">
                  <img
                    src="/images/courtney-rockettes.png"
                    alt="Courtney - Professional Dancer and Instructor"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-rose-400 rounded-full mix-blend-multiply filter blur-2xl opacity-30"></div>
                <div className="absolute -top-6 -left-6 w-32 h-32 bg-mauve-400 rounded-full mix-blend-multiply filter blur-2xl opacity-30"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <StudioCarousel />

      <section id="studio-inquiry" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Studio Partnership Inquiry
            </h2>
            <p className="text-xl text-gray-600">
              Interested in bringing our expertise to your studio? Let&apos;s connect.
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
                  We&apos;ve received your inquiry and will be in touch shortly.
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
                  placeholder="Your Dance Studio"
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

      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8 mb-8">
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
                  <li>Email: info@dancestudio.com</li>
                  <li>
                    <a 
                      href="https://instagram.com/courtneyfiledance" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-white hover:text-rose-400 transition-colors"
                    >
                      Instagram: @courtneyfiledance
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-8 text-center text-white">
            <p>&copy; {new Date().getFullYear()} Dance Studio Management. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
