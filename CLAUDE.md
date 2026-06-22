# CLAUDE.md — IG Shop Directory

## Project
"OpenRice for Instagram shops." Consumers discover, search, filter, rate, and review Instagram-based small shops. Shop owners claim and manage their listings.
Target: **Hong Kong (primary)**, Global English (secondary). Web-first, mobile later.

---

## Tech Stack — Do not substitute without asking
- **Framework:** Next.js 16 with App Router (TypeScript)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Backend:** Supabase — Postgres + RLS + Auth + Storage
- **Search:** Postgres full-text search (`tsvector` + GIN index, maintained by trigger)
- **Email:** Resend — auth emails only for v1
- **Hosting:** Vercel Hobby
- **Payments:** Stripe — v2 only; add `// TODO: Stripe hook` placeholders where relevant

No Firebase, Prisma, tRPC, or Redux.

---

## Build Progress
- [x] Step 1 — Schema, RLS, seed data → `supabase/migrations/`
- [x] Step 2 — Supabase client helpers + TypeScript types → `lib/supabase/`
- [x] Step 3 — Homepage: Navbar, Footer, hero search bar, category grid
- [x] Step 4 — Browse page with filters (`/shops`)
- [x] Step 5 — Shop profile page (`/shops/[ig_handle]`)
- [x] Step 6 — Auth: login, signup, profile pages
- [x] Step 7 — Submit shop form + admin approval queue
- [x] Step 8 — Ratings & reviews
- [x] Step 9 — Bookmark/save shops
- [x] Step 10 — Shop claim flow + owner dashboard
- [x] Step 11 — Admin panel
- [x] Step 12 — Polish: empty states, skeletons, error boundaries, mobile

---

## Security Rules — Non-negotiable

- `SUPABASE_SERVICE_ROLE_KEY` bypasses **all** RLS. It must only appear in `lib/supabase/admin.ts` and server-side code (Server Actions, API routes). Never in Client Components.
- `lib/supabase/admin.ts` and `lib/supabase/server.ts` both start with `import 'server-only'` — the build fails if either is imported in a `'use client'` file.
- Never add `NEXT_PUBLIC_` prefix to `SUPABASE_SERVICE_ROLE_KEY`.
- All RLS policies use `auth.uid()`. Admin routes always check `role = 'admin'` in `profiles`.

---

## Supabase Client Usage

| Client | File | Where to use |
|--------|------|--------------|
| Browser | `lib/supabase/client.ts` | Client Components (`'use client'`) |
| Server | `lib/supabase/server.ts` | Server Components, Server Actions, Route Handlers |
| Admin | `lib/supabase/admin.ts` | Server-side only — bypasses RLS for admin operations |

---

## Database Schema

Full schema: `supabase/migrations/20260522000001_initial_schema.sql`
RLS policies: `supabase/migrations/20260522000002_rls_policies.sql`
Seed data: none (shops table starts empty)

**7 tables:** `profiles`, `shops`, `reviews`, `shop_claims`, `saved_shops`, `review_helpful`, `review_flags`

Key decisions (non-obvious):
- `shops.status` — `'pending' | 'approved' | 'rejected'` (default `'pending'`). Needed for admin queue; `is_active` alone can't distinguish pending from rejected.
- `shops.is_active` — defaults `false`. Shops only go public after admin approval.
- `search_vector` — maintained by a `BEFORE INSERT OR UPDATE` trigger. **Not** `GENERATED ALWAYS AS` — Postgres rejects `to_tsvector()` in generated columns.
- `reviews` — unique constraint `(shop_id, user_id)`. Owner cannot review their own shop (enforced by RLS).

**TypeScript types:** `lib/supabase/types.ts` — use `Shop`, `Review`, `Profile`, `ShopClaim`, `ShopWithStats`, `ReviewWithProfile`, etc.

**Constants:** `lib/constants.ts` — `CATEGORIES`, `HK_DISTRICTS`, `LOCATIONS`, `PAYMENT_METHODS`, `SHIPS_TO`

---

## Routes

| Area | Routes |
|------|--------|
| Public | `/` `/shops` `/shops/[ig_handle]` `/search` `/categories/[category]` `/submit` |
| Auth | `/login` `/signup` `/profile` |
| Owner (claimed shops) | `/dashboard` `/dashboard/edit` `/dashboard/claim` |
| Admin (role-gated) | `/admin` `/admin/shops` `/admin/claims` `/admin/reviews` |

---

## Feature Spec — v1

**Shop submissions:** Any logged-in user submits → pending queue → admin approves → live. Required: IG handle, name, category, location. Detect duplicate handles on submit.

**Search & filter:** Full-text across name, handle, description, tags. Filters: category, location, rating (≥3★/4★/4.5★), payment methods, ships-to. Sort: most reviewed, highest rated, newest. Filter state URL-encoded (shareable links).

**Reviews:** 1–5 stars + title + body. One per user per shop. Owner cannot review own shop. "Mark as helpful" (auth only). Flag to admin queue. Display avg rating + distribution bar.

**Shop profile:** Cover image, IG handle links to `instagram.com/[handle]`, rating, review count, verified badge. Tabs: Reviews | About. CTAs: Write a Review, Claim this shop.

**Claim flow:** Owner submits proof → admin approves within 72h → `is_claimed = true` → owner gets `/dashboard` access.

**Admin panel:** Approve/reject shops and claims. Moderate flagged reviews. Show stats: total shops, reviews, pending counts.

**Not in v1:** Stripe, featured listings, transactional email (beyond auth), mobile app, scraping, AI, owner analytics, i18n, og:image generation.

---

## Design

- **Tone:** Clean, trustworthy, modern — OpenRice meets ProductHunt. Not flashy e-commerce.
- **Palette:** White backgrounds, slate/neutral grays, one accent colour defined as `--color-accent` (CSS variable — set once, use everywhere).
- **Typography:** Geist Sans (already installed via Next.js scaffold). Nothing decorative.
- **Shop cards:** Cover image (gradient IG-style placeholder if none), name, category badge, star rating, review count, location tag, verified badge if claimed.
- **Responsive:** Mobile-first. All pages must work at 375px minimum width.
- **Accessibility:** Semantic HTML, ARIA labels on icon-only buttons, keyboard-navigable modals.
- **Async:** Suspense boundaries + skeleton loaders for every async data fetch. Empty state components with helpful CTAs for 0 results.

---

## Folder Structure

```
app/
  layout.tsx                    root layout: Navbar + Footer
  page.tsx                      homepage
  shops/page.tsx                browse + filter
  shops/[ig_handle]/page.tsx    shop profile
  search/page.tsx
  categories/[category]/page.tsx
  submit/page.tsx
  login/  signup/  profile/
  dashboard/
  admin/
  api/                          API routes only if Server Actions won't work

components/
  ui/                           shadcn components — do not edit these files
  shop/                         ShopCard, ShopGrid, ShopProfile, ShopFilters
  review/                       ReviewCard, ReviewForm, RatingStars, RatingDistribution
  layout/                       Navbar, Footer
  common/                       EmptyState, LoadingSkeleton, CategoryBadge, VerifiedBadge

lib/
  supabase/                     client.ts  server.ts  admin.ts  types.ts
  constants.ts
  utils.ts
```

---

## Debugging & Validation Rule

When fixing a bug or solving a problem, **do not mark the task complete** until:

1. Identify the root cause — explain why the bug occurred, not just what changed.
2. Apply the fix.
3. Validate — read back the modified file/section and confirm the fix is correct as written.
4. Check for side effects — consider whether the change could break adjacent logic (filters, scoring, DB inserts, etc.).

Only then report the task as done. Never say "run a job to verify" as a substitute for validation you can do directly.

---

## Coding Standards

- TypeScript everywhere — no `any` types
- Server Actions for all form submissions — prefer over API routes
- `zod` for every form validation schema
- `async/await` only — no `.then()` chains
- No `console.log` in production paths
- No comments unless this file explicitly says to add a `// TODO:` placeholder
