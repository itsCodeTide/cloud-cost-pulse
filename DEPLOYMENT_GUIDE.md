# Cloud-Cost-Pulse v3.0 — Vercel & Production Deployment Guide

This guide provides step-by-step instructions to deploy Cloud-Cost-Pulse on Vercel with Clerk authentication and Supabase / PostgreSQL database connections.

---

## 1. Prerequisites

- A **Vercel** account ([vercel.com](https://vercel.com))
- A **Clerk** account ([clerk.com](https://clerk.com))
- A **Supabase** or **PostgreSQL** database (optional for production DB connection)
- Node.js 18+ & npm / yarn

---

## 2. Setting Up Clerk Authentication

1. Create a project in the Clerk Dashboard.
2. In **Authentication -> Social Connections**, enable **Google** sign-in.
3. In **Organizations**, enable Organization switcher for team workspace support.
4. Obtain your environment keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

---

## 3. Database Migration (Supabase / PostgreSQL)

1. Open your PostgreSQL database management tool or Supabase SQL Editor.
2. Run the SQL schema script provided in `schema.sql` or `migrations/001_init.sql`.
3. (Optional) Run `scripts/seed.sql` to populate default seed tables.

---

## 4. Deploying to Vercel

1. Push your repository to GitHub / GitLab / Bitbucket.
2. Import your repository into Vercel.
3. Set the Framework Preset to **Next.js**.
4. Configure Environment Variables in Vercel Project Settings:

   | Variable Name | Value Description |
   |---|---|
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
   | `CLERK_SECRET_KEY` | Clerk secret key |
   | `DATABASE_URL` | PostgreSQL connection URI |
   | `RESEND_API_KEY` | Resend API key for budget email alerts |

5. Click **Deploy**. Vercel will build and deploy your application.

---

## 5. Post-Deployment Verification

1. Navigate to your Vercel deployment URL.
2. Sign in with Google or create an account via Clerk.
3. Click **Load Demo Data** in the top bar to initialize demo resources.
4. Create a test resource under **Resources** and verify dashboard metrics recalculate live.
5. Export a report as PDF / CSV / Excel to confirm report generator functionality.
