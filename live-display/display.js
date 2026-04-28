/**
 * Live Display JavaScript - CxE EMEA Offsite 2026
 * Handles real-time data synchronization with main step tracker app
 */

// --- Debug gate (Item 14) ---
// Verbose console output and the debug test button are only active when the
// page is loaded with ?debug=1. This keeps the kiosk clean in production.
const DEBUG_MODE = (() => {
    try {
        return new URLSearchParams(location.search).get('debug') === '1';
    } catch (_e) {
        return false;
    }
})();
if (!DEBUG_MODE) {
    // Silence the bulk of verbose logging without losing errors/warnings.
    const _noop = () => {};
    console.log = _noop;
    console.debug = _noop;
    console.info = _noop;
    // Hide the footer debug button if present.
    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('debugTestBtn');
        if (btn) btn.style.display = 'none';
    }, { once: true });
} else {
    // Expose for CSS gating of any debug-only UI.
    document.documentElement.setAttribute('data-debug', '1');
}

class LiveDisplay {
    constructor() {
        this.refreshInterval = 30000; // 30 seconds for auto-refresh
        this.timeUpdateInterval = 60000; // 1 minute for time updates (less distracting)
        this.refreshTimer = null;
        this.timeUpdateTimer = null;
        this.lastUpdateTime = null;
        this.lastRefreshTime = null; // For validating refresh intervals
        this.isInitialized = false;
        this.activityFeed = [];
        this.maxActivityItems = 20;
        this.lastDataHash = null; // For detecting actual data changes
        
        this.init();
    }

    // Helper function to format time without seconds
    formatTimeWithoutSeconds(date) {
        return date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
        });
    }

    async init() {
        try {
            console.log('🚀 Initializing Live Display...');
            console.log('🔍 Supabase Configuration Check:');
            console.log('- SUPABASE_URL:', typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : 'undefined');
            console.log('- SupabaseHelper:', typeof SupabaseHelper !== 'undefined' ? 'available' : 'undefined');
            console.log('- Supabase client:', typeof window.supabase !== 'undefined' ? 'available' : 'undefined');
            
            this.showLoading();
            
            // Enforce Supabase-first architecture
            await this.ensureSupabaseFirst();
            
            await this.loadData();
            this.setupEventListeners();
            this.startAutoRefresh();
            this.startTimeUpdates();
            
            // Start connection monitoring for auto-resync
            this.startConnectionMonitoring();
            
            this.hideLoading();
            this.isInitialized = true;
            
            console.log('✅ Live Display initialized successfully with Supabase-first architecture');
            
            // Add debug functions to window for console access
            window.liveDisplayDebug = {
                checkTimer: () => {
                    const now = Date.now();
                    const status = {
                        timerActive: !!this.refreshTimer,
                        timerId: this.refreshTimer,
                        refreshCount: this.refreshCount || 0,
                        autoRefreshStartTime: this.autoRefreshStartTime,
                        timeSinceStart: this.autoRefreshStartTime ? 
                            `${Math.floor((now - this.autoRefreshStartTime) / 1000)}s` : 'Unknown',
                        lastUpdateTime: this.lastUpdateTime ? this.formatTimeWithoutSeconds(this.lastUpdateTime) : 'Never',
                        lastRefreshTime: this.lastRefreshTime ? this.formatTimeWithoutSeconds(this.lastRefreshTime) : 'Never',
                        timeSinceLastRefresh: this.lastRefreshTime ? 
                            `${Math.floor((now - this.lastRefreshTime.getTime()) / 1000)}s ago` : 'Never',
                        nextRefreshIn: this.lastRefreshTime ? 
                            `${Math.max(0, 30 - Math.floor((now - this.lastRefreshTime.getTime()) / 1000))}s` : 'Unknown',
                        pageVisible: !document.hidden,
                        refreshInterval: `${this.refreshInterval}ms (${this.refreshInterval/1000}s)`
                    };
                    console.log('🔍 Timer Status:', status);
                    return status;
                },
                restartTimer: () => {
                    console.log('🔄 Manually restarting auto-refresh timer');
                    this.startAutoRefresh();
                },
                triggerRefresh: () => {
                    console.log('🔄 Manually triggering refresh');
                    this.loadData();
                },
                testTimer: () => {
                    console.log('🧪 Testing timer with 5-second interval for diagnostics');
                    const testTimer = setInterval(() => {
                        console.log('🧪 Test timer tick:', new Date().toLocaleTimeString());
                    }, 5000);
                    setTimeout(() => {
                        clearInterval(testTimer);
                        console.log('🧪 Test timer completed');
                    }, 16000); // Run for ~3 ticks
                }
            };
            
        } catch (error) {
            console.error('❌ Failed to initialize live display:', error);
            this.showError('Failed to initialize display', error.message);
        }
    }

    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    showError(title, message) {
        const modal = document.getElementById('errorModal');
        const titleEl = modal?.querySelector('h3');
        const messageEl = modal?.querySelector('p');
        
        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        if (modal) modal.classList.add('show');
    }

    hideError() {
        const modal = document.getElementById('errorModal');
        if (modal) modal.classList.remove('show');
    }

    setupEventListeners() {
        const manualRefreshBtn = document.getElementById('manualRefreshBtn');
        if (manualRefreshBtn) {
            manualRefreshBtn.addEventListener('click', () => {
                console.log('🔄 Manual refresh triggered');
                this.manualRefresh();
            });
        }

        // Listen for data updates from main app
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'DATA_UPDATED') {
                console.log('📨 Received data update notification from main app');
                console.log(`📊 Update contains: ${event.data.users?.length || 0} users, ${event.data.activities?.length || 0} activities`);
                
                // Refresh the display with new data
                this.loadData().catch(error => {
                    console.error('❌ Failed to refresh data after update notification:', error);
                });
            }
        });

        // Debug test button
        const debugTestBtn = document.getElementById('debugTestBtn');
        if (debugTestBtn) {
            debugTestBtn.addEventListener('click', async () => {
                console.log('🧪 DEBUG TEST BUTTON CLICKED');
                alert('Debug test started! Check console for details.');
                
                try {
                    // Test 1: Check Supabase connection
                    console.log('🧪 TEST 1: Supabase connection');
                    const users = await SupabaseHelper.getAllUsers();
                    const activities = await SupabaseHelper.getRecentActivities();
                    console.log(`Found ${users.length} users, ${activities.length} activities`);
                    
                    // Test 2: If no activities, create some sample ones
                    if (activities.length === 0) {
                        console.log('🧪 TEST 2: Creating sample activities for testing');
                        await SupabaseHelper.addActivity(
                            'steps', 
                            `Sample activity: User logged 2,500 steps`, 
                            new Date().toISOString()
                        );
                        await SupabaseHelper.addActivity(
                            'goal', 
                            `Sample activity: Daily goal achieved!`, 
                            new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5 minutes ago
                        );
                        await SupabaseHelper.addActivity(
                            'steps', 
                            `Sample activity: User logged 1,800 steps`, 
                            new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 minutes ago
                        );
                        console.log('✅ Sample activities created');
                    } else {
                        // Test 3: Create a test activity
                        console.log('🧪 TEST 3: Creating new test activity');
                        const testActivity = await SupabaseHelper.addActivity(
                            'debug', 
                            `Debug test at ${new Date().toLocaleString()} - Auto-refresh should show this!`, 
                            new Date().toISOString()
                        );
                        console.log('Test activity created:', testActivity);
                    }
                    
                    // Test 4: Check localStorage
                    console.log('🧪 TEST 4: LocalStorage check');
                    const localActivities = JSON.parse(localStorage.getItem('stepTrackerActivities') || '[]');
                    console.log(`LocalStorage has ${localActivities.length} activities`);
                    
                    // Test 5: Reload data immediately
                    console.log('🧪 TEST 5: Reloading display data');
                    await this.loadData();
                    
                    alert('Debug test completed! New activities should appear in the feed. Auto-refresh will continue every 30 seconds.');
                    
                } catch (error) {
                    console.error('Debug test failed:', error);
                    alert('Debug test failed: ' + error.message);
                }
            });
        }

        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.hideError();
                this.loadData();
            });
        }

        // Handle window focus for auto-refresh
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('📱 Window became visible, checking auto-refresh status');
                console.log('📱 Timer status:', {
                    timerActive: !!this.refreshTimer,
                    timerId: this.refreshTimer,
                    refreshCount: this.refreshCount || 0,
                    timeSinceStart: this.autoRefreshStartTime ? 
                        `${Math.floor((Date.now() - this.autoRefreshStartTime) / 1000)}s` : 'Unknown'
                });
                
                // Always refresh data when coming back to focus
                this.loadData();
                
                // Only restart timer if it's not running
                if (!this.refreshTimer) {
                    console.log('📱 Timer was stopped, restarting auto-refresh');
                    this.startAutoRefresh();
                } else {
                    console.log('📱 Timer still active, continuing normal schedule');
                }
            } else {
                console.log('📱 Window became hidden');
                console.log('📱 Timer status before hiding:', {
                    timerActive: !!this.refreshTimer,
                    timerId: this.refreshTimer,
                    refreshCount: this.refreshCount || 0
                });
                // Note: We don't stop the timer when hidden, browsers handle this automatically
            }
        });
        
        // Debug functions are now completely disabled to prevent test activities
        /*
        // Debug: Add a test button for Supabase connection
        console.log('🧪 Adding debug test for Supabase');
        const testSupabaseConnection = async () => {
            console.log('🧪 TESTING SUPABASE CONNECTION...');
            try {
                if (typeof SupabaseHelper !== 'undefined') {
                    console.log('✅ SupabaseHelper is available');
                    const users = await SupabaseHelper.getAllUsers();
                    const activities = await SupabaseHelper.getRecentActivities();
                    console.log(`📊 Found ${users.length} users and ${activities.length} activities in Supabase`);
                    
                    console.log('🔍 Current activities in detail:');
                    activities.forEach((act, i) => {
                        console.log(`   ${i}: ${act.type} - "${act.description}" - ${act.timestamp}`);
                    });
                    
                    // Try to add a test activity (DISABLED - no longer needed)
                    // const testActivity = await SupabaseHelper.addActivity('test', 'Live display connection test - ' + new Date().toLocaleTimeString(), new Date().toISOString(), 'Live Display Test');
                    // console.log('✅ Successfully added test activity:', testActivity);
                    
                    // Wait a moment then refresh the display (DISABLED since test activity is disabled)
                    // setTimeout(() => {
                    //     console.log('🔄 Refreshing display after test activity...');
                    //     this.loadData();
                    // }, 1000);
                } else {
                    console.error('❌ SupabaseHelper not available');
                }
            } catch (error) {
                console.error('❌ Supabase connection test failed:', error);
            }
        };
        
        // Run test after 2 seconds, then every 30 seconds for debugging (DISABLED)
        // setTimeout(testSupabaseConnection, 2000);
        */
        
        /*
        // DEBUG: Also create a test user and activity to verify data flow
        const createTestData = async () => {
            try {
                console.log('🧪 CREATING TEST DATA...');
                if (typeof SupabaseHelper !== 'undefined') {
                    // Create a test user if none exist
                    const existingUsers = await SupabaseHelper.getAllUsers();
                    if (existingUsers.length === 0) {
                        console.log('🧪 No users found, creating test user...');
                        await SupabaseHelper.registerUser('Test User', 'Test Team', 10000);
                    }
                    
                    // Always create a test activity (DISABLED - no longer needed)
                    // const testMessage = `Test activity from live display at ${new Date().toLocaleTimeString()}`;
                    // await SupabaseHelper.addActivity('test', testMessage, new Date().toISOString(), 'Live Display Debug');
                    // console.log('✅ Test data created successfully');
                    
                    // Force reload after creating test data (DISABLED since test activity is disabled)
                    // setTimeout(() => this.loadData(), 1000);
                }
            } catch (error) {
                console.error('❌ Failed to create test data:', error);
            }
        };
        
        // Create test data after 5 seconds for debugging (DISABLED)
        // setTimeout(createTestData, 5000);
        */
    }

    async retry() {
        try {
            this.showLoading();
            await this.loadData();
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError('Retry Failed', error.message);
        }
    }

    async manualRefresh() {
        const refreshBtn = document.getElementById('manualRefreshBtn');
        const refreshIcon = refreshBtn?.querySelector('i');
        
        try {
            // Add visual feedback
            if (refreshBtn) {
                refreshBtn.classList.add('refreshing');
                refreshBtn.disabled = true;
            }
            
            console.log('Manual refresh triggered...');
            await this.loadData();
            
            // Only restart auto-refresh timer if it's not already running
            if (!this.refreshTimer) {
                console.log('🔄 Auto-refresh timer was stopped, restarting after manual refresh');
                this.startAutoRefresh();
            } else {
                console.log('🔄 Auto-refresh timer still active, no restart needed');
            }
            
            // Show brief success feedback
            if (refreshBtn) {
                refreshBtn.innerHTML = '<i class="fas fa-check"></i> Refreshed!';
                setTimeout(() => {
                    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Now';
                }, 1000);
            }
            
        } catch (error) {
            console.error('Manual refresh failed:', error);
            if (refreshBtn) {
                refreshBtn.innerHTML = '<i class="fas fa-exclamation"></i> Error';
                setTimeout(() => {
                    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Now';
                }, 2000);
            }
        } finally {
            if (refreshBtn) {
                refreshBtn.classList.remove('refreshing');
                refreshBtn.disabled = false;
            }
        }
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
        console.log(`🔄 Starting auto-refresh with interval: ${this.refreshInterval}ms (${this.refreshInterval/1000} seconds)`);
        console.log(`⏰ Next refresh scheduled for: ${this.formatTimeWithoutSeconds(new Date(Date.now() + this.refreshInterval))}`);
        
        // Store current time as start time for debugging
        this.autoRefreshStartTime = Date.now();
        this.refreshCount = 0;
        
        this.refreshTimer = setInterval(() => {
            const now = new Date();
            this.refreshCount++;
            console.log(`🔄 Auto-refresh triggered #${this.refreshCount} at: ${this.formatTimeWithoutSeconds(now)}`);
            console.log(`⏰ Next refresh scheduled for: ${this.formatTimeWithoutSeconds(new Date(Date.now() + this.refreshInterval))}`);
            
            // Validation: Log actual interval timing
            if (this.lastRefreshTime) {
                const actualInterval = now.getTime() - this.lastRefreshTime.getTime();
                const intervalDiff = Math.abs(actualInterval - this.refreshInterval);
                console.log(`✅ Refresh interval validation: Expected ${this.refreshInterval}ms, Actual ${actualInterval}ms (diff: ${intervalDiff}ms)`);
                
                if (intervalDiff > 5000) { // More than 5 seconds off
                    console.warn('⚠️ Timer drift detected! Restarting auto-refresh...');
                    this.startAutoRefresh();
                    return;
                }
            }
            this.lastRefreshTime = now;
            
            // Call loadData with error handling
            try {
                console.log('🔄 Calling loadData() from auto-refresh...');
                this.loadData().catch(error => {
                    console.error('❌ Error in auto-refresh loadData:', error);
                });
            } catch (error) {
                console.error('❌ Synchronous error in auto-refresh:', error);
            }
        }, this.refreshInterval);
        console.log('✅ Auto-refresh timer started with ID:', this.refreshTimer);
        
        // Add immediate test to confirm timer is working (10 seconds)
        setTimeout(() => {
            console.log('🧪 Auto-refresh 10-second test: Timer should be active');
            console.log('🧪 Timer status:', {
                timerActive: !!this.refreshTimer,
                timerId: this.refreshTimer,
                pageVisible: !document.hidden,
                timeUntilNextRefresh: this.lastRefreshTime ? 
                    `${30 - Math.floor((Date.now() - this.lastRefreshTime.getTime()) / 1000)}s` : 'Not started yet'
            });
        }, 10000); // Test after 10 seconds
        
        // Add test at 25 seconds (5 seconds before next refresh)
        setTimeout(() => {
            console.log('🧪 Auto-refresh 25-second test: Next refresh in ~5 seconds');
            console.log('🧪 Pre-refresh status:', {
                timerActive: !!this.refreshTimer,
                timerId: this.refreshTimer,
                timeSinceLastRefresh: this.lastRefreshTime ? 
                    `${Math.floor((Date.now() - this.lastRefreshTime.getTime()) / 1000)}s` : 'Never'
            });
        }, 25000); // Test after 25 seconds
        
        // Add test at 35 seconds (5 seconds after refresh should have happened)
        setTimeout(() => {
            console.log('🧪 Auto-refresh 35-second test: Checking if refresh occurred');
            const wasRefreshTriggered = this.lastRefreshTime && 
                (Date.now() - this.lastRefreshTime.getTime()) < 10000; // Within last 10 seconds
            
            console.log('🧪 Post-refresh check:', {
                refreshWasTriggered: wasRefreshTriggered,
                timerActive: !!this.refreshTimer,
                timeSinceLastRefresh: this.lastRefreshTime ? 
                    `${Math.floor((Date.now() - this.lastRefreshTime.getTime()) / 1000)}s` : 'Never',
                expectedRefreshTime: this.formatTimeWithoutSeconds(new Date(Date.now() - 5000))
            });
            
            if (!wasRefreshTriggered) {
                console.error('❌ AUTO-REFRESH FAILED! Timer did not execute after 30 seconds');
                console.log('🔧 Attempting to restart timer...');
                this.startAutoRefresh();
            }
        }, 35000); // Test after 35 seconds
        
        // Add heartbeat check every 60 seconds to verify refresh is still working
        setInterval(() => {
            const timeSinceLastUpdate = this.lastUpdateTime ? 
                (Date.now() - this.lastUpdateTime.getTime()) / 1000 : 'never';
            console.log('💗 Auto-refresh heartbeat:', {
                timerActive: !!this.refreshTimer,
                timerId: this.refreshTimer,
                lastUpdate: this.lastUpdateTime ? this.formatTimeWithoutSeconds(this.lastUpdateTime) : 'never',
                timeSinceLastUpdate: typeof timeSinceLastUpdate === 'number' ? 
                    `${Math.round(timeSinceLastUpdate)}s ago` : timeSinceLastUpdate,
                pageVisible: !document.hidden
            });
            
            // If more than 2 minutes since last update and page is visible, restart
            if (typeof timeSinceLastUpdate === 'number' && timeSinceLastUpdate > 120 && !document.hidden) {
                console.warn('⚠️ Auto-refresh seems stuck, restarting...');
                this.startAutoRefresh();
            }
        }, 60000); // Check every minute
    }

    startTimeUpdates() {
        // No longer needed - we'll update time only when data refreshes
        // This removes the constant 1-second time animation that was distracting
        this.updateTimeDisplay(); // Initial update only
    }

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    stopTimeUpdates() {
        if (this.timeUpdateTimer) {
            clearInterval(this.timeUpdateTimer);
            this.timeUpdateTimer = null;
        }
    }

    updateTimeDisplay() {
        // Show the last data refresh time instead of constantly updating current time
        const element = document.getElementById('lastUpdate');
        if (!element) return;

        // Hide the clock until we have a real timestamp to render. Avoids the
        // brief "--:--" flash on kiosk load that makes the display look broken.
        if (!this.lastUpdateTime) {
            element.setAttribute('data-clock-ready', 'false');
            return;
        }

        const timeString = this.formatTimeWithoutSeconds(this.lastUpdateTime);
        requestAnimationFrame(() => {
            element.textContent = timeString;
            if (element.getAttribute('data-clock-ready') !== 'true') {
                element.setAttribute('data-clock-ready', 'true');
            }
        });
    }

    async loadData() {
        try {
            console.log('🔄 Loading data at:', this.formatTimeWithoutSeconds(new Date()));
            console.log('🔄 Auto-refresh interval: 30 seconds');
            this.showRefreshIndicators();
            
            const data = await this.getMainAppData();
            
            if (data) {
                console.log('📊 Data loaded successfully:', {
                    totalSteps: data.stats.totalSteps,
                    totalParticipants: data.stats.totalParticipants,
                    individualLeaderboard: data.leaderboards.individual.length,
                    teamLeaderboard: data.leaderboards.team.length,
                    activities: data.activities.length
                });
                
                console.log('📊 First few activities:', data.activities.slice(0, 3));
                
                const dataHash = this.createDataHash(data);
                console.log('🔍 Current dataHash:', dataHash);
                console.log('🔍 Last dataHash:', this.lastDataHash);
                console.log('🔍 Hashes equal:', dataHash === this.lastDataHash);
                console.log('🔍 Will update display:', dataHash !== this.lastDataHash || this.lastDataHash === null || !this.isInitialized);
                
                // Force update on first load or when data actually changes
                if (dataHash !== this.lastDataHash || this.lastDataHash === null || !this.isInitialized) {
                    console.log('✅ Data changed or initial load, updating display');
                    console.log('Raw data.leaderboards:', data.leaderboards);
                    console.log('Individual leaderboard data:', data.leaderboards?.individual);
                    console.log('Team leaderboard data:', data.leaderboards?.team);
                    
                    this.updateStats(data.stats);
                    this.updateLeaderboards(data.leaderboards);
                    this.updateWeeklyChampion(data.weeklyChampion);
                    this.updateActivityFeed(data.activities);
                    this.lastDataHash = dataHash;
                    this.lastUpdateTime = new Date();
                    this.updateTimeDisplay(); // Update the time display with refresh time
                    this.isInitialized = true; // Mark as initialized after first successful update
                } else {
                    console.log('⚠️ No data changes detected - but updating connection status');
                }
                
                // Always update connection status even if data hasn't changed
                this.updateConnectionStatus(true, data.stats.totalParticipants);
            } else {
                // Show empty state when no data is available
                console.warn('No data available from main step tracker application');
                this.updateStats({
                    totalSteps: 0,
                    totalParticipants: 0,
                    activeTeams: 0,
                    averageSteps: 0,
                    completedChallenges: 0
                });
                this.updateLeaderboards({ individual: [], team: [] });
                this.updateWeeklyChampion(null);
                this.updateActivityFeed([]);
                
                // Update connection status
                this.updateConnectionStatus(false, 0);
            }
            
            this.hideRefreshIndicators();
            
        } catch (error) {
            this.hideRefreshIndicators();
            console.error('Failed to load data:', error);
            this.updateConnectionStatus(false, 0);
        }
    }

    updateConnectionStatus(connected, participantCount) {
        const statusElement = document.querySelector('.live-indicator');
        if (!statusElement) return;
        
        if (connected && participantCount > 0) {
            statusElement.classList.add('connected');
            statusElement.classList.remove('no-data');
            statusElement.innerHTML = `
                <div class="pulse-dot"></div>
                LIVE (${participantCount} users)
            `;
        } else if (connected && participantCount === 0) {
            statusElement.classList.remove('connected');
            statusElement.classList.add('no-data');
            statusElement.innerHTML = `
                <div class="pulse-dot"></div>
                READY (0 users)
            `;
        } else {
            statusElement.classList.remove('connected');
            statusElement.classList.add('no-data');
            statusElement.innerHTML = `
                <div class="pulse-dot"></div>
                WAITING
            `;
        }
    }

    createDataHash(data) {
        const hashData = {
            stats: data.stats,
            individualCount: data.leaderboards.individual.length,
            teamCount: data.leaderboards.team.length,
            firstIndividual: data.leaderboards.individual[0]?.steps || 0,
            firstTeam: data.leaderboards.team[0]?.steps || 0
        };
        return JSON.stringify(hashData);
    }

    async getMainAppData() {
        console.log('=== getMainAppData called ===');
        
        try {
            // ENFORCE Supabase-first architecture with connection detection
            const supabaseConfigured = typeof SupabaseHelper !== 'undefined' && 
                                      typeof SUPABASE_URL !== 'undefined' && 
                                      SUPABASE_URL !== 'YOUR_SUPABASE_PROJECT_URL';
            
            const isOnline = navigator.onLine;
            
            console.log('🔍 Connection and configuration check:');
            console.log('- SupabaseHelper available:', typeof SupabaseHelper !== 'undefined');
            console.log('- SUPABASE_URL defined:', typeof SUPABASE_URL !== 'undefined');
            console.log('- SUPABASE_URL configured:', SUPABASE_URL !== 'YOUR_SUPABASE_PROJECT_URL');
            console.log('- Browser online status:', isOnline);
            console.log('- Supabase configured:', supabaseConfigured);
            
            let users = [];
            let activities = [];
            let dataSource = 'unknown';
            
            // Always try Supabase FIRST if configured and online
            if (supabaseConfigured && isOnline) {
                console.log('🌐 PRIORITIZING Supabase (cloud-first approach)');
                
                try {
                    // Test Supabase connectivity with a simple query
                    console.log('🧪 Testing Supabase connectivity...');
                    await this.testSupabaseConnection();
                    console.log('✅ Connection test passed, proceeding with data loading...');
                    
                    // Load from Supabase - this is our PRIMARY data source
                    console.log('☁️ Loading data from Supabase (PRIMARY source)');
                    console.log('📋 Step 1: Getting all users...');
                    const supabaseUsers = await SupabaseHelper.getAllUsers();
                    console.log(`✅ Step 1 complete: Got ${supabaseUsers.length} users from Supabase`);
                    
                    // Get activities using merged approach but prioritize Supabase
                    console.log('📋 Step 2: Getting merged activities...');
                    activities = await this.getMergedActivitiesCloudFirst();
                    console.log(`✅ Step 2 complete: Got ${activities.length} activities`);
                    
                    console.log(`✅ SUCCESS: Loaded from Supabase - ${supabaseUsers.length} users, ${activities.length} activities`);
                    
                    // Mark as using Supabase successfully
                    localStorage.setItem('stepTrackerUsesSupabase', 'true');
                    localStorage.removeItem('stepTrackerOfflineMode');
                    
                    dataSource = 'supabase-primary';
                    
                    console.log(`📊 Raw Supabase users (${supabaseUsers.length}):`, supabaseUsers);
                    console.log(`📊 Raw Supabase activities (${activities.length}):`, activities);
                    console.log('📊 Detailed activity inspection:');
                    activities.forEach((activity, i) => {
                        console.log(`   Activity ${i}:`, {
                            id: activity.id,
                            type: activity.type,
                            description: activity.description,
                            message: activity.message,
                            timestamp: activity.timestamp,
                            created_at: activity.created_at,
                            user: activity.user
                        });
                    });
                    
                    // Test Supabase connection and data availability
                    if (supabaseUsers.length === 0 && activities.length === 0) {
                        console.warn('⚠️ No data in Supabase tables - might be a configuration issue');
                        
                        // Test if we can write data to force creation (DISABLED - no longer needed)
                        // try {
                        //     console.log('🧪 Testing Supabase write capability...');
                        //     const testActivity = await SupabaseHelper.addActivity('test', 'Live display connectivity test', new Date().toISOString());
                        //     console.log('✅ Supabase write test successful:', testActivity);
                        // } catch (writeError) {
                        //     console.error('❌ Supabase write test failed:', writeError);
                        // }
                    }
                    
                    // Convert Supabase users to the format expected by the display
                    console.log('📋 Step 3: Converting users to display format...');
                    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
                    console.log('📅 Today date for querying:', today);
                    
                    users = await Promise.all(supabaseUsers.map(async (supabaseUser, index) => {
                        console.log(`👤 Processing user ${index + 1}/${supabaseUsers.length}: ${supabaseUser.name}`);
                        // Get today's steps for this user
                        try {
                            const dailySteps = await SupabaseHelper.getUserSteps(supabaseUser.id, today, today);
                            const todaySteps = dailySteps.length > 0 ? dailySteps[0].steps : 0;
                            
                            console.log(`👤 User ${supabaseUser.name} has ${todaySteps} steps today from daily_steps table`);
                            console.log(`   - Daily steps query result:`, dailySteps);
                            
                            // Convert to localStorage-compatible format
                            // IMPORTANT: Use both date formats for compatibility
                            const todayISO = new Date().toISOString().split('T')[0]; // YYYY-MM-DD (main app format)
                            const todayString = new Date().toDateString(); // "Tue Sep 24 2025" (legacy format)
                            return {
                                id: supabaseUser.id,
                                name: supabaseUser.name,
                                team: supabaseUser.team,
                                dailyGoal: supabaseUser.daily_goal,
                                totalSteps: supabaseUser.total_steps || 0,
                                steps: {
                                    [todayISO]: todaySteps,      // Main app compatibility
                                    [todayString]: todaySteps    // Legacy compatibility
                                }
                            };
                        } catch (stepError) {
                            console.warn(`❌ Failed to load steps for user ${supabaseUser.name}:`, stepError);
                            // Return user with 0 steps if step loading fails
                            const todayISO = new Date().toISOString().split('T')[0]; // YYYY-MM-DD (main app format)
                            const todayString = new Date().toDateString(); // "Tue Sep 24 2025" (legacy format)
                            return {
                                id: supabaseUser.id,
                                name: supabaseUser.name,
                                team: supabaseUser.team,
                                dailyGoal: supabaseUser.daily_goal,
                                totalSteps: supabaseUser.total_steps || 0,
                                steps: {
                                    [todayISO]: 0,      // Main app compatibility
                                    [todayString]: 0    // Legacy compatibility
                                }
                            };
                        }
                    }));
                
                console.log('✅ Step 3 complete: User conversion finished');
                console.log(`Converted ${users.length} users for display:`, users);
                console.log(`✅ Successfully loaded ${users.length} users and ${activities.length} activities from Supabase`);
                
                                } catch (supabaseError) {
                    console.error('❌ Detailed Supabase error:', supabaseError);
                    console.error('❌ Error stack:', supabaseError.stack);
                    console.error('❌ Error occurred in Supabase data loading process');
                    console.warn('❌ Supabase connection failed, falling back to localStorage:', supabaseError);
                    console.log('📱 FALLBACK: Connection or Supabase error detected');
                    
                    // Mark as offline mode due to connection failure
                    localStorage.setItem('stepTrackerOfflineMode', 'true');
                    localStorage.setItem('stepTrackerUsesSupabase', 'false');
                    
                    // Fallback to localStorage using same source as main app
                    users = JSON.parse(localStorage.getItem('stepTrackerUsers') || '[]');
                    activities = JSON.parse(localStorage.getItem('stepTrackerActivities') || '[]');
                    dataSource = 'localStorage-fallback-connection-error';
                    
                    console.log(`📱 FALLBACK SUCCESS: ${users.length} users and ${activities.length} activities from localStorage`);
                }
            } else if (supabaseConfigured && !isOnline) {
                console.log('📴 OFFLINE MODE: Supabase configured but no internet connection');
                console.log('📱 Using localStorage while offline (will sync when connection restored)');
                
                // Mark as offline mode
                localStorage.setItem('stepTrackerOfflineMode', 'true');
                localStorage.setItem('stepTrackerUsesSupabase', 'true'); // Keep true to retry when online
                
                // Use localStorage while offline
                users = JSON.parse(localStorage.getItem('stepTrackerUsers') || '[]');
                activities = JSON.parse(localStorage.getItem('stepTrackerActivities') || '[]');
                dataSource = 'localStorage-offline';
                
                console.log(`📱 OFFLINE MODE: ${users.length} users, ${activities.length} activities from localStorage`);
                console.log('🔄 Will automatically retry Supabase when connection is restored');
            } else {
                console.log('⚠️ CONFIGURATION ISSUE: Supabase not properly configured');
                console.log('📱 Using localStorage only (configuration fallback)');
                
                // Mark as not using Supabase due to configuration
                localStorage.setItem('stepTrackerUsesSupabase', 'false');
                localStorage.setItem('stepTrackerOfflineMode', 'true');
                
                // Get data from main app's localStorage using exact same keys as main app
                users = JSON.parse(localStorage.getItem('stepTrackerUsers') || '[]');
                activities = JSON.parse(localStorage.getItem('stepTrackerActivities') || '[]');
                dataSource = 'localStorage-config-issue';
                
                console.log(`📊 CONFIG FALLBACK: ${users.length} users, ${activities.length} activities from localStorage`);
            }
            
            // Add data source info for debugging
            console.log(`📊 Final data source: ${dataSource}`);
            
            if (users.length === 0) {
                console.log('No users found in database');
                return null;
            }

            console.log(`Processing ${users.length} users for display`);

            // Debug: Show detailed user data
            console.log('🔍 Detailed user analysis:');
            users.forEach((user, i) => {
                console.log(`  User ${i}: ${user.name} (${user.team})`);
                console.log(`    - Total steps: ${user.totalSteps}`);
                console.log(`    - Daily goal: ${user.dailyGoal}`);
                console.log(`    - Steps object:`, user.steps);
            });

            // Get today's date for current day stats - use main app format
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format (matches main app)
            const todayLegacy = new Date().toDateString(); // Legacy format for fallback
            console.log(`📅 Today's date (ISO): "${today}"`);
            console.log(`📅 Today's date (legacy): "${todayLegacy}"`);

            // Calculate statistics
            const totalSteps = users.reduce((sum, user) => {
                // Try main app format first, fallback to legacy format
                let todaySteps = 0;
                if (user.steps && user.steps[today] !== undefined) {
                    todaySteps = user.steps[today];
                } else if (user.steps && user.steps[todayLegacy] !== undefined) {
                    todaySteps = user.steps[todayLegacy];
                }
                console.log(`  ${user.name}: ${todaySteps} steps today`);
                return sum + todaySteps;
            }, 0);
            
            const totalParticipants = users.length;
            const activeTeams = [...new Set(users.map(user => user.team))].length;
            const averageSteps = totalParticipants > 0 ? Math.round(totalSteps / totalParticipants) : 0;
            
            console.log(`📊 Calculated stats:`);
            console.log(`  - Total steps today: ${totalSteps}`);
            console.log(`  - Total participants: ${totalParticipants}`);
            console.log(`  - Active teams: ${activeTeams}`);
            console.log(`  - Average steps: ${averageSteps}`);
            
            const completedChallenges = this.calculateCompletedChallenges(users);
            console.log(`  - Completed challenges: ${completedChallenges}`);

            // Calculate "The Stomp" - Aggregate steps for entire offsite period
            console.log('🔥 Calculating THE STOMP - aggregate offsite steps...');
            const totalOffsiteSteps = users.reduce((sum, user) => {
                // Use the total_steps field which contains the cumulative steps for each user
                const userTotalSteps = user.total_steps || 0;
                console.log(`  ${user.name}: ${userTotalSteps} total steps`);
                return sum + userTotalSteps;
            }, 0);
            
            console.log(`🔥 THE STOMP - Total offsite steps: ${totalOffsiteSteps}`);

            // Create individual leaderboard based on today's steps
            console.log('🏆 Creating individual leaderboard...');
            const individualLeaderboard = users
                .map(user => {
                    // Try main app format first, fallback to legacy format
                    let todaySteps = 0;
                    if (user.steps && user.steps[today] !== undefined) {
                        todaySteps = user.steps[today];
                    } else if (user.steps && user.steps[todayLegacy] !== undefined) {
                        todaySteps = user.steps[todayLegacy];
                    }
                    console.log(`  ${user.name}: ${todaySteps} steps`);
                    return {
                        name: user.name,
                        team: user.team,
                        steps: todaySteps
                    };
                })
                .sort((a, b) => b.steps - a.steps)
                .slice(0, 10)
                .map((user, index) => ({
                    rank: index + 1,
                    name: user.name,
                    team: user.team,
                    steps: user.steps
                }));
                
            console.log('🏆 Individual leaderboard result:', individualLeaderboard);

            // Create team leaderboard based on today's steps
            console.log('👥 Creating team leaderboard...');
            const teamStats = {};
            users.forEach(user => {
                const team = user.team;
                // Try main app format first, fallback to legacy format
                let todaySteps = 0;
                if (user.steps && user.steps[today] !== undefined) {
                    todaySteps = user.steps[today];
                } else if (user.steps && user.steps[todayLegacy] !== undefined) {
                    todaySteps = user.steps[todayLegacy];
                }
                
                if (!teamStats[team]) {
                    teamStats[team] = { name: team, totalSteps: 0, memberCount: 0 };
                }
                teamStats[team].totalSteps += todaySteps;
                teamStats[team].memberCount += 1;
                
                console.log(`  ${user.name} (${team}): ${todaySteps} steps`);
            });
            
            console.log('👥 Team stats before processing:', teamStats);

            const teamLeaderboard = Object.values(teamStats)
                .map(team => ({
                    ...team,
                    averageSteps: Math.round(team.totalSteps / team.memberCount)
                }))
                .sort((a, b) => b.totalSteps - a.totalSteps)
                .slice(0, 10)
                .map((team, index) => ({
                    rank: index + 1,
                    name: team.name,
                    steps: team.totalSteps,
                    averageSteps: team.averageSteps,
                    memberCount: team.memberCount
                }));
                
            console.log('👥 Final team leaderboard:', teamLeaderboard);

            // Calculate weekly champion (overall top individual by total steps)
            console.log('👑 Calculating weekly champion...');
            const weeklyChampion = users.length > 0 ? users.reduce((champion, user) => {
                const userTotalSteps = user.total_steps || 0;
                const championTotalSteps = champion.total_steps || 0;
                return userTotalSteps > championTotalSteps ? user : champion;
            }) : null;
            
            console.log('👑 Weekly champion:', weeklyChampion);

            // Ensure activities are sorted by timestamp descending (newest first) 
            // regardless of data source (Supabase or localStorage)
            activities = activities.sort((a, b) => {
                const timeA = new Date(a.timestamp || a.created_at || a.date || 0);
                const timeB = new Date(b.timestamp || b.created_at || b.date || 0);
                return timeB - timeA; // Descending order (newest first)
            });

            const recentActivities = this.formatActivities(activities.slice(0, 10));

            const returnData = {
                stats: {
                    totalSteps,
                    totalOffsiteSteps,
                    totalParticipants,
                    activeTeams,
                    averageSteps,
                    completedChallenges
                },
                leaderboards: {
                    individual: individualLeaderboard,
                    team: teamLeaderboard
                },
                weeklyChampion: weeklyChampion,
                activities: recentActivities
            };

            console.log('=== Returning data ===');
            console.log('Final stats:', returnData.stats);
            console.log('totalParticipants:', totalParticipants);
            console.log('users.length:', users.length);
            console.log('Individual leaderboard length:', individualLeaderboard.length);
            console.log('Team leaderboard length:', teamLeaderboard.length);

            return returnData;

        } catch (error) {
            console.error('Error getting main app data:', error);
            return null;
        }
    }

    calculateCompletedChallenges(users) {
        // Define challenge targets based on the main app
        const challenges = [
            { target: 10000, name: 'Frauenkirche Tower Climb' },
            { target: 8000, name: 'Viktualienmarkt Power Walk' },
            { target: 12000, name: 'Microsoft Schwabing Trek' },
            { target: 15000, name: 'Isar River Shoreline' },
            { target: 9700, name: 'Clippy\'s Assistant Quest' },
            { target: 19950, name: 'Windows 95 Launch Walk' },
            { target: 11700, name: 'Master Chief\'s March' },
            { target: 14000, name: 'Englischer Garten Grand Loop' }
        ];
        
        let completedCount = 0;
        const today = new Date().toISOString().split('T')[0]; // Use main app format
        const todayLegacy = new Date().toDateString(); // Legacy fallback
        
        // Count individual challenge completions
        users.forEach(user => {
            // Try main app format first, fallback to legacy format
            let todaySteps = 0;
            if (user.steps && user.steps[today] !== undefined) {
                todaySteps = user.steps[today];
            } else if (user.steps && user.steps[todayLegacy] !== undefined) {
                todaySteps = user.steps[todayLegacy];
            }
            
            challenges.forEach(challenge => {
                if (todaySteps >= challenge.target) {
                    completedCount++;
                }
            });
        });
        
        return completedCount;
    }

    formatActivities(activities) {
        console.log('=== formatActivities called (using main app format) ===');
        console.log('Raw activities input:', activities);
        console.log('Raw activities type:', typeof activities);
        console.log('Raw activities Array.isArray:', Array.isArray(activities));
        
        if (!activities || activities.length === 0) {
            console.log('No activities to format');
            return [];
        }
        
        const formatted = activities.map((activity, index) => {
            console.log(`Activity ${index} (main app format):`, activity);
            console.log(`  - type: "${activity.type}"`);
            console.log(`  - description: "${activity.description}"`);
            console.log(`  - message: "${activity.message}"`);
            console.log(`  - text: "${activity.text}"`);
            console.log(`  - timestamp: "${activity.timestamp}"`);
            console.log(`  - created_at: "${activity.created_at}"`);
            console.log(`  - date: "${activity.date}"`);
            console.log(`  - user: "${activity.user}"`);
            
            // Handle both Supabase format and localStorage format (same as main app)
            // Priority: message -> description -> text -> fallback
            let message = activity.message; // localStorage format (main app primary)
            if (!message && activity.description) {
                message = activity.description; // Supabase format (main app secondary)
            }
            if (!message && activity.text) {
                message = activity.text; // Alternative format
            }
            if (!message) {
                message = 'Step activity recorded'; // Fallback (same as main app)
            }
            
            // Use same timestamp handling as main app
            const timestamp = activity.timestamp || activity.date || activity.created_at || Date.now();
            
            const formatted = {
                type: activity.type || 'steps',  // Default to 'steps' (same as main app)
                message: message,
                timeAgo: this.getTimeAgo(new Date(timestamp)),
                user: activity.user || 'Unknown' // Include user info (same as main app)
            };
            
            console.log(`Formatted activity ${index} (main app compatible):`, formatted);
            return formatted;
        }).slice(0, 10); // Take first 10 and keep newest-first order (same as main app)
        
        console.log('Final formatted activities (main app compatible):', formatted);
        return formatted;
    }

    // Test Supabase connection using SupabaseHelper (more reliable)
    async testSupabaseConnection() {
        try {
            // Use SupabaseHelper instead of direct supabase client access
            if (typeof SupabaseHelper === 'undefined') {
                throw new Error('SupabaseHelper is not available');
            }
            
            // Test by getting users through SupabaseHelper
            const users = await SupabaseHelper.getAllUsers();
            
            console.log('✅ Supabase connection test passed via SupabaseHelper');
            return true;
        } catch (error) {
            console.error('❌ Supabase connection test failed:', error);
            throw error;
        }
    }

    // Cloud-first merged activities (prioritizes Supabase over localStorage)
    async getMergedActivitiesCloudFirst(limit = 50) {
        console.log('🔄 Getting cloud-first merged activities...');
        
        try {
            let allActivities = [];
            
            // PRIORITY 1: Get Supabase activities (cloud data is primary)
            console.log('☁️ Step 1: Fetching Supabase activities (PRIMARY source)');
            const supabaseActivities = await SupabaseHelper.getRecentActivities(limit);
            console.log(`✅ Supabase activities: ${supabaseActivities.length}`);
            
            // Map Supabase activities to the format expected by the UI
            const remoteActivities = supabaseActivities.map(activity => ({
                id: activity.id,
                type: activity.type,
                message: activity.description, // Map 'description' to 'message'
                timestamp: activity.timestamp,
                user: activity.user || 'Unknown',
                description: activity.description,
                source: 'supabase' // Track source for debugging
            }));
            
            allActivities.push(...remoteActivities);
            console.log(`☁️ Added ${remoteActivities.length} activities from Supabase (cloud)`);
            
            // PRIORITY 2: Get localStorage activities as supplementary
            console.log('💾 Step 2: Checking localStorage for additional activities');
            const localActivities = JSON.parse(localStorage.getItem('stepTrackerActivities') || '[]');
            console.log(`💾 LocalStorage activities: ${localActivities.length}`);
            
            // Add local activities that aren't already in Supabase (avoid duplicates)
            let addedFromLocal = 0;
            localActivities.forEach(localActivity => {
                const existsInRemote = remoteActivities.some(remote => 
                    remote.id === localActivity.id ||
                    (remote.timestamp === localActivity.timestamp && remote.message === localActivity.message)
                );
                
                if (!existsInRemote) {
                    // Mark local activities for identification
                    const localActivityWithSource = {
                        ...localActivity,
                        source: 'localStorage' // Track source for debugging
                    };
                    allActivities.push(localActivityWithSource);
                    addedFromLocal++;
                }
            });
            
            console.log(`💾 Added ${addedFromLocal} unique activities from localStorage`);
            
            // Sort by timestamp (newest first) and limit - cloud data stays at top
            allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            const mergedActivities = allActivities.slice(0, limit);
            
            console.log(`✅ CLOUD-FIRST MERGE RESULT:`);
            console.log(`  - Supabase (primary): ${remoteActivities.length}`);
            console.log(`  - localStorage (supplementary): ${addedFromLocal}`);
            console.log(`  - Total merged: ${mergedActivities.length}`);
            console.log(`  - Showing first: ${Math.min(limit, mergedActivities.length)}`);
            
            // Log source breakdown for first few activities
            console.log('📊 First 3 activities by source:');
            mergedActivities.slice(0, 3).forEach((activity, i) => {
                console.log(`  ${i + 1}. [${activity.source}] ${activity.message}`);
            });
            
            return mergedActivities;
            
        } catch (error) {
            console.error('❌ Error in cloud-first merge, falling back to localStorage:', error);
            
            // Fallback to localStorage only
            console.log('📱 FALLBACK: Using localStorage only due to cloud error');
            const fallbackActivities = JSON.parse(localStorage.getItem('stepTrackerActivities') || '[]');
            const activitiesWithSource = fallbackActivities.map(activity => ({
                ...activity,
                source: 'localStorage-fallback'
            }));
            return activitiesWithSource.slice(0, limit);
        }
    }

    // Mirror the main app's activity merging logic (original version for compatibility)
    async getMergedActivities(limit = 50) {
        console.log('🔄 Getting merged activities (same as main app Recent Activity)...');
        
        try {
            let allActivities = [];
            
            // Get Supabase activities
            const supabaseActivities = await SupabaseHelper.getRecentActivities(limit);
            console.log(`📡 Supabase activities: ${supabaseActivities.length}`);
            
            // Map Supabase activities to the format expected by the UI (same as main app)
            const remoteActivities = supabaseActivities.map(activity => ({
                id: activity.id,
                type: activity.type,
                message: activity.description, // Map 'description' to 'message' (same as main app)
                timestamp: activity.timestamp,
                user: activity.user || 'Unknown', // Use user field if available
                description: activity.description // Keep original for compatibility
            }));
            
            allActivities.push(...remoteActivities);
            
            // Get localStorage activities (same as main app)
            const localActivities = JSON.parse(localStorage.getItem('stepTrackerActivities') || '[]');
            console.log(`💾 localStorage activities: ${localActivities.length}`);
            
            // Add local activities that aren't already in remote activities (same logic as main app)
            localActivities.forEach(localActivity => {
                const existsInRemote = remoteActivities.some(remote => 
                    remote.id === localActivity.id ||
                    (remote.timestamp === localActivity.timestamp && remote.message === localActivity.message)
                );
                
                if (!existsInRemote) {
                    allActivities.push(localActivity);
                }
            });
            
            // Sort by timestamp (newest first) and limit - same as main app
            allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            const mergedActivities = allActivities.slice(0, limit);
            
            console.log(`🔄 Merged activities result: ${remoteActivities.length} remote + ${localActivities.length} local = ${mergedActivities.length} total (showing first ${limit})`);
            console.log('🔄 First few merged activities:', mergedActivities.slice(0, 3));
            
            return mergedActivities;
            
        } catch (error) {
            console.error('❌ Error getting merged activities:', error);
            
            // Fallback to localStorage only
            console.log('📱 Falling back to localStorage only');
            const fallbackActivities = JSON.parse(localStorage.getItem('stepTrackerActivities') || '[]');
            return fallbackActivities.slice(0, limit);
        }
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'just now';
        if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }

    updateStats(stats) {
        this.updateStatCard('totalUsers', stats.totalParticipants?.toString() || '0');
        this.updateStatCard('totalSteps', stats.totalSteps?.toLocaleString() || '0');
        this.updateStatCard('completedChallenges', stats.completedChallenges?.toString() || '0');
        
        // Update The Stomp display
        this.updateStompDisplay(stats.totalOffsiteSteps || 0, stats.totalParticipants || 0);
    }

    updateStatCard(id, value) {
        const element = document.getElementById(id);
        if (element && element.textContent !== value) {
            requestAnimationFrame(() => {
                element.textContent = value;
                const card = element.closest('.stat-card');
                if (card) {
                    card.classList.add('updating');
                    setTimeout(() => card.classList.remove('updating'), 300);
                }
            });
        }
    }

    updateStompDisplay(totalOffsiteSteps, totalParticipants) {
        console.log(`🔥 Updating THE STOMP display: ${totalOffsiteSteps} steps, ${totalParticipants} participants`);
        
        const stompNumber = document.getElementById('totalOffsiteSteps');
        const stompCard = document.querySelector('.stomp-card');
        
        if (stompNumber) {
            const formattedSteps = totalOffsiteSteps.toLocaleString();
            if (stompNumber.textContent !== formattedSteps) {
                requestAnimationFrame(() => {
                    stompNumber.textContent = formattedSteps;
                    if (stompCard) {
                        stompCard.classList.add('updating');
                        setTimeout(() => stompCard.classList.remove('updating'), 500);
                    }
                });
            }
        }
    }

    updateLeaderboards(leaderboards) {
        console.log('=== updateLeaderboards called ===');
        console.log('Individual leaderboard data:', leaderboards.individual);
        console.log('Team leaderboard data:', leaderboards.team);
        
        this.updateIndividualLeaderboard(leaderboards.individual);
        this.updateTeamLeaderboard(leaderboards.team);
    }

    updateWeeklyChampion(champion) {
        console.log('=== updateWeeklyChampion called ===');
        console.log('Weekly champion data:', champion);
        
        const container = document.getElementById('weeklyChampion');
        if (!container) {
            console.error('Weekly champion container not found!');
            return;
        }
        
        if (!champion) {
            console.log('No weekly champion data available');
            container.innerHTML = `
                <div class="leaderboard-item empty-state">
                    <div class="empty-message">
                        <i class="fas fa-crown"></i>
                        <p>No champion data available yet. Start tracking steps!</p>
                    </div>
                </div>
            `;
            return;
        }
        
        const totalSteps = champion.total_steps || 0;
        
        // Determine achievement level
        let achievementText = '';
        let achievementClass = '';
        
        if (totalSteps >= 100000) {
            achievementText = '🎉 LEGENDARY CHAMPION!';
            achievementClass = 'legendary';
        } else if (totalSteps >= 75000) {
            achievementText = '🌟 INCREDIBLE ACHIEVEMENT!';
            achievementClass = 'incredible';
        } else if (totalSteps >= 50000) {
            achievementText = '💪 OUTSTANDING PERFORMANCE!';
            achievementClass = 'outstanding';
        } else if (totalSteps >= 30000) {
            achievementText = '👏 EXCELLENT EFFORT!';
            achievementClass = 'excellent';
        } else if (totalSteps >= 10000) {
            achievementText = '🚀 GREAT START!';
            achievementClass = 'great';
        }
        
        container.innerHTML = `
            <div class="weekly-champion-display">
                <div class="champion-avatar">👑</div>
                <div class="champion-info">
                    <div class="champion-name">${champion.name}</div>
                    <div class="champion-team">${champion.team}</div>
                    <div class="champion-steps">${totalSteps.toLocaleString()}</div>
                    <div class="champion-label">TOTAL STEPS THIS WEEK</div>
                    ${achievementText ? `<div class="champion-achievement ${achievementClass}">${achievementText}</div>` : ''}
                </div>
            </div>
        `;
        
        console.log('✅ Weekly champion display updated');
    }

    updateIndividualLeaderboard(individuals) {
        console.log('=== updateIndividualLeaderboard called ===');
        console.log('Individual data received:', individuals);
        console.log('Number of individuals:', individuals?.length || 0);
        
        const container = document.getElementById('individualLeaderboard');
        if (!container) {
            console.error('Individual leaderboard container not found!');
            return;
        }
        
        console.log('Found individual leaderboard container');

        // --- FLIP reorder prep (Item 7 stretch) ---
        // Record pre-update positions keyed by stable row id, so rows that
        // actually move can animate instead of pop after the DOM wipe.
        const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const firstPositions = new Map();
        if (!reduceMotion) {
            container.querySelectorAll('.leaderboard-item[data-row-id]').forEach(el => {
                firstPositions.set(el.getAttribute('data-row-id'), el.getBoundingClientRect());
            });
        }

        const fragment = document.createDocumentFragment();
        
        if (individuals.length === 0) {
            console.log('No individuals, showing empty state');
            const emptyItem = document.createElement('div');
            emptyItem.className = 'leaderboard-item empty-state';
            emptyItem.innerHTML = `
                <div class="empty-message">
                    <i class="fas fa-shoe-prints" aria-hidden="true"></i>
                    <p>Waiting for the first step to be logged.</p>
                </div>
            `;
            fragment.appendChild(emptyItem);
        } else {
            console.log('Processing', individuals.length, 'individuals');
            individuals.forEach((person, index) => {
                console.log(`Creating item for person ${index}:`, person);
                const item = document.createElement('div');
                item.className = `leaderboard-item ${person.rank <= 3 ? 'top-3' : ''}`;
                const rowId = `ind:${person.name}|${person.team || ''}`;
                item.setAttribute('data-row-id', rowId);
                item.innerHTML = `
                    <div class="leaderboard-rank ${this.getRankClass(person.rank)}">
                        ${person.rank}
                    </div>
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">${person.name}</div>
                        <div class="leaderboard-team">${person.team}</div>
                    </div>
                    <div class="leaderboard-steps">${person.steps.toLocaleString()}</div>
                `;
                
                item.style.animationDelay = `${index * 0.05}s`;
                fragment.appendChild(item);
            });
        }

        requestAnimationFrame(() => {
            console.log('Updating individual leaderboard DOM');
            container.innerHTML = '';
            container.appendChild(fragment);
            console.log('Individual leaderboard DOM updated with', container.children.length, 'items');
            this._playFlipAnimations(container, firstPositions);
        });
    }

    updateTeamLeaderboard(teams) {
        const container = document.getElementById('teamLeaderboard');
        if (!container) return;

        const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const firstPositions = new Map();
        if (!reduceMotion) {
            container.querySelectorAll('.leaderboard-item[data-row-id]').forEach(el => {
                firstPositions.set(el.getAttribute('data-row-id'), el.getBoundingClientRect());
            });
        }

        const fragment = document.createDocumentFragment();
        
        if (teams.length === 0) {
            const emptyItem = document.createElement('div');
            emptyItem.className = 'leaderboard-item empty-state';
            emptyItem.innerHTML = `
                <div class="empty-message">
                    <i class="fas fa-users" aria-hidden="true"></i>
                    <p>Team rankings appear once the first team logs steps.</p>
                </div>
            `;
            fragment.appendChild(emptyItem);
        } else {
            teams.forEach((team, index) => {
                const item = document.createElement('div');
                item.className = `leaderboard-item ${team.rank <= 3 ? 'top-3' : ''}`;
                item.setAttribute('data-row-id', `team:${team.name}`);
                item.innerHTML = `
                    <div class="leaderboard-rank ${this.getRankClass(team.rank)}">
                        ${team.rank}
                    </div>
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">${team.name}</div>
                        <div class="leaderboard-team">${team.memberCount} members</div>
                    </div>
                    <div class="leaderboard-steps">${team.steps.toLocaleString()}</div>
                `;
                
                item.style.animationDelay = `${index * 0.05}s`;
                fragment.appendChild(item);
            });
        }

        requestAnimationFrame(() => {
            container.innerHTML = '';
            container.appendChild(fragment);
            this._playFlipAnimations(container, firstPositions);
        });
    }

    // FLIP reorder helper — rows that moved vertically slide into their new
    // position instead of popping there. Gated by prefers-reduced-motion.
    _playFlipAnimations(container, firstPositions) {
        if (!firstPositions || firstPositions.size === 0) return;
        if (typeof Element === 'undefined' || typeof Element.prototype.animate !== 'function') return;
        const rows = container.querySelectorAll('.leaderboard-item[data-row-id]');
        rows.forEach(row => {
            const id = row.getAttribute('data-row-id');
            const prev = firstPositions.get(id);
            if (!prev) return;
            const last = row.getBoundingClientRect();
            const dy = prev.top - last.top;
            if (Math.abs(dy) < 1) return;
            row.animate(
                [
                    { transform: `translateY(${dy}px)` },
                    { transform: 'translateY(0)' }
                ],
                {
                    duration: 400,
                    easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
                    composite: 'replace'
                }
            );
        });
    }

    getRankClass(rank) {
        if (rank === 1) return 'rank-gold';
        if (rank === 2) return 'rank-silver';
        if (rank === 3) return 'rank-bronze';
        return '';
    }

    updateActivityFeed(activities) {
        console.log('=== updateActivityFeed called ===');
        console.log('Activities received:', activities);
        console.log('Activities length:', activities ? activities.length : 0);
        
        const container = document.getElementById('activityFeed');
        if (!container) {
            console.error('Activity feed container not found!');
            return;
        }

        const fragment = document.createDocumentFragment();
        
        if (activities.length === 0) {
            console.log('No activities to display - showing empty state');
            const emptyItem = document.createElement('div');
            emptyItem.className = 'activity-item empty-state';
            // Debug block is only rendered when ?debug=1 is in the URL so the
            // kiosk doesn't leak internal state on-screen at the event.
            const debugHTML = DEBUG_MODE ? `
                    <small class="empty-debug" style="color: #666; margin-top: 10px; display: block;">
                        Debug: Supabase ${typeof SupabaseHelper !== 'undefined' ? 'available' : 'unavailable'}<br>
                        LocalStorage activities: ${JSON.parse(localStorage.getItem('stepTrackerActivities') || '[]').length}<br>
                        Last checked: ${this.formatTimeWithoutSeconds(new Date())}
                    </small>` : '';
            emptyItem.innerHTML = `
                <div class="empty-message">
                    <i class="fas fa-bolt" aria-hidden="true"></i>
                    <p>Listening for activity — steps will appear here as they happen.</p>
                    ${debugHTML}
                </div>
            `;
            fragment.appendChild(emptyItem);
        } else {
            console.log('Displaying activities:', activities);
            activities.forEach((activity, index) => {
                const item = document.createElement('div');
                item.className = `activity-item ${activity.type || 'unknown'}`;
                item.innerHTML = `
                    <div class="activity-icon">
                        ${this.getActivityIcon(activity.type)}
                    </div>
                    <div class="activity-content">
                        <div class="activity-message">${activity.message}</div>
                        <div class="activity-time">${activity.timeAgo}</div>
                    </div>
                `;
                
                item.style.animationDelay = `${index * 0.1}s`;
                fragment.appendChild(item);
            });
        }

        requestAnimationFrame(() => {
            container.innerHTML = '';
            container.appendChild(fragment);
        });
        
        // Update activity count
        const activityCountElement = document.getElementById('activityCount');
        if (activityCountElement) {
            const count = activities.length;
            activityCountElement.textContent = `${count} recent activit${count === 1 ? 'y' : 'ies'}`;
            console.log(`Updated activity count to: ${count}`);
        }
    }

    getActivityIcon(type) {
        const icons = {
            'steps': '<i class="fas fa-walking"></i>',
            'achievement': '<i class="fas fa-trophy"></i>',
            'user': '<i class="fas fa-user-plus"></i>',
            'team-change': '<i class="fas fa-users"></i>',
            'team': '<i class="fas fa-users"></i>', // Keep both for compatibility
            'overachiever': '<i class="fas fa-star"></i>',
            'milestone': '<i class="fas fa-mountain"></i>',
            'debug': '<i class="fas fa-bug"></i>',
            'goal': '<i class="fas fa-bullseye"></i>',
            'update': '<i class="fas fa-walking"></i>' // Keep for compatibility
        };
        return icons[type] || '<i class="fas fa-bell"></i>';
    }

    showRefreshIndicators() {
        const indicators = document.querySelectorAll('.refresh-indicator i');
        indicators.forEach(indicator => {
            indicator.classList.add('fa-spin');
        });
    }

    hideRefreshIndicators() {
        const indicators = document.querySelectorAll('.refresh-indicator i');
        indicators.forEach(indicator => {
            indicator.classList.remove('fa-spin');
        });
    }

    refresh() {
        this.loadData();
    }

    setRefreshInterval(interval) {
        this.refreshInterval = interval;
        if (this.isInitialized) {
            this.startAutoRefresh();
        }
    }

    // Enhanced connection monitoring and sync methods
    async checkSupabaseConnection() {
        try {
            if (typeof SupabaseHelper === 'undefined') {
                console.log('🔍 SupabaseHelper not available');
                return false;
            }
            
            // Test connection with a simple query
            await SupabaseHelper.getAllUsers();
            console.log('✅ Supabase connection active');
            return true;
        } catch (error) {
            console.warn('❌ Supabase connection failed:', error);
            return false;
        }
    }

    async ensureSupabaseFirst() {
        console.log('🔄 Enforcing Supabase-first architecture...');
        
        const isConnected = await this.checkSupabaseConnection();
        
        if (isConnected) {
            console.log('🌐 Supabase connected - using as primary data source');
            localStorage.setItem('stepTrackerUsesSupabase', 'true');
            localStorage.setItem('stepTrackerLastSupabaseSync', Date.now().toString());
            
            // If we were offline and now back online, resync
            const wasOffline = localStorage.getItem('stepTrackerOfflineMode') === 'true';
            if (wasOffline) {
                console.log('🔄 Was offline, now resyncing with Supabase...');
                localStorage.removeItem('stepTrackerOfflineMode');
                await this.resyncWithSupabase();
            }
        } else {
            console.log('📱 Supabase unavailable - using localStorage fallback');
            localStorage.setItem('stepTrackerUsesSupabase', 'false');
            localStorage.setItem('stepTrackerOfflineMode', 'true');
        }
    }

    async resyncWithSupabase() {
        try {
            console.log('🔄 Starting resync with Supabase...');
            
            // Get offline data that might have been stored locally
            const offlineUsers = JSON.parse(localStorage.getItem('stepTrackerUsers') || '[]');
            const offlineActivities = JSON.parse(localStorage.getItem('stepTrackerActivities') || '[]');
            
            console.log(`Found ${offlineUsers.length} offline users and ${offlineActivities.length} offline activities`);
            
            // For now, we prioritize Supabase data over offline data
            // In a production app, you'd want merge logic here
            const supabaseUsers = await SupabaseHelper.getAllUsers();
            const supabaseActivities = await SupabaseHelper.getRecentActivities();
            
            console.log(`Supabase has ${supabaseUsers.length} users and ${supabaseActivities.length} activities`);
            
            // Store the synced timestamp
            localStorage.setItem('stepTrackerLastSupabaseSync', Date.now().toString());
            
            console.log('✅ Resync completed successfully');
            
            // Reload data to reflect the sync
            await this.loadData();
            
        } catch (error) {
            console.error('❌ Resync failed:', error);
            // Stay in offline mode if resync fails
            localStorage.setItem('stepTrackerOfflineMode', 'true');
        }
    }

    // Monitor connection status and auto-resync
    startConnectionMonitoring() {
        console.log('� Starting enhanced connection monitoring for cloud-first approach');
        
        // Monitor online/offline events
        window.addEventListener('online', async () => {
            console.log('🌐 Connection restored - switching back to Supabase (cloud-first)');
            
            // Clear offline mode flags
            localStorage.removeItem('stepTrackerOfflineMode');
            localStorage.setItem('stepTrackerUsesSupabase', 'true');
            
            // Test Supabase connectivity before switching
            try {
                await this.testSupabaseConnection();
                console.log('✅ Supabase connectivity confirmed - resuming cloud-first mode');
                
                // Immediately refresh data from cloud
                setTimeout(() => {
                    console.log('🔄 Triggering immediate cloud refresh');
                    this.loadData();
                }, 1000);
                
            } catch (error) {
                console.warn('⚠️ Supabase still not accessible despite online status:', error);
                localStorage.setItem('stepTrackerOfflineMode', 'true');
            }
        });

        window.addEventListener('offline', () => {
            console.log('� Connection lost - switching to offline mode (localStorage fallback)');
            localStorage.setItem('stepTrackerOfflineMode', 'true');
            // Keep stepTrackerUsesSupabase=true to retry when online
        });

        // Enhanced visibility change monitoring
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden) {
                console.log('👀 Tab became visible - checking connection status');
                
                const isOfflineMode = localStorage.getItem('stepTrackerOfflineMode') === 'true';
                const shouldUseSupabase = localStorage.getItem('stepTrackerUsesSupabase') === 'true';
                
                if (isOfflineMode && shouldUseSupabase && navigator.onLine) {
                    console.log('🔄 Tab visible + online + offline mode = testing Supabase connectivity');
                    
                    try {
                        await this.testSupabaseConnection();
                        console.log('✅ Supabase available - switching back to cloud-first mode');
                        
                        localStorage.removeItem('stepTrackerOfflineMode');
                        setTimeout(() => this.loadData(), 500);
                        
                    } catch (error) {
                        console.log('⚠️ Supabase still not available, staying in offline mode');
                    }
                } else {
                    // Normal visibility change refresh
                    setTimeout(() => this.loadData(), 1000);
                }
            }
        });

        // Periodic connection health check (every 2 minutes) - enhanced for cloud-first
        setInterval(async () => {
            const isOfflineMode = localStorage.getItem('stepTrackerOfflineMode') === 'true';
            const shouldUseSupabase = localStorage.getItem('stepTrackerUsesSupabase') === 'true';
            
            if (shouldUseSupabase && navigator.onLine) {
                if (isOfflineMode) {
                    // We're in offline mode but online - test if Supabase is back
                    console.log('💗 Health check: Testing if Supabase is available again');
                    
                    try {
                        await this.testSupabaseConnection();
                        console.log('✅ Supabase is back online - switching to cloud-first mode');
                        
                        localStorage.removeItem('stepTrackerOfflineMode');
                        this.loadData(); // Immediate refresh from cloud
                        
                    } catch (error) {
                        console.log('⚠️ Supabase still not available during health check');
                    }
                } else {
                    // Regular health check for active Supabase connection
                    console.log('💗 Health check: Verifying active Supabase connection');
                    
                    try {
                        await this.testSupabaseConnection();
                        console.log('💗 Supabase connection healthy');
                    } catch (error) {
                        console.warn('⚠️ Supabase connection lost during health check, switching to offline mode');
                        localStorage.setItem('stepTrackerOfflineMode', 'true');
                    }
                }
            }
        }, 2 * 60 * 1000); // Every 2 minutes
        
        console.log('✅ Enhanced connection monitoring active (cloud-first priority)');
    }

    destroy() {
        this.stopAutoRefresh();
        this.stopTimeUpdates();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.liveDisplay = new LiveDisplay();
});

// Global functions for debugging/manual control
window.liveDisplayControls = {
    refresh: () => window.liveDisplay?.refresh(),
    setInterval: (interval) => window.liveDisplay?.setRefreshInterval(interval),
    destroy: () => window.liveDisplay?.destroy()
};