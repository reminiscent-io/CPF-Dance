import { describe, it, expect } from 'vitest'

describe('Test Setup Verification', () => {
  it('should run basic assertions', () => {
    expect(1 + 1).toBe(2)
    expect('hello').toContain('ell')
    expect([1, 2, 3]).toHaveLength(3)
  })

  it('should handle async operations', async () => {
    const promise = Promise.resolve('success')
    await expect(promise).resolves.toBe('success')
  })

  it('should have access to DOM matchers from jest-dom', () => {
    const div = document.createElement('div')
    div.textContent = 'Hello World'
    document.body.appendChild(div)

    expect(div).toBeInTheDocument()
    expect(div).toHaveTextContent('Hello World')

    document.body.removeChild(div)
  })

  it('should mock window.matchMedia', () => {
    expect(window.matchMedia).toBeDefined()
    const result = window.matchMedia('(min-width: 768px)')
    expect(result.matches).toBe(false)
  })

  it('should mock ResizeObserver', () => {
    expect(global.ResizeObserver).toBeDefined()
    const observer = new ResizeObserver(() => {})
    expect(observer.observe).toBeDefined()
    expect(observer.disconnect).toBeDefined()
  })
})
