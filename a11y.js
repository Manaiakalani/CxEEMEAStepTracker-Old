/* ==========================================================================
   Accessibility Enhancements for CxE EMEA Step Tracker
   Standalone script — do not modify existing script.js or index.html.
   Self-initializes on DOMContentLoaded via window.stepTracker.
   ========================================================================== */

(function () {
    'use strict';

    const DAY_FULL_NAMES = {
        Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday',
        Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday'
    };

    const TAB_ORDER = ['dashboard', 'leaderboard', 'teams', 'profile'];

    // -----------------------------------------------------------------------
    // 1. Skip-to-content link
    // -----------------------------------------------------------------------
    function injectSkipLink() {
        const link = document.createElement('a');
        link.className = 'a11y-skip-link';
        link.href = '#main-content';
        link.textContent = 'Skip to main content';
        document.body.insertBefore(link, document.body.firstChild);

        // Ensure main element has the target id
        const main = document.querySelector('main') || document.querySelector('.app-container');
        if (main && !main.id) {
            main.id = 'main-content';
        }

        link.addEventListener('click', function (e) {
            e.preventDefault();
            const activePanel = document.querySelector('.tab-content[style*="display: flex"], .tab-content:not([style*="display: none"])');
            if (activePanel) {
                activePanel.setAttribute('tabindex', '-1');
                activePanel.focus({ preventScroll: false });
            } else if (main) {
                main.setAttribute('tabindex', '-1');
                main.focus({ preventScroll: false });
            }
        });
    }

    // -----------------------------------------------------------------------
    // 2. aria-live regions
    // -----------------------------------------------------------------------
    function setupLiveRegions() {
        const messageContainer = document.getElementById('messageContainer');
        if (messageContainer) {
            messageContainer.setAttribute('aria-live', 'polite');
            messageContainer.setAttribute('aria-atomic', 'false');
            messageContainer.setAttribute('role', 'log');
        }

        const liveNotifications = document.getElementById('liveNotifications');
        if (liveNotifications) {
            liveNotifications.setAttribute('aria-live', 'assertive');
            liveNotifications.setAttribute('aria-atomic', 'false');
            liveNotifications.setAttribute('role', 'alert');
        }

        // Step count displays get role="status"
        ['todaySteps', 'totalSteps'].forEach(function (id) {
            const el = document.getElementById(id);
            if (el) {
                el.setAttribute('role', 'status');
                el.setAttribute('aria-live', 'polite');
            }
        });
    }

    // Monkey-patch showMessage to add role="alert" on error messages
    function patchShowMessage() {
        const st = window.stepTracker;
        if (!st || typeof st.showMessage !== 'function') return;

        const original = st.showMessage.bind(st);
        st.showMessage = function (text, type) {
            original(text, type);
            if (type === 'error') {
                const container = document.getElementById('messageContainer');
                if (container) {
                    const last = container.lastElementChild;
                    if (last) {
                        last.setAttribute('role', 'alert');
                    }
                }
            }
        };
    }

    // -----------------------------------------------------------------------
    // 3. Chart accessibility
    // -----------------------------------------------------------------------
    function patchWeeklyChart() {
        const st = window.stepTracker;
        if (!st || typeof st.updateWeeklyChart !== 'function') return;

        const original = st.updateWeeklyChart.bind(st);
        st.updateWeeklyChart = function () {
            original();
            annotateWeeklyChart(st);
        };
    }

    function annotateWeeklyChart(st) {
        const chart = document.getElementById('weeklyChart');
        if (!chart || !st.currentUser) return;

        chart.setAttribute('role', 'img');

        // Build description from rendered bars
        const bars = chart.querySelectorAll('.day-bar');
        const parts = [];
        bars.forEach(function (bar) {
            const label = bar.querySelector('.day-label');
            const value = bar.querySelector('.day-value');
            if (label && value) {
                const fullName = DAY_FULL_NAMES[label.textContent] || label.textContent;
                parts.push(fullName + ' ' + value.textContent);
            }
        });

        const desc = 'Weekly steps: ' + (parts.length ? parts.join(', ') : 'no data');
        chart.setAttribute('aria-label', desc);

        // Remove old sr-only description if present, then add new one
        const existing = chart.querySelector('.sr-only');
        if (existing) existing.remove();

        const p = document.createElement('p');
        p.className = 'sr-only';
        p.textContent = desc;
        chart.appendChild(p);
    }

    function annotateProgressCircle() {
        const svg = document.querySelector('.progress-circle svg');
        if (!svg) return;

        svg.setAttribute('role', 'img');

        const stepsEl = document.getElementById('todaySteps');
        const pctEl = document.getElementById('progressPercentage');
        const goalEl = document.getElementById('dailyGoalDisplay');

        const steps = stepsEl ? stepsEl.textContent : '0';
        const pct = pctEl ? pctEl.textContent : '0%';
        const goal = goalEl ? goalEl.textContent : '8,000';

        svg.setAttribute('aria-label',
            'Daily progress: ' + steps + ' of ' + goal + ' steps (' + pct + ')');
    }

    function patchDashboard() {
        const st = window.stepTracker;
        if (!st || typeof st.updateDashboard !== 'function') return;

        const original = st.updateDashboard.bind(st);
        st.updateDashboard = function () {
            original();
            annotateProgressCircle();
        };
    }

    // -----------------------------------------------------------------------
    // 4. Keyboard navigation & ARIA roles for tabs
    // -----------------------------------------------------------------------
    function setupTabRoles() {
        const navButtons = document.querySelector('.nav-buttons');
        if (navButtons) {
            navButtons.setAttribute('role', 'tablist');
            navButtons.setAttribute('aria-label', 'Main navigation');
        }

        document.querySelectorAll('.nav-btn').forEach(function (btn) {
            const tab = btn.dataset.tab;
            btn.setAttribute('role', 'tab');
            btn.setAttribute('aria-controls', tab + 'Tab');
            const isActive = btn.classList.contains('active');
            btn.setAttribute('aria-selected', String(isActive));
            if (isActive) btn.setAttribute('aria-current', 'page');
        });

        TAB_ORDER.forEach(function (name) {
            const panel = document.getElementById(name + 'Tab');
            if (panel) {
                panel.setAttribute('role', 'tabpanel');
                panel.setAttribute('aria-labelledby', 'tab-' + name);
                // Assign id to matching button for labelledby
                const btn = document.querySelector('.nav-btn[data-tab="' + name + '"]');
                if (btn && !btn.id) btn.id = 'tab-' + name;
            }
        });
    }

    function patchSwitchTab() {
        const st = window.stepTracker;
        if (!st || typeof st.switchTab !== 'function') return;

        const original = st.switchTab.bind(st);
        st.switchTab = function (tabName) {
            original(tabName);
            document.querySelectorAll('.nav-btn').forEach(function (btn) {
                const isActive = btn.dataset.tab === tabName;
                btn.setAttribute('aria-selected', String(isActive));
                if (isActive) {
                    btn.setAttribute('aria-current', 'page');
                } else {
                    btn.removeAttribute('aria-current');
                }
            });
        };
    }

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function (e) {
            // Alt+1–4 for tab switching
            if (e.altKey && !e.ctrlKey && !e.metaKey) {
                const idx = parseInt(e.key, 10) - 1;
                if (idx >= 0 && idx < TAB_ORDER.length && window.stepTracker) {
                    e.preventDefault();
                    window.stepTracker.switchTab(TAB_ORDER[idx]);
                }
            }

            // Escape to close modals and shortcuts panel
            if (e.key === 'Escape') {
                const shortcutsPanel = document.querySelector('.a11y-shortcuts-panel.open');
                if (shortcutsPanel) {
                    shortcutsPanel.classList.remove('open');
                }
            }
        });
    }

    // -----------------------------------------------------------------------
    // 5. Semantic improvements
    // -----------------------------------------------------------------------
    function semanticImprovements() {
        // hamburger aria-expanded (already present in HTML but ensure consistency)
        const hamburger = document.getElementById('hamburgerMenu');
        if (hamburger) {
            if (!hamburger.getAttribute('aria-label')) {
                hamburger.setAttribute('aria-label', 'Open menu');
            }
        }

        // icon-only button labels
        const iconButtons = {
            closeFlyout: 'Close menu',
            refreshActivity: 'Refresh recent activity',
            refreshLeaderboard: 'Refresh leaderboard data',
            closeFAQ: 'Close FAQ modal',
            closeAddPreviousDay: 'Close add previous day modal'
        };
        Object.keys(iconButtons).forEach(function (id) {
            const btn = document.getElementById(id);
            if (btn && !btn.getAttribute('aria-label')) {
                btn.setAttribute('aria-label', iconButtons[id]);
            }
        });

        // Form input labels — stepsInput has no <label>
        const stepsInput = document.getElementById('stepsInput');
        if (stepsInput && !document.querySelector('label[for="stepsInput"]')) {
            stepsInput.setAttribute('aria-label', 'Enter steps to add');
        }

        // existingUserSelect has no <label>
        const existingUserSelect = document.getElementById('existingUserSelect');
        if (existingUserSelect && !document.querySelector('label[for="existingUserSelect"]')) {
            existingUserSelect.setAttribute('aria-label', 'Select your name');
        }

        // FAQ modal semantics
        const faqModal = document.getElementById('faqModal');
        if (faqModal) {
            faqModal.setAttribute('role', 'dialog');
            faqModal.setAttribute('aria-modal', 'true');
            faqModal.setAttribute('aria-label', 'FAQ and Information');
        }

        // Add Previous Day modal semantics
        const addPrevModal = document.getElementById('addPreviousDayModal');
        if (addPrevModal) {
            addPrevModal.setAttribute('role', 'dialog');
            addPrevModal.setAttribute('aria-modal', 'true');
            addPrevModal.setAttribute('aria-label', 'Add steps for a previous day');
        }
    }

    // Patch hamburger toggle to sync aria-expanded
    function patchHamburger() {
        const st = window.stepTracker;
        if (!st) return;

        if (typeof st.toggleHamburgerMenu === 'function') {
            const origToggle = st.toggleHamburgerMenu.bind(st);
            st.toggleHamburgerMenu = function () {
                origToggle();
                syncHamburgerAria();
            };
        }

        if (typeof st.closeHamburgerMenu === 'function') {
            const origClose = st.closeHamburgerMenu.bind(st);
            st.closeHamburgerMenu = function () {
                origClose();
                syncHamburgerAria();
            };
        }
    }

    function syncHamburgerAria() {
        const hamburger = document.getElementById('hamburgerMenu');
        const flyout = document.getElementById('hamburgerFlyout');
        if (hamburger && flyout) {
            const isOpen = flyout.classList.contains('open');
            hamburger.setAttribute('aria-expanded', String(isOpen));
        }
    }

    // -----------------------------------------------------------------------
    // 6. Reduced motion support
    // -----------------------------------------------------------------------
    function setupReducedMotion() {
        // Check system preference
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        let systemPrefersReduced = mq.matches;
        let userToggled = false;

        // Inject toggle button into header
        const headerStats = document.querySelector('.header-stats');
        if (!headerStats) return;

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'a11y-motion-toggle';
        toggleBtn.setAttribute('aria-pressed', String(systemPrefersReduced));
        toggleBtn.setAttribute('aria-label', 'Reduce motion');
        toggleBtn.setAttribute('title', 'Toggle reduced motion');
        toggleBtn.innerHTML = '<i class="fas fa-eye"></i><span>Motion</span>';

        // Insert before hamburger menu
        const hamburger = document.getElementById('hamburgerMenu');
        if (hamburger) {
            headerStats.insertBefore(toggleBtn, hamburger);
        } else {
            headerStats.appendChild(toggleBtn);
        }

        function applyReducedMotion(reduce) {
            if (reduce) {
                document.documentElement.classList.add('a11y-reduce-motion');
                toggleBtn.setAttribute('aria-pressed', 'true');
                toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i><span>Motion</span>';
            } else {
                document.documentElement.classList.remove('a11y-reduce-motion');
                toggleBtn.setAttribute('aria-pressed', 'false');
                toggleBtn.innerHTML = '<i class="fas fa-eye"></i><span>Motion</span>';
            }
        }

        // Apply system preference initially
        if (systemPrefersReduced) applyReducedMotion(true);

        toggleBtn.addEventListener('click', function () {
            userToggled = !userToggled;
            const shouldReduce = userToggled ? !systemPrefersReduced : systemPrefersReduced;
            applyReducedMotion(shouldReduce);
        });

        // Listen for system preference changes
        mq.addEventListener('change', function (e) {
            systemPrefersReduced = e.matches;
            if (!userToggled) applyReducedMotion(systemPrefersReduced);
        });
    }

    // -----------------------------------------------------------------------
    // 7. Keyboard shortcuts info panel
    // -----------------------------------------------------------------------
    function injectShortcutsPanel() {
        const wrapper = document.createElement('div');
        wrapper.className = 'a11y-shortcuts-info';
        wrapper.innerHTML =
            '<button class="a11y-shortcuts-btn" aria-label="Keyboard shortcuts" aria-expanded="false" title="Keyboard shortcuts">' +
                '<i class="fas fa-keyboard"></i>' +
            '</button>' +
            '<div class="a11y-shortcuts-panel" role="tooltip">' +
                '<h4>Keyboard Shortcuts</h4>' +
                '<dl>' +
                    '<dt><kbd>Alt</kbd>+<kbd>1</kbd></dt><dd>Dashboard</dd>' +
                    '<dt><kbd>Alt</kbd>+<kbd>2</kbd></dt><dd>Leaderboard</dd>' +
                    '<dt><kbd>Alt</kbd>+<kbd>3</kbd></dt><dd>Teams</dd>' +
                    '<dt><kbd>Alt</kbd>+<kbd>4</kbd></dt><dd>Profile</dd>' +
                    '<dt><kbd>Esc</kbd></dt><dd>Close modals</dd>' +
                '</dl>' +
            '</div>';

        document.body.appendChild(wrapper);

        const btn = wrapper.querySelector('.a11y-shortcuts-btn');
        const panel = wrapper.querySelector('.a11y-shortcuts-panel');

        btn.addEventListener('click', function () {
            const open = panel.classList.toggle('open');
            btn.setAttribute('aria-expanded', String(open));
        });

        // Close on outside click
        document.addEventListener('click', function (e) {
            if (!wrapper.contains(e.target) && panel.classList.contains('open')) {
                panel.classList.remove('open');
                btn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // -----------------------------------------------------------------------
    // 8. MutationObserver for dynamic content
    // -----------------------------------------------------------------------
    function setupObserver() {
        // Watch messageContainer for new error messages needing role="alert"
        const messageContainer = document.getElementById('messageContainer');
        if (messageContainer) {
            new MutationObserver(function (mutations) {
                mutations.forEach(function (m) {
                    m.addedNodes.forEach(function (node) {
                        if (node.nodeType === 1 && node.classList.contains('error')) {
                            node.setAttribute('role', 'alert');
                        }
                    });
                });
            }).observe(messageContainer, { childList: true });
        }

        // Watch for weekly chart updates (in case called outside our patch)
        const weeklyChart = document.getElementById('weeklyChart');
        if (weeklyChart) {
            new MutationObserver(function () {
                if (!weeklyChart.getAttribute('role')) {
                    annotateWeeklyChart(window.stepTracker);
                }
            }).observe(weeklyChart, { childList: true });
        }
    }

    // -----------------------------------------------------------------------
    // Initialisation
    // -----------------------------------------------------------------------
    function init() {
        injectSkipLink();
        setupLiveRegions();
        setupTabRoles();
        semanticImprovements();
        setupReducedMotion();
        injectShortcutsPanel();
        setupKeyboardShortcuts();
        setupObserver();

        // Monkey-patches that depend on window.stepTracker
        if (window.stepTracker) {
            applyPatches();
        } else {
            // stepTracker may not be ready yet — wait for it
            let attempts = 0;
            const interval = setInterval(function () {
                attempts++;
                if (window.stepTracker) {
                    clearInterval(interval);
                    applyPatches();
                } else if (attempts > 50) {
                    clearInterval(interval);
                }
            }, 100);
        }
    }

    function applyPatches() {
        patchShowMessage();
        patchWeeklyChart();
        patchDashboard();
        patchSwitchTab();
        patchHamburger();

        // Run initial annotations if data is already rendered
        annotateProgressCircle();
        annotateWeeklyChart(window.stepTracker);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
