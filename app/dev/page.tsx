'use client'

import { useRouter } from 'next/navigation'
import { setMockUserRole } from '@/lib/auth/mock-profiles'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'

export default function DevPage() {
  const router = useRouter()

  const selectRole = (role: string, path: string) => {
    setMockUserRole(role)
    router.push(path)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-mauve-50 p-4">
      <Card className="max-w-2xl w-full" padding="lg">
        <CardTitle className="text-center mb-2">Development Mode</CardTitle>
        <p className="text-center text-gray-600 mb-8">
          Select a user profile to test the portals
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div onClick={() => selectRole('dancer', '/dancer')} className="cursor-pointer">
            <Card className="text-center hover:shadow-lg transition-shadow h-full">
              <CardContent>
                <div className="text-4xl mb-3">💃</div>
                <h3 className="font-semibold text-lg mb-4">Dancer</h3>
                <Button variant="outline" size="sm" className="w-full">
                  Access Portal
                </Button>
              </CardContent>
            </Card>
          </div>

          <div onClick={() => selectRole('instructor', '/instructor')} className="cursor-pointer">
            <Card className="text-center hover:shadow-lg transition-shadow h-full">
              <CardContent>
                <div className="text-4xl mb-3">👩‍🏫</div>
                <h3 className="font-semibold text-lg mb-4">Instructor</h3>
                <Button variant="outline" size="sm" className="w-full">
                  Access Portal
                </Button>
              </CardContent>
            </Card>
          </div>

          <div onClick={() => selectRole('studio', '/studio')} className="cursor-pointer">
            <Card className="text-center hover:shadow-lg transition-shadow h-full">
              <CardContent>
                <div className="text-4xl mb-3">🏢</div>
                <h3 className="font-semibold text-lg mb-4">Studio</h3>
                <Button variant="outline" size="sm" className="w-full">
                  Access Portal
                </Button>
              </CardContent>
            </Card>
          </div>

          <div onClick={() => selectRole('admin', '/instructor')} className="cursor-pointer">
            <Card className="text-center hover:shadow-lg transition-shadow h-full border-2 border-rose-300">
              <CardContent>
                <div className="text-4xl mb-3">👑</div>
                <h3 className="font-semibold text-lg mb-4">Admin</h3>
                <Button variant="outline" size="sm" className="w-full">
                  Access Portal
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This is a development page for testing. Authentication is disabled. 
            Click any profile above to access that portal without logging in.
          </p>
        </div>
      </Card>
    </div>
  )
}
