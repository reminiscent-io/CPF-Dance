# Security Fixes Documentation

## Critical Security Updates Applied

This document outlines the security fixes that have been implemented to protect user data and enforce proper access control.

---

## 1. Database Row-Level Security (RLS)

### Status: **ACTION REQUIRED**

The application includes a complete schema file (`supabase-schema.sql`) with Row-Level Security (RLS) policies already defined. However, **you must execute this schema in your Supabase project** for the policies to take effect.

### How to Enable RLS:

1. Log in to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to the **SQL Editor** (left sidebar)
4. Open the file `supabase-schema.sql` from this repository
5. Copy the entire contents
6. Paste into the SQL Editor
7. Click **Run** to execute the schema

### What This Does:

The schema file includes RLS policies that:
- Ensure instructors can only access their own students' data
- Prevent dancers from accessing other dancers' private information
- Restrict studio admins to their own studio data
- Enforce visibility rules on notes (private vs shared)

**⚠️ WARNING:** Until you run this schema, database-level security is not active. The application-level security (API routes) provides protection, but RLS is an essential additional security layer.

---

## 2. API Route Role-Based Access Control (RBAC)

### Implemented Changes:

All API routes now enforce role-based access control at the server level. No route can be accessed without proper authentication and role verification.

### Protected Routes:

#### Instructor-Only Routes:
- `GET/POST /api/students` - Manage students
- `GET/PUT/DELETE /api/students/[id]` - Individual student operations
- `GET /api/dashboard` - Instructor dashboard statistics
- `POST/PUT/DELETE /api/studios` - Manage studios
- `POST /api/classes` - Create classes
- `POST /api/notes` - Create notes (instructors can create for any student)

#### Dancer-Only Routes:
- `GET /api/dancer/classes` - View enrolled classes
- `GET/POST/PUT/DELETE /api/dancer/notes` - Manage personal notes
- `GET/POST /api/dancer/lesson-requests` - Private lesson requests
- `GET /api/dancer/payments` - View payment history
- `GET /api/dancer/profile` - View profile
- `GET /api/dancer/stats` - View progress statistics

#### Mixed Access Routes:
- `GET /api/notes` - Instructors see all notes, dancers see only their own
- `GET /api/classes` - Both roles can view classes (filtered appropriately)

### Security Functions:

New helper functions in `lib/auth/server-auth.ts`:

```typescript
// Get current user with their role from the profiles table
getCurrentUserWithRole()

// Require a specific role or throw an error
requireRole(role: 'instructor' | 'dancer' | 'studio_admin')

// Get current dancer's student record
getCurrentDancerStudent()
```

---

## 3. Proxy Portal Protection

### Route Protection:

The proxy (`proxy.ts`) now enforces role-based portal access:

- `/instructor/*` - Only users with `role='instructor'` can access
- `/dancer/*` - Only users with `role='dancer'` can access
- `/studio/*` - Only users with `role='studio_admin'` can access

### Automatic Redirection:

If a user tries to access the wrong portal:
- Authenticated users are redirected to their correct portal based on role
- Unauthenticated users are redirected to `/login`

---

## 4. Data Isolation

### Dancer Data Protection:

All `/api/dancer/*` routes now:
1. Verify the user has `role='dancer'`
2. Look up the user's `student_id` from the `students` table
3. Filter ALL database queries to only return data for that specific `student_id`

This prevents dancers from:
- Accessing other dancers' notes
- Viewing other dancers' payment information
- Seeing other dancers' class attendance
- Accessing private lesson requests from other dancers

### Instructor Data Filtering:

Instructor routes ensure:
- Instructors can only manage students they teach
- Notes are filtered by visibility settings
- Dashboard statistics are scoped appropriately

---

## 5. Testing Security

### How to Verify Security:

1. **Test as Instructor:**
   - Create an account with `role='instructor'`
   - Verify access to `/instructor` portal
   - Confirm you CANNOT access `/dancer` routes
   - Try accessing `/api/dancer/notes` - should return 403 Forbidden

2. **Test as Dancer:**
   - Create an account with `role='dancer'`
   - Verify access to `/dancer` portal
   - Confirm you CANNOT access `/instructor` routes
   - Try accessing `/api/students` - should return 403 Forbidden

3. **Test Cross-Dancer Access:**
   - Create two dancer accounts
   - As Dancer A, try to access Dancer B's data by manipulating API calls
   - Should be blocked by server-side filtering

---

## 6. Security Best Practices

### What We've Implemented:

✅ Server-side role verification on all API routes
✅ Database Row-Level Security policies (requires execution)
✅ Middleware-level portal protection
✅ Data filtering based on user role and ownership
✅ Proper error handling without leaking information

### Additional Recommendations:

- **Regularly review RLS policies** in Supabase dashboard
- **Monitor API logs** for unauthorized access attempts
- **Keep dependencies updated** to patch security vulnerabilities
- **Use HTTPS** in production (handled by Replit/Vercel)
- **Rotate database credentials** periodically

---

## Support

If you encounter any security issues or have questions:
1. Check the console logs for detailed error messages
2. Verify your Supabase RLS policies are active
3. Ensure user profiles have correct role assignments
4. Review the middleware configuration

---

**Last Updated:** November 16, 2025
