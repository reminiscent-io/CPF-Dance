import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'
import { passShareCents } from '@/lib/class-series'
import { centsToDollars, dollarsToCents } from '@/lib/utils/money'

interface ClassEarning {
  id: string
  title: string
  class_type: string
  start_time: string
  end_time: string
  pricing_model: string
  base_cost: number | null
  cost_per_person: number | null
  cost_per_hour: number | null
  tiered_base_students: number | null
  tiered_additional_cost: number | null
  price: number | null
  enrollment_count: number
  calculated_value: number
  collected_amount: number
  studio?: {
    id: string
    name: string
  } | null
}

function calculateClassValue(classData: any, enrollmentCount: number): number {
  const { 
    pricing_model, 
    base_cost, 
    cost_per_person, 
    cost_per_hour, 
    tiered_base_students, 
    tiered_additional_cost,
    price,
    start_time,
    end_time
  } = classData

  switch (pricing_model) {
    case 'per_person':
      return (cost_per_person || price || 0) * enrollmentCount

    case 'per_class':
      return base_cost || price || 0

    case 'per_hour':
      if (cost_per_hour && start_time && end_time) {
        const start = new Date(start_time)
        const end = new Date(end_time)
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        return cost_per_hour * hours
      }
      return 0

    case 'tiered':
      const baseStudents = tiered_base_students || 1
      const baseCost = base_cost || 0
      const additionalCost = tiered_additional_cost || 0
      const extraStudents = Math.max(0, enrollmentCount - baseStudents)
      return baseCost + (extraStudents * additionalCost)

    default:
      return (cost_per_person || price || 0) * enrollmentCount
  }
}

export async function GET(request: NextRequest) {
  try {
    const profile = await requireInstructor()
    const supabase = await createClient()

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const classType = searchParams.get('class_type')

    let classQuery = supabase
      .from('classes')
      .select(`
        id,
        title,
        class_type,
        start_time,
        end_time,
        pricing_model,
        base_cost,
        cost_per_person,
        cost_per_hour,
        tiered_base_students,
        tiered_additional_cost,
        price,
        series_id,
        workshop_price,
        instructor_id,
        is_cancelled,
        studio:studios!classes_studio_id_fkey(id, name)
      `)
      .eq('is_cancelled', false)
      .order('start_time', { ascending: false })

    if (profile.role !== 'admin') {
      classQuery = classQuery.eq('instructor_id', profile.id)
    }

    if (startDate) {
      classQuery = classQuery.gte('start_time', startDate)
    }

    if (endDate) {
      classQuery = classQuery.lte('start_time', endDate)
    }

    if (classType && classType !== 'all') {
      classQuery = classQuery.eq('class_type', classType)
    }

    const { data: classes, error: classError } = await classQuery

    if (classError) {
      console.error('Error fetching classes:', classError)
      return NextResponse.json({ error: 'Failed to fetch class earnings' }, { status: 500 })
    }

    const { data: enrollments, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('class_id, id, workshop_pass')

    if (enrollmentError) {
      console.error('Error fetching enrollments:', enrollmentError)
      return NextResponse.json({ error: 'Failed to fetch class earnings' }, { status: 500 })
    }

    const enrollmentCounts = new Map<string, number>()
    const passCounts = new Map<string, number>()
    enrollments?.forEach(e => {
      const count = enrollmentCounts.get(e.class_id) || 0
      enrollmentCounts.set(e.class_id, count + 1)
      if (e.workshop_pass) passCounts.set(e.class_id, (passCounts.get(e.class_id) || 0) + 1)
    })

    // A full-workshop pass is paid once, so each day earns an even share of it
    // rather than the single-day price. Shares are spread over the days that
    // actually run, including days outside the requested date range.
    const passSeriesIds = [...new Set((classes || [])
      .filter(cls => cls.series_id && cls.workshop_price !== null && cls.class_type === 'workshop')
      .map(cls => cls.series_id as string))]
    const runningDays = new Map<string, string[]>() // series_id -> class ids by start time
    if (passSeriesIds.length > 0) {
      const { data: seriesDays, error: seriesError } = await supabase
        .from('classes')
        .select('id, series_id')
        .in('series_id', passSeriesIds)
        .eq('is_cancelled', false)
        .order('start_time', { ascending: true })
      if (seriesError) {
        console.error('Error fetching workshop days:', seriesError)
        return NextResponse.json({ error: 'Failed to fetch class earnings' }, { status: 500 })
      }
      for (const day of seriesDays || []) {
        const list = runningDays.get(day.series_id) ?? []
        list.push(day.id)
        runningDays.set(day.series_id, list)
      }
    }

    let paymentsQuery = supabase
      .from('payments')
      .select(`
        class_id,
        amount,
        payment_status,
        class:classes!payments_class_id_fkey(instructor_id)
      `)
      .eq('payment_status', 'confirmed')

    const { data: payments, error: paymentError } = await paymentsQuery

    if (paymentError) {
      console.error('Error fetching payments:', paymentError)
      return NextResponse.json({ error: 'Failed to fetch class earnings' }, { status: 500 })
    }

    const collectedByClass = new Map<string, number>()
    payments?.forEach(p => {
      if (p.class_id) {
        const classData = p.class as any
        if (profile.role === 'admin' || classData?.instructor_id === profile.id) {
          const current = collectedByClass.get(p.class_id) || 0
          collectedByClass.set(p.class_id, current + (p.amount || 0))
        }
      }
    })

    const classEarnings: ClassEarning[] = (classes || []).map(cls => {
      const enrollmentCount = enrollmentCounts.get(cls.id) || 0
      const passes = passCounts.get(cls.id) || 0
      const days = cls.series_id ? runningDays.get(cls.series_id) : undefined
      let calculatedValue: number
      if (days && passes > 0 && cls.workshop_price !== null && (cls.pricing_model || 'per_person') === 'per_person') {
        const share = passShareCents(dollarsToCents(cls.workshop_price), days.length, days.indexOf(cls.id))
        calculatedValue = calculateClassValue(cls, enrollmentCount - passes) + centsToDollars(share * passes)
      } else {
        calculatedValue = calculateClassValue(cls, enrollmentCount)
      }
      const collectedAmount = collectedByClass.get(cls.id) || 0

      const studioData = cls.studio as any
      const studio = Array.isArray(studioData) ? studioData[0] : studioData

      return {
        id: cls.id,
        title: cls.title,
        class_type: cls.class_type,
        start_time: cls.start_time,
        end_time: cls.end_time,
        pricing_model: cls.pricing_model,
        base_cost: cls.base_cost,
        cost_per_person: cls.cost_per_person,
        cost_per_hour: cls.cost_per_hour,
        tiered_base_students: cls.tiered_base_students,
        tiered_additional_cost: cls.tiered_additional_cost,
        price: cls.price,
        enrollment_count: enrollmentCount,
        calculated_value: calculatedValue,
        collected_amount: collectedAmount,
        studio: studio ? { id: studio.id, name: studio.name } : null
      }
    })

    const summary = {
      total_classes: classEarnings.length,
      total_value: classEarnings.reduce((sum, c) => sum + c.calculated_value, 0),
      total_collected: classEarnings.reduce((sum, c) => sum + c.collected_amount, 0),
      total_outstanding: classEarnings.reduce((sum, c) => sum + Math.max(0, c.calculated_value - c.collected_amount), 0),
      by_class_type: {} as Record<string, { count: number, value: number, collected: number }>
    }

    classEarnings.forEach(c => {
      if (!summary.by_class_type[c.class_type]) {
        summary.by_class_type[c.class_type] = { count: 0, value: 0, collected: 0 }
      }
      summary.by_class_type[c.class_type].count += 1
      summary.by_class_type[c.class_type].value += c.calculated_value
      summary.by_class_type[c.class_type].collected += c.collected_amount
    })

    return NextResponse.json({
      classes: classEarnings,
      summary
    })
  } catch (error) {
    console.error('Error in class earnings API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
