# Changelog

All notable changes to the CxE EMEA Step Tracker are documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and follows the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

> **Heritage:** Versions 1.x – 2.4.x were shipped as `CxEAmericasStepTracker` for the CxE Americas Offsite 2025. v3.0.0-emea is a fresh repo (not a fork) with a new git history, rebranded for the **CxE EMEA Offsite 2026 in Munich**.

---

## [3.0.0-emea] - 2026 EMEA refresh

### 🏅 Munich landmark badges & community touches
- New **Munich-landmark milestone badges** in `gamification.js`: Frauenkirche Climber (10K), Marktstand Wanderer (8K Viktualienmarkt), Isar Explorer (15K), Garten Grand Looper (14K), Schwabing Trekker (12K, Microsoft DE HQ perimeter), Nymphenburg Royal (16K).
- Added a **Munich Theme Days** section to the FAQ modal: Marienplatz Monday, Trachten Tuesday, Walking Shoes Wednesday, Trail Mix Thursday, Fancy Shoe Friday, Surfwelle Saturday.
- Added a **Suggested Munich Routes** card in the FAQ with 7 real walking routes mapped to step counts (Marienplatz → Englischer Garten, Kleinhesseloher See loop, Eisbach Surfwelle, Olympiapark, Isar return, Nymphenburg).

### 🧪 React admin audit (Vercel React Best Practices)
- Verified `admin/` already follows the practices that matter: React Query for server state, no `useEffect`-for-derived-state, `useMemo` only where measurably useful, no premature `'use client'` (Vite SPA, none needed), stable list keys, route-level code splitting via `react-router`. No structural refactor required.
- `admin/dist/` is committed (matches the parent static site's deployment model) and rebuilds cleanly on Vite 5.

### 🇩🇪 Munich & EMEA content
- Defaulted weather widget to **Munich, DE** (48.1351, 11.5820, `Europe/Berlin` timezone) via Open-Meteo.
- Replaced Pacific-Northwest challenges with **Munich-themed** equivalents: Frauenkirche Tower Climb, Viktualienmarkt Power Walk, Microsoft Schwabing Trek, Isar River Shoreline, Englischer Garten Grand Loop. Kept Microsoft heritage challenges (Clippy, Windows 95, Master Chief).
- Added Microsoft Deutschland HQ facts (Walter-Gropius-Straße, ~1,900 workspaces, 26,000 m², LEED Platinum, ~2,700–3,000 DE employees, 30,000+ partner companies).
- Updated the Live Display challenge roster + footer location.

### 🎨 Bavarian-Alpine theme
- New CSS custom properties: `--brand-alpine` (#2E5A88), `--brand-forest` (#2F5D3A), `--brand-cream` (#F4EDDC), `--brand-snow` (#FAFAF7), `--brand-stone` (#1B2733), `--brand-edelweiss` (#E8B23A), `--brand-blossom` (#B23A48).
- Existing `--ms-*` Microsoft tokens remapped onto the alpine palette so the rest of the stylesheet inherits the new identity without touching every selector.
- Added subtle Wecken/Rauten **Bavarian diamond motif** at very low opacity on welcome / empty surfaces.
- New mountain-silhouette footer divider (decorative SVG, 10% opacity light / 16% opacity dark).
- Theme color (`<meta>` and PWA manifest) updated to `#2E5A88`.

### ✍️ Typography
- Display font: **Fraunces** (variable, opsz 9–144) for headlines and the brand wordmark.
- Body font: Inter retained.
- New **Inter Tight** with `font-variant-numeric: tabular-nums lining-nums` applied to every leaderboard, stat, and weather number.
- Added font preconnects + display swap for faster first paint.

### 🎯 Emil Kowalski – style fit-and-finish
- Standardised duration tiers: 120ms press, 180ms tooltip, 240ms tab/dropdown, 360ms modal/drawer.
- Tactile `scale(0.97)` press on every button with the existing `cubic-bezier(0.23, 1, 0.32, 1)` easing.
- 1px hairline borders (`rgba(27,39,51,0.08)` light / `rgba(237,230,210,0.08)` dark) replacing solid borders on cards, leaderboard rows, modals, weather/Spotify widgets.
- Inset-light highlight on dark cards (`box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06)`) for crispness.

### 📱 Mobile-first hardening
- Enforced ≥44×44 px tap targets on all primary controls (nav, hamburger, modal close, theme toggle, quick actions).
- `env(safe-area-inset-*)` padding on header / footer / app container.
- CLS reservations (`min-height` / `min-width`) on weather widget, Spotify widget, and primary stat values.
- `overscroll-behavior: contain` on leaderboard, leaderboard list, and activity feed.
- Service worker `CACHE_VERSION` bumped to `2026-emea-001` so returning visitors hard-refresh.

### 🛠️ Developer experience
- `package.json` renamed `cxe-emea-step-tracker`, version `3.0.0-emea`.
- Supabase configuration replaced with placeholders (`YOUR-EMEA-PROJECT.supabase.co` + `YOUR_EMEA_SUPABASE_ANON_KEY`) in `supabase-config.js`, `perf-security.js`, and `admin/src/lib/supabase.ts` — wire up a fresh EMEA Supabase project before deploying.
- `admin/dist/` removed from git and added to `.gitignore`; rebuild via `cd admin && npm install && npm run build`.
- Playwright `tests/full-site.spec.ts` updated to expect "Munich" instead of "Redmond".

---

## [2.4.1] - 2026-01-23

### 🎨 Improved
- **Dynamic Hamburger Menu Sizing**: Menu scales responsively across all device sizes using CSS `clamp()` and viewport-relative units
- **Removed Menu Scroll**: Flyout no longer has internal scroll - content fits naturally
- **Hamburger Button Polish**: Matched button styling to FAQ & Info menu items (white card background, soft shadow, blue icon)
- **Breakpoint Refinements**: Added large desktop (1440px+) and tablet (1024px) specific sizing

### 🔧 Fixed
- **Menu Overflow**: Removed `max-height` constraints and `overflow-y: auto` that caused unnecessary scrollbars
- **Mobile Menu Sizing**: Better dynamic sizing with `calc(100vw - 1rem)` on small screens

---

## [2.4.0] - 2026-01-23

### ✨ Added
- **Playwright E2E Testing**: Full test harness with cross-browser support (Chromium, Firefox, WebKit, Mobile Safari, Mobile Chrome)
- **Hamburger Menu Tests**: Automated tests for aria states, focus trap, overlay click, ESC key, scroll lock
- **Session Persistence Tests**: E2E tests verifying user login state survives page reload
- **TESTING.md**: Comprehensive manual + automated testing documentation
- **BRAND_UI_GUIDE.md**: Complete brand and UI documentation with design tokens
- `package.json`, `playwright.config.ts`, `tsconfig.json` for test infrastructure

### 🔧 Fixed
- **User Persistence Bug**: Users no longer forced to re-register on every page load
- **Optimistic Hydration**: Load cached users immediately while Supabase fetches (eliminates blank state)
- **`loadCurrentUser()` Fallback**: Now checks localStorage cache when in-memory users not yet loaded
- **`updateUI()` Logic**: Properly hides welcome screen when `currentUser` exists
- **Hamburger Menu Accessibility**: Added `aria-expanded`, `aria-controls`, `aria-hidden`, focus trap, focus restore
- **Duplicate JS Function**: Removed redundant `removeMobileTouchPrevention()` definition
- **Redundant Event Listener**: Removed duplicate ESC key handler for hamburger menu
- **Tab Background Gradient**: Unified gradient across all tabs (Dashboard/Leaderboard/Teams/Profile)
- **Welcome Screen UI**: Improved spacing, styling with premium card design

### 🎨 Improved
- **Hamburger Flyout CSS**: Unified full-screen overlay style, removed conflicting off-canvas rules
- **Dark Theme Flyout**: Simplified overlay background for consistency
- **Service Worker Cache**: Bumped `CACHE_VERSION` for fresh deploys

### 📋 Enhanced
- Complete User Merge functionality with preview and safety confirmations
- Smart Auto-Merge for automatic duplicate user resolution
- Enhanced duplicate detection with similarity algorithms
- Advanced User Actions section in admin dashboard
- Per-user merge buttons in user management table
- Comprehensive form validation and error handling

### 🛡️ Security
- Multiple confirmation dialogs for irreversible actions
- Merge preview functionality before execution
- Automatic data verification after operations
- Enhanced logging for audit trails

---

## [2.3.0] - 2025-09-24 — "Database & Admin Edition"

### ✨ Added
- **Supabase Database Integration**: Cloud-based PostgreSQL with real-time synchronization
- **Admin Dashboard**: Comprehensive admin interface with secure authentication
- **Live Display System**: Dedicated presentation mode with auto-updating leaderboards
- **Enhanced Refresh System**: Manual and automatic data refresh with visual feedback
- **User Management**: Add, edit, delete users and manage team assignments
- **Manual Step Entry**: Admins can add steps for users
- **System Diagnostics**: Database health monitoring and connectivity testing

### 🎨 Improved
- **Centered Modal Design**: Clean, professional flyout menu centered on screen
- **Unified Color Scheme**: Single white background for clean visual hierarchy
- **Simplified Overlay System**: Removed redundant backdrop elements for better performance
- **Dark Mode Compatibility**: Fixed overlay issues for seamless dark theme experience
- **Enhanced Touch Targets**: Better mobile interaction with optimized button sizes
- **Viewport Optimization**: Better mobile screen utilization

### 🔧 Fixed
- **Database Error Handling**: Comprehensive error management
- **Method Compatibility**: Support for multiple parameter formats
- **Connection Retry**: Automatic reconnection on network issues
- **Race Condition Prevention**: No duplicate operations
- **Data Verification**: Ensure database operations complete successfully

---

## [2.2.0] - 2025-09-11 — "Premium UX Edition"

### ✨ Added
- **Premium Hamburger Menu**: Complete redesign with gradient effects and staggered animations
- **Ripple Animations**: Smooth transforms and visual feedback
- **Enhanced Shadows**: Layered depth with 8px + 32px blur effects

### ♿ Accessibility
- **Comprehensive ARIA Support**: Full screen reader compatibility
- **Keyboard Navigation**: Escape key, focus management, tab order
- **Mobile Touch Optimization**: 44px+ touch targets, backdrop interactions
- **Focus Indicators**: Clear visual focus for all interactive elements
- **Body Scroll Prevention**: Better modal interactions

### 🎨 Improved
- **Micro-interactions**: Cubic-bezier timing functions for premium feel
- **Visual Feedback**: Hover effects, scaling, color transitions
- **Backdrop Blur**: Enhanced visual separation with gradient backdrops
- **Icon Containers**: Rounded backgrounds with hover scaling
- **Rotation Effects**: Close button rotates 90° on hover, 180° on click

---

## [2.1.0] - 2025-09-03 — "Refined Edition"

### ✨ Added
- **New Team**: "CxE LT" team for expanded competition (9 teams total)
- **Interactive Footer**: Rainbow heart glow animation on hover
- **Enhanced Favicon**: Multi-format favicon support for all browsers

### 🔧 Changed
- **Challenge Refinement**: Updated "Bill Gates Memorial Bridge" to "Seattle Bridge Explorer" for neutrality
- **UI Polish**: Smaller, refined footer text sizing
- **Weather Integration**: Confirmed Open-Meteo API implementation with proper fallbacks

---

## [2.0.0] - 2025-08-28 — "Enterprise Edition"

### ✨ Added
- **Real Weather Integration**: Live Open-Meteo API with clothing recommendations
- **Dark Mode Support**: Full dark theme with system preference detection
- **PWA Capabilities**: Offline support with service worker caching
- **Spotify Integration**: Official CxE EMEA 2026 playlist
- **Overachiever System**: Advanced recognition with multiple criteria
- **Live Notifications**: Real-time achievement alerts with animations
- **Multi-language Greetings**: 12 international welcome messages
- **Keyboard Shortcuts**: Power user navigation (Alt+1-4, Ctrl/Cmd+D, Escape)

### 🚀 Performance
- **40% Faster Loading**: DOM caching and optimized rendering
- **60% Less Memory Usage**: Efficient data management
- **Progressive Loading**: Batch rendering for large datasets
- **Hardware Acceleration**: GPU-optimized animations

### ♿ Accessibility
- **WCAG 2.1 AA Compliance**: Full accessibility support
- **Screen Reader Support**: Complete ARIA implementation
- **High Contrast**: Dark mode with optimized contrast ratios

### 🔧 Developer Experience
- **Performance Monitoring**: Real-time metrics and analytics
- **Error Logging**: Automatic error capture and debugging
- **Code Optimization**: Modern ES6+ patterns and best practices

---

## [1.5.0] - 2025-08-27 — "Enhanced Competition"

### ✨ Added
- Microsoft/Seattle-themed challenges with educational facts
- Recent activity widget with live feed
- Dynamic motivational content (rotating phrases)
- Enhanced team statistics and analytics
- Improved mobile responsiveness

---

## [1.0.0] - 2025-08-26 — "Foundation"

### ✨ Initial Release
- Basic step tracking functionality
- Team competition system (8 teams)
- Leaderboards (Today/Week/Total)
- Personal dashboard with progress visualization
- Local storage persistence
- Responsive mobile-first design
- Profile management

---

## Version Summary

| Version | Date | Codename | Highlights |
|---------|------|----------|------------|
| 2.4.1 | 2026-01-23 | - | Dynamic menu sizing, scroll removal |
| 2.4.0 | 2026-01-23 | - | E2E testing, user persistence fix, accessibility |
| 2.3.0 | 2025-09-24 | Database & Admin | Supabase, Admin Dashboard, Live Display |
| 2.2.0 | 2025-09-11 | Premium UX | Hamburger menu redesign, micro-interactions |
| 2.1.0 | 2025-09-03 | Refined | CxE LT team, interactive footer |
| 2.0.0 | 2025-08-28 | Enterprise | Weather, Dark mode, PWA, Spotify |
| 1.5.0 | 2025-08-27 | Enhanced Competition | Challenges, activity widget |
| 1.0.0 | 2025-08-26 | Foundation | Initial release |

---

*Made with ❤️ for CxE EMEA Offsite 2026*
