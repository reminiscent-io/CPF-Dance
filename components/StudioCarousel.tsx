'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface StudioLogo {
  name: string
  image: string
}

export default function StudioCarousel() {
  const [studios, setStudios] = useState<StudioLogo[]>([])
  const [loading, setLoading] = useState(true)

  const studioMappings = [
    { display: 'Broadway Dance Center', filename: 'Broadway Dance Center Logo.png' },
    { display: 'Broadway Dance Academy', filename: 'Broadway Dance Academy Logo.png' },
    { display: 'Exactitude', filename: 'Exactitude Dance Logo.png' },
    { display: 'Chorus Line Dance Studio', filename: 'Chorus Line Dance Studio Logo.png' }
  ]

  useEffect(() => {
    const fetchLogos = async () => {
      try {
        const supabase = createClient()
        const studiosWithLogos: StudioLogo[] = []

        for (const mapping of studioMappings) {
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
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Studios I&apos;ve Worked With
          </h2>
          <p className="text-lg text-gray-600">
            Trusted by leading dance studios in the NYC area
          </p>
        </div>

        <div className="relative overflow-hidden">
          <div className="flex gap-8 animate-scroll">
            {extendedStudios.map((studio, index) => (
              <div
                key={index}
                className="flex-shrink-0 flex items-center justify-center"
                style={{
                  width: '200px',
                  height: '120px'
                }}
              >
                <div className="relative w-full h-full bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 flex items-center justify-center">
                  {studio.image && (
                    <img
                      src={studio.image}
                      alt={studio.name}
                      className="max-w-full max-h-full object-contain"
                    />
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

        .animate-scroll {
          animation: scroll 30s linear infinite;
        }

        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  )
}
