/**
 * HTML Sanitization Utility
 *
 * Provides secure HTML sanitization using DOMPurify to prevent XSS attacks.
 * Works in both browser and server environments.
 */

import DOMPurify from 'dompurify'

/**
 * Allowed HTML tags for rich text content (notes, waivers, etc.)
 */
const DEFAULT_ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'del', 'ins',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'span', 'div'
]

/**
 * Allowed HTML attributes
 */
const DEFAULT_ALLOWED_ATTR = [
  'class', 'id', 'href', 'target', 'rel'
]

/**
 * Sanitization configuration for rich text content
 */
const DEFAULT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: DEFAULT_ALLOWED_TAGS,
  ALLOWED_ATTR: DEFAULT_ALLOWED_ATTR,
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  SAFE_FOR_TEMPLATES: true,
  // Prevent DOM clobbering attacks
  SANITIZE_DOM: true,
  // Remove all scripts and event handlers
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
}

/**
 * Sanitizes HTML content to prevent XSS attacks
 *
 * @param dirty - The potentially unsafe HTML string
 * @param config - Optional DOMPurify configuration (merges with defaults)
 * @returns Sanitized HTML string safe for rendering
 *
 * @example
 * ```tsx
 * const userContent = '<script>alert("XSS")</script><p>Safe content</p>'
 * const safeContent = sanitizeHtml(userContent)
 * // Returns: '<p>Safe content</p>'
 * ```
 */
export function sanitizeHtml(
  dirty: string | null | undefined,
  config?: DOMPurify.Config
): string {
  // Handle null/undefined
  if (!dirty) return ''

  // Merge custom config with defaults
  const finalConfig = config ? { ...DEFAULT_CONFIG, ...config } : DEFAULT_CONFIG

  // Server-side: DOMPurify needs a window object
  if (typeof window === 'undefined') {
    // Use jsdom for server-side sanitization
    const { JSDOM } = require('jsdom')
    const window = new JSDOM('').window
    const DOMPurifyServer = DOMPurify(window as unknown as Window)
    return DOMPurifyServer.sanitize(dirty, finalConfig)
  }

  // Client-side sanitization
  return DOMPurify.sanitize(dirty, finalConfig)
}

/**
 * Sanitizes HTML for waiver content (more restrictive)
 * Removes links and only allows basic formatting
 */
export function sanitizeWaiverHtml(dirty: string | null | undefined): string {
  return sanitizeHtml(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote'
    ],
    ALLOWED_ATTR: ['class'], // No links in waivers
  })
}

/**
 * Sanitizes plain text (strips all HTML)
 * Use for displaying user input that should never contain HTML
 */
export function sanitizePlainText(dirty: string | null | undefined): string {
  if (!dirty) return ''

  return sanitizeHtml(dirty, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
  })
}

/**
 * Type-safe sanitization for React components
 * Returns an object ready for dangerouslySetInnerHTML
 */
export function createSanitizedHtml(
  dirty: string | null | undefined,
  config?: DOMPurify.Config
): { __html: string } {
  return {
    __html: sanitizeHtml(dirty, config)
  }
}
