# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a dance teaching schedule management platform for professional dance instruction. Built for dance instructors (like former Rockettes) to manage students, track progress, schedule classes, and handle payments. The application supports four user roles: Instructor, Dancer, Guardian, and Admin, each with their own portal and capabilities.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase (PostgreSQL + Auth), Tailwind CSS v4

## Development Commands

```bash
# Development server (runs on port 5000)
npm run dev

# Production build
npm run build

# Start production server (port 5000, not 3000)
npm start

# Linting
npm lint
```

**Important Notes:**
- Both dev and production run on **port 5000** (not 3000)
- Port 5000 maps to external port 80 on Replit
- Dev server binds to `0.0.0.0` for external access

## Database Setup (CRITICAL)

**Before any development work, ensure the database schema is applied:**

1. Open your Supabase project SQL Editor at https://supabase.com
2. Run the entire `supabase-schema.sql` file
3. Apply migrations from `migrations/` directory in order
4. This creates tables, RLS policies, and triggers - essential for security

The schema defines:
- User roles: `instructor`, `dancer`, `guardian`, `admin`
- Core tables: profiles, students, classes, enrollments, notes, payments, studios, waivers, waiver_templates
- Row-level security (RLS) policies for data isolation
- Automatic `updated_at` triggers
- Custom types for enums (user_role, payment_status, note_visibility, class_type, pricing_model)

## Architecture

### Authentication & Authorization

**Multi-layered security approach:**

1. **Middleware Proxy** (`proxy.ts`): Portal-level routing protection
   - **CRITICAL**: Must use `export default async function proxy()` (Next.js 16 requirement)
   - Redirects unauthenticated users to `/login`
   - Enforces role-based portal access (`/instructor`, `/dancer`)
   - Redirects users to their correct portal based on role
   - **Admin role** can access all portals via sidebar switcher
   - Matcher pattern excludes `_next/`, `api/`, and static assets

2. **API Route Guards** (`lib/auth/server-auth.ts`):
   - `requireInstructor()` - Ensures instructor role
   - `requireDancer()` - Ensures dancer role
   - `requireRole(role)` - Generic role checker with **admin override**
   - `getCurrentDancerStudent()` - Gets authenticated dancer's student record
   - `getCurrentUserWithRole()` - Gets current user with profile

   **All API routes must call the appropriate guard function first**

3. **Database RLS Policies** (in `supabase-schema.sql`):
   - Row-level security filters data at the database level
   - Prevents instructors from seeing other instructors' data
   - Isolates dancer data between different dancers
   - Enforces note visibility rules
   - **Admin role** can bypass most restrictions but respects private notes

4. **Waiver Access Control** (`lib/auth/waiver-access.ts`):
   - Helper functions for waiver and template access
   - `canAccessWaiverTemplate()` - Check template access permissions
   - `canAccessWaiver()` - Check waiver access permissions

### Supabase Client Patterns

**Three client types - use the correct one:**

1. **Browser Client** (`lib/supabase/client.ts`):
   - For client components and browser-side operations
   - `createClient()` returns browser-safe client

2. **Server Client** (`lib/supabase/server.ts`):
   - For server components and route handlers
   - `createClient()` handles cookies for SSR
   - Use in API routes and server components

3. **Middleware Client** (`lib/supabase/middleware.ts`):
   - Special handling for middleware session updates
   - `updateSession()` returns user, profile, and response

### Application Structure

```
app/
├── (portal)/              # Route group for authenticated portals
│   ├── instructor/        # Instructor portal (9 pages)
│   │   ├── page.tsx       # Dashboard
│   │   ├── students/      # Student roster & details
│   │   ├── classes/       # Class management
│   │   ├── schedule/      # Calendar view
│   │   ├── studios/       # Studio locations
│   │   ├── notes/         # Progress notes
│   │   ├── payments/      # Payment tracking
│   │   └── waivers/       # Waiver management & templates
│   ├── dancer/            # Dancer portal (10 pages)
│   │   ├── page.tsx       # Dashboard
│   │   ├── available-classes/  # Browse public classes
│   │   ├── classes/       # Enrolled classes
│   │   ├── my-notes/      # Personal journal
│   │   ├── progress/      # Instructor feedback timeline
│   │   ├── request-lesson/# Private lesson requests
│   │   ├── payments/      # Payment history
│   │   ├── profile/       # Profile management
│   │   └── waivers/       # View & sign waivers
│   ├── login/             # Login page
│   └── signup/            # Signup with role selection
├── api/                   # API routes (45+ endpoints)
│   ├── auth/              # Authentication (signup, signin, signout)
│   ├── students/          # Student CRUD operations
│   ├── classes/           # Class management
│   ├── notes/             # Notes management
│   ├── studios/           # Studio locations
│   ├── dashboard/         # Instructor dashboard stats
│   ├── instructors/       # Instructor listing
│   ├── profiles/          # Profile management
│   ├── relationships/     # Instructor-student relationships
│   ├── instructor/        # Instructor-specific routes
│   │   ├── notes/         # Instructor notes
│   │   ├── schedule/      # Schedule view
│   │   ├── payments/      # Payment management
│   │   └── payment-requests/  # Payment requests
│   ├── dancer/            # Dancer-specific endpoints
│   │   ├── classes/       # View enrolled classes
│   │   ├── personal-classes/  # Personal class history
│   │   ├── public-classes/    # Browse available public classes
│   │   ├── enroll/        # Class enrollment
│   │   ├── notes/         # Personal notes
│   │   ├── lesson-requests/   # Private lesson requests
│   │   ├── payments/      # Payment history
│   │   ├── profile/       # Profile management
│   │   └── stats/         # Dashboard statistics
│   ├── waivers/           # Waiver management
│   │   └── [id]/          # Individual waiver operations & signing
│   ├── waiver-templates/  # Waiver template CRUD
│   ├── studio-inquiries/  # Public inquiry form & management
│   └── places/            # Google Places integration
│       ├── search/        # Autocomplete
│       └── details/       # Place details
├── auth/callback/         # OAuth callback handler
├── dev/                   # Development test page
├── privacy-policy/        # Privacy policy page
├── terms-of-service/      # Terms of service page
├── layout.tsx             # Root layout
├── page.tsx               # Public landing page
└── globals.css            # Global styles

lib/
├── auth/
│   ├── server-auth.ts     # Role guards and auth helpers
│   ├── waiver-access.ts   # Waiver access control helpers
│   └── privileges.ts      # Role privilege checking utilities
├── supabase/
│   ├── client.ts          # Browser client
│   ├── server.ts          # Server client
│   └── middleware.ts      # Middleware client
├── types/                 # TypeScript type definitions
│   ├── database.types.ts  # Supabase generated types
│   └── index.ts           # Custom types
└── utils/
    ├── pricing.ts         # Pricing calculation utilities
    └── sanitize.ts        # HTML sanitization (XSS prevention)

components/
├── ui/                    # Reusable UI components
│   ├── Badge.tsx          # Status badges
│   ├── Button.tsx         # Button variants
│   ├── Card.tsx           # Card container
│   ├── GooglePlacesInput.tsx  # Google Places autocomplete
│   ├── Input.tsx          # Form inputs
│   ├── Modal.tsx          # Modal dialogs
│   ├── Spinner.tsx        # Loading spinners
│   ├── Table.tsx          # Data tables
│   └── Toast.tsx          # Notification toasts
├── Calendar.tsx           # Class scheduling calendar
├── CommunicationsSection.tsx  # Communication hub
├── CreateWaiverTemplateDialog.tsx  # Waiver template creator
├── IssueWaiverDialog.tsx  # Waiver issuer
├── Navigation.tsx         # Legacy navigation (replaced by Sidebar)
├── PortalLayout.tsx       # Shared portal layout wrapper
├── RichTextEditor.tsx     # TipTap-based rich text editor
├── Sidebar.tsx            # Unified sidebar with admin portal switcher
├── SignaturePad.tsx       # Digital signature capture
└── StudioCarousel.tsx     # Studio showcase carousel

migrations/                # Database migrations (13 files)
├── 05-add-studio-id-to-inquiries.sql
├── 06-add-response-tracking.sql
├── 07-add-waivers-table.sql
├── 08-add-studio-inquiry-tracking.sql
├── 09-add-waiver-templates.sql
├── 10-update-waiver-access-control.sql
├── 11-add-student-id-to-waivers.sql
├── 12-add-actual-attendance-column.sql
└── 13-add-public-classes-features.sql
```

### Data Model Relationships

**Key relationships:**
- `profiles` (1) → (0..1) `students` via `profile_id` - A dancer's profile links to their student record
- `students` (1) → (N) `notes` - Students can have many notes from instructors or themselves
- `students` (1) → (N) `enrollments` - Students enroll in multiple classes
- `students` (1) → (N) `waivers` - Students can have multiple waivers assigned
- `classes` (1) → (N) `enrollments` - Classes have multiple enrolled students
- `profiles` (1) → (N) `classes` as instructor - Instructors create multiple classes
- `profiles` (1) → (N) `waiver_templates` as creator - Instructors create waiver templates
- `students` (1) → (N) `payments` - Students have payment history
- `students` (1) → (N) `private_lesson_requests` - Students can request private lessons

**Important notes:**
- When a user signs up with `role='dancer'`, a corresponding `students` record is automatically created with `profile_id` linking to their profile
- **Students can exist without linked profiles** - useful for instructors managing non-portal students (direct storage of student info: full_name, email, phone)
- **Admin role** has access to all portals via sidebar switcher (no separate admin portal route)

### API Route Patterns

**Instructor routes** (prefix: `/api/`):
```typescript
// Always require instructor role first
export async function GET(request: NextRequest) {
  await requireInstructor()
  const supabase = await createClient()
  // ... instructor can access all their students, notes, etc.
}
```

**Dancer routes** (prefix: `/api/dancer/`):
```typescript
// Require dancer role AND get their student_id
export async function GET(request: NextRequest) {
  const student = await getCurrentDancerStudent() // includes requireDancer()
  const supabase = await createClient()

  // Filter ALL queries by student.id
  const { data } = await supabase
    .from('notes')
    .select('*')
    .eq('student_id', student.id) // Critical: prevents cross-dancer access
}
```

### Note Visibility System

Notes have a `visibility` field with these options:
- `private` - Only instructor can see
- `shared_with_student` - Dancer can view in their progress timeline
- `shared_with_guardian` - Guardian can view (for dancers under 13)
- `shared_with_studio` - Studio admin can view

When querying notes for dancers, filter by visibility:
```typescript
.in('visibility', ['shared_with_student', 'shared_with_guardian'])
```

### Pricing Models

Classes support four pricing models (defined in `lib/utils/pricing.ts`):

1. **per_person** - Fixed price per student (e.g., $50/student)
2. **per_class** - Fixed price for entire class regardless of attendance
3. **per_hour** - Hourly rate (e.g., $100/hour)
4. **tiered** - Different prices based on enrollment tiers (e.g., 1-5 students: $30, 6-10: $25)

**Utility functions:**
- `calculateClassCost(pricingModel, pricingData, duration, actualAttendance, enrolledStudents)` - Calculate class cost
- `getPricingModelDescription(model, data)` - Human-readable pricing description
- `validatePricingData(model, data)` - Validate pricing configuration

Example tiered pricing data:
```typescript
{
  tiers: [
    { minStudents: 1, maxStudents: 5, pricePerStudent: 30 },
    { minStudents: 6, maxStudents: 10, pricePerStudent: 25 }
  ]
}
```

## Major Features

### 1. Waiver System

Complete digital waiver management with templates and signatures.

**Components:**
- `CreateWaiverTemplateDialog.tsx` - Create waiver templates (rich text or PDF)
- `IssueWaiverDialog.tsx` - Assign waivers to students
- `SignaturePad.tsx` - Digital signature capture using Canvas API
- `RichTextEditor.tsx` - TipTap-based WYSIWYG editor for waiver content

**Database tables:**
- `waiver_templates` - Reusable waiver templates with rich text or PDF storage
- `waivers` - Individual waiver instances assigned to students

**Template variables** (replaced at issuance):
- `{{issue_date}}` - Date waiver was issued
- `{{issuer_name}}` - Name of person issuing waiver
- `{{recipient_name}}` - Name of student/recipient
- `{{signature_date}}` - Date waiver was signed

**Workflow:**
1. Instructor creates waiver template at `/instructor/waivers`
2. Instructor issues waiver to student(s) via IssueWaiverDialog
3. Dancer views waiver at `/dancer/waivers`
4. Dancer signs waiver at `/dancer/waivers/[id]/sign` using SignaturePad
5. Signature stored as base64 PNG data URL

**Access control:**
- Uses `lib/auth/waiver-access.ts` helper functions
- RLS policies enforce waiver visibility
- Admin can view all waivers (except private notes context)

### 2. Admin Role & Portal Switching

**Admin role** (`admin`) has special privileges:

- Access to both portals (Instructor and Dancer) via sidebar switcher dropdown
- Bypass most RLS restrictions (respects private notes)
- Can view all data across instructors and dancers
- No separate admin portal route - uses existing portals

**Implementation:**
- Sidebar component has portal switcher dropdown for admin users
- `requireRole()` function checks for admin override
- RLS policies have `OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')` clauses

### 3. Public Classes

Classes can be marked as public for external visibility.

**Features:**
- `is_public` flag on `classes` table
- `external_signup_url` field for external booking systems (e.g., Eventbrite, Mindbody)
- Dancers can browse public classes at `/dancer/available-classes`
- RLS policies allow public class viewing without enrollment

**Use cases:**
- Open enrollment workshops
- Master classes
- Special events
- Integration with external booking platforms

### 4. Google Places Integration

Google Places API integration for address autocomplete.

**Component:** `GooglePlacesInput.tsx`
- Autocomplete address search
- Returns formatted address, lat/lng coordinates
- Used in studio location management

**API routes:**
- `/api/places/search` - Autocomplete search
- `/api/places/details` - Get place details

**Environment variables:**
Required: `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`

### 5. Actual Attendance Tracking

Manual override for class attendance when using external booking systems.

**Field:** `actual_attendance_count` on `classes` table
- Defaults to `NULL` (uses enrolled students count)
- Can be manually set for external bookings
- Used in pricing calculations

**Use case:**
- Class has 15 students enrolled via Eventbrite
- Only 12 actually attended
- Instructor manually sets `actual_attendance_count = 12`
- Payment calculated based on actual attendance

## Security Checklist

When adding new features:

1. ✅ Add API route guard (`requireInstructor()`, `requireDancer()`, etc.)
2. ✅ Filter queries by appropriate scope (student_id for dancers, instructor_id for instructors)
3. ✅ Add RLS policy in `supabase-schema.sql` or create migration if adding new tables
4. ✅ Update proxy.ts if adding new portal routes
5. ✅ Consider admin role access - should admins see this data?
6. ✅ Never trust client-side data - always validate on server
7. ✅ Test cross-role access (should be denied)

## HTML Sanitization (XSS Prevention)

**CRITICAL**: All user-generated HTML must be sanitized before rendering.

**Utility:** `lib/utils/sanitize.ts`

```typescript
import { createSanitizedHtml, sanitizeHtml } from '@/lib/utils/sanitize'

// For React dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={createSanitizedHtml(userContent)} />

// For string sanitization
const clean = sanitizeHtml(dirtyHtml)
```

**Features:**
- DOMPurify-based with strict whitelist
- Works on both client and server (uses jsdom for SSR)
- Removes scripts, event handlers, and dangerous tags
- Specialized functions: `sanitizeWaiverHtml()`, `sanitizePlainText()`

**When to use:**
- Rendering notes content (rich text from TipTap editor)
- Displaying waiver content
- Any user-provided HTML content

**Never:**
- Use `dangerouslySetInnerHTML` without sanitization
- Trust client-side input
- Allow arbitrary HTML tags

## Common Patterns

### Creating a new API route for dancers:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentDancerStudent } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const student = await getCurrentDancerStudent()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('your_table')
      .select('*')
      .eq('student_id', student.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Creating a new API route for instructors:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    await requireInstructor()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('your_table')
      .select('*')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Fetching data in server components:

```typescript
import { createClient } from '@/lib/supabase/server'
import { requireDancer } from '@/lib/auth/server-auth'

export default async function DancerPage() {
  await requireDancer()
  const supabase = await createClient()

  const { data } = await supabase.from('classes').select('*')

  return <div>{/* render data */}</div>
}
```

### Using pricing utilities:

```typescript
import { calculateClassCost, getPricingModelDescription } from '@/lib/utils/pricing'

// Calculate cost for per_person pricing
const cost = calculateClassCost(
  'per_person',
  { pricePerPerson: 50 },
  60, // duration in minutes (not used for per_person)
  null, // actual attendance (null = use enrolled count)
  12 // enrolled students count
)
// Returns: 600 (12 students × $50)

// Get human-readable description
const description = getPricingModelDescription('per_person', { pricePerPerson: 50 })
// Returns: "$50 per person"
```

### Creating a new portal page:

```typescript
// app/(portal)/instructor/new-page/page.tsx
import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'
import PortalLayout from '@/components/PortalLayout'

export default async function NewInstructorPage() {
  // Always require appropriate role first
  await requireInstructor()
  const supabase = await createClient()

  // Fetch data needed for the page
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await supabase
    .from('your_table')
    .select('*')

  return (
    <PortalLayout role="instructor">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Page Title</h1>
        {/* Your page content */}
      </div>
    </PortalLayout>
  )
}
```

### Adding a new database table with RLS:

```sql
-- Create the table
CREATE TABLE IF NOT EXISTS public.your_table (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow instructors to view their own records
CREATE POLICY "Instructors can view own records"
  ON public.your_table
  FOR SELECT
  USING (
    auth.uid() = instructor_id OR
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  );

-- Allow instructors to insert their own records
CREATE POLICY "Instructors can insert own records"
  ON public.your_table
  FOR INSERT
  WITH CHECK (auth.uid() = instructor_id);

-- Allow instructors to update their own records
CREATE POLICY "Instructors can update own records"
  ON public.your_table
  FOR UPDATE
  USING (auth.uid() = instructor_id)
  WITH CHECK (auth.uid() = instructor_id);

-- Allow instructors to delete their own records
CREATE POLICY "Instructors can delete own records"
  ON public.your_table
  FOR DELETE
  USING (auth.uid() = instructor_id);

-- Create updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.your_table
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### Using the RichTextEditor component:

```typescript
'use client'

import { useState } from 'react'
import RichTextEditor from '@/components/RichTextEditor'
import { createSanitizedHtml } from '@/lib/utils/sanitize'

export default function MyForm() {
  const [content, setContent] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Content is already HTML from TipTap
    const response = await fetch('/api/your-endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <RichTextEditor
        value={content}
        onChange={setContent}
        placeholder="Enter your content here..."
      />
      <button type="submit">Save</button>
    </form>
  )
}

// When displaying the content later:
function DisplayContent({ htmlContent }: { htmlContent: string }) {
  return (
    <div
      className="prose max-w-none"
      dangerouslySetInnerHTML={createSanitizedHtml(htmlContent)}
    />
  )
}
```

### Working with enrollments:

```typescript
// Enroll a student in a class (API route)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentDancerStudent } from '@/lib/auth/server-auth'

export async function POST(request: NextRequest) {
  try {
    const student = await getCurrentDancerStudent()
    const supabase = await createClient()
    const { classId } = await request.json()

    // Check if already enrolled
    const { data: existing } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', student.id)
      .eq('class_id', classId)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Already enrolled in this class' },
        { status: 400 }
      )
    }

    // Create enrollment
    const { data, error } = await supabase
      .from('enrollments')
      .insert({
        student_id: student.id,
        class_id: classId
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to enroll' },
      { status: 500 }
    )
  }
}
```

### Using Toast notifications:

```typescript
'use client'

import { useState } from 'react'
import Toast from '@/components/ui/Toast'

export default function MyComponent() {
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
  } | null>(null)

  const handleAction = async () => {
    try {
      const response = await fetch('/api/endpoint', { method: 'POST' })

      if (!response.ok) throw new Error('Failed')

      setToast({
        message: 'Action completed successfully!',
        type: 'success'
      })
    } catch (error) {
      setToast({
        message: 'Something went wrong. Please try again.',
        type: 'error'
      })
    }
  }

  return (
    <>
      <button onClick={handleAction}>Perform Action</button>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  )
}
```

### Using Modal dialogs:

```typescript
'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

export default function MyComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '' })

  const handleSubmit = async () => {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })

    if (response.ok) {
      setIsModalOpen(false)
      setFormData({ name: '', email: '' })
    }
  }

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>
        Open Form
      </Button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Item"
      >
        <div className="space-y-4">
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Name"
            className="w-full px-3 py-2 border rounded"
          />
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Email"
            className="w-full px-3 py-2 border rounded"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
```

### Error handling in API routes:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'

export async function POST(request: NextRequest) {
  try {
    // Auth guard - throws error if unauthorized
    await requireInstructor()

    const supabase = await createClient()
    const body = await request.json()

    // Validate input
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required and must be a string' },
        { status: 400 }
      )
    }

    // Database operation
    const { data, error } = await supabase
      .from('your_table')
      .insert(body)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Database operation failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })

  } catch (error) {
    // Catch auth errors and other unexpected errors
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Handling file uploads (for waiver PDFs):

```typescript
'use client'

import { useState } from 'react'

export default function FileUploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
    } else {
      alert('Please select a PDF file')
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    try {
      // Convert file to base64
      const reader = new FileReader()
      reader.readAsDataURL(file)

      reader.onload = async () => {
        const base64 = reader.result as string

        const response = await fetch('/api/waiver-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            content_type: 'pdf',
            pdf_data: base64
          })
        })

        if (response.ok) {
          alert('Upload successful!')
          setFile(null)
        }
      }
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
      >
        {uploading ? 'Uploading...' : 'Upload PDF'}
      </button>
    </div>
  )
}
```

### Fetching related data with joins:

```typescript
// Fetch classes with enrollment count and instructor details
const { data: classes } = await supabase
  .from('classes')
  .select(`
    *,
    instructor:profiles!classes_instructor_id_fkey(
      id,
      full_name,
      email
    ),
    enrollments(count),
    studio:studios(
      id,
      name,
      address
    )
  `)
  .order('start_time', { ascending: true })

// Access the data
classes?.forEach(classItem => {
  console.log(classItem.title)
  console.log(classItem.instructor.full_name)
  console.log(classItem.enrollments[0].count) // enrollment count
  console.log(classItem.studio.name)
})
```

### Date/time formatting:

```typescript
// Format dates consistently across the app
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

// Usage
<p>Class Date: {formatDate(classData.start_time)}</p>
<p>Start Time: {formatTime(classData.start_time)}</p>
<p>Created: {formatDateTime(classData.created_at)}</p>
```

## Design System

**Color Palette:**
- Rose/Mauve primary colors (professional feminine aesthetic)
- Cream/white backgrounds
- Defined in `app/globals.css` as CSS variables

**Typography:**
- Headings: Playfair Display (serif, elegant)
- Body: Inter (clean, readable)

**Component Library:**
- All UI components in `components/ui/`
- Consistent props patterns (variant, size, className)
- Built with Tailwind CSS v4

**Key UI Components:**
- `Button` - Primary, secondary, outline, destructive variants
- `Card` - Container with optional header and footer
- `Modal` - Dialog overlay with backdrop
- `Badge` - Status indicators with color variants
- `Table` - Data table with sorting and filtering
- `Toast` - Notification system
- `Spinner` - Loading indicators
- `GooglePlacesInput` - Address autocomplete with Places API

## Environment Variables

Required in Replit Secrets or `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your-google-api-key (optional)
```

## Dependencies

**Core Framework:**
- next: ^16.0.3
- react: ^19.2.0
- react-dom: ^19.2.0

**Database & Auth:**
- @supabase/ssr: ^0.7.0
- @supabase/supabase-js: ^2.84.0

**Styling:**
- tailwindcss: ^4.0.15 (v4)
- @tailwindcss/postcss: ^4.1.17

**Rich Text Editor:**
- @tiptap/react: ^3.11.0
- @tiptap/starter-kit: ^3.11.0
- @tiptap/extension-placeholder: ^3.11.0

## Known Issues & Future Work

**Completed features:**
- ✅ Waiver system with digital signatures
- ✅ Admin role with portal switching
- ✅ Public classes with external signup URLs
- ✅ Google Places integration
- ✅ Advanced pricing models
- ✅ Actual attendance tracking
- ✅ Rich text editor for waivers and notes

**Future enhancements:**
- Stripe payment integration (currently manual tracking)
- Guardian portal (role exists but no dedicated portal pages)
- Email notifications for class reminders and waiver requests
- SMS notifications via Twilio
- Calendar export (iCal/Google Calendar)
- Bulk operations (bulk waiver issuance, bulk payment entry)

## Testing Approach

**Manual testing checklist:**
1. Create test accounts for each role (instructor, dancer, guardian, admin)
2. Verify portal access redirects correctly
3. Test admin portal switcher functionality
4. Test cross-role API access (should be denied except for admin)
5. Verify data isolation (dancers shouldn't see other dancers' data)
6. Test note visibility filtering
7. Test waiver creation, issuance, and signing workflow
8. Test pricing calculations with different models
9. Test public class visibility and enrollment
10. Verify RLS policies in Supabase dashboard

**Database testing:**
- All tables have RLS enabled
- Test queries with different user roles
- Verify admin bypass works correctly
- Check waiver access control

## Important Files

**Documentation:**
- `CLAUDE.md` - This file (project guidance)
- `README.md` - General project overview
- `DATABASE_SETUP.md` - Database setup instructions
- `SECURITY_FIXES.md` - Detailed security documentation
- `supabase-RLS.md` - Complete RLS policy documentation
- `RLS-FIX-README.md` - RLS troubleshooting
- `CLASS_PRICING_GUIDE.md` - Pricing model guide
- `migrations/README.md` - Migration instructions

**Core Files:**
- `supabase-schema.sql` - Main database schema
- `proxy.ts` - Route protection and role-based redirects (MUST use `export default`)
- `lib/auth/server-auth.ts` - Role guard utilities
- `lib/auth/waiver-access.ts` - Waiver access helpers
- `lib/auth/privileges.ts` - Role privilege checking
- `lib/utils/pricing.ts` - Pricing calculation utilities
- `lib/utils/sanitize.ts` - HTML sanitization for XSS prevention
- `components/Sidebar.tsx` - Unified navigation with admin switcher
- `components/NotesRichTextEditor.tsx` - TipTap editor with sanitization

## Best Practices

1. **Always use server-side auth guards** - Never rely on client-side checks alone
2. **Filter queries by scope** - Dancers see only their data, instructors see only their students
3. **Use RLS policies** - Database-level security is the last line of defense
4. **Sanitize all HTML** - Use `createSanitizedHtml()` for any user content rendered with `dangerouslySetInnerHTML`
5. **Validate pricing data** - Use `validatePricingData()` before saving pricing configurations
6. **Test with multiple roles** - Ensure cross-role access is properly denied
7. **Consider admin access** - When building features, think about what admins should see
8. **Use TypeScript** - Leverage type safety for database queries and API responses
9. **Handle errors gracefully** - Return appropriate error messages and status codes
10. **Document new features** - Update this file when adding major features or changes
11. **Apply migrations carefully** - Test migrations on development database first

## Critical Gotchas

### Next.js 16 Proxy Export
**Problem**: Using `export async function proxy()` instead of `export default async function proxy()`
**Symptom**: Middleware not recognized, empty middleware manifest, auth not working
**Solution**: Always use `export default` for proxy function

### RLS vs API Filtering
**Problem**: Adding `.eq('author_id', user.id)` in API when RLS policy already handles authorization
**Symptom**: "0 rows" errors, PGRST116 errors, updates fail
**Solution**: Trust RLS policies, don't over-filter in API layer unless specifically required

### Replit Deployment Cache
**Problem**: Code changes deployed but not reflected in production
**Symptom**: Old bugs persist after fixes, JavaScript 403 errors
**Solution**: Delete deployment and create fresh one (don't just republish)

### Session Management
**Problem**: Using incorrect Supabase client type
**Symptom**: Auth works in dev but fails in production, session errors
**Solution**: Use correct client:
- Server components: `@/lib/supabase/server`
- Client components: `@/lib/supabase/client`
- Middleware: `@/lib/supabase/middleware`
