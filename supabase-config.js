// Supabase Configuration for Step Tracker
// Browser-compatible configuration using CDN-loaded Supabase client

// Configuration constants
// TODO(emea): Replace these placeholders with the EMEA Supabase project URL
// and anon key before deploying. Anon keys are safe to expose in the browser
// when paired with row-level security policies on the Supabase project.
const SUPABASE_CONFIG = {
    url: 'https://YOUR-EMEA-PROJECT.supabase.co',
    anonKey: 'YOUR_EMEA_SUPABASE_ANON_KEY'
};

// For backward compatibility
const SUPABASE_URL = SUPABASE_CONFIG.url;
const SUPABASE_ANON_KEY = SUPABASE_CONFIG.anonKey;

// Initialize Supabase client with proper loading detection
let supabase = null;

function initializeSupabaseClient() {
    try {
        if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
            supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            console.log('✅ Supabase client initialized successfully');
            return true;
        } else {
            console.warn('⚠️ Supabase client library not yet loaded');
            return false;
        }
    } catch (error) {
        console.error('❌ Failed to initialize Supabase client:', error);
        return false;
    }
}

// Try to initialize immediately
initializeSupabaseClient();

// If not successful, try again when DOM is loaded
if (!supabase) {
    document.addEventListener('DOMContentLoaded', () => {
        if (!supabase) {
            setTimeout(initializeSupabaseClient, 100);
        }
    });
}

// Database table names
const TABLES = {
    USERS: 'step_tracker_users',
    STEPS: 'daily_steps',
    ACTIVITIES: 'recent_activities',
    ADMIN_USERS: 'admin_users'
};

// Configuration validation
function validateSupabaseConfig() {
    const checks = {
        clientLibrary: typeof window !== 'undefined' && typeof window.supabase !== 'undefined',
        configUrl: SUPABASE_CONFIG.url && SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_PROJECT_URL',
        configKey: SUPABASE_CONFIG.anonKey && SUPABASE_CONFIG.anonKey.length > 50,
        clientInstance: supabase !== null,
        urlFormat: SUPABASE_CONFIG.url.startsWith('https://') && SUPABASE_CONFIG.url.includes('.supabase.co')
    };
    
    const isValid = Object.values(checks).every(check => check === true);
    
    if (!isValid) {
        console.warn('⚠️ Supabase configuration issues detected:', {
            clientLibrary: checks.clientLibrary ? '✅' : '❌ Supabase client library not loaded',
            configUrl: checks.configUrl ? '✅' : '❌ Invalid or placeholder URL',
            configKey: checks.configKey ? '✅' : '❌ Invalid or missing anon key',
            clientInstance: checks.clientInstance ? '✅' : '❌ Client not initialized',
            urlFormat: checks.urlFormat ? '✅' : '❌ URL format incorrect'
        });
    }
    
    return { isValid, checks };
}

// Supabase Helper Functions
class SupabaseHelper {
    // Check if Supabase client is available
    static isReady() {
        if (!supabase) {
            // Try to initialize again
            initializeSupabaseClient();
        }
        return supabase !== null;
    }

    static ensureReady() {
        if (!this.isReady()) {
            throw new Error('Supabase client is not initialized. Make sure the Supabase CDN script is loaded.');
        }
    }

    // User Management
    static async createUser(userData) {
        try {
            this.ensureReady();
            
            const { data, error } = await supabase
                .from(TABLES.USERS)
                .insert([
                    {
                        id: userData.id,
                        name: userData.name,
                        team: userData.team,
                        daily_goal: userData.dailyGoal,
                        joined_date: userData.joinedDate,
                        total_steps: 0,
                        last_active_date: null,
                        daily_overachiever_notified: false
                    }
                ])
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    static async getUser(userId) {
        try {
            this.ensureReady();
            
            const { data, error } = await supabase
                .from(TABLES.USERS)
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching user:', error);
            throw error;
        }
    }

    static async getAllUsers(bustCache = false) {
        try {
            console.log(`🔍 getAllUsers called with bustCache: ${bustCache}`);
            
            // Create a new query each time to avoid caching
            const query = supabase
                .from(TABLES.USERS)
                .select('*')
                .order('total_steps', { ascending: false });

            const { data, error } = await query;

            if (error) {
                console.error('❌ Supabase query error:', error);
                throw error;
            }
            
            const userCount = data?.length || 0;
            console.log(`📊 getAllUsers returned ${userCount} users from database`);
            
            // Log first few user IDs for debugging
            if (data && data.length > 0) {
                const userIds = data.slice(0, 3).map(u => u.id.substring(0, 8));
                console.log(`🔍 First 3 user IDs: ${userIds.join(', ')}...`);
            }
            
            return data || [];
        } catch (error) {
            console.error('❌ Error fetching users:', error);
            throw error;
        }
    }

    static async updateUser(userId, updates) {
        try {
            const { data, error } = await supabase
                .from(TABLES.USERS)
                .update(updates)
                .eq('id', userId)
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    // Steps Management - Optimized for performance
    static async addSteps(userId, date, steps) {
        try {
            // Validate input parameters
            if (!userId || typeof userId !== 'string') {
                throw new Error('User ID must be a valid string');
            }
            if (!date || typeof date !== 'string') {
                throw new Error('Date must be a valid string (YYYY-MM-DD format)');
            }
            if (typeof steps !== 'number' || steps < 0 || !Number.isInteger(steps)) {
                throw new Error('Steps must be a non-negative integer');
            }

            // Use upsert for better performance - single database operation
            const stepData = {
                user_id: String(userId),
                date: String(date),
                steps: Number(steps),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from(TABLES.STEPS)
                .upsert(stepData, { 
                    onConflict: 'user_id,date',
                    ignoreDuplicates: false 
                })
                .select();

            if (error) throw error;
            
            // Update user's total_steps in parallel (non-blocking for UI)
            this.updateUserTotalSteps(userId, steps).catch(err => 
                console.warn('Total steps update failed:', err)
            );
            
            return data[0];
        } catch (error) {
            console.error('Error adding steps:', error);
            throw error;
        }
    }

    // Helper method to update user's total steps - optimized
    static async updateUserTotalSteps(userId, additionalSteps) {
        try {
            this.ensureReady();
            
            // Use atomic increment instead of fetch-then-update
            const { data, error } = await supabase.rpc('increment_user_steps', {
                user_id: userId,
                step_increment: additionalSteps
            });

            // Fallback to manual update if RPC not available
            if (error && error.code === 'PGRST202') {
                const { data: userData, error: fetchError } = await supabase
                    .from(TABLES.USERS)
                    .select('total_steps')
                    .eq('id', userId)
                    .single();

                if (fetchError) throw fetchError;

                const newTotal = (userData.total_steps || 0) + additionalSteps;
                const { data: updateData, error: updateError } = await supabase
                    .from(TABLES.USERS)
                    .update({ 
                        total_steps: newTotal,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', userId)
                    .select();

                if (updateError) throw updateError;
                return updateData[0];
            }

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating user total steps:', error);
            throw error;
        }
    }

    static async getUserSteps(userId, startDate = null, endDate = null) {
        try {
            let query = supabase
                .from(TABLES.STEPS)
                .select('*')
                .eq('user_id', userId);

            if (startDate) {
                query = query.gte('date', startDate);
            }
            if (endDate) {
                query = query.lte('date', endDate);
            }

            const { data, error } = await query.order('date', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching user steps:', error);
            throw error;
        }
    }

    // Activities Management
    static async addActivity(type, description, timestamp = null, user = null) {
        try {
            // Validate input parameters
            if (!type || typeof type !== 'string') {
                throw new Error('Activity type must be a non-empty string');
            }
            if (!description || typeof description !== 'string') {
                throw new Error('Activity description must be a non-empty string');
            }
            
            // Note: The 'user' parameter is kept for backward compatibility with live display
            // but is not stored in the database since the column doesn't exist
            // The user information can be embedded in the description if needed
            const activityData = {
                type: String(type),
                description: String(description),
                timestamp: timestamp || new Date().toISOString()
            };

            console.log('📊 Inserting activity data:', activityData);

            const { data, error } = await supabase
                .from(TABLES.ACTIVITIES)
                .insert([activityData])
                .select();

            if (error) throw error;
            console.log('✅ Activity added to database:', data[0]);
            return data[0];
        } catch (error) {
            console.error('Error adding activity:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            throw error;
        }
    }

    static async getRecentActivities(limit = 20) {
        try {
            const { data, error } = await supabase
                .from(TABLES.ACTIVITIES)
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching activities:', error);
            throw error;
        }
    }

    // Utility Functions
    static async syncFromLocalStorage(users, activities) {
        try {
            console.log('Starting sync from localStorage to Supabase...');
            
            // Sync users
            for (const user of users) {
                await this.createUser(user);
                
                // Sync daily steps for this user
                for (const [date, steps] of Object.entries(user.steps || {})) {
                    if (steps > 0) {
                        await this.addSteps(user.id, date, steps);
                    }
                }
            }

            // Sync activities
            for (const activity of activities) {
                await this.addActivity(
                    activity.type,
                    activity.description,
                    activity.timestamp
                );
            }

            console.log('Sync completed successfully');
        } catch (error) {
            console.error('Error syncing data:', error);
            throw error;
        }
    }

    // Real-time subscriptions
    static subscribeToUserUpdates(callback) {
        return supabase
            .channel('users-channel')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: TABLES.USERS },
                callback
            )
            .subscribe();
    }

    static subscribeToStepUpdates(callback) {
        return supabase
            .channel('steps-channel')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: TABLES.STEPS },
                callback
            )
            .subscribe();
    }

    static subscribeToActivityUpdates(callback) {
        return supabase
            .channel('activities-channel')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: TABLES.ACTIVITIES },
                callback
            )
            .subscribe();
    }

    // Connection testing
    static async testConnection() {
        try {
            // Try to ensure Supabase is ready
            if (!this.isReady()) {
                throw new Error('Supabase client not initialized - check if CDN script loaded');
            }

            // Test basic connection with a simple query
            const { data, error } = await supabase
                .from(TABLES.USERS)
                .select('count')
                .limit(1);

            if (error) throw error;

            console.log('✅ Supabase connection test successful');
            return { success: true, message: 'Connection successful' };
        } catch (error) {
            console.error('❌ Supabase connection test failed:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            return { success: false, error: error.message };
        }
    }

    // User Management Methods (Admin functions)
    static async registerUser(name, team, dailyGoal = 10000) {
        try {
            this.ensureReady();
            
            // Generate UUID v4 for new user
            const userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });

            const userData = {
                id: userId,
                name: name,
                team: team,
                daily_goal: dailyGoal,
                joined_date: new Date().toISOString().split('T')[0],
                total_steps: 0,
                last_active_date: null,
                daily_overachiever_notified: false
            };

            const { data, error } = await supabase
                .from(TABLES.USERS)
                .insert([userData])
                .select();

            if (error) throw error;

            // Create activity record for new user registration
            try {
                await this.addActivity('user', `${name} joined the step tracker challenge!`, new Date().toISOString(), name);
                console.log('✅ Activity record created for new user:', name);
            } catch (activityError) {
                console.warn('⚠️ User created but activity record failed:', activityError);
                // Don't throw error here - user creation succeeded
            }

            return data[0];
        } catch (error) {
            console.error('Error registering user:', error);
            throw error;
        }
    }

    static async deleteUser(userId) {
        try {
            this.ensureReady();
            console.log(`🗑️ Starting deletion process for user ID: ${userId}`);
            
            // Step 1: Delete user's steps first (if using separate steps table)
            console.log('🧹 Deleting user steps...');
            const { data: stepsDeleted, error: stepsError } = await supabase
                .from(TABLES.STEPS)
                .delete()
                .eq('user_id', userId)
                .select();

            if (stepsError) {
                console.warn('⚠️ Error deleting user steps (may not exist):', stepsError.message);
            } else {
                console.log(`✅ Deleted ${stepsDeleted?.length || 0} step records`);
            }

            // Step 2: Delete user activities
            console.log('🧹 Deleting user activities...');
            const { data: activitiesDeleted, error: activitiesError } = await supabase
                .from(TABLES.ACTIVITIES)
                .delete()
                .eq('user_id', userId)
                .select();

            if (activitiesError) {
                console.warn('⚠️ Error deleting user activities (may not exist):', activitiesError.message);
            } else {
                console.log(`✅ Deleted ${activitiesDeleted?.length || 0} activity records`);
            }

            // Step 3: Delete the user record
            console.log('🧹 Deleting user record...');
            const { data, error } = await supabase
                .from(TABLES.USERS)
                .delete()
                .eq('id', userId)
                .select();

            if (error) {
                console.error('❌ Error deleting user record:', error);
                throw error;
            }

            if (!data || data.length === 0) {
                throw new Error(`No user found with ID: ${userId}`);
            }

            console.log('✅ User record deleted successfully:', data);

            // Step 4: Verify deletion with multiple attempts
            for (let attempt = 1; attempt <= 3; attempt++) {
                console.log(`🔍 Verification attempt ${attempt}...`);
                await new Promise(resolve => setTimeout(resolve, attempt * 500)); // Progressive delay
                
                const { data: remainingUsers, error: checkError } = await supabase
                    .from(TABLES.USERS)
                    .select('id')
                    .eq('id', userId);
                
                if (checkError) {
                    console.warn(`⚠️ Error during verification attempt ${attempt}:`, checkError.message);
                    continue;
                }
                
                if (!remainingUsers || remainingUsers.length === 0) {
                    console.log(`✅ User successfully deleted and verified on attempt ${attempt}`);
                    return data;
                }
                
                console.log(`⚠️ User still exists after deletion attempt ${attempt}, retrying...`);
            }
            
            // If we get here, the user still exists after 3 verification attempts
            throw new Error(`User deletion failed - user still exists after multiple verification attempts. ID: ${userId}`);
            
        } catch (error) {
            console.error('❌ Error in deleteUser:', error);
            throw error;
        }
    }

    static async updateUserAdmin(userId, updates) {
        try {
            this.ensureReady();
            
            const { data, error } = await supabase
                .from(TABLES.USERS)
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Error updating user (admin):', error);
            throw error;
        }
    }

    static async getUsersWithStats() {
        try {
            this.ensureReady();
            
            const { data, error } = await supabase
                .from(TABLES.USERS)
                .select('*')
                .order('total_steps', { ascending: false });

            if (error) throw error;

            // For now, return users with basic computed stats based on total_steps
            // In the future, we could join with activities table for more detailed stats
            return data.map(user => {
                const lastActiveDate = user.last_active_date ? new Date(user.last_active_date) : null;
                const isRecentlyActive = lastActiveDate && (new Date() - lastActiveDate) < (7 * 24 * 60 * 60 * 1000);
                
                return {
                    ...user,
                    computed_total_steps: user.total_steps || 0,
                    computed_last_activity: lastActiveDate,
                    computed_is_active: isRecentlyActive
                };
            });
        } catch (error) {
            console.error('Error fetching users with stats:', error);
            throw error;
        }
    }

    static async getSystemStats() {
        try {
            this.ensureReady();
            
            const users = await this.getAllUsers();
            const today = new Date().toISOString().split('T')[0];
            
            const stats = {
                totalUsers: users.length,
                activeToday: 0,
                totalSteps: 0,
                totalTeams: new Set(),
                averageStepsPerUser: 0,
                topPerformer: null
            };

            let maxSteps = 0;

            users.forEach(user => {
                if (user.team) stats.totalTeams.add(user.team);
                
                // Use the total_steps from user record instead of trying to access recent_activities column
                const userTotalSteps = user.total_steps || 0;
                stats.totalSteps += userTotalSteps;

                if (userTotalSteps > maxSteps) {
                    maxSteps = userTotalSteps;
                    stats.topPerformer = user.name;
                }

                // Check if active today using last_active_date
                if (user.last_active_date === today) {
                    stats.activeToday++;
                }
            });

            stats.totalTeams = stats.totalTeams.size;
            stats.averageStepsPerUser = users.length > 0 ? Math.round(stats.totalSteps / users.length) : 0;

            return stats;
        } catch (error) {
            console.error('Error getting system stats:', error);
            throw error;
        }
    }

    static async exportUserData() {
        try {
            this.ensureReady();
            
            const users = await this.getAllUsers();
            const exportData = {
                export_date: new Date().toISOString(),
                total_users: users.length,
                users: users.map(user => ({
                    id: user.id,
                    name: user.name,
                    team: user.team,
                    daily_goal: user.daily_goal,
                    total_steps: user.total_steps,
                    joined_date: user.joined_date,
                    last_active_date: user.last_active_date,
                    activities_count: 0, // Will be populated when activities are properly implemented
                    recent_activities: [] // Will be populated when activities are properly implemented
                }))
            };

            return exportData;
        } catch (error) {
            console.error('Error exporting user data:', error);
            throw error;
        }
    }

    static async getTeamStats() {
        try {
            this.ensureReady();
            
            const users = await this.getAllUsers();
            const teamStats = {};

            // Group users by team and calculate stats
            users.forEach(user => {
                if (!user.team) return;
                
                if (!teamStats[user.team]) {
                    teamStats[user.team] = {
                        name: user.team,
                        member_count: 0,
                        total_steps: 0,
                        average_steps: 0,
                        active_members: 0,
                        top_performer: { name: '', steps: 0 }
                    };
                }

                const team = teamStats[user.team];
                const userSteps = user.total_steps || 0;
                const today = new Date().toISOString().split('T')[0];

                team.member_count++;
                team.total_steps += userSteps;

                // Check if user is active today
                if (user.last_active_date === today) {
                    team.active_members++;
                }

                // Update top performer
                if (userSteps > team.top_performer.steps) {
                    team.top_performer = { name: user.name, steps: userSteps };
                }
            });

            // Calculate averages and return as array
            return Object.values(teamStats).map(team => ({
                ...team,
                average_steps: team.member_count > 0 ? Math.round(team.total_steps / team.member_count) : 0
            })).sort((a, b) => b.total_steps - a.total_steps);

        } catch (error) {
            console.error('Error getting team stats:', error);
            throw error;
        }
    }

    static async getAllTeams() {
        try {
            this.ensureReady();
            
            const { data, error } = await supabase
                .from(TABLES.USERS)
                .select('team')
                .not('team', 'is', null);

            if (error) throw error;

            // Get unique team names and sort them
            const uniqueTeams = [...new Set(data.map(row => row.team))].filter(team => team && team.trim());
            return uniqueTeams.sort();

        } catch (error) {
            console.error('Error getting all teams:', error);
            throw error;
        }
    }

    /**
     * Authenticate admin user using the database function with proper hashing
     * @param {string} username - Admin username
     * @param {string} password - Admin password (plain text)
     * @returns {Promise<{success: boolean, user?: object, error?: string}>}
     */
    static async authenticateAdmin(username, password) {
        try {
            this.ensureReady();

            if (!username || !password) {
                return { success: false, error: 'Username and password are required' };
            }

            console.log('🔐 Using database function for admin authentication...');

            // Use the database function for secure authentication with proper hashing
            const { data, error } = await supabase.rpc('verify_admin_credentials', {
                input_username: username,
                input_password: password
            });

            if (error) {
                console.error('Database error during admin authentication:', error);
                return { success: false, error: 'Authentication system error' };
            }

            if (!data || data.length === 0) {
                console.log('Admin user not found or invalid credentials:', username);
                return { success: false, error: 'Invalid credentials' };
            }

            const admin = data[0];

            console.log('Admin authenticated successfully:', username);
            return { 
                success: true, 
                user: {
                    id: admin.admin_id,
                    username: admin.username,
                    full_name: admin.full_name,
                    role: admin.role,
                    is_active: admin.is_active
                }
            };

        } catch (error) {
            console.error('Error during admin authentication:', error);
            return { success: false, error: 'Authentication failed' };
        }
    }

    /**
     * Get all admin users for management interface
     * @returns {Promise<Array>}
     */
    static async getAdminUsers() {
        try {
            this.ensureReady();
            
            const { data, error } = await supabase
                .from(TABLES.ADMIN_USERS)
                .select('id, username, email, role, permissions, is_active, created_at, last_login')
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching admin users:', error);
            throw error;
        }
    }

    /**
     * Diagnostic function to check admin_users table
     * @returns {Promise<Object>}
     */
    static async diagnoseAdminTable() {
        try {
            this.ensureReady();
            console.log('🔍 Running admin_users table diagnostics...');
            
            // Test 1: Check if table exists by trying to query it
            const { data: tableData, error: tableError } = await supabase
                .from(TABLES.ADMIN_USERS)
                .select('count', { count: 'exact' })
                .limit(0);

            if (tableError) {
                return {
                    success: false,
                    error: 'Table does not exist or is not accessible',
                    details: tableError
                };
            }

            // Test 2: Count total admin users
            const { count } = await supabase
                .from(TABLES.ADMIN_USERS)
                .select('*', { count: 'exact', head: true });

            // Test 3: Check for default admin user
            const { data: adminData, error: adminError } = await supabase
                .from(TABLES.ADMIN_USERS)
                .select('*')
                .eq('username', 'admin')
                .limit(1);

            return {
                success: true,
                tableExists: true,
                totalAdmins: count || 0,
                defaultAdminExists: adminData && adminData.length > 0,
                defaultAdminData: adminData && adminData.length > 0 ? adminData[0] : null
            };

        } catch (error) {
            console.error('Error diagnosing admin table:', error);
            return {
                success: false,
                error: error.message,
                details: error
            };
        }
    }
    static async createAdminUser(adminData) {
        try {
            this.ensureReady();

            const { username, password, email, role = 'admin', permissions = ['read', 'write', 'delete'] } = adminData;

            if (!username || !password || !email) {
                return { success: false, error: 'Username, password, and email are required' };
            }

            // Check if username already exists
            const { data: existing } = await supabase
                .from(TABLES.ADMIN_USERS)
                .select('id')
                .eq('username', username)
                .limit(1);

            if (existing && existing.length > 0) {
                return { success: false, error: 'Username already exists' };
            }

            // Create admin user
            const { data, error } = await supabase
                .from(TABLES.ADMIN_USERS)
                .insert({
                    username,
                    password_hash: password, // In production, hash this with bcrypt
                    email,
                    role,
                    permissions,
                    is_active: true,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating admin user:', error);
                return { success: false, error: 'Failed to create admin user' };
            }

            console.log('Admin user created successfully:', username);
            return { success: true, user: data };

        } catch (error) {
            console.error('Error creating admin user:', error);
            return { success: false, error: 'Failed to create admin user' };
        }
    }

    /**
     * Get all admin users
     * @returns {Promise<Array>}
     */
    static async getAdminUsers() {
        try {
            this.ensureReady();

            const { data, error } = await supabase
                .from(TABLES.ADMIN_USERS)
                .select('id, username, email, role, permissions, is_active, created_at, last_login')
                .order('username');

            if (error) throw error;
            return data || [];

        } catch (error) {
            console.error('Error getting admin users:', error);
            throw error;
        }
    }
}

// Initialize and validate configuration when script loads
(function() {
    console.log('🔧 Initializing Supabase configuration...');
    
    const validation = validateSupabaseConfig();
    if (validation.isValid) {
        console.log('✅ Supabase configuration is valid');
        
        // Test connection if in development mode
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            setTimeout(() => {
                SupabaseHelper.testConnection().catch(err => 
                    console.warn('Connection test skipped:', err.message)
                );
            }, 1000);
        }
    } else {
        console.warn('⚠️ Supabase configuration has issues - check console for details');
    }
})();