'use client'

import { useState, useRef, useEffect } from 'react'

interface GooglePlacesInputProps {
  label?: string
  value: string
  onChange: (value: string, details?: PlaceDetails) => void
  placeholder?: string
  error?: string
  helperText?: string
  onPlaceSelect?: (details: PlaceDetails) => void
}

export interface PlaceDetails {
  address: string
  city: string
  state: string
  zip_code: string
}

export function GooglePlacesInput({
  label,
  value,
  onChange,
  placeholder = 'Search for an address...',
  error,
  helperText,
  onPlaceSelect
}: GooglePlacesInputProps) {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customAddress, setCustomAddress] = useState('')
  const [customCity, setCustomCity] = useState('')
  const [customState, setCustomState] = useState('')
  const [customZip, setCustomZip] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch suggestions from Google Places API
  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })

      if (!response.ok) throw new Error('Failed to fetch suggestions')
      const data = await response.json()
      setSuggestions(data.predictions || [])
      setIsOpen(true)
    } catch (error) {
      console.error('Error fetching places:', error)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  // Get place details
  const selectPlace = async (placeId: string) => {
    try {
      const response = await fetch('/api/places/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId })
      })

      if (!response.ok) throw new Error('Failed to fetch place details')
      const { details } = await response.json()
      
      const fullAddress = `${details.address}${details.address2 ? ', ' + details.address2 : ''}`
      onChange(fullAddress, {
        address: details.address,
        city: details.city,
        state: details.state,
        zip_code: details.zip_code
      })
      
      if (onPlaceSelect) {
        onPlaceSelect({
          address: details.address,
          city: details.city,
          state: details.state,
          zip_code: details.zip_code
        })
      }
      
      setIsOpen(false)
      setSuggestions([])
    } catch (error) {
      console.error('Error selecting place:', error)
    }
  }

  // Handle custom address submission
  const handleCustomSubmit = () => {
    const fullAddress = `${customAddress}${customCity ? ', ' + customCity : ''}${customState ? ', ' + customState : ''}${customZip ? ' ' + customZip : ''}`
    onChange(fullAddress, {
      address: customAddress,
      city: customCity,
      state: customState,
      zip_code: customZip
    })
    setShowCustomInput(false)
    setCustomAddress('')
    setCustomCity('')
    setCustomState('')
    setCustomZip('')
    setIsOpen(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label
          htmlFor="google-places-input"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      
      {!showCustomInput ? (
        <div className="relative">
          <input
            ref={inputRef}
            id="google-places-input"
            type="text"
            value={value}
            onChange={(e) => {
              onChange(e.target.value)
              fetchSuggestions(e.target.value)
            }}
            onFocus={() => value && setSuggestions([]) || setIsOpen(true)}
            placeholder={placeholder}
            className={`
              w-full px-4 py-2 border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent
              transition-all duration-200
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
            `}
            aria-invalid={error ? 'true' : 'false'}
            autoComplete="off"
          />

          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-rose-500 border-t-transparent rounded-full"></div>
            </div>
          )}

          {/* Suggestions Dropdown */}
          {isOpen && (suggestions.length > 0 || !value) && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => selectPlace(suggestion.place_id)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0 transition-colors"
                  type="button"
                >
                  <div className="font-medium text-gray-900 text-sm">{suggestion.main_text}</div>
                  <div className="text-gray-600 text-xs">{suggestion.secondary_text}</div>
                </button>
              ))}
              
              {/* Custom Import Option */}
              <button
                onClick={() => {
                  setShowCustomInput(true)
                  setIsOpen(false)
                }}
                className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 text-rose-600 font-medium text-sm transition-colors border-t border-gray-200"
                type="button"
              >
                + Enter Address Manually
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Custom Address Input Form */
        <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <input
            type="text"
            placeholder="Street Address"
            value={customAddress}
            onChange={(e) => setCustomAddress(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="City"
              value={customCity}
              onChange={(e) => setCustomCity(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <input
              type="text"
              placeholder="State"
              value={customState}
              onChange={(e) => setCustomState(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <input
              type="text"
              placeholder="Zip"
              value={customZip}
              onChange={(e) => setCustomZip(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCustomSubmit}
              className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-medium transition-colors"
              type="button"
            >
              Save Address
            </button>
            <button
              onClick={() => {
                setShowCustomInput(false)
                setCustomAddress('')
                setCustomCity('')
                setCustomState('')
                setCustomZip('')
                setIsOpen(true)
              }}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
              type="button"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {error && (
        <p id="google-places-error" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id="google-places-helper" className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  )
}
