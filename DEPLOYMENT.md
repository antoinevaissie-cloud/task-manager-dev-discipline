# Deployment Guide - Task Manager with Supabase + OpenAI

This guide will walk you through deploying your Task Manager application to production.

## Architecture Overview

```
Frontend (Vercel/Netlify) → Supabase (Database + Auth + Functions) → OpenAI (Vector Store)
```

## Prerequisites

- GitHub account (for deployment)
- Vercel or Netlify account (free tier works)
- Supabase account (free tier works)
- OpenAI API key with credits

## Part 1: Supabase Setup (Backend)

### 1.1 Create Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Enter:
   - **Name:** task-manager-production
   - **Database Password:** Strong password (save it!)
   - **Region:** Choose closest to your users
4. Wait 2-3 minutes for provisioning

### 1.2 Run Database Migrations

**Option A: Via SQL Editor (Easiest)**

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy contents of `supabase/migrations/20251014000001_initial_schema.sql`
4. Paste and click **Run**
5. Verify success

**Option B: Via Supabase CLI**

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
cd /Users/macbook/Documents/Projects/task_management_1110
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

### 1.3 Configure Authentication

1. Go to **Authentication** → **Providers**
2. **Email** is enabled by default
3. Optional: Enable OAuth providers (Google, GitHub)
4. Go to **Authentication** → **URL Configuration**
5. Add your production URL: `https://your-app.vercel.app`

### 1.4 Get API Credentials

1. Go to **Settings** → **API**
2. Copy and save:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (keep secret!)

### 1.5 Deploy Edge Functions

```bash
cd /Users/macbook/Documents/Projects/task_management_1110

# Deploy rollover function
supabase functions deploy daily-rollover

# Deploy vector sync function
supabase functions deploy sync-vector-store

# Set secrets
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set OPENAI_API_KEY=sk-your-openai-key
supabase secrets set OPENAI_VECTOR_STORE_ID=vs_your-vector-store-id
supabase secrets set OPENAI_ASSISTANT_ID=asst_your-assistant-id
```

### 1.6 Set Up Cron Jobs

In **SQL Editor**, run:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Daily rollover at 2 AM UTC
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

-- Daily vector sync at 3 AM UTC
SELECT cron.schedule(
  'daily-vector-sync',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/sync-vector-store',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    )
  );
  $$
);
```

### 1.7 Enable Realtime

1. Go to **Database** → **Replication**
2. Enable replication for:
   - `tasks` table
   - `projects` table

## Part 2: OpenAI Setup

Follow the detailed guide in `OPENAI_SETUP.md`:

1. Create Vector Store
2. Create Assistant
3. Set up secrets in Supabase
4. Run initial sync

Quick setup:

```bash
# Create vector store (via API or dashboard)
# Create assistant (via API or dashboard)
# Set secrets (already done in Part 1.5)

# Trigger initial sync
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/sync-vector-store' \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Part 3: Frontend Deployment

### Option A: Deploy to Vercel (Recommended)

#### 3.1 Prepare Repository

```bash
cd /Users/macbook/Documents/Projects/task_management_1110

# Ensure all changes are committed
git add -A
git commit -m "Prepare for deployment"
git push origin main
```

#### 3.2 Deploy to Vercel

**Via Vercel Dashboard:**

1. Go to https://vercel.com
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `web`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

5. **Environment Variables** (click "Add"):
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

6. Click "Deploy"
7. Wait 2-3 minutes

**Via Vercel CLI:**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd /Users/macbook/Documents/Projects/task_management_1110/web
vercel

# Follow prompts, then:
vercel --prod
```

#### 3.3 Update Supabase with Production URL

1. Copy your Vercel deployment URL (e.g., `https://task-manager.vercel.app`)
2. Go to Supabase → **Authentication** → **URL Configuration**
3. Update **Site URL** to your Vercel URL
4. Add to **Redirect URLs**

### Option B: Deploy to Netlify

#### 3.1 Build Configuration

Create `netlify.toml` in project root:

```toml
[build]
  base = "web"
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### 3.2 Deploy

**Via Netlify Dashboard:**

1. Go to https://netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect GitHub repository
4. Configure:
   - **Base directory:** `web`
   - **Build command:** `npm run build`
   - **Publish directory:** `web/dist`

5. **Environment Variables**:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

6. Click "Deploy site"

**Via Netlify CLI:**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
cd /Users/macbook/Documents/Projects/task_management_1110/web
netlify deploy --prod
```

#### 3.3 Update Supabase with Production URL

Same as Vercel (Part 3.3)

## Part 4: Post-Deployment

### 4.1 Verify Deployment

1. **Visit your app URL**
2. **Sign up** with a new account
3. **Create a task**
4. **Test all features:**
   - Task creation/editing
   - Priority changes
   - Date changes
   - Project assignment
   - Completion
   - Mobile responsive sidebar

### 4.2 Test Real-time Updates

1. Open app in two browser tabs
2. Create/update task in one tab
3. Verify it updates in the other tab instantly

### 4.3 Test Authentication

1. Sign out
2. Sign in again
3. Try OAuth (if enabled)

### 4.4 Test OpenAI Integration

1. Create several tasks
2. Wait for vector sync (or trigger manually)
3. Ask ChatGPT: "List my tasks for today"
4. Verify it returns your tasks

### 4.5 Monitor Edge Functions

```bash
# View rollover logs
supabase functions logs daily-rollover

# View sync logs
supabase functions logs sync-vector-store
```

## Part 5: Domain Setup (Optional)

### Vercel Custom Domain

1. Go to Project → **Settings** → **Domains**
2. Add your domain (e.g., `tasks.yourdomain.com`)
3. Follow DNS instructions
4. Update Supabase **Site URL**

### Netlify Custom Domain

1. Go to Site → **Domain management**
2. Add custom domain
3. Follow DNS instructions
4. Update Supabase **Site URL**

## Part 6: Ongoing Maintenance

### Monitor Usage

- **Supabase:** Check database size, function invocations
- **Vercel/Netlify:** Check bandwidth, build minutes
- **OpenAI:** Monitor API usage and costs

### Update Environment Variables

If you need to update keys:

**Vercel:**
1. Project → **Settings** → **Environment Variables**
2. Edit and redeploy

**Netlify:**
1. Site → **Site configuration** → **Environment variables**
2. Edit and redeploy

### Database Backups

Supabase automatically backs up your database daily (free tier: 7 days retention).

Manual backup:
```bash
# Export database
supabase db dump > backup.sql

# Restore if needed
supabase db reset
psql -h your-db-host -U postgres -d postgres < backup.sql
```

## Troubleshooting

### Build Fails

**Error:** "Module not found"
- Check `package.json` dependencies
- Run `npm install` locally to verify
- Clear Vercel/Netlify build cache

**Error:** "Environment variable not set"
- Verify env vars in deployment platform
- Ensure they start with `VITE_`
- Redeploy after adding

### Authentication Not Working

- Check Supabase **Site URL** matches your deployment URL
- Verify **Redirect URLs** include your domain
- Check browser console for CORS errors

### Realtime Not Working

- Enable replication in Supabase
- Check network tab for WebSocket connections
- Verify RLS policies

### Edge Functions Failing

```bash
# Check logs
supabase functions logs daily-rollover --tail

# Common issues:
# - Missing secrets
# - Incorrect URL in cron job
# - RLS blocking service role
```

### ChatGPT Not Finding Tasks

- Verify vector sync ran successfully
- Check OpenAI Assistant configuration
- Ensure user_id is in metadata
- Trigger manual sync

## Security Checklist

- ✅ Never commit `.env` files
- ✅ Use `service_role` key only in Edge Functions
- ✅ RLS policies enabled on all tables
- ✅ HTTPS enforced (automatic on Vercel/Netlify)
- ✅ Strong database password
- ✅ OAuth apps configured with correct redirect URLs

## Cost Estimates

**Free Tier (Minimal usage):**
- Supabase: Free (500MB DB, 2GB storage, 2GB egress)
- Vercel/Netlify: Free (100GB bandwidth)
- OpenAI: ~$5-10/month (embeddings + queries)

**Total:** ~$5-10/month

**Moderate Usage (1000+ tasks, 100+ users):**
- Supabase: $25/month (Pro tier)
- Vercel/Netlify: Free or $20/month
- OpenAI: ~$20-50/month

**Total:** ~$45-95/month

## Support

- **Supabase Docs:** https://supabase.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Netlify Docs:** https://docs.netlify.com
- **OpenAI Docs:** https://platform.openai.com/docs

## Next Steps

After deployment:

1. Monitor error logs and usage
2. Set up custom domain
3. Configure OAuth providers
4. Customize email templates in Supabase
5. Add more features (see README for roadmap)

