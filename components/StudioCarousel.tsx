'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface StudioLogo {
  name: string
  image: string
}

export default function StudioCarousel() {
  const [studios, setStudios] = useState<StudioLogo[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

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

        if (studiosWithLogos.length === 0) {
          console.warn('StudioCarousel: No studios with logos found')
        }

        setStudios(studiosWithLogos)
        setError(null)
      } catch (err) {
        console.error('Error fetching studio logos:', err)
        setError(err instanceof Error ? err.message : 'Failed to load studio logos')
        setStudios([])
      } finally {
        setLoading(false)
      }
    }

    fetchLogos()
  }, [mounted])

  const studiosWithImages = studios.filter(studio => studio.image)
  // Triple the logos for seamless infinite scroll
  const extendedStudios = [...studiosWithImages, ...studiosWithImages, ...studiosWithImages]

  if (!mounted || loading) {
    return null
  }

  if (error) {
    console.error('StudioCarousel error:', error)
    return null
  }

  if (studiosWithImages.length === 0) {
    return null
  }

  // Calculate animation duration based on number of logos (slower = smoother)
  const animationDuration = studiosWithImages.length * 5

  return (
    <section className="py-6 sm:py-8 bg-white border-t border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-4 sm:mb-6">
          <h3 className="text-sm sm:text-base font-semibold tracking-widest text-rose-600 uppercase">
            Trusted by Top Studios & Programs
          </h3>
        </div>

        <div
          className="overflow-hidden select-none"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          <div
            className="flex gap-8 w-max"
            style={{
              animation: `scroll ${animationDuration}s linear infinite`,
              animationPlayState: isPaused ? 'paused' : 'running'
            }}
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
                <div className="relative w-full h-full p-2 flex items-center justify-center">
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
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
      `}</style>
    </section>
  )
}
