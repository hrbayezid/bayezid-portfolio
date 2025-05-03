/**
 * Authentication Manager for Portfolio
 * This file handles user authentication for the admin dashboard
 */

class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.adminCredentials = {
            username: 'bayezid',
            email: 'hrbayezid@gmail.com',
            password: 'Bayezid@420'
        };
        
        // Initialize authentication state
        this.init();
    }
    
    /**
     * Initialize authentication state, check if user is already logged in
     */
    init() {
        console.log('Initializing authentication system...');
        
        // Check if user is already logged in from localStorage
        const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
        const userData = localStorage.getItem('userData');
        
        if (isLoggedIn && userData) {
            try {
                this.currentUser = JSON.parse(userData);
                this.isAuthenticated = true;
                console.log('User already authenticated:', this.currentUser.username);
                
                // Update UI for authenticated user (which will also ensure GitHub tab visibility)
                this.updateUIForAuthenticatedUser();
                
                // Make sure GitHub token is loaded if we're already authenticated
                if (window.githubService) {
                    const token = localStorage.getItem('active_github_token');
                    if (token) {
                        console.log('Reloading existing GitHub token');
                        window.githubService.loadToken();
                    } else {
                        console.log('⚠️ No GitHub token available for authenticated user');
                    }
                    
                    // Explicitly ensure GitHub Setup tab is visible (belt and suspenders approach)
                    setTimeout(() => this.ensureGitHubSetupTabVisible(), 300);
                }
            } catch (error) {
                console.error('Error parsing user data:', error);
                this.handleLogout();
            }
        } else {
            console.log('No active session found');
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
        
        // Signup form submission (if available)
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignup();
            });
        }
        
        // Close modal buttons
        const closeButtons = document.querySelectorAll('.close-modal');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                document.getElementById('auth-modal').classList.add('hidden');
            });
        });
        
        // Auth tab switching
        const loginTab = document.getElementById('login-tab');
        const signupTab = document.getElementById('signup-tab');
        if (loginTab && signupTab) {
            loginTab.addEventListener('click', () => this.switchAuthTab('login'));
            signupTab.addEventListener('click', () => this.switchAuthTab('signup'));
        }
    }
    
    /**
     * Switch between login and signup tabs
     */
    switchAuthTab(tab) {
        const loginTab = document.getElementById('login-tab');
        const signupTab = document.getElementById('signup-tab');
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        
        if (tab === 'login') {
            loginTab.classList.add('active-tab');
            loginTab.classList.remove('text-gray-400');
            signupTab.classList.remove('active-tab');
            signupTab.classList.add('text-gray-400');
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
        } else {
            signupTab.classList.add('active-tab');
            signupTab.classList.remove('text-gray-400');
            loginTab.classList.remove('active-tab');
            loginTab.classList.add('text-gray-400');
            signupForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
        }
    }
    
    /**
     * Handle login form submission
     */
    handleLogin() {
        const usernameOrEmail = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('remember-me')?.checked || false;
        
        console.log('Login attempt:', { usernameOrEmail, password: '********', rememberMe });
        
        // Validate credentials
        const isValid = this.validateCredentials(usernameOrEmail, password);
        
        if (isValid) {
            console.log('🔐 Login successful, updating authentication state');
            
            // Set authentication state
            this.isAuthenticated = true;
            this.currentUser = {
                username: this.adminCredentials.username,
                email: this.adminCredentials.email,
                isAdmin: true,
                lastLogin: new Date().toISOString()
            };
            
            // Save to localStorage
            localStorage.setItem('adminLoggedIn', 'true');
            localStorage.setItem('userData', JSON.stringify(this.currentUser));
            
            // Update UI
            this.updateUIForAuthenticatedUser();
            
            // Close the auth modal
            document.getElementById('auth-modal').classList.add('hidden');
            
            // Show success notification
            this.showNotification('Login successful! Welcome to the admin dashboard.');
            
            // Make sure GitHub token is loaded if available
            if (window.githubService) {
                const token = localStorage.getItem('active_github_token');
                if (token) {
                    console.log('✅ Existing GitHub token found, loading it into service');
                    window.githubService.loadToken();
                    window.githubService.initialLoadData();
                } else {
                    console.log('⚠️ No GitHub token available, but tab should still be shown');
                }
            }
            
            // Force GitHub Setup tab to be visible regardless of token state
            this.ensureGitHubSetupTabVisible();
            
            // Redirect to dashboard
            window.location.hash = '#dashboard';
        } else {
            this.showNotification('Invalid username/email or password.', 'error');
        }
    }
    
    /**
     * Validate user credentials against stored admin credentials
     */
    validateCredentials(usernameOrEmail, password) {
        return (
            (usernameOrEmail === this.adminCredentials.username || 
             usernameOrEmail === this.adminCredentials.email) && 
            password === this.adminCredentials.password
        );
    }
    
    /**
     * Handle user logout
     */
    handleLogout() {
        // Clear authentication state
        this.isAuthenticated = false;
        this.currentUser = null;
        
        // Clear localStorage authentication
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('userData');
        
        // Note: We don't remove GitHub token on logout so it persists
        // Only clear GitHub token if specifically requested
        
        // Update UI
        this.updateUIForUnauthenticatedUser();
        
        // Show notification
        this.showNotification('You have been logged out successfully.');
        
        // Redirect to home if on dashboard
        if (window.location.hash === '#dashboard') {
            window.location.hash = '#home';
        }
    }
    
    /**
     * Update the UI for an authenticated user
     */
    updateUIForAuthenticatedUser() {
        console.log('🔄 Updating UI for authenticated user');
        
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
        
        // Ensure GitHub Setup tab is visible using the dedicated method
        this.ensureGitHubSetupTabVisible();
        
        // Check GitHub token status and show appropriate message
        this.checkGitHubTokenStatus();
    }
    
    /**
     * Check GitHub token status and provide feedback
     */
    checkGitHubTokenStatus() {
        setTimeout(() => {
            if (window.githubService) {
                const token = localStorage.getItem('active_github_token');
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
                                No GitHub token set. Go to GitHub Setup tab to configure.
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
     * Ensure GitHub Setup tab is visible regardless of token state
     * This is called both after login and when initializing the auth state
     */
    ensureGitHubSetupTabVisible() {
        console.log('📋 Explicitly ensuring GitHub Setup tab visibility');
        
        // Find the GitHub Setup tab and content
        const setupTab = document.querySelector('[data-tab="github-setup"]');
        const setupContent = document.getElementById('github-setup-tab');
        
        if (setupTab && setupContent) {
            // Make sure the tab button is visible and not hidden
            setupTab.style.display = '';
            setupTab.classList.remove('hidden');
            
            console.log('✅ GitHub Setup tab made visible in the DOM');
            
            // Re-initialize dashboard tabs to ensure proper rendering
            if (typeof window.setupDashboardTabs === 'function') {
                console.log('🔄 Re-initializing dashboard tabs to include GitHub Setup tab');
                window.setupDashboardTabs();
            } else {
                console.warn('⚠️ setupDashboardTabs function not available yet');
                // Try again with a delay if the function isn't available yet
                setTimeout(() => {
                    if (typeof window.setupDashboardTabs === 'function') {
                        window.setupDashboardTabs();
                        console.log('✅ Dashboard tabs re-initialized after delay');
                    }
                }, 500);
            }
            
            // Log for debugging
            console.log('GitHub Setup Tab:', setupTab);
            console.log('GitHub Setup Content:', setupContent);
        } else {
            console.error('❌ GitHub Setup tab or content not found in the DOM');
            // Log the available tabs and content areas for debugging
            console.log('Available tabs:', 
                Array.from(document.querySelectorAll('.dashboard-tab'))
                    .map(tab => `${tab.textContent.trim()} (${tab.getAttribute('data-tab')})`));
            
            console.log('Available content areas:', 
                Array.from(document.querySelectorAll('.dashboard-content'))
                    .map(content => content.id));
        }
    }
}

// Initialize the authentication manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
}); 