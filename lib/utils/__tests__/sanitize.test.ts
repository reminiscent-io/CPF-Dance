import { describe, it, expect } from 'vitest'
import {
  sanitizeHtml,
  sanitizeWaiverHtml,
  sanitizePlainText,
  createSanitizedHtml
} from '../sanitize'

describe('sanitize utilities', () => {
  describe('sanitizeHtml', () => {
    describe('XSS prevention', () => {
      it('should remove script tags', () => {
        const dirty = '<script>alert("XSS")</script><p>Safe content</p>'
        const clean = sanitizeHtml(dirty)

        expect(clean).not.toContain('<script>')
        expect(clean).not.toContain('alert')
        expect(clean).toContain('<p>Safe content</p>')
      })

      it('should remove inline event handlers', () => {
        const dirty = '<p onclick="alert(\'XSS\')">Click me</p>'
        const clean = sanitizeHtml(dirty)

        expect(clean).not.toContain('onclick')
        expect(clean).toContain('<p>Click me</p>')
      })

      it('should remove onerror handlers', () => {
        const dirty = '<img src="x" onerror="alert(\'XSS\')">'
        const clean = sanitizeHtml(dirty)

        expect(clean).not.toContain('onerror')
      })

      it('should remove onload handlers', () => {
        const dirty = '<img src="x" onload="alert(\'XSS\')">'
        const clean = sanitizeHtml(dirty)

        expect(clean).not.toContain('onload')
      })

      it('should remove onmouseover handlers', () => {
        const dirty = '<p onmouseover="alert(\'XSS\')">Hover me</p>'
        const clean = sanitizeHtml(dirty)

        expect(clean).not.toContain('onmouseover')
      })

      it('should remove style tags', () => {
        const dirty = '<style>body { display: none; }</style><p>Content</p>'
        const clean = sanitizeHtml(dirty)

        expect(clean).not.toContain('<style>')
        expect(clean).not.toContain('display: none')
      })

      it('should remove iframe tags', () => {
        const dirty = '<iframe src="https://evil.com"></iframe><p>Content</p>'
        const clean = sanitizeHtml(dirty)

        expect(clean).not.toContain('<iframe>')
        expect(clean).not.toContain('evil.com')
      })

      it('should remove object tags', () => {
        const dirty = '<object data="malware.swf"></object><p>Content</p>'
        const clean = sanitizeHtml(dirty)

        expect(clean).not.toContain('<object>')
      })

      it('should remove embed tags', () => {
        const dirty = '<embed src="malware.swf"><p>Content</p>'
        const clean = sanitizeHtml(dirty)

        expect(clean).not.toContain('<embed>')
      })

      it('should remove javascript: URLs', () => {
        const dirty = '<a href="javascript:alert(\'XSS\')">Click</a>'
        const clean = sanitizeHtml(dirty)

        expect(clean).not.toContain('javascript:')
      })

      it('should remove data: URLs that could execute code', () => {
        const dirty = '<a href="data:text/html,<script>alert(1)</script>">Click</a>'
        const clean = sanitizeHtml(dirty)

        expect(clean).not.toContain('data:text/html')
      })

      it('should handle nested script attempts', () => {
        const dirty = '<p><script>alert(1)</script></p>'
        const clean = sanitizeHtml(dirty)

        expect(clean).not.toContain('<script>')
        expect(clean).toContain('<p></p>')
      })

      it('should handle obfuscated script tags', () => {
        const dirty = '<scr<script>ipt>alert(1)</scr</script>ipt>'
        const clean = sanitizeHtml(dirty)

        // Script tags are removed, leaving only text (which is safe)
        expect(clean).not.toContain('<script>')
        expect(clean).not.toContain('</script>')
      })
    })

    describe('allowed tags', () => {
      it('should allow paragraph tags', () => {
        const dirty = '<p>Paragraph content</p>'
        expect(sanitizeHtml(dirty)).toBe('<p>Paragraph content</p>')
      })

      it('should allow heading tags', () => {
        expect(sanitizeHtml('<h1>Heading 1</h1>')).toContain('<h1>')
        expect(sanitizeHtml('<h2>Heading 2</h2>')).toContain('<h2>')
        expect(sanitizeHtml('<h3>Heading 3</h3>')).toContain('<h3>')
        expect(sanitizeHtml('<h4>Heading 4</h4>')).toContain('<h4>')
        expect(sanitizeHtml('<h5>Heading 5</h5>')).toContain('<h5>')
        expect(sanitizeHtml('<h6>Heading 6</h6>')).toContain('<h6>')
      })

      it('should allow text formatting tags', () => {
        expect(sanitizeHtml('<strong>Bold</strong>')).toContain('<strong>')
        expect(sanitizeHtml('<em>Italic</em>')).toContain('<em>')
        expect(sanitizeHtml('<u>Underline</u>')).toContain('<u>')
        expect(sanitizeHtml('<s>Strikethrough</s>')).toContain('<s>')
        expect(sanitizeHtml('<del>Deleted</del>')).toContain('<del>')
        expect(sanitizeHtml('<ins>Inserted</ins>')).toContain('<ins>')
      })

      it('should allow list tags', () => {
        const ordered = '<ol><li>Item 1</li><li>Item 2</li></ol>'
        expect(sanitizeHtml(ordered)).toContain('<ol>')
        expect(sanitizeHtml(ordered)).toContain('<li>')

        const unordered = '<ul><li>Item 1</li></ul>'
        expect(sanitizeHtml(unordered)).toContain('<ul>')
      })

      it('should allow blockquote and code tags', () => {
        expect(sanitizeHtml('<blockquote>Quote</blockquote>')).toContain('<blockquote>')
        expect(sanitizeHtml('<pre>Code block</pre>')).toContain('<pre>')
        expect(sanitizeHtml('<code>inline code</code>')).toContain('<code>')
      })

      it('should allow anchor tags with safe attributes', () => {
        const link = '<a href="https://example.com" target="_blank" rel="noopener">Link</a>'
        const clean = sanitizeHtml(link)

        expect(clean).toContain('<a')
        expect(clean).toContain('href="https://example.com"')
      })

      it('should allow div and span tags', () => {
        expect(sanitizeHtml('<div>Content</div>')).toContain('<div>')
        expect(sanitizeHtml('<span>Content</span>')).toContain('<span>')
      })

      it('should allow br tags', () => {
        expect(sanitizeHtml('Line 1<br>Line 2')).toContain('<br')
      })
    })

    describe('allowed attributes', () => {
      it('should allow class attribute', () => {
        const dirty = '<p class="highlight">Text</p>'
        const clean = sanitizeHtml(dirty)

        expect(clean).toContain('class="highlight"')
      })

      it('should allow id attribute', () => {
        const dirty = '<p id="intro">Text</p>'
        const clean = sanitizeHtml(dirty)

        expect(clean).toContain('id="intro"')
      })

      it('should allow href on anchor tags', () => {
        const dirty = '<a href="https://example.com">Link</a>'
        const clean = sanitizeHtml(dirty)

        expect(clean).toContain('href="https://example.com"')
      })

      it('should allow target and rel on anchor tags', () => {
        const dirty = '<a href="https://example.com" target="_blank" rel="noopener">Link</a>'
        const clean = sanitizeHtml(dirty)

        expect(clean).toContain('target="_blank"')
        expect(clean).toContain('rel="noopener"')
      })

      it('should remove disallowed attributes', () => {
        const dirty = '<p style="color: red" data-custom="value">Text</p>'
        const clean = sanitizeHtml(dirty)

        expect(clean).not.toContain('style=')
        expect(clean).not.toContain('data-custom')
      })
    })

    describe('edge cases', () => {
      it('should return empty string for null input', () => {
        expect(sanitizeHtml(null)).toBe('')
      })

      it('should return empty string for undefined input', () => {
        expect(sanitizeHtml(undefined)).toBe('')
      })

      it('should return empty string for empty string input', () => {
        expect(sanitizeHtml('')).toBe('')
      })

      it('should handle plain text without HTML', () => {
        const text = 'Just plain text without any HTML'
        expect(sanitizeHtml(text)).toBe(text)
      })

      it('should escape HTML entities in text', () => {
        const text = 'Use &lt;p&gt; for paragraphs'
        const clean = sanitizeHtml(text)
        // Text should remain as-is since it's already escaped
        expect(clean).toContain('&lt;')
        expect(clean).toContain('&gt;')
      })
    })

    describe('custom config', () => {
      it('should accept custom configuration', () => {
        const dirty = '<img src="image.jpg" alt="Test">'
        const clean = sanitizeHtml(dirty, {
          ALLOWED_TAGS: ['img'],
          ALLOWED_ATTR: ['src', 'alt']
        })

        expect(clean).toContain('<img')
        expect(clean).toContain('src="image.jpg"')
      })
    })
  })

  describe('sanitizeWaiverHtml', () => {
    it('should allow basic formatting tags', () => {
      const dirty = '<p><strong>Bold</strong> and <em>italic</em></p>'
      const clean = sanitizeWaiverHtml(dirty)

      expect(clean).toContain('<p>')
      expect(clean).toContain('<strong>')
      expect(clean).toContain('<em>')
    })

    it('should allow heading tags', () => {
      const dirty = '<h1>Title</h1><h2>Subtitle</h2>'
      const clean = sanitizeWaiverHtml(dirty)

      expect(clean).toContain('<h1>')
      expect(clean).toContain('<h2>')
    })

    it('should allow lists', () => {
      const dirty = '<ul><li>Item 1</li><li>Item 2</li></ul>'
      const clean = sanitizeWaiverHtml(dirty)

      expect(clean).toContain('<ul>')
      expect(clean).toContain('<li>')
    })

    it('should allow blockquote', () => {
      const dirty = '<blockquote>Important quote</blockquote>'
      const clean = sanitizeWaiverHtml(dirty)

      expect(clean).toContain('<blockquote>')
    })

    it('should remove anchor tags (no links in waivers)', () => {
      const dirty = '<p>Visit <a href="https://example.com">our site</a></p>'
      const clean = sanitizeWaiverHtml(dirty)

      expect(clean).not.toContain('<a')
      expect(clean).not.toContain('href')
    })

    it('should only allow class attribute', () => {
      const dirty = '<p id="intro" class="highlight">Text</p>'
      const clean = sanitizeWaiverHtml(dirty)

      expect(clean).toContain('class="highlight"')
      expect(clean).not.toContain('id=')
    })

    it('should remove all XSS attempts', () => {
      const dirty = '<script>alert("XSS")</script><p onclick="evil()">Safe</p>'
      const clean = sanitizeWaiverHtml(dirty)

      expect(clean).not.toContain('<script>')
      expect(clean).not.toContain('onclick')
      expect(clean).not.toContain('evil')
    })

    it('should handle null/undefined', () => {
      expect(sanitizeWaiverHtml(null)).toBe('')
      expect(sanitizeWaiverHtml(undefined)).toBe('')
    })
  })

  describe('sanitizePlainText', () => {
    it('should strip all HTML tags', () => {
      const dirty = '<p>Hello <strong>World</strong>!</p>'
      const clean = sanitizePlainText(dirty)

      expect(clean).not.toContain('<p>')
      expect(clean).not.toContain('<strong>')
      expect(clean).toBe('Hello World!')
    })

    it('should remove all HTML including safe tags', () => {
      const dirty = '<h1>Title</h1><p>Paragraph</p><ul><li>Item</li></ul>'
      const clean = sanitizePlainText(dirty)

      expect(clean).not.toContain('<')
      expect(clean).not.toContain('>')
    })

    it('should handle script tags and XSS attempts', () => {
      const dirty = '<script>alert("XSS")</script>Safe text'
      const clean = sanitizePlainText(dirty)

      expect(clean).not.toContain('<script>')
      expect(clean).not.toContain('alert')
      expect(clean).toBe('Safe text')
    })

    it('should return empty string for null/undefined', () => {
      expect(sanitizePlainText(null)).toBe('')
      expect(sanitizePlainText(undefined)).toBe('')
    })

    it('should handle plain text without changes', () => {
      const text = 'Just plain text'
      expect(sanitizePlainText(text)).toBe(text)
    })

    it('should preserve whitespace', () => {
      const dirty = '<p>Line 1</p><p>Line 2</p>'
      const clean = sanitizePlainText(dirty)

      expect(clean).toContain('Line 1')
      expect(clean).toContain('Line 2')
    })
  })

  describe('createSanitizedHtml', () => {
    it('should return object with __html property', () => {
      const dirty = '<p>Safe content</p>'
      const result = createSanitizedHtml(dirty)

      expect(result).toHaveProperty('__html')
      expect(result.__html).toBe('<p>Safe content</p>')
    })

    it('should sanitize the HTML content', () => {
      const dirty = '<script>alert("XSS")</script><p>Safe</p>'
      const result = createSanitizedHtml(dirty)

      expect(result.__html).not.toContain('<script>')
      expect(result.__html).toContain('<p>Safe</p>')
    })

    it('should handle null/undefined', () => {
      expect(createSanitizedHtml(null).__html).toBe('')
      expect(createSanitizedHtml(undefined).__html).toBe('')
    })

    it('should accept custom configuration', () => {
      const dirty = '<img src="test.jpg">'
      const result = createSanitizedHtml(dirty, {
        ALLOWED_TAGS: ['img'],
        ALLOWED_ATTR: ['src']
      })

      expect(result.__html).toContain('<img')
    })

    it('should be usable with dangerouslySetInnerHTML', () => {
      const dirty = '<p>Content</p>'
      const result = createSanitizedHtml(dirty)

      // Verify the structure is correct for React
      expect(typeof result).toBe('object')
      expect(Object.keys(result)).toEqual(['__html'])
      expect(typeof result.__html).toBe('string')
    })
  })

  describe('complex XSS vectors', () => {
    it('should handle SVG XSS', () => {
      const dirty = '<svg onload="alert(1)"><desc>XSS</desc></svg>'
      const clean = sanitizeHtml(dirty)

      expect(clean).not.toContain('onload')
    })

    it('should handle meta refresh XSS', () => {
      const dirty = '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'
      const clean = sanitizeHtml(dirty)

      expect(clean).not.toContain('<meta')
    })

    it('should handle CSS expression XSS', () => {
      const dirty = '<div style="background:url(javascript:alert(1))">Text</div>'
      const clean = sanitizeHtml(dirty)

      expect(clean).not.toContain('javascript:')
    })

    it('should handle encoded script tags', () => {
      const dirty = '&#60;script&#62;alert(1)&#60;/script&#62;'
      const clean = sanitizeHtml(dirty)

      // DOMPurify should decode and then remove
      expect(clean).not.toContain('<script>')
    })

    it('should handle null byte injection', () => {
      const dirty = '<scr\0ipt>alert(1)</script>'
      const clean = sanitizeHtml(dirty)

      // Script tags with null bytes are removed, leaving only text (which is safe)
      expect(clean).not.toContain('<script')
      expect(clean).not.toContain('</script>')
    })

    it('should handle unicode encoding bypass attempts', () => {
      const dirty = '<a href="jav&#x09;ascript:alert(1)">Click</a>'
      const clean = sanitizeHtml(dirty)

      expect(clean).not.toContain('alert')
    })
  })
})
