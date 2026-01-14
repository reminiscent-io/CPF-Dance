'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  class_type: string
  location?: string
  is_cancelled: boolean
  enrolled_count?: number
  max_capacity?: number
  cancellation_reason?: string
  studios?: {
    name: string
    address: string
  }
  instructor?: {
    full_name: string
    email: string
  }
}

interface CalendarProps {
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onDateChange?: (date: Date) => void
}

type ViewMode = 'month' | 'week'

export function Calendar({ events, onEventClick, onDateChange }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('week')

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate)
    onDateChange?.(newDate)
  }

  const navigatePrevious = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setDate(newDate.getDate() - 7)
    }
    handleDateChange(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else {
      newDate.setDate(newDate.getDate() + 7)
    }
    handleDateChange(newDate)
  }

  const navigateToday = () => {
    handleDateChange(new Date())
  }

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const formatWeekRange = (date: Date) => {
    const startOfWeek = getStartOfWeek(date)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(endOfWeek.getDate() + 6)

    return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay() // 0 = Sunday, 1 = Monday, etc.
    // Subtract days to get to Sunday - this works across month boundaries
    d.setDate(d.getDate() - day)
    d.setHours(0, 0, 0, 0)
    return d
  }

  const getStartOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time)
      return eventDate.toDateString() === date.toDateString()
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getClassTypeColor = (type: string) => {
    switch (type) {
      case 'private':
        return 'purple'
      case 'group':
        return 'blue'
      case 'workshop':
        return 'green'
      case 'master_class':
        return 'amber'
      case 'personal':
        return 'rose'
      default:
        return 'gray'
    }
  }

  const getClassTypeStyles = (type: string) => {
    switch (type) {
      case 'private':
        return 'bg-purple-100 border border-purple-300 text-purple-900'
      case 'group':
        return 'bg-blue-100 border border-blue-300 text-blue-900'
      case 'workshop':
        return 'bg-green-100 border border-green-300 text-green-900'
      case 'master_class':
        return 'bg-amber-100 border border-amber-300 text-amber-900'
      case 'personal':
        return 'bg-rose-100 border border-rose-300 text-rose-900'
      default:
        return 'bg-gray-100 border border-gray-300 text-gray-900'
    }
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const renderWeekView = () => {
    const startOfWeek = getStartOfWeek(currentDate)
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek)
      date.setDate(date.getDate() + i)
      return date
    })

    const hours = Array.from({ length: 13 }, (_, i) => i + 7) // 7 AM to 7 PM (reduced hours)

    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="grid grid-cols-8 border-b border-gray-200 flex-shrink-0">
          <div className="p-1.5 sm:p-2 border-r border-gray-200 bg-gray-50"></div>
          {days.map((day, index) => (
            <div
              key={index}
              className={`p-1 sm:p-2 text-center border-r border-gray-200 ${
                isToday(day) ? 'bg-rose-50' : 'bg-gray-50'
              }`}
            >
              <div className="text-[10px] sm:text-xs text-gray-600">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div
                className={`text-sm sm:text-lg font-semibold ${
                  isToday(day) ? 'text-rose-600' : 'text-gray-900'
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Time grid - flex-1 to fill remaining space */}
        <div className="grid grid-cols-8 flex-1 min-h-0">
          {/* Time column */}
          <div className="border-r border-gray-200 flex flex-col">
            {hours.map(hour => (
              <div
                key={hour}
                className="flex-1 border-b border-gray-200 p-0.5 sm:p-1 text-[10px] sm:text-xs text-gray-500 text-right pr-1 sm:pr-2 flex items-start"
              >
                {hour % 12 || 12} {hour < 12 ? 'AM' : 'PM'}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIndex) => (
            <div key={dayIndex} className="border-r border-gray-200 flex flex-col">
              {hours.map(hour => {
                const dayEvents = getEventsForDate(day).filter(event => {
                  const eventHour = new Date(event.start_time).getHours()
                  return eventHour === hour
                })

                return (
                  <div
                    key={hour}
                    className="flex-1 border-b border-gray-200 p-0.5 sm:p-1 relative min-h-[32px] sm:min-h-[40px]"
                  >
                    {dayEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={() => onEventClick?.(event)}
                        className={`absolute inset-0.5 sm:inset-1 rounded p-0.5 sm:p-1 cursor-pointer hover:shadow-md transition-shadow text-[10px] sm:text-xs overflow-hidden ${
                          event.is_cancelled
                            ? 'bg-gray-200 opacity-50 border border-gray-300'
                            : getClassTypeStyles(event.class_type)
                        }`}
                      >
                        <div className="font-semibold truncate">
                          {event.title}
                        </div>
                        <div className="truncate hidden sm:block opacity-75">
                          {formatTime(event.start_time)}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderMonthView = () => {
    const startOfMonth = getStartOfMonth(currentDate)
    const daysInMonth = getDaysInMonth(currentDate)
    const startDay = startOfMonth.getDay()

    const days = []

    // Add empty cells for days before the month starts
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }

    // Add all days in the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i))
    }

    // Calculate number of rows needed
    const numRows = Math.ceil(days.length / 7)

    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="grid grid-cols-7 border-b border-gray-200 flex-shrink-0">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              className="p-1 sm:p-2 text-center text-xs sm:text-sm font-semibold text-gray-700 bg-gray-50 border-r border-gray-200"
            >
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.charAt(0)}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid - dynamically sized rows */}
        <div className={`grid grid-cols-7 flex-1 min-h-0`} style={{ gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))` }}>
          {days.map((day, index) => {
            if (!day) {
              return <div key={index} className="border-r border-b border-gray-200 bg-gray-50"></div>
            }

            const dayEvents = getEventsForDate(day)
            const maxEventsToShow = 2 // Reduced for better fit

            return (
              <div
                key={index}
                className={`border-r border-b border-gray-200 p-1 sm:p-2 flex flex-col overflow-hidden ${
                  isToday(day) ? 'bg-rose-50' : ''
                }`}
              >
                <div
                  className={`text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1 flex-shrink-0 ${
                    isToday(day) ? 'text-rose-600' : 'text-gray-700'
                  }`}
                >
                  {day.getDate()}
                </div>
                <div className="space-y-0.5 sm:space-y-1 flex-1 overflow-hidden">
                  {dayEvents.slice(0, maxEventsToShow).map(event => (
                    <div
                      key={event.id}
                      onClick={() => onEventClick?.(event)}
                      className={`text-[10px] sm:text-xs p-0.5 sm:p-1 rounded cursor-pointer hover:shadow-md transition-shadow ${
                        event.is_cancelled
                          ? 'bg-gray-200 opacity-50 border border-gray-300'
                          : getClassTypeStyles(event.class_type)
                      }`}
                    >
                      <div className="font-semibold truncate leading-tight">
                        {formatTime(event.start_time)}
                      </div>
                      <div className="truncate leading-tight hidden sm:block">{event.title}</div>
                    </div>
                  ))}
                  {dayEvents.length > maxEventsToShow && (
                    <div className="text-[10px] sm:text-xs text-gray-500 pl-0.5 sm:pl-1">
                      +{dayEvents.length - maxEventsToShow}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-4 border-b border-gray-200 gap-2 sm:gap-0 flex-shrink-0">
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
            {viewMode === 'month' ? formatMonthYear(currentDate) : formatWeekRange(currentDate)}
          </h2>
          <Button variant="outline" size="sm" onClick={navigateToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'week' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              Week
            </Button>
            <Button
              variant={viewMode === 'month' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              Month
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={navigatePrevious}>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Button>
            <Button variant="outline" size="sm" onClick={navigateNext}>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar View - fills remaining space */}
      {viewMode === 'week' ? renderWeekView() : renderMonthView()}
    </div>
  )
}
