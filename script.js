// Step Tracker Application
class StepTracker {
    constructor() {
        try {
            this.currentUser = null;
            // Initialize users array empty - will be populated from Supabase if available
            this.users = [];
            
            // Prioritize Supabase as primary storage, localStorage as fallback only
            this.useSupabase = true; // Default to true, will be disabled if Supabase unavailable
            this.isSupabaseForced = false;
            try {
                // Check if Supabase is properly configured and available
                const supabaseAvailable = typeof window !== 'undefined' && 
                                         typeof window.supabase !== 'undefined' && 
                                         typeof SUPABASE_URL !== 'undefined' && 
                                         SUPABASE_URL !== 'YOUR_SUPABASE_PROJECT_URL' &&
                                         typeof SupabaseHelper !== 'undefined';
                
                if (supabaseAvailable) {
                    console.log('🌐 Supabase detected and configured - using as primary storage');
                    this.useSupabase = true;
                    localStorage.setItem('stepTrackerUsesSupabase', 'true');
                    this.isSupabaseForced = true;

                    // Optimistic hydration from local cache for fast UI
                    try {
                        const cachedUsers = JSON.parse(localStorage.getItem('stepTrackerUsers') || '[]');
                        if (cachedUsers.length) {
                            this.users = cachedUsers;
                        }
                    } catch (e) {
                        console.warn('Failed to parse cached users:', e);
                    }
                    
                    // Test Supabase connection
                    SupabaseHelper.testConnection().then(() => {
                        console.log('✅ Supabase connection verified');
                    }).catch(error => {
                        console.warn('⚠️ Supabase connection test failed, will use localStorage fallback:', error);
                    });
                } else {
                    console.log('📱 Supabase not available - falling back to localStorage');
                    this.useSupabase = false;
                    localStorage.setItem('stepTrackerUsesSupabase', 'false');
                    // Load from localStorage only when Supabase is not available
                    this.users = JSON.parse(localStorage.getItem('stepTrackerUsers') || '[]');
                }
            } catch (supabaseError) {
                console.warn('❌ Supabase initialization failed, falling back to localStorage:', supabaseError);
                this.useSupabase = false;
                localStorage.setItem('stepTrackerUsesSupabase', 'false');
                // Load from localStorage only when Supabase fails
                this.users = JSON.parse(localStorage.getItem('stepTrackerUsers') || '[]');
            }
            
            this.syncInProgress = false;
            this.realTimeSubscriptions = [];
            
            this.teams = [
                'CARE',
                'CCP',
                'CxE LT',
                'IDNA',
                'Management',
                'Purview/CES',
                'Scale Enablement',
                'Shared Services',
                'Threat Protection'
            ];
        this.challenges = [
            {
                id: 'frauenkirche',
                title: 'Frauenkirche Tower Climb',
                description: 'Climb the equivalent height of Munich\'s twin Frauenkirche towers!',
                icon: 'fas fa-church',
                target: 10000,
                fact: 'The two onion-domed towers of Munich\'s Frauenkirche stand 98.57 m and 98.45 m tall and have defined the city skyline since 1488 — by city ordinance, no central building may exceed them.'
            },
            {
                id: 'viktualienmarkt-walk',
                title: 'Viktualienmarkt Power Walk',
                description: 'Wander the lanes of the Viktualienmarkt 5 times',
                icon: 'fas fa-store',
                target: 8000,
                fact: 'The Viktualienmarkt has been Munich\'s daily food market since 1807, with around 140 stalls spread across 22,000 m² right in the city centre.'
            },
            {
                id: 'microsoft-campus',
                title: 'Microsoft Schwabing Trek',
                description: 'Walk the perimeter of Microsoft Deutschland\'s Schwabing HQ',
                icon: 'fas fa-building',
                target: 12000,
                fact: 'Microsoft Deutschland\'s Munich HQ — the "Office with Windows" on Walter-Gropius-Straße — covers 26,000 m² across seven floors and eleven roof terraces, hosting around 1,900 workspaces and holding LEED Platinum certification.'
            },
            {
                id: 'isar-shoreline',
                title: 'Isar River Shoreline',
                description: 'Match the steps of an Isar riverbank stroll from Deutsches Museum to the Englischer Garten',
                icon: 'fas fa-water',
                target: 15000,
                fact: 'The Isar runs 295 km from the Karwendel Alps to the Danube, and Munich\'s 8 km of restored river banks are one of Europe\'s best urban renaturation projects.'
            },
            {
                id: 'clippy-quest',
                title: 'Clippy\'s Assistant Quest',
                description: 'Help Clippy by taking as many steps as Office 97 had features!',
                icon: 'fas fa-paperclip',
                target: 9700,
                fact: 'Clippy debuted in Office 97 and became one of Microsoft\'s most memorable (and controversial) features!'
            },
            {
                id: 'windows-95-launch',
                title: 'Windows 95 Launch Walk',
                description: 'Match the steps to Windows 95\'s August 24, 1995 launch celebration',
                icon: 'fab fa-windows',
                target: 19950,
                fact: 'Windows 95 launched on August 24, 1995, with a $300 million marketing campaign featuring the Rolling Stones!'
            },
            {
                id: 'master-chief-march',
                title: 'Master Chief\'s March',
                description: 'Walk like the legendary Spartan-117 through the Halo universe',
                icon: 'fas fa-rocket',
                target: 11700,
                fact: 'Master Chief (Spartan-117) first appeared in Halo: Combat Evolved in 2001, revolutionizing console gaming!'
            },
            {
                id: 'englischer-garten-loop',
                title: 'Englischer Garten Grand Loop',
                description: 'Loop the Englischer Garten via the Chinesischer Turm and Kleinhesseloher See',
                icon: 'fas fa-tree',
                target: 14000,
                fact: 'At 375 hectares, the Englischer Garten is one of the largest urban parks in the world — bigger than New York\'s Central Park — and has been open to the public since 1792.'
            }
        ];
        this.currentTab = 'dashboard';
        this.leaderboardPeriod = 'today';
        this.recentActivities = JSON.parse(localStorage.getItem('stepTrackerActivities') || '[]');
        
        // Performance optimizations - cache frequently used DOM elements
        this.domCache = {};
        this.debounceTimers = {};
        this.intersectionObserver = null;
        
        // Initialize Intersection Observer for lazy loading
        this.initIntersectionObserver();
        
        // Dynamic content arrays
        this.greetings = [
            { text: 'Hello', lang: 'English' },
            { text: 'Hi', lang: 'English' },
            { text: 'Hey', lang: 'English' },
            { text: 'Good day', lang: 'English' },
            { text: 'Welcome', lang: 'English' },
            { text: 'Greetings', lang: 'English' }
        ];

        this.motivationalPhrases = [
            "Let's make today count with every step!",
            "Every step brings you closer to your goals!",
            "Your journey to greatness starts with a single step!",
            "Make every step an achievement!",
            "Step by step, you're building a healthier you!",
            "Today's steps are tomorrow's strength!",
            "Walk your way to victory!",
            "Each step is a small win worth celebrating!",
            "Keep moving forward, one step at a time!",
            "Your steps today shape your future self!",
            "Step into greatness!",
            "Progress is measured in steps, not leaps!",
            "Every step counts toward your success!",
            "Walk with purpose, step with pride!",
            "Transform your day, one step at a time!"
        ];
        
        // Initialize Supabase integration if available
        if (this.useSupabase) {
            // Initialize Supabase asynchronously to avoid blocking the constructor
            setTimeout(() => {
                this.initSupabaseIntegration().catch(error => {
                    console.warn('Supabase initialization failed, continuing in offline mode:', error);
                    this.useSupabase = false;
                });
            }, 100);
        }
        
        // Initialize the application
        this.init();
        
        } catch (error) {
            console.error('Constructor initialization failed:', error);
            // Show a basic error message if constructor fails
            document.body.innerHTML = '<div style="text-align: center; margin: 50px; font-family: Arial;"><h2>Failed to load the application</h2><p>Please refresh the page. If the problem persists, clear your browser data.</p></div>';
        }
    }

    init() {
        const startTime = performance.now();
        
        try {
            // Mobile viewport height optimization
            this.initMobileViewport();
            
            // Critical path - load immediately
            this.loadCurrentUser();
            this.initDarkMode();
            this.initUI();
            
            // Setup event listeners early
            this.setupEventListeners();
            
            // Setup message listener for live display communication
            this.setupLiveDisplayCommunication();
            
            // Defer non-critical initialization with fallback
            const deferredInit = () => {
                this.loadWeather();
                this.initDynamicContent();
                this.checkStorageQuota();
                this.trackPerformanceMetrics();
            };
            
            // Use requestIdleCallback if available, otherwise setTimeout
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(deferredInit);
            } else {
                setTimeout(deferredInit, 100);
            }
            
            // Update UI based on user state
            if (!this.currentUser) {
                this.showWelcomeScreen();
            } else {
                this.hideWelcomeScreen();
                // Batch DOM updates for better performance
                this.batchDOMUpdates([
                    () => this.updateDashboard(),
                    () => this.updateLeaderboard(),
                    () => this.updateTeamStats(),
                    () => this.updateProfile()
                ]);
            }

            // Performance monitoring
            const endTime = performance.now();
            console.log(`App initialization completed in ${Math.round(endTime - startTime)}ms`);
            
            // Start periodic data refresh if using Supabase
            this.startPeriodicRefresh();
            
        } catch (error) {
            this.handleError(error, 'init');
            this.showMessage('Failed to load the application. Please refresh the page.', 'error');
        }
    }

    startPeriodicRefresh() {
        if (this.useSupabase) {
            console.log('🔄 Starting periodic data refresh (5 minutes)');
            
            // Refresh full data every 5 minutes to catch updates from other users/devices
            setInterval(async () => {
                try {
                    console.log('🔄 Periodic refresh triggered');
                    
                    // Only refresh if we have a current user and the app is visible
                    if (this.currentUser && !document.hidden) {
                        await this.loadDataFromSupabase();
                        console.log('✅ Periodic refresh completed');
                        
                        // Check if we need to sync any pending local changes
                        await this.syncPendingLocalChanges();
                    } else {
                        console.log('⏭️ Skipping periodic refresh (no user or page hidden)');
                    }
                } catch (error) {
                    console.error('❌ Periodic refresh failed:', error);
                    // Store the failure for retry later
                    this.handleSyncFailure('periodic_refresh', error);
                }
            }, 5 * 60 * 1000); // 5 minutes

            // Refresh recent activities more frequently (every 30 seconds)
            console.log('🔄 Starting frequent activity refresh (30 seconds)');
            setInterval(async () => {
                try {
                    // Only refresh activities if we have a current user and the app is visible
                    if (this.currentUser && !document.hidden) {
                        await this.refreshRecentActivities();
                    }
                } catch (error) {
                    console.error('❌ Activity refresh failed:', error);
                    this.handleSyncFailure('activity_refresh', error);
                }
            }, 30 * 1000); // 30 seconds

            // Update activity timestamps every minute
            setInterval(() => {
                if (this.currentUser && !document.hidden) {
                    this.updateActivityTimestamps();
                }
            }, 60 * 1000); // 1 minute

            // Add connection monitoring and auto-sync retry
            this.startConnectionMonitoring();
        }
    }

    // Performance monitoring
    trackPerformanceMetrics() {
        if ('performance' in window) {
            // Track Core Web Vitals
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'measure' && entry.name === 'step-tracker-init') {
                        console.log(`App initialization: ${entry.duration.toFixed(2)}ms`);
                    }
                }
            });
            observer.observe({ entryTypes: ['measure'] });
            
            // Track memory usage (if available)
            if ('memory' in performance) {
                const memory = performance.memory;
                console.log(`Memory usage: ${(memory.usedJSHeapSize / 1048576).toFixed(2)}MB`);
                
                // Warn if memory usage is high
                if (memory.usedJSHeapSize > 50 * 1048576) { // 50MB
                    console.warn('High memory usage detected');
                }
            }
            
            // Track user interactions
            this.trackUserInteractions();
            
            // Force favicon refresh if needed
            this.ensureFaviconLoads();
        }
    }

    // Ensure favicon loads properly across all browsers
    ensureFaviconLoads() {
        try {
            // Force favicon refresh by adding timestamp
            const favicon = document.querySelector("link[rel*='icon']");
            if (favicon) {
                const faviconUrl = favicon.href;
                favicon.href = faviconUrl + '?v=' + Date.now();
            }
            
            // Fallback for browsers that don't support SVG favicons
            const supportsSVGFavicon = document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#Image", "1.1");
            if (!supportsSVGFavicon) {
                console.log('SVG favicon not supported, using fallback');
                // The HTML already includes PNG fallbacks via data URIs
            }
        } catch (error) {
            console.error('Favicon loading error:', error);
        }
    }

    // Track user interactions for analytics
    trackUserInteractions() {
        let interactionCount = 0;
        const trackInteraction = (type) => {
            interactionCount++;
            console.log(`User interaction #${interactionCount}: ${type}`);
        };

        // Track tab switches
        const originalSwitchTab = this.switchTab.bind(this);
        this.switchTab = (tabName) => {
            trackInteraction(`tab-switch-${tabName}`);
            return originalSwitchTab(tabName);
        };

        // Track step additions
        const originalAddSteps = this.addSteps.bind(this);
        this.addSteps = () => {
            trackInteraction('add-steps');
            return originalAddSteps();
        };
    }

    // Check localStorage quota and warn if approaching limit
    checkStorageQuota() {
        try {
            const used = JSON.stringify(localStorage).length;
            const limit = 5 * 1024 * 1024; // 5MB typical limit
            const usagePercent = (used / limit) * 100;
            
            if (usagePercent > 80) {
                console.warn(`localStorage usage: ${usagePercent.toFixed(1)}%`);
                if (usagePercent > 90) {
                    this.showMessage('Storage nearly full. Consider resetting data.', 'error');
                }
            }
        } catch (error) {
            console.error('Could not check storage quota:', error);
        }
    }

    // Enhanced global error handler with retry logic
    handleError(error, context = 'Unknown') {
        console.error(`Error in ${context}:`, error);
        
        // Log error details with enhanced information
        const errorDetails = {
            message: error.message,
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            memoryUsage: this.getMemoryUsage(),
            storageQuota: this.getStorageQuota()
        };
        
        // Store error for debugging (limit to last 10 errors)
        try {
            const errors = JSON.parse(localStorage.getItem('stepTrackerErrors') || '[]');
            errors.unshift(errorDetails);
            if (errors.length > 10) {
                errors.splice(10);
            }
            localStorage.setItem('stepTrackerErrors', JSON.stringify(errors));
        } catch (storageError) {
            console.error('Could not save error log:', storageError);
            // If we can't save errors, at least log them
            console.warn('Error storage failed, logging to console only');
        }
        
        // Implement retry logic for certain operations
        if (this.shouldRetry(context, error)) {
            this.retryOperation(context, error);
        } else {
            // Show user-friendly error message
            this.showMessage(this.getErrorMessage(error, context), 'error');
        }
    }

    // Input validation and sanitization
    validateAndSanitizeInput(input, type) {
        if (input === null || input === undefined) {
            throw new Error('Input cannot be empty');
        }
        
        const sanitized = String(input).trim();
        
        switch (type) {
            case 'goal':
                const goal = parseInt(sanitized, 10);
                if (isNaN(goal)) {
                    throw new Error('Please enter a valid number');
                }
                if (goal < 100) {
                    throw new Error('Goal must be at least 100 steps');
                }
                if (goal > 100000) {
                    throw new Error('Goal cannot exceed 100,000 steps');
                }
                return goal;
                
            case 'team':
                if (!this.teams.includes(sanitized)) {
                    throw new Error('Invalid team selection');
                }
                return sanitized;
                
            case 'steps':
                const steps = parseInt(sanitized, 10);
                if (isNaN(steps) || steps < 0) {
                    throw new Error('Please enter a valid number of steps');
                }
                if (steps > 200000) {
                    throw new Error('Step count seems unrealistic. Please verify.');
                }
                return steps;
                
            default:
                // Basic XSS prevention for string inputs
                return sanitized
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#x27;');
        }
    }

    // New helper methods for enhanced error handling
    getMemoryUsage() {
        if ('memory' in performance) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1048576),
                total: Math.round(performance.memory.totalJSHeapSize / 1048576),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
            };
        }
        return null;
    }

    getStorageQuota() {
        try {
            const used = JSON.stringify(localStorage).length;
            return {
                used: Math.round(used / 1024),
                usedMB: Math.round(used / 1048576 * 100) / 100
            };
        } catch (error) {
            return null;
        }
    }

    shouldRetry(context, error) {
        const retryableContexts = ['loadWeather', 'saveData'];
        const retryableErrors = ['NetworkError', 'TimeoutError'];
        
        return retryableContexts.includes(context) || 
               retryableErrors.some(type => error.message.includes(type));
    }

    retryOperation(context, error) {
        const retryCount = this.retryCount || {};
        retryCount[context] = (retryCount[context] || 0) + 1;
        this.retryCount = retryCount;
        
        if (retryCount[context] <= 3) {
            const delay = Math.pow(2, retryCount[context]) * 1000; // Exponential backoff
            console.log(`Retrying ${context} in ${delay}ms (attempt ${retryCount[context]})`);
            
            setTimeout(() => {
                if (context === 'loadWeather') {
                    this.loadWeather();
                } else if (context === 'saveData') {
                    this.saveData();
                }
            }, delay);
        } else {
            this.showMessage(`Operation ${context} failed after multiple attempts.`, 'error');
            retryCount[context] = 0; // Reset for future attempts
        }
    }

    getErrorMessage(error, context) {
        const friendlyMessages = {
            'loadWeather': 'Weather data temporarily unavailable.',
            'saveData': 'Unable to save your data. Please try again.',
            'updateUI': 'Display update failed. Please refresh the page.',
            'addSteps': 'Failed to add steps. Please try again.'
        };
        
        return friendlyMessages[context] || 'An unexpected error occurred. The issue has been logged.';
    }

    // Get error logs for debugging
    getErrorLogs() {
        return JSON.parse(localStorage.getItem('stepTrackerErrors') || '[]');
    }

    // Clear error logs
    clearErrorLogs() {
        localStorage.removeItem('stepTrackerErrors');
        console.log('Error logs cleared');
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.closest('.nav-btn').dataset.tab);
            });
        });

        // Registration form
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.registerUser();
        });

        // Add steps with debouncing to prevent rapid clicks
        let addStepsTimeout;
        document.getElementById('addStepsBtn').addEventListener('click', () => {
            if (addStepsTimeout) return; // Prevent rapid clicks
            addStepsTimeout = setTimeout(() => addStepsTimeout = null, 500);
            this.addSteps();
        });

        // User selection
        document.getElementById('selectUserBtn').addEventListener('click', () => {
            this.selectExistingUser();
        });

        document.getElementById('registerNewUserBtn').addEventListener('click', () => {
            this.showRegistrationForm();
        });

        document.getElementById('backToSelection').addEventListener('click', () => {
            this.showUserSelection();
        });

        document.getElementById('stepsInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addSteps();
            }
        });

        // Leaderboard tabs
        document.querySelectorAll('.leaderboard-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Handle live display button separately
                if (e.target.id === 'liveDisplayBtn') {
                    this.openLiveDisplay();
                } else if (e.target.id === 'refreshLeaderboard') {
                    this.refreshData();
                } else {
                    this.switchLeaderboardPeriod(e.target.dataset.period);
                }
            });
        });

        // Profile actions
        document.getElementById('editGoalBtn').addEventListener('click', () => {
            this.editDailyGoal();
        });

        document.getElementById('changeTeamBtn').addEventListener('click', () => {
            this.changeTeam();
        });

        document.getElementById('resetDataBtn').addEventListener('click', () => {
            this.resetData();
        });

        // Recent Activity refresh
        document.getElementById('refreshActivity').addEventListener('click', async () => {
            const btn = document.getElementById('refreshActivity');
            
            // Add visual feedback
            btn.classList.add('refreshing');
            btn.disabled = true;
            
            try {
                await this.refreshRecentActivities();
                console.log('✅ Manual activity refresh completed');
            } catch (error) {
                console.error('❌ Manual activity refresh failed:', error);
            } finally {
                btn.classList.remove('refreshing');
                btn.disabled = false;
            }
        });

        // Add Previous Day
        document.getElementById('addPreviousDayBtn').addEventListener('click', () => {
            this.showAddPreviousDayModal();
        });

        // Hamburger menu
        document.getElementById('hamburgerMenu').addEventListener('click', () => {
            this.toggleHamburgerMenu();
        });

        // Cloud sync toggle
        const cloudSyncToggle = document.getElementById('cloudSyncToggle');
        if (cloudSyncToggle) {
            cloudSyncToggle.addEventListener('click', () => {
                this.toggleCloudSync();
            });
        }

        document.getElementById('closeFlyout').addEventListener('click', () => {
            this.closeHamburgerMenu();
        });

        document.getElementById('toggleDarkModeMenu').addEventListener('click', () => {
            this.toggleDarkMode();
        });

        document.getElementById('showFAQ').addEventListener('click', () => {
            this.showFAQModal();
        });

        document.getElementById('fileFeedback').addEventListener('click', () => {
            this.openGitHubIssue('bug');
        });

        document.getElementById('fileFeature').addEventListener('click', () => {
            this.openGitHubIssue('feature');
        });

        document.getElementById('viewGitHub').addEventListener('click', () => {
            window.open('https://github.com/Manaiakalani/CxEEMEAStepTracker', '_blank');
        });

        document.getElementById('adminLogin').addEventListener('click', () => {
            this.openAdminLogin();
        });

        // FAQ Modal
        document.getElementById('closeFAQ').addEventListener('click', () => {
            this.closeFAQModal();
        });

        // Add Previous Day Modal
        document.getElementById('closeAddPreviousDay').addEventListener('click', () => {
            this.closeAddPreviousDayModal();
        });

        document.getElementById('cancelAddPreviousDay').addEventListener('click', () => {
            this.closeAddPreviousDayModal();
        });

        document.getElementById('addPreviousDayForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = document.getElementById('previousDayDate').value;
            const steps = document.getElementById('previousDaySteps').value;
            
            if (date && steps) {
                await this.addPreviousDaySteps(date, parseInt(steps));
            }
        });

        // Spotify Widget
        document.getElementById('spotifyWidget').addEventListener('click', () => {
            this.openSpotifyPlaylist();
        });

        // Close flyout when clicking outside (on overlay)
        document.addEventListener('click', (e) => {
            const flyout = document.getElementById('hamburgerFlyout');
            const hamburgerBtn = document.getElementById('hamburgerMenu');
            const faqModal = document.getElementById('faqModal');
            const addPreviousDayModal = document.getElementById('addPreviousDayModal');
            
            // Close flyout when clicking on the overlay background
            if (flyout.classList.contains('open') && e.target === flyout) {
                this.closeHamburgerMenu();
            }

            // Close FAQ modal when clicking outside
            if (faqModal.classList.contains('show') && e.target === faqModal) {
                this.closeFAQModal();
            }

            // Close Add Previous Day modal when clicking outside
            if (addPreviousDayModal.classList.contains('show') && e.target === addPreviousDayModal) {
                this.closeAddPreviousDayModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when not typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Alt/Option + number for tab switching
            if (e.altKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.switchTab('dashboard');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchTab('leaderboard');
                        break;
                    case '3':
                        e.preventDefault();
                        this.switchTab('teams');
                        break;
                    case '4':
                        e.preventDefault();
                        this.switchTab('profile');
                        break;
                }
            }

            // Escape key to close modals/flyouts
            if (e.key === 'Escape') {
                const flyout = this.getElement('hamburgerFlyout');
                const modal = this.getElement('faqModal');
                
                if (flyout && flyout.classList.contains('open')) {
                    this.closeHamburgerMenu();
                } else if (modal && modal.classList.contains('show')) {
                    this.closeFAQModal();
                }
            }

            // Ctrl/Cmd + D for dark mode toggle
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                this.toggleDarkMode();
            }
        });
    }

    loadCurrentUser() {
        const userId = localStorage.getItem('currentStepTrackerUser');
        if (!userId) return;

        // Prefer in-memory users
        let user = this.users.find(u => u.id === userId);

        // Fallback to cached localStorage users if not found yet (Supabase still loading)
        if (!user) {
            try {
                const cachedUsers = JSON.parse(localStorage.getItem('stepTrackerUsers') || '[]');
                user = cachedUsers.find(u => u.id === userId);
                if (user && !this.useSupabase) {
                    this.users = cachedUsers; // hydrate when offline/local mode
                }
            } catch (e) {
                console.warn('Failed to parse cached users in loadCurrentUser:', e);
            }
        }

        if (user) {
            this.currentUser = user;
        }
    }

    async registerUser() {
        const name = document.getElementById('userName').value.trim();
        const team = document.getElementById('userTeam').value;
        const dailyGoal = parseInt(document.getElementById('dailyGoal').value);

        if (!name || !team) {
            this.showMessage('Please fill in all fields', 'error');
            return;
        }

        const user = {
            id: this.generateId(),
            name,
            team,
            dailyGoal,
            steps: {},
            joinedDate: new Date().toISOString(),
            totalSteps: 0
        };

        try {
            let supabaseSuccess = false;
            
            // Always try Supabase first if available
            if (this.useSupabase) {
                try {
                    console.log('🌐 Registering user in Supabase...');
                    await SupabaseHelper.createUser(user);
                    console.log('✅ User successfully registered in Supabase');
                    supabaseSuccess = true;
                } catch (supabaseError) {
                    console.warn('❌ Supabase registration failed, falling back to localStorage:', supabaseError);
                }
            }
            
            // Always update localStorage as backup (or primary if Supabase failed)
            this.users.push(user);
            this.saveData();
            
            this.currentUser = user;
            localStorage.setItem('currentStepTrackerUser', user.id);
            
            // ALWAYS create activity record regardless of Supabase success
            // This ensures activity shows in both Recent Activity and Live Activity Feed
            console.log('🎯 Creating activity record for new user registration...');
            await this.addRecentActivity('user', `${name} joined the step tracker challenge!`, new Date());
            console.log('✅ Activity record created successfully');
            
            const welcomeMessage = supabaseSuccess ? 
                `Welcome ${name}! Synced to cloud! Let's start tracking! 🌐🚀` : 
                `Welcome ${name}! Let's start tracking those steps! 🚀`;
            this.showMessage(welcomeMessage, 'success');
            this.hideWelcomeScreen();
            this.updateUI();
            
        } catch (error) {
            console.error('Error registering user:', error);
            this.showMessage('Failed to register user. Please try again.', 'error');
        }
    }

    async addSteps() {
        if (!this.currentUser) {
            this.showMessage('⚠️ Please select a user from the dropdown or register a new user first!', 'error');
            const userSelect = document.getElementById('userSelect');
            if (userSelect) userSelect.focus();
            return;
        }

        const stepsInput = document.getElementById('stepsInput');
        if (!stepsInput) {
            this.showMessage('Interface error - please refresh the page', 'error');
            return;
        }
        
        const steps = parseInt(stepsInput.value);
        if (!steps || steps < 0 || steps > 50000) {
            this.showMessage('Please enter a valid number of steps (1-50,000)', 'error');
            stepsInput.focus();
            return;
        }

        const today = this.getToday();
        const formatSteps = this.formatNumber(steps);
        
        // Immediate UI feedback - clear input and show optimistic update
        stepsInput.value = '';
        const previousSteps = this.currentUser.steps[today] || 0;
        const isFirstTimeGoal = previousSteps < this.currentUser.dailyGoal && (previousSteps + steps) >= this.currentUser.dailyGoal;

        // Update local data immediately for instant UI response
        if (!this.currentUser.lastActiveDate || this.currentUser.lastActiveDate !== today) {
            this.currentUser.dailyOverachieverNotified = false;
            this.currentUser.lastActiveDate = today;
        }

        if (!this.currentUser.steps[today]) {
            this.currentUser.steps[today] = 0;
        }

        this.currentUser.steps[today] += steps;
        this.currentUser.totalSteps += steps;
        
        // Track data modification for sync purposes
        this.trackDataModification(this.currentUser.id);
        
        this.saveData();
        
        // Immediate UI update and user feedback
        this.updateUI();
        this.showMessage(`Added ${formatSteps} steps! 👏`, 'success');
        this.showLiveNotification('steps', `${this.currentUser.name} added ${formatSteps} steps!`, 'fas fa-walking');

        // Handle goal achievement immediately
        if (isFirstTimeGoal) {
            this.showMessage(`🎉 Daily goal achieved! You're crushing it!`, 'success');
            this.showLiveNotification('achievement', `🎉 ${this.currentUser.name} reached their daily goal!`, 'fas fa-trophy');
        }

        // Background sync and activity logging (non-blocking)
        this.performBackgroundSync(today, steps, formatSteps, isFirstTimeGoal).catch(error => {
            console.error('Background sync failed:', error);
            this.showMessage('⚠️ Some data may not be synced - your progress is saved locally', 'warning');
        });

        // Background checks (non-blocking)
        setTimeout(() => {
            this.checkChallengeCompletions(this.currentUser.totalSteps - steps, this.currentUser.totalSteps);
            this.checkOverachieverStatus(steps);
        }, 0);
    }

    // Non-blocking background sync
    async performBackgroundSync(today, steps, formatSteps, isFirstTimeGoal) {
        try {
            if (this.useSupabase) {
                // Parallel Supabase operations for better performance
                const promises = [
                    SupabaseHelper.addSteps(this.currentUser.id, today, steps),
                    SupabaseHelper.updateUser(this.currentUser.id, {
                        last_active_date: today,
                        daily_overachiever_notified: this.currentUser.dailyOverachieverNotified || false
                    })
                ];

                await Promise.all(promises);
                
                // Background activity logging
                const activities = [`${this.currentUser.name} added ${formatSteps} steps`];
                if (isFirstTimeGoal) {
                    activities.push(`${this.currentUser.name} reached their daily goal!`);
                }
                
                // Fire and forget activity logging
                activities.forEach(message => {
                    this.addRecentActivity('steps', message, new Date()).catch(err => 
                        console.warn('Activity logging failed:', err)
                    );
                });
                
                // Update success message quietly
                setTimeout(() => {
                    this.showMessage(`✅ ${formatSteps} steps synced to cloud!`, 'success');
                }, 1000);
                
                localStorage.removeItem('stepTrackerOfflineMode');
            } else {
                // Local activity logging for offline mode
                await this.addRecentActivity('steps', `${this.currentUser.name} added ${formatSteps} steps`, new Date());
                if (isFirstTimeGoal) {
                    await this.addRecentActivity('achievement', `${this.currentUser.name} reached their daily goal!`, new Date());
                }
            }
        } catch (error) {
            console.error('Background sync error:', error);
            if (!this.connectionRetryInterval) {
                this.startAggressiveConnectionRetry();
            }
            throw error;
        }
    }

    updateDashboard() {
        if (!this.currentUser) return;

        const today = this.getToday();
        const todaySteps = this.currentUser.steps[today] || 0;
        const dailyGoal = this.currentUser.dailyGoal;
        
        // Update user name and dynamic content
        document.getElementById('userDisplayName').textContent = this.currentUser.name;
        this.setRandomGreeting();
        this.setRandomMotivationalPhrase();
        
        // Update current date
        document.getElementById('currentDate').textContent = this.formatDate(new Date());
        
        // Update today's steps
        document.getElementById('todaySteps').textContent = this.formatNumber(todaySteps);
        document.getElementById('dailyGoalDisplay').textContent = this.formatNumber(dailyGoal);
        
        // Update remaining steps
        const remaining = Math.max(0, dailyGoal - todaySteps);
        document.getElementById('remainingSteps').textContent = this.formatNumber(remaining);
        
        // Update progress percentage
        const percentage = Math.min(100, Math.round((todaySteps / dailyGoal) * 100));
        document.getElementById('progressPercentage').textContent = `${percentage}%`;
        
        // Update progress circle
        const circumference = 2 * Math.PI * 50; // radius = 50
        const offset = circumference - (percentage / 100 * circumference);
        document.getElementById('progressCircle').style.strokeDashoffset = offset;
        
        // Update total steps in header
        document.getElementById('totalSteps').textContent = this.formatNumber(this.currentUser.totalSteps);
        
        // Update weekly chart
        this.updateWeeklyChart();
        
        // Update challenges
        this.updateChallenges();
        
        // Update recent activities
        this.updateRecentActivities();
    }

    updateWeeklyChart() {
        const weeklyChart = document.getElementById('weeklyChart');
        const last7Days = this.getLast7Days();
        let maxSteps = 1000; // minimum scale
        
        // Find max steps for scaling
        last7Days.forEach(day => {
            const steps = this.currentUser.steps[day.date] || 0;
            maxSteps = Math.max(maxSteps, steps);
        });
        
        weeklyChart.innerHTML = '';
        
        last7Days.forEach(day => {
            const steps = this.currentUser.steps[day.date] || 0;
            const height = Math.max(20, (steps / maxSteps) * 120);
            
            const barContainer = document.createElement('div');
            barContainer.className = 'day-bar';
            barContainer.style.height = `${height}px`;
            
            const label = document.createElement('div');
            label.className = 'day-label';
            label.textContent = day.label;
            
            const value = document.createElement('div');
            value.className = 'day-value';
            value.textContent = this.formatNumber(steps);
            
            barContainer.appendChild(label);
            barContainer.appendChild(value);
            weeklyChart.appendChild(barContainer);
        });
    }

    updateChallenges() {
        if (!this.currentUser) return;
        
        const challengesContainer = document.getElementById('challengesContainer');
        challengesContainer.innerHTML = '';
        
        this.challenges.forEach(challenge => {
            const userProgress = this.currentUser.totalSteps;
            const progressPercentage = Math.min(100, (userProgress / challenge.target) * 100);
            const isCompleted = userProgress >= challenge.target;
            
            const challengeElement = document.createElement('div');
            challengeElement.className = `challenge-item ${isCompleted ? 'challenge-completed' : ''}`;
            challengeElement.innerHTML = `
                <div class="challenge-header">
                    <div class="challenge-info">
                        <div class="challenge-title">
                            <i class="${challenge.icon}"></i>
                            <span>${challenge.title}</span>
                            ${isCompleted ? '<i class="fas fa-check-circle challenge-completed-icon"></i>' : ''}
                        </div>
                        <div class="challenge-description">${challenge.description}</div>
                    </div>
                    <div class="challenge-progress-info">${this.formatNumber(userProgress)} / ${this.formatNumber(challenge.target)}</div>
                </div>
                <div class="challenge-progress-bar">
                    <div class="challenge-progress-fill" style="width: ${progressPercentage}%"></div>
                </div>
                <div class="challenge-fact">${challenge.fact}</div>
            `;
            
            challengesContainer.appendChild(challengeElement);
        });
    }

    updateLeaderboard() {
        const leaderboardList = document.getElementById('leaderboardList');
        
        // Filter out invalid users and ensure proper data structure
        let sortedUsers = this.users.filter(user => {
            return user && user.name && user.steps && typeof user.steps === 'object';
        }).map(user => ({
            ...user,
            steps: user.steps || {},
            totalSteps: user.totalSteps || 0,
            team: user.team || 'No Team',
            name: user.name || 'Unknown User'
        }));
        
        // Sort based on selected period
        switch (this.leaderboardPeriod) {
            case 'today':
                const today = this.getToday();
                sortedUsers.sort((a, b) => {
                    const aSteps = (a.steps && a.steps[today]) || 0;
                    const bSteps = (b.steps && b.steps[today]) || 0;
                    return bSteps - aSteps;
                });
                break;
            case 'week':
                const last7Days = this.getLast7Days().map(d => d.date);
                sortedUsers.sort((a, b) => {
                    const aWeekSteps = last7Days.reduce((sum, date) => sum + ((a.steps && a.steps[date]) || 0), 0);
                    const bWeekSteps = last7Days.reduce((sum, date) => sum + ((b.steps && b.steps[date]) || 0), 0);
                    return bWeekSteps - aWeekSteps;
                });
                break;
            case 'total':
                sortedUsers.sort((a, b) => (b.totalSteps || 0) - (a.totalSteps || 0));
                break;
        }
        
        leaderboardList.innerHTML = '';
        
        sortedUsers.forEach((user, index) => {
            let steps = 0; // Default to 0
            
            switch (this.leaderboardPeriod) {
                case 'today':
                    steps = user.steps[this.getToday()] || 0;
                    break;
                case 'week':
                    const last7Days = this.getLast7Days().map(d => d.date);
                    steps = last7Days.reduce((sum, date) => sum + (user.steps[date] || 0), 0);
                    break;
                case 'total':
                    steps = user.totalSteps || 0;
                    break;
            }
            
            // Ensure steps is a valid number
            steps = Number(steps) || 0;
            
            const item = document.createElement('div');
            item.className = `leaderboard-item ${this.currentUser && user.id === this.currentUser.id ? 'current-user' : ''}`;
            
            const rank = index + 1;
            let rankClass = '';
            if (rank === 1) rankClass = 'gold';
            else if (rank === 2) rankClass = 'silver';
            else if (rank === 3) rankClass = 'bronze';
            
            // Check if user is an overachiever
            let overachieverBadge = '';
            if (this.isOverachiever(user, steps)) {
                overachieverBadge = '<span class="overachiever-badge" title="Overachiever!">⭐</span>';
            }
            
            item.innerHTML = `
                <div class="leaderboard-rank ${rankClass}">${rank}</div>
                <div class="leaderboard-info">
                    <div class="leaderboard-name">${user.name} ${overachieverBadge}</div>
                    <div class="leaderboard-team">${user.team}</div>
                </div>
                <div class="leaderboard-steps">${this.formatNumber(steps)}</div>
            `;
            
            leaderboardList.appendChild(item);
        });
    }

    updateTeamStats() {
        const teamLeaderboard = document.getElementById('teamLeaderboard');
        const teamStats = {};
        
        // Calculate team statistics
        this.teams.forEach(teamName => {
            teamStats[teamName] = {
                name: teamName,
                members: 0,
                totalSteps: 0,
                avgSteps: 0
            };
        });
        
        this.users.forEach(user => {
            if (teamStats[user.team]) {
                teamStats[user.team].members++;
                teamStats[user.team].totalSteps += user.totalSteps;
            }
        });
        
        // Calculate averages and sort
        const sortedTeams = Object.values(teamStats)
            .filter(team => team.members > 0)
            .map(team => ({
                ...team,
                avgSteps: Math.round(team.totalSteps / team.members)
            }))
            .sort((a, b) => b.totalSteps - a.totalSteps);
        
        teamLeaderboard.innerHTML = '';
        
        sortedTeams.forEach((team, index) => {
            const item = document.createElement('div');
            item.className = `team-item ${this.currentUser && team.name === this.currentUser.team ? 'current-team' : ''}`;
            
            item.innerHTML = `
                <div class="team-rank">${index + 1}</div>
                <div class="team-info">
                    <div class="team-name">${team.name}</div>
                    <div class="team-members">${team.members} member${team.members !== 1 ? 's' : ''}</div>
                </div>
                <div class="team-stats">
                    <div class="team-steps">${this.formatNumber(team.totalSteps)}</div>
                    <div class="team-avg">${this.formatNumber(team.avgSteps)} avg</div>
                </div>
            `;
            
            teamLeaderboard.appendChild(item);
        });
    }

    updateProfile() {
        if (!this.currentUser) return;
        
        document.getElementById('profileName').textContent = this.currentUser.name;
        document.getElementById('profileTeam').textContent = this.currentUser.team;
        document.getElementById('profileTotalSteps').textContent = this.formatNumber(this.currentUser.totalSteps);
        
        // Calculate average steps per day
        const daysActive = Object.keys(this.currentUser.steps).length;
        const avgSteps = daysActive > 0 ? Math.round(this.currentUser.totalSteps / daysActive) : 0;
        document.getElementById('profileAvgSteps').textContent = this.formatNumber(avgSteps);
        
        // Calculate rank
        const sortedUsers = [...this.users].sort((a, b) => b.totalSteps - a.totalSteps);
        const rank = sortedUsers.findIndex(user => user.id === this.currentUser.id) + 1;
        document.getElementById('profileRank').textContent = `#${rank}`;
    }

    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });
        
        document.getElementById(`${tabName}Tab`).style.display = 'flex';
        this.currentTab = tabName;
        
        // Update content based on tab
        switch (tabName) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'leaderboard':
                this.updateLeaderboard();
                break;
            case 'teams':
                this.updateTeamStats();
                break;
            case 'profile':
                this.updateProfile();
                break;
        }
    }

    switchLeaderboardPeriod(period) {
        this.leaderboardPeriod = period;
        
        document.querySelectorAll('.leaderboard-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.period === period);
        });
        
        this.updateLeaderboard();
    }

    editDailyGoal() {
        try {
            const currentGoal = this.currentUser.dailyGoal;
            const newGoalInput = prompt('Enter your new daily step goal:', currentGoal);
            
            if (newGoalInput === null) return; // User cancelled
            
            const newGoal = this.validateAndSanitizeInput(newGoalInput, 'goal');
            
            this.currentUser.dailyGoal = newGoal;
            
            // Track data modification for sync purposes
            this.trackDataModification(this.currentUser.id);
            
            this.saveData();
            this.updateDashboard();
            this.showMessage(`Daily goal updated to ${this.formatNumber(newGoal)} steps!`, 'success');
            
        } catch (error) {
            this.handleError(error, 'editDailyGoal');
            this.showMessage(error.message, 'error');
        }
    }

    changeTeam() {
        try {
            const currentTeam = this.currentUser.team;
            
            // Create a select dropdown for team selection
            const teamOptions = this.teams.map(team => 
                `<option value="${team}" ${team === currentTeam ? 'selected' : ''}>${team}</option>`
            ).join('');
            
            const selectHTML = `
                <div style="margin: 10px 0;">
                    <label for="newTeamSelect" style="display: block; margin-bottom: 5px; font-weight: bold;">Select your new team:</label>
                    <select id="newTeamSelect" style="width: 100%; padding: 8px; font-size: 14px; border: 1px solid #ddd; border-radius: 4px;">
                        ${teamOptions}
                    </select>
                </div>
            `;
            
            // Create a modal-like experience
            const modalDiv = document.createElement('div');
            modalDiv.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                background: rgba(0,0,0,0.5); z-index: 10000; 
                display: flex; align-items: center; justify-content: center;
            `;
            
            const contentDiv = document.createElement('div');
            contentDiv.style.cssText = `
                background: white; padding: 20px; border-radius: 8px; 
                max-width: 400px; width: 90%; margin: 20px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            `;
            
            contentDiv.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: #333;">Change Team</h3>
                <p style="margin: 0 0 15px 0; color: #666;">Current team: <strong>${currentTeam}</strong></p>
                ${selectHTML}
                <div style="margin-top: 20px; text-align: right;">
                    <button id="cancelTeamChange" style="margin-right: 10px; padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
                    <button id="confirmTeamChange" style="padding: 8px 16px; background: #0078d4; color: white; border: none; border-radius: 4px; cursor: pointer;">Change Team</button>
                </div>
            `;
            
            modalDiv.appendChild(contentDiv);
            document.body.appendChild(modalDiv);
            
            // Handle button clicks
            document.getElementById('cancelTeamChange').onclick = () => {
                document.body.removeChild(modalDiv);
            };
            
            document.getElementById('confirmTeamChange').onclick = () => {
                const newTeam = document.getElementById('newTeamSelect').value;
                
                if (newTeam === currentTeam) {
                    this.showMessage('You are already on that team!', 'info');
                    document.body.removeChild(modalDiv);
                    return;
                }
                
                // Validate the team selection
                const validatedTeam = this.validateAndSanitizeInput(newTeam, 'team');
                
                // Update user's team
                this.currentUser.team = validatedTeam;
                
                // Track data modification for sync purposes
                this.trackDataModification(this.currentUser.id);
                
                this.saveData();
                
                // Update UI
                this.updateProfile();
                this.updateTeamStats();
                
                // Show success message
                this.showMessage(`Team changed from "${currentTeam}" to "${validatedTeam}"! 🎉`, 'success');
                
                // Add to recent activities
                this.addRecentActivity('team-change', `${this.currentUser.name} changed teams to ${validatedTeam}`, new Date());
                
                // Close modal
                document.body.removeChild(modalDiv);
            };
            
            // Close modal when clicking outside
            modalDiv.onclick = (e) => {
                if (e.target === modalDiv) {
                    document.body.removeChild(modalDiv);
                }
            };
            
        } catch (error) {
            this.handleError(error, 'changeTeam');
            this.showMessage(error.message, 'error');
        }
    }

    resetData() {
        if (confirm('Are you sure you want to reset all your step data? This cannot be undone.')) {
            this.currentUser.steps = {};
            this.currentUser.totalSteps = 0;
            this.saveData();
            this.updateUI();
            this.showMessage('All step data has been reset.', 'success');
        }
    }

    showWelcomeScreen() {
        document.getElementById('welcomeScreen').style.display = 'flex';
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
        });
        
        // Check if there are existing users
        if (this.users && this.users.length > 0) {
            this.showUserSelection();
        } else {
            this.showRegistrationForm();
        }
    }
    
    showUserSelection() {
        const existingUserSection = document.getElementById('existingUserSection');
        const registrationSection = document.getElementById('registrationSection');
        const backToSelectionBtn = document.getElementById('backToSelectionBtn');
        
        // Populate user dropdown
        const userSelect = document.getElementById('existingUserSelect');
        userSelect.innerHTML = '<option value="">Choose your name...</option>';
        
        this.users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.name} (${user.team})`;
            userSelect.appendChild(option);
        });
        
        existingUserSection.style.display = 'block';
        registrationSection.style.display = 'none';
        backToSelectionBtn.style.display = 'none';
    }
    
    showRegistrationForm() {
        const existingUserSection = document.getElementById('existingUserSection');
        const registrationSection = document.getElementById('registrationSection');
        const backToSelectionBtn = document.getElementById('backToSelectionBtn');
        const registrationTitle = document.getElementById('registrationTitle');
        
        existingUserSection.style.display = 'none';
        registrationSection.style.display = 'block';
        
        // Show back button only if there are existing users
        if (this.users && this.users.length > 0) {
            backToSelectionBtn.style.display = 'block';
            this._setRegistrationTitle(registrationTitle, 'New User Registration');
        } else {
            backToSelectionBtn.style.display = 'none';
            this._setRegistrationTitle(registrationTitle, 'Get Started!');
        }
    }

    _setRegistrationTitle(h3, text) {
        if (!h3) return;
        const span = h3.querySelector('.section-title-text');
        if (span) {
            span.textContent = text;
        } else {
            // Fallback if structure changed
            h3.textContent = text;
        }
    }
    
    selectExistingUser() {
        const userSelect = document.getElementById('existingUserSelect');
        const selectedUserId = userSelect.value;
        
        if (!selectedUserId) {
            this.showMessage('Please select a user from the dropdown', 'error');
            return;
        }
        
        this.currentUser = this.users.find(user => user.id === selectedUserId);
        if (this.currentUser) {
            localStorage.setItem('currentStepTrackerUser', selectedUserId);
            this.hideWelcomeScreen();
            this.updateUI();
            this.showMessage(`Welcome back, ${this.currentUser.name}! 👋`, 'success');
        } else {
            this.showMessage('Error selecting user. Please try again.', 'error');
        }
    }

    hideWelcomeScreen() {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('dashboardTab').style.display = 'flex';
    }

    updateUI() {
        if (this.currentUser) {
            this.hideWelcomeScreen();
            this.updateDashboard();
            this.updateLeaderboard();
            this.updateTeamStats();
            this.updateProfile();
        } else {
            this.showWelcomeScreen();
        }
    }

    async refreshData() {
        const refreshBtn = document.getElementById('refreshLeaderboard');
        
        try {
            // Add visual feedback
            if (refreshBtn) {
                refreshBtn.classList.add('refreshing');
                refreshBtn.disabled = true;
            }

            console.log('🔄 Manual refresh triggered from main app');

            if (this.useSupabase) {
                // Refresh data from Supabase
                await this.loadDataFromSupabase();
                this.showMessage('Data refreshed successfully! 🔄', 'success');
            } else {
                // Just update the UI with local data
                this.updateUI();
                this.showMessage('UI refreshed! (Using local data)', 'info');
            }

        } catch (error) {
            console.error('Failed to refresh data:', error);
            this.showMessage('Failed to refresh data. Please try again.', 'error');
        } finally {
            // Restore button state
            if (refreshBtn) {
                refreshBtn.classList.remove('refreshing');
                refreshBtn.disabled = false;
            }
        }
    }

    showMessage(text, type = 'success') {
        const container = document.getElementById('messageContainer');
        const message = document.createElement('div');
        message.className = `message ${type}`;
        
        // Handle line breaks in messages
        if (text.includes('\n')) {
            message.innerHTML = text.split('\n').map(line => `<div>${line}</div>`).join('');
        } else {
            message.textContent = text;
        }
        
        container.appendChild(message);
        
        setTimeout(() => {
            message.remove();
        }, 5000);
    }

    // Utility functions
    generateId() {
        // Generate a proper UUID v4 for Supabase compatibility
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Debounced function execution to prevent excessive calls
    debounce(func, delay, key) {
        return (...args) => {
            clearTimeout(this.debounceTimers[key]);
            this.debounceTimers[key] = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // Enhanced DOM element caching with automatic cleanup
    getElement(id) {
        if (!this.domCache[id]) {
            this.domCache[id] = document.getElementById(id);
            
            // Set up mutation observer to clear cache if element is removed
            if (this.domCache[id] && 'MutationObserver' in window) {
                this.setupElementCacheCleanup(id);
            }
        }
        return this.domCache[id];
    }

    // New method for cache cleanup
    setupElementCacheCleanup(id) {
        if (!this.mutationObserver) {
            this.mutationObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.removedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                this.cleanupCacheForRemovedNode(node);
                            }
                        });
                    }
                });
            });
            
            this.mutationObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    cleanupCacheForRemovedNode(node) {
        Object.keys(this.domCache).forEach(cachedId => {
            const cachedElement = this.domCache[cachedId];
            if (cachedElement && (cachedElement === node || node.contains(cachedElement))) {
                delete this.domCache[cachedId];
            }
        });
    }

    // Enhanced batch DOM updates with virtual DOM-like approach
    batchDOMUpdates(updates) {
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        let batchedUpdates = [];
        
        // Separate DOM reads from writes
        const reads = updates.filter(update => update.type === 'read');
        const writes = updates.filter(update => update.type === 'write' || !update.type);
        
        requestAnimationFrame(() => {
            // Perform all reads first
            reads.forEach(update => update.fn());
            
            // Then perform all writes
            writes.forEach(update => {
                if (typeof update === 'function') {
                    update();
                } else {
                    update.fn();
                }
            });
        });
    }

    // New method for efficient DOM manipulation
    updateMultipleElements(updates) {
        const startTime = performance.now();
        
        // Group updates by parent element for better performance
        const updatesByParent = new Map();
        
        Object.entries(updates).forEach(([id, content]) => {
            const element = this.getElement(id);
            if (element) {
                const parent = element.parentElement;
                if (!updatesByParent.has(parent)) {
                    updatesByParent.set(parent, []);
                }
                updatesByParent.get(parent).push({ element, content });
            }
        });
        
        // Apply updates parent by parent
        updatesByParent.forEach((elementUpdates, parent) => {
            // Temporarily hide parent to prevent reflows
            const originalDisplay = parent.style.display;
            parent.style.display = 'none';
            
            elementUpdates.forEach(({ element, content }) => {
                if (typeof content === 'string') {
                    element.textContent = content;
                } else if (content.html) {
                    element.innerHTML = content.html;
                } else if (content.value !== undefined) {
                    element.value = content.value;
                }
            });
            
            // Restore visibility
            parent.style.display = originalDisplay;
        });
        
        const endTime = performance.now();
        if (endTime - startTime > 16) { // More than one frame
            console.warn(`DOM update took ${Math.round(endTime - startTime)}ms`);
        }
    }

    // Intersection Observer for lazy loading
    initIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const element = entry.target;
                        if (element.dataset.lazyLoad) {
                            this.loadLazyContent(element);
                            this.intersectionObserver.unobserve(element);
                        }
                    }
                });
            }, { threshold: 0.1 });
        }
    }

    loadLazyContent(element) {
        // Lazy load heavy content like charts or images
        const type = element.dataset.lazyLoad;
        switch (type) {
            case 'weekly-chart':
                this.updateWeeklyChart();
                break;
            case 'challenges':
                this.updateChallenges();
                break;
        }
        element.removeAttribute('data-lazy-load');
    }

    getToday() {
        return new Date().toISOString().split('T')[0];
    }

    getLast7Days() {
        const days = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push({
                date: date.toISOString().split('T')[0],
                label: dayNames[date.getDay()]
            });
        }
        
        return days;
    }

    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatNumber(num) {
        // Handle undefined, null, or non-numeric values
        if (num === undefined || num === null || isNaN(num)) {
            return '0';
        }
        return Number(num).toLocaleString();
    }

    // Performance monitoring utility
    measurePerformance(name, fn) {
        return (...args) => {
            const start = performance.now();
            const result = fn.apply(this, args);
            const end = performance.now();
            
            if (end - start > 16) { // More than one frame
                console.warn(`${name} took ${Math.round(end - start)}ms`);
            }
            
            return result;
        };
    }

    async loadWeather() {
        try {
            const weatherData = await this.getLiveWeatherData();
            this.updateWeatherDisplay(weatherData);
        } catch (error) {
            console.error('Failed to load live weather:', error);
            try {
                // Try fallback weather data
                const fallbackData = await this.getAlternativeWeatherData();
                this.updateWeatherDisplay(fallbackData);
            } catch (fallbackError) {
                console.error('All weather sources failed:', fallbackError);
                // Final fallback to mock data
                const mockWeatherData = await this.getMockWeatherData();
                this.updateWeatherDisplay(mockWeatherData);
            }
        }
    }

    async getLiveWeatherData() {
        // Using Open-Meteo API for real weather data - free, no API key required
        try {
            // Coordinates for Munich, DE (Microsoft Deutschland HQ, Schwabing)
            const latitude = 48.1351;
            const longitude = 11.5820;
            
            // Fetch weather data from Open-Meteo
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relativehumidity_2m&timezone=Europe/Berlin`);
            
            if (!response.ok) {
                throw new Error('Open-Meteo API failed');
            }
            
            const data = await response.json();
            
            // Parse weather data
            const currentWeather = data.current_weather;
            const tempC = Math.round(currentWeather.temperature * 10) / 10;
            const tempF = Math.round((tempC * 9/5 + 32) * 10) / 10;
            
            // Map weather codes to conditions
            const weatherCondition = this.getWeatherCondition(currentWeather.weathercode);
            
            // Get current hour humidity
            const currentHour = new Date().getHours();
            const humidity = data.hourly.relativehumidity_2m[currentHour] || 70;
            
            return {
                tempC: tempC,
                tempF: tempF,
                condition: weatherCondition,
                humidity: humidity
            };
        } catch (error) {
            console.error('Open-Meteo API failed:', error);
            throw error;
        }
    }

    // Map Open-Meteo weather codes to readable conditions
    getWeatherCondition(weatherCode) {
        const weatherCodes = {
            0: 'clear sky',
            1: 'mainly clear',
            2: 'partly cloudy',
            3: 'overcast',
            45: 'fog',
            48: 'depositing rime fog',
            51: 'light drizzle',
            53: 'moderate drizzle',
            55: 'dense drizzle',
            56: 'light freezing drizzle',
            57: 'dense freezing drizzle',
            61: 'slight rain',
            63: 'moderate rain',
            65: 'heavy rain',
            66: 'light freezing rain',
            67: 'heavy freezing rain',
            71: 'slight snow fall',
            73: 'moderate snow fall',
            75: 'heavy snow fall',
            77: 'snow grains',
            80: 'slight rain showers',
            81: 'moderate rain showers',
            82: 'violent rain showers',
            85: 'slight snow showers',
            86: 'heavy snow showers',
            95: 'thunderstorm',
            96: 'thunderstorm with slight hail',
            99: 'thunderstorm with heavy hail'
        };
        
        return weatherCodes[weatherCode] || 'unknown';
    }

    async getAlternativeWeatherData() {
        console.log('Using fallback weather data');
        
        // Fallback to simulated Munich-like weather (continental, mild)
        const conditions = ['partly cloudy', 'light rain', 'overcast', 'clear sky', 'moderate rain'];
        const baseTemp = 12; // Celsius, typical Munich shoulder-season day
        
        return {
            tempC: Math.round((baseTemp + (Math.random() * 10 - 5)) * 10) / 10,
            tempF: Math.round(((baseTemp + (Math.random() * 10 - 5)) * 9/5 + 32) * 10) / 10,
            condition: conditions[Math.floor(Math.random() * conditions.length)],
            humidity: Math.floor(Math.random() * 30) + 60 // 60-90%
        };
    }

    async getMockWeatherData() {
        // Simulate API call with realistic Munich weather data for August
        return new Promise((resolve) => {
            setTimeout(() => {
                // More realistic August weather for Munich, DE
                const currentHour = new Date().getHours();
                const isEvening = currentHour >= 18 || currentHour <= 6;
                
                // August temperatures in Munich typically range from 15-26°C
                let baseTemp;
                if (currentHour >= 6 && currentHour <= 10) {
                    baseTemp = 16 + Math.random() * 4; // Morning: 16-20°C
                } else if (currentHour >= 11 && currentHour <= 16) {
                    baseTemp = 22 + Math.random() * 4; // Afternoon: 22-26°C
                } else if (currentHour >= 17 && currentHour <= 21) {
                    baseTemp = 20 + Math.random() * 3; // Evening: 20-23°C
                } else {
                    baseTemp = 15 + Math.random() * 3; // Night: 15-18°C
                }
                
                const tempC = Math.round(baseTemp * 10) / 10; // Round to 1 decimal
                const tempF = Math.round((tempC * 9/5 + 32) * 10) / 10;
                
                // More realistic weather conditions for shoulder-season Munich
                const weatherOptions = [
                    { condition: 'partly cloudy', weight: 30 },
                    { condition: 'sunny', weight: 25 },
                    { condition: 'overcast', weight: 20 },
                    { condition: 'light rain', weight: 15 },
                    { condition: 'mostly sunny', weight: 10 }
                ];
                
                // Weighted random selection
                const random = Math.random() * 100;
                let cumulativeWeight = 0;
                let condition = 'partly cloudy';
                
                for (const option of weatherOptions) {
                    cumulativeWeight += option.weight;
                    if (random <= cumulativeWeight) {
                        condition = option.condition;
                        break;
                    }
                }
                
                // Realistic humidity for Munich shoulder-season (typically 60-85%)
                const humidity = Math.floor(Math.random() * 25) + 60;
                
                resolve({
                    tempC,
                    tempF,
                    condition,
                    humidity
                });
            }, 1000);
        });
    }

    updateWeatherDisplay(weatherData) {
        const tempElement = document.getElementById('weatherTemp');
        const adviceElement = document.getElementById('weatherAdvice');
        
        if (!weatherData) {
            tempElement.textContent = 'Weather unavailable';
            adviceElement.textContent = 'Check local forecast';
            return;
        }

        tempElement.textContent = `${weatherData.tempC}°C / ${weatherData.tempF}°F`;
        
        // More accurate clothing advice based on temperature and conditions
        let advice = '';
        
        // Temperature-based clothing advice
        if (weatherData.tempC < 5) {
            advice = '🧥 Heavy jacket needed';
        } else if (weatherData.tempC < 10) {
            advice = '🧥 Warm jacket recommended';
        } else if (weatherData.tempC < 15) {
            advice = '🧥 Light jacket suggested';
        } else if (weatherData.tempC < 20) {
            advice = '👕 Light layers ideal';
        } else if (weatherData.tempC < 25) {
            advice = '👕 Perfect for walking';
        } else if (weatherData.tempC < 30) {
            advice = '☀️ Great weather, stay cool';
        } else {
            advice = '🌡️ Very warm, stay hydrated';
        }
        
        // Weather condition adjustments
        if (weatherData.condition.includes('rain') || weatherData.condition.includes('shower')) {
            advice += ' ☔ Umbrella essential';
        } else if (weatherData.condition.includes('drizzle')) {
            advice += ' ☔ Light rain gear';
        } else if (weatherData.condition.includes('snow')) {
            advice += ' ❄️ Winter gear needed';
        } else if (weatherData.condition.includes('wind')) {
            advice += ' 💨 Windbreaker helpful';
        } else if (weatherData.condition.includes('sunny') && weatherData.tempC > 20) {
            advice += ' 🕶️ Sunglasses recommended';
        }
        
        // Humidity adjustments
        if (weatherData.humidity > 80) {
            advice += ' 💧 High humidity';
        } else if (weatherData.humidity < 30) {
            advice += ' 🏜️ Low humidity';
        }
        
        adviceElement.textContent = advice;
    }

    saveData() {
        // Optimized debounced save with memory cleanup
        this.debouncedSave = this.debouncedSave || this.debounce(() => {
            try {
                // Cleanup old data before saving
                this.cleanupOldData();
                
                const usersData = JSON.stringify(this.users);
                const activitiesData = JSON.stringify(this.recentActivities);
                
                // Check data size before saving
                const totalSize = usersData.length + activitiesData.length;
                if (totalSize > 4 * 1024 * 1024) { // 4MB warning
                    console.warn('Large data size detected, consider cleanup');
                    this.performDataCleanup();
                }
                
                localStorage.setItem('stepTrackerUsers', usersData);
                localStorage.setItem('stepTrackerActivities', activitiesData);
                
            } catch (error) {
                console.error('Failed to save data to localStorage:', error);
                if (error.name === 'QuotaExceededError') {
                    this.handleStorageQuotaExceeded();
                } else {
                    this.showMessage('Failed to save data. Storage may be full.', 'error');
                }
            }
        }, 500, 'save');
        
        this.debouncedSave();
    }

    // New method for data cleanup
    cleanupOldData() {
        // Remove step data older than 30 days
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        const cutoffString = cutoffDate.toISOString().split('T')[0];
        
        this.users.forEach(user => {
            if (user.steps) {
                Object.keys(user.steps).forEach(date => {
                    if (date < cutoffString) {
                        delete user.steps[date];
                    }
                });
            }
        });
        
        // Limit recent activities to 50 items
        if (this.recentActivities.length > 50) {
            this.recentActivities = this.recentActivities.slice(0, 50);
        }
    }

    // New method for handling storage quota exceeded
    handleStorageQuotaExceeded() {
        this.showMessage('Storage is full. Cleaning up old data...', 'warning');
        this.performDataCleanup();
        
        // Try saving again after cleanup
        setTimeout(() => {
            try {
                localStorage.setItem('stepTrackerUsers', JSON.stringify(this.users));
                localStorage.setItem('stepTrackerActivities', JSON.stringify(this.recentActivities));
                this.showMessage('Data saved after cleanup.', 'success');
            } catch (error) {
                this.showMessage('Unable to save data. Please manually clear some browser data.', 'error');
            }
        }, 1000);
    }

    // Enhanced data cleanup
    performDataCleanup() {
        // Keep only last 14 days of step data
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 14);
        const cutoffString = cutoffDate.toISOString().split('T')[0];
        
        this.users.forEach(user => {
            if (user.steps) {
                const newSteps = {};
                let totalSteps = 0;
                
                Object.keys(user.steps).forEach(date => {
                    if (date >= cutoffString) {
                        newSteps[date] = user.steps[date];
                        totalSteps += user.steps[date];
                    }
                });
                
                user.steps = newSteps;
                user.totalSteps = totalSteps;
            }
        });
        
        // Keep only last 20 activities
        this.recentActivities = this.recentActivities.slice(0, 20);
        
        // Clear error logs to free space
        this.clearErrorLogs();
    }

    // Dynamic Content Initialization
    initDynamicContent() {
        this.setRandomGreeting();
        this.setRandomMotivationalPhrase();
    }

    setRandomGreeting() {
        const randomGreeting = this.greetings[Math.floor(Math.random() * this.greetings.length)];
        const greetingElement = document.getElementById('dynamicGreeting');
        if (greetingElement) {
            greetingElement.textContent = randomGreeting.text;
            greetingElement.title = `${randomGreeting.text} (${randomGreeting.lang})`;
        }
    }

    setRandomMotivationalPhrase() {
        const randomPhrase = this.motivationalPhrases[Math.floor(Math.random() * this.motivationalPhrases.length)];
        const phraseElement = document.getElementById('motivationalPhrase');
        if (phraseElement) {
            phraseElement.textContent = randomPhrase;
        }
    }

    // Recent Activities Management - Optimized for performance
    async addRecentActivity(type, message, timestamp) {
        const activity = {
            id: this.generateId(),
            type,
            message,
            timestamp: timestamp.toISOString(),
            user: this.currentUser ? this.currentUser.name : 'Unknown'
        };

        // Non-blocking background sync
        if (this.useSupabase) {
            // Fire and forget - don't await to avoid blocking UI
            SupabaseHelper.addActivity(type, message, timestamp.toISOString())
                .then(result => {
                    localStorage.setItem('stepTrackerUsesSupabase', 'true');
                    localStorage.removeItem('stepTrackerOfflineMode');
                })
                .catch(error => {
                    console.warn('Activity sync failed (background):', error);
                });
        }

        // Always update localStorage (immediate)
        if (!this.recentActivities) this.recentActivities = [];
        this.recentActivities.unshift(activity);
        if (this.recentActivities.length > 100) {
            this.recentActivities = this.recentActivities.slice(0, 100);
        }
        this.saveData();
        
        // Update the UI immediately
        this.updateRecentActivities();
        
        // Notify live display of new activity
        this.notifyLiveDisplayOfUpdate();

        return activity;
    }

    updateRecentActivities() {
        const container = document.getElementById('recentActivityList');
        if (!container) return;

        // Ensure recentActivities is an array
        if (!Array.isArray(this.recentActivities)) {
            this.recentActivities = [];
        }

        if (this.recentActivities.length === 0) {
            container.innerHTML = `
                <div class="no-activity">
                    <i class="fas fa-clock"></i>
                    <span>No recent activity</span>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        
        const recent = this.recentActivities.slice(0, 10);
        recent.forEach(activity => {
            // Validate activity object
            if (!activity || typeof activity !== 'object') return;
            
            const item = document.createElement('div');
            item.className = `activity-item ${activity.type}`;
            
            // Enhanced icon mapping for different activity types
            const getActivityIcon = (type) => {
                switch (type) {
                    case 'steps':
                        return 'fas fa-walking';
                    case 'achievement':
                        return 'fas fa-trophy';
                    case 'user':
                        return 'fas fa-user-plus';
                    case 'team-change':
                        return 'fas fa-users';
                    case 'overachiever':
                        return 'fas fa-star';
                    case 'milestone':
                        return 'fas fa-mountain';
                    case 'debug':
                        return 'fas fa-bug';
                    case 'goal':
                        return 'fas fa-bullseye';
                    default:
                        return 'fas fa-bell';
                }
            };
            
            const icon = getActivityIcon(activity.type);
            const message = activity.message || activity.description || 'Unknown activity';
            const timeAgo = activity.timestamp ? this.formatTimeAgo(new Date(activity.timestamp)) : 'Recently';
            
            item.innerHTML = `
                <i class="${icon}"></i>
                <span>${message}</span>
                <span class="activity-time">${timeAgo}</span>
            `;
            
            container.appendChild(item);
        });
    }

    async refreshRecentActivities() {
        if (!this.useSupabase || !this.currentUser) return;
        
        try {
            console.log('🔄 Refreshing recent activities...');
            const supabaseActivities = await SupabaseHelper.getRecentActivities(50);
            
            // Map Supabase activities to the format expected by the UI
            const remoteActivities = supabaseActivities.map(activity => ({
                id: activity.id,
                type: activity.type,
                message: activity.description, // Map 'description' to 'message'
                timestamp: activity.timestamp,
                user: 'Unknown' // Default since user column doesn't exist in schema
            }));
            
            // Get current local activities
            const localActivities = this.recentActivities || [];
            
            // Merge activities: combine remote and local, avoiding duplicates
            const allActivities = [...remoteActivities];
            
            // Add local activities that aren't already in remote activities
            localActivities.forEach(localActivity => {
                const existsInRemote = remoteActivities.some(remote => 
                    remote.id === localActivity.id ||
                    (remote.timestamp === localActivity.timestamp && remote.message === localActivity.message)
                );
                
                if (!existsInRemote) {
                    allActivities.push(localActivity);
                }
            });
            
            // Sort by timestamp (newest first) and limit to reasonable number
            allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            this.recentActivities = allActivities.slice(0, 100);
            
            // Update the UI
            this.updateRecentActivities();
            
            console.log(`✅ Refreshed activities: ${remoteActivities.length} remote + ${localActivities.length} local = ${this.recentActivities.length} total`);
            
        } catch (error) {
            console.error('❌ Error refreshing recent activities:', error);
        }
    }

    updateActivityTimestamps() {
        const container = document.getElementById('recentActivityList');
        if (!container) return;

        const activityItems = container.querySelectorAll('.activity-item .activity-time');
        const activities = this.recentActivities.slice(0, 10);

        activityItems.forEach((timeElement, index) => {
            if (activities[index] && activities[index].timestamp) {
                const newTimeAgo = this.formatTimeAgo(new Date(activities[index].timestamp));
                if (timeElement.textContent !== newTimeAgo) {
                    timeElement.textContent = newTimeAgo;
                }
            }
        });
    }

    // Live Notifications
    showLiveNotification(type, message, icon) {
        const container = document.getElementById('liveNotifications');
        const notification = document.createElement('div');
        
        notification.className = `live-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="notification-text">${message}</div>
                <div class="notification-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
        `;
        
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutLeft 0.3s ease forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }

    // Challenge completion checking
    checkChallengeCompletions(previousTotal, currentTotal) {
        this.challenges.forEach(challenge => {
            const wasCompleted = previousTotal >= challenge.target;
            const isNowCompleted = currentTotal >= challenge.target;
            
            if (!wasCompleted && isNowCompleted) {
                this.addRecentActivity('achievement', `${this.currentUser.name} completed "${challenge.title}"!`, new Date());
                this.showLiveNotification('achievement', `🏆 ${this.currentUser.name} completed "${challenge.title}"!`, challenge.icon);
                
                // Check if they're an overachiever (significantly exceeded the target)
                const overachievementThreshold = challenge.target * 1.5; // 150% of target
                if (currentTotal >= overachievementThreshold) {
                    setTimeout(() => {
                        this.showOverachieverNotification(challenge, currentTotal);
                    }, 2000); // Show after the completion notification
                }
            }
        });
    }

    // Overachiever detection
    checkOverachieverStatus(stepsAdded) {
        const today = this.getToday();
        const todaySteps = this.currentUser.steps[today] || 0;
        const dailyGoal = this.currentUser.dailyGoal;
        
        // Daily goal overachiever (200% of daily goal)
        const dailyOverachieverThreshold = dailyGoal * 2;
        if (todaySteps >= dailyOverachieverThreshold && !this.currentUser.dailyOverachieverNotified) {
            this.currentUser.dailyOverachieverNotified = true;
            this.addRecentActivity('overachiever', `${this.currentUser.name} is a daily overachiever with ${this.formatNumber(todaySteps)} steps!`, new Date());
            this.showLiveNotification('overachiever', `🌟 ${this.currentUser.name} is a daily overachiever! ${this.formatNumber(todaySteps)} steps!`, 'fas fa-star');
        }
        
        // Single session overachiever (10,000+ steps in one entry)
        if (stepsAdded >= 10000) {
            this.addRecentActivity('overachiever', `${this.currentUser.name} added ${this.formatNumber(stepsAdded)} steps in one go! Overachiever!`, new Date());
            this.showLiveNotification('overachiever', `🚀 ${this.currentUser.name} added ${this.formatNumber(stepsAdded)} steps! Amazing!`, 'fas fa-fire');
        }
        
        // Total steps milestones
        const totalSteps = this.currentUser.totalSteps;
        const milestones = [50000, 100000, 150000, 200000, 250000];
        
        milestones.forEach(milestone => {
            if (totalSteps >= milestone && totalSteps - stepsAdded < milestone) {
                this.addRecentActivity('milestone', `${this.currentUser.name} reached ${this.formatNumber(milestone)} total steps! Incredible dedication!`, new Date());
                this.showLiveNotification('milestone', `🎯 ${this.currentUser.name} reached ${this.formatNumber(milestone)} total steps!`, 'fas fa-mountain');
            }
        });
        
        this.saveData();
    }

    showOverachieverNotification(challenge, currentSteps) {
        const percentage = Math.round((currentSteps / challenge.target) * 100);
        this.addRecentActivity('overachiever', `${this.currentUser.name} is an overachiever! ${percentage}% of "${challenge.title}" target!`, new Date());
        this.showLiveNotification('overachiever', `🌟 ${this.currentUser.name} crushed "${challenge.title}" at ${percentage}%!`, 'fas fa-crown');
    }

    // Helper method to determine if user is an overachiever
    isOverachiever(user, steps) {
        // Check if user has exceeded their daily goal by 150%
        const today = this.getToday();
        const todaySteps = user.steps[today] || 0;
        const dailyGoalThreshold = user.dailyGoal * 1.5;
        
        if (todaySteps >= dailyGoalThreshold) return true;
        
        // Check if user has completed any challenge with 150%+ performance
        const overachieverChallengeThreshold = 1.5;
        for (const challenge of this.challenges) {
            if (user.totalSteps >= challenge.target * overachieverChallengeThreshold) {
                return true;
            }
        }
        
        // Check total step milestones (50k+)
        if (user.totalSteps >= 50000) return true;
        
        return false;
    }

    // Hamburger Menu Functions
    toggleHamburgerMenu() {
        const flyout = document.getElementById('hamburgerFlyout');
        const hamburgerBtn = document.getElementById('hamburgerMenu');
        const isOpen = flyout.classList.contains('open');

        if (isOpen) {
            this.closeHamburgerMenu();
            return;
        }

        flyout.classList.add('open');
        flyout.setAttribute('aria-hidden', 'false');
        hamburgerBtn?.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';

        // store previous focus to restore later
        this._prevFocus = document.activeElement;

        // Focus first focusable element inside flyout
        const focusable = flyout.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
            focusable[0].focus();
        } else {
            flyout.focus();
        }

        // trap focus within flyout
        this._focusTrapHandler = (e) => {
            if (e.key !== 'Tab') return;
            const items = flyout.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (!items.length) return;
            const first = items[0];
            const last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', this._focusTrapHandler);

        // Add mobile touch prevention for better UX
        this.addMobileTouchPrevention();
    }

    closeHamburgerMenu() {
        const flyout = document.getElementById('hamburgerFlyout');
        const hamburgerBtn = document.getElementById('hamburgerMenu');

        flyout.classList.remove('open');
        flyout.setAttribute('aria-hidden', 'true');
        hamburgerBtn?.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = 'auto';

        if (this._focusTrapHandler) {
            document.removeEventListener('keydown', this._focusTrapHandler);
            this._focusTrapHandler = null;
        }

        // restore previous focus
        if (this._prevFocus && typeof this._prevFocus.focus === 'function') {
            this._prevFocus.focus();
        }
        this._prevFocus = null;

        // Remove mobile touch prevention
        this.removeMobileTouchPrevention();
    }

    addMobileTouchPrevention() {
        const handleTouchMove = (e) => {
            const flyout = document.getElementById('hamburgerFlyout');
            const flyoutContent = document.querySelector('.flyout-content');
            
            // Allow scrolling within the flyout content, prevent scrolling outside
            if (!flyoutContent || !flyoutContent.contains(e.target)) {
                e.preventDefault();
            }
        };
        
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        this._touchMoveHandler = handleTouchMove;
    }
    
    removeMobileTouchPrevention() {
        if (this._touchMoveHandler) {
            document.removeEventListener('touchmove', this._touchMoveHandler);
            this._touchMoveHandler = null;
        }
    }

    // Mobile Viewport Optimization
    initMobileViewport() {
        // Set CSS custom property for dynamic viewport height
        const setViewportHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--viewport-height', `${vh * 100}px`);
        };

        // Set initial viewport height
        setViewportHeight();

        // Update on resize and orientation change
        window.addEventListener('resize', setViewportHeight, { passive: true });
        window.addEventListener('orientationchange', () => {
            // Delay to account for browser UI changes
            setTimeout(setViewportHeight, 100);
        }, { passive: true });

        // iOS Safari specific fixes
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            // Prevent zoom on input focus
            const viewportMeta = document.querySelector('meta[name="viewport"]');
            if (viewportMeta) {
                const currentContent = viewportMeta.getAttribute('content');
                if (!currentContent.includes('user-scalable=no')) {
                    viewportMeta.setAttribute('content', currentContent + ', user-scalable=no');
                }
            }
        }
    }

    // FAQ Modal Functions
    showFAQModal() {
        const modal = document.getElementById('faqModal');
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Ensure modal content starts from the top
        setTimeout(() => {
            const modalBody = modal.querySelector('.modal-body');
            if (modalBody) {
                modalBody.scrollTop = 0;
            }
        }, 50);
        
        this.closeHamburgerMenu();
    }

    closeFAQModal() {
        const modal = document.getElementById('faqModal');
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }

    showAddPreviousDayModal() {
        const modal = document.getElementById('addPreviousDayModal');
        const dateInput = document.getElementById('previousDayDate');
        
        // Set max date to yesterday (can't add future or today's steps)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        dateInput.max = yesterday.toISOString().split('T')[0];
        
        // Set default to yesterday
        dateInput.value = yesterday.toISOString().split('T')[0];
        
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        this.closeHamburgerMenu();
        
        // Focus on steps input
        setTimeout(() => {
            document.getElementById('previousDaySteps').focus();
        }, 100);
    }

    closeAddPreviousDayModal() {
        const modal = document.getElementById('addPreviousDayModal');
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        
        // Reset form
        document.getElementById('addPreviousDayForm').reset();
    }

    async addPreviousDaySteps(date, steps) {
        if (!this.currentUser) {
            this.showMessage('Please select a user first.', 'error');
            return;
        }

        try {
            // Validate date is not today or future
            const today = this.getToday();
            const selectedDate = date;
            
            if (selectedDate >= today) {
                this.showMessage('Cannot add steps for today or future dates. Use the main add steps feature for today.', 'error');
                return;
            }

            // Check if steps already exist for this date
            const existingSteps = this.currentUser.steps[selectedDate] || 0;
            if (existingSteps > 0) {
                const confirm = await this.showConfirmDialog(
                    `This date already has ${this.formatNumber(existingSteps)} steps. Do you want to replace them with ${this.formatNumber(steps)} steps?`
                );
                if (!confirm) return;
            }

            // Add steps for the previous date
            this.currentUser.steps[selectedDate] = parseInt(steps);
            
            // Recalculate total steps
            this.currentUser.totalSteps = Object.values(this.currentUser.steps).reduce((sum, daySteps) => sum + daySteps, 0);

            // Update Supabase if enabled
            if (this.useSupabase) {
                await SupabaseHelper.saveSteps(this.currentUser.id, selectedDate, parseInt(steps));
                await SupabaseHelper.updateUserTotalSteps(this.currentUser.id, this.currentUser.totalSteps);
            }

            // Save locally
            this.saveData();
            
            // Add activity
            const formattedDate = this.formatDate(new Date(selectedDate + 'T00:00:00'));
            await this.addRecentActivity('steps', `${this.currentUser.name} added ${this.formatNumber(steps)} steps for ${formattedDate}`, new Date());

            // Update UI
            this.updateUI();
            
            // Close modal and show success message
            this.closeAddPreviousDayModal();
            this.showMessage(`Successfully added ${this.formatNumber(steps)} steps for ${formattedDate}!`, 'success');
            
        } catch (error) {
            console.error('Error adding previous day steps:', error);
            this.showMessage('Failed to add steps. Please try again.', 'error');
        }
    }

    showConfirmDialog(message) {
        return new Promise((resolve) => {
            const confirmed = confirm(message);
            resolve(confirmed);
        });
    }

    // Spotify Playlist Function
    openSpotifyPlaylist() {
        // CxE EMEA Offsite 2026 official playlist
        const playlistUrl = 'https://open.spotify.com/playlist/5ajf3ykIGO6jPqHNx6moOC?si=89f9bc7157424c6a';
        window.open(playlistUrl, '_blank');
        this.showMessage('🎵 Opening CxE EMEA 2026 playlist on Spotify!', 'success');
    }

    openGitHubIssue(type) {
        const repoUrl = 'https://github.com/Manaiakalani/CxEEMEAStepTracker';
        let templateParam = '';
        let title = '';

        if (type === 'bug') {
            title = encodeURIComponent('Bug Report: ');
            templateParam = '?template=bug_report.md';
        } else {
            title = encodeURIComponent('Feature Request: ');
            templateParam = '?template=feature_request.md';
        }

        const url = `${repoUrl}/issues/new${templateParam}&title=${title}`;
        window.open(url, '_blank');
        this.closeHamburgerMenu();
    }

    openLiveDisplay() {
        // Open live display in a new window/tab
        const liveDisplayUrl = './live-display/';
        window.open(liveDisplayUrl, '_blank');
        
        // Show a helpful message
        this.showMessage('🔴 Live Display opened in new tab! Perfect for presentations and big screens.', 'success');
        
        // Optional: Remove active state from all leaderboard buttons since this isn't a period selection
        document.querySelectorAll('.leaderboard-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }

    openAdminLogin() {
        // Check if user is already logged in as admin
        const session = localStorage.getItem('stepTrackerAdminSession');
        if (session) {
            try {
                const adminSession = JSON.parse(session);
                const loginTime = new Date(adminSession.loginTime);
                const now = new Date();
                const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);

                if (hoursSinceLogin < 24) {
                    // Still logged in, go directly to dashboard
                    window.open('./admin-dashboard.html', '_blank');
                    this.showMessage('👑 Admin dashboard opened - you are already signed in!', 'success');
                    this.closeHamburgerMenu();
                    return;
                }
            } catch (e) {
                // Invalid session data, clear it
                localStorage.removeItem('stepTrackerAdminSession');
            }
        }

        // Open admin dashboard directly (no login required)
        window.open('./admin-dashboard.html', '_blank');
        this.showMessage('� Admin dashboard opened in new tab', 'info');
        this.closeHamburgerMenu();
    }

    // Utility function for time formatting
    formatTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    }

    // Dark mode functionality
    initDarkMode() {
        const savedTheme = localStorage.getItem('stepTrackerTheme') || 'light';
        this.setTheme(savedTheme);
    }

    // Initialize UI state
    initUI() {
        // Ensure hamburger menu starts closed
        const flyout = document.getElementById('hamburgerFlyout');
        if (flyout) {
            flyout.classList.remove('open');
        }
        
        // Ensure FAQ modal starts closed
        const modal = document.getElementById('faqModal');
        if (modal) {
            modal.classList.remove('show');
        }
        
        // Ensure body overflow is normal
        document.body.style.overflow = 'auto';
        
        // Initialize cloud sync toggle
        this.initCloudSyncToggle();
    }

    toggleDarkMode() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('stepTrackerTheme', theme);
        
        const menuIcon = document.getElementById('darkModeMenuIcon');
        
        if (theme === 'dark') {
            if (menuIcon) {
                menuIcon.className = 'fas fa-sun';
            }
        } else {
            if (menuIcon) {
                menuIcon.className = 'fas fa-moon';
            }
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.stepTracker = new StepTracker();

    // --- Header backdrop-filter gating on scroll (Item 9) ---
    // Avoid paint cost at the top of the page: only blur when user has scrolled.
    (function initHeaderScrollState() {
        const header = document.querySelector('.header');
        if (!header) return;
        let ticking = false;
        const update = () => {
            ticking = false;
            const scrolled = window.scrollY > 8;
            if (scrolled !== header.classList.contains('is-scrolled')) {
                header.classList.toggle('is-scrolled', scrolled);
            }
        };
        window.addEventListener('scroll', () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(update);
            }
        }, { passive: true });
        update();
    })();

    // --- Mobile header widget collapse (Item 13) ---
    // On narrow viewports, relocate weather + spotify widgets into the hamburger
    // flyout so the header doesn't wrap across two rows.
    (function initMobileHeaderCollapse() {
        const headerStats = document.querySelector('.header .header-stats');
        const flyoutSlot = document.getElementById('flyoutMobileWidgets');
        const spotify = document.getElementById('spotifyWidget');
        const weather = document.getElementById('weatherInfo');
        if (!headerStats || !flyoutSlot || (!spotify && !weather)) return;

        const mql = window.matchMedia('(max-width: 480px)');
        const apply = () => {
            const widgets = [spotify, weather].filter(Boolean);
            if (mql.matches) {
                // Move into flyout slot (appended so hamburger stays leftmost via CSS order)
                flyoutSlot.setAttribute('aria-hidden', 'false');
                widgets.forEach(w => {
                    if (w.parentElement !== flyoutSlot) flyoutSlot.appendChild(w);
                });
            } else {
                flyoutSlot.setAttribute('aria-hidden', 'true');
                // Restore back to header-stats, keeping relative order: spotify, weather
                // Hamburger is last in header-stats, so insert before it.
                const hamburger = document.getElementById('hamburgerMenu');
                widgets.forEach(w => {
                    if (w.parentElement !== headerStats) {
                        if (hamburger && hamburger.parentElement === headerStats) {
                            headerStats.insertBefore(w, hamburger);
                        } else {
                            headerStats.appendChild(w);
                        }
                    }
                });
            }
        };
        apply();
        if (mql.addEventListener) {
            mql.addEventListener('change', apply);
        } else if (mql.addListener) {
            mql.addListener(apply);
        }
    })();

    // Register service worker for offline support
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // Use a relative URL so the SW also registers correctly when this
            // app is served from a sub-path (e.g. GitHub Pages project site).
            navigator.serviceWorker.register('./sw.js')
                .then((registration) => {
                    console.log('Service Worker registered successfully:', registration.scope);
                    
                    // Check for updates every 30 minutes
                    setInterval(() => {
                        registration.update();
                    }, 30 * 60 * 1000);
                    
                    // Listen for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New content is available, show update notification
                                showUpdateNotification();
                            }
                        });
                    });
                })
                .catch((error) => {
                    console.log('Service Worker registration failed:', error);
                });
                
            // Listen for messages from service worker
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'SW_UPDATED') {
                    showUpdateNotification();
                }
            });
        });
    }
    
    // Function to show update notification
    function showUpdateNotification() {
        // Create a subtle notification bar
        const notification = document.createElement('div');
        notification.id = 'update-notification';
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-align: center;
                padding: 12px;
                z-index: 10000;
                font-family: 'Inter', sans-serif;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            ">
                <span>🎉 New version available! </span>
                <button onclick="location.reload()" style="
                    background: rgba(255,255,255,0.2);
                    border: 1px solid rgba(255,255,255,0.3);
                    color: white;
                    padding: 8px 16px;
                    border-radius: 20px;
                    cursor: pointer;
                    margin-left: 10px;
                    font-family: inherit;
                    transition: all 0.3s ease;
                " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
                   onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                    Refresh Now
                </button>
                <button onclick="document.getElementById('update-notification').remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    padding: 8px;
                    cursor: pointer;
                    margin-left: 10px;
                    font-size: 16px;
                " title="Dismiss">×</button>
            </div>
        `;
        
        // Remove any existing notification
        const existing = document.getElementById('update-notification');
        if (existing) existing.remove();
        
        document.body.appendChild(notification);
        
        // Auto-hide after 30 seconds
        setTimeout(() => {
            const notif = document.getElementById('update-notification');
            if (notif) notif.remove();
        }, 30000);
    }
    
    // Utility function to clear cache and reload fresh content
    window.clearCacheAndReload = async function() {
        if ('serviceWorker' in navigator && 'caches' in window) {
            try {
                // Get all cache names
                const cacheNames = await caches.keys();
                
                // Delete all caches
                await Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
                
                // Unregister service worker
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(
                    registrations.map(registration => registration.unregister())
                );
                
                console.log('Cache cleared and service worker unregistered');
                
                // Show success message and reload
                alert('Cache cleared! The page will now reload with fresh content.');
                window.location.reload(true);
                
            } catch (error) {
                console.error('Error clearing cache:', error);
                alert('Failed to clear cache. Please try refreshing manually.');
            }
        } else {
            // Fallback for browsers without service worker support
            window.location.reload(true);
        }
    };
    
    // Add keyboard shortcut Ctrl+Shift+R for force refresh
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
            e.preventDefault();
            window.clearCacheAndReload();
        }
    });
});

// ================================
// Supabase Integration Methods
// ================================

StepTracker.prototype.initSupabaseIntegration = async function() {
    try {
        console.log('🚀 Initializing Supabase integration with Supabase-first architecture...');
        
        // Enforce Supabase-first architecture
        await this.ensureSupabaseFirst();
        
        const useSupabase = localStorage.getItem('stepTrackerUsesSupabase') === 'true';
        
        if (useSupabase) {
            // ALWAYS load data from Supabase as primary source (Supabase-first approach)
            console.log('🌐 Loading users and data from Supabase (primary source)...');
            await this.loadDataFromSupabase();
            
            // Check if we have any local-only data that needs to be synced
            const localUsers = JSON.parse(localStorage.getItem('stepTrackerUsers') || '[]');
            const localActivities = JSON.parse(localStorage.getItem('stepTrackerActivities') || '[]');
            const hasLocalOnlyData = localUsers.length > 0 || localActivities.length > 0;
            
            if (hasLocalOnlyData) {
                console.log('Found local-only data. Offering to sync to Supabase...');
                this.showSupabaseSyncDialog();
            }
            
            // Set up real-time subscriptions
            this.setupRealtimeSubscriptions();
            
            // Start connection monitoring for auto-resync
            this.startConnectionMonitoring();
            
            // Show connection status
            this.showMessage('🌐 Connected to database with real-time sync! 🚀', 'success');
        } else {
            console.log('📱 Supabase unavailable - continuing in offline mode');
            this.showMessage('📱 Working offline - will sync when connection is available', 'info');
            
            // Still start connection monitoring to detect when Supabase becomes available
            this.startConnectionMonitoring();
        }
        
        // Update cloud sync toggle status regardless of connection
        this.updateCloudSyncStatus();
        
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        // Don't disable Supabase completely - keep trying
        console.log('⚠️ Supabase initialization failed, will keep retrying...');
        this.showMessage('⚠️ Connecting to database... Changes will be saved locally until connected.', 'warning');
        
        // Start aggressive retry instead of going offline
        this.startAggressiveConnectionRetry();
    }
};

StepTracker.prototype.showSupabaseSyncDialog = function() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h3><i class="fas fa-cloud-upload-alt"></i> Sync to Cloud</h3>
            <p>We found existing data on this device. Would you like to:</p>
            <div class="sync-options">
                <button class="btn btn-primary" onclick="stepTracker.syncToSupabase()">
                    <i class="fas fa-upload"></i> Upload Local Data to Cloud
                </button>
                <button class="btn btn-secondary" onclick="stepTracker.loadFromSupabase()">
                    <i class="fas fa-download"></i> Download Cloud Data (Replace Local)
                </button>
                <button class="btn btn-tertiary" onclick="stepTracker.continueOffline()">
                    <i class="fas fa-times"></i> Continue Offline
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
};

StepTracker.prototype.syncToSupabase = async function() {
    try {
        this.syncInProgress = true;
        this.showMessage('Syncing data to cloud...', 'info');
        
        // Close the sync dialog
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();
        
        await SupabaseHelper.syncFromLocalStorage(this.users, this.recentActivities);
        
        // Clear local storage flags to indicate we're now using Supabase
        localStorage.setItem('stepTrackerUsesSupabase', 'true');
        
        this.showMessage('Data synced to cloud successfully! 🎉', 'success');
        
        // Update cloud sync toggle status
        this.updateCloudSyncStatus();
        
        // Set up real-time subscriptions
        this.setupRealtimeSubscriptions();
        
    } catch (error) {
        console.error('Sync failed:', error);
        this.showMessage('Sync failed. Continuing offline.', 'error');
    } finally {
        this.syncInProgress = false;
    }
};

StepTracker.prototype.loadFromSupabase = async function() {
    try {
        this.syncInProgress = true;
        this.showMessage('Loading data from cloud...', 'info');
        
        // Close the sync dialog
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();
        
        await this.loadDataFromSupabase();
        
        localStorage.setItem('stepTrackerUsesSupabase', 'true');
        
        this.showMessage('Data loaded from cloud! 🌤️', 'success');
        
        // Update cloud sync toggle status
        this.updateCloudSyncStatus();
        
    } catch (error) {
        console.error('Load failed:', error);
        this.showMessage('Failed to load cloud data. Using local data.', 'error');
    } finally {
        this.syncInProgress = false;
    }
};

// Cloud Sync Management
StepTracker.prototype.initCloudSyncToggle = function() {
    const cloudSyncToggle = document.getElementById('cloudSyncToggle');
    if (!cloudSyncToggle) return;

    // Initialize cloud sync status (always show in flyout menu)
    if (this.useSupabase) {
        this.updateCloudSyncStatus();
    }
};

StepTracker.prototype.updateCloudSyncStatus = function() {
    const cloudSyncToggle = document.getElementById('cloudSyncToggle');
    const cloudSyncStatus = document.getElementById('cloudSyncStatus');
    
    if (!cloudSyncToggle || !cloudSyncStatus) return;

    // Show forced cloud sync status
    if (this.useSupabase && this.isSupabaseForced) {
        cloudSyncToggle.className = 'flyout-item online forced';
        cloudSyncStatus.textContent = 'Cloud (Auto)';
        cloudSyncToggle.title = 'Cloud sync automatically enabled - All data synced to Supabase';
        return;
    }

    const isOnline = localStorage.getItem('stepTrackerUsesSupabase') === 'true';
    const hasPendingChanges = localStorage.getItem('pendingSyncOps') && 
                              JSON.parse(localStorage.getItem('pendingSyncOps')).length > 0;
    const lastModified = this.currentUser ? 
                        localStorage.getItem(`user_${this.currentUser.id}_lastModified`) : null;
    const lastSync = localStorage.getItem('lastCloudSync');
    const needsSync = lastModified && lastSync && new Date(lastModified) > new Date(lastSync);
    
    if (isOnline) {
        if (this.isOfflineMode || hasPendingChanges || needsSync) {
            cloudSyncToggle.className = 'flyout-item online pending';
            cloudSyncStatus.textContent = 'Cloud (Pending)';
            cloudSyncToggle.title = 'Cloud sync enabled - Pending changes will sync when connection is restored';
        } else {
            cloudSyncToggle.className = 'flyout-item online';
            cloudSyncStatus.textContent = 'Cloud';
            cloudSyncToggle.title = 'Cloud sync enabled - Click to go offline';
        }
    } else {
        cloudSyncToggle.className = 'flyout-item offline';
        cloudSyncStatus.textContent = 'Local';
        cloudSyncToggle.title = 'Local storage only - Click to enable cloud sync';
    }
};

StepTracker.prototype.toggleCloudSync = function() {
    // Since Supabase is forced as primary, show info about automatic cloud sync
    if (this.useSupabase && this.isSupabaseForced) {
        this.showMessage('🌐 Auto Cloud Sync\nAll data synced automatically!', 'info');
        return;
    }
    
    const isCurrentlyOnline = localStorage.getItem('stepTrackerUsesSupabase') === 'true';
    
    if (isCurrentlyOnline) {
        // Going offline - only allow if Supabase isn't forced
        this.showConfirmDialog(
            'Switch to Local Storage?',
            'Your data will only be stored on this device. You can switch back to cloud sync later.',
            () => {
                localStorage.setItem('stepTrackerUsesSupabase', 'false');
                this.updateCloudSyncStatus();
                this.showMessage('Switched to local storage mode', 'info');
            }
        );
    } else {
        // Going online
        if (!this.useSupabase) {
            this.showMessage('Cloud sync not available', 'error');
            return;
        }
        
        this.showSupabaseSyncDialog();
    }
};

StepTracker.prototype.showConfirmDialog = function(title, message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="sync-options">
                <button class="btn btn-primary" onclick="this.parentElement.parentElement.parentElement.remove(); (${onConfirm.toString()})()">
                    Confirm
                </button>
                <button class="btn btn-tertiary" onclick="this.parentElement.parentElement.parentElement.remove()">
                    Cancel
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
};

StepTracker.prototype.continueOffline = function() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
    
    this.showMessage('Continuing offline. Your data stays on this device.', 'info');
    localStorage.setItem('stepTrackerUsesSupabase', 'false');
    
    // Update cloud sync toggle status
    this.updateCloudSyncStatus();
};

// Connection Monitoring and Auto-Sync Functions
StepTracker.prototype.startConnectionMonitoring = function() {
    console.log('🔗 Starting connection monitoring for auto-sync');
    
    // Monitor online/offline events
    window.addEventListener('online', () => {
        console.log('🌐 Connection restored - attempting to sync pending changes');
        this.handleConnectionRestored();
    });

    window.addEventListener('offline', () => {
        console.log('📴 Connection lost - switching to offline mode');
        this.handleConnectionLost();
    });

    // Monitor visibility changes to sync when user returns
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.useSupabase && navigator.onLine) {
            console.log('👀 App became visible - checking for pending sync');
            setTimeout(() => this.syncPendingLocalChanges(), 1000);
        }
    });

    // Periodic connection health check (every 2 minutes)
    setInterval(async () => {
        if (this.useSupabase && localStorage.getItem('stepTrackerUsesSupabase') === 'true') {
            await this.checkConnectionHealth();
        }
    }, 2 * 60 * 1000);
};

StepTracker.prototype.handleConnectionRestored = function() {
    this.connectionRetryCount = 0;
    this.isOfflineMode = false;
    
    // Try to sync any pending local changes
    setTimeout(async () => {
        try {
            await this.syncPendingLocalChanges();
            this.showMessage('🌐 Connection restored - syncing data', 'success');
        } catch (error) {
            console.error('Failed to sync after connection restoration:', error);
        }
    }, 1000);
};

StepTracker.prototype.handleConnectionLost = function() {
    this.isOfflineMode = true;
    console.log('📴 Working in offline mode - changes will be queued for sync');
};

StepTracker.prototype.checkConnectionHealth = async function() {
    try {
        // Try a simple Supabase operation to check connectivity
        const { data, error } = await supabase.from('users').select('id').limit(1);
        
        if (error && this.isNetworkError(error)) {
            console.log('⚠️ Connection health check failed:', error.message);
            this.handleSyncFailure('health_check', error);
        } else {
            // Connection is healthy, reset retry count
            this.connectionRetryCount = 0;
            if (this.isOfflineMode) {
                this.handleConnectionRestored();
            }
        }
    } catch (error) {
        console.log('⚠️ Connection health check failed:', error.message);
        this.handleSyncFailure('health_check', error);
    }
};

StepTracker.prototype.syncPendingLocalChanges = async function() {
    try {
        // Check if current user data differs from last known cloud state
        const localUserData = this.currentUser;
        if (!localUserData) return;

        // Get the last sync timestamp
        const lastSyncTime = localStorage.getItem('lastCloudSync');
        const lastModified = localStorage.getItem(`user_${localUserData.id}_lastModified`);
        
        if (!lastSyncTime || !lastModified || new Date(lastModified) > new Date(lastSyncTime)) {
            console.log('🔄 Syncing pending local changes to cloud');
            
            // Update user data in Supabase (name, team, daily_goal, total_steps)
            await SupabaseHelper.updateUser(localUserData.id, {
                name: localUserData.name,
                team: localUserData.team,
                daily_goal: localUserData.dailyGoal,
                total_steps: localUserData.totalSteps
            });
            
            // Update steps for today if changed
            const today = new Date().toISOString().split('T')[0];
            const todaySteps = localUserData.steps[today] || 0;
            if (todaySteps > 0) {
                await SupabaseHelper.addSteps(localUserData.id, today, todaySteps);
            }
            
            // Mark as synced
            localStorage.setItem('lastCloudSync', new Date().toISOString());
            
            // Clear any pending sync operations
            localStorage.removeItem('pendingSyncOps');
            
            // Update cloud sync status to remove pending state
            this.updateCloudSyncStatus();
            
            console.log('✅ Pending changes synced successfully');
        }
    } catch (error) {
        console.error('Failed to sync pending changes:', error);
        this.queueForRetry('sync_pending', error);
    }
};

StepTracker.prototype.handleSyncFailure = function(operation, error) {
    if (!this.syncFailures) this.syncFailures = {};
    if (!this.connectionRetryCount) this.connectionRetryCount = 0;
    
    this.syncFailures[operation] = {
        error: error,
        timestamp: new Date().toISOString(),
        retryCount: (this.syncFailures[operation]?.retryCount || 0) + 1
    };
    
    // If it's a network error, schedule a retry
    if (this.isNetworkError(error)) {
        this.connectionRetryCount++;
        this.scheduleRetrySync(operation);
    }
};

StepTracker.prototype.isNetworkError = function(error) {
    const networkErrors = [
        'NetworkError', 'TimeoutError', 'fetch', 
        'network', 'offline', 'connection', 'ENOTFOUND'
    ];
    
    return networkErrors.some(keyword => 
        error.message?.toLowerCase().includes(keyword.toLowerCase()) ||
        error.name?.toLowerCase().includes(keyword.toLowerCase())
    );
};

StepTracker.prototype.scheduleRetrySync = function(operation) {
    const retryDelay = Math.min(
        Math.pow(2, this.connectionRetryCount) * 1000, // Exponential backoff
        5 * 60 * 1000 // Max 5 minutes
    );
    
    console.log(`⏰ Scheduling retry for ${operation} in ${retryDelay/1000} seconds`);
    
    setTimeout(async () => {
        if (navigator.onLine && this.useSupabase) {
            try {
                switch (operation) {
                    case 'periodic_refresh':
                        await this.loadDataFromSupabase();
                        break;
                    case 'activity_refresh':
                        await this.refreshRecentActivities();
                        break;
                    case 'sync_pending':
                        await this.syncPendingLocalChanges();
                        break;
                    case 'health_check':
                        await this.checkConnectionHealth();
                        break;
                }
                
                // Success - clear the failure record
                if (this.syncFailures[operation]) {
                    delete this.syncFailures[operation];
                }
                console.log(`✅ Retry successful for ${operation}`);
                
            } catch (error) {
                console.error(`❌ Retry failed for ${operation}:`, error);
                this.handleSyncFailure(operation, error);
            }
        }
    }, retryDelay);
};

StepTracker.prototype.queueForRetry = function(operation, error) {
    // Store operation details for retry when connection is restored
    const pendingOps = JSON.parse(localStorage.getItem('pendingSyncOps') || '[]');
    pendingOps.push({
        operation: operation,
        timestamp: new Date().toISOString(),
        data: this.currentUser ? {
            userId: this.currentUser.id,
            userData: this.currentUser
        } : null
    });
    localStorage.setItem('pendingSyncOps', JSON.stringify(pendingOps));
    
    this.handleSyncFailure(operation, error);
};

// Enhanced data modification tracking
StepTracker.prototype.trackDataModification = function(userId) {
    localStorage.setItem(`user_${userId}_lastModified`, new Date().toISOString());
    
    // Update cloud sync status to show pending state
    this.updateCloudSyncStatus();
};

StepTracker.prototype.loadDataFromSupabase = async function() {
    try {
        // Load users
        const supabaseUsers = await SupabaseHelper.getAllUsers();
        this.users = [];
        
        for (const supabaseUser of supabaseUsers) {
            // Convert Supabase user format to local format
            const user = {
                id: supabaseUser.id,
                name: supabaseUser.name,
                team: supabaseUser.team,
                dailyGoal: supabaseUser.daily_goal,
                joinedDate: supabaseUser.joined_date,
                totalSteps: supabaseUser.total_steps,
                lastActiveDate: supabaseUser.last_active_date,
                dailyOverachieverNotified: supabaseUser.daily_overachiever_notified,
                steps: {}
            };
            
            // Load user's daily steps
            const userSteps = await SupabaseHelper.getUserSteps(user.id);
            userSteps.forEach(stepRecord => {
                user.steps[stepRecord.date] = stepRecord.steps;
            });
            
            this.users.push(user);
        }
        
        // Load current user if stored
        const currentUserId = localStorage.getItem('currentStepTrackerUser');
        if (currentUserId) {
            this.currentUser = this.users.find(user => user.id === currentUserId);
        }
        
        // Load activities
        try {
            console.log('🔄 Loading recent activities from Supabase...');
            const supabaseActivities = await SupabaseHelper.getRecentActivities(50);
            
            // Map Supabase activities to the format expected by the UI
            this.recentActivities = supabaseActivities.map(activity => ({
                id: activity.id,
                type: activity.type,
                message: activity.description, // Map 'description' to 'message'
                timestamp: activity.timestamp,
                user: 'Unknown' // Default since user column doesn't exist in schema
            }));
            
            console.log(`✅ Loaded ${this.recentActivities.length} activities from Supabase`);
        } catch (error) {
            console.error('❌ Error loading activities from Supabase:', error);
            // Fallback to empty array if loading fails
            this.recentActivities = [];
        }
        
        // Update UI
        this.updateUI();
        
    } catch (error) {
        console.error('Error loading data from Supabase:', error);
        throw error;
    }
};

StepTracker.prototype.setupRealtimeSubscriptions = function() {
    try {
        // Subscribe to user updates
        const usersSubscription = SupabaseHelper.subscribeToUserUpdates((payload) => {
            console.log('User update received:', payload);
            this.handleRealtimeUserUpdate(payload);
        });
        this.realTimeSubscriptions.push(usersSubscription);
        
        // Subscribe to steps updates  
        const stepsSubscription = SupabaseHelper.subscribeToStepUpdates((payload) => {
            console.log('Steps update received:', payload);
            this.handleRealtimeStepsUpdate(payload);
        });
        this.realTimeSubscriptions.push(stepsSubscription);
        
        // Subscribe to activity updates
        const activitiesSubscription = SupabaseHelper.subscribeToActivityUpdates((payload) => {
            console.log('Activity update received:', payload);
            this.handleRealtimeActivityUpdate(payload);
        });
        this.realTimeSubscriptions.push(activitiesSubscription);
        
    } catch (error) {
        console.error('Error setting up real-time subscriptions:', error);
    }
};

StepTracker.prototype.handleRealtimeUserUpdate = function(payload) {
    const { new: newRecord, old: oldRecord, eventType } = payload;
    
    if (eventType === 'INSERT') {
        // New user joined
        if (!this.users.find(u => u.id === newRecord.id)) {
            const user = {
                id: newRecord.id,
                name: newRecord.name,
                team: newRecord.team,
                dailyGoal: newRecord.daily_goal,
                joinedDate: newRecord.joined_date,
                totalSteps: newRecord.total_steps,
                steps: {}
            };
            this.users.push(user);
            this.updateLeaderboard();
            this.showLiveNotification('user', `${user.name} joined the challenge!`, 'fas fa-user-plus');
        }
    } else if (eventType === 'UPDATE') {
        // User data updated
        const userIndex = this.users.findIndex(u => u.id === newRecord.id);
        if (userIndex !== -1) {
            this.users[userIndex].totalSteps = newRecord.total_steps;
            this.users[userIndex].lastActiveDate = newRecord.last_active_date;
            this.updateLeaderboard();
        }
    }
};

StepTracker.prototype.handleRealtimeStepsUpdate = function(payload) {
    const { new: newRecord, eventType } = payload;
    
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const user = this.users.find(u => u.id === newRecord.user_id);
        if (user && user.id !== this.currentUser?.id) {
            user.steps[newRecord.date] = newRecord.steps;
            this.updateLeaderboard();
            
            // Show notification for other users' steps
            const today = new Date().toISOString().split('T')[0];
            if (newRecord.date === today && eventType === 'INSERT') {
                this.showLiveNotification('steps', `${user.name} added steps!`, 'fas fa-walking');
            }
        }
    }
};

StepTracker.prototype.handleRealtimeActivityUpdate = function(payload) {
    const { new: newRecord, eventType } = payload;
    
    if (eventType === 'INSERT') {
        // Add new activity to the top of the list
        this.recentActivities.unshift({
            type: newRecord.type,
            description: newRecord.description,
            timestamp: newRecord.timestamp
        });
        
        // Keep only the latest 50 activities
        this.recentActivities = this.recentActivities.slice(0, 50);
        
        // Update recent activities display if visible
        this.updateRecentActivitiesDisplay();
    }
};

StepTracker.prototype.setupLiveDisplayCommunication = function() {
    console.log('🔄 Setting up live display communication...');
    
    // Listen for data requests from live display
    window.addEventListener('message', (event) => {
        console.log('📨 Message received:', event.data);
        
        if (event.data && event.data.type === 'REQUEST_STEP_DATA' && event.data.source === 'live-display') {
            console.log('📊 Live display requesting data, responding...');
            
            // Send current data to live display
            const response = {
                type: 'STEP_DATA_RESPONSE',
                users: this.users || [],
                activities: this.recentActivities || [],
                timestamp: new Date().toISOString()
            };
            
            console.log(`📤 Sending to live display: ${response.users.length} users, ${response.activities.length} activities`);
            
            // Send to the requesting window (could be iframe or child window)
            event.source.postMessage(response, event.origin);
        }
    });
    
    console.log('✅ Live display communication setup complete');
};

// Notify live display of data updates
StepTracker.prototype.notifyLiveDisplayOfUpdate = function() {
    console.log('📢 Notifying live display of data update...');
    
    // Send update notification to any live display windows/iframes
    const updateMessage = {
        type: 'DATA_UPDATED',
        users: this.users || [],
        activities: this.recentActivities || [],
        timestamp: new Date().toISOString()
    };
    
    // Try to send to live display via postMessage
    // This will work if live display is in an iframe or child window
    try {
        // Send to all frames
        window.frames.forEach && Array.from(window.frames).forEach(frame => {
            try {
                frame.postMessage(updateMessage, '*');
            } catch (e) {
                // Ignore cross-origin errors
            }
        });
        
        // If this page has a parent (i.e., it's embedded), send to parent
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(updateMessage, '*');
        }
    } catch (error) {
        console.log('📢 Live display notification sent (broadcast mode)');
    }
};

// Enhanced Supabase-first architecture methods
StepTracker.prototype.checkSupabaseConnection = async function() {
    try {
        if (typeof SupabaseHelper === 'undefined') {
            console.log('🔍 SupabaseHelper not available - script may not be loaded');
            return false;
        }
        
        if (!SupabaseHelper.isReady()) {
            console.log('🔍 SupabaseHelper not ready - client not initialized');
            return false;
        }
        
        // Test connection with a simple query
        console.log('🔍 Testing Supabase connection...');
        const users = await SupabaseHelper.getAllUsers();
        console.log(`✅ Supabase connection active - found ${users.length} users`);
        return true;
    } catch (error) {
        console.warn('❌ Supabase connection failed:', error);
        console.warn('- Error name:', error.name);
        console.warn('- Error message:', error.message);
        return false;
    }
};

StepTracker.prototype.ensureSupabaseFirst = async function() {
    console.log('🔄 Enforcing Supabase-first architecture...');
    
    let isConnected = false;
    let attempts = 0;
    const maxAttempts = 3;
    
    // Try multiple times to ensure connection
    while (!isConnected && attempts < maxAttempts) {
        attempts++;
        console.log(`🔍 Connection attempt ${attempts}/${maxAttempts}...`);
        
        try {
            isConnected = await this.checkSupabaseConnection();
            if (isConnected) {
                break;
            } else if (attempts < maxAttempts) {
                // Wait 1 second before retrying
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.warn(`❌ Connection attempt ${attempts} failed:`, error);
            if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    
    if (isConnected) {
        console.log('🌐 Supabase connected - using as primary data source');
        localStorage.setItem('stepTrackerUsesSupabase', 'true');
        localStorage.setItem('stepTrackerLastSupabaseSync', Date.now().toString());
        localStorage.removeItem('stepTrackerOfflineMode'); // Clear any offline mode
        
        // If we were offline and now back online, resync
        const wasOffline = localStorage.getItem('stepTrackerOfflineMode') === 'true';
        if (wasOffline) {
            console.log('🔄 Was offline, now resyncing with Supabase...');
            await this.resyncWithSupabase();
        }
        
        return true;
    } else {
        // Even if connection failed, prefer to keep trying rather than going offline
        console.warn('⚠️ Supabase connection failed after multiple attempts - will keep retrying in background');
        console.warn('📱 Continuing with Supabase enabled, will retry connection automatically');
        
        // Keep Supabase enabled and set up aggressive retry
        localStorage.setItem('stepTrackerUsesSupabase', 'true');
        localStorage.setItem('stepTrackerConnectionRetry', 'true');
        
        // Start background retry instead of going offline
        this.startAggressiveConnectionRetry();
        
        return false;
    }
};

StepTracker.prototype.startAggressiveConnectionRetry = function() {
    console.log('🔄 Starting aggressive connection retry...');
    
    const retryInterval = setInterval(async () => {
        console.log('🔍 Retrying Supabase connection...');
        
        try {
            const isConnected = await this.checkSupabaseConnection();
            if (isConnected) {
                console.log('🎉 Supabase connection restored!');
                localStorage.setItem('stepTrackerUsesSupabase', 'true');
                localStorage.removeItem('stepTrackerOfflineMode');
                localStorage.removeItem('stepTrackerConnectionRetry');
                
                // Clear the retry interval
                clearInterval(retryInterval);
                
                // Resync any pending data
                await this.resyncWithSupabase();
                
                // Show success message
                this.showMessage('🌐 Database connection restored! Syncing data...', 'success');
                
                return;
            }
        } catch (error) {
            console.warn('🔄 Connection retry failed, will try again:', error);
        }
    }, 5000); // Retry every 5 seconds
    
    // Store interval ID so we can clear it later
    this.connectionRetryInterval = retryInterval;
};

StepTracker.prototype.resyncWithSupabase = async function() {
    try {
        console.log('🔄 Starting resync with Supabase...');
        
        // Load fresh data from Supabase
        await this.loadDataFromSupabase();
        
        // Update UI to reflect synced data
        this.updateUI();
        this.updateLeaderboard();
        this.updateRecentActivities();
        this.updateWeeklyChart();
        
        // Store the synced timestamp
        localStorage.setItem('stepTrackerLastSupabaseSync', Date.now().toString());
        
        console.log('✅ Resync completed successfully');
        this.showMessage('✅ Synced with database!', 'success');
        
    } catch (error) {
        console.error('❌ Resync failed:', error);
        this.showMessage('❌ Sync failed - working offline', 'warning');
        // Stay in offline mode if resync fails
        localStorage.setItem('stepTrackerOfflineMode', 'true');
    }
};

// Monitor connection status and auto-resync
StepTracker.prototype.startConnectionMonitoring = function() {
    console.log('🔍 Starting connection monitoring...');
    
    // Check connection every 2 minutes
    setInterval(async () => {
        const isOffline = localStorage.getItem('stepTrackerOfflineMode') === 'true';
        
        if (isOffline) {
            console.log('🔍 In offline mode, checking if connection restored...');
            const isConnected = await this.checkSupabaseConnection();
            
            if (isConnected) {
                console.log('🌐 Connection restored! Resyncing...');
                await this.ensureSupabaseFirst();
            }
        }
    }, 120000); // Check every 2 minutes
    
    // Also monitor online/offline events
    window.addEventListener('online', async () => {
        console.log('🌐 Network came back online');
        await this.ensureSupabaseFirst();
    });
    
    window.addEventListener('offline', () => {
        console.log('📱 Network went offline');
        localStorage.setItem('stepTrackerOfflineMode', 'true');
        localStorage.setItem('stepTrackerUsesSupabase', 'false');
        this.showMessage('📱 Working offline', 'info');
    });
};

StepTracker.prototype.cleanup = function() {
    this.realTimeSubscriptions.forEach(subscription => {
        subscription.unsubscribe();
    });
    this.realTimeSubscriptions = [];
};

// Add cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.stepTracker && window.stepTracker.cleanup) {
        window.stepTracker.cleanup();
    }
});
