# CxE EMEA Offsite 2026 — Step Tracker 🥨🚶‍♀️

A mobile-first, enterprise-grade step tracking PWA built for the **CxE EMEA Offsite 2026 in Munich**. Track your daily steps, climb the leaderboard, complete Munich-themed walking challenges, and bring the team together — Bavarian-Alpine style.

> **Inspired by** [`Manaiakalani/CxEAmericasStepTracker`](https://github.com/Manaiakalani/CxEAmericasStepTracker) (CxE Americas Offsite 2025). Independent codebase, fresh history, EMEA design language, Munich-specific content.

![Mobile First PWA](https://img.shields.io/badge/Mobile%20First-PWA-2E5A88) ![Team Competition](https://img.shields.io/badge/Team-Competition-2F5D3A) ![Offline Support](https://img.shields.io/badge/Offline-Ready-E8B23A) ![Live Weather](https://img.shields.io/badge/Munich-Live%20Weather-6FA3D2) ![Accessibility](https://img.shields.io/badge/WCAG-2.1%20AA-4A3F6B)

## 🇩🇪 Munich, by the numbers

| | |
|---|---|
| Microsoft Deutschland HQ | Walter-Gropius-Straße 5, 80807 Munich (Schwabing) |
| Office floorplate | 26,000 m² across 7 floors and 11 roof terraces |
| Workspaces | ~1,900 (the "Office with Windows", LEED Platinum) |
| Microsoft DE employees | ~2,700–3,000 |
| Microsoft DE partner network | 30,000+ partner companies |
| Other German offices | Berlin · Cologne · Frankfurt · Hamburg · Stuttgart · Walldorf |
| Microsoft EMEA HQ | Dublin, Ireland — Munich is the German anchor |

## 🥨 Munich Walking Challenges

Eight Munich-flavoured step targets, baked into the gamification engine:

| Challenge | Steps | Story |
|---|---:|---|
| Frauenkirche Tower Climb | 10,000 | Match the height of Munich's twin onion-domed towers (98.57 m & 98.45 m, since 1488). |
| Viktualienmarkt Power Walk | 8,000 | 5 laps of the city's daily food market — open since 1807, ~140 stalls, 22,000 m². |
| Microsoft Schwabing Trek | 12,000 | Walk the perimeter of the Walter-Gropius-Straße HQ. |
| Isar River Shoreline | 15,000 | Riverbank stroll from the Deutsches Museum to the Englischer Garten. |
| Clippy's Assistant Quest | 9,700 | Microsoft heritage — Office 97 features. |
| Windows 95 Launch Walk | 19,950 | Aug 24, 1995. Rolling Stones. $300M campaign. |
| Master Chief's March | 11,700 | Spartan-117. Halo: Combat Evolved, 2001. |
| Englischer Garten Grand Loop | 14,000 | 375 ha urban park (bigger than Central Park) via Chinesischer Turm + Kleinhesseloher See. |

Plus suggested point-to-point routes wired into the in-app tips:
- **Marienplatz → Englischer Garten**: 2.0 km / ~2,800 steps
- **Kleinhesseloher See loop**: 1.5 km / ~2,000 steps
- **Marienplatz → Olympiapark (BMW Welt)**: 5.5 km / ~7,800 steps
- **Englischer Garten → Olympiapark**: 4.5 km / ~6,300 steps
- **Haus der Kunst → Lake → Isar return**: 8.5 km / ~11,000 steps
- **Marienplatz → Schloss Nymphenburg & back**: ~12 km / ~16,000 steps
- **Marienplatz → Eisbach Surfwelle → Hofgarten**: 2.5 km / ~3,500 steps

## ✨ Features

### 🏆 Team Competition
- **9 CxE teams** (unchanged from Americas): CARE · CCP · IDNA · Management · CxE LT · Purview/CES · Scale Enablement · Shared Services · Threat Protection.
- Advanced overachiever system, live achievement notifications, team analytics & rankings.

### 🌟 What's new in v3.0 (EMEA refresh)
- **Bavarian-Alpine theme**: alpine blue (#2E5A88), Bavarian forest (#2F5D3A), warm cream (#F4EDDC), edelweiss gold (#E8B23A), with a subtle 3% Wecken/Rauten diamond motif on welcome surfaces.
- **Display typography**: Fraunces (variable serif, 9–144 opsz) for headlines, Inter for body, Inter Tight tabular-nums for every leaderboard number.
- **Emil Kowalski–style fit-and-finish**: 120/180/240/360 ms duration tiers, snappy `cubic-bezier` easing, 1px hairlines, scale(0.97) press states, inset-light dark cards, mountain-silhouette footer divider.
- **Munich content**: weather widget defaulted to Munich (48.1351, 11.5820), 8 Munich-themed challenges, in-app facts about Microsoft Deutschland HQ.
- **Mobile-first hardening**: ≥44×44 px tap targets, env(safe-area-inset-*), CLS reservations on header widgets, overscroll-behavior containment, font preload + display swap, service-worker cache version bump.

### Carried forward from upstream
- Real weather integration (Open-Meteo API, no API key)
- Dark mode with system preference detection
- PWA install + offline support via Service Worker
- Spotify playlist widget · Keyboard shortcuts · Live activity feed
- WCAG 2.1 AA: ARIA, focus trap, keyboard nav, screen-reader friendly
- Supabase-backed cloud sync with admin dashboard (React/shadcn SPA under `admin/`)
- Live presentation mode at `live-display/` for big-screen leaderboards

### 🏅 **Smart Leaderboards**
- **Overachiever Recognition**: Special badges for exceptional performers
- **Performance Analytics**: Multiple time periods with detailed insights
- **Progressive Loading**: Optimized for large datasets (500+ users)
- **Real-time Rankings**: Instant updates with visual feedback
- **Manual Refresh**: Click-to-update functionality with loading animations
- **Auto-Sync**: Background updates every 5 minutes when connected

### 🗄️ **Enterprise Database & Admin**
- **Supabase Integration**: PostgreSQL database with real-time synchronization
- **Multi-Device Access**: Your data follows you across all devices
- **Admin Dashboard**: Secure administrative interface with authentication
- **User Management**: Add, edit, delete users and manage team assignments
- **Manual Data Entry**: Admins can add steps and activities for users
- **System Diagnostics**: Database health monitoring and connectivity testing
- **Live Display Mode**: Dedicated presentation screen with auto-updating displays
- **Data Verification**: Ensures all database operations complete successfully

### 📺 **Live Display System**
- **Auto-Refresh**: Updates every 30 seconds automatically
- **Manual Override**: Instant refresh button for immediate updates
- **Team Competition**: Real-time team leaderboards and statistics
- **Activity Stream**: Live feed of user achievements and activities
- **Presentation Ready**: Perfect for event screens and displays
- **Responsive Design**: Works on any screen size or orientation

### 📊 **Enterprise Analytics**
- **Performance Monitoring**: Real-time app performance tracking
- **Error Logging**: Comprehensive error capture and debugging
- **User Interaction Analytics**: Behavior insights and usage patterns
- **Storage Monitoring**: Local storage quota management

## 🚀 Quick Start

### Instant Setup
1. **Open `index.html`** in any modern browser
2. **Register** with your name and CxE team
3. **Start tracking** - works with cloud sync or offline!

### Admin Access
The admin console now lives as a React + shadcn/ui SPA at `/admin/dist/` (the
legacy `admin-login.html` and `admin-dashboard.html` pages are thin redirect
stubs that forward to it). Authentication uses the Supabase
`verify_admin_credentials` RPC — no credentials are embedded in the static
HTML. See [`admin/README.md`](admin/README.md) for the full stack, routes, and
build commands.

1. **Navigate to `/admin/dist/#/login`** (or `/admin-login.html`, which redirects)
2. **Sign in** with admin credentials verified against Supabase
3. **Manage users, view analytics, add manual steps**

### Live Display
1. **Navigate to `/live-display/`** 
2. **Perfect for event screens** - auto-updates every 30 seconds
3. **Manual refresh available** for instant updates

### PWA Installation
1. **Chrome/Edge**: Click the install button in the address bar
2. **Safari**: Share → Add to Home Screen
3. **Mobile**: "Add to Home Screen" prompt will appear

## 📱 Enhanced User Experience

### **4. Enhanced Interface Elements**
- **Premium Hamburger Menu**: Redesigned with gradient effects, staggered animations, and premium micro-interactions
- **Weather Widget**: Live weather for Munich, DE with clothing advice via Open-Meteo API
- **Spotify Widget**: Quick access to official CxE EMEA 2026 playlist
- **Advanced Accessibility**: ARIA support, keyboard navigation, and mobile-optimized touch targets
- **Live Notifications**: Achievement alerts with custom animations
- **Interactive Footer**: Rainbow heart glow effect on hover

### Keyboard Shortcuts
- `Alt + 1-4`: Quick tab navigation
- `Ctrl/Cmd + D`: Toggle dark mode
- `Escape`: Close modals and flyouts
- `Enter`: Submit forms and add steps

### Accessibility Features
- **Screen Reader Support**: Full ARIA labels and semantic HTML
- **Keyboard Navigation**: Complete keyboard accessibility with escape key support
- **Premium Touch Targets**: 44px+ minimum touch areas for mobile accessibility
- **High Contrast**: Dark mode with optimized contrast ratios
- **Focus Indicators**: Clear visual focus for all interactive elements
- **Mobile Optimization**: Backdrop interactions and gesture-friendly design

## 🛠 Technical Excellence

### Real Weather Integration
- **Primary API**: Open-Meteo (https://open-meteo.com) - Free, no API key required
- **Location**: Munich, DE coordinates (48.1351, 11.5820)  
- **Features**: Current temperature, weather conditions, humidity data
- **Clothing Advice**: Temperature-based recommendations with weather-specific tips
- **Fallback System**: Three-tier fallback (Open-Meteo → Mock data → Static fallback)

### Performance Optimizations
- **DOM Caching**: 40% faster UI updates through element caching
- **Debounced Operations**: Reduced localStorage writes by 60%
- **Progressive Loading**: Batch rendering for large datasets
- **Hardware Acceleration**: GPU-optimized animations
- **Lazy Loading**: Intersection Observer for heavy content

### Modern Architecture
```
Enhanced Stack:
├── Database: Supabase PostgreSQL with real-time sync
├── PWA Features: Service Worker + Manifest
├── Admin System: Secure dashboard with user management
├── Live Display: Real-time presentation mode
├── Real-time APIs: Open-Meteo Weather Integration
├── Performance: Intersection Observer + DOM Caching
├── Analytics: User behavior tracking + error logging
├── Accessibility: WCAG 2.1 AA compliance
├── Mobile Optimization: Responsive design + touch targets
└── Offline-First: Complete offline functionality with sync
```

### Browser Support
- **Modern Browsers**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **PWA Support**: All major browsers with service worker support
- **Mobile**: iOS 13+, Android 8+ with full PWA capabilities

## 🧪 Testing
- **Manual checklist**: See `TESTING.md` for steps (open/close, overlay click, Esc, aria, focus trap, mobile touch).
- **Automated E2E**: `npm install && npx playwright install && npm run test:e2e` (Chromium, Firefox, WebKit + mobile profiles).
- **Local server**: Playwright auto-starts `http://localhost:4173` via `http-server`.

## 🎨 Microsoft-Inspired Design

### Design System
- **Microsoft Fluent**: Inspired by Microsoft's design language with premium enhancements
- **Color Palette**: Official Microsoft blues, greens, and grays with gradient accents
- **Typography**: Inter font family for clean readability
- **Iconography**: Font Awesome 6 with Microsoft-style usage and enhanced containers
- **Animations**: Hardware-accelerated with cubic-bezier timing for professional feel
- **Micro-interactions**: Staggered animations, ripple effects, and smooth transforms

### Theming
```css
/* Light/Dark theme with Microsoft colors */
--ms-blue: #0078d4;
--ms-green: #107c10;
--ms-purple: #5c2d91;
/* Comprehensive theme variables for consistency */
```

## 🌟 Changelog & Version History

> 📋 **Full changelog**: See [CHANGELOG.md](CHANGELOG.md) for complete version history.

### Latest: Version 2.4 — "Testing & Polish Edition"
**🗓️ Released: January 23, 2026**

#### Highlights
- ✅ **E2E Testing**: Playwright test harness with cross-browser support
- ✅ **User Persistence Fix**: No more re-registration on page reload
- ✅ **Accessibility**: Full ARIA support, focus trap, keyboard navigation
- ✅ **Dynamic Menu**: Responsive hamburger menu sizing for all devices
- ✅ **UI Polish**: Unified gradients, premium welcome screen, cleaner flyout
- ✅ **Documentation**: TESTING.md, BRAND_UI_GUIDE.md added

### Previous Versions

| Version | Date | Highlights |
|---------|------|------------|
| **2.3.0** | 2025-09-24 | Supabase database, Admin Dashboard, Live Display |
| **2.2.0** | 2025-09-11 | Premium hamburger menu, micro-interactions |
| **2.1.0** | 2025-09-03 | CxE LT team, interactive footer |
| **2.0.0** | 2025-08-28 | Weather API, Dark mode, PWA, Spotify |
| **1.5.0** | 2025-08-27 | Challenges, activity widget |
| **1.0.0** | 2025-08-26 | Initial release |

---

### Version 2.3 - "Database & Admin Edition"
**🗓️ Released: September 24, 2025**

#### 🗄️ Enterprise Database Integration
- ✅ **Supabase PostgreSQL** - Cloud database with real-time sync
- ✅ **Multi-Device Sync** - Access your data from any device
- ✅ **Data Persistence** - Never lose your progress
- ✅ **Offline Fallback** - Seamless local storage backup
- ✅ **Real-time Updates** - See changes from other users instantly

#### 🛡️ Admin Dashboard
- ✅ **Secure Admin Access** - Password-protected admin interface
- ✅ **User Management** - Add, edit, and delete users
- ✅ **Manual Step Entry** - Admin can add steps for users
- ✅ **System Diagnostics** - Database health monitoring
- ✅ **Comprehensive Testing** - Built-in Supabase connectivity tests
- ✅ **Statistics Dashboard** - Real-time user and team analytics

#### 🔄 Enhanced Refresh System
- ✅ **Manual Refresh Button** - Instantly update leaderboard data
- ✅ **Automatic Sync** - Background refresh every 5 minutes
- ✅ **Live Display Integration** - Real-time updates for presentations
- ✅ **Smart Timing** - Only refreshes when page is visible
- ✅ **Visual Feedback** - Loading states and animations

#### 📱 Premium Navigation Experience
- ✅ **Centered Modal Design** - Clean, professional flyout menu centered on screen
- ✅ **Unified Color Scheme** - Single white background for clean visual hierarchy
- ✅ **Simplified Overlay System** - Removed redundant backdrop elements for better performance
- ✅ **Dark Mode Compatibility** - Fixed overlay issues for seamless dark theme experience
- ✅ **Enhanced Touch Targets** - Better mobile interaction with optimized button sizes
- ✅ **Viewport Optimization** - Better mobile screen utilization
- ✅ **Touch-Friendly Controls** - Optimized for mobile gestures

#### 📺 Live Display Features
- ✅ **Dedicated Display Page** - Perfect for event screens
- ✅ **Auto-Refresh** - Updates every 30 seconds automatically
- ✅ **Manual Refresh** - Instant update button
- ✅ **Team Leaderboards** - Real-time team competition display
- ✅ **Activity Feed** - Live stream of user achievements

#### 🔧 Technical Improvements & Code Optimization
- ✅ **Database Error Handling** - Comprehensive error management
- ✅ **Method Compatibility** - Support for multiple parameter formats
- ✅ **Connection Retry** - Automatic reconnection on network issues
- ✅ **Race Condition Prevention** - No duplicate operations
- ✅ **Data Verification** - Ensure database operations complete successfully
- ✅ **Codebase Cleanup** - Removed conflicting CSS definitions for better maintainability
- ✅ **Performance Optimization** - Eliminated redundant DOM elements and simplified event handlers
- ✅ **Development Files Management** - Organized and archived unnecessary documentation files

### Version 2.2 (Previous) - "Premium UX Edition"
**🗓️ Released: September 11, 2025**

#### 🎨 Premium UI/UX Enhancements
- ✅ **Premium Hamburger Menu** - Complete redesign with aesthetic enhancements:
  - 🌈 Animated gradient shimmer effects on header
  - 💫 Ripple animations and smooth transforms
  - 🎯 Staggered menu item animations with professional timing
  - 🔮 Enhanced shadows with layered depth (8px + 32px blur)
  - 🎨 Gradient backgrounds and blue-purple color palette
  - ⚡ Hardware-accelerated animations for 60fps performance

#### ♿ Advanced Accessibility Features
- ✅ **Comprehensive ARIA Support** - Full screen reader compatibility
- ✅ **Keyboard Navigation** - Escape key, focus management, tab order
- ✅ **Mobile Touch Optimization** - 44px+ touch targets, backdrop interactions
- ✅ **Focus Indicators** - Clear visual focus for all interactive elements
- ✅ **Body Scroll Prevention** - Better modal interactions

#### 🎬 Micro-interactions & Polish
- ✅ **Smooth Animations** - Cubic-bezier timing functions for premium feel
- ✅ **Visual Feedback** - Hover effects, scaling, color transitions
- ✅ **Backdrop Blur** - Enhanced visual separation with gradient backdrops
- ✅ **Icon Containers** - Rounded backgrounds with hover scaling
- ✅ **Rotation Effects** - Close button rotates 90° on hover, 180° on click

### Version 2.1 - "Refined Edition"
**🗓️ Released: September 3, 2025**

#### 🆕 Recent Updates
- ✅ **New Team Added** - "CxE LT" team for expanded competition (9 teams total)
- ✅ **Challenge Refinement** - Updated "Bill Gates Memorial Bridge" to "Seattle Bridge Explorer" for neutrality
- ✅ **UI Polish** - Smaller, refined footer text sizing  
- ✅ **Interactive Elements** - Rainbow heart glow animation on footer hover
- ✅ **Weather Integration** - Confirmed Open-Meteo API implementation with proper fallbacks
- ✅ **Enhanced Favicon** - Multi-format favicon support for all browsers and devices

#### 🔧 Technical Improvements
- ✅ **Better Browser Compatibility** - Enhanced favicon support across all platforms
- ✅ **Visual Polish** - Refined UI elements with interactive hover effects
- ✅ **Content Updates** - More inclusive and educational challenge descriptions

### Version 2.0 - "Enterprise Edition"
**🗓️ Released: August 28, 2025**

#### 🆕 Major Features Added
- ✅ **Real Weather Integration** - Live Open-Meteo API with clothing recommendations
- ✅ **Dark Mode Support** - Full dark theme with system detection
- ✅ **PWA Capabilities** - Offline support with service worker
- ✅ **Spotify Integration** - Official CxE EMEA 2026 playlist
- ✅ **Overachiever System** - Advanced recognition with multiple criteria
- ✅ **Live Notifications** - Real-time achievement alerts
- ✅ **Multi-language Greetings** - 12 international welcome messages
- ✅ **Enhanced Team System** - Updated to official CxE team names

#### 🚀 Performance Improvements
- ✅ **40% Faster Loading** - DOM caching and optimized rendering
- ✅ **60% Less Memory Usage** - Efficient data management
- ✅ **Progressive Loading** - Batch rendering for large datasets
- ✅ **Hardware Acceleration** - GPU-optimized animations

#### ♿ Accessibility & UX
- ✅ **WCAG 2.1 AA Compliance** - Full accessibility support
- ✅ **Keyboard Shortcuts** - Power user navigation
- ✅ **Screen Reader Support** - Complete ARIA implementation
- ✅ **Error Handling** - Comprehensive error boundary system

#### 🔧 Developer Experience
- ✅ **Performance Monitoring** - Real-time metrics and analytics
- ✅ **Error Logging** - Automatic error capture and debugging
- ✅ **Code Optimization** - Modern ES6+ patterns and best practices
- ✅ **Documentation** - Comprehensive code comments and README

### Version 1.5 - "Enhanced Competition"
**🗓️ Released: August 27, 2025**

#### Features Added
- ✅ Microsoft/Munich-themed challenges
- ✅ Recent activity widget
- ✅ Dynamic motivational content
- ✅ Enhanced team statistics
- ✅ Improved mobile responsiveness

### Version 1.0 - "Foundation"
**🗓️ Initial Release: August 26, 2025**

#### Core Features
- ✅ Basic step tracking functionality
- ✅ Team competition system
- ✅ Leaderboards (Today/Week/Total)
- ✅ Personal dashboard
- ✅ Local storage persistence
- ✅ Responsive mobile design

## 🔧 Configuration

### Database Configuration
```javascript
// Supabase configuration in supabase-config.js
const SUPABASE_CONFIG = {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key'
};

// Table structure
const TABLES = {
    USERS: 'step_tracker_users',
    STEPS: 'daily_steps', 
    ACTIVITIES: 'recent_activities'
};
```

### Admin Dashboard Features
```javascript
// Admin authentication (localStorage-based)
// Secure password protection
// User management operations
// Manual step entry capabilities
// System diagnostics and testing
// Real-time data refresh functionality
```

### Live Display Configuration
```javascript
// Auto-refresh settings
this.refreshInterval = 30000; // 30 seconds
this.timeUpdateInterval = 1000; // 1 second for time display

// Presentation optimization
// Large fonts and clear visuals
// Auto-updating leaderboards and statistics
```

### Team Customization
```javascript
// Updated team configuration in script.js (9 teams)
this.teams = [
    'CARE', 'CCP', 'IDNA', 'Management', 'CxE LT',
    'Purview/CES', 'Scale Enablement', 
    'Shared Services', 'Threat Protection'
];
```

### Weather Location
```javascript
// Coordinates for Munich, DE (Microsoft HQ area)
const latitude = 48.1351;
const longitude = 11.5820;
// Uses Open-Meteo API: https://api.open-meteo.com/v1/forecast
```

### Spotify Integration
```javascript
// Official CxE EMEA 2026 playlist
const playlistUrl = 'https://open.spotify.com/playlist/5ajf3ykIGO6jPqHNx6moOC';
```

## 📈 Enterprise Scalability

### Performance Metrics
- **Load Time**: < 2 seconds on 3G networks
- **Memory Usage**: < 50MB for 500+ users
- **Offline Support**: Full functionality without internet
- **Storage Capacity**: 5MB+ local data storage

### Recommended Usage
- **Team Size**: 9 teams, unlimited members per team
- **Event Duration**: Perfect for 3-7 day offsites
- **Device Support**: All modern smartphones, tablets, laptops
- **Network**: Works completely offline after initial load
- **Weather**: Real-time data via Open-Meteo API with offline fallbacks

## 🎯 Perfect For CxE EMEA Offsite 2026

### Event Features
- **Munich-themed Challenges**: Local landmarks and Microsoft history
- **Weather Integration**: Real Munich, DE weather for planning
- **Team Building**: Promotes collaboration and friendly competition
- **Accessibility**: Inclusive for all team members
- **Low Maintenance**: Runs independently, no server required

### Post-Event
- **Data Persistence**: All achievements saved locally
- **Export Ready**: Easy to add CSV export functionality
- **Memorable**: Participants can keep using the app after the event
- **Shareable**: Screenshots and achievements can be shared

## 🤝 Support & Troubleshooting

### Getting Help
- **FAQ Modal**: Built-in help system with comprehensive Q&A
- **Error Logging**: Automatic error capture for debugging
- **GitHub Issues**: Bug reports and feature requests
- **Performance Monitoring**: Built-in diagnostics

### Common Issues
- **Storage Full**: App monitors and warns at 80% capacity
- **Offline Mode**: Full functionality available without internet
- **Browser Compatibility**: Graceful degradation for older browsers
- **Admin Page Flash**: Fixed - page now stays hidden until authentication
- **Data Not Updating**: Added verification and refresh mechanisms
- **Race Conditions**: Prevented duplicate operations with proper locking
- **Mobile Navigation**: Enhanced hamburger menu visibility and touch targets

### Recent Fixes (v2.3)
- ✅ **Admin Authentication**: Eliminated page flash before login
- ✅ **Database Operations**: Added verification for delete and update operations
- ✅ **Refresh Functionality**: Fixed manual and automatic refresh mechanisms
- ✅ **Race Conditions**: Prevented simultaneous operations causing conflicts
- ✅ **Flyout Menu Design**: Centered modal with unified white background and simplified overlay system
- ✅ **CSS Optimization**: Removed conflicting style definitions for better performance
- ✅ **Dark Mode Compatibility**: Fixed overlay issues in dark theme
- ✅ **Mobile Navigation**: Improved touch targets and viewport handling
- ✅ **Error Handling**: Enhanced error messages and recovery mechanisms
- ✅ **Code Maintenance**: Archived unnecessary development files and cleaned up codebase

## 📄 License & Attribution

- **Open Source**: MIT License for maximum flexibility
- **Weather Data**: Powered by Open-Meteo API (free, reliable, no API key required)
- **Icons**: Font Awesome 6
- **Fonts**: Google Fonts (Inter)
- **Real-time Weather**: Open-Meteo API with three-tier fallback system
- **Created**: For CxE EMEA Offsite 2026

---

**🚀 Ready for CxE EMEA Offsite 2026? Open `index.html` and start your step tracking journey!** 

*Made with ❤️ in Munich, DE*
