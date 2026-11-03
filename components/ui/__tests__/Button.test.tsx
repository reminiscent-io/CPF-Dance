import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/tests/utils'
import { Button } from '@/components/ui/Button'

describe('Button loading', () => {
  it('shows a spinner, marks itself busy and blocks clicks', async () => {
    const onClick = vi.fn()
    const { user } = render(
      <Button loading onClick={onClick}>
        Saving...
      </Button>
    )

    const button = screen.getByRole('button', { name: 'Saving...' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button.querySelector('.animate-spin')).not.toBeNull()
    // Busy, not faded: the disabled styling would read as broken.
    expect(button.className).not.toContain('disabled:opacity-50')

    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders as before when not loading', () => {
    render(<Button disabled>Save</Button>)

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    expect(button).not.toHaveAttribute('aria-busy')
    expect(button.querySelector('.animate-spin')).toBeNull()
    expect(button.className).toContain('disabled:opacity-50')
  })
})
