/**
 * Authentication Manager for Portfolio
 * This file handles user authentication for the admin dashboard using GitHub token
 */

class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.sessionToken = null; // In-memory token storage
        
        // Initialize authentication state
        this.init();
    }
    
    /**
     * Initialize authentication state, check if user is already logged in
     */
    init() {
        console.log('Initializing GitHub token authentication system...');
        
        // Check if GitHub token exists in localStorage
        const githubToken = localStorage.getItem('github_token');
        
        if (githubToken) {
            // Attempt to auto-login with existing token
            this.validateAndLogin(githubToken, true);
        } else {
            console.log('No GitHub token found, user not authenticated');
            this.updateUIForUnauthenticatedUser();
        }
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    /**
     * Set up event listeners for authentication forms
     */
    setupEventListeners() {
        // Login form submission
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        // Close modal buttons
        const closeButtons = document.querySelectorAll('.close-modal');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                document.getElementById('auth-modal').classList.add('hidden');
            });
        });
        
        // Add handler for password toggle button
        const passwordToggleButtons = document.querySelectorAll('.password-toggle');
        passwordToggleButtons.forEach(button => {
            button.addEventListener('click', () => {
                const input = button.parentElement.querySelector('input');
                if (input) {
                    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                    input.setAttribute('type', type);
                    
                    // Toggle icon
                    const icon = button.querySelector('i');
                    if (icon) {
                        icon.classList.toggle('fa-eye');
                        icon.classList.toggle('fa-eye-slash');
                    }
                }
            });
        });
    }
    
    /**
     * Handle login form submission
     */
    async handleLogin() {
        const githubToken = document.getElementById('github-token-input').value.trim();
        
        if (!githubToken) {
            this.showNotification('Please enter a GitHub token', 'error');
            return;
        }
        
        try {
            // Show loading state
            const submitBtn = document.querySelector('#login-form button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Validating...';
                submitBtn.disabled = true;
            }
            
            // Try to validate and login with the token
            const success = await this.validateAndLogin(githubToken);
            
            // Reset button state if validation fails
            if (!success && submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Login';
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error('Login error:', error);
            
            // Reset button state
            const submitBtn = document.querySelector('#login-form button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Login';
                submitBtn.disabled = false;
            }
            
            this.showNotification(error.message, 'error');
        }
    }
    
    /**
     * Validate GitHub token and login the user
     * @param {string} token - GitHub personal access token
     * @param {boolean} isAutoLogin - Whether this is an auto-login attempt
     * @returns {Promise<boolean>} - Whether login was successful
     */
    async validateAndLogin(token, isAutoLogin = false) {
        try {
            console.log('Validating GitHub token...');
            
            // Make a request to GitHub API to validate the token
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API error: ${errorData.message || 'Invalid token'}`);
            }
            
            // Get user data from GitHub
            const userData = await response.json();
            console.log('🔐 GitHub token validation successful');
            
            // Store token in memory for this session
            this.sessionToken = token;
            
            // If "remember token" is checked, also store in localStorage
            const rememberToken = document.getElementById('remember-token')?.checked;
            if (rememberToken) {
                localStorage.setItem('github_token', token);
                console.log('Token saved to localStorage for persistence');
            } else {
                console.log('Token kept in memory only for this session');
            }
            
            // Set authentication state
            this.isAuthenticated = true;
            this.currentUser = {
                username: userData.login,
                name: userData.name || userData.login,
                avatar: userData.avatar_url,
                url: userData.html_url,
                isAdmin: true,
                lastLogin: new Date().toISOString()
            };
            
            // Save minimal user data to localStorage
            localStorage.setItem('adminLoggedIn', 'true');
            localStorage.setItem('userData', JSON.stringify({
                username: this.currentUser.username,
                name: this.currentUser.name,
                lastLogin: this.currentUser.lastLogin
            }));
            
            // Update UI
            this.updateUIForAuthenticatedUser();
            
            // Close the auth modal
            document.getElementById('auth-modal').classList.add('hidden');
            
            // Only show success notification if not auto-login
            if (!isAutoLogin) {
                this.showNotification(`Login successful! Welcome ${this.currentUser.name}!`);
            }
            
            // Make sure GitHub token is loaded in the service
            if (window.githubService) {
                console.log('✅ Loading GitHub token into service');
                window.githubService.token = this.sessionToken; // Directly set the token
                window.githubService.initialLoadData();
            }
            
            // Ensure GitHub Setup tab is visible
            this.ensureGitHubSetupTabVisible();
            
            // Redirect to dashboard
            window.location.hash = '#dashboard';
            
            return true;
        } catch (error) {
            console.error('Token validation error:', error);
            
            if (!isAutoLogin) {
                // Only show error for manual login attempts
                this.showNotification(`Authentication failed: ${error.message}`, 'error');
            } else {
                // For auto-login, just log out silently
                this.handleLogout(true);
            }
            
            return false;
        }
    }
    
    /**
     * Get the current session token
     * @returns {string|null} - The current session token or null if not authenticated
     */
    getSessionToken() {
        return this.sessionToken;
    }
    
    /**
     * Handle user logout
     * @param {boolean} silent - Whether to show notifications
     */
    handleLogout(silent = false) {
        // Clear authentication state
        this.isAuthenticated = false;
        this.currentUser = null;
        this.sessionToken = null;
        
        // Clear localStorage authentication
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('userData');
        localStorage.removeItem('github_token');
        
        // Update UI
        this.updateUIForUnauthenticatedUser();
        
        // Show notification (unless silent)
        if (!silent) {
            this.showNotification('You have been logged out successfully.');
        }
        
        // Redirect to home if on dashboard
        if (window.location.hash === '#dashboard') {
            window.location.hash = '#home';
        }
    }
    
    /**
     * Update the UI for an authenticated user
     */
    updateUIForAuthenticatedUser() {
        console.log('🔄 [AUTH] Updating UI for authenticated user');
        
        // Show dashboard container
        const dashboardContainer = document.getElementById('dashboard-container');
        if (dashboardContainer) {
            dashboardContainer.classList.remove('hidden');
        }
        
        // Show mobile dashboard link
        const mobileDashboardLink = document.getElementById('mobile-dashboard-link');
        if (mobileDashboardLink) {
            mobileDashboardLink.classList.remove('hidden');
        }
        
        // Change login button to logout
        const authButton = document.getElementById('auth-button');
        const signoutButton = document.getElementById('signout-button');
        if (authButton && signoutButton) {
            authButton.classList.add('hidden');
            signoutButton.classList.remove('hidden');
        }
        
        // Change mobile login button to logout
        const mobileAuthButton = document.getElementById('mobile-auth-button');
        const mobileSignoutButton = document.getElementById('mobile-signout-button');
        if (mobileAuthButton && mobileSignoutButton) {
            mobileAuthButton.classList.add('hidden');
            mobileSignoutButton.classList.remove('hidden');
        }
        
        // Show dashboard section
        const dashboardSection = document.getElementById('dashboard');
        if (dashboardSection) {
            dashboardSection.classList.remove('hidden');
        }
        
        // Update user info in dashboard
        const userInfo = document.getElementById('user-info');
        if (userInfo && this.currentUser) {
            userInfo.classList.remove('hidden');
            userInfo.querySelector('span').textContent = `Logged in as ${this.currentUser.username}`;
        }
        
        // Inject GitHub Setup tab into the dashboard navigation as a failsafe
        this.injectGitHubSetupTab();
        
        // Ensure GitHub Setup tab is visible using the dedicated method
        this.ensureGitHubSetupTabVisible();
        
        // Check GitHub token status and show appropriate message
        this.checkGitHubTokenStatus();
    }
    
    /**
     * Update the UI for an unauthenticated user
     */
    updateUIForUnauthenticatedUser() {
        // Hide dashboard container
        const dashboardContainer = document.getElementById('dashboard-container');
        if (dashboardContainer) {
            dashboardContainer.classList.add('hidden');
        }
        
        // Hide mobile dashboard link
        const mobileDashboardLink = document.getElementById('mobile-dashboard-link');
        if (mobileDashboardLink) {
            mobileDashboardLink.classList.add('hidden');
        }
        
        // Change logout button to login
        const authButton = document.getElementById('auth-button');
        const signoutButton = document.getElementById('signout-button');
        if (authButton && signoutButton) {
            authButton.classList.remove('hidden');
            signoutButton.classList.add('hidden');
        }
        
        // Change mobile logout button to login
        const mobileAuthButton = document.getElementById('mobile-auth-button');
        const mobileSignoutButton = document.getElementById('mobile-signout-button');
        if (mobileAuthButton && mobileSignoutButton) {
            mobileAuthButton.classList.remove('hidden');
            mobileSignoutButton.classList.add('hidden');
        }
        
        // Hide dashboard section
        const dashboardSection = document.getElementById('dashboard');
        if (dashboardSection) {
            dashboardSection.classList.add('hidden');
        }
        
        // Hide user info in dashboard
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            userInfo.classList.add('hidden');
            userInfo.querySelector('span').textContent = '';
        }
    }
    
    /**
     * Reset all user data including GitHub token (only for testing/debugging)
     */
    resetUserData() {
        if (confirm('Are you sure you want to reset ALL user data? This will clear GitHub tokens and log you out.')) {
            localStorage.removeItem('adminLoggedIn');
            localStorage.removeItem('userData');
            localStorage.removeItem('github_token');
            localStorage.removeItem('active_github_token');
            localStorage.removeItem('github_setup_complete');
            
            // Clear any other app data that might be in localStorage
            localStorage.removeItem('skills');
            localStorage.removeItem('projects');
            localStorage.removeItem('profile');
            
            // Show notification
            this.showNotification('All user data has been reset. The page will now reload.', 'success');
            
            // Reload the page after a brief delay
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
    }
    
    /**
     * Show a notification message
     */
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `fixed top-20 right-4 z-50 px-6 py-3 rounded-lg transition-all duration-300 animate-fade-in ${
            type === 'error' ? 'bg-red-500/80' : 'bg-green-500/80'
        } text-white`;
        notification.innerHTML = message;
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('opacity-0');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    /**
     * Inject GitHub Setup tab directly into the dashboard navigation
     * This is a failsafe to ensure the tab exists in the DOM
     */
    injectGitHubSetupTab() {
        console.log('🔧 [AUTH] Attempting to inject GitHub Setup tab as failsafe');
        
        // Find the dashboard tabs container
        const tabsContainer = document.querySelector('.dashboard-tab')?.parentElement;
        if (!tabsContainer) {
            console.warn('⚠️ [AUTH] Dashboard tabs container not found, cannot inject tab');
            return;
        }
        
        // Check if the GitHub Setup tab already exists
        const existingTab = document.querySelector('[data-tab="github-setup"]');
        if (existingTab) {
            console.log('✅ [AUTH] GitHub Setup tab already exists, no need to inject');
            return;
        }
        
        // Create the tab button
        const githubTab = document.createElement('button');
        githubTab.className = 'dashboard-tab px-4 py-3 font-medium';
        githubTab.setAttribute('data-tab', 'github-setup');
        githubTab.innerHTML = '<i class="fab fa-github mr-2"></i>GitHub Setup';
        
        // Append it to the dashboard tabs
        tabsContainer.appendChild(githubTab);
        console.log('✅ [AUTH] Injected GitHub Setup tab button');
        
        // Create the content container if it doesn't exist
        const contentContainer = document.querySelector('.dashboard-content')?.parentElement;
        if (contentContainer) {
            const existingContent = document.getElementById('github-setup-tab');
            if (!existingContent) {
                // Create a minimal content area that will be replaced when GitHub Setup initializes
                const contentDiv = document.createElement('div');
                contentDiv.id = 'github-setup-tab';
                contentDiv.className = 'dashboard-content hidden';
                contentDiv.innerHTML = `
                    <div class="p-6">
                        <h3 class="text-2xl font-bold mb-4">GitHub Setup</h3>
                        <p class="mb-4">Loading GitHub setup options...</p>
                        <div class="animate-pulse flex space-x-4">
                            <div class="flex-1 space-y-4 py-1">
                                <div class="h-4 bg-gray-700 rounded w-3/4"></div>
                                <div class="space-y-2">
                                    <div class="h-4 bg-gray-700 rounded"></div>
                                    <div class="h-4 bg-gray-700 rounded w-5/6"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                contentContainer.appendChild(contentDiv);
                console.log('✅ [AUTH] Injected GitHub Setup content placeholder');
            }
        } else {
            console.warn('⚠️ [AUTH] Dashboard content container not found');
        }
        
        // Try to setup dashboard tabs now that we've added the tab
        if (typeof window.setupDashboardTabs === 'function') {
            setTimeout(window.setupDashboardTabs, 100);
        }
    }
    
    /**
     * Check GitHub token status and provide feedback
     */
    checkGitHubTokenStatus() {
        setTimeout(() => {
            if (window.githubService) {
                const token = localStorage.getItem('github_token');
                if (token) {
                    console.log('🔑 GitHub token found after login');
                    
                    // Validate the token
                    window.githubService.validateToken().then(result => {
                        const statusEl = document.getElementById('github-status');
                        if (statusEl) {
                            if (result.valid) {
                                statusEl.innerHTML = `
                                    <p class="text-green-400">
                                        <i class="fas fa-check-circle mr-2"></i>
                                        Connected to GitHub as ${result.username}
                                    </p>
                                `;
                            } else {
                                statusEl.innerHTML = `
                                    <p class="text-yellow-400">
                                        <i class="fas fa-exclamation-circle mr-2"></i>
                                        GitHub token validation failed: ${result.message}
                                    </p>
                                `;
                            }
                        }
                    });
                } else {
                    console.warn('⚠️ No GitHub token found after login');
                    const statusEl = document.getElementById('github-status');
                    if (statusEl) {
                        statusEl.innerHTML = `
                            <p class="text-yellow-400">
                                <i class="fas fa-exclamation-circle mr-2"></i>
                                No GitHub token found. Please login again.
                            </p>
                        `;
                    }
                }
            } else {
                console.error('❌ GitHub service not available after login');
            }
        }, 500); // Small delay to ensure services are initialized
    }
    
    /**
     * Ensure GitHub Setup tab is visible regardless of token state
     * This is called both after login and when initializing the auth state
     */
    ensureGitHubSetupTabVisible() {
        console.log('📋 [AUTH] Explicitly ensuring GitHub Setup tab visibility');
        
        // If DOM is not fully loaded, wait for it
        if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
            console.log('🕒 [AUTH] DOM not ready yet, waiting for load event');
            window.addEventListener('DOMContentLoaded', () => {
                console.log('🌐 [AUTH] DOMContentLoaded fired, now ensuring tab visibility');
                this.ensureGitHubSetupTabVisible();
            });
            return;
        }
        
        // Find the GitHub Setup tab and content
        const setupTab = document.querySelector('[data-tab="github-setup"]');
        const setupContent = document.getElementById('github-setup-tab');
        
        if (setupTab && setupContent) {
            // Make sure the tab button is visible and not hidden
            setupTab.style.display = '';
            setupTab.classList.remove('hidden');
            
            // Approach 1: Use setupDashboardTabs function
            if (typeof window.setupDashboardTabs === 'function') {
                console.log('🔄 [AUTH] Re-initializing dashboard tabs to include GitHub Setup tab');
                window.setupDashboardTabs();
            } else {
                console.warn('⚠️ [AUTH] setupDashboardTabs function not available yet');
                
                // Try again with a delay
                setTimeout(() => {
                    if (typeof window.setupDashboardTabs === 'function') {
                        window.setupDashboardTabs();
                        console.log('✅ [AUTH] Dashboard tabs re-initialized after delay');
                    } else {
                        // Last resort: manually set up tab click handler
                        console.log('🔧 [AUTH] Setting up manual tab click handler');
                        setupTab.addEventListener('click', function() {
                            // Hide all content
                            document.querySelectorAll('.dashboard-content').forEach(content => {
                                content.classList.add('hidden');
                            });
                            
                            // Show GitHub setup content
                            setupContent.classList.remove('hidden');
                            
                            // Set active tab
                            document.querySelectorAll('.dashboard-tab').forEach(tab => {
                                tab.classList.remove('active');
                            });
                            setupTab.classList.add('active');
                        });
                    }
                }, 1000);
            }
        } else {
            console.error('❌ [AUTH] GitHub Setup tab or content not found in the DOM');
            // Attempt to recreate missing tab if needed (logic retained from original code)
        }
    }
}

// Initialize the authentication manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
}); 