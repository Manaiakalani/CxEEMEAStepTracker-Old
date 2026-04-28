/**
 * data-viz.js — Standalone data-visualization enhancements
 * for the CxE EMEA Step Tracker.
 *
 * Features:
 *   1. SVG trend line on the weekly chart
 *   2. Rank-movement arrows on the leaderboard
 *   3. GitHub-style step heatmap calendar on the profile tab
 *   4. Pace indicator on the dashboard
 *
 * Self-initialises by waiting for window.stepTracker, then
 * monkey-patches updateWeeklyChart, updateLeaderboard,
 * updateDashboard, and updateProfile.
 *
 * No existing files are modified.
 */
(function () {
    'use strict';

    /* ====================================================
       CSS injection — load data-viz.css alongside this file
       ==================================================== */
    function injectCSS() {
        if (document.getElementById('dv-styles')) return;
        const link = document.createElement('link');
        link.id = 'dv-styles';
        link.rel = 'stylesheet';
        // Resolve relative to this script's location
        const scripts = document.querySelectorAll('script[src*="data-viz"]');
        const base = scripts.length
            ? scripts[0].src.replace(/[^/]*$/, '')
            : '';
        link.href = base + 'data-viz.css';
        document.head.appendChild(link);
    }

    /* ====================================================
       Utility helpers
       ==================================================== */
    function formatDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function fmtNum(n) {
        if (window.stepTracker && window.stepTracker.formatNumber) {
            return window.stepTracker.formatNumber(n);
        }
        return Number(n).toLocaleString();
    }

    /* ====================================================
       1. TREND LINE on Weekly Chart
       ==================================================== */
    function renderTrendLine() {
        const chart = document.getElementById('weeklyChart');
        if (!chart) return;

        // Remove any previous trend SVG
        const old = chart.querySelector('.dv-trend-svg');
        if (old) old.remove();

        const bars = chart.querySelectorAll('.day-bar');
        if (bars.length < 2) return;

        // Wait a tick so bar heights are painted
        requestAnimationFrame(() => {
            const chartRect = chart.getBoundingClientRect();
            const svgNS = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(svgNS, 'svg');
            svg.classList.add('dv-trend-svg');
            svg.setAttribute('viewBox', `0 0 ${chartRect.width} ${chartRect.height}`);
            svg.setAttribute('preserveAspectRatio', 'none');

            // Collect data-point positions (top-centre of each bar)
            const points = [];
            bars.forEach(bar => {
                const barRect = bar.getBoundingClientRect();
                const x = barRect.left - chartRect.left + barRect.width / 2;
                const y = barRect.top - chartRect.top;
                points.push({ x, y });
            });

            // Build smooth cubic bezier path
            const pathD = smoothPath(points);

            const path = document.createElementNS(svgNS, 'path');
            path.classList.add('dv-trend-line');
            path.setAttribute('d', pathD);
            svg.appendChild(path);

            // Dots at each data point
            points.forEach((p, i) => {
                const circle = document.createElementNS(svgNS, 'circle');
                circle.classList.add('dv-trend-dot');
                circle.setAttribute('cx', p.x);
                circle.setAttribute('cy', p.y);
                circle.setAttribute('r', 3.5);
                // Staggered fade-in
                circle.classList.add('dv-animate');
                circle.style.animationDelay = `${0.6 + i * 0.08}s`;
                svg.appendChild(circle);
            });

            chart.appendChild(svg);

            // Animate stroke-dasharray after layout
            requestAnimationFrame(() => {
                const len = path.getTotalLength();
                path.style.strokeDasharray = len;
                path.style.strokeDashoffset = len;
                path.style.setProperty('--dv-line-len', len);
                path.classList.add('dv-animate');
            });
        });
    }

    /** Build a smooth cubic-bezier SVG path through points */
    function smoothPath(pts) {
        if (pts.length < 2) return '';
        if (pts.length === 2) {
            return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;
        }

        let d = `M ${pts[0].x},${pts[0].y}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[Math.max(i - 1, 0)];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = pts[Math.min(i + 2, pts.length - 1)];

            const tension = 0.3;
            const cp1x = p1.x + (p2.x - p0.x) * tension;
            const cp1y = p1.y + (p2.y - p0.y) * tension;
            const cp2x = p2.x - (p3.x - p1.x) * tension;
            const cp2y = p2.y - (p3.y - p1.y) * tension;

            d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
        }
        return d;
    }

    /* ====================================================
       2. RANK MOVEMENT ARROWS on Leaderboard
       ==================================================== */
    const PREV_RANKS_KEY = 'stepTrackerPrevRanks';

    function loadPrevRanks() {
        try {
            return JSON.parse(localStorage.getItem(PREV_RANKS_KEY)) || {};
        } catch { return {}; }
    }

    function savePrevRanks(ranks) {
        localStorage.setItem(PREV_RANKS_KEY, JSON.stringify(ranks));
    }

    function renderRankArrows() {
        const list = document.getElementById('leaderboardList');
        if (!list) return;

        const items = list.querySelectorAll('.leaderboard-item');
        if (!items.length) return;

        const prevRanks = loadPrevRanks();
        const newRanks = {};

        items.forEach((item, idx) => {
            const rank = idx + 1;
            // Extract user name to use as key
            const nameEl = item.querySelector('.leaderboard-name');
            if (!nameEl) return;
            // Get text content without badge emojis
            const name = nameEl.textContent.replace(/⭐/g, '').trim();
            newRanks[name] = rank;

            // Remove any existing arrow
            const existing = item.querySelector('.dv-rank-movement');
            if (existing) existing.remove();

            // Build arrow span
            const span = document.createElement('span');
            span.classList.add('dv-rank-movement');

            if (prevRanks[name] !== undefined) {
                const diff = prevRanks[name] - rank; // positive = improved
                if (diff > 0) {
                    span.classList.add('dv-up');
                    span.textContent = `↑${diff}`;
                } else if (diff < 0) {
                    span.classList.add('dv-down');
                    span.textContent = `↓${Math.abs(diff)}`;
                } else {
                    span.classList.add('dv-same');
                    span.textContent = '—';
                }
            } else {
                span.classList.add('dv-same');
                span.textContent = '—';
            }

            // Append after the rank badge
            const rankEl = item.querySelector('.leaderboard-rank');
            if (rankEl) {
                rankEl.appendChild(span);
            }
        });

        savePrevRanks(newRanks);
    }

    /* ====================================================
       3. STEP HEATMAP CALENDAR on Profile Tab
       ==================================================== */
    function renderHeatmap() {
        const st = window.stepTracker;
        if (!st || !st.currentUser) return;

        const profileTab = document.getElementById('profileTab');
        if (!profileTab) return;

        // Remove existing heatmap
        const existing = profileTab.querySelector('.dv-heatmap-container');
        if (existing) existing.remove();

        // Remove any lingering tooltip
        const oldTip = document.querySelector('.dv-heatmap-tooltip');
        if (oldTip) oldTip.remove();

        const user = st.currentUser;
        const goal = user.dailyGoal || 8000;
        const steps = user.steps || {};

        // Build 12 weeks (84 days) of data ending today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const totalDays = 84;

        // Start date = today - 83 days
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - (totalDays - 1));

        // Align to start of that week (Sunday)
        const startDow = startDate.getDay();
        const alignedStart = new Date(startDate);
        alignedStart.setDate(alignedStart.getDate() - startDow);

        // Build cells grouped by week-column
        const weeks = [];
        let current = new Date(alignedStart);
        while (current <= today) {
            const week = [];
            for (let d = 0; d < 7; d++) {
                const dateStr = current.toISOString().split('T')[0];
                const isInRange = current >= startDate && current <= today;
                const daySteps = isInRange ? (steps[dateStr] || 0) : -1;
                week.push({ date: dateStr, steps: daySteps, inRange: isInRange });
                current.setDate(current.getDate() + 1);
            }
            weeks.push(week);
        }

        // Container
        const container = document.createElement('div');
        container.className = 'dv-heatmap-container';

        // Title
        const title = document.createElement('div');
        title.className = 'dv-heatmap-title';
        title.innerHTML = '<i class="fas fa-fire"></i> Step Activity';
        container.appendChild(title);

        // Scrollable area
        const scroll = document.createElement('div');
        scroll.className = 'dv-heatmap-scroll';

        const wrapper = document.createElement('div');
        wrapper.className = 'dv-heatmap-wrapper';

        // Day-of-week labels (column on the left)
        const labels = document.createElement('div');
        labels.className = 'dv-heatmap-labels';
        const dayLabels = ['', 'M', '', 'W', '', 'F', ''];
        dayLabels.forEach(l => {
            const lbl = document.createElement('div');
            lbl.className = 'dv-heatmap-label';
            lbl.textContent = l;
            labels.appendChild(lbl);
        });
        wrapper.appendChild(labels);

        // Grid
        const grid = document.createElement('div');
        grid.className = 'dv-heatmap-grid';

        // Month labels row (placed above grid via absolute positioning)
        const monthRow = document.createElement('div');
        monthRow.className = 'dv-heatmap-months';
        monthRow.style.position = 'absolute';
        monthRow.style.top = '0';
        monthRow.style.left = '0';
        monthRow.style.display = 'flex';

        const cellSize = 14;
        const cellGap = 3;

        // Track months for labels
        let lastMonth = -1;

        weeks.forEach((week, wi) => {
            const col = document.createElement('div');
            col.className = 'dv-heatmap-col';

            // Month label above column if first day of week starts a new month
            const firstDateInWeek = new Date(week[0].date + 'T00:00:00');
            const mon = firstDateInWeek.getMonth();
            if (mon !== lastMonth && week[0].inRange) {
                lastMonth = mon;
                const mLabel = document.createElement('span');
                mLabel.className = 'dv-heatmap-month';
                mLabel.textContent = firstDateInWeek.toLocaleDateString('en-US', { month: 'short' });
                mLabel.style.position = 'absolute';
                mLabel.style.left = `${wi * (cellSize + cellGap)}px`;
                monthRow.appendChild(mLabel);
            }

            week.forEach(day => {
                const cell = document.createElement('div');
                cell.className = 'dv-heatmap-cell';

                if (!day.inRange) {
                    cell.style.visibility = 'hidden';
                } else {
                    const cls = heatClass(day.steps, goal);
                    cell.classList.add(cls);
                    cell.dataset.date = day.date;
                    cell.dataset.steps = day.steps;
                }

                col.appendChild(cell);
            });

            grid.appendChild(col);
        });

        grid.style.paddingTop = '18px';
        grid.appendChild(monthRow);
        wrapper.appendChild(grid);
        scroll.appendChild(wrapper);
        container.appendChild(scroll);

        // Legend
        const legend = document.createElement('div');
        legend.className = 'dv-heatmap-legend';
        legend.innerHTML = 'Less ';
        ['dv-heat-0', 'dv-heat-1', 'dv-heat-2', 'dv-heat-3', 'dv-heat-4'].forEach(cls => {
            const box = document.createElement('span');
            box.className = `dv-heatmap-legend-cell ${cls}`;
            legend.appendChild(box);
        });
        const moreText = document.createTextNode(' More');
        legend.appendChild(moreText);
        container.appendChild(legend);

        // Insert after profile-card
        const profileCard = profileTab.querySelector('.profile-card');
        if (profileCard) {
            profileCard.after(container);
        } else {
            profileTab.appendChild(container);
        }

        // Tooltip
        setupHeatmapTooltip(container);
    }

    function heatClass(stepsVal, goal) {
        if (stepsVal <= 0) return 'dv-heat-0';
        const pct = stepsVal / goal;
        if (pct < 0.50) return 'dv-heat-1';
        if (pct < 1.00) return 'dv-heat-2';
        if (pct < 1.50) return 'dv-heat-3';
        // 150%+ goal
        return 'dv-heat-gold';
    }

    function setupHeatmapTooltip(container) {
        let tip = document.querySelector('.dv-heatmap-tooltip');
        if (!tip) {
            tip = document.createElement('div');
            tip.className = 'dv-heatmap-tooltip';
            document.body.appendChild(tip);
        }

        container.addEventListener('mouseover', (e) => {
            const cell = e.target.closest('.dv-heatmap-cell');
            if (!cell || !cell.dataset.date) return;
            const dateStr = formatDate(cell.dataset.date);
            const s = Number(cell.dataset.steps) || 0;
            tip.innerHTML = `<strong>${dateStr}</strong><br>${fmtNum(s)} steps`;
            tip.classList.add('dv-visible');
        });

        container.addEventListener('mousemove', (e) => {
            if (tip.classList.contains('dv-visible')) {
                tip.style.left = `${e.clientX + 10}px`;
                tip.style.top = `${e.clientY - 36}px`;
            }
        });

        container.addEventListener('mouseout', (e) => {
            const cell = e.target.closest('.dv-heatmap-cell');
            if (cell) {
                tip.classList.remove('dv-visible');
            }
        });
    }

    /* ====================================================
       4. PACE INDICATOR on Dashboard
       ==================================================== */
    function renderPaceIndicator() {
        const st = window.stepTracker;
        if (!st || !st.currentUser) return;

        const progressContainer = document.querySelector('.progress-circle-container');
        if (!progressContainer) return;

        // Place after progress-details (or after progress-circle-container)
        const progressCard = progressContainer.closest('.progress-card');
        if (!progressCard) return;

        // Remove existing
        const existing = progressCard.querySelector('.dv-pace-indicator');
        if (existing) existing.remove();

        const user = st.currentUser;
        const todayStr = st.getToday();
        const todaySteps = user.steps[todayStr] || 0;
        const goal = user.dailyGoal || 8000;

        // Calculate expected steps based on time of day
        const now = new Date();
        const hours = now.getHours() + now.getMinutes() / 60;
        // Waking hours: 6am–10pm (16 hours)
        const wakingStart = 6;
        const wakingEnd = 22;
        const wakingHours = wakingEnd - wakingStart;

        let elapsedWaking = Math.max(0, Math.min(hours - wakingStart, wakingHours));
        const expectedSteps = Math.round((elapsedWaking / wakingHours) * goal);

        // Determine pace status
        let status, label, emoji, cssClass;
        if (expectedSteps <= 0) {
            // Before waking hours
            status = 'on-pace';
            label = 'Rest time';
            emoji = '🌙';
            cssClass = 'dv-on-pace';
        } else {
            const ratio = todaySteps / expectedSteps;
            if (ratio >= 1) {
                status = 'ahead';
                label = 'Ahead of pace';
                emoji = '⚡';
                cssClass = 'dv-ahead';
            } else if (ratio >= 0.8) {
                status = 'on-pace';
                label = 'On pace';
                emoji = '👍';
                cssClass = 'dv-on-pace';
            } else {
                status = 'behind';
                label = 'Behind pace';
                emoji = '📈';
                cssClass = 'dv-behind';
            }
        }

        // Build DOM
        const indicator = document.createElement('div');
        indicator.className = 'dv-pace-indicator';

        const paceStatus = document.createElement('div');
        paceStatus.className = 'dv-pace-status';

        const paceLabel = document.createElement('span');
        paceLabel.className = `dv-pace-label ${cssClass}`;
        paceLabel.textContent = `${label} ${emoji}`;

        const paceDetail = document.createElement('span');
        paceDetail.className = 'dv-pace-detail';
        paceDetail.textContent = `${fmtNum(todaySteps)} / ${fmtNum(expectedSteps)} expected`;

        paceStatus.appendChild(paceLabel);
        paceStatus.appendChild(paceDetail);
        indicator.appendChild(paceStatus);

        // Progress bar
        const track = document.createElement('div');
        track.className = 'dv-pace-bar-track';

        const fill = document.createElement('div');
        fill.className = `dv-pace-bar-fill ${cssClass}`;
        const pct = expectedSteps > 0 ? Math.min(100, (todaySteps / expectedSteps) * 100) : 100;
        // Animate via transition (set 0 first, then actual)
        fill.style.width = '0%';
        track.appendChild(fill);

        // Expected pace marker
        if (expectedSteps > 0 && goal > 0) {
            const marker = document.createElement('div');
            marker.className = 'dv-pace-bar-marker';
            const markerPct = Math.min(100, (expectedSteps / goal) * 100);
            marker.style.left = `${markerPct}%`;
            marker.title = 'Expected pace';
            track.appendChild(marker);
        }

        indicator.appendChild(track);

        // Insert after progress-details
        const progressDetails = progressCard.querySelector('.progress-details');
        if (progressDetails) {
            progressDetails.after(indicator);
        } else {
            progressCard.appendChild(indicator);
        }

        // Trigger animated fill
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                fill.style.width = `${pct}%`;
            });
        });
    }

    /* ====================================================
       MONKEY-PATCHING — hook into StepTracker methods
       ==================================================== */
    function patchMethods(st) {
        // Patch updateWeeklyChart
        const origChart = st.updateWeeklyChart.bind(st);
        st.updateWeeklyChart = function () {
            origChart();
            renderTrendLine();
        };

        // Patch updateLeaderboard
        const origLB = st.updateLeaderboard.bind(st);
        st.updateLeaderboard = function () {
            origLB();
            renderRankArrows();
        };

        // Patch updateDashboard
        const origDash = st.updateDashboard.bind(st);
        st.updateDashboard = function () {
            origDash();
            renderPaceIndicator();
        };

        // Patch updateProfile
        const origProfile = st.updateProfile.bind(st);
        st.updateProfile = function () {
            origProfile();
            renderHeatmap();
        };
    }

    /* ====================================================
       INIT — wait for window.stepTracker, then patch
       ==================================================== */
    function init() {
        injectCSS();

        if (window.stepTracker) {
            patchMethods(window.stepTracker);
            // Render immediately if app already rendered
            renderTrendLine();
            renderRankArrows();
            renderPaceIndicator();
            renderHeatmap();
            return;
        }

        // Poll for stepTracker (created on DOMContentLoaded)
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            if (window.stepTracker) {
                clearInterval(interval);
                patchMethods(window.stepTracker);
                renderTrendLine();
                renderRankArrows();
                renderPaceIndicator();
                renderHeatmap();
            } else if (attempts > 100) {
                clearInterval(interval);
                console.warn('[data-viz] window.stepTracker not found after 10 s');
            }
        }, 100);
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
