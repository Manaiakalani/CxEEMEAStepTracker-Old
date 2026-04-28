/**
 * perf-security.js
 * Performance optimizations and security hardening for the CxE EMEA Step Tracker.
 * Standalone enhancement file — monkey-patches window.stepTracker methods non-destructively.
 */
(function () {
  'use strict';

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function sanitizeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/<[^>]*>/g, '');
  }

  function isPositiveInteger(value) {
    const n = Number(value);
    return Number.isFinite(n) && Number.isInteger(n) && n > 0;
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  // ─── Style injection (View Transitions CSS) ───────────────────────────────

  function injectViewTransitionStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* View-transition names for tab panels */
      #dashboardTab  { view-transition-name: tab-panel; }
      #leaderboardTab { view-transition-name: tab-panel; }
      #teamsTab       { view-transition-name: tab-panel; }
      #profileTab     { view-transition-name: tab-panel; }

      /* Only one panel visible at a time, so only one will have the name active */
      .tab-content[style*="display: none"] {
        view-transition-name: none;
      }

      /* Crossfade with slight slide */
      ::view-transition-old(tab-panel) {
        animation: vtFadeSlideOut var(--transition-normal, 0.3s) ease both;
      }
      ::view-transition-new(tab-panel) {
        animation: vtFadeSlideIn var(--transition-normal, 0.3s) ease both;
      }

      @keyframes vtFadeSlideOut {
        from { opacity: 1; transform: translateX(0); }
        to   { opacity: 0; transform: translateX(-8px); }
      }
      @keyframes vtFadeSlideIn {
        from { opacity: 0; transform: translateX(8px); }
        to   { opacity: 1; transform: translateX(0); }
      }
    `;
    document.head.appendChild(style);
  }

  // ─── Resource Hints ────────────────────────────────────────────────────────

  function addResourceHints() {
    // TODO(emea): replace with the EMEA Supabase project URL
    const supabaseUrl = 'https://YOUR-EMEA-PROJECT.supabase.co';

    if (!document.querySelector(`link[href="${supabaseUrl}"]`)) {
      const preconnect = document.createElement('link');
      preconnect.rel = 'preconnect';
      preconnect.href = supabaseUrl;
      preconnect.crossOrigin = 'anonymous';
      document.head.appendChild(preconnect);

      const dnsPrefetch = document.createElement('link');
      dnsPrefetch.rel = 'dns-prefetch';
      dnsPrefetch.href = supabaseUrl;
      document.head.appendChild(dnsPrefetch);
    }
  }

  // ─── Content Security Policy ───────────────────────────────────────────────

  function injectCSP() {
    if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
      "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co https://api.open-meteo.com"
    ].join('; ');
    document.head.prepend(meta);
  }

  // ─── Rate Limiter (in-memory) ──────────────────────────────────────────────

  const rateLimitStore = {}; // keyed by user name

  function isRateLimited(userName) {
    const now = Date.now();
    const windowMs = 60_000;
    const maxRequests = 10;

    if (!rateLimitStore[userName]) {
      rateLimitStore[userName] = [];
    }

    const timestamps = rateLimitStore[userName];
    // Purge entries older than the window
    while (timestamps.length && timestamps[0] <= now - windowMs) {
      timestamps.shift();
    }

    if (timestamps.length >= maxRequests) {
      return true;
    }

    timestamps.push(now);
    return false;
  }

  // ─── Admin Security ────────────────────────────────────────────────────────

  const ADMIN_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  let adminActivityTimer = null;

  function logAdminAction(action, details) {
    try {
      const log = JSON.parse(localStorage.getItem('stepTrackerAdminAuditLog') || '[]');
      log.push({
        action,
        details,
        timestamp: new Date().toISOString()
      });
      // Keep last 500 entries
      if (log.length > 500) log.splice(0, log.length - 500);
      localStorage.setItem('stepTrackerAdminAuditLog', JSON.stringify(log));
    } catch (_) { /* non-blocking */ }
  }

  function resetAdminTimer(tracker) {
    if (adminActivityTimer) clearTimeout(adminActivityTimer);
    adminActivityTimer = setTimeout(function () {
      // Expire admin session
      localStorage.removeItem('stepTrackerAdminSession');
      localStorage.removeItem('adminSession');
      localStorage.removeItem('adminSessionExpiry');
      logAdminAction('session_timeout', 'Admin session expired due to inactivity');
      if (tracker && typeof tracker.showMessage === 'function') {
        tracker.showMessage('Admin session expired due to inactivity.', 'warning');
      }
    }, ADMIN_TIMEOUT_MS);
  }

  function setupAdminSecurity(tracker) {
    const hasAdmin =
      localStorage.getItem('stepTrackerAdminSession') ||
      localStorage.getItem('adminSession');

    if (!hasAdmin) return;

    logAdminAction('session_init', 'Admin security monitoring started');
    resetAdminTimer(tracker);

    ['click', 'keydown', 'mousemove', 'touchstart'].forEach(function (evt) {
      document.addEventListener(evt, function () {
        if (
          localStorage.getItem('stepTrackerAdminSession') ||
          localStorage.getItem('adminSession')
        ) {
          resetAdminTimer(tracker);
        }
      }, { passive: true });
    });
  }

  function checkDataIntegrity(tracker) {
    if (!tracker || !tracker.users) return;

    const MAX_DAILY = 500000;
    const MAX_TOTAL = 50_000_000; // over a season
    const warnings = [];

    Object.keys(tracker.users).forEach(function (name) {
      const user = tracker.users[name];
      if (!user) return;

      const totalSteps = user.totalSteps || 0;
      if (totalSteps > MAX_TOTAL) {
        warnings.push(name + ': suspicious total (' + totalSteps + ')');
      }

      if (user.dailySteps && typeof user.dailySteps === 'object') {
        Object.keys(user.dailySteps).forEach(function (day) {
          if (user.dailySteps[day] > MAX_DAILY) {
            warnings.push(name + ': suspicious daily ' + day + ' (' + user.dailySteps[day] + ')');
          }
        });
      }
    });

    if (warnings.length) {
      logAdminAction('integrity_check', warnings);
      console.warn('[perf-security] Data integrity warnings:', warnings);
    }
  }

  // ─── Dirty-tab tracking for lazy rendering ─────────────────────────────────

  const dirtyTabs = {
    dashboard: true,
    leaderboard: true,
    teams: true,
    profile: true
  };

  function markAllDirty() {
    dirtyTabs.dashboard = true;
    dirtyTabs.leaderboard = true;
    dirtyTabs.teams = true;
    dirtyTabs.profile = true;
  }

  // ─── Monkey-patching ──────────────────────────────────────────────────────

  function applyPatches(tracker) {
    // --- 1. switchTab: View Transitions API ---
    const origSwitchTab = tracker.switchTab.bind(tracker);

    tracker.switchTab = function (tabName) {
      if (document.startViewTransition) {
        document.startViewTransition(function () {
          origSwitchTab(tabName);
        });
      } else {
        origSwitchTab(tabName);
      }
    };

    // --- 2. addSteps: Input sanitization + rate limiting ---
    const origAddSteps = tracker.addSteps.bind(tracker);

    tracker.addSteps = function () {
      const stepsInput = document.getElementById('stepsInput');
      if (!stepsInput) return origAddSteps.apply(tracker, arguments);

      const raw = stepsInput.value;

      // Must be numeric (reject HTML/scripts)
      if (raw !== '' && !/^\d+$/.test(raw.trim())) {
        tracker.showMessage('Please enter a valid number.', 'error');
        stepsInput.value = '';
        return;
      }

      const steps = parseInt(raw, 10);

      if (!isPositiveInteger(steps)) {
        tracker.showMessage('Steps must be a positive whole number.', 'error');
        return;
      }

      if (steps > 200000) {
        tracker.showMessage('Maximum 200,000 steps per entry.', 'error');
        return;
      }

      // Daily cap check
      if (tracker.currentUser && tracker.users && tracker.users[tracker.currentUser]) {
        const user = tracker.users[tracker.currentUser];
        const today = todayKey();
        const todaySteps = (user.dailySteps && user.dailySteps[today]) || 0;
        if (todaySteps + steps > 500000) {
          tracker.showMessage('Daily maximum of 500,000 steps reached.', 'error');
          return;
        }
      }

      // Rate limiting
      const userName = tracker.currentUser || 'anonymous';
      if (isRateLimited(userName)) {
        tracker.showMessage('Slow down! You can add steps up to 10 times per minute.', 'warning');
        return;
      }

      // Log if admin
      if (
        localStorage.getItem('stepTrackerAdminSession') ||
        localStorage.getItem('adminSession')
      ) {
        logAdminAction('add_steps', { user: userName, steps: steps });
      }

      markAllDirty();
      return origAddSteps.apply(tracker, arguments);
    };

    // --- 3. updateUI: Batching + lazy rendering ---
    const origUpdateUI = tracker.updateUI.bind(tracker);

    tracker.updateUI = function () {
      markAllDirty();

      requestAnimationFrame(function () {
        if (!tracker.currentUser) {
          origUpdateUI();
          return;
        }

        const currentTab = tracker.currentTab || 'dashboard';

        // Render only the active tab synchronously
        switch (currentTab) {
          case 'dashboard':
            if (dirtyTabs.dashboard && typeof tracker.updateDashboard === 'function') {
              tracker.updateDashboard();
              dirtyTabs.dashboard = false;
            }
            break;
          case 'leaderboard':
            if (dirtyTabs.leaderboard && typeof tracker.updateLeaderboard === 'function') {
              tracker.updateLeaderboard();
              dirtyTabs.leaderboard = false;
            }
            break;
          case 'teams':
            if (dirtyTabs.teams && typeof tracker.updateTeamStats === 'function') {
              tracker.updateTeamStats();
              dirtyTabs.teams = false;
            }
            break;
          case 'profile':
            if (dirtyTabs.profile && typeof tracker.updateProfile === 'function') {
              tracker.updateProfile();
              dirtyTabs.profile = false;
            }
            break;
        }

        // Hide welcome screen for logged-in user
        if (typeof tracker.hideWelcomeScreen === 'function') {
          tracker.hideWelcomeScreen();
        }

        // Defer non-visible tab updates with requestIdleCallback
        var idleCallback = window.requestIdleCallback || function (cb) { setTimeout(cb, 100); };
        idleCallback(function () {
          ['dashboard', 'leaderboard', 'teams', 'profile'].forEach(function (tab) {
            if (tab !== currentTab && dirtyTabs[tab]) {
              switch (tab) {
                case 'dashboard':
                  if (typeof tracker.updateDashboard === 'function') tracker.updateDashboard();
                  break;
                case 'leaderboard':
                  if (typeof tracker.updateLeaderboard === 'function') tracker.updateLeaderboard();
                  break;
                case 'teams':
                  if (typeof tracker.updateTeamStats === 'function') tracker.updateTeamStats();
                  break;
                case 'profile':
                  if (typeof tracker.updateProfile === 'function') tracker.updateProfile();
                  break;
              }
              dirtyTabs[tab] = false;
            }
          });
        });
      });
    };

    // --- 4. updateLeaderboard: DocumentFragment batching ---
    const origUpdateLeaderboard = tracker.updateLeaderboard.bind(tracker);

    tracker.updateLeaderboard = function () {
      // Batch DOM writes via DocumentFragment
      const list = document.getElementById('leaderboardList');
      if (!list) return origUpdateLeaderboard();

      // Read the original method's output by letting it run on a detached container
      const tempContainer = document.createElement('div');
      const realList = list;

      // Temporarily swap the element so the original writes to our temp container
      realList.id = '_leaderboardList_swap';
      tempContainer.id = 'leaderboardList';
      realList.parentNode.insertBefore(tempContainer, realList);

      try {
        origUpdateLeaderboard();
      } finally {
        // Move children to a fragment, then flush to real list
        var fragment = document.createDocumentFragment();
        while (tempContainer.firstChild) {
          fragment.appendChild(tempContainer.firstChild);
        }

        // Single DOM write
        realList.innerHTML = '';
        realList.appendChild(fragment);
        realList.id = 'leaderboardList';
        tempContainer.remove();
      }
    };

    // --- 5. Sanitize user-facing text fields ---
    if (tracker.users && typeof tracker.users === 'object') {
      Object.keys(tracker.users).forEach(function (name) {
        var u = tracker.users[name];
        if (u && u.name) u.name = sanitizeHTML(u.name);
        if (u && u.team) u.team = sanitizeHTML(u.team);
      });
    }

    // Patch saveData to sanitize before persisting
    const origSaveData = tracker.saveData.bind(tracker);
    tracker.saveData = function () {
      if (tracker.users && typeof tracker.users === 'object') {
        Object.keys(tracker.users).forEach(function (name) {
          var u = tracker.users[name];
          if (u && u.name) u.name = sanitizeHTML(u.name);
          if (u && u.team) u.team = sanitizeHTML(u.team);
        });
      }
      return origSaveData.apply(tracker, arguments);
    };
  }

  // ─── Initialization ──────────────────────────────────────────────────────

  function init() {
    var tracker = window.stepTracker;
    if (!tracker) {
      // Retry until stepTracker is available (DOMContentLoaded may not have fired)
      setTimeout(init, 50);
      return;
    }

    // Inject CSS and meta tags
    injectViewTransitionStyles();
    addResourceHints();
    injectCSP();

    // Apply monkey-patches
    applyPatches(tracker);

    // Admin security
    setupAdminSecurity(tracker);
    checkDataIntegrity(tracker);

    // Expose sanitizeHTML as a utility
    tracker.sanitizeHTML = sanitizeHTML;

    console.log('[perf-security] Performance & security enhancements loaded.');
  }

  // Start as soon as possible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
