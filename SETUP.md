# Clausr — Complete Setup Guide
## Step-by-step manual configuration for every service

---

## OVERVIEW OF WHAT YOU NEED TO SET UP

| Service     | Purpose                          | Cost          | Time  |
|-------------|----------------------------------|---------------|-------|
| Supabase    | Database + Auth + Storage        | Free          | 10 min|
| Vercel      | Hosting + Auto-deploy            | Free          | 5 min |
| Resend      | Email alerts                     | Free (3k/mo)  | 3 min |
| Razorpay    | Payment processing               | Free to start | 10 min|
| GitHub      | Code repository + CI/CD          | Free          | 3 min |

**Total estimated setup time: ~30 minutes**

---

## STEP 1 — SUPABASE SETUP

### 1.1 Create a Supabase project

1. Go to https://supabase.com and sign up (free)
2. Click **"New project"**
3. Fill in:
   - **Name:** clausr
   - **Database Password:** (generate a strong password — save it!)
   - **Region:** ap-south-1 (Mumbai) for India
4. Click **"Create new project"**
5. Wait ~2 minutes for provisioning

### 1.2 Get your API keys

1. In your Supabase project, go to **Settings → API**
2. Copy these values — you'll need them in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL        → "Project URL" field
NEXT_PUBLIC_SUPABASE_ANON_KEY   → "anon / public" key under "Project API keys"
SUPABASE_SERVICE_ROLE_KEY       → "service_role" key (click to reveal)
```

⚠️ **NEVER expose your service_role key in client-side code.**

### 1.3 Run the database schema

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file `supabase/schema.sql` from this project
4. Paste the entire contents into the SQL editor
5. Click **"Run"** (or press Ctrl+Enter)
6. You should see: "Success. No rows returned"

This creates:
- All 7 tables (organisations, members, profiles, contracts, alerts, activity_log, invitations)
- Row Level Security policies for all tables
- Triggers for auto-creating profiles, alerts, and status updates
- Storage bucket for contract PDF files
- pg_cron job for daily alert emails
- All performance indexes

### 1.4 Configure Authentication

1. Go to **Authentication → Providers** in Supabase
2. **Email provider** (already enabled by default):
   - Enable "Confirm email" — toggle ON
   - Set your "Site URL" to: `http://localhost:3000` (for dev)
   - Add redirect URL: `http://localhost:3000/auth/callback`

3. **Google OAuth** (optional but recommended):
   - Click **Google** provider
   - Toggle to **Enable**
   - You'll need a Google OAuth Client ID and Secret:
     - Go to https://console.cloud.google.com
     - Create a new project (or use existing)
     - Go to **APIs & Services → Credentials**
     - Click **"Create Credentials" → OAuth client ID**
     - Application type: **Web application**
     - Authorized redirect URIs: add `https://[your-project-id].supabase.co/auth/v1/callback`
     - Copy the **Client ID** and **Client Secret**
   - Paste them into Supabase's Google provider settings
   - Click **Save**

4. **Email templates** (optional customization):
   - Go to **Authentication → Email Templates**
   - You can customize the confirmation email to match Clausr branding

### 1.5 Configure Storage

1. Go to **Storage** in Supabase sidebar
2. The schema SQL already created the `contracts` bucket
3. Verify it exists — you should see a bucket named "contracts"
4. The bucket is set to **private** (correct — users need auth to access files)

### 1.6 Configure pg_cron for alert emails

The schema SQL schedules the cron job, but you need to set two config variables:

1. Go to **Settings → Database → Extensions**
2. Ensure `pg_cron` is enabled (toggle ON if not)
3. Also enable `pg_net` — this allows Postgres to make HTTP requests

4. Go to **Settings → Database → Configuration**
5. Add these custom config parameters:
   - Key: `app.api_url`  → Value: `https://your-vercel-domain.vercel.app` (update after Vercel deploy)
   - Key: `app.cron_secret` → Value: any random string like `clausr_cron_2026_secret`

6. Copy the `app.cron_secret` value — add it to `.env.local` as:
   ```
   CRON_SECRET=clausr_cron_2026_secret
   ```

> 💡 **Alternative for cron:** If pg_net isn't available, use Vercel Cron (see Step 5)

---

## STEP 2 — RESEND SETUP (Free email alerts)

### 2.1 Create a Resend account

1. Go to https://resend.com and sign up (free)
2. Free tier includes **3,000 emails/month** — more than enough to start

### 2.2 Get your API key

1. In Resend dashboard, go to **API Keys**
2. Click **"Create API Key"**
3. Name it: `clausr-alerts`
4. Permission: **Full access**
5. Copy the key — add to `.env.local`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   ```

### 2.3 Add and verify your sending domain

**Option A: Use Resend's shared domain (quickest to start)**
- Change the `from` address in `src/lib/resend.ts` to:
  ```
  from: 'Clausr Alerts <onboarding@resend.dev>'
  ```
- This works immediately without domain setup

**Option B: Use your own domain (recommended for production)**
1. In Resend, go to **Domains → Add Domain**
2. Enter your domain (e.g., clausr.com)
3. Add the DNS records Resend shows you (TXT, MX records) in your domain registrar
4. Click **Verify** — takes 5–30 minutes
5. Once verified, update `src/lib/resend.ts`:
   ```
   from: 'Clausr Alerts <alerts@clausr.com>'
   ```

---

## STEP 3 — RAZORPAY SETUP

### 3.1 Create a Razorpay account

1. Go to https://razorpay.com and sign up
2. Complete KYC verification (required for live payments, takes 1–2 days)
3. For **testing**, you can use the dashboard immediately without KYC

### 3.2 Get API keys

1. In Razorpay dashboard, go to **Settings → API Keys**
2. For **Test mode** (to start):
   - Click **"Generate Test Key"**
   - Copy:
     - Key ID: starts with `rzp_test_`
     - Key Secret: shown only once — copy immediately!
3. Add to `.env.local`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_secret_here
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
   ```

### 3.3 Test payment credentials

In test mode, use these card details on the checkout:
- Card: `4111 1111 1111 1111`
- Expiry: Any future date
- CVV: Any 3 digits
- OTP: `1234`

### 3.4 Switch to live mode (when ready)

1. Complete KYC in Razorpay dashboard
2. Go to **Settings → API Keys → Live Mode**
3. Generate live keys (starts with `rzp_live_`)
4. Replace the test keys in your production environment variables

---

## STEP 4 — LOCAL DEVELOPMENT SETUP

### 4.1 Clone and install

```bash
# 1. Extract the zip and enter the folder
cd clausr

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.local.example .env.local

# 4. Fill in your keys from steps 1–3
nano .env.local   # or open in your editor
```

### 4.2 Fill in .env.local

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx

# Resend
RESEND_API_KEY=re_xxxxxxxxxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=your_random_cron_secret
```

### 4.3 Run the development server

```bash
npm run dev
```

Open http://localhost:3000 — you should see the Clausr landing page.

### 4.4 Test the full flow

1. Click **"Start free"** → fill in signup form
2. Check your email for the confirmation link
3. Click the confirmation link → you're redirected to `/dashboard`
4. Click **"Add contract"** → add a test contract with an end date 25 days from today
5. The contract should appear as "Expiring" in the dashboard
6. Go to **Calendar** — you should see the contract on the correct date
7. Go to **Billing** → click "Upgrade to Starter" → use test card `4111 1111 1111 1111`
8. After payment, your plan should update to "Starter"

---

## STEP 5 — VERCEL DEPLOYMENT

### 5.1 Push to GitHub

```bash
# In the clausr folder:
git init
git add .
git commit -m "Initial Clausr MVP"
git remote add origin https://github.com/your-username/clausr.git
git push -u origin main
```

### 5.2 Deploy to Vercel

1. Go to https://vercel.com and sign up (free)
2. Click **"New Project"**
3. Import your GitHub repository
4. Framework preset: **Next.js** (auto-detected)
5. Click **"Environment Variables"** — add all variables from `.env.local`:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | your supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key |
| `RAZORPAY_KEY_ID` | rzp_test_... |
| `RAZORPAY_KEY_SECRET` | your secret |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | rzp_test_... |
| `RESEND_API_KEY` | re_... |
| `NEXT_PUBLIC_APP_URL` | https://your-app.vercel.app |
| `CRON_SECRET` | your cron secret |

6. Click **"Deploy"**
7. Wait 2–3 minutes — Vercel builds and deploys automatically

### 5.3 Update Supabase with your production URL

After Vercel gives you a URL (e.g., `https://clausr.vercel.app`):

1. Go to Supabase → **Authentication → URL Configuration**
2. Update **Site URL** to: `https://clausr.vercel.app`
3. Add to **Redirect URLs**: `https://clausr.vercel.app/auth/callback`

4. Update the pg_cron config:
   - Go to **Settings → Database → Configuration**
   - Update `app.api_url` to: `https://clausr.vercel.app`

### 5.4 Set up Vercel Cron (alternative to pg_cron)

If pg_net isn't working with Supabase, use Vercel Cron instead:

1. Create `vercel.json` in your project root:
```json
{
  "crons": [
    {
      "path": "/api/alerts/send",
      "schedule": "30 2 * * *"
    }
  ]
}
```

2. Update `src/app/api/alerts/send/route.ts` — remove the secret check for GET, or use Vercel's built-in auth header.

3. Add to `.env.local` on Vercel:
   ```
   CRON_SECRET=your_secret
   ```

> Note: Vercel Cron requires **Pro plan** ($20/mo). pg_cron via Supabase is free.

---

## STEP 6 — POST-DEPLOYMENT CHECKLIST

Run through this checklist after deploying:

- [ ] Visit your Vercel URL — landing page loads correctly
- [ ] Sign up with a new account — confirmation email arrives
- [ ] Confirm email — redirected to dashboard
- [ ] Add a contract — appears in list and calendar
- [ ] Contract with end date <30 days shows as "Expiring"
- [ ] Billing page loads and shows plan correctly
- [ ] Test payment with `4111 1111 1111 1111` — plan upgrades
- [ ] Manually trigger alert: `POST /api/alerts/send` with header `x-cron-secret: your_secret`

---

## STEP 7 — CUSTOM DOMAIN (Optional)

### 7.1 Buy a domain

- Namecheap.com: clausr.in (~₹900/yr) or clausr.app (~₹1,500/yr)
- GoDaddy.com: similar prices

### 7.2 Connect to Vercel

1. In Vercel project → **Settings → Domains**
2. Add your domain (e.g., clausr.in)
3. Vercel shows you two DNS records to add (CNAME or A record)
4. In your domain registrar's DNS settings, add those records
5. Wait 5–30 minutes for propagation
6. Vercel auto-provisions an SSL certificate

### 7.3 Update all URLs

After adding your custom domain:
1. Update `NEXT_PUBLIC_APP_URL` in Vercel env vars to `https://clausr.in`
2. Update Supabase redirect URLs to include `https://clausr.in/auth/callback`
3. Update Supabase `app.api_url` to `https://clausr.in`
4. Redeploy Vercel (push any commit or trigger manual redeploy)

---

## TROUBLESHOOTING

### "User not found" on login
- Check that the user confirmed their email
- Go to Supabase → Authentication → Users to see the status

### "Contract limit reached" immediately
- The free plan allows 5 contracts
- Check `organisations` table in Supabase Table Editor to verify `contract_limit = 5`

### Alerts not sending
- Verify `RESEND_API_KEY` is correct
- Check that `CRON_SECRET` matches in both env and Supabase config
- In Resend dashboard, check the "Logs" section for delivery status
- Manually test: `curl -X POST https://your-app.vercel.app/api/alerts/send -H "x-cron-secret: your_secret"`

### Google OAuth not working
- Verify the redirect URI in Google Console matches exactly: `https://[project-id].supabase.co/auth/v1/callback`
- Check that Google provider is enabled in Supabase Auth settings

### Razorpay payment fails
- In test mode, only use the test card: `4111 1111 1111 1111`
- Verify `RAZORPAY_KEY_SECRET` is correct (not the key ID)
- Check Razorpay dashboard → Payments for error details

### File upload failing
- Check that the `contracts` storage bucket exists in Supabase Storage
- Verify RLS policies were created (run the SQL schema again if needed)
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly

---

## PROJECT STRUCTURE

```
clausr/
├── src/
│   ├── app/
│   │   ├── (app)/                    ← All authenticated pages (sidebar layout)
│   │   │   ├── layout.tsx            ← Sidebar navigation
│   │   │   ├── dashboard/page.tsx    ← Home dashboard with stats
│   │   │   ├── contracts/
│   │   │   │   ├── page.tsx          ← Contracts list
│   │   │   │   ├── new/page.tsx      ← Add contract form
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      ← Contract detail
│   │   │   │       ├── edit/page.tsx ← Edit contract
│   │   │   │       └── ContractActions.tsx
│   │   │   ├── calendar/page.tsx     ← Monthly calendar
│   │   │   ├── billing/
│   │   │   │   ├── page.tsx          ← Pricing + upgrade
│   │   │   │   └── RazorpayButton.tsx
│   │   │   └── settings/page.tsx     ← Profile + team
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── callback/route.ts     ← OAuth callback
│   │   │   └── signout/route.ts
│   │   ├── api/
│   │   │   ├── onboard/route.ts      ← Creates org on signup
│   │   │   ├── alerts/send/route.ts  ← Sends alert emails (called by cron)
│   │   │   └── billing/
│   │   │       ├── create-order/route.ts ← Razorpay order
│   │   │       └── verify/route.ts       ← Verify + update plan
│   │   ├── page.tsx                  ← Landing page
│   │   ├── layout.tsx                ← Root layout
│   │   └── globals.css
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             ← Browser Supabase client
│   │   │   ├── server.ts             ← Server Supabase client
│   │   │   └── middleware.ts         ← Auth middleware helper
│   │   ├── resend.ts                 ← Email alert sender
│   │   └── utils.ts                  ← Shared utilities
│   ├── components/
│   │   └── ui/toaster.tsx            ← Toast notifications
│   ├── types/index.ts                ← TypeScript types
│   └── middleware.ts                 ← Route protection
├── supabase/
│   └── schema.sql                    ← Full DB schema (run this in Supabase)
├── .env.local.example                ← Copy to .env.local and fill in
├── package.json
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## TECH STACK SUMMARY

| Layer     | Technology     | Why                                    |
|-----------|----------------|----------------------------------------|
| Frontend  | Next.js 14     | SSR, App Router, TypeScript            |
| Styling   | Tailwind CSS   | Utility-first, fast development        |
| Backend   | Supabase       | Postgres + Auth + Storage + Realtime   |
| Payments  | Razorpay       | India-native, UPI + cards support      |
| Email     | Resend.com     | Best deliverability, 3k/mo free        |
| Hosting   | Vercel         | Zero-config Next.js deploy             |
| Domain    | Namecheap      | ₹900/yr for .in domains                |

**Monthly cost before revenue: ₹75 (domain only)**

---

## WHAT TO BUILD NEXT (Phase 2 features)

Once the MVP is live and you have 10+ paying users:

1. **CSV import** — bulk upload contracts from spreadsheet
2. **Slack notifications** — webhook alerts to Slack channels  
3. **Spend analytics** — charts showing vendor spend over time
4. **Vendor health scores** — rating system per vendor
5. **Activity log** — audit trail of all contract changes
6. **Team invitations** — email-based invite flow
7. **Calendar export** — download as .ics / Google Calendar sync

---

*Built with ❤️ in India. clausr.com*
