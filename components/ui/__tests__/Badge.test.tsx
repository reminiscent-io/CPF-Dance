import { describe, it, expect } from 'vitest'
import { render, screen } from '@/tests/utils'
import { Badge } from '@/components/ui/Badge'

describe('test harness', () => {
  it('renders a component and queries it', () => {
    render(<Badge className="bg-champagne-100">Private Lesson</Badge>)
    expect(screen.getByText('Private Lesson')).toBeInTheDocument()
  })
})
