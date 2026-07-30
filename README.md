# MessMate

MessMate is a responsive React application for managing mess members, daily
meals, bazaar entries, private receipt images and monthly reports. Authentication
and workspace data are stored in Supabase, and the app is ready for Vercel.

## What is included

- Supabase email/password authentication
- Mess creation and secure code-based joining
- Manager/member permissions with Row Level Security (RLS)
- Member, meal and bazaar data stored in PostgreSQL
- Private bazaar receipt storage with signed image URLs
- Automatic meal-rate and member balance reports
- Responsive light/dark UI with premium buttons and animation
- Vercel SPA routing configuration

## 1. Create the database

1. Open your Supabase project.
2. Go to **SQL Editor** and create a new query.
3. Copy the complete contents of [`supabase/schema.sql`](supabase/schema.sql).
4. Run the query once.

The script creates tables, indexes, signup triggers, RPC functions, RLS
policies and the private `bazaar-receipts` storage bucket. Do not put a
`service_role` key in this frontend project.

## 2. Configure local environment

Windows Command Prompt:

```bat
copy .env.example .env.local
npm install
npm run dev
```

PowerShell:

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Run these commands from the folder that contains `package.json`. Open the local
URL printed by Vite.

The provided value is a Supabase publishable key. Publishable keys are designed
for browser apps; database access is protected by the RLS policies in the schema.

## 3. Configure Supabase Auth

In **Supabase Dashboard → Authentication → URL Configuration**:

- Use `http://localhost:5173` as a local redirect URL.
- After the first Vercel deployment, set **Site URL** to the Vercel production
  domain.
- Add both the production domain and any required Vercel preview pattern to the
  allowed redirect URLs.

Email confirmation can stay enabled. New users then need to confirm the email
before logging in. For short local testing, it can be disabled from the email
provider settings.

## 4. Deploy to Vercel

1. Push this project to GitHub, GitLab or Bitbucket.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Vercel will detect Vite. Keep:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add these environment variables for Production and Preview:

```text
VITE_SUPABASE_URL=https://haxlxeymqhdgtfvafrfk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_El8nVIyYsns9eyaRcQ5DBQ_pFgz4B_a
```

5. Deploy, then update the Supabase Auth URLs as described above.

`vercel.json` already contains the rewrite required for React Router routes such
as `/dashboard`, `/meals` and `/reports`.

## Quality checks

```bash
npm run lint
npm run build
```

## Database overview

- `profiles` — account profile
- `messes` — workspace and join code
- `members` — manager/member membership
- `meals` — per-member daily meal totals
- `bazaar_entries` — purchase headers and receipts
- `bazaar_items` — itemized bazaar rows

All application tables have RLS enabled. Members can view their mess data, while
writes are limited to the signed-in member or a manager as appropriate.
