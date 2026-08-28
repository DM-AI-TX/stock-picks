# Stock Picks App

A dividend-focused stock screening app. A daily pipeline (GitHub Actions) pulls
financial data, filters down to strong dividend payers, scores them on recent
price behavior, and notifies users of the best picks via email and web push.

## Stack

- **Frontend**: Next.js (App Router), hosted on Vercel
- **Database/Auth**: Supabase (Postgres + Auth + Row Level Security)
- **Scheduled pipeline**: GitHub Actions (daily cron, runs after US market close)
- **Market data**: Financial Modeling Prep (FMP)
- **Email**: Resend
- **Push**: Web Push API (VAPID) — no third-party service

## Pipeline stages

The daily pipeline (`scripts/pipeline/`) runs as a single GitHub Actions job:

1. **Stage 1 — Performance filter** (`stage1-performance-filter.ts`)
   Pull the stock universe via batch FMP calls, filter on recent performance
   (returns, revenue/earnings trends).
2. **Stage 2 — Dividend filter** (`stage2-dividend-filter.ts`)
   Narrow survivors to consistent dividend payers (yield, payout ratio, history).
3. **Stage 3 — Detail scoring** (`stage3-detail-scoring.ts`)
   Deeper fundamentals + recent price levels (support/resistance, MAs) on the
   much smaller surviving set. Writes results to the `scores` table.
4. **Stage 4 — Notify** (`stage4-notify.ts`)
   Sends email (Resend) and web push notifications for top picks to
   subscribed users.

Each stage narrows the list, so the expensive per-ticker lookups only run on
survivors — this keeps you well within FMP's free-tier daily call limit.

## Setup

1. **Supabase**: create a project, then run `supabase/schema.sql` in the SQL
   editor. Copy your project URL + anon/service keys into `.env`.
2. **Financial Modeling Prep**: sign up, copy your API key into `.env`.
3. **Resend**: sign up, verify a sending domain (or use their test domain
   while developing), copy your API key into `.env`.
4. **Web push**: generate a VAPID keypair (`npx web-push generate-vapid-keys`),
   add the keys to `.env`.
5. **GitHub Actions**: add all of the above as repo secrets (Settings →
   Secrets and variables → Actions) so `.github/workflows/daily-pipeline.yml`
   can run headless.
6. **Vercel**: import the repo, add the same env vars, deploy.

Copy `.env.example` to `.env` locally and fill in values.

## Local development

```bash
npm install
npm run dev        # starts the Next.js app
npm run pipeline   # runs the daily pipeline once, locally
```

## Status

This is a scaffold: folder structure, Supabase schema, pipeline stage stubs,
and the GitHub Actions workflow are in place. The actual filter/scoring logic
in each pipeline stage is left as clearly-marked TODOs — that's where your
specific thresholds and criteria plug in.
