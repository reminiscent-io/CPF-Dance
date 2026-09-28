<div align="center">

# ✨ CPF Dance

### *Where Precision Meets Passion*

A sophisticated platform designed for professional dance instructors to nurture the next generation of performers. From former Rockettes to rising stars, CPF Dance brings elegance and efficiency to dance education management.

**[Live Demo](#) • [Documentation](./CLAUDE.md) • [Database Setup](./docs/database-setup.md)**

---

</div>

## 🎭 About

CPF Dance is a full-featured dance studio management platform built specifically for professional instructors who demand excellence. Whether you're teaching pirouettes to aspiring ballerinas or choreographing the next Broadway sensation, CPF Dance handles the details so you can focus on what matters—the artistry.

## ✨ Features

### 👩‍🏫 Instructor Portal
*Complete control over your dance studio operations*

- **📊 Smart Dashboard** - Real-time stats, activity feeds, and quick actions at your fingertips
- **👥 Student Management** - Comprehensive profiles with emergency contacts, goals, and progress tracking
- **📝 Progress Notes** - Rich text feedback with customizable visibility (private, shared with student, guardian, or studio)
- **📅 Class Scheduling** - Intuitive calendar for group classes, private lessons, workshops, and master classes
- **💰 Payment Tracking** - Flexible pricing models (per-person, per-class, hourly, tiered) with attendance-based calculations
- **📄 Digital Waivers** - Create templates, issue to students, and collect digital signatures
- **🏢 Studio Locations** - Manage multiple venues with Google Places integration
- **🌐 Public Classes** - Promote open enrollment events with external booking system integration

### 💃 Dancer Portal
*Empowering students to track their journey*

- **📈 Personal Dashboard** - View upcoming classes, recent feedback, and progress stats
- **🎯 Progress Timeline** - Visual journey of instructor feedback and milestones
- **📖 Training Journal** - Private notes to document personal reflections and goals
- **🗓️ My Classes** - Enrolled class schedule with attendance history
- **🔍 Browse Classes** - Discover and enroll in public workshops and events
- **💬 Lesson Requests** - Request private coaching with status tracking
- **💳 Payment History** - Transparent view of all transactions
- **✍️ E-Signatures** - Sign waivers and consent forms digitally
- **👤 Profile Management** - Keep contact info and dance goals current

### 🔐 Admin & Security
*Enterprise-grade protection for your studio data*

- **🎭 Multi-Role System** - Instructor, Dancer, Guardian, and Admin roles with granular permissions
- **🛡️ Row-Level Security** - Database-enforced data isolation via Supabase RLS policies
- **🔄 Portal Switching** - Admin users can seamlessly access all portals
- **🚪 Guardian Consent** - Built-in age verification and parental consent workflow
- **🔒 XSS Prevention** - Automatic HTML sanitization for all user-generated content
- **✅ API Guards** - Server-side authentication checks on every endpoint

### 🎨 Design Excellence
*Beauty meets functionality*

- **🌹 Elegant Aesthetic** - Rose, mauve, and cream palette reflecting professional femininity
- **✍️ Premium Typography** - Playfair Display headings with Inter body text
- **📱 Mobile-First** - Fully responsive from phone to desktop
- **⚡ Modern Stack** - Built on Next.js 16 with React 19 and TypeScript
- **🎯 Accessible** - ARIA labels and keyboard navigation throughout

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) account
- (Optional) [Google Places API](https://developers.google.com/maps/documentation/places/web-service) key for address autocomplete

### Installation

```bash
# Clone the repository
git clone https://github.com/reminiscent-io/CPF-Dance.git
cd CPF-Dance

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### Database Setup

**⚠️ Critical: Run the database schema before first use!**

1. Open your [Supabase project](https://supabase.com) dashboard
2. Navigate to **SQL Editor**
3. Open `supabase-schema.sql` and copy all contents
4. Paste into SQL Editor and click **Run**
5. Apply any migrations from `migrations/` directory in numerical order
6. Verify tables appear in **Table Editor**

See [docs/database-setup.md](./docs/database-setup.md) for detailed instructions.

### Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your-google-api-key  # Optional
```

### Run Development Server

```bash
npm run dev
# Open http://localhost:5000 in your browser
```

### Create Your First Accounts

1. Navigate to `/signup`
2. Create an **Instructor** account for studio management
3. Create a **Dancer** account to experience the student portal
4. Explore both portals to see role-based features

## 📁 Project Structure

```
cpf-dance/
├── app/
│   ├── (portal)/              # Authenticated portal routes
│   │   ├── instructor/        # 9 instructor pages (dashboard, students, classes, etc.)
│   │   ├── dancer/            # 10 dancer pages (dashboard, classes, progress, etc.)
│   │   ├── login/             # Authentication pages
│   │   └── signup/
│   ├── api/                   # 45+ API endpoints
│   │   ├── auth/              # Signup, signin, signout
│   │   ├── students/          # Student CRUD operations
│   │   ├── classes/           # Class management
│   │   ├── notes/             # Progress notes
│   │   ├── waivers/           # Digital waiver management
│   │   ├── instructor/        # Instructor-specific routes
│   │   ├── dancer/            # Dancer-specific routes
│   │   └── places/            # Google Places integration
│   ├── page.tsx               # Public landing page
│   ├── privacy-policy/        # Legal pages
│   └── terms-of-service/
├── components/
│   ├── ui/                    # 10+ reusable UI components
│   │   ├── Button.tsx         # Variants: primary, secondary, outline, destructive
│   │   ├── Modal.tsx          # Dialog system
│   │   ├── GooglePlacesInput.tsx  # Address autocomplete
│   │   └── ...
│   ├── Sidebar.tsx            # Unified navigation with admin portal switcher
│   ├── Calendar.tsx           # Class scheduling calendar
│   ├── RichTextEditor.tsx     # TipTap-based WYSIWYG editor
│   ├── SignaturePad.tsx       # Digital signature capture
│   └── CreateWaiverTemplateDialog.tsx
├── lib/
│   ├── auth/
│   │   ├── server-auth.ts     # Role guards (requireInstructor, requireDancer)
│   │   └── privileges.ts      # Role privilege utilities
│   ├── supabase/
│   │   ├── client.ts          # Browser client
│   │   ├── server.ts          # Server-side client
│   │   └── middleware.ts      # Middleware session handling
│   ├── utils/
│   │   ├── pricing.ts         # Pricing model calculations
│   │   └── sanitize.ts        # XSS prevention (DOMPurify)
│   └── types/                 # TypeScript definitions
├── migrations/                # 13 database migrations
├── supabase-schema.sql        # Complete database schema with RLS
├── docs/                      # Setup guides, audits, plans
├── CLAUDE.md                  # Comprehensive project documentation
└── proxy.ts                   # Next.js 16 middleware for auth routing
```

## 🗄️ Database Architecture

Built on **PostgreSQL** via Supabase with comprehensive **Row-Level Security (RLS)** policies.

### Core Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `profiles` | User accounts | Four roles: instructor, dancer, guardian, admin |
| `students` | Dancer profiles | Can exist independently or link to dancer profiles |
| `classes` | Class sessions | Support for public classes, external booking URLs |
| `enrollments` | Class registration | Links students to classes with attendance tracking |
| `notes` | Progress feedback | Rich text with visibility controls |
| `payments` | Transaction history | Supports 4 pricing models with automatic calculations |
| `waivers` | Digital waivers | Template-based with e-signature capture |
| `waiver_templates` | Reusable waivers | Rich text or PDF format with variable substitution |
| `studios` | Studio locations | Google Places integration for addresses |
| `private_lesson_requests` | Lesson booking | Status tracking and instructor responses |

### Security Model

- **Three-Layer Protection**: Middleware proxy → API route guards → RLS policies
- **Data Isolation**: Instructors only see their students, dancers only see their own data
- **Admin Override**: Admin role can access all portals with most RLS bypasses
- **XSS Prevention**: All user-generated HTML sanitized via DOMPurify

See the [security audit](./docs/security-audit-2026-03-13.md) and the RLS policies in [migrations/](./migrations/) for details.

## 🎯 User Roles

### 👩‍🏫 Instructor
Full studio management capabilities including student profiles, class scheduling, progress notes, waiver issuance, payment tracking, and studio locations.

### 💃 Dancer
Access to personal dashboard, enrolled classes, progress timeline, training journal, lesson requests, payment history, and waiver signing.

### 👪 Guardian
View and manage information for dancers under 13, including class schedules, progress notes (when shared), and consent management.

### 🔑 Admin
Super-user access to all portals via sidebar switcher, can view cross-instructor data, and manage system-wide settings. Respects private note visibility.

## 🛠️ Technology Stack

<div align="center">

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Frontend** | React 19 with TypeScript |
| **Backend** | Next.js API Routes |
| **Database** | PostgreSQL (Supabase) |
| **Authentication** | Supabase Auth |
| **Styling** | Tailwind CSS v4 |
| **Rich Text** | TipTap Editor |
| **Maps** | Google Places API |
| **Security** | DOMPurify, RLS Policies |

</div>

## 🎨 Design Philosophy

CPF Dance balances professionalism with elegance, creating an interface that feels as refined as the art form it serves.

**Color Palette**
- Primary: Rose & Mauve tones
- Backgrounds: Cream & White
- Accents: Professional gold and deep plum

**Typography**
- Headings: Playfair Display (serif elegance)
- Body: Inter (modern readability)

**Experience**
- Mobile-first responsive design
- Subtle animations and transitions
- Accessible (WCAG 2.1 AA compliant)
- Intuitive navigation patterns

## 📚 Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Comprehensive development guide (architecture, patterns, best practices)
- **[PRODUCT.md](./PRODUCT.md)** / **[DESIGN.md](./DESIGN.md)** - Product context and design system
- **[docs/database-setup.md](./docs/database-setup.md)** - Step-by-step database configuration
- **[docs/security-audit-2026-03-13.md](./docs/security-audit-2026-03-13.md)** - Security audit findings and remediation status
- **[docs/class-pricing.md](./docs/class-pricing.md)** - Pricing model usage guide
- **[docs/google-integrations.md](./docs/google-integrations.md)** - Gmail and Calendar via Replit connectors
- **[docs/supabase-storage-setup.md](./docs/supabase-storage-setup.md)** - Assets storage bucket setup
- **[docs/profile-linking.md](./docs/profile-linking.md)** - Dual-email login via linked profiles
- **[docs/performance-optimization-notes.md](./docs/performance-optimization-notes.md)** - RLS performance work and follow-ups
- **[migrations/README.md](./migrations/README.md)** - Database migration instructions

## 🚀 Roadmap

### Current Features ✅
- Multi-role authentication system
- Instructor and dancer portals (19 pages total)
- Digital waiver management with e-signatures
- Flexible pricing models (4 types)
- Google Places integration
- Rich text editor for notes and waivers
- Admin portal switching
- Public class promotion

### Planned Enhancements 🎯
- **Payment Integration** - Stripe checkout and recurring billing
- **Guardian Portal** - Dedicated parent/guardian interface
- **Notifications** - Email and SMS alerts for classes and waivers
- **Calendar Sync** - iCal and Google Calendar export
- **Bulk Operations** - Mass waiver issuance and payment entry
- **Analytics Dashboard** - Studio performance metrics and insights

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository** and create a feature branch
2. **Follow the existing code style** - TypeScript, Prettier formatting
3. **Add tests** for new features when applicable
4. **Update documentation** in CLAUDE.md for architectural changes
5. **Test security** - Ensure RLS policies are maintained
6. **Submit a PR** with a clear description of changes

See [CLAUDE.md](./CLAUDE.md) for development patterns and best practices.

## 📜 License

This project is proprietary software. All rights reserved.

For licensing inquiries, please contact the project maintainers.

## 🙏 Acknowledgments

Built with passion for dance education excellence. Special thanks to:

- Professional dance instructors who provided invaluable feedback
- The Supabase team for an incredible backend platform
- The Next.js team for pushing the boundaries of React frameworks
- The open-source community for tools that made this possible

## 📧 Contact & Support

- **Documentation**: Start with [CLAUDE.md](./CLAUDE.md)
- **Issues**: Open a GitHub issue for bug reports
- **Questions**: Check existing issues or documentation first

## 🌟 Show Your Support

If CPF Dance helps your dance studio thrive, please consider:
- ⭐ Starring this repository
- 📢 Sharing with other dance instructors
- 🐛 Reporting bugs and suggesting features
- 💡 Contributing improvements

---

<div align="center">

**Built for professional dance education excellence**

*Empowering instructors to nurture the next generation of performers*

[Get Started](#-quick-start) • [Documentation](./CLAUDE.md) • [Report Bug](https://github.com/reminiscent-io/CPF-Dance/issues)

</div>
