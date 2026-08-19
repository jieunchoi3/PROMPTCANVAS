# Prompt Canvas

Personal library for AI image/video generation work. One canvas, one inspector, tags instead of folders.

## Phase 1

Canvas pan/zoom/select/drag/resize, batch upload, clipboard paste, inspector (prompt/model/tags), library grid, keyboard shortcuts, undo for delete/move.

Phase 2 (역분석, groups, glossary, smart collections) and Phase 3 (video manager, characters) are not built yet.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With no Supabase env vars the app runs in **local mode** (IndexedDB in this browser) and seeds 20 sample assets on first visit.

## Supabase (cloud)

A new project on the `jieunchoi3` org is about **$10/month**. Do not reuse filmmee / portfolio / book-archive.

1. Create a Supabase project (region `eu-west-1` or `eu-central-1` is fine).
2. Copy `.env.example` to `.env.local` and fill URL + anon key + service role.
3. Apply the schema:

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

Or run `supabase/migrations/20260819000635_init_schema.sql` in the SQL editor.

4. Seed:

```bash
# .env.local
SEED_USER_EMAIL=you@example.com
SEED_USER_PASSWORD=choose-a-password
npm run seed
```

Then sign in at `/login`.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · shadcn/ui · Zustand · supabase-js · custom transform canvas (no tldraw/react-flow/konva)
