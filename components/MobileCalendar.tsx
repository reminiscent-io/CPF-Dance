'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

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
}

interface MobileCalendarProps {
  events: CalendarEvent[]
  currentDate: Date
  onEventClick?: (event: CalendarEvent) => void
  onMonthChange?: (date: Date) => void
}

export function MobileCalendar({ 
  events, 
  currentDate,
  onEventClick, 
  onMonthChange 
}: MobileCalendarProps) {
  const getInitialSelectedDate = () => {
    const today = new Date()
    if (currentDate.getFullYear() === today.getFullYear() && 
        currentDate.getMonth() === today.getMonth()) {
      return today
    }
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  }

  const [selectedDate, setSelectedDate] = useState<Date>(getInitialSelectedDate)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isUserSelectionRef = useRef<boolean>(false)

  useEffect(() => {
    if (isUserSelectionRef.current) {
      isUserSelectionRef.current = false
      return
    }
    
    const currentMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`
    const selectedMonthKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}`
    
    if (currentMonthKey !== selectedMonthKey) {
      const today = new Date()
      const todayMonthKey = `${today.getFullYear()}-${today.getMonth()}`
      
      if (currentMonthKey === todayMonthKey) {
        setSelectedDate(today)
      } else {
        setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1))
      }
    }
  }, [currentDate])

  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    
    if (isLeftSwipe) {
      navigateNext()
    } else if (isRightSwipe) {
      navigatePrevious()
    }
  }

  const navigatePrevious = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() - 1)
    onMonthChange?.(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + 1)
    onMonthChange?.(newDate)
  }

  const navigateToday = () => {
    const today = new Date()
    setSelectedDate(today)
    onMonthChange?.(today)
  }

  const getStartOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getEventsForDate = useCallback((date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time)
      return eventDate.toDateString() === date.toDateString()
    })
  }, [events])

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString()
  }

  const isSameMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
    
    if (date.getMonth() !== currentDate.getMonth() || 
        date.getFullYear() !== currentDate.getFullYear()) {
      isUserSelectionRef.current = true
      onMonthChange?.(date)
    }
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
        return 'bg-purple-500'
      case 'group':
        return 'bg-blue-500'
      case 'workshop':
        return 'bg-green-500'
      case 'master_class':
        return 'bg-amber-500'
      default:
        return 'bg-rose-500'
    }
  }

  const getClassTypeStyles = (type: string) => {
    switch (type) {
      case 'private':
        return 'bg-purple-50 border-l-4 border-purple-500'
      case 'group':
        return 'bg-blue-50 border-l-4 border-blue-500'
      case 'workshop':
        return 'bg-green-50 border-l-4 border-green-500'
      case 'master_class':
        return 'bg-amber-50 border-l-4 border-amber-500'
      default:
        return 'bg-rose-50 border-l-4 border-rose-500'
    }
  }

  const getClassTypeLabel = (type: string) => {
    switch (type) {
      case 'private':
        return 'Private'
      case 'group':
        return 'Group'
      case 'workshop':
        return 'Workshop'
      case 'master_class':
        return 'Master'
      default:
        return type
    }
  }

  const renderCalendarGrid = () => {
    const startOfMonth = getStartOfMonth(currentDate)
    const daysInMonth = getDaysInMonth(currentDate)
    const startDay = startOfMonth.getDay()

    const days: (Date | null)[] = []

    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    const daysInPrevMonth = getDaysInMonth(prevMonth)
    for (let i = startDay - 1; i >= 0; i--) {
      days.push(new Date(prevMonth.getFullYear(), prevMonth.getMonth(), daysInPrevMonth - i))
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i))
    }

    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i))
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <div 
            key={`header-${index}`} 
            className="text-center text-xs font-medium text-gray-500 py-2"
          >
            {day}
          </div>
        ))}
        
        {days.map((day, index) => {
          if (!day) return <div key={index} className="aspect-square" />
          
          const dayEvents = getEventsForDate(day)
          const hasEvents = dayEvents.length > 0
          const today = isToday(day)
          const selected = isSelected(day)
          const inCurrentMonth = isSameMonth(day)
          
          const uniqueTypes = [...new Set(dayEvents.map(e => e.class_type))]
          
          return (
            <button
              key={index}
              onClick={() => handleDayClick(day)}
              className={`
                aspect-square flex flex-col items-center justify-center rounded-full relative
                transition-all duration-150 min-h-[44px]
                ${selected 
                  ? 'bg-rose-600 text-white' 
                  : today 
                    ? 'bg-rose-100 text-rose-600' 
                    : inCurrentMonth 
                      ? 'text-gray-900 hover:bg-gray-100' 
                      : 'text-gray-400'
                }
              `}
            >
              <span className={`text-sm font-medium ${selected ? 'text-white' : ''}`}>
                {day.getDate()}
              </span>
              
              {hasEvents && (
                <div className="flex gap-0.5 mt-0.5 absolute bottom-1">
                  {uniqueTypes.slice(0, 3).map((type, i) => (
                    <div 
                      key={i} 
                      className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-white' : getClassTypeColor(type)}`} 
                    />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  const selectedDayEvents = getEventsForDate(selectedDate)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  const formatSelectedDateHeader = () => {
    if (isToday(selectedDate)) {
      return 'Today'
    }
    return selectedDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div 
        ref={containerRef}
        className="flex-shrink-0 bg-white"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex items-center justify-between px-2 py-3">
          <button
            onClick={navigatePrevious}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={navigateToday}
              className="text-sm text-rose-600 hover:text-rose-700 font-medium px-2 py-1 hover:bg-rose-50 rounded transition-colors"
            >
              Today
            </button>
          </div>
          
          <button
            onClick={navigateNext}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Next month"
          >
            <ChevronRightIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="px-2 pb-3">
          {renderCalendarGrid()}
        </div>
      </div>

      <div className="border-t border-gray-200" />

      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="sticky top-0 bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {formatSelectedDateHeader()}
          </h3>
        </div>

        {selectedDayEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-center">No classes scheduled</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {selectedDayEvents.map(event => (
              <button
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors ${getClassTypeStyles(event.class_type)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-16 pt-0.5">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatTime(event.start_time)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(event.end_time)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900 truncate" style={{ fontFamily: 'var(--font-family-display)' }}>
                        {event.title}
                      </h4>
                      {event.is_cancelled && (
                        <span className="flex-shrink-0 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                          Cancelled
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 truncate mt-0.5">
                      {event.studios?.name || event.location || 'Location TBA'}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                        {getClassTypeLabel(event.class_type)}
                      </span>
                      {event.enrolled_count !== undefined && (
                        <span className="text-xs text-gray-500">
                          {event.enrolled_count}{event.max_capacity ? `/${event.max_capacity}` : ''} enrolled
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <ChevronRightIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
