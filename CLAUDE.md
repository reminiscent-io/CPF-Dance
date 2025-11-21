# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a dance teaching schedule management platform for professional dance instruction. Built for dance instructors (like former Rockettes) to manage students, track progress, schedule classes, and handle payments. The application supports three user roles: Instructor, Dancer, and Studio Admin, each with their own portal and capabilities.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Supabase (PostgreSQL + Auth), Tailwind CSS v4

## Development Commands

```bash
# Development server (runs on port 5000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm lint
```

## Database Setup (CRITICAL)

**Before any development work, ensure the database schema is applied:**

1. Open your Supabase project SQL Editor at https://supabase.com
2. Run the entire `supabase-schema.sql` file
3. This creates tables, RLS policies, and triggers - essential for security

The schema defines:
- User roles: `instructor`, `dancer`, `studio_admin`, `guardian', 'admin'
- Core tables: profiles, students, classes, enrollments, notes, payments, studios
- Row-level security (RLS) policies for data isolation
- Automatic `updated_at` triggers

## Architecture

### Authentication & Authorization

**Multi-layered security approach:**

1. **Proxy** (`proxy.ts`): Portal-level routing protection
   - Redirects unauthenticated users to `/login`
   - Enforces role-based portal access (`/instructor`, `/dancer`, `/studio`, '/admin')
   - Redirects users to their correct portal based on role

2. **API Route Guards** (`lib/auth/server-auth.ts`):
   - `requireInstructor()` - Ensures instructor role
   - `requireDancer()` - Ensures dancer role
   - `requireStudioAdmin()` - Ensures studio admin role
   - `getCurrentDancerStudent()` - Gets authenticated dancer's student record

   **All API routes must call the appropriate guard function first**

3. **Database RLS Policies** (in `supabase-schema.sql`):
   - Row-level security filters data at the database level
   - Prevents instructors from seeing other instructors' data
   - Isolates dancer data between different dancers
   - Enforces note visibility rules

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
│   ├── instructor/        # Instructor portal pages
│   ├── dancer/           # Dancer portal pages
│   ├── studio/           # Studio admin portal pages
│   ├── login/            # Login page
│   └── signup/           # Signup with role selection
├── api/                  # API routes (server-side only)
│   ├── students/         # Instructor: CRUD for students
│   ├── classes/          # Manage classes
│   ├── notes/            # Create/manage instructor notes
│   ├── studios/          # Manage studio locations
│   ├── dashboard/        # Instructor dashboard stats
│   ├── dancer/           # Dancer-specific endpoints
│   │   ├── classes/      # View enrolled classes
│   │   ├── notes/        # Personal training notes
│   │   ├── payments/     # Payment history
│   │   ├── profile/      # Profile management
│   │   └── stats/        # Progress statistics
│   └── auth/             # Authentication endpoints
└── page.tsx              # Public landing page

lib/
├── auth/
│   └── server-auth.ts    # Role guards and auth helpers
├── supabase/
│   ├── client.ts         # Browser client
│   ├── server.ts         # Server client
│   └── middleware.ts     # Middleware client
└── types/                # TypeScript type definitions

components/
├── ui/                   # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   ├── Badge.tsx
│   ├── Table.tsx
│   ├── Toast.tsx
│   └── Spinner.tsx
├── Navigation.tsx        # Role-based navigation component
└── PortalLayout.tsx      # Shared portal layout
```

### Data Model Relationships

**Key relationships:**
- `profiles` (1) → (0..1) `students` via `profile_id` - A dancer's profile links to their student record
- `students` (1) → (N) `notes` - Students can have many notes from instructors or themselves
- `students` (1) → (N) `enrollments` - Students enroll in multiple classes
- `classes` (1) → (N) `enrollments` - Classes have multiple enrolled students
- `profiles` (1) → (N) `classes` as instructor - Instructors create multiple classes
- `students` (1) → (N) `payments` - Students have payment history
- `students` (1) → (N) `private_lesson_requests` - Students can request private lessons

**Important:** When a user signs up with `role='dancer'`, a corresponding `students` record is automatically created with `profile_id` linking to their profile.

### API Route Patterns

**Instructor routes** (prefix: `/api/`):
```typescript
// Always require instructor role first
export async function GET(request: NextRequest) {
  await requireInstructor()
  const supabase = await createClient()
  // ... instructor can access all students, notes, etc.
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

## Security Checklist

When adding new features:

1. ✅ Add API route guard (`requireInstructor()`, `requireDancer()`, etc.)
2. ✅ Filter queries by appropriate scope (student_id for dancers, instructor_id for instructors)
3. ✅ Add RLS policy in `supabase-schema.sql` if adding new tables
4. ✅ Update proxy if adding new portal routes
5. ✅ Never trust client-side data - always validate on server

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
- Re-export from `components/ui/index.ts`

## Environment Variables

Required in Replit Secrets or `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Known Issues & Future Work

See `README.md` section "⚠️ Critical Next Steps":
- Phone OTP authentication (optional enhancement)
- Studio portal completion (cash/check workflow)
- Stripe payment integration
- Additional role-based API authorization layers

## Testing Approach

**Manual testing checklist:**
1. Create test accounts for each role (instructor, dancer, studio_admin)
2. Verify portal access redirects correctly
3. Test cross-role API access (should be denied)
4. Verify data isolation (dancers shouldn't see other dancers' data)
5. Test note visibility filtering
6. Verify RLS policies in Supabase dashboard

## Important Files

- `supabase-RLS.md` - Complete database schema with RLS
- `proxy.ts` - Route protection and role-based redirects
- `lib/auth/server-auth.ts` - Role guard utilities
- `SECURITY_FIXES.md` - Detailed security documentation
- `DATABASE_SETUP.md` - Database setup instructions
