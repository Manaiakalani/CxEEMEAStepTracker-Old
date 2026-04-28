# CxE EMEA Step Tracker — Admin SPA

A React + Vite + Tailwind + shadcn/ui single-page application that replaces the
legacy `admin-dashboard.html` in the parent static site. It is designed to be
served as a plain static bundle from `/admin/dist/` by whatever host serves the
rest of the site.

## Stack

- **React 18** + **TypeScript**
- **Vite 5** (production build, code-split chunks)
- **Tailwind CSS 3** with CSS-variable theming (light / dark / system)
- **shadcn/ui** primitives (hand-ported locally; see `src/components/ui/*`)
- **Supabase JS** for data (reuses the public anon key from the parent site)
- **TanStack Query** for data fetching / caching
- **React Hook Form** + **Zod** for forms & validation
- **Recharts** for the Overview chart
- **Sonner** for toasts, **Radix UI** for Dialog / Alert / Tooltip / etc.
- **lucide-react** for icons, **date-fns** for formatting

## Commands

```bash
cd admin

# install deps (once)
npm install

# dev server
npm run dev             # http://localhost:5173/admin/dist/

# production build → writes to ./dist
npm run build
```

The Vite config sets `base: "/admin/dist/"` so all asset URLs resolve correctly
when the bundle is hosted inside the parent static site at that path.

## Routes

Hash-router (so the SPA works over `file://` and any static host without
server-side rewrites).

| Route              | File                                   | Purpose                                                      |
| ------------------ | -------------------------------------- | ------------------------------------------------------------ |
| `#/login`          | `src/routes/login.tsx`                 | Admin sign-in using Supabase `verify_admin_credentials` RPC. |
| `#/`               | `src/routes/overview.tsx`              | KPI stats, daily-steps chart (14d), recent activity.         |
| `#/users`          | `src/routes/users.tsx`                 | Full CRUD: search, add, edit (goal + total), delete.         |
| `#/leaderboard`    | `src/routes/leaderboard.tsx`           | Individual rankings + team standings.                        |
| `#/activity`       | `src/routes/activity.tsx`              | Polled live activity feed (30s).                             |
| `#/data`           | `src/routes/data-management.tsx`       | CSV export, JSON backup, report generator, DB status.        |
| `#/diagnostics`    | `src/routes/diagnostics.tsx`           | Health checks (DB, tables, SW, storage) + env info.          |
| `#/settings`       | `src/routes/settings.tsx`              | Theme toggle, cache/SW controls, sign-out.                   |

Unauthenticated users are redirected to `#/login` via `RequireAuth`. The admin
session is stored in `localStorage` (`adminUser` / `adminSession` /
`adminSessionExpiry`) with a 4-hour TTL — matches the legacy page exactly, so a
session established in the old world still works here (and vice-versa).

## Architecture

```
admin/
├── index.html                # Vite entry
├── vite.config.ts            # base: "/admin/dist/", manualChunks
├── tailwind.config.js
├── src/
│   ├── main.tsx              # bootstrap + early theme apply
│   ├── App.tsx               # QueryClient + router + Toaster
│   ├── index.css             # Tailwind + CSS variables + motion tokens
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client (public URL + anon key)
│   │   ├── api.ts            # Typed wrappers around Supabase queries
│   │   ├── auth.ts           # localStorage session helpers
│   │   └── utils.ts          # cn(), formatNumber(), initials()
│   ├── hooks/use-theme.ts    # theme = light | dark | system
│   ├── components/
│   │   ├── app-sidebar.tsx
│   │   ├── stats-card.tsx
│   │   ├── theme-toggle.tsx
│   │   └── ui/*              # shadcn-style primitives
│   └── routes/
│       ├── login.tsx
│       ├── dashboard-layout.tsx
│       ├── require-auth.tsx
│       ├── overview.tsx
│       ├── users.tsx
│       ├── leaderboard.tsx
│       ├── activity.tsx
│       ├── data-management.tsx
│       ├── diagnostics.tsx
│       └── settings.tsx
└── dist/                     # committed build output (served statically)
```

## Integration with the parent static site

1. The root `admin-login.html` is now a thin redirect stub that forwards to
   `./admin/dist/#/login` (both via `<meta http-equiv="refresh">` and JS).
2. `vite.config.ts` sets `base: "/admin/dist/"` so asset URLs inside the built
   `index.html` resolve to `/admin/dist/assets/*` on the parent host.
3. The bundle uses a **hash router**, so no server rewrites are required — any
   static host that serves `/admin/dist/index.html` will work.
4. `admin/dist/` is **committed** to version control so the parent site does
   not need a build step. Re-run `npm run build` whenever you change the SPA.

## Supabase schema (consumed by this SPA)

| Table                  | Used for                                   |
| ---------------------- | ------------------------------------------ |
| `step_tracker_users`   | Users table, leaderboard, overview stats.  |
| `daily_steps`          | Daily steps chart (last 14 days).          |
| `recent_activities`    | Activity feed, recent-activity card.       |
| `admin_users` (RPC)    | `verify_admin_credentials(u, p)` for login.|

The anon key baked into `src/lib/supabase.ts` is the same public key already
shipped in the parent site's `supabase-config.js`.

## Design polish notes

Applied throughout following the _Design Engineering_ skill:

- `ease-out` transitions (150–260ms) and `cubic-bezier(0.22, 1, 0.36, 1)` fades.
- `:active { transform: scale(0.97) }` feedback on buttons globally.
- `text-wrap: balance` on headings; `pretty` on paragraphs.
- Focus-visible rings with 2px offset ring on the background color.
- Skeleton shimmer for every loading state (users table, charts, activity list).
- Dialog content uses proper `data-[state=...]:zoom-in-95` Radix animations.
- Stats cards lift their shadow on hover; nav items slide-fade on mount.

## Preview locally

From the repo root:

```bash
npx http-server . -p 4174 -s --cors
# open http://localhost:4174/admin-login.html → redirects to
#      http://localhost:4174/admin/dist/#/login
```

## Legacy dashboard

The original `admin-dashboard.html` (~145 KB of inline HTML + JS) is preserved
for reference. Once parity is verified in production you can delete it.
