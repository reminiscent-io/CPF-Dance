# Dance Teaching Schedule Management Platform

## Overview

A Next.js web application for professional dance instruction management. The platform supports multiple user roles (instructors, dancers, studio admins, system admins) with robust role-based access control. It enables comprehensive management of students, classes, schedules, payments, notes, and studio operations, aiming to streamline administrative tasks and enhance the teaching experience. Key capabilities include a new electronic waiver system and a lesson pack purchasing system for dancers.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Updates

- **December 9, 2025**: Added loading indicators to login buttons on homepage for better UX feedback

## System Architecture

### Authentication & Authorization

A multi-layered security model ensures robust access control:
1.  **Proxy Middleware**: Enforces portal-level authentication and role-based routing (e.g., `/instructor`, `/dancer`).
2.  **Row-Level Security (RLS)**: Supabase policies provide database-level access control, utilizing JWT metadata for role checking and relationship-based access.
3.  **Server-Side Authorization**: API routes are protected with `requireRole()` helpers, ensuring all data operations respect user permissions.
4.  **Privilege Helper System**: Centralized functions (`hasInstructorPrivileges`, `hasStudioPrivileges`, `hasDancerPrivileges`) for consistent role-checking across the codebase.

**User Roles:** `instructor`, `dancer`, `studio`/`studio_admin`, `guardian`, `admin`.

### Frontend Architecture

Built with Next.js App Router for structured, role-based portals (e.g., `app/(portal)/instructor/`). A custom UI library (`components/ui/`) provides reusable components based on a defined design system. Navigation utilizes a collapsible vertical sidebar for improved scalability and responsiveness. State management primarily uses React hooks and a custom `useUser()` hook for authentication.

### Database Schema

Core tables include `profiles`, `students`, `studios`, `classes`, `enrollments`, `notes`, `payments`, and `instructor_student_relationships`. New additions include `waivers`, `waiver_signatures`, `lesson_packs`, `lesson_pack_purchases`, and `lesson_pack_usage`. All tables implement Row-Level Security (RLS). The system supports four class pricing models: Per Person, Per Class, Per Hour, and Tiered.

### API Design

Follows RESTful conventions for CRUD operations. Key API routes exist for managing students, classes, notes, payments, studios, and new routes for waivers and lesson packs (e.g., `/api/waivers`, `/api/dancer/lesson-packs`). Error handling provides consistent JSON responses and client-side feedback. An `GET /api/instructor/class-earnings` endpoint provides an earnings dashboard.

### Design System

**Color Palette (Ballet Noir):** Charcoal, Champagne, Ballet Pink, Gold.
**Typography:** Cormorant Garamond (headings), Manrope (body).
**Responsive Design:** Mobile-first approach with Tailwind CSS, adaptive navigation, and touch-friendly UI.

### Waiver Management System

An electronic waiver system for private lesson agreements, featuring waiver creation, canvas-based electronic signatures, status tracking (Pending → Signed → Acknowledged), and an audit trail for signatures. Signatures are stored in Supabase storage.

### Lesson Pack System

Enables dancers to purchase pre-packaged lessons at discounted rates. Features include pre-packaged offerings (2, 5, 10 lessons), integration with Stripe for secure payments, real-time balance tracking, automatic lesson deduction upon request, and optional expiration dates.

### Class Earnings Dashboard

Integrated into the instructor payments page, this dashboard calculates expected class value based on pricing models and enrollment, distinguishing between collected and outstanding payments. It offers breakdowns by class type and date range filtering.

## External Dependencies

### Third-Party Services

1.  **Supabase**: Primary backend for PostgreSQL database, Authentication, Row-Level Security, and Storage.
2.  **Google Places API**: (Optional) Used for address autocomplete in studio forms.

### Environment Variables Required

-   `NEXT_PUBLIC_SUPABASE_URL`
-   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
-   `REPLIT_DEV_DOMAIN` (for dev mode)

### Database Setup Dependencies

The `supabase-schema.sql` file must be executed initially to set up all tables, RLS policies, and triggers. Subsequent migrations (e.g., `migrations/07-add-waivers-table.sql`, `LESSON_PACKS_SETUP.sql`) introduce new features like waivers and lesson packs.

### NPM Dependencies

Key dependencies include `next` (v16), `react` (v19), `typescript` (v5), `@supabase/supabase-js`, `@supabase/ssr`, `tailwindcss` (v4), `@tailwindcss/postcss`, and `autoprefixer`.