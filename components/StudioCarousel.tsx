'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface StudioLogo {
  name: string
  image: string
}

export default function StudioCarousel() {
  const [studios, setStudios] = useState<StudioLogo[]>([])
  const [loading, setLoading] = useState(true)
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const scrollLeftRef = useRef(0)
  const velocityRef = useRef(0)
  const lastXRef = useRef(0)
  const lastTimeRef = useRef(0)
  const momentumRef = useRef<number | null>(null)

  useEffect(() => {
    const fetchLogos = async () => {
      try {
        const supabase = createClient()
        const studiosWithLogos: StudioLogo[] = []

        const { data: files, error: listError } = await supabase.storage
          .from('studio logos')
          .list()

        if (listError) {
          console.warn('Could not list bucket (RLS may restrict this), falling back to manual mappings:', listError)
          const fallbackMappings = [
            { display: 'Broadway Dance Center', filename: 'Broadway Dance Center Logo.png' },
            { display: 'Broadway Dance Academy', filename: 'Broadway Dance Academy Logo.png' },
            { display: 'Exactitude', filename: 'Exactitude Dance Logo.png' },
            { display: 'Chorus Line Dance Studio', filename: 'Chorus Line Dance Studio Logo.png' }
          ]

          for (const mapping of fallbackMappings) {
            try {
              const { data: { publicUrl } } = supabase.storage
                .from('studio logos')
                .getPublicUrl(mapping.filename)

              if (publicUrl) {
                studiosWithLogos.push({
                  name: mapping.display,
                  image: publicUrl
                })
              }
            } catch (error) {
              console.error(`Error generating URL for ${mapping.display}:`, error)
            }
          }
        } else if (files && files.length > 0) {
          for (const file of files) {
            if (file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) {
              try {
                const { data: { publicUrl } } = supabase.storage
                  .from('studio logos')
                  .getPublicUrl(file.name)

                if (publicUrl) {
                  const displayName = file.name.replace(/\.(png|jpg|jpeg)$/i, '').replace(/ Logo$/i, '')
                  studiosWithLogos.push({
                    name: displayName,
                    image: publicUrl
                  })
                }
              } catch (error) {
                console.error(`Error generating URL for ${file.name}:`, error)
              }
            }
          }
        }

        setStudios(studiosWithLogos)
      } catch (error) {
        console.error('Error fetching studio logos:', error)
        setStudios([])
      } finally {
        setLoading(false)
      }
    }

    fetchLogos()
  }, [])

  const autoScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container || isDraggingRef.current) {
      animationRef.current = requestAnimationFrame(autoScroll)
      return
    }

    container.scrollLeft += 0.5
    
    const halfWidth = container.scrollWidth / 2
    if (container.scrollLeft >= halfWidth) {
      container.scrollLeft = 0
    }

    animationRef.current = requestAnimationFrame(autoScroll)
  }, [])

  useEffect(() => {
    if (studios.length > 0) {
      animationRef.current = requestAnimationFrame(autoScroll)
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (momentumRef.current) {
        cancelAnimationFrame(momentumRef.current)
      }
    }
  }, [studios, autoScroll])

  const handlePointerDown = (e: React.PointerEvent) => {
    const container = scrollContainerRef.current
    if (!container) return

    isDraggingRef.current = true
    startXRef.current = e.clientX
    scrollLeftRef.current = container.scrollLeft
    lastXRef.current = e.clientX
    lastTimeRef.current = Date.now()
    velocityRef.current = 0

    if (momentumRef.current) {
      cancelAnimationFrame(momentumRef.current)
      momentumRef.current = null
    }

    container.setPointerCapture(e.pointerId)
    container.style.cursor = 'grabbing'
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    
    const container = scrollContainerRef.current
    if (!container) return

    const currentTime = Date.now()
    const deltaTime = currentTime - lastTimeRef.current
    const deltaX = e.clientX - lastXRef.current

    if (deltaTime > 0) {
      velocityRef.current = deltaX / deltaTime
    }

    lastXRef.current = e.clientX
    lastTimeRef.current = currentTime

    const dx = e.clientX - startXRef.current
    container.scrollLeft = scrollLeftRef.current - dx

    const halfWidth = container.scrollWidth / 2
    if (container.scrollLeft >= halfWidth) {
      container.scrollLeft -= halfWidth
      scrollLeftRef.current -= halfWidth
    } else if (container.scrollLeft < 0) {
      container.scrollLeft += halfWidth
      scrollLeftRef.current += halfWidth
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return

    const container = scrollContainerRef.current
    if (!container) return

    isDraggingRef.current = false
    container.releasePointerCapture(e.pointerId)
    container.style.cursor = 'grab'

    const velocity = velocityRef.current * 15

    if (Math.abs(velocity) > 0.5) {
      const applyMomentum = () => {
        if (!container) return
        
        velocityRef.current *= 0.95
        container.scrollLeft -= velocityRef.current * 15

        const halfWidth = container.scrollWidth / 2
        if (container.scrollLeft >= halfWidth) {
          container.scrollLeft -= halfWidth
        } else if (container.scrollLeft < 0) {
          container.scrollLeft += halfWidth
        }

        if (Math.abs(velocityRef.current) > 0.01) {
          momentumRef.current = requestAnimationFrame(applyMomentum)
        } else {
          momentumRef.current = null
        }
      }
      
      momentumRef.current = requestAnimationFrame(applyMomentum)
    }
  }

  const studiosWithImages = studios.filter(studio => studio.image)
  const extendedStudios = [...studiosWithImages, ...studiosWithImages]

  if (loading) {
    return null
  }

  if (studiosWithImages.length === 0) {
    return null
  }

  return (
    <section className="py-6 sm:py-8 bg-white border-t border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-4 sm:mb-6">
          <h3 className="text-sm sm:text-base font-semibold tracking-widest text-rose-600 uppercase">
            Trusted by Top Studios & Programs
          </h3>
        </div>

        <div 
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-hide touch-pan-x select-none"
          style={{ 
            cursor: 'grab',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="flex gap-8 w-max">
            {extendedStudios.map((studio, index) => (
              <div
                key={index}
                className="flex-shrink-0 flex items-center justify-center group"
                style={{
                  width: '140px',
                  height: '70px'
                }}
              >
                <div className="relative w-full h-full p-2 flex items-center justify-center pointer-events-none">
                  {studio.image && (
                    <>
                      <img
                        src={studio.image}
                        alt={studio.name}
                        className="max-w-full max-h-full object-contain rounded-lg"
                        draggable={false}
                      />
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-3 py-2 rounded text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                        {studio.name}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}
