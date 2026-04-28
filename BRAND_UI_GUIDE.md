# 🎨 CxE EMEA Step Tracker – Brand & UI Guide

> **Version:** 3.0.0-emea  
> **Edition:** EMEA Offsite 2026 (Munich)

This document defines the visual identity, design tokens, and UI standards for the CxE EMEA Step Tracker application. The aesthetic direction is **Bavarian-Alpine modern** — alpine blue, Bavarian forest green, warm cream, and edelweiss gold, with a subtle Wecken/Rauten diamond motif. The fit-and-finish follows Emil Kowalski's Design Engineering principles.

---

## 🎨 Color Palette

### Brand colors (Bavarian-Alpine)
| Token | Hex | RGB | Usage |
|------|-----|-----|-------|
| `--brand-alpine`    | `#2E5A88` | `46, 90, 136`   | Primary actions, links, focus states, brand wordmark |
| `--brand-forest`    | `#2F5D3A` | `47, 93, 58`    | Secondary, success surfaces, gradient companion |
| `--brand-cream`     | `#F4EDDC` | `244, 237, 220` | Warm surface tint (welcome, empty states) |
| `--brand-snow`      | `#FAFAF7` | `250, 250, 247` | Off-white app base |
| `--brand-stone`     | `#1B2733` | `27, 39, 51`    | Primary text |
| `--brand-edelweiss` | `#E8B23A` | `232, 178, 58`  | Warm gold — podium, achievements, accents |
| `--brand-blossom`   | `#B23A48` | `178, 58, 72`   | Bavarian red — alerts/destructive only |

### Microsoft-named tokens (remapped onto the EMEA palette)
The original `--ms-*` tokens are kept for compatibility but now point at the EMEA identity. New code should prefer the `--brand-*` names.
| Token | Resolves to |
|------|-------------|
| `--ms-blue`        | `var(--brand-alpine)` |
| `--ms-blue-dark`   | `#234668` |
| `--ms-blue-light`  | `#6FA3D2` |
| `--ms-green`       | `var(--brand-forest)` |
| `--ms-orange`      | `var(--brand-edelweiss)` |
| `--ms-red`         | `var(--brand-blossom)` |
| `--ms-purple`      | `#4A3F6B` (muted plum) |
| `--ms-teal`        | `#3A8D87` (alpine-glacier teal) |

### Neutrals (cream-tinted)
| Token | Hex | Usage |
|------|-----|-------|
| `--ms-gray-50`  | `#F7F4EC` | Subtle backgrounds |
| `--ms-gray-100` | `#EFE9DC` | Card backgrounds (alt) |
| `--ms-gray-200` | `#E4DDC9` | Dividers |
| `--ms-gray-300` | `#D5CBB1` | Default borders |
| `--ms-gray-400` | `#B7AC91` | Disabled states |
| `--ms-gray-500` | `#8E866F` | Placeholder text |
| `--ms-gray-600` | `#6A6353` | Secondary text |
| `--ms-gray-700` | `#44403A` | Tertiary text |
| `--ms-gray-800` | `#2B2925` | Dark backgrounds |
| `--ms-gray-900` | `#1B2733` | Primary text (= `--brand-stone`) |

### Semantic / dark theme
```css
--bg-card: white;                  /* dark: #172230 */
--bg-hover: rgba(46, 90, 136, 0.08);
--text-primary: var(--brand-stone);
--border-color: var(--ms-gray-300);
--hairline: rgba(27, 39, 51, 0.08); /* dark: rgba(237,230,210,0.08) */
```

---

## ✍️ Typography

| Role | Family | Weights / opsz | Notes |
|------|--------|----------------|-------|
| Display (headings, wordmark) | **Fraunces** | 400/500/600/700, opsz 9–144 | Variable serif, characterful. `font-optical-sizing: auto`. |
| Body | **Inter** | 300/400/500/600/700 | UI text, copy, forms. |
| Tabular numerals | **Inter Tight** | 500/600/700 | All numbers in stats, leaderboards, weather, countdowns. `font-variant-numeric: tabular-nums lining-nums`. |

Enable globally:
```css
html { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
.stat-value, .leaderboard .steps, [data-tabular] {
  font-family: var(--font-tabular);
  font-variant-numeric: tabular-nums lining-nums;
}
```

---

## 🌈 Gradients

### Primary gradient (alpine → forest)
```css
background: linear-gradient(135deg, var(--brand-alpine), var(--brand-forest));
```

### Success gradient
```css
background: linear-gradient(135deg, var(--brand-forest), var(--ms-teal));
```

### Rainbow Accent (Headers)
```css
background: linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4, #10b981, #f59e0b);
```

### Background Gradient (Page)
```css
background: linear-gradient(135deg, #0078d4, #5c2d91);
```

---

## 📐 Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | `0.25rem` (4px) | Tight spacing |
| `sm` | `0.5rem` (8px) | Compact elements |
| `md` | `1rem` (16px) | Default spacing |
| `lg` | `1.5rem` (24px) | Section spacing |
| `xl` | `2rem` (32px) | Large sections |
| `2xl` | `2.5rem` (40px) | Hero sections |

---

## 🔤 Typography

### Font Family
```css
font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
```

### Font Weights
| Weight | Value | Usage |
|--------|-------|-------|
| Light | `300` | Large display text |
| Regular | `400` | Body text |
| Medium | `500` | Labels, buttons |
| Semi-bold | `600` | Headings, emphasis |
| Bold | `700` | Titles, strong emphasis |

### Font Sizes
| Name | Size | Line Height | Usage |
|------|------|-------------|-------|
| `xs` | `0.75rem` | 1.4 | Captions, badges |
| `sm` | `0.875rem` | 1.5 | Helper text, small labels |
| `base` | `1rem` | 1.6 | Body text |
| `lg` | `1.125rem` | 1.5 | Subheadings |
| `xl` | `1.25rem` | 1.4 | Section titles |
| `2xl` | `1.5rem` | 1.3 | Page titles |
| `3xl` | `1.875rem` | 1.2 | Hero text |

---

## 🔲 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | `0.5rem` (8px) | Buttons, inputs |
| `md` | `0.75rem` (12px) | Cards, dropdowns |
| `lg` | `1rem` (16px) | Modals, large cards |
| `xl` | `1.5rem` (24px) | Hero cards, welcome screen |
| `full` | `50%` | Avatars, icons |

---

## 🌑 Shadows

### Card Shadow
```css
box-shadow: 
    0 25px 50px rgba(0, 0, 0, 0.15),
    0 10px 20px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
```

### Button Shadow (Primary)
```css
box-shadow: 0 4px 12px rgba(0, 120, 212, 0.25);
```

### Hover Shadow
```css
box-shadow: 0 6px 16px rgba(0, 120, 212, 0.35);
```

### Flyout/Modal Shadow
```css
box-shadow: 
    0 25px 50px rgba(0, 0, 0, 0.2),
    0 15px 35px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
```

---

## 🔘 Button Styles

### Primary Button
```css
.btn-primary {
    background: linear-gradient(135deg, var(--ms-blue), var(--ms-blue-dark));
    border: none;
    color: white;
    padding: 0.75rem 1.25rem;
    border-radius: 0.75rem;
    font-weight: 500;
    font-size: 0.95rem;
    min-height: 44px; /* Touch target */
    box-shadow: 0 4px 12px rgba(0, 120, 212, 0.25);
    transition: all 0.2s ease;
}

.btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(0, 120, 212, 0.35);
}
```

### Secondary Button
```css
.btn-secondary {
    background: var(--bg-card);
    border: 2px solid var(--border-color);
    color: var(--text-primary);
    padding: 0.75rem 1.25rem;
    border-radius: 0.75rem;
    font-weight: 500;
    min-height: 44px;
    transition: all 0.2s ease;
}

.btn-secondary:hover {
    border-color: var(--ms-blue);
    background: var(--bg-hover);
}
```

---

## 📦 Card Patterns

### Standard Card
```css
.card {
    background: var(--bg-card);
    border-radius: 1rem;
    border: 1px solid rgba(0, 0, 0, 0.06);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    padding: 1.5rem;
}
```

### Premium Card (with accent)
```css
.card-premium {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border: 1px solid rgba(0, 120, 212, 0.15);
    border-radius: 1rem;
    position: relative;
    overflow: hidden;
}

.card-premium::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--ms-blue), var(--ms-purple), var(--ms-teal));
}
```

---

## 📱 Form Elements

### Input Field
```css
input, select {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 2px solid var(--border-color);
    border-radius: 0.75rem;
    font-size: 1rem;
    background: var(--bg-card);
    color: var(--text-primary);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus, select:focus {
    outline: none;
    border-color: var(--ms-blue);
    box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.15);
}
```

### Labels
```css
label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--text-primary);
    font-size: 0.95rem;
}
```

---

## 🎭 Dark Theme

### Background
```css
[data-theme="dark"] {
    --bg-card: #1f2937;
    --bg-hover: rgba(59, 130, 246, 0.1);
    --text-primary: #f9fafb;
    --text-secondary: #d1d5db;
    --border-color: #4b5563;
}
```

### Card Adjustments
```css
[data-theme="dark"] .card {
    background: linear-gradient(135deg, rgba(31, 41, 55, 0.8) 0%, rgba(55, 65, 81, 0.6) 100%);
    border-color: rgba(96, 165, 250, 0.2);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
```

---

## ⚡ Animations & Transitions

### Standard Transition
```css
transition: all 0.2s ease;
```

### Smooth Transition
```css
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

### Hover Lift
```css
:hover {
    transform: translateY(-2px);
}
```

### Rainbow Shimmer (Accent Bars)
```css
@keyframes rainbowShimmer {
    0%, 100% { background-position: 300% 0; }
    50% { background-position: -100% 0; }
}

.accent-bar {
    background-size: 300% 100%;
    animation: rainbowShimmer 4s ease-in-out infinite;
}
```

---

## ♿ Accessibility

### Touch Targets
- Minimum size: **44px × 44px**
- Buttons, links, and interactive elements must meet this minimum

### Focus States
```css
:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.4);
}
```

### Color Contrast
- Text on light background: minimum **4.5:1** ratio
- Large text: minimum **3:1** ratio
- Use `--text-primary` for body text, `--text-secondary` for supplementary

### ARIA Attributes
- Use `aria-label` for icon-only buttons
- Use `aria-expanded` for expandable elements
- Use `role="dialog"` and `aria-modal="true"` for modals

---

## 📱 Responsive Breakpoints

| Name | Width | Usage |
|------|-------|-------|
| `sm` | `480px` | Small phones |
| `md` | `640px` | Large phones |
| `lg` | `768px` | Tablets |
| `xl` | `1024px` | Laptops |
| `2xl` | `1280px` | Desktops |

---

## 🧩 Component Library

### Icons
- **Library:** Font Awesome 6
- **Style:** Solid (`fas`) for primary, Brand (`fab`) for logos
- **Size:** `1rem` default, `1.25rem` for buttons

### Flyout/Modal Pattern
- Full-screen overlay: `rgba(0, 0, 0, 0.4)`
- Centered card with `max-width: 380px`
- Close button top-right
- Focus trap for accessibility

---

## 📁 File References

| File | Purpose |
|------|---------|
| `styles.css` | All CSS custom properties and components |
| `script.js` | Dark mode toggle, UI interactions |
| `index.html` | Main app structure |
| `manifest.json` | PWA theme colors |

---

## ✅ Checklist for New Components

- [ ] Uses CSS custom properties (no hardcoded colors)
- [ ] Has dark theme variant
- [ ] Touch target ≥ 44px
- [ ] Focus state defined
- [ ] Hover state with subtle lift/shadow
- [ ] Border-radius from scale
- [ ] Shadows from defined patterns
- [ ] Transitions are smooth (0.2s–0.3s)
- [ ] ARIA attributes for accessibility

---

*Maintained by CxE EMEA Team*
