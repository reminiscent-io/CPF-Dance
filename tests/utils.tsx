import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Custom render function that wraps components with necessary providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  // Add any global providers here (e.g., ThemeProvider, AuthProvider)
  return <>{children}</>
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllTheProviders, ...options }),
  }
}

// Re-export everything from testing-library
export * from '@testing-library/react'

// Override render with custom render
export { customRender as render }

// Test data factories
export const createTestDate = (daysFromNow = 0): Date => {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date
}

export const createTestISODate = (daysFromNow = 0): string => {
  return createTestDate(daysFromNow).toISOString()
}

// Wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Create a mock API response
export const createMockResponse = <T,>(data: T, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Create an error response
export const createErrorResponse = (message: string, status = 500) => {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
