# 🧪 Testing

## Manual UI Checklist
1. **Open/Close**
   - Click `hamburger` button → flyout opens, body scroll locks.
   - Click `×` close button → flyout closes, scroll unlocks.
   - Click outside flyout (overlay) → flyout closes.
   - Press `Esc` → flyout closes.
2. **ARIA & Focus**
   - `aria-expanded` toggles on hamburger button (`false` → `true` → `false`).
   - `aria-hidden` toggles on flyout (`true` → `false` → `true`).
   - Focus moves into flyout on open; returns to hamburger button on close.
   - Tabbing cycles inside flyout (focus trap).
3. **Mobile**
   - Test in mobile viewport (e.g., iPhone/Pixel): flyout full-screen overlay.
   - Touch scroll allowed inside flyout content; background scroll prevented.
   - Touch targets ≥44px (hamburger, flyout items, close button).
4. **Cross-browser**
   - Chrome/Edge (Desktop)
   - Firefox (Desktop)
   - Safari (iOS)
5. **Session persistence**
   - Reload with cached users: ensure welcome screen stays hidden and dashboard loads.
   - Offline mode (`stepTrackerUsesSupabase=false`): ensure currentUser persists and UI hydrates from localStorage.

## Automated E2E (Playwright)

### Prerequisites
- Node.js 18+

### Install
```bash
npm install
npx playwright install
```

### Run tests
- Run all browsers (Chromium, Firefox, WebKit) + mobile profiles:
```bash
npm run test:e2e
```

- Run headed:
```bash
npm run test:e2e:headed
```

- Debug mode:
```bash
npm run test:e2e:debug
```

### Notes
- Tests auto-start a static server on `http://localhost:4173`.
- Base URL: `http://localhost:4173` (configured in `playwright.config.ts`).
- Artifacts: Playwright stores traces on first retry (`trace.zip`).
