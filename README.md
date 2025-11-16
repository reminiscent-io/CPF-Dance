# Dance Teaching Schedule Management Platform

A professional, elegant web application for managing dance instruction, student progress tracking, scheduling, and payments. Built for precision dance instructors (like former Rockettes!) teaching the next generation of professional dancers.

## 🌟 Features Built

### ✅ Completed Features

#### **Authentication System**
- Email/password signup and login with role selection
- Role-based access control (Instructor, Dancer, Studio Admin)
- Protected routes with middleware
- Guardian consent flow for dancers under 13

#### **Instructor Portal** (`/instructor`)
- **Dashboard**: Overview stats, recent activity feed, quick actions
- **Student Management**: Full CRUD for student profiles, search/filter, emergency contacts
- **Notes System**: Tagged feedback with private/shared visibility options
- **Class Management**: Schedule group classes, private lessons, workshops, master classes
- **Studios Management**: Manage dance studio locations

#### **Dancer Portal** (`/dancer`)
- **Dashboard**: Stats overview, next class preview, recent notes
- **My Classes**: View enrolled classes with attendance tracking
- **Progress Timeline**: Visual timeline of all shared instructor notes with search/filter
- **Personal Notes**: Private training journal
- **Request Private Lessons**: Easy request form with status tracking
- **Payment History**: View all payments with summary stats
- **Profile Management**: Update personal information and goals

#### **Public Pages**
- Professional landing page with hero section, features, about section
- Studio inquiry form for new dance studios
- Responsive, mobile-first design

#### **Design System**
- Rose/Mauve/Cream color palette
- Playfair Display (headings) + Inter (body) fonts
- Reusable UI component library
- Professional feminine aesthetic
- Fully responsive

## 🚀 Quick Start

### 1. Setup Supabase Database

**IMPORTANT: You must run the database schema first!**

1. Go to your Supabase project at https://supabase.com
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase-schema.sql`
4. Paste and click **Run**
5. Verify tables in **Table Editor**

### 2. Configure Environment Variables

Already set in Replit Secrets:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon public key

### 3. Start Development

The app is already running! Visit the webview to see the landing page.

```bash
npm run dev  # Already running on port 5000
```

## 🔐 Test Accounts

After running the database schema, create test accounts:

1. Visit `/signup`
2. Create an **Instructor** account (for Courtney)
3. Create a **Dancer** account (for testing student features)
4. Each role has different access and features

## 📁 Project Structure

```
app/
├── (portal)/          # Portal routes (authenticated)
│   ├── instructor/    # Instructor portal pages
│   ├── dancer/        # Dancer portal pages
│   ├── studio/        # Studio admin portal pages
│   ├── login/         # Login page
│   └── signup/        # Signup page
├── api/              # API routes
│   ├── students/     # Student CRUD
│   ├── notes/        # Notes management
│   ├── classes/      # Class scheduling
│   ├── studios/      # Studios management
│   ├── dashboard/    # Instructor dashboard
│   └── dancer/       # Dancer-specific endpoints
├── layout.tsx        # Root layout
├── page.tsx          # Landing page
└── globals.css       # Global styles & theme

components/
├── ui/               # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Badge.tsx
│   ├── Modal.tsx
│   └── ...
├── Navigation.tsx    # Role-based navigation
└── PortalLayout.tsx  # Shared portal layout

lib/
├── auth/            # Authentication utilities
├── supabase/        # Supabase client setup
└── types/           # TypeScript type definitions
```

## 🗄️ Database Schema

See `supabase-schema.sql` for complete schema including:

- `profiles` - User accounts with roles
- `students` - Dancer profiles and details
- `studios` - Dance studio locations
- `classes` - Class sessions
- `enrollments` - Student class enrollments
- `notes` - Progress tracking and feedback
- `payments` - Payment records
- `private_lesson_requests` - Lesson requests
- `studio_inquiries` - Public inquiries

All tables have Row Level Security (RLS) policies for data protection.

## 🎯 User Roles & Permissions

### Instructor
- Manage all students and their profiles
- Create and track progress notes
- Schedule and manage classes
- Manage studio locations
- View all payments and requests

### Dancer
- View personal schedule and enrolled classes
- See shared instructor notes and progress
- Create private training notes
- Request private lessons
- View payment history
- Update profile

### Studio Admin
- View studio-specific data
- Submit cash/check payments
- Access class confirmations
- View payment history

## ⚠️ Critical Next Steps

### Before Production Use:

1. **Database Schema Applied** ✅ (You need to run this!)
   - Run `supabase-schema.sql` in your Supabase SQL Editor
   - This enables Row Level Security and all access policies

2. **Add API Role Authorization** 🔴 (Security Issue)
   - Current API routes check auth but not roles
   - Need role verification in each endpoint
   - Prevents unauthorized access between portals

3. **Phone OTP Authentication** 🟡 (Optional Enhancement)
   - Currently using email/password
   - Your plan mentioned phone OTP
   - Supabase supports phone auth natively

4. **Complete Studio Portal** 🟡
   - Cash/check submission workflow
   - Class confirmation interface
   - Payment reconciliation

5. **Integrate Stripe Payments** 🟡
   - Private lesson payments
   - Receipt generation
   - Webhook handling

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS v4
- **Hosting**: Replit

## 📝 Additional Documentation

- `DATABASE_SETUP.md` - Detailed database instructions
- `supabase-schema.sql` - Complete database schema
- `.env.example` - Environment variable template

## 🎨 Design Philosophy

Balancing professionalism with feminine elegance:
- Sophisticated rose and mauve accents
- Clean white and cream backgrounds
- Modern, elegant typography
- Subtle animations and transitions
- Mobile-first, fully responsive
- Accessible with ARIA labels

## 🤝 Support

Documentation:
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Built for professional dance education excellence** 💃
