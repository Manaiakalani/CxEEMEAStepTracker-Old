# CxE EMEA Step Tracker — Design Review

**Audit scope:** `index.html`, `admin-login.html`, `admin-dashboard.html`, `live-display/index.html`
**Viewports:** desktop 1440×900 and mobile 390×844, in light + dark themes
**Method:** Playwright capture (`tests/design-audit.spec.ts`, 16 runs / 59 PNGs in `design-review-screenshots/`) + line-level CSS/HTML audit against the Emil Kowalski design-engineering rubric in `~/skills.md` and the Anthropic brand guidance.

> TL;DR — The app works, but visually it reads as "generic dashboard + purple gradient + emoji H2s." The biggest wins are (1) replacing the Microsoft blue→purple body gradient with a calmer surface, (2) removing emoji from headings, (3) defining real easing tokens and swapping every `transition: all` for explicit property lists, (4) adding `:active { transform: scale(0.97) }` press feedback to every interactive element, and (5) stripping the three always-on infinite animations on the live-display kiosk.

---

## 1. Executive summary

### `index.html` (participant app)
- **Identity is generic.** Blue→purple 135° gradient background (`styles.css:42`) + Inter + gradient-filled logo text is the stock "AI slop" aesthetic the Anthropic/Emil rubric warns about. There is no distinctive brand moment.
- **Emoji-prefixed H2/H3** ("🚀 New User Registration", "👋 Welcome back!", "🏆 Leaderboard") break typographic rhythm and reduce authority. Icons should be actual `<svg>` sized to the cap-height, not emoji.
- **Motion is hand-wavy.** `--transition-fast: 0.15s ease` / `--transition-normal: 0.3s ease` (`styles.css:65-67`) don't define a real curve. `ease` in CSS is `ease-in-out`-ish, which makes every hover feel sluggish. Swap to custom out-curves.
- **No press feedback.** Not a single primary button on this page has `:active { transform: scale(0.97) }`. Tapping a `.nav-btn` or `.btn` on mobile feels unresponsive.
- **Mobile header crams 4 groups into 390px** (hamburger + weather pill + Spotify widget + stats) → wraps awkwardly in `index_mobile_light_above-fold.png`. One pill needs to move behind the hamburger.

### `admin-login.html`
- **Zero brand presence.** A centered white card on the purple gradient with a "Secure login for CxE EMEA Step Tracker" subtitle is the literal stock template.
- **Login button is full-bleed Microsoft blue with no hover depth, no press state, no loading state wired to the visible button** — just a color change on hover.
- **Password input has no inline validation affordance** and no show/hide toggle, which forces copy-paste from password managers.
- **`@font-face` at `styles.css:9-13` is silently broken** (it points `src:` at the Google Fonts *stylesheet* URL, not a font file). The real Inter arrives via `<link>` in `index.html:31`; this rule is dead weight and will log a console warning.
- **Security note (not design):** fallback creds are hardcoded in `admin-login.html:359-362`. Flagged for follow-up.

### `admin-dashboard.html`
- **It's not actually tabbed** — it's one long scrolling page with four `.section-header` anchors (Overview / Management / Rankings / Developer Tools, `admin-dashboard.html:659-916`). That is fine, but the nav affordance promises tabs. Either commit to sticky section-nav with scroll-spy or convert to real tabs.
- **Every section H2 is emoji-prefixed** (`📊 System Overview`, `🔧 System Health`, `⚡ Quick Actions`, lines 661, 668, 675, 699, 734, 766, 886, 893, 902, 910, 918, 926). Same issue as index.
- **Stat cards show em-dashes as the empty state**, which is easy to misread as "loaded with 0." Use either a shimmer skeleton or the literal word "No data" in muted type.
- **Action rows pack 4 equally-weighted primary buttons**, so there is no visual hierarchy for the thing you *usually* want to click. Pick one primary + outline the rest.
- **No responsive breakpoint for the `.user-table`** at `admin-dashboard.html:420-439`; on mobile (`admin_mobile_light_management.png`) it overflows horizontally without a scroll affordance.

### `live-display/index.html` (kiosk)
- **Light theme is not defined at all** in `live-display/styles.css`. The light-theme screenshots are identical to dark. For a kiosk this is probably fine, but the toggle implies support that doesn't exist.
- **Three always-on infinite animations** (`heartbeat`, `crown-pulse`, `walkingPulse`/`spin60fps` at lines 92, 224, 594, 718, 805, 873, 1123, 1217, 1222) run forever on a TV. This violates Emil's "animate rarely" rule and is a real power-draw issue on a kiosk that may run 10 hours/day.
- **Empty state reads as broken.** `"WAITING"` red pill top-right + `--:--` clock + empty Live Activity Feed makes it look like the integration failed, not like it's waiting for steps. Replace red with neutral; put a friendly "Listening for activity…" line.
- **Debug text visible in production capture** (`Debug: Supabase available / LocalStorage activities: 0`) — must be gated behind a `?debug` query param before shipping to a TV.
- **`THE STOMP` banner is a 100%-wide gradient block with gradient text on a gradient background** — unreadable at the back of a room and the single most "AI slop" moment in the whole product.

---

## 2. Design tokens — recommended additions

Add to `styles.css :root` (right after line 67):

```css
/* Easing — Emil rubric */
--ease-out:       cubic-bezier(0.23, 1, 0.32, 1);     /* default UI */
--ease-out-soft:  cubic-bezier(0.33, 1, 0.68, 1);     /* long moves */
--ease-in-out:    cubic-bezier(0.77, 0, 0.175, 1);    /* shared-element */
--ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1);  /* celebration only */

/* Durations */
--dur-1: 120ms;   /* button hover / press */
--dur-2: 180ms;   /* tooltip, small popover */
--dur-3: 240ms;   /* dropdown, tab switch */
--dur-4: 320ms;   /* modal, drawer */

/* Redefine the existing tokens in terms of the new ones */
--transition-fast:   var(--dur-1) var(--ease-out);
--transition-normal: var(--dur-3) var(--ease-out);
--transition-slow:   var(--dur-4) var(--ease-out-soft);
```

Then globally find-and-replace `transition: all <N>s ease` with explicit property lists (see §4).

---

## 3. Before / After — per surface

Every "Before" row is copy-paste accurate from the file at that line. Every "After" is drop-in replaceable.

### 3a. `index.html` + `styles.css`

| # | Location | Before | After | Why |
|---|---|---|---|---|
| 1 | `styles.css:9-13` | `@font-face { font-family:'Inter'; src: url('https://fonts.googleapis.com/css2?family=Inter...'); }` | *Delete the block.* Inter is already loaded via `<link>` in `index.html:31`. | `src:` points at a CSS file, not a font file — the rule is dead. |
| 2 | `styles.css:42` | `--gradient-primary: linear-gradient(135deg, var(--ms-blue), var(--ms-purple));` used as `--bg-primary` on `<body>` | Use a single calm surface (`--bg-primary: var(--ms-gray-50)` in light, `#0b0d10` in dark). Reserve the gradient for the logo mark only. | 135° blue→purple on a full-bleed body is the defining "generic dashboard" look. |
| 3 | `styles.css:65-67` | `--transition-fast: 0.15s ease; --transition-normal: 0.3s ease; --transition-slow: 0.5s ease;` | See §2 token block above. | `ease` in CSS is `ease-in-out` which feels sluggish on hover. |
| 4 | `styles.css:200` (`.hamburger-menu`) | `transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);` | `transition: background-color var(--dur-1) var(--ease-out), transform var(--dur-1) var(--ease-out), box-shadow var(--dur-2) var(--ease-out);` plus `&:active { transform: scale(0.97); }` | `all` is a smell (re-layouts everything); Material "standard" curve is weaker than Emil's out-curve; missing press. |
| 5 | `styles.css:1420` | `transition: left 0.6s ease;` (shimmer sweep) | `transition: transform var(--dur-4) var(--ease-out-soft);` + animate `translateX` instead of `left` | 600ms > 300ms UI ceiling; animating `left` triggers layout. |
| 6 | `styles.css:1534` | `transition: transform 0.6s ease;` | `transition: transform var(--dur-3) var(--ease-out);` | Same 600ms violation. |
| 7 | `index.html:160,170,185,…` (welcome H3s) | `<h3>🚀 New User Registration</h3>` `<h3>👋 Welcome back!</h3>` | `<h3><svg class="h-icon">…</svg>New user registration</h3>` with `text-wrap: balance` | Emoji in headings are inconsistent across OSes (Apple vs Segoe) and break the line-height rhythm. |
| 8 | `index.html:31` + whole document | `<link href="https://fonts.googleapis.com/css2?family=Inter…">` | Keep Inter as fallback; add a display face (e.g. self-hosted **Geist**, **General Sans**, **Söhne** if licensed) for h1/h2 only. `font-family: 'Display', 'Inter', system-ui` on headings. | Inter is the default of every AI-generated UI; Anthropic brand notes explicitly discourage it. |
| 9 | `.nav-btn` (`index.html:77-94` + styles.css) | No `:active` state defined | `.nav-btn:active { transform: scale(0.97); transition-duration: 80ms; }` | Tap feedback is table-stakes on mobile. |
| 10 | `styles.css:152` (`.header`) | `position: sticky; backdrop-filter: blur(10px); transition: background 0.3s ease, border-color 0.3s ease;` | Keep sticky; gate the backdrop blur behind `@supports (backdrop-filter: blur(10px)) and (min-width: 768px)` and only apply when `scroll-y > 8px` (toggle a class from JS) | Sticky + always-on backdrop blur janks on mid-tier Android; activate only after scroll. |
| 11 | Headings globally | No `text-wrap: balance` anywhere in the repo | `h1, h2, h3, .welcome-content p { text-wrap: balance; }` (2-line max on p) | Zero cost, immediate typographic polish. |
| 12 | Mobile header | 4 groups (hamburger + weather + Spotify + stats) overflow at 390px | Collapse weather + Spotify into the hamburger flyout under a "Widgets" subheader on `< 640px`. | See `index_mobile_light_above-fold.png`. |

### 3b. `admin-login.html`

| # | Location | Before | After | Why |
|---|---|---|---|---|
| 1 | `admin-login.html:27` (body background) | purple→blue gradient | Solid dark `#0b0d10` with a single **radial** highlight (`radial-gradient(ellipse at top, rgba(0,120,212,0.18), transparent 60%)`). | Radial spotlight reads more intentional than 135° diagonal. |
| 2 | `.login-container` (~line 43) | 8px-rounded white card, heavy `box-shadow` | `border-radius: 14px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 40px -20px rgba(0,0,0,0.6);` | Inset hairline + soft drop shadow is the current "Linear/Vercel" idiom and reads as crafted. |
| 3 | Subtitle "Secure login for CxE EMEA Step Tracker" | Generic | "Sign in to continue." — drop the pitch. | Microcopy should be confident and short. |
| 4 | `.login-button` (~line 99) | `background: var(--ms-blue); transition: background 0.2s ease;` | Add: `&:hover { background: #1a88e0; box-shadow: 0 0 0 4px rgba(0,120,212,0.18); } &:active { transform: translateY(1px) scale(0.99); } &[aria-busy="true"] { … spinner }` | Elevation + press + explicit loading state. |
| 5 | Password input | No show/hide toggle | Add an inline `<button type="button" aria-pressed>` eye icon inside the input right edge. | Removes password-manager friction. |
| 6 | Form submit | No disabled state during request | `button[aria-busy="true"] { pointer-events: none; opacity: 0.7; }` + swap label to spinner | Prevents double-submit; obvious state. |
| 7 | Error message surface | No dedicated area | Reserve a 20px-tall `role="alert"` slot below the password field (no layout shift when it appears) | Layout stability. |
| 8 | Focus trap on modal card | None | On mount: focus username input; on submit error: refocus the errored field. | a11y. |
| 9 | `admin-login.html:359-362` ⚠️ | Hardcoded fallback creds `admin/StepTracker2025!`, `administrator/Admin123!`, etc. | **Delete.** Auth should come from the server path only. | Security; flagged despite being out of design scope. |
| 10 | Mobile layout | Card touches viewport edge at 390px | `min-width: min(420px, 100% - 32px); padding: 28px 24px;` | Breathing room. |

### 3c. `admin-dashboard.html`

| # | Location | Before | After | Why |
|---|---|---|---|---|
| 1 | `.section-header` × 4 (lines 661, 668, 675, 699, 734, 766, 886, 893, 902, 910, 918, 926) | `<h2>📊 System Overview</h2>`, `<h2>🔧 System Health</h2>`, etc. | Replace all emoji with a 20×20 `<svg>` sibling at `stroke-width: 1.5`. Keep alignment with `display:flex; gap:.625rem; align-items:center;`. | Emoji renders differently on Mac (Apple) vs Win (Segoe) vs Linux (Noto); destroys visual consistency. |
| 2 | Page itself is a single scroll but nav implies tabs | `admin-dashboard.html:659-916` | Add a **sticky sub-nav** with scroll-spy that highlights the current section; anchor links `#overview`, `#management`, `#rankings`, `#devtools`. Respect `prefers-reduced-motion: reduce` → `scroll-behavior: auto`. | Matches the mental model the emoji titles imply. |
| 3 | Stat cards empty state | `—` dashes | 14px shimmer skeleton lines, or `<span class="muted">No data yet</span>`. | Dashes read as `0`. |
| 4 | Quick Actions row (4 equal buttons) | All `.btn-primary` | One `.btn-primary` (the most common action), three `.btn-secondary` outlined. | Hierarchy. |
| 5 | `.user-table` (lines 420-439) | No horizontal-scroll affordance on mobile | Wrap in `<div class="table-scroll">` with `overflow-x:auto; mask-image: linear-gradient(to right, black 90%, transparent);` on narrow widths. | Indicates there's more content off-screen. |
| 6 | Action buttons inside table rows | Always visible, crowding the row | Reveal on row hover (desktop), always visible on touch (`@media (hover: hover)` guard). | Less clutter; respects touch. |
| 7 | Dark-mode card surfaces | `--bg-card: #1f2937` + gradient body | Pick one card bg token and stop compositing over the gradient — use a flat `#14161a` base. | Gradient-behind-glass is where the "AI slop" reputation comes from. |
| 8 | Cards hover | `transition: all 0.3s ease; transform: translateY(-2px) on hover` (common pattern in styles.css) | `transition: transform var(--dur-2) var(--ease-out), box-shadow var(--dur-2) var(--ease-out); &:hover { transform: translateY(-1px); }` + `@media (hover: hover)` guard | Removes mobile tap-ghost hover + kills `all`. |
| 9 | Emoji in cells (e.g. "⚡ Quick Actions", "🏆 Top") | Inline emoji | SVG from the same icon set used in section headers. | Unified icon set. |
| 10 | `prefers-reduced-motion` at `styles.css:876-898` | `transition: none !important` for everything | `transition-property: opacity, color, background-color !important; transition-duration: var(--dur-1) !important;` — keep crossfades, kill movement. | Emil explicitly calls out "don't kill transitions wholesale"; reduced-motion users still benefit from color crossfades. |

### 3d. `live-display/` (kiosk)

| # | Location | Before | After | Why |
|---|---|---|---|---|
| 1 | `live-display/styles.css:718, 805, 873, 1123, 1217, 1222` | `animation: heartbeat 2s infinite;` / `crown-pulse 3s infinite;` / `walkingPulse 1s infinite;` / `spin60fps 1s linear infinite;` | Replace `infinite` with JS-triggered one-shots (`animation-play-state: paused` by default; set `running` on new-activity events). | Always-on animations on a TV waste CPU/GPU and desensitize the viewer to actual change. |
| 2 | `live-display/styles.css:147, 263, 351, 587` | `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);` | Explicit properties + use the new `--ease-out`. | `all` smell. |
| 3 | "WAITING" pill | Red | Neutral (`color-mix(in oklab, var(--text-secondary) 80%, white)`). | Red = error. Waiting is not an error. |
| 4 | Clock `--:--` empty state | Shown before data arrives | Hide clock until first tick; show a subtle pulse dot + "Listening for activity…". | Looks broken otherwise. |
| 5 | Debug line "Debug: Supabase available / LocalStorage activities: 0" | Always rendered | Render only when `location.search.includes('debug=1')`. | Cannot be on-screen at the event. |
| 6 | `THE STOMP` banner | Gradient text on a gradient banner on a gradient page background | Solid banner bg (`#0b0d10`), one sharp accent stripe (`border-top: 2px solid var(--ms-blue)`), display-face headline in a single color (`#ffffff`). | Three stacked gradients are illegible across the room. |
| 7 | No light theme defined | `live-display/styles.css` is dark-only | Either (a) remove the light toggle for live display entirely, or (b) define a minimal light palette. Don't let the UI lie. | Toggle that does nothing = broken affordance. |
| 8 | Type scale is roughly 16/20/28/56 | Generic | On a TV viewed from 10+ ft, bump to 18/24/32/72 and enable `font-optical-sizing: auto; font-variant-numeric: tabular-nums;` for stat numbers. | Readability + stat columns line up. |
| 9 | Activity feed empty state | Bolt icon + two lines of text | Keep the icon; add a single line "Steps will appear here as they happen." | Friendlier, plain-English. |
| 10 | Leaderboard rank changes | No reorder animation spotted | When a row moves, FLIP-animate `transform: translateY(Δy)` over `var(--dur-3) var(--ease-out)`; do NOT transition `top/left`. | The one place motion is *earned* on a kiosk. |

---

## 4. Motion audit

Every hit from `grep -n "transition\|animation\|@keyframes" styles.css gamification.css a11y.css data-viz.css live-display/styles.css`, grouped.

### 4a. `styles.css` — primary offenders

| Line | Current | Issue | Fix |
|---|---|---|---|
| 65 | `--transition-fast: 0.15s ease` | `ease` is wrong default | `var(--dur-1) var(--ease-out)` |
| 66 | `--transition-normal: 0.3s ease` | same | `var(--dur-3) var(--ease-out)` |
| 67 | `--transition-slow: 0.5s ease` | same + 500ms is too long | `var(--dur-4) var(--ease-out-soft)` |
| 114 | body `transition: background var(--transition-normal), color var(--transition-normal)` | Repaints entire subtree on theme toggle | Move to a `html.theme-changing *` class that's applied for exactly one frame, then removed |
| 152 | `.header` | `all` | Enumerate properties |
| 200 | `.hamburger-menu` | `all 0.25s cubic-bezier(0.4,0,0.2,1)` | `background-color, transform, box-shadow` explicitly |
| 252, 283, 400, 449, 497 | various buttons | `all` smell | Enumerate |
| 624, 1094, 1121 | cards | `transition: all 0.3s ease` with `transform: translateY(-2px)` on hover | `transform, box-shadow` + `@media (hover:hover)` guard |
| 1236, 1405 | nav animations | `all` | Enumerate |
| 1420 | `transition: left 0.6s ease` | 600ms + animates `left` | `transform var(--dur-4) var(--ease-out-soft)` |
| 1513, 1534 | modals | `all`/600ms transform | Use `opacity, transform` only |
| 1592, 1675, 1698, 1721, 1755, 1823, 1855, 1903 | stat / list items | `all` | Enumerate |
| 2021, 2038, 2060 | leaderboard items | `all` | Enumerate; add staggered reveal `transition-delay: calc(var(--i)*40ms)` |
| 2144, 2199, 2224 | flyout items | `all` | Keep transform + opacity; drop `all` |
| 2406, 2426, 2495, 2515, 2550 | profile panel | `all` | Enumerate |
| 2786, 2891, 2931, 2981, 3051, 3132, 3148, 3249, 3265, 3345, 3395 | misc hover states | `all` | Enumerate |
| 876-898 | `@media (prefers-reduced-motion)` | `transition: none !important` | Preserve `opacity, color, background-color`; kill `transform` |
| 953, 1064, 1370, 1383, 2070, 2244, 2366, 2435, 2738, 2749, 3122, 3202, 3482 | `@keyframes` | Many look like infinite pulses | Audit each — kill infinite, convert to one-shots on event |

### 4b. `gamification.css`

| Line | Current | Issue | Fix |
|---|---|---|---|
| 14, 180, 206 | `cubic-bezier(0.34, 1.56, 0.64, 1)` on hover | Bouncy spring on **normal hover** is visual noise | Reserve `--ease-spring` for "points gained" celebration only; hover uses `--ease-out` |
| 287, 305, 321 | progress transitions | `all` | Enumerate |
| 46, 119, 331, 370, 382 | `@keyframes flicker`, `pulse`, `sparkle` | Always-on | Play once per milestone event |

### 4c. `a11y.css`

| Line | Current | Issue | Fix |
|---|---|---|---|
| 44-48 | `*:focus-visible { outline: 2px solid var(--ms-blue) !important; outline-offset: 2px; box-shadow: 0 0 0 4px rgba(0,120,212,0.25); }` | Fine, but `!important` on a universal selector is blunt | Keep, but scope `*:focus-visible` without `!important`; reserve `!important` to specific overrides |
| 110-119 | `@media (prefers-reduced-motion)` | Nukes all `transition-duration` | Keep durations at `1ms` for opacity/color so crossfades still work; `transform`/`scroll-behavior` set to none. **Or** merge with the `styles.css:876` block (currently duplicated logic) |

### 4d. `data-viz.css`

| Line | Current | Issue | Fix |
|---|---|---|---|
| 43-95 | `@keyframes dv-draw-line, dv-fade-in, dv-bounce, dv-slide-up` | OK once; check they're not `infinite` | If any chart animates on every data refresh, throttle to first render only (IntersectionObserver) |

### 4e. `live-display/styles.css`

| Line | Current | Issue | Fix |
|---|---|---|---|
| 92, 224, 594 | `transition: all 0.3s cubic-bezier(0.4,0,0.2,1)` | `all` | Enumerate |
| 147, 263, 351, 587 | same | same | same |
| 718 | `animation: heartbeat 2s ease-in-out infinite` | Always on | Trigger on each new activity event |
| 805 | `animation: crown-pulse 3s infinite` | Always on | One-shot on rank-1 change |
| 873 | `animation: walkingPulse 1s infinite` | Always on | Pause when activity feed is idle > 30s |
| 1123, 1217, 1222 | `animation: spin60fps 1s linear infinite` | CPU burner | Only when `data-loading="true"` |
| 159, 830 | `:active` present (manual-refresh, footer-debug) | 🙂 the only press feedback in the entire codebase | Use as a template for rolling out `:active { transform: scale(0.97) }` everywhere |

---

## 5. Top 15 highest-impact changes (ranked)

1. **Kill the 135° blue→purple body gradient** on `index.html` and `admin-login.html`; use a calm single-color body with one radial accent. (`styles.css:42, 46`)
2. **Remove emoji from every H2/H3** — replace with a paired 20×20 SVG icon. (Admin: lines 661, 668, 675, 699, 734, 766, 886, 893, 902, 910, 918, 926. Index: welcome headings.)
3. **Define real easing tokens** (`--ease-out`, `--ease-spring`, durations `--dur-1..4`) and redefine `--transition-fast/normal/slow` in terms of them. (`styles.css:65-67`)
4. **Global `transition: all` → enumerated properties.** 50+ hits in `styles.css` + `live-display/styles.css`. This is both perf and polish.
5. **Add `:active { transform: scale(0.97) }`** to `.btn`, `.nav-btn`, `.login-button`, `.hamburger-menu`, `.flyout-item`, `.stat-card`, `.section-header [role=button]`. One utility class `.pressable`.
6. **Strip infinite animations on live-display** (`heartbeat`, `crown-pulse`, `walkingPulse`, `spin60fps`). Trigger on events.
7. **Delete the dead `@font-face`** at `styles.css:9-13` and add a distinctive display face for headings only.
8. **Fix `prefers-reduced-motion`** blocks at `styles.css:876-898` and `a11y.css:110-119` — preserve opacity/color crossfades, remove only transforms.
9. **Gate `backdrop-filter: blur(10px)` on `.header`** behind `@supports` + "scrolled > 8px" class. (`styles.css:152`)
10. **Kill the 600ms UI transitions** at `styles.css:1420, 1534` and any other `0.5s+ ease` on interactive elements.
11. **Add `text-wrap: balance`** globally to `h1, h2, h3` + the welcome paragraph. Zero-cost typographic win.
12. **Admin dashboard sticky sub-nav with scroll-spy** — the page promises tabs; give it a structural anchor.
13. **Mobile header collapse** — move weather + Spotify widgets into the hamburger flyout under `< 640px`.
14. **Live-display empty state fix** — neutral (not red) "Listening…" pill, hide the `--:--` clock until first tick, hide debug text behind `?debug=1`.
15. **Delete hardcoded admin creds** at `admin-login.html:359-362`. (Security, but called out because it will be spotted in review.)

---

## 6. Responsive issues

Observed in `*_mobile_*.png` captures at 390×844:

| Surface | Issue | Screenshot | Fix |
|---|---|---|---|
| `index.html` header | Hamburger + weather pill + Spotify widget + stats wrap to two rows on 390px, creating a jagged top edge. | `index_mobile_light_above-fold.png` | Below 640px, keep hamburger + one priority widget; move the rest into the flyout. |
| `index.html` welcome | H3 with long string + emoji overruns on one line on 390px and wraps orphan words. | same | `text-wrap: balance;` + remove emoji. |
| `admin-dashboard.html` user table | Horizontal overflow on mobile (`admin-dashboard.html:420-439` has no mobile variant). | `admin_mobile_light_management.png` | Wrap in `.table-scroll` with right-edge fade mask; on `< 640px` render the table as a stacked card list. |
| `admin-dashboard.html` stat cards | Four-across grid collapses to two-across then the dashes look like zero values. | `admin_mobile_light_overview.png` | Single-column on `< 480px`; skeleton instead of dashes. |
| `admin-dashboard.html` action rows | 4 buttons stack to 4 rows; all same weight. | `admin_mobile_light_overview.png` | 2×2 grid + pick a primary. |
| `admin-login.html` card | Card edges hit the viewport at 390px; feels cramped. | `admin-login_mobile_light.png` | `max-width: min(420px, 100% - 32px); padding: 28px 24px;` |
| `live-display` on mobile | Actually illegible as "live display" on phone — stats cards shrink, STOMP banner wraps. | `live_mobile_light.png` | Add a real `@media (max-width: 900px)` block or explicitly hide the kiosk layout on mobile (kiosk is not meant for phones). |

Also: **no `<meta name="theme-color">`** anywhere, so Safari's mobile chrome is white regardless of theme. Add light/dark pair:
```html
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b0d10" media="(prefers-color-scheme: dark)">
```

---

## 7. Accessibility

Strengths already in the repo:
- `focus-visible` selectors in `a11y.css:44-71` with a blue-ring + offset — solid baseline.
- `prefers-reduced-motion` handled in two places (`styles.css:876`, `a11y.css:110`) — awareness is there.
- An explicit user-controlled reduced-motion toggle (`.a11y-motion-toggle`, `a11y.css:77-107`) — excellent.

Gaps:

| # | Issue | Location | Fix |
|---|---|---|---|
| 1 | Reduced-motion blocks nuke *all* transitions with `transition: none !important` / `transition-duration: 0s !important`. | `styles.css:876-898`, `a11y.css:110-119` | Keep `opacity` and `background-color` transitions (~120ms); kill `transform` and `animation` only. Emil's rubric is explicit about this. |
| 2 | Two reduced-motion blocks exist with different scope (named selectors vs universal). | same | Consolidate into `a11y.css`; delete the duplicate in `styles.css`. |
| 3 | Focus ring uses `outline: 2px solid` with `!important` on `*:focus-visible`. | `a11y.css:44-48` | Works, but `!important` on `*` means you can't locally tune it. Remove `!important` from the universal rule; keep it only on the button override. |
| 4 | On dark surfaces (live-display, hamburger flyout) the focus ring may not meet 3:1 contrast. | `a11y.css:71-74` | Verified partially; test each surface with axe. Consider a two-stop ring: inner white 2px + outer blue 2px for dark bgs. |
| 5 | Color contrast of `--text-secondary: #d1d5db` on `--bg-card: #1f2937` → ~11:1 ✅. Of `--text-tertiary` on gradient background → unverified. | `styles.css:80-83` | Run automated audit (axe) against all 4 surfaces × 2 themes. |
| 6 | No skip-to-content link visible in headers. | `index.html`, `admin-dashboard.html` | Add `<a class="skip-link" href="#main">Skip to content</a>` that becomes visible on focus. |
| 7 | Emoji in headings are read literally by screen readers ("rocket system overview"). | admin-dashboard.html section headers | Replacing with `<svg aria-hidden="true">` + text solves both typography *and* a11y. |
| 8 | `localStorage`-only auth on admin-dashboard (`admin-dashboard.html:1002-1019`) means no `aria-live` announcement when the session expires — user is just teleported. | same | Announce "Session expired, redirecting to login" via a visually-hidden `role="status"` before redirect. |
| 9 | Live-display `WAITING` pill uses red on dark → fine for contrast but communicates "error" semantically. | live-display | Neutral color; pair with `aria-live="polite"` on the activity feed so screen readers announce new entries. |
| 10 | Hamburger flyout likely traps focus poorly. (Not in screenshots — behavioral check.) | `styles.css:200+` | On open: move focus to first flyout item + trap with `inert` on the page; on close: restore focus to hamburger button. |

---

## 8. Notes & artifacts

- Capture spec: `tests/design-audit.spec.ts` — rerun with `npx playwright test tests/design-audit.spec.ts --project=chromium` (requires dev server on :4173; see `playwright.config.ts`).
- Screenshots: `design-review-screenshots/` — 59 PNGs. Naming: `<surface>_<desktop|mobile>_<light|dark>_<variant>.png`.
- Nothing in this review requires a framework migration — every change is CSS-level or drop-in HTML swap.

— End of review —
