# Deployment Guide

## Overview

This application deploys to three services, all on free tiers:

| Service | Role |
|---|---|
| **Vercel** | Hosts the Next.js application |
| **Supabase** | PostgreSQL database + authentication |
| **Cloudflare R2** | Object storage for MP3 files and cover images |

---

## 1. Supabase Setup

### Create Project

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Create a new project. Note the **project URL** and **anon public key** from Settings → API.

### Create Database Tables

1. Go to **SQL Editor** in your Supabase dashboard.
2. Paste the contents of [`supabase/schema.sql`](./supabase/schema.sql) and run it.
3. This creates the `playlists`, `songs`, and `playlist_songs` tables with:
   - Proper foreign keys and indexes
   - Row Level Security (RLS) policies ensuring users can only access their own data

### Configure Authentication

1. Go to **Authentication → Providers**.
2. Email provider should be enabled by default.
3. Under **Authentication → URL Configuration**, set:
   - **Site URL**: `http://localhost:3000` (for development) or your Vercel production URL
   - **Redirect URLs**: Add both `http://localhost:3000/api/auth/callback` and `https://your-app.vercel.app/api/auth/callback`

### Get Credentials

From **Settings → API**, copy:
- `Project URL` → this becomes `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → this becomes `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 2. Cloudflare R2 Setup

### Create R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Navigate to **R2 Object Storage**.
3. Create a new bucket (e.g., `music-app-storage`).

### Configure Public Access

To allow the browser to read MP3 files and images, you need public access:

**Option A — R2 Public Bucket (simplest)**:
1. In your bucket settings, enable **Public Access** via the r2.dev subdomain.
2. Your public URL will be `https://<bucket>.<account-id>.r2.dev`

**Option B — Custom Domain (recommended)**:
1. In bucket settings, connect a custom domain (e.g., `cdn.your-domain.com`).
2. This requires the domain to be on Cloudflare.

### Configure CORS

In your bucket settings, add a CORS policy:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-app.vercel.app"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### Create R2 API Credentials

1. Go to **R2 → Overview → Manage R2 API Tokens**.
2. Create a new API token with:
   - **Permissions**: Object Read & Write
   - **Scope**: Apply to your specific bucket
3. Note the **Access Key ID** and **Secret Access Key** — these are shown only once.

### Get R2 Values

- `R2_ACCOUNT_ID` — your Cloudflare account ID (visible in the dashboard URL)
- `R2_ACCESS_KEY_ID` — from the API token you just created
- `R2_SECRET_ACCESS_KEY` — from the API token you just created
- `R2_BUCKET_NAME` — the bucket name (e.g., `music-app-storage`)
- `R2_PUBLIC_URL` — the public access URL from step above
- `NEXT_PUBLIC_R2_PUBLIC_URL` — same as `R2_PUBLIC_URL` (this one is safe for the browser)

---

## 3. Environment Variables

Copy `.env.example` to `.env.local` for local development:

```bash
cp .env.example .env.local
```

Fill in all values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=music-app-storage
R2_PUBLIC_URL=https://your-bucket.r2.dev

NEXT_PUBLIC_R2_PUBLIC_URL=https://your-bucket.r2.dev
```

---

## 4. Local Development

```bash
cd musicapp
npm install
npm run dev
```

Open `http://localhost:3000`.

---

## 5. Vercel Deployment

### Connect Repository

1. Push the `musicapp` directory to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) and import the repository.
3. Set the **Root Directory** to `musicapp` if needed (if your repo root is the parent directory).
4. Vercel will auto-detect Next.js.

### Configure Environment Variables

In Vercel project settings → **Environment Variables**, add all variables from `.env.example`:

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Safe for browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Safe for browser |
| `R2_ACCOUNT_ID` | your account ID | Server-only |
| `R2_ACCESS_KEY_ID` | your access key | Server-only |
| `R2_SECRET_ACCESS_KEY` | your secret key | Server-only |
| `R2_BUCKET_NAME` | `music-app-storage` | Server-only |
| `R2_PUBLIC_URL` | `https://your-bucket.r2.dev` | Server-only |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | `https://your-bucket.r2.dev` | Safe for browser |

### Deploy

Click **Deploy**. Vercel will build and deploy automatically.

### Update Supabase Redirect URL

After deployment, go back to Supabase → Authentication → URL Configuration and add your Vercel URL:
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: `https://your-app.vercel.app/api/auth/callback`

---

## 6. Test in Production

1. Open your Vercel deployment URL.
2. Click **Sign Up** and create an account.
3. Check your email for the confirmation link.
4. After confirming, log in.
5. Create a new playlist.
6. Click on the playlist, then click **Add songs**.
7. Select an MP3 file from your computer.
8. Verify:
   - Upload progress shows
   - Song appears in the playlist
   - Clicking the song plays it from R2
   - Seekbar and volume work
   - Next/previous work with multiple songs
9. Click the playlist cover to upload an image.
10. Verify the cover image appears on the playlist card.
11. Log out and log back in — verify playlists and songs persist.

---

## Architecture Summary

```
Browser
  │
  ├── Supabase Auth (login/signup)
  │
  ├── GET /api/playlists → Supabase DB
  │
  ├── POST /api/uploads/presign → generates presigned R2 URL
  │       │
  │       └── Browser uploads directly to R2
  │
  ├── POST /api/songs → saves metadata to Supabase DB
  │
  └── Audio playback → reads from R2 public URL
```

**Key security properties:**
- R2 credentials are server-only (never in browser)
- All API endpoints verify authenticated user
- All database queries filter by `user_id`
- RLS policies provide defense-in-depth
- Storage keys are server-generated (users can't control paths)
- File type and size are validated server-side
