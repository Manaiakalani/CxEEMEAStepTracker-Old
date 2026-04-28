/* ===========================================
   Gamification System
   Streak tracking + Badge/Achievement system
   Standalone module – hooks into window.stepTracker
   =========================================== */

(function () {
    'use strict';

    // ── Badge definitions ──────────────────────────────────────────
    const BADGES = [
        { id: 'first-steps',     name: 'First Steps',      emoji: '🏃', description: 'Add steps for the first time',           check: (u) => u.totalSteps > 0 },
        { id: 'goal-crusher',    name: 'Goal Crusher',      emoji: '🎯', description: 'Meet your daily goal',                   check: (u, ctx) => ctx.todaySteps >= u.dailyGoal },
        { id: 'on-fire',         name: 'On Fire',           emoji: '🔥', description: '3-day streak',                           check: (u) => (u.streak && u.streak.current >= 3) },
        { id: 'unstoppable',     name: 'Unstoppable',       emoji: '⚡', description: '7-day streak',                           check: (u) => (u.streak && u.streak.current >= 7) },
        { id: 'marathon-week',   name: 'Marathon Week',     emoji: '🏆', description: '70K+ steps in a week',                   check: (u, ctx) => ctx.weekSteps >= 70000 },
        { id: 'leaderboard-king',name: 'Leaderboard King',  emoji: '👑', description: 'Reach #1 on leaderboard',                check: (_u, ctx) => ctx.rank === 1 },
        { id: 'overachiever',    name: 'Overachiever',      emoji: '🌟', description: '150% of daily goal in one day',          check: (u, ctx) => ctx.todaySteps >= u.dailyGoal * 1.5 },
        { id: 'iron-will',       name: 'Iron Will',         emoji: '💪', description: '14-day streak',                          check: (u) => (u.streak && u.streak.current >= 14) },
        { id: 'century-club',    name: 'Century Club',      emoji: '🎖️', description: '100K total steps',                       check: (u) => u.totalSteps >= 100000 },
        { id: 'quarter-million', name: 'Quarter Million',   emoji: '🏅', description: '250K total steps',                       check: (u) => u.totalSteps >= 250000 },
        { id: 'half-million',    name: 'Half Million',      emoji: '💎', description: '500K total steps',                       check: (u) => u.totalSteps >= 500000 },
        { id: 'step-master',     name: 'Step Master',       emoji: '🚀', description: '1M total steps',                         check: (u) => u.totalSteps >= 1000000 },
    ];

    // ── Progress-trackable badges (shown as progress bars) ────────
    const PROGRESS_BADGES = [
        { id: 'century-club',    target: 100000,  field: 'totalSteps' },
        { id: 'quarter-million', target: 250000,  field: 'totalSteps' },
        { id: 'half-million',    target: 500000,  field: 'totalSteps' },
        { id: 'step-master',     target: 1000000, field: 'totalSteps' },
        { id: 'on-fire',         target: 3,       field: 'streak'     },
        { id: 'unstoppable',     target: 7,       field: 'streak'     },
        { id: 'iron-will',       target: 14,      field: 'streak'     },
    ];

    // ── Helpers ────────────────────────────────────────────────────
    function dateStr(d) {
        const dt = d instanceof Date ? d : new Date(d);
        return dt.toISOString().slice(0, 10);
    }

    function prevDay(ds) {
        const d = new Date(ds + 'T12:00:00');
        d.setDate(d.getDate() - 1);
        return dateStr(d);
    }

    function formatShortDate(ds) {
        const d = new Date(ds + 'T12:00:00');
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    function getWeekSteps(user) {
        const today = new Date();
        let total = 0;
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = dateStr(d);
            total += (user.steps[key] || 0);
        }
        return total;
    }

    function getUserRank(tracker) {
        if (!tracker.currentUser || !tracker.users) return 999;
        const sorted = [...tracker.users].sort((a, b) => b.totalSteps - a.totalSteps);
        const idx = sorted.findIndex(u => u.id === tracker.currentUser.id);
        return idx + 1;
    }

    // ── Streak calculation ─────────────────────────────────────────
    function calculateStreak(user, today) {
        if (!user.steps || !user.dailyGoal) return { current: 0, longest: 0, lastActiveDate: null };

        const goal = user.dailyGoal;
        let checkDate = today;

        // If today's steps haven't met the goal yet, start checking from yesterday
        if ((user.steps[today] || 0) < goal) {
            checkDate = prevDay(today);
        }

        let current = 0;
        let d = checkDate;
        while (true) {
            const s = user.steps[d] || 0;
            if (s >= goal) {
                current++;
                d = prevDay(d);
            } else {
                break;
            }
        }

        // Longest streak ever (scan all days)
        const dates = Object.keys(user.steps).sort();
        let longest = user.streak ? (user.streak.longest || 0) : 0;
        let run = 0;
        for (let i = 0; i < dates.length; i++) {
            if ((user.steps[dates[i]] || 0) >= goal) {
                // Check continuity
                if (i === 0 || dates[i] === nextDay(dates[i - 1])) {
                    run++;
                } else {
                    run = 1;
                }
            } else {
                run = 0;
            }
            if (run > longest) longest = run;
        }

        return {
            current,
            longest: Math.max(longest, current),
            lastActiveDate: (user.steps[today] || 0) > 0 ? today : prevDay(today),
        };
    }

    function nextDay(ds) {
        const d = new Date(ds + 'T12:00:00');
        d.setDate(d.getDate() + 1);
        return dateStr(d);
    }

    // ── Badge checking ─────────────────────────────────────────────
    function buildContext(tracker) {
        const user = tracker.currentUser;
        const today = tracker.getToday();
        return {
            todaySteps: (user.steps && user.steps[today]) || 0,
            weekSteps: getWeekSteps(user),
            rank: getUserRank(tracker),
        };
    }

    function checkAndAwardBadges(tracker) {
        const user = tracker.currentUser;
        if (!user) return [];

        if (!user.badges) user.badges = [];
        const ctx = buildContext(tracker);
        const newBadges = [];

        for (const badge of BADGES) {
            const alreadyEarned = user.badges.some(b => b.id === badge.id);
            if (alreadyEarned) continue;
            try {
                if (badge.check(user, ctx)) {
                    const earned = {
                        id: badge.id,
                        name: badge.name,
                        emoji: badge.emoji,
                        earnedDate: tracker.getToday(),
                    };
                    user.badges.push(earned);
                    newBadges.push({ ...earned, description: badge.description });
                }
            } catch (_) { /* skip */ }
        }

        if (newBadges.length) {
            tracker.saveData();
        }
        return newBadges;
    }

    // ── Notification queue ─────────────────────────────────────────
    let notifyQueue = [];
    let notifying = false;

    function queueBadgeNotification(badge) {
        notifyQueue.push(badge);
        if (!notifying) processNotifyQueue();
    }

    function processNotifyQueue() {
        if (!notifyQueue.length) { notifying = false; return; }
        notifying = true;
        const badge = notifyQueue.shift();
        showBadgeNotification(badge, () => {
            setTimeout(processNotifyQueue, 300);
        });
    }

    function showBadgeNotification(badge, onDone) {
        // Overlay
        const overlay = document.createElement('div');
        overlay.className = 'badge-notification-overlay';
        document.body.appendChild(overlay);

        // Notification card
        const card = document.createElement('div');
        card.className = 'badge-notification';
        card.innerHTML = `
            <div class="badge-notification-emoji">${badge.emoji}</div>
            <div class="badge-notification-title">Badge Unlocked!</div>
            <div class="badge-notification-name">${badge.name}</div>
            <div class="badge-notification-desc">${badge.description || ''}</div>
        `;
        document.body.appendChild(card);

        // Trigger animation
        requestAnimationFrame(() => {
            overlay.classList.add('show');
            card.classList.add('show');
        });

        // Also fire the app's toast
        if (window.stepTracker) {
            window.stepTracker.showMessage(`${badge.emoji} Badge Unlocked: ${badge.name}!`, 'success');
        }

        // Auto-dismiss after 2.5s or on click
        const dismiss = () => {
            overlay.classList.remove('show');
            card.classList.remove('show');
            setTimeout(() => {
                overlay.remove();
                card.remove();
                if (onDone) onDone();
            }, 400);
        };

        overlay.addEventListener('click', dismiss, { once: true });
        card.addEventListener('click', dismiss, { once: true });
        setTimeout(dismiss, 2500);
    }

    // ── UI: Dashboard Streak Widget ────────────────────────────────
    function renderStreakWidget(tracker) {
        const user = tracker.currentUser;
        if (!user) return;

        const today = tracker.getToday();
        const streak = user.streak || { current: 0, longest: 0 };
        const todaySteps = (user.steps && user.steps[today]) || 0;
        const goalMet = todaySteps >= user.dailyGoal;
        const hour = new Date().getHours();
        const atRisk = !goalMet && streak.current > 0 && hour >= 18;

        // Find or create container
        let widget = document.getElementById('gamification-streak-widget');
        const progressCard = document.querySelector('#dashboardTab .progress-card');
        if (!progressCard) return;

        if (!widget) {
            widget = document.createElement('div');
            widget.id = 'gamification-streak-widget';
            widget.className = 'streak-widget';
            progressCard.parentNode.insertBefore(widget, progressCard.nextSibling);
        }

        const fireSize = streak.current > 0 ? 'streak-fire' : '';
        const fireEmoji = streak.current > 0 ? '🔥' : '❄️';

        widget.innerHTML = `
            <div class="streak-widget-header">
                <h3>🔥 Streak</h3>
            </div>
            <div class="streak-main">
                <div class="${fireSize}">${fireEmoji}</div>
                <div class="streak-info">
                    <div class="streak-count">${streak.current}<span>day${streak.current !== 1 ? 's' : ''}</span></div>
                    <div class="streak-label">${streak.current > 0 ? 'Current streak' : 'No active streak'}</div>
                </div>
            </div>
            <div class="streak-stats">
                <div class="streak-stat">
                    <div class="streak-stat-value">${streak.longest || 0}</div>
                    <div class="streak-stat-label">Longest</div>
                </div>
                <div class="streak-stat">
                    <div class="streak-stat-value">${tracker.formatNumber(todaySteps)}</div>
                    <div class="streak-stat-label">Today</div>
                </div>
                <div class="streak-stat">
                    <div class="streak-stat-value">${goalMet ? '✅' : `${Math.min(100, Math.round((todaySteps / user.dailyGoal) * 100))}%`}</div>
                    <div class="streak-stat-label">Goal</div>
                </div>
            </div>
            ${atRisk ? `
            <div class="streak-warning">
                <span class="streak-warning-icon">⚠️</span>
                <span>Your streak is at risk! Add ${tracker.formatNumber(user.dailyGoal - todaySteps)} more steps to keep it alive.</span>
            </div>` : ''}
        `;
    }

    // ── UI: Badge Gallery (Profile) ────────────────────────────────
    function renderBadgeGallery(tracker) {
        const user = tracker.currentUser;
        if (!user) return;

        const profileCard = document.querySelector('#profileTab .profile-card');
        if (!profileCard) return;

        if (!user.badges) user.badges = [];
        const earnedIds = new Set(user.badges.map(b => b.id));

        let gallery = document.getElementById('gamification-badge-gallery');
        if (!gallery) {
            gallery = document.createElement('div');
            gallery.id = 'gamification-badge-gallery';
            gallery.className = 'badge-gallery';
            // Insert after profile-stats
            const profileStats = profileCard.querySelector('.profile-stats');
            if (profileStats) {
                profileStats.parentNode.insertBefore(gallery, profileStats.nextSibling);
            } else {
                profileCard.appendChild(gallery);
            }
        }

        // Badge cards
        const badgeCards = BADGES.map(badge => {
            const earned = user.badges.find(b => b.id === badge.id);
            if (earned) {
                return `<div class="badge-card earned" title="${badge.description}">
                    <div class="badge-emoji">${badge.emoji}</div>
                    <div class="badge-name">${badge.name}</div>
                    <div class="badge-date">${formatShortDate(earned.earnedDate)}</div>
                </div>`;
            }
            return `<div class="badge-card locked" title="${badge.description}">
                <div class="badge-emoji">${badge.emoji}</div>
                <div class="badge-name">${badge.name}</div>
                <div class="badge-locked-label">🔒 Locked</div>
            </div>`;
        }).join('');

        // Progress bars for unearned progress-trackable badges
        const progressBars = PROGRESS_BADGES
            .filter(pb => !earnedIds.has(pb.id))
            .slice(0, 4) // Show max 4
            .map(pb => {
                const badge = BADGES.find(b => b.id === pb.id);
                if (!badge) return '';
                let current = 0;
                if (pb.field === 'totalSteps') {
                    current = user.totalSteps || 0;
                } else if (pb.field === 'streak') {
                    current = (user.streak && user.streak.current) || 0;
                }
                const pct = Math.min(100, Math.round((current / pb.target) * 100));
                const fmtCurrent = pb.field === 'totalSteps' ? tracker.formatNumber(current) : current;
                const fmtTarget = pb.field === 'totalSteps' ? tracker.formatNumber(pb.target) : pb.target;
                return `<div class="badge-progress-item">
                    <div class="badge-progress-header">
                        <div class="badge-progress-label"><span class="emoji">${badge.emoji}</span> ${badge.name}</div>
                        <div class="badge-progress-pct">${fmtCurrent} / ${fmtTarget}</div>
                    </div>
                    <div class="badge-progress-bar">
                        <div class="badge-progress-fill" style="width:${pct}%"></div>
                    </div>
                </div>`;
            }).join('');

        gallery.innerHTML = `
            <div class="badge-gallery-header">
                <h3>🏅 Achievements</h3>
                <span class="badge-earned-count">${user.badges.length} / ${BADGES.length}</span>
            </div>
            <div class="badge-grid">${badgeCards}</div>
            ${progressBars ? `<div class="badge-progress-section"><h4>Progress</h4>${progressBars}</div>` : ''}
        `;
    }

    // ── Core: Update streaks for a user ────────────────────────────
    function updateUserStreak(tracker) {
        const user = tracker.currentUser;
        if (!user) return;
        const today = tracker.getToday();
        user.streak = calculateStreak(user, today);
        tracker.saveData();
    }

    // ── Monkey-patching ────────────────────────────────────────────
    function patchStepTracker(tracker) {
        if (tracker._gamificationPatched) return;
        tracker._gamificationPatched = true;

        // Patch addSteps
        const origAddSteps = tracker.addSteps.bind(tracker);
        tracker.addSteps = async function () {
            await origAddSteps();
            // After steps added, recalculate streak and check badges
            if (tracker.currentUser) {
                updateUserStreak(tracker);
                const newBadges = checkAndAwardBadges(tracker);
                newBadges.forEach(b => queueBadgeNotification(b));
                renderStreakWidget(tracker);
            }
        };

        // Patch updateDashboard
        const origUpdateDashboard = tracker.updateDashboard.bind(tracker);
        tracker.updateDashboard = function () {
            origUpdateDashboard();
            if (tracker.currentUser) {
                renderStreakWidget(tracker);
            }
        };

        // Patch updateProfile
        const origUpdateProfile = tracker.updateProfile.bind(tracker);
        tracker.updateProfile = function () {
            origUpdateProfile();
            if (tracker.currentUser) {
                renderBadgeGallery(tracker);
            }
        };
    }

    // ── Initialization ─────────────────────────────────────────────
    function init() {
        const tracker = window.stepTracker;
        if (!tracker) return false;

        patchStepTracker(tracker);

        // Initialize streak + badges for current user if already set
        if (tracker.currentUser) {
            if (!tracker.currentUser.badges) tracker.currentUser.badges = [];
            updateUserStreak(tracker);
            checkAndAwardBadges(tracker);
            renderStreakWidget(tracker);
            renderBadgeGallery(tracker);
        }

        // Inject CSS if not already loaded
        if (!document.querySelector('link[href="gamification.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'gamification.css';
            document.head.appendChild(link);
        }

        console.log('[Gamification] Module initialized ✅');
        return true;
    }

    // Try immediately, otherwise wait for DOM + a tick for stepTracker
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // stepTracker is created on DOMContentLoaded too, so allow a tick
            setTimeout(() => { if (!init()) setTimeout(init, 500); }, 0);
        });
    } else {
        if (!init()) setTimeout(init, 500);
    }
})();
