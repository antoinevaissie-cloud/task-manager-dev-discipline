# Supabase Setup Guide

This guide walks you through setting up Supabase for the Task Manager application.

## Prerequisites

- Supabase account (sign up at https://supabase.com)
- Supabase CLI installed: `npm install -g supabase`
- Node.js 18+ installed

## Step 1: Create Supabase Project

### Option A: Via Supabase Dashboard (Recommended for first-time)

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in:
   - **Name:** `task-manager` (or your preferred name)
   - **Database Password:** Generate a strong password (save it!)
   - **Region:** Choose closest to you
   - **Pricing Plan:** Free tier is fine to start
4. Click "Create new project"
5. Wait 2-3 minutes for provisioning

### Option B: Via Supabase CLI (Advanced)

```bash
# Login to Supabase
supabase login

# Initialize Supabase in your project
cd /Users/macbook/Documents/Projects/task_management_1110
supabase init

# Link to a new remote project
supabase link --project-ref your-project-ref
```

## Step 2: Get Your Project Credentials

1. In your Supabase project dashboard, click **Settings** (gear icon)
2. Go to **API** section
3. Copy these values (you'll need them later):
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **API Key (anon public)** - Safe to use in frontend
   - **API Key (service_role)** - SECRET! Only for server/Edge Functions

## Step 3: Run Database Migrations

### Option A: Using SQL Editor in Dashboard

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy the contents of `supabase/migrations/20251014000001_initial_schema.sql`
4. Paste into the SQL editor
5. Click **Run** (bottom right)
6. Verify success (should see "Success. No rows returned")

### Option B: Using Supabase CLI (Recommended)

```bash
cd /Users/macbook/Documents/Projects/task_management_1110

# Push migrations to remote database
supabase db push

# Or apply specific migration
supabase db execute --file supabase/migrations/20251014000001_initial_schema.sql
```

## Step 4: Verify Database Setup

1. In Supabase dashboard, go to **Table Editor**
2. You should see two tables:
   - `projects`
   - `tasks`
3. Click on each table to verify columns match the schema
4. Go to **Authentication** → **Policies**
5. Verify RLS policies are enabled for both tables

## Step 5: Configure Authentication

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. **Email** provider should be enabled by default
3. Optional: Enable OAuth providers:
   - **Google**: Add OAuth credentials
   - **GitHub**: Add OAuth credentials
   - **Apple**: Add OAuth credentials

### Email Settings (Optional but Recommended)

1. Go to **Authentication** → **Email Templates**
2. Customize:
   - Confirmation email
   - Password reset email
   - Magic link email
3. For production, configure SMTP settings in **Project Settings** → **Auth**

## Step 6: Set Up Environment Variables

Create `.env` files for your application:

### Frontend (.env in web/ directory)

```bash
cd /Users/macbook/Documents/Projects/task_management_1110/web
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
EOF
```

### Edge Functions (.env in supabase/ directory)

```bash
cd /Users/macbook/Documents/Projects/task_management_1110/supabase
cat > .env << 'EOF'
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
OPENAI_API_KEY=your-openai-api-key-here
EOF
```

**⚠️ IMPORTANT:** Add `.env` to `.gitignore` to prevent committing secrets!

## Step 7: Install Supabase Client Libraries

### Frontend

```bash
cd /Users/macbook/Documents/Projects/task_management_1110/web
npm install @supabase/supabase-js
```

### Verify Installation

```bash
npm list @supabase/supabase-js
```

## Step 8: Test Database Connection

Create a simple test script:

```bash
cd /Users/macbook/Documents/Projects/task_management_1110/web
cat > test-supabase.js << 'EOF'
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection
const testConnection = async () => {
  const { data, error } = await supabase.from('tasks').select('count');
  if (error) {
    console.error('❌ Connection failed:', error.message);
  } else {
    console.log('✅ Connection successful!');
  }
};

testConnection();
EOF

node test-supabase.js
```

## Step 9: Enable Realtime (Optional)

1. In Supabase dashboard, go to **Database** → **Replication**
2. Enable replication for:
   - `tasks` table
   - `projects` table
3. This allows real-time subscriptions in your frontend

## Step 10: Set Up Edge Functions

### Deploy Rollover Function

```bash
cd /Users/macbook/Documents/Projects/task_management_1110

# Deploy the function
supabase functions deploy daily-rollover

# Set up secrets
supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Set Up Cron Job for Rollover

1. In Supabase dashboard, go to **Database** → **Extensions**
2. Enable `pg_cron` extension
3. Go to **SQL Editor** and run:

```sql
-- Schedule daily rollover at 2 AM UTC
SELECT cron.schedule(
  'daily-task-rollover',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/daily-rollover',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    )
  );
  $$
);
```

## Troubleshooting

### Can't connect to database
- Verify your project URL and anon key
- Check if project is fully provisioned (takes 2-3 min)
- Ensure no firewall blocking Supabase

### RLS policies blocking queries
- Make sure you're authenticated: `supabase.auth.getSession()`
- Verify `user_id` matches `auth.uid()` in policies
- For testing, you can temporarily disable RLS (NOT recommended for production)

### Migrations failing
- Check SQL syntax in migration files
- Ensure UUID extension is enabled
- Verify auth.users table exists (it's automatic)

### Edge Functions not deploying
- Ensure Supabase CLI is latest: `npm update -g supabase`
- Check function syntax (Deno TypeScript)
- Verify secrets are set: `supabase secrets list`

## Next Steps

After Supabase is set up:

1. ✅ Update frontend to use Supabase client (Step 5 in main TODO)
2. ✅ Add authentication UI (Step 3 in main TODO)
3. ✅ Set up OpenAI vector store (Step 6 in main TODO)
4. ✅ Deploy Edge Functions (Step 9 in main TODO)

## Useful Commands

```bash
# View project status
supabase status

# View logs
supabase functions logs daily-rollover

# Reset database (careful!)
supabase db reset

# Generate TypeScript types from database
supabase gen types typescript --local > web/src/types/database.types.ts
```

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)

