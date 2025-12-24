'use client'

import Image from 'next/image'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface StudioLogo {
  name: string
  image: string
}

export default function StudioCarousel() {
  const [studios, setStudios] = useState<StudioLogo[]>([])
  const [loading, setLoading] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [startX, setStartX] = useState(0)
  const [currentX, setCurrentX] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchLogos = async () => {
      try {
        const supabase = createClient()
        const studiosWithLogos: StudioLogo[] = []

        // Try to list all files from the bucket
        const { data: files, error: listError } = await supabase.storage
          .from('studio logos')
          .list()

        if (listError) {
          console.warn('Could not list bucket (RLS may restrict this), falling back to manual mappings:', listError)
          // Fallback to manual mappings if list() is restricted
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
                console.log(`Generated URL for ${mapping.display}: ${publicUrl}`)
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
          // Successfully listed files, process each one
          for (const file of files) {
            if (file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) {
              try {
                const { data: { publicUrl } } = supabase.storage
                  .from('studio logos')
                  .getPublicUrl(file.name)

                if (publicUrl) {
                  // Create display name by removing file extension
                  const displayName = file.name.replace(/\.(png|jpg|jpeg)$/i, '')
                  console.log(`Generated URL for ${displayName}: ${publicUrl}`)
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

        console.log('Studios with logos:', studiosWithLogos)
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

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartX(e.clientX - dragOffset)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const x = e.clientX - startX
    setCurrentX(x)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragOffset(currentX)
    setCurrentX(0)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setStartX(e.touches[0].clientX - dragOffset)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const x = e.touches[0].clientX - startX
    setCurrentX(x)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    setDragOffset(currentX)
    setCurrentX(0)
  }

  // Double the array for seamless loop
  const studiosWithImages = studios.filter(studio => studio.image)
  const extendedStudios = [...studiosWithImages, ...studiosWithImages]

  // Show nothing while loading, or show placeholder if no images found
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
          <h3 className="text-xs sm:text-sm font-semibold tracking-widest text-gray-500 uppercase">
            Trusted by Top Studios & Programs
          </h3>
        </div>

        <div className="relative overflow-hidden cursor-grab active:cursor-grabbing">
          <div
            ref={carouselRef}
            className="flex gap-8"
            style={{
              transform: `translateX(calc(-50% + ${dragOffset + currentX}px))`,
              animation: isDragging ? 'none' : 'scroll 12s linear infinite',
              transition: isDragging ? 'none' : 'transform 0.3s ease-out',
              userSelect: 'none'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {extendedStudios.map((studio, index) => (
              <div
                key={index}
                className="flex-shrink-0 flex items-center justify-center group"
                style={{
                  width: '140px',
                  height: '70px'
                }}
              >
                <div className="relative w-full h-full p-4 flex items-center justify-center">
                  {studio.image && (
                    <>
                      <img
                        src={studio.image}
                        alt={studio.name}
                        className="max-w-full max-h-full object-contain rounded-lg"
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
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  )
}
