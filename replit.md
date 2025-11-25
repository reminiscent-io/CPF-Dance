# Dance Teaching Schedule Management Platform

## Overview

A Next.js-based web application for professional dance instruction management. The platform serves multiple user roles (instructors, dancers, studio admins, and system admins) with role-based access control, enabling comprehensive management of students, classes, schedules, payments, notes, and studio operations.

**Primary Tech Stack:**
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4 with custom design system (rose/mauve/champagne/charcoal palette)
- **Backend:** Next.js API Routes (serverless functions)
- **Database:** Supabase (PostgreSQL with Row-Level Security)
- **Authentication:** Supabase Auth with role-based access control

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Authentication & Authorization

**Multi-layered Security Model:**

1. **Proxy Middleware** (`proxy.ts`): Portal-level routing and authentication enforcement
   - Redirects unauthenticated users to `/login`
   - Enforces role-based portal access (`/instructor`, `/dancer`, `/studio`)
   - Automatically routes users to their appropriate portal based on role
   - Admin role has universal access to all portals

2. **Row-Level Security (RLS)**: Database-level access control via Supabase policies
   - Uses JWT metadata for role checking to avoid infinite recursion
   - Relationship-based access (instructors can only see their students' data)
   - Instructor-student relationships tracked via `instructor_student_relationships` table
   - Privacy permissions per relationship (notes, progress, payments)

3. **Server-Side Authorization** (`lib/auth/server-auth.ts`): API route protection
   - `requireRole()` and `requireInstructor()` helpers enforce role requirements
   - All API routes validate user authentication and role permissions
   - Admin role bypasses most restrictions (universal access)

**User Roles:**
- `instructor`: Full access to student/class/payment management
- `dancer`: Access to personal classes, notes, payments, profile
- `studio`/`studio_admin`: Studio-specific data access
- `guardian`: Parent/guardian access for minor dancers
- `admin`: System-wide access to all portals and data

### Frontend Architecture

**App Router Structure:**
- `app/(portal)/`: Protected portal routes with role-based layouts
  - `instructor/`: Instructor dashboard, students, classes, studios, payments
  - `dancer/`: Dancer dashboard, classes, notes, payments, profile
  - `studio/`: Studio admin dashboard and management
- `app/api/`: Server-side API routes for data operations
- Public routes: Landing page, login, signup, privacy policy, terms of service

**Component System:**
- Custom UI library in `components/ui/`: Button, Card, Input, Modal, Table, Toast, Spinner, Badge
- Reusable portal components: Sidebar, PortalLayout, Calendar, CommunicationsSection, SignaturePad
- Design system uses CSS variables via Tailwind's `@theme` directive

**Navigation (Updated November 2025):**
- Converted from horizontal top navbar to collapsible vertical sidebar for better scalability
- Sidebar features:
  - Rose-to-mauve gradient background with white text
  - Collapsible menu for mobile (toggle button)
  - Portal switcher for admin users (quick access to different portals)
  - Profile & sign-out in footer section
  - Icon-based menu items for visual clarity
- Responsive design: Fixed sidebar on desktop, overlay/toggle on mobile

**State Management:**
- React hooks for local state and API data fetching
- Custom `useUser()` hook for authentication state
- Toast notifications via React Context (`ToastProvider`)

### Database Schema

**Core Tables:**
- `profiles`: User accounts (extends Supabase auth.users)
- `students`: Dancer profiles with emergency contacts, skill levels, goals
- `studios`: Dance studio locations with contact information
- `classes`: Class sessions with pricing models (per_person, per_class, per_hour, tiered)
- `enrollments`: Student-class relationships with attendance tracking
- `notes`: Instructor feedback with visibility controls (private/shared)
- `payments`: Payment records with dual confirmation system
- `instructor_student_relationships`: Relationship tracking with granular permissions
- `private_lesson_requests`: Student requests for private lessons
- `studio_inquiries`: Public form submissions from studios
- `waivers`: Electronic waiver documents with signature tracking (NEW - November 2025)
- `waiver_signatures`: Signature events with audit trail (NEW - November 2025)
- `lesson_packs`: Pre-packaged lesson quantities for discount pricing (NEW - November 2025)
- `lesson_pack_purchases`: Student purchases of lesson packs (NEW - November 2025)
- `lesson_pack_usage`: Tracking of lessons used from purchased packs (NEW - November 2025)

**Pricing System:**
Four pricing models supported for classes:
1. **Per Person**: Charge per student (e.g., $25/student)
2. **Per Class**: Flat rate regardless of enrollment
3. **Per Hour**: Based on class duration
4. **Tiered**: Base cost for initial students + additional fee for extra students

**Security Features:**
- All tables have Row-Level Security (RLS) policies
- Automatic `updated_at` timestamp triggers
- Direct JWT metadata checks in policies (avoids recursive queries)
- Relationship-based access control for instructor-student data

### API Design

**RESTful Conventions:**
- GET: Fetch resources with query parameter filtering
- POST: Create new resources
- PUT/PATCH: Update existing resources
- DELETE: Remove resources

**Key API Routes:**
- `/api/students`: Student CRUD operations
- `/api/classes`: Class management with enrollment counts
- `/api/notes`: Notes with visibility filtering
- `/api/payments`: Payment tracking and confirmation
- `/api/studios`: Studio management
- `/api/dashboard`: Aggregated statistics for instructor portal
- `/api/studio-inquiries`: Studio inquiry form submissions
- `/api/relationships`: Instructor-student relationship management (admin only)
- `/api/waivers`: Waiver CRUD, fetching, and status management (NEW - November 2025)
- `/api/waivers/[id]/sign`: Electronic signature submission with image capture (NEW - November 2025)

**Error Handling:**
- Consistent JSON error responses with appropriate HTTP status codes
- Client-side toast notifications for user feedback
- Server-side logging for debugging

### Design System

**Color Palette (Ballet Noir):**
- Charcoal: Primary text and headings (#1a1a1a to #f8f8f8)
- Champagne: Backgrounds and surfaces (#faf8f5 to #2f2920)
- Ballet Pink: Muted dusty rose accents (#faf5f5 to #3a2828)
- Gold: Premium accents and CTAs (#faf8f0 to #654b28)

**Typography:**
- Headings: Cormorant Garamond (serif, elegant)
- Body: Manrope (sans-serif, readable)

**Responsive Design:**
- Mobile-first approach with Tailwind breakpoints
- Adaptive navigation (hamburger menu on mobile)
- Touch-friendly UI elements

## External Dependencies

### Third-Party Services

1. **Supabase** (Primary Backend)
   - PostgreSQL database hosting
   - Authentication service (email/password, phone)
   - Row-Level Security enforcement
   - Storage buckets (studio logos)
   - Real-time subscriptions (not currently used)

2. **Google Places API** (Optional)
   - Address autocomplete in studio forms
   - Component: `GooglePlacesInput.tsx`
   - Fallback to manual address entry if unavailable

### Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
REPLIT_DEV_DOMAIN=your_replit_domain (for dev mode)
```

### Database Setup Dependencies

**Critical Setup Step:**
The `supabase-schema.sql` file must be executed in Supabase SQL Editor before first use. This creates:
- All table schemas
- Row-Level Security policies
- Triggers for automatic timestamps
- Required indexes

**Migration Files:**
- `migrations/01-create-instructor-student-relationships.sql`: Relationship tracking
- `migrations/02-backfill-relationships.sql`: Populate existing relationships
- `migrations/03-update-rls-policies.sql`: Update security policies
- `migrations/04-add-missing-rls-policies.sql`: Additional RLS coverage
- `migrations/07-add-waivers-table.sql`: Waiver system with electronic signatures (NEW - November 2025)
  - Requires manual execution in Supabase SQL Editor
  - Creates `waivers` and `waiver_signatures` tables with RLS policies
  - Includes indexes for performance optimization

### NPM Dependencies

**Core:**
- `next` v16.0.3: Framework
- `react` v19.2.0: UI library
- `typescript` v5.8.2: Type safety

**Supabase:**
- `@supabase/supabase-js` v2.84.0: JavaScript client
- `@supabase/ssr` v0.7.0: Server-side rendering support

**Styling:**
- `tailwindcss` v4.0.15: Utility-first CSS
- `@tailwindcss/postcss` v4.1.17: PostCSS integration
- `autoprefixer` v10.4.22: CSS vendor prefixing

### Development Tools

- ESLint with `next/core-web-vitals` config
- TypeScript strict mode enabled
- Custom dev server on port 5000 for Replit compatibility

## Waiver Management System (NEW - November 2025)

**Overview:**
Electronic waiver system for managing private lesson agreements with canvas-based signature capture.

**Features:**
1. **Waiver Creation**: Instructors/admins can create waivers with custom content
2. **Electronic Signatures**: Canvas-based signature pad for capturing signatures
3. **Status Tracking**: Pending → Signed → Acknowledged workflow
4. **Audit Trail**: Records who signed, when, and from which device
5. **Storage Integration**: Signatures stored in Supabase storage with public URLs

**Workflow:**
- Instructor creates waiver and assigns to dancer/studio
- Recipient sees pending waiver in their portal
- Recipient signs electronically with SignaturePad component
- Signature saved to Supabase storage with metadata
- Status updates to "signed" with timestamp

**UI/Pages:**
- `/instructor/waivers`: Dashboard for creating and managing waivers
- `/dancer/waivers`: View and sign pending waivers
- `/dancer/waivers/[id]/sign`: Signature capture page
- `/studio/waivers`: Studio waiver management (future)

**Components:**
- `SignaturePad.tsx`: Canvas-based drawing component for signatures
  - Clear/Save buttons
  - Touch-friendly drawing with line smoothing
  - Data URL export for storage
- Waiver listing and detail views integrated into portals

**Database:**
- `waivers` table: Core waiver documents
- `waiver_signatures` table: Signature audit trail with IP/user-agent tracking
- Row-Level Security: Automatic visibility based on user roles

## Lesson Pack System (NEW - November 2025)

**Overview:**
Comprehensive lesson pack purchasing system allowing dancers to buy pre-packaged lessons at discounted rates and track usage across private lesson requests.

**Features:**
1. **Pre-packaged Offerings**: 2, 5, and 10 lesson packs with tiered pricing
2. **Stripe Integration**: Secure payment processing with session management
3. **Balance Tracking**: Real-time tracking of remaining lessons in purchased packs
4. **Automatic Usage**: Lessons automatically deducted when requesting private lessons
5. **Expiration Support**: Optional expiration dates for time-limited packs
6. **Payment History**: Full audit trail of purchases and usage

**Pricing Model:**
- 2 Lesson Pack: $250 ($125 per lesson)
- 5 Lesson Pack: $550 ($110 per lesson)
- 10 Lesson Pack: $1000 ($100 per lesson)

**Workflow:**
1. Dancer views "Request Lesson" page
2. LessonPackInfo component displays available packs and current balance
3. Student clicks "Buy Lesson Pack"
4. LessonPackSelector opens modal with purchase options
5. Stripe payment processed via Checkout session
6. Upon successful payment, `lesson_pack_purchases` record created
7. When requesting private lesson, system checks available packs first
8. If packs available, lesson deducted from most recent pack
9. If no packs, payment required as normal

**UI Components:**
- `LessonPackInfo.tsx`: Displays purchased packs and balance, initiates purchases
- `LessonPackSelector.tsx`: Modal for selecting pack quantity and processing purchase
- Integrated into `/dancer/request-lesson` form

**API Routes:**
- `GET /api/dancer/lesson-packs`: Fetch dancer's purchases and balance
- `POST /api/dancer/lesson-packs/purchase`: Initiate Stripe checkout session
- Webhook handling in Stripe integration for payment confirmation

**Database Setup:**
Execute `LESSON_PACKS_SETUP.sql` in Supabase SQL Editor to create:
- `lesson_packs` table: Available packs and pricing
- `lesson_pack_purchases` table: Student purchases with remaining count
- `lesson_pack_usage` table: Audit trail of lesson usage
- RLS policies for student/instructor access
- Indexes for performance optimization

**Integration Points:**
- Request Lesson form automatically uses packs before requiring payment
- Lesson pack usage tracked in `lesson_pack_usage` for analytics
- Payment workflow enhanced to check pack balance first
- Dancer portal displays pack balance and purchase history