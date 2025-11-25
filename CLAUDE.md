# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a dance teaching schedule management platform for professional dance instruction. Built for dance instructors (like former Rockettes) to manage students, track progress, schedule classes, and handle payments. The application supports five user roles: Instructor, Dancer, Guardian, Studio Admin, and Admin, each with their own portal and capabilities.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase (PostgreSQL + Auth), Tailwind CSS v4

## Development Commands

```bash
# Development server (runs on port 5000)
npm run dev

# Production build
npm run build

# Start production server (port 3000)
npm start

# Linting
npm lint
```

## Database Setup (CRITICAL)

**Before any development work, ensure the database schema is applied:**

1. Open your Supabase project SQL Editor at https://supabase.com
2. Run the entire `supabase-schema.sql` file
3. Apply migrations from `migrations/` directory in order
4. This creates tables, RLS policies, and triggers - essential for security

The schema defines:
- User roles: `instructor`, `dancer`, `guardian`, `studio_admin`, `admin`
- Core tables: profiles, students, classes, enrollments, notes, payments, studios, waivers, waiver_templates
- Row-level security (RLS) policies for data isolation
- Automatic `updated_at` triggers
- Custom types for enums (user_role, payment_status, note_visibility, class_type, pricing_model)

## Architecture

### Authentication & Authorization

**Multi-layered security approach:**

1. **Middleware Proxy** (`proxy.ts`): Portal-level routing protection
   - Redirects unauthenticated users to `/login`
   - Enforces role-based portal access (`/instructor`, `/dancer`, `/studio`)
   - Redirects users to their correct portal based on role
   - **Admin role** can access all portals via sidebar switcher

2. **API Route Guards** (`lib/auth/server-auth.ts`):
   - `requireInstructor()` - Ensures instructor role
   - `requireDancer()` - Ensures dancer role
   - `requireStudio()` - Ensures studio role (alias: `requireStudioAdmin()`)
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
│   ├── studio/            # Studio admin portal (6 pages)
│   │   ├── page.tsx       # Dashboard
│   │   ├── classes/       # Studio classes
│   │   ├── students/      # Enrolled students
│   │   ├── schedule/      # Class calendar
│   │   ├── payments/      # Cash/check submission
│   │   └── profile/       # Studio profile
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
│   ├── studio/            # Studio-specific routes
│   │   ├── stats/         # Studio dashboard
│   │   ├── classes/       # Studio class management
│   │   ├── students/      # Studio students
│   │   ├── payments/      # Payment submission
│   │   ├── profile/       # Studio profile
│   │   ├── schedule/      # Studio schedule
│   │   └── notes/         # Studio notes
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
│   └── waiver-access.ts   # Waiver access control helpers
├── supabase/
│   ├── client.ts          # Browser client
│   ├── server.ts          # Server client
│   └── middleware.ts      # Middleware client
├── types/                 # TypeScript type definitions
│   ├── database.types.ts  # Supabase generated types
│   └── index.ts           # Custom types
└── utils/
    └── pricing.ts         # Pricing calculation utilities

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

**Studio routes** (prefix: `/api/studio/`):
```typescript
// Require studio role first
export async function GET(request: NextRequest) {
  await requireStudio() // or requireStudioAdmin()
  const supabase = await createClient()
  // ... studio can access their classes, students, etc.
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

- Access to all three portals via sidebar switcher dropdown
- Bypass most RLS restrictions (respects private notes)
- Can view all data across instructors, dancers, and studios
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

1. ✅ Add API route guard (`requireInstructor()`, `requireDancer()`, `requireStudio()`, etc.)
2. ✅ Filter queries by appropriate scope (student_id for dancers, instructor_id for instructors)
3. ✅ Add RLS policy in `supabase-schema.sql` or create migration if adding new tables
4. ✅ Update proxy.ts if adding new portal routes
5. ✅ Consider admin role access - should admins see this data?
6. ✅ Never trust client-side data - always validate on server
7. ✅ Test cross-role access (should be denied)

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
1. Create test accounts for each role (instructor, dancer, guardian, studio_admin, admin)
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
- `proxy.ts` - Route protection and role-based redirects
- `lib/auth/server-auth.ts` - Role guard utilities
- `lib/auth/waiver-access.ts` - Waiver access helpers
- `lib/utils/pricing.ts` - Pricing calculation utilities
- `components/Sidebar.tsx` - Unified navigation with admin switcher

## Best Practices

1. **Always use server-side auth guards** - Never rely on client-side checks alone
2. **Filter queries by scope** - Dancers see only their data, instructors see only their students
3. **Use RLS policies** - Database-level security is the last line of defense
4. **Validate pricing data** - Use `validatePricingData()` before saving pricing configurations
5. **Test with multiple roles** - Ensure cross-role access is properly denied
6. **Consider admin access** - When building features, think about what admins should see
7. **Use TypeScript** - Leverage type safety for database queries and API responses
8. **Handle errors gracefully** - Return appropriate error messages and status codes
9. **Document new features** - Update this file when adding major features or changes
10. **Apply migrations carefully** - Test migrations on development database first
