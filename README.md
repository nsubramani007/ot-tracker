# Agent Contest & OT Tracker — Deployment Guide

## What you need (all free, no credit card)
- GitHub account → github.com
- Supabase account → supabase.com
- Vercel account → vercel.com

---

## STEP 1 — Set up Supabase (your database)

1. Go to supabase.com → Sign up → New project
2. Give it a name e.g. "ot-tracker" → set a database password → Create project
3. Wait ~1 minute for it to set up
4. Go to the **SQL Editor** tab (left sidebar)
5. Paste the contents of `supabase_setup.sql` and click **Run**
6. Go to **Settings → API** (left sidebar)
   - Copy the **Project URL** (looks like https://abcdef.supabase.co)
   - Copy the **anon public** key (long string)
   - Save both — you'll need them in Step 3

---

## STEP 2 — Upload code to GitHub

1. Go to github.com → New repository → name it "ot-tracker" → Create
2. Upload ALL the files from this folder into the repository
   - You can drag and drop files directly on the GitHub website
   - Make sure the folder structure matches exactly

---

## STEP 3 — Deploy on Vercel

1. Go to vercel.com → Sign up with your GitHub account
2. Click **Add New Project** → Import your "ot-tracker" repository
3. Before clicking Deploy, click **Environment Variables** and add:
   - Name: `VITE_SUPABASE_URL`  Value: your Supabase Project URL from Step 1
   - Name: `VITE_SUPABASE_ANON_KEY`  Value: your Supabase anon key from Step 1
4. Click **Deploy**
5. Wait ~1 minute — Vercel gives you a live link like `ot-tracker.vercel.app`

---

## STEP 4 — Share the link

- **Agents**: Share the Vercel link — they open it, fill the form, submit. Done.
- **TLs / Admin**: Same link → click "Admin / TL view" → enter password `admin123`

> To change the admin password, open `src/App.jsx`, find the line:
> `const ADMIN_PASSWORD = 'admin123'`
> Change it to your own password, then push to GitHub — Vercel auto-redeploys.

---

## How it works
- Agent opens the link → fills the form → clicks Submit → data saves to Supabase
- You open the same link → Admin/TL view → enter password → see all submissions live
- Every TL can see all entries from all agents in real time
- Refresh button fetches the latest data

---

## Troubleshooting
- **Submission fails**: Check that your Supabase URL and key are correct in Vercel env variables
- **Nothing loads**: Check the browser console for errors (F12 → Console tab)
- **Table not found**: Make sure you ran the SQL in supabase_setup.sql
