class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    // Add password hashing function using SHA-256
    async hashPassword(password) {
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    init() {
        // Add CSRF token
        this.csrfToken = this.generateCSRFToken();
        
        // Add session timeout (30 minutes)
        this.sessionTimeout = 30 * 60 * 1000;
        this.lastActivity = Date.now();
        
        // Check session every minute
        this.sessionChecker = setInterval(() => this.checkSession(), 60000);
        
        // Track user activity
        document.addEventListener('mousemove', () => this.updateLastActivity());
        document.addEventListener('keypress', () => this.updateLastActivity());
        
        // Hide dashboard by default
        const dashboardSection = document.getElementById('dashboard');
        if (dashboardSection) {
            dashboardSection.classList.add('hidden');
        }
        
        this.checkAuthState();
        this.setupEventListeners();
        this.setupDashboardLinks();
    }

    generateCSRFToken() {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    updateLastActivity() {
        this.lastActivity = Date.now();
    }

    checkSession() {
        if (this.currentUser && Date.now() - this.lastActivity > this.sessionTimeout) {
            this.handleLogout();
            this.showNotification('Session expired. Please login again.', 'error');
        }
    }

    cleanup() {
        if (this.sessionChecker) {
            clearInterval(this.sessionChecker);
        }
        document.removeEventListener('mousemove', () => this.updateLastActivity());
        document.removeEventListener('keypress', () => this.updateLastActivity());
    }

    setupDashboardLinks() {
        // Add click handlers to all dashboard links
        const dashboardLinks = document.querySelectorAll('a[href="#dashboard"]');
        dashboardLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                if (!this.currentUser) {
                    e.preventDefault();
                    document.getElementById('auth-modal').classList.remove('hidden');
                }
            });
        });
    }

    checkAuthState() {
        const user = localStorage.getItem('currentUser');
        if (user) {
            this.currentUser = JSON.parse(user);
            this.updateUI();
            
            // Check if admin
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const isAdmin = users.find(u => u.email === this.currentUser.email)?.isAdmin;
            
            if (!isAdmin) {
                // Redirect non-admin users away from dashboard
                if (window.location.hash === '#dashboard') {
                    window.location.hash = '#home';
                }
                document.querySelectorAll('.dashboard-menu-item').forEach(item => {
                    item.style.display = 'none';
                });
            }
        } else {
            // Hide dashboard and menu if not logged in
            const dashboardSection = document.getElementById('dashboard');
            if (dashboardSection) {
                dashboardSection.classList.add('hidden');
            }
            document.querySelectorAll('.dashboard-menu-item').forEach(item => {
                item.style.display = 'none';
            });
        }
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }

        // Signup form
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSignup();
            });
        }

        // Logout buttons
        const logoutButtons = document.querySelectorAll('[id^="signout-button"]');
        logoutButtons.forEach(button => {
            button.addEventListener('click', () => this.handleLogout());
        });

        // Toggle between login and signup forms
        const toggleLogin = document.querySelector('button[onclick*="login-form"]');
        const toggleSignup = document.querySelector('button[onclick*="signup-form"]');
        
        if (toggleLogin) {
            toggleLogin.addEventListener('click', () => {
                document.getElementById('login-form').classList.remove('hidden');
                document.getElementById('signup-form').classList.add('hidden');
            });
        }
        
        if (toggleSignup) {
            toggleSignup.addEventListener('click', () => {
                document.getElementById('signup-form').classList.remove('hidden');
                document.getElementById('login-form').classList.add('hidden');
            });
        }
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        try {
            // Rate limiting check
            const attempts = JSON.parse(sessionStorage.getItem('loginAttempts') || '[]');
            const recentAttempts = attempts.filter(a => Date.now() - a < 15 * 60 * 1000);
            
            if (recentAttempts.length >= 5) {
                this.showNotification('Too many login attempts. Please try again in 15 minutes.', 'error');
                return;
            }

            // Get users from localStorage
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const hashedPassword = await this.hashPassword(password);
            const user = users.find(u => u.email === email && u.password === hashedPassword);

            if (user) {
                // Update last login time
                user.lastLogin = new Date().toISOString();
                localStorage.setItem('users', JSON.stringify(users));
                
                // Set session data
                this.currentUser = { 
                    email: user.email, 
                    name: user.name,
                    isAdmin: user.isAdmin,
                    csrfToken: this.csrfToken
                };
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                sessionStorage.removeItem('loginAttempts');
                
                this.updateUI();
                this.showNotification('Login successful!', 'success');
                document.getElementById('auth-modal').classList.add('hidden');
                
                if (user.isAdmin && !sessionStorage.getItem('github_token')) {
                    document.getElementById('github-token-modal').classList.remove('hidden');
                    this.setupGitHubTokenForm();
                }
                
                if (user.isAdmin) {
                    window.location.hash = '#dashboard';
                } else {
                    window.location.hash = '#home';
                }
            } else {
                // Track failed attempt
                recentAttempts.push(Date.now());
                sessionStorage.setItem('loginAttempts', JSON.stringify(recentAttempts));
                this.showNotification('Invalid email or password', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('An error occurred during login', 'error');
        }
    }

    async handleSignup() {
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;

        // Enhanced validation
        if (!name || !email || !password || !confirmPassword) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            return;
        }

        if (password.length < 8) {
            this.showNotification('Password must be at least 8 characters', 'error');
            return;
        }

        // Enhanced password strength check
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            this.showNotification('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character', 'error');
            return;
        }

        // Enhanced email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showNotification('Please enter a valid email address', 'error');
            return;
        }

        // Get existing users and check for duplicates
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.some(u => u.email === email)) {
            this.showNotification('Email already registered', 'error');
            return;
        }

        // Hash password before storing
        const hashedPassword = await this.hashPassword(password);

        // Add new user with enhanced security
        const newUser = { 
            name, 
            email, 
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        // Auto login after signup
        this.currentUser = { 
            email: newUser.email, 
            name: newUser.name 
        };
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        this.showNotification('Account created successfully!', 'success');
        document.getElementById('auth-modal').classList.add('hidden');
        this.updateUI();
        window.location.hash = '#dashboard';
    }

    handleLogout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.updateUI();
        this.showNotification('Logged out successfully', 'success');
        window.location.hash = '#home';
    }

    updateUI() {
        const dashboardSection = document.getElementById('dashboard');
        const dashboardMenu = document.querySelector('.dashboard-menu-item');
        const authModal = document.getElementById('auth-modal');
        const userInfo = document.getElementById('user-info');
        const authButton = document.getElementById('auth-button');
        const signoutButton = document.getElementById('signout-button');
        const mobileAuthButton = document.getElementById('mobile-auth-button');
        const mobileSignoutButton = document.getElementById('mobile-signout-button');
        const dashboardContainer = document.getElementById('dashboard-container');

        if (this.currentUser) {
            // Hide login buttons, show logout buttons
            authButton.classList.add('hidden');
            signoutButton.classList.remove('hidden');
            mobileAuthButton.classList.add('hidden');
            mobileSignoutButton.classList.remove('hidden');
            
            // Show dashboard elements
            if (dashboardSection) dashboardSection.classList.remove('hidden');
            if (dashboardMenu) dashboardMenu.classList.remove('hidden');
            if (dashboardContainer) dashboardContainer.classList.remove('hidden');
            
            // Update user info
            if (userInfo) {
                userInfo.classList.remove('hidden');
                userInfo.querySelector('span').textContent = this.currentUser.name;
            }
        } else {
            // Show login buttons, hide logout buttons
            authButton.classList.remove('hidden');
            signoutButton.classList.add('hidden');
            mobileAuthButton.classList.remove('hidden');
            mobileSignoutButton.classList.add('hidden');
            
            // Hide dashboard elements
            if (dashboardSection) dashboardSection.classList.add('hidden');
            if (dashboardMenu) dashboardMenu.classList.add('hidden');
            if (dashboardContainer) dashboardContainer.classList.add('hidden');
            if (userInfo) userInfo.classList.add('hidden');
            
            // Close auth modal
            if (authModal) authModal.classList.add('hidden');
        }
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `fixed bottom-4 right-4 glass-effect px-6 py-3 rounded-lg animate-fade-in ${
            type === 'success' ? 'text-green-500' : 'text-red-500'
        }`;
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Add method to check if current user is admin
    isAdmin() {
        if (!this.currentUser) return false;
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        return users.find(u => u.email === this.currentUser.email)?.isAdmin || false;
    }

    setupGitHubTokenForm() {
        const githubTokenForm = document.getElementById('github-token-form');
        const tokenInput = document.getElementById('github-token');
        const submitButton = githubTokenForm.querySelector('button[type="submit"]');
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'mt-2 text-sm';
        tokenInput.parentNode.appendChild(feedbackDiv);

        if (githubTokenForm) {
            githubTokenForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const token = tokenInput.value.trim();
                
                if (!token) {
                    this.showNotification('Please enter a valid token', 'error');
                    return;
                }

                try {
                    submitButton.disabled = true;
                    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Validating...';
                    feedbackDiv.innerHTML = '<span class="text-primary-400"><i class="fas fa-spinner fa-spin mr-2"></i>Validating token...</span>';

                    // Try to set and validate token
                    await window.githubService.setToken(token);
                    const validation = await window.githubService.validateToken();

                    if (validation.valid) {
                        feedbackDiv.innerHTML = '<span class="text-green-500"><i class="fas fa-check-circle mr-2"></i>Token validated successfully!</span>';
                        
                        // Initialize repository
                        feedbackDiv.innerHTML += '<br><span class="text-primary-400"><i class="fas fa-spinner fa-spin mr-2"></i>Initializing repository...</span>';
                        
                        try {
                            // Test file operations
                            await window.githubService.updateFile('data/test.json', { test: true });
                            await window.githubService.getFileContent('data/test.json');
                            
                            feedbackDiv.innerHTML += '<br><span class="text-green-500"><i class="fas fa-check-circle mr-2"></i>Repository access verified!</span>';
                            
                            setTimeout(() => {
                                document.getElementById('github-token-modal').classList.add('hidden');
                                this.showNotification('GitHub token saved and verified successfully!', 'success');
                            }, 1500);
                        } catch (error) {
                            console.error('Repository test failed:', error);
                            feedbackDiv.innerHTML += `<br><span class="text-red-500"><i class="fas fa-exclamation-circle mr-2"></i>Repository access failed: ${error.message}</span>`;
                            sessionStorage.removeItem('github_token');
                        }
                    }
                } catch (error) {
                    console.error('Token validation error:', error);
                    feedbackDiv.innerHTML = `<span class="text-red-500"><i class="fas fa-exclamation-circle mr-2"></i>${error.message}</span>`;
                    sessionStorage.removeItem('github_token');
                } finally {
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Save Token';
                }
            });
        }
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});