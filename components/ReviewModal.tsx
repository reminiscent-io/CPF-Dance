'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { StarIcon } from '@heroicons/react/24/solid'
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline'

interface Instructor {
  id: string
  full_name: string
}

interface ExistingReview {
  id: string
  instructor_id: string
  rating: number
  content: string | null
  show_name: boolean
}

interface ReviewModalProps {
  isOpen: boolean
  onClose: () => void
  onReviewSubmitted?: () => void
}

export default function ReviewModal({ isOpen, onClose, onReviewSubmitted }: ReviewModalProps) {
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [existingReviews, setExistingReviews] = useState<ExistingReview[]>([])
  const [selectedInstructorId, setSelectedInstructorId] = useState('')
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [content, setContent] = useState('')
  const [showName, setShowName] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchData()
      setSuccess(false)
      setError('')
    }
  }, [isOpen])

  // When instructor changes, populate existing review if one exists
  useEffect(() => {
    if (selectedInstructorId) {
      const existing = existingReviews.find(r => r.instructor_id === selectedInstructorId)
      if (existing) {
        setRating(existing.rating)
        setContent(existing.content || '')
        setShowName(existing.show_name ?? false)
      } else {
        setRating(0)
        setContent('')
        setShowName(false)
      }
    }
  }, [selectedInstructorId, existingReviews])

  const fetchData = async () => {
    setLoadingData(true)
    try {
      const [instructorsRes, reviewsRes] = await Promise.all([
        fetch('/api/dancer/instructors'),
        fetch('/api/dancer/reviews'),
      ])

      if (instructorsRes.ok) {
        const data = await instructorsRes.json()
        const list = data.instructors || []
        setInstructors(list)
        if (list.length === 1) {
          setSelectedInstructorId(list[0].id)
        }
      }

      if (reviewsRes.ok) {
        const data = await reviewsRes.json()
        setExistingReviews(data.data || [])
      }
    } catch {
      console.error('Error loading review data')
    } finally {
      setLoadingData(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedInstructorId) {
      setError('Please select an instructor.')
      return
    }
    if (rating === 0) {
      setError('Please select a rating.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/dancer/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructor_id: selectedInstructorId,
          rating,
          content,
          show_name: showName,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit review')
      }

      setSuccess(true)
      onReviewSubmitted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedInstructorId('')
    setRating(0)
    setHoveredRating(0)
    setContent('')
    setShowName(false)
    setError('')
    setSuccess(false)
    onClose()
  }

  const existingReview = existingReviews.find(r => r.instructor_id === selectedInstructorId)

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Leave a Review">
      {loadingData ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : success ? (
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Thank you for your review!</h3>
          <p className="text-sm text-gray-600">Your feedback helps improve the dance experience.</p>
          <Button onClick={handleClose}>Done</Button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Encouraging message */}
          <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
            <p className="text-sm text-gray-700">
              Your review is incredibly helpful! Honest feedback from dancers like you helps your instructor grow her business and reach new students. It only takes a moment and makes a big difference.
            </p>
          </div>

          {/* Instructor selection */}
          {instructors.length > 1 ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
              <select
                value={selectedInstructorId}
                onChange={(e) => setSelectedInstructorId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-sm"
              >
                <option value="">Select an instructor</option>
                {instructors.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.full_name}</option>
                ))}
              </select>
            </div>
          ) : instructors.length === 1 ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
              <p className="text-base font-medium text-gray-900">{instructors[0].full_name}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No instructors found.</p>
          )}

          {existingReview && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                You previously left a {existingReview.rating}-star review. Submitting will update it.
              </p>
            </div>
          )}

          {/* Star rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= (hoveredRating || rating)
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                  >
                    {filled ? (
                      <StarIcon className="w-8 h-8 text-amber-400" />
                    ) : (
                      <StarOutlineIcon className="w-8 h-8 text-gray-300" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Written review */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Review <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your experience..."
              rows={4}
              maxLength={1000}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-sm resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{content.length}/1000</p>
          </div>

          {/* Name opt-in */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showName}
              onChange={(e) => setShowName(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
            />
            <span className="text-sm text-gray-600">
              Display my first name and last initial with this review.
              <span className="text-gray-400"> Otherwise your review will be kept anonymous.</span>
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !selectedInstructorId || rating === 0}>
              {submitting ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
