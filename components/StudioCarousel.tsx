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
                className="flex-shrink-0 flex items-center justify-center group"
                style={{
                  width: '200px',
                  height: '120px'
                }}
              >
                <div className="relative w-full h-full p-4 flex items-center justify-center">
                  {studio.image && (
                    <>
                      <img
                        src={studio.image}
                        alt={studio.name}
                        className="max-w-full max-h-full object-contain"
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
