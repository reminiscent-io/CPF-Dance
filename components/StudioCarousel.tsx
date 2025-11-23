'use client'

import Image from 'next/image'

interface StudioLogo {
  name: string
  image: string
}

export default function StudioCarousel() {
  const studios: StudioLogo[] = [
    {
      name: 'Broadway Dance Center',
      image: '/images/studio-logos/broadway-dance-center.jpg'
    },
    {
      name: 'Broadway Dance Academy',
      image: '/images/studio-logos/broadway-dance-academy.jpg'
    },
    {
      name: 'Exactitude',
      image: '/images/studio-logos/exactitude.jpg'
    },
    {
      name: 'Chorus Line in Smithtown',
      image: '/images/studio-logos/chorus-line-smithtown.jpg'
    }
  ]

  // Double the array for seamless loop
  const extendedStudios = [...studios, ...studios]

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Studios I&apos;ve Worked With
          </h2>
          <p className="text-lg text-gray-600">
            Trusted by leading dance studios across the region
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
                  <img
                    src={studio.image}
                    alt={studio.name}
                    className="max-w-full max-h-full object-contain"
                  />
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
