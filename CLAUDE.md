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
npm run lint

# Testing
npm test              # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:coverage # Run with coverage report
npm run test:ui       # Run with Vitest UI
npm run test:watch    # Explicit watch mode
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
- Core tables: profiles, students, classes, enrollments, notes, payments, studios, waivers, waiver_templates, lesson_packs, assets, instructor_access_requests
- Row-level security (RLS) policies for data isolation
- Automatic `updated_at` triggers
- Custom types for enums (user_role, payment_status, note_visibility, class_type, pricing_model)

## Architecture

### Authentication & Authorization

**Multi-layered security approach:**

1. **Middleware Proxy** (`proxy.ts`): Portal-level routing protection
   - **CRITICAL**: Must use `export default async function proxy()` (Next.js 16 requirement)
   - Redirects unauthenticated users to `/login`
   - Enforces role-based portal access (`/instructor`, `/dancer`, `/admin`)
   - Redirects users to their correct portal based on role
   - **Admin role** can access all portals via sidebar switcher
   - Matcher pattern excludes `_next/`, `api/`, and static assets

2. **API Route Guards** (`lib/auth/server-auth.ts`):
   - `requireInstructor()` - Ensures instructor role
   - `requireDancer()` - Ensures dancer role
   - `requireAdmin()` - Ensures admin role
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
│   ├── admin/             # Admin portal (4 pages)
│   │   ├── page.tsx       # Admin dashboard with statistics
│   │   ├── instructor-requests/  # Manage access requests
│   │   ├── studio-inquiries/     # Manage studio inquiries
│   │   └── users/         # User management
│   ├── instructor/        # Instructor portal (18 pages)
│   │   ├── page.tsx       # Dashboard
│   │   ├── assets/        # Choreography & file management
│   │   ├── classes/       # Class management
│   │   │   ├── page.tsx   # Class list
│   │   │   ├── attendance/    # Attendance tracking
│   │   │   └── choreography/  # Choreography files
│   │   ├── inquiries/     # Studio inquiry responses
│   │   ├── notes/         # Progress notes (with focus mode)
│   │   ├── payments/      # Payment tracking
│   │   │   ├── page.tsx   # Payment list
│   │   │   └── invoices/  # Invoice generation
│   │   ├── profile/       # Instructor profile management
│   │   ├── requests/      # Lesson request management
│   │   ├── schedule/      # Calendar view
│   │   ├── students/      # Student roster & details
│   │   ├── studios/       # Studio locations
│   │   └── waivers/       # Waiver management & templates
│   ├── dancer/            # Dancer portal (11 pages)
│   │   ├── page.tsx       # Dashboard
│   │   ├── available-classes/  # Browse public classes
│   │   ├── classes/       # Enrolled classes
│   │   ├── notes/         # Personal journal (renamed from my-notes)
│   │   ├── payments/      # Payment history
│   │   ├── profile/       # Profile management
│   │   ├── progress/      # Instructor feedback timeline
│   │   ├── request-lesson/# Private lesson requests
│   │   ├── schedule/      # Class schedule view
│   │   └── waivers/       # View & sign waivers
│   ├── login/             # Login page
│   └── signup/            # Signup with role selection
├── api/                   # API routes (67 endpoints)
│   ├── admin/             # Admin-only endpoints
│   │   ├── instructor-requests/  # Access request management
│   │   ├── seed-lesson-packs/    # Initialize lesson packs
│   │   ├── stats/         # Admin dashboard statistics
│   │   ├── studio-inquiries/     # Inquiry management & Gmail integration
│   │   │   ├── route.ts   # List/create inquiries
│   │   │   ├── refresh-inbox/    # Gmail sync
│   │   │   ├── send-email/       # Send email responses
│   │   │   └── thread/    # Email threading
│   │   └── users/         # User management
│   ├── assets/            # Asset/file management
│   │   ├── route.ts       # List and upload assets
│   │   └── [id]/          # Delete and manage assets
│   ├── auth/              # Authentication (signup, signin, signout)
│   ├── classes/           # Class management
│   │   ├── route.ts       # CRUD operations
│   │   ├── bulk/          # Bulk class operations
│   │   └── [id]/          # Individual class & enrollments
│   ├── dancer/            # Dancer-specific endpoints
│   │   ├── classes/       # View enrolled classes
│   │   ├── enroll/        # Class enrollment
│   │   ├── instructors/   # View instructors
│   │   ├── lesson-packs/  # Lesson pack system
│   │   │   ├── route.ts   # List available packs
│   │   │   ├── history/   # Purchase history
│   │   │   ├── purchase/  # Purchase a pack
│   │   │   └── spend/     # Use lesson credits
│   │   ├── lesson-requests/   # Private lesson requests
│   │   ├── notes/         # Personal notes & pinning
│   │   ├── payments/      # Payment history
│   │   ├── personal-classes/  # Personal class history
│   │   ├── profile/       # Profile management
│   │   ├── public-classes/    # Browse available public classes
│   │   └── stats/         # Dashboard statistics
│   ├── dashboard/         # Instructor dashboard stats
│   ├── instructor/        # Instructor-specific routes
│   │   ├── class-earnings/    # Earnings calculations
│   │   ├── notes/         # Instructor notes
│   │   ├── payments/      # Payment management
│   │   ├── payment-requests/  # Payment requests
│   │   ├── profile/       # Profile management
│   │   ├── requests/      # Lesson request management
│   │   ├── schedule/      # Schedule view
│   │   └── send-payment-reminder/  # Payment reminders
│   ├── instructor-access-request/  # Submit access request
│   ├── instructors/       # Instructor listing
│   ├── notes/             # Notes management
│   │   ├── route.ts       # CRUD operations
│   │   └── format/        # AI note formatting (GPT-4o-mini)
│   ├── places/            # Google Places integration
│   │   ├── search/        # Autocomplete
│   │   └── details/       # Place details
│   ├── profiles/          # Profile management
│   ├── relationships/     # Instructor-student relationships
│   ├── stripe/            # Stripe payment integration
│   │   ├── create-checkout-session/  # Create payment session
│   │   └── webhook/       # Handle payment webhooks
│   ├── students/          # Student CRUD operations
│   │   ├── route.ts       # List/create students
│   │   ├── linked/        # Profile-linked students
│   │   └── [id]/          # Individual student operations
│   │       ├── route.ts   # Get/update/delete
│   │       ├── link/      # Link to profile
│   │       └── merge/     # Merge student records
│   ├── studios/           # Studio locations
│   ├── studio-inquiries/  # Public inquiry form & management
│   ├── voice-to-notes/    # OpenAI Whisper transcription
│   ├── waivers/           # Waiver management
│   │   ├── route.ts       # List/create waivers
│   │   └── [id]/          # Individual waiver operations & signing
│   └── waiver-templates/  # Waiver template CRUD
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
│   ├── privileges.ts      # Role privilege checking utilities
│   ├── actions.ts         # Server actions for authentication
│   ├── hooks.ts           # React hooks for auth state
│   ├── types.ts           # TypeScript type definitions
│   └── mock-profiles.ts   # Test utilities
├── gmail/
│   └── client.ts          # Gmail API integration
├── supabase/
│   ├── client.ts          # Browser client
│   ├── server.ts          # Server client
│   └── middleware.ts      # Middleware client
├── types/                 # TypeScript type definitions
│   ├── database.types.ts  # Supabase generated types
│   └── index.ts           # Custom types
└── utils/
    ├── calendar-export.ts # iCal export functionality
    ├── date-helpers.ts    # Date manipulation utilities
    ├── et-timezone.ts     # Eastern Time zone support
    ├── pricing.ts         # Pricing calculation utilities
    ├── sanitize.ts        # HTML sanitization (XSS prevention)
    └── timezone.ts        # Timezone utilities

components/
├── ui/                    # Reusable UI components
│   ├── Avatar.tsx         # User avatars
│   ├── Badge.tsx          # Status badges
│   ├── Button.tsx         # Button variants
│   ├── Card.tsx           # Card container
│   ├── DropdownMenu.tsx   # Dropdown menus
│   ├── GooglePlacesInput.tsx  # Google Places autocomplete
│   ├── Input.tsx          # Form inputs
│   ├── Modal.tsx          # Modal dialogs
│   ├── Skeleton.tsx       # Loading skeletons
│   ├── Spinner.tsx        # Loading spinners
│   ├── Table.tsx          # Data tables
│   └── Toast.tsx          # Notification toasts
├── notes/                 # Note-related components
│   ├── NoteFeedItem.tsx   # Individual note display
│   ├── NoteFeedList.tsx   # Note list rendering
│   ├── NoteFocusMode.tsx  # Focused note editing
│   └── NoteSearchBar.tsx  # Note search interface
├── AddNoteModal.tsx       # Instructor note creation
├── AssetSelector.tsx      # File selection for classes
├── Calendar.tsx           # Class scheduling calendar
├── CommunicationsSection.tsx  # Communication hub
├── CookieConsentBanner.tsx    # Privacy compliance
├── CreateWaiverTemplateDialog.tsx  # Waiver template creator
├── DancerAddNoteModal.tsx # Dancer note creation
├── DancerBottomNav.tsx    # Mobile dancer navigation
├── EarningsProgressWidget.tsx  # Earnings display
├── HeadshotUpload.tsx     # Profile photo upload
├── InstructorBottomNav.tsx    # Mobile instructor navigation
├── IssueWaiverDialog.tsx  # Waiver issuer
├── LessonPackHistory.tsx  # Purchase history UI
├── LessonPackInfo.tsx     # Pack details display
├── LessonPackSelector.tsx # Purchase interface
├── MobileCalendar.tsx     # Responsive calendar
├── MobileHeader.tsx       # Mobile header
├── Navigation.tsx         # Legacy navigation (replaced by Sidebar)
├── NotesRichTextEditor.tsx    # Enhanced TipTap editor with sanitization
├── PortalLayout.tsx       # Shared portal layout wrapper
├── RichTextEditor.tsx     # TipTap-based rich text editor
├── Sidebar.tsx            # Unified sidebar with admin portal switcher
├── SignaturePad.tsx       # Digital signature capture
├── StripePaymentDialog.tsx    # Payment UI
├── StudioCarousel.tsx     # Studio showcase carousel
├── UploadAssetModal.tsx   # Asset upload dialog
└── VoiceRecorder.tsx      # Audio recording for voice-to-notes

migrations/                # Database migrations (32 files)
├── 05-add-studio-id-to-inquiries.sql
├── 06-add-response-tracking.sql
├── 07-add-waivers-table.sql
├── 08-add-instructor-id-to-private-lessons.sql
├── 08-add-studio-inquiry-tracking.sql
├── 09-add-waiver-templates.sql
├── 10-update-waiver-access-control.sql
├── 11-add-student-id-to-waivers.sql
├── 12-add-actual-attendance-column.sql
├── 13-add-public-classes-features.sql
├── 13a-create-instructor-student-relationships.sql
├── 14-add-asset-to-classes.sql
├── 14-fix-notes-rls-instructor-access.sql
├── 15-add-profile-linking.sql
├── 15-add-timezone-support.sql
├── 16-remove-studio-portal.sql
├── 17-add-assets-table.sql
├── 18-add-assets-storage-policies.sql
├── 19-add-note-pinning.sql
├── 20-remove-duplicate-indexes.sql
├── 21-fix-auth-rls-performance.sql
├── 22-consolidate-rls-policies.sql
├── 23-add-instructor-access-requests.sql
├── 24-add-admin-access-to-students-classes.sql
├── 25-add-headshots-storage.sql
├── 26-add-scheduled-class-to-lesson-requests.sql
├── 27-fix-private-lesson-class-visibility.sql
├── 28-add-admin-access-to-students.sql
├── 29-fix-classes-policy-recursion.sql
├── 30-fix-recursion-with-functions.sql
├── 31-fix-rls-performance-issues.sql
├── 32-add-dancer-student-update-policy.sql
└── get-profile-ids.sql    # Utility function

tests/                     # Test infrastructure
├── setup.ts               # Test setup with mocks
├── setup.test.ts          # Setup verification
└── utils.tsx              # Test utilities
```

### Data Model Relationships

**Key relationships:**
- `profiles` (1) → (0..1) `students` via `profile_id` - A dancer's profile links to their student record
- `students` (1) → (N) `notes` - Students can have many notes from instructors or themselves
- `students` (1) → (N) `enrollments` - Students enroll in multiple classes
- `students` (1) → (N) `waivers` - Students can have multiple waivers assigned
- `students` (1) → (N) `lesson_pack_purchases` - Students can purchase lesson packs
- `classes` (1) → (N) `enrollments` - Classes have multiple enrolled students
- `classes` (1) → (0..1) `assets` - Classes can have attached choreography files
- `profiles` (1) → (N) `classes` as instructor - Instructors create multiple classes
- `profiles` (1) → (N) `waiver_templates` as creator - Instructors create waiver templates
- `profiles` (1) → (N) `assets` as uploader - Instructors upload choreography files
- `students` (1) → (N) `payments` - Students have payment history
- `students` (1) → (N) `private_lesson_requests` - Students can request private lessons
- `lesson_packs` (1) → (N) `lesson_pack_purchases` - Packs can be purchased multiple times
- `lesson_pack_purchases` (1) → (N) `lesson_pack_usage` - Track credit usage

**Important notes:**
- When a user signs up with `role='dancer'`, a corresponding `students` record is automatically created with `profile_id` linking to their profile
- **Students can exist without linked profiles** - useful for instructors managing non-portal students (direct storage of student info: full_name, email, phone)
- **Admin role** has dedicated portal at `/admin` with dashboard, user management, and inquiry handling

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

**Admin routes** (prefix: `/api/admin/`):
```typescript
// Require admin role
export async function GET(request: NextRequest) {
  await requireAdmin()
  const supabase = await createClient()
  // Admin can access all data
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

### 2. Admin Portal

**Admin role** (`admin`) has a dedicated portal with special privileges:

**Portal pages (`/admin`):**
- Dashboard with platform statistics
- User management (view/manage all users)
- Instructor access request management
- Studio inquiry management with Gmail integration

**Capabilities:**
- Access to both Instructor and Dancer portals via sidebar switcher
- Bypass most RLS restrictions (respects private notes)
- Can view all data across instructors and dancers
- Manage instructor access requests

**Implementation:**
- Sidebar component has portal switcher dropdown for admin users
- `requireAdmin()` function for admin-only API routes
- `requireRole()` function checks for admin override
- RLS policies have `OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')` clauses

### 3. Stripe Payment Integration

Full Stripe integration for lesson pack purchases.

**Components:**
- `StripePaymentDialog.tsx` - Payment UI with Stripe Checkout
- `LessonPackSelector.tsx` - Browse and select lesson packs

**API routes:**
- `/api/stripe/create-checkout-session` - Create Stripe checkout session
- `/api/stripe/webhook` - Handle Stripe webhooks (payment success, etc.)

**Environment variables:**
- `STRIPE_SECRET_KEY` - Server-side Stripe API key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Client-side Stripe key

**Workflow:**
1. Dancer selects lesson pack to purchase
2. StripePaymentDialog creates checkout session
3. User redirected to Stripe Checkout
4. Webhook updates `lesson_pack_purchases` on successful payment
5. Credits available for booking lessons

### 4. Lesson Pack System

Pre-purchased lesson credits for dancers.

**Database tables:**
- `lesson_packs` - Available packages (e.g., "5 Private Lessons")
- `lesson_pack_purchases` - Student purchase records with remaining credits
- `lesson_pack_usage` - Credit usage tracking

**Components:**
- `LessonPackSelector.tsx` - Purchase interface
- `LessonPackInfo.tsx` - Display pack details and remaining credits
- `LessonPackHistory.tsx` - View purchase and usage history

**API routes:**
- `/api/dancer/lesson-packs` - List available packs
- `/api/dancer/lesson-packs/purchase` - Purchase a pack
- `/api/dancer/lesson-packs/spend` - Use lesson credits
- `/api/dancer/lesson-packs/history` - View purchase history
- `/api/admin/seed-lesson-packs` - Initialize default packs

### 5. Voice-to-Notes & AI Formatting

OpenAI integration for transcription and note formatting.

**Components:**
- `VoiceRecorder.tsx` - Audio capture component

**API routes:**
- `/api/voice-to-notes` - Whisper transcription with dance-specific prompts
- `/api/notes/format` - GPT-4o-mini formatting for note improvement

**Features:**
- Preserves dance terminology (pirouette, grand jeté, etc.)
- Fixes grammar while maintaining meaning
- Dance-specific prompt engineering for accuracy

**Environment variable:**
- `OPENAI_API_KEY` - OpenAI API key

### 6. Asset Management System

File storage for choreography, music, and instructional materials.

**Database tables:**
- `assets` - File metadata with Supabase Storage bucket reference

**Components:**
- `AssetSelector.tsx` - Select files to attach to classes
- `UploadAssetModal.tsx` - Upload new assets
- `HeadshotUpload.tsx` - Profile photo upload

**API routes:**
- `/api/assets` - List and upload assets
- `/api/assets/[id]` - Delete and manage individual assets

**Features:**
- Instructors can upload choreography files
- Attach assets to classes for students to access
- Student headshot storage for profiles

### 7. Gmail Integration for Studio Inquiries

Gmail API integration for managing studio inquiry responses.

**Library:** `lib/gmail/client.ts`

**API routes:**
- `/api/admin/studio-inquiries/send-email` - Send email responses
- `/api/admin/studio-inquiries/refresh-inbox` - Sync emails from Gmail
- `/api/admin/studio-inquiries/thread` - Manage email threads

**Features:**
- Reply to studio inquiries directly from admin portal
- Email thread management
- Automatic email synchronization

**Environment variables (Replit-specific):**
- `REPLIT_CONNECTORS_HOSTNAME` - Gmail connector hostname
- Gmail OAuth configured through Replit Connectors

### 8. Instructor Access Request System

Allow potential instructors to request platform access.

**Database table:**
- `instructor_access_requests` - Request tracking

**API routes:**
- `/api/instructor-access-request` - Submit access request (public)
- `/api/admin/instructor-requests` - Admin management

**Portal page:**
- `/admin/instructor-requests` - Review and approve/deny requests

### 9. Public Classes

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

### 10. Google Places Integration

Google Places API integration for address autocomplete.

**Component:** `GooglePlacesInput.tsx`
- Autocomplete address search
- Returns formatted address, lat/lng coordinates
- Used in studio location management

**API routes:**
- `/api/places/search` - Autocomplete search
- `/api/places/details` - Get place details

**Environment variable:**
- `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` (optional)

### 11. Actual Attendance Tracking

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

### 12. Calendar Export

iCal export functionality for class schedules.

**Utility:** `lib/utils/calendar-export.ts`
- Export classes to iCal format
- Compatible with Google Calendar, Apple Calendar, Outlook

## Testing Infrastructure

Comprehensive test setup using Vitest and Testing Library.

**Configuration:**
- `vitest.config.ts` - Vitest configuration with jsdom environment
- `tests/setup.ts` - Mocks for Next.js, ResizeObserver, IntersectionObserver

**Test files:**
- `lib/utils/__tests__/pricing.test.ts` - Pricing calculations (48 tests)
- `lib/utils/__tests__/sanitize.test.ts` - XSS prevention (57 tests)
- `lib/utils/__tests__/date-helpers.test.ts` - Date utilities (25 tests)
- `lib/auth/__tests__/privileges.test.ts` - Permission testing (72 tests)
- `app/api/__tests__/auth.test.ts` - Authentication routes (13 tests)
- `app/api/__tests__/instructor-notes.test.ts` - Instructor notes API (18 tests)
- `app/api/__tests__/dancer-notes.test.ts` - Dancer notes API (12 tests)
- `tests/setup.test.ts` - Setup verification (5 tests)

**Running tests:**
```bash
npm test              # Watch mode
npm run test:run      # Single run
npm run test:coverage # With coverage
```

## Security Checklist

When adding new features:

1. ✅ Add API route guard (`requireInstructor()`, `requireDancer()`, `requireAdmin()`)
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

### Creating a new API route for admin:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const supabase = await createClient()

    // Admin can access all data without filtering
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

### Date/time formatting:

```typescript
import { formatDate, formatTime, formatDateTime } from '@/lib/utils/date-helpers'

// Format dates consistently across the app
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
- `Avatar` - User profile images
- `Badge` - Status indicators with color variants
- `Button` - Primary, secondary, outline, destructive variants
- `Card` - Container with optional header and footer
- `DropdownMenu` - Dropdown menus for actions
- `GooglePlacesInput` - Address autocomplete with Places API
- `Input` - Form inputs
- `Modal` - Dialog overlay with backdrop
- `Skeleton` - Loading placeholder animations
- `Spinner` - Loading indicators
- `Table` - Data table with sorting and filtering
- `Toast` - Notification system

## Environment Variables

Required in Replit Secrets or `.env.local`:
```
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Stripe (Required for payments)
STRIPE_SECRET_KEY=sk_live_or_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_or_test_...

# OpenAI (Required for voice-to-notes and AI formatting)
OPENAI_API_KEY=sk-...

# Google Places (Optional)
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your-google-api-key

# Gmail Integration (Replit-specific, optional)
REPLIT_CONNECTORS_HOSTNAME=connector-hostname
# Gmail OAuth configured through Replit Connectors
```

## Dependencies

**Core Framework:**
- next: ^16.0.3
- react: ^19.2.0
- react-dom: ^19.2.0
- typescript: 5.9.3

**Database & Auth:**
- @supabase/ssr: ^0.7.0
- @supabase/supabase-js: ^2.84.0

**Styling:**
- tailwindcss: ^4.0.15 (v4)
- @tailwindcss/postcss: ^4.1.17
- class-variance-authority: ^0.7.1
- clsx: ^2.1.1
- tailwind-merge: ^3.4.0

**Rich Text Editor:**
- @tiptap/react: ^3.11.0
- @tiptap/starter-kit: ^3.11.0
- @tiptap/extension-placeholder: ^3.11.0

**Payments:**
- stripe: ^20.1.0
- @stripe/stripe-js: ^8.5.3

**AI/ML:**
- openai: ^6.10.0

**Icons:**
- @heroicons/react: ^2.2.0
- lucide-react: ^0.562.0

**Charts:**
- recharts: ^3.6.0

**Animations:**
- framer-motion: ^12.23.24

**Gmail Integration:**
- googleapis: ^170.0.0

**Security:**
- dompurify: ^3.3.1

**Dev Dependencies:**
- vitest: ^4.0.18
- @testing-library/react: ^16.3.2
- @testing-library/jest-dom: ^6.9.1
- jsdom: ^27.3.0

## Known Issues & Future Work

**Completed features:**
- ✅ Waiver system with digital signatures
- ✅ Admin portal with dedicated pages
- ✅ Public classes with external signup URLs
- ✅ Google Places integration
- ✅ Advanced pricing models
- ✅ Actual attendance tracking
- ✅ Rich text editor for waivers and notes
- ✅ Stripe payment integration
- ✅ Lesson pack system
- ✅ Voice-to-notes with OpenAI Whisper
- ✅ AI note formatting with GPT-4o-mini
- ✅ Asset management for choreography files
- ✅ Gmail integration for studio inquiries
- ✅ Instructor access request system
- ✅ Calendar export (iCal)
- ✅ Comprehensive test suite (250+ tests)

**Future enhancements:**
- Guardian portal (role exists but no dedicated portal pages)
- Email notifications for class reminders and waiver requests
- SMS notifications via Twilio
- Bulk operations (bulk waiver issuance, bulk payment entry)

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
- `lib/gmail/client.ts` - Gmail API integration
- `lib/utils/pricing.ts` - Pricing calculation utilities
- `lib/utils/sanitize.ts` - HTML sanitization for XSS prevention
- `lib/utils/date-helpers.ts` - Date formatting utilities
- `lib/utils/calendar-export.ts` - iCal export
- `components/Sidebar.tsx` - Unified navigation with admin switcher
- `components/NotesRichTextEditor.tsx` - TipTap editor with sanitization
- `vitest.config.ts` - Test configuration

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
12. **Write tests** - Add tests for new utilities and API routes

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

### RLS Policy Recursion
**Problem**: RLS policies checking profiles table can cause infinite recursion
**Symptom**: Database queries hang or timeout, "stack depth limit exceeded" errors
**Solution**: Use security definer functions (see migrations 29-31) or avoid nested profile checks
