'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'

interface PaymentData {
  id: string
  amount: number
  payment_method: string
  payment_status: string
  transaction_date: string
  notes: string | null
  student_name: string
  class_title: string | null
  confirmed_by_instructor_at: string | null
  confirmed_by_studio_at: string | null
}

export default function StudioPaymentsPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [payments, setPayments] = useState<PaymentData[]>([])
  const [loadingPayments, setLoadingPayments] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    student_id: '',
    amount: '',
    payment_method: 'cash',
    notes: ''
  })

  useEffect(() => {
    if (!loading && profile && profile.role !== 'studio' && profile.role !== 'admin') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'dancer'}`)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile) {
      fetchPayments()
    }
  }, [loading, user, profile])

  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/studio/payments')
      if (response.ok) {
        const data = await response.json()
        setPayments(data.payments)
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoadingPayments(false)
    }
  }

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch('/api/studio/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        }),
      })

      if (response.ok) {
        setShowModal(false)
        setFormData({
          student_id: '',
          amount: '',
          payment_method: 'cash',
          notes: ''
        })
        fetchPayments()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to submit payment')
      }
    } catch (error) {
      console.error('Error submitting payment:', error)
      alert('An error occurred while submitting payment')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile || profile.role !== 'studio' && profile.role !== 'admin') {
    return null
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'success' | 'warning' | 'danger' | 'secondary'> = {
      confirmed: 'success',
      pending: 'warning',
      disputed: 'danger',
      cancelled: 'secondary'
    }
    return colors[status] || 'secondary'
  }

  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)
  const confirmedPayments = payments.filter(p => p.payment_status === 'confirmed').length
  const pendingPayments = payments.filter(p => p.payment_status === 'pending').length

  return (
    <PortalLayout profile={profile}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payments</h1>
          <p className="text-gray-600">Submit and track cash/check payments</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          Submit Payment
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-rose-600">
                ${totalPayments.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-2">Total Payments</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {confirmedPayments}
              </p>
              <p className="text-sm text-gray-600 mt-2">Confirmed</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">
                {pendingPayments}
              </p>
              <p className="text-sm text-gray-600 mt-2">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loadingPayments ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : payments.length > 0 ? (
        <Card>
          <CardTitle>Payment History</CardTitle>
          <CardContent className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Student</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Class</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Method</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(payment.transaction_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {payment.student_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {payment.class_title || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        ${payment.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                        {payment.payment_method}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={getStatusColor(payment.payment_status)} size="sm">
                          {payment.payment_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {payment.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">💳</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Payments Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Submit cash or check payments to track them here.
            </p>
            <Button onClick={() => setShowModal(true)}>
              Submit First Payment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Submit Payment Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Submit Payment">
        <form onSubmit={handleSubmitPayment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student ID
            </label>
            <Input
              type="text"
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
              required
              placeholder="Enter student ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            >
              <option value="cash">Cash</option>
              <option value="check">Check</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              placeholder="Add any notes about this payment..."
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Payment'}
            </Button>
          </div>
        </form>
      </Modal>
    </PortalLayout>
  )
}
