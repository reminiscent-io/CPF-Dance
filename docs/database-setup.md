# Database Setup Instructions

## Step 1: Run the Schema in Supabase

1. Go to your Supabase project dashboard
2. Click on the **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase-schema.sql` and paste it into the query editor
5. Click **Run** (or press Ctrl/Cmd + Enter)
6. You should see "Success. No rows returned" message

## Step 2: Enable Phone Authentication

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Enable **Phone** provider
3. Configure your phone provider (Twilio recommended):
   - Add your Twilio credentials
   - Or use Supabase's built-in phone auth (limited free tier)

## Step 3: Verify the Schema

You can verify the tables were created by going to:
- **Table Editor** in the left sidebar
- You should see all tables: profiles, students, studios, classes, enrollments, notes, payments, etc.

## Database Structure Overview

### Core Tables
- **profiles**: User information (extends Supabase auth)
- **students**: Dancer-specific information
- **studios**: Dance studio locations
- **classes**: Individual class sessions
- **enrollments**: Links students to classes
- **notes**: Instructor feedback and student notes
- **payments**: Payment tracking with dual confirmation
- **private_lesson_requests**: Student requests for private lessons
- **studio_inquiries**: Public form submissions from studios

### Security
- Row Level Security (RLS) is enabled on all tables
- Instructors have full access to manage data
- Students/guardians can only see their own data
- Studio admins can see studio-specific data
