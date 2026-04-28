/**
 * Web Share API integration for CxE EMEA Step Tracker
 * Standalone module — hooks into window.stepTracker without modifying existing files.
 * Provides native Web Share API with clipboard fallback.
 */
(function () {
    'use strict';

    // ── Inline CSS ──────────────────────────────────────────────────────
    const STYLE = `
/* Web Share buttons */
.ws-share-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    border: none;
    border-radius: 999px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    background: var(--ms-blue, #0078d4);
    color: #fff;
    box-shadow: var(--shadow, 0 2px 6px rgba(0,0,0,.12));
    transition: transform var(--transition-fast, .15s ease),
                box-shadow var(--transition-fast, .15s ease),
                background var(--transition-fast, .15s ease);
    white-space: nowrap;
    user-select: none;
    -webkit-user-select: none;
    opacity: 0;
    transform: translateY(6px);
    animation: ws-fade-in .4s ease forwards, ws-pulse 1.8s ease .5s 1;
}
.ws-share-btn:hover {
    background: var(--ms-blue-dark, #106ebe);
    box-shadow: var(--shadow-lg, 0 4px 12px rgba(0,0,0,.18));
    transform: translateY(-1px);
}
.ws-share-btn:active {
    transform: scale(.97);
}
.ws-share-btn .ws-icon {
    font-size: 1rem;
    line-height: 1;
}
/* Responsive: full-width on narrow viewports */
@media (max-width: 480px) {
    .ws-share-btn {
        width: 100%;
        justify-content: center;
        padding: 10px 0;
    }
}

/* Container wrappers used to position buttons inside existing cards */
.ws-share-wrap {
    display: flex;
    justify-content: center;
    margin-top: 12px;
}
.ws-share-wrap-left {
    justify-content: flex-start;
}

/* Copied toast overlay */
.ws-toast {
    position: fixed;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: var(--ms-green, #107c10);
    color: #fff;
    padding: 10px 22px;
    border-radius: 999px;
    font-size: .85rem;
    font-weight: 600;
    box-shadow: 0 4px 14px rgba(0,0,0,.2);
    opacity: 0;
    pointer-events: none;
    z-index: 9999;
    transition: opacity .25s ease, transform .25s ease;
}
.ws-toast.ws-show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
}

/* Dark mode tweaks */
[data-theme="dark"] .ws-share-btn {
    box-shadow: 0 2px 8px rgba(0,0,0,.35);
}
[data-theme="dark"] .ws-toast {
    box-shadow: 0 4px 14px rgba(0,0,0,.5);
}

/* Animations */
@keyframes ws-fade-in {
    to { opacity: 1; transform: translateY(0); }
}
@keyframes ws-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0,120,212,.45); }
    50%      { box-shadow: 0 0 0 8px rgba(0,120,212,0); }
}
`;

    // ── Helpers ──────────────────────────────────────────────────────────
    const canNativeShare = !!navigator.share;

    function injectStyle() {
        if (document.getElementById('ws-share-styles')) return;
        const tag = document.createElement('style');
        tag.id = 'ws-share-styles';
        tag.textContent = STYLE;
        document.head.appendChild(tag);
    }

    /** Show a brief "Copied!" toast */
    function showCopiedToast() {
        let toast = document.getElementById('ws-copy-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'ws-copy-toast';
            toast.className = 'ws-toast';
            toast.textContent = '✅ Copied to clipboard!';
            document.body.appendChild(toast);
        }
        toast.classList.add('ws-show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.remove('ws-show'), 2000);
    }

    /**
     * Attempt native share, fall back to clipboard.
     * @param {string} text  - The text to share / copy
     * @param {string} title - Title for the native share dialog
     */
    async function doShare(text, title) {
        if (canNativeShare) {
            try {
                await navigator.share({ title, text });
                return;
            } catch (err) {
                if (err.name === 'AbortError') return; // user cancelled
            }
        }
        // Clipboard fallback
        try {
            await navigator.clipboard.writeText(text);
            showCopiedToast();
        } catch {
            // Last-resort fallback for older browsers
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;left:-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            showCopiedToast();
        }
    }

    /** Create a share button element */
    function createBtn(label, onClick) {
        const btn = document.createElement('button');
        btn.className = 'ws-share-btn';
        btn.type = 'button';
        btn.innerHTML = `<span class="ws-icon">${canNativeShare ? '📤' : '📋'}</span><span>${label}</span>`;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick();
        });
        return btn;
    }

    function wrap(btn, extraClass) {
        const div = document.createElement('div');
        div.className = 'ws-share-wrap' + (extraClass ? ' ' + extraClass : '');
        div.appendChild(btn);
        return div;
    }

    // ── Streak calculator (app doesn't expose one) ─────────────────────
    function calcStreak(user) {
        if (!user || !user.steps) return 0;
        const dates = Object.keys(user.steps)
            .filter(d => user.steps[d] > 0)
            .sort()
            .reverse();
        if (dates.length === 0) return 0;

        const today = new Date().toISOString().split('T')[0];
        // Streak must include today or yesterday to count
        if (dates[0] !== today) {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            if (dates[0] !== yesterday) return 0;
        }

        let streak = 1;
        for (let i = 0; i < dates.length - 1; i++) {
            const curr = new Date(dates[i] + 'T00:00:00');
            const prev = new Date(dates[i + 1] + 'T00:00:00');
            const diff = (curr - prev) / 86400000;
            if (diff === 1) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    // ── Share content builders ──────────────────────────────────────────
    function dashboardText(tracker) {
        const user = tracker.currentUser;
        if (!user) return '';
        const today = tracker.getToday();
        const steps = user.steps[today] || 0;
        const team = (user.team || '').replace(/\s+/g, '');
        return `I walked ${tracker.formatNumber(steps)} steps today at CxE EMEA Offsite 2026! 🚶‍♂️ #${team}Team`;
    }

    function profileText(tracker) {
        const user = tracker.currentUser;
        if (!user) return '';
        const streak = calcStreak(user);
        return `I've walked ${tracker.formatNumber(user.totalSteps)} total steps at CxE EMEA! Current streak: ${streak} day${streak !== 1 ? 's' : ''} 🔥`;
    }

    function leaderboardText(tracker) {
        const user = tracker.currentUser;
        if (!user) return null;
        const sorted = [...tracker.users]
            .filter(u => u && u.name && u.steps && typeof u.steps === 'object')
            .sort((a, b) => (b.totalSteps || 0) - (a.totalSteps || 0));
        const rank = sorted.findIndex(u => u.id === user.id) + 1;
        if (rank !== 1) return null;
        return `I'm #1 on the CxE EMEA Step Tracker leaderboard with ${tracker.formatNumber(user.totalSteps)} steps! 🏆`;
    }

    // ── Button injection ────────────────────────────────────────────────
    const DASH_BTN_ID = 'ws-share-dashboard';
    const PROF_BTN_ID = 'ws-share-profile';
    const LB_BTN_ID = 'ws-share-leaderboard';

    function injectDashboardBtn(tracker) {
        if (document.getElementById(DASH_BTN_ID)) return;
        const anchor = document.querySelector('.progress-card .progress-details');
        if (!anchor) return;
        const btn = createBtn(canNativeShare ? 'Share my progress' : 'Copy my progress', () => {
            const text = dashboardText(tracker);
            if (text) doShare(text, 'My Step Progress');
        });
        btn.id = DASH_BTN_ID;
        anchor.parentElement.appendChild(wrap(btn));
    }

    function injectProfileBtn(tracker) {
        if (document.getElementById(PROF_BTN_ID)) return;
        const anchor = document.querySelector('#profileTab .profile-stats');
        if (!anchor) return;
        const btn = createBtn(canNativeShare ? 'Share achievements' : 'Copy achievements', () => {
            const text = profileText(tracker);
            if (text) doShare(text, 'My Achievements');
        });
        btn.id = PROF_BTN_ID;
        anchor.parentElement.insertBefore(wrap(btn), anchor.nextSibling);
    }

    function injectLeaderboardBtn(tracker) {
        // Remove previous instance first (rank may have changed)
        const existing = document.getElementById(LB_BTN_ID);
        if (existing) existing.parentElement.remove();

        const text = leaderboardText(tracker);
        if (!text) return; // only show when user is #1
        const anchor = document.querySelector('#leaderboardTab .leaderboard-header');
        if (!anchor) return;
        const btn = createBtn(canNativeShare ? 'Share leaderboard' : 'Copy leaderboard', () => {
            doShare(text, 'Leaderboard');
        });
        btn.id = LB_BTN_ID;
        anchor.parentElement.insertBefore(wrap(btn), anchor.nextSibling);
    }

    // ── Monkey-patching ─────────────────────────────────────────────────
    function patch(tracker) {
        const origDash = tracker.updateDashboard.bind(tracker);
        tracker.updateDashboard = function () {
            origDash();
            injectDashboardBtn(tracker);
        };

        const origProfile = tracker.updateProfile.bind(tracker);
        tracker.updateProfile = function () {
            origProfile();
            injectProfileBtn(tracker);
        };

        const origLB = tracker.updateLeaderboard.bind(tracker);
        tracker.updateLeaderboard = function () {
            origLB();
            injectLeaderboardBtn(tracker);
        };
    }

    // ── Bootstrap ───────────────────────────────────────────────────────
    function init() {
        const tracker = window.stepTracker;
        if (!tracker) return false;

        injectStyle();
        patch(tracker);

        // Initial injection for any tab already visible
        if (tracker.currentUser) {
            injectDashboardBtn(tracker);
            injectProfileBtn(tracker);
            injectLeaderboardBtn(tracker);
        }
        return true;
    }

    // Wait for stepTracker to exist (script.js may load later)
    if (!init()) {
        const interval = setInterval(() => {
            if (init()) clearInterval(interval);
        }, 200);
        // Give up after 30 s
        setTimeout(() => clearInterval(interval), 30000);
    }
})();
