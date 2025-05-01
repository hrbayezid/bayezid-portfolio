class AuthManager {
    constructor() {
        this.currentUser = null;
        this.ADMIN_EMAIL = 'hrbayezid@gmail.com';
        this.AUTO_VERIFY_ADMIN = true;
        this.init();
    }

    // Storage helper methods
    getFromStorage(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.error('Error accessing localStorage:', e);
            return null;
        }
    }

    saveToStorage(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.error('Error saving to localStorage:', e);
            this.showNotification('Failed to save data. Please check your browser settings.', 'error');
            return false;
        }
    }

    removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Error removing from localStorage:', e);
            return false;
        }
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
        const user = this.getFromStorage('currentUser');
        if (user) {
            try {
            this.currentUser = JSON.parse(user);
            this.updateUI();
            
            // Check if admin
                const isAdmin = this.currentUser.isAdmin;
            
            if (!isAdmin) {
                // Redirect non-admin users away from dashboard
                if (window.location.hash === '#dashboard') {
                    window.location.hash = '#home';
                }
                document.querySelectorAll('.dashboard-menu-item').forEach(item => {
                    item.style.display = 'none';
                });
                } else {
                    // For admin users, handle GitHub token
                    const activeToken = this.getFromStorage('active_github_token');
                    const userToken = this.getFromStorage('github_token_' + this.currentUser.email);
                    
                    if (!activeToken && !userToken) {
                        // No tokens available - need to prompt for token unless auto-verified admin
                        if (!(this.AUTO_VERIFY_ADMIN && this.currentUser.email === this.ADMIN_EMAIL)) {
                            setTimeout(() => {
                                document.getElementById('github-token-modal').classList.remove('hidden');
                                this.setupGitHubTokenForm();
                            }, 1000);
                        } else {
                            // Auto-verify admin by setting a placeholder token
                            this.saveToStorage('active_github_token', 'admin_auto_verified');
                        }
                    } else if (!activeToken && userToken) {
                        // User has a saved token but no active token - restore it
                        this.saveToStorage('active_github_token', userToken);
                        
                        // Initialize GitHub service with the token
                        if (window.githubService) {
                            window.githubService.setToken(userToken);
                        }
                    } else if (activeToken) {
                        // Already have an active token, make sure GitHub service is using it
                        if (window.githubService) {
                            window.githubService.setToken(activeToken);
                        }
                    }
                }
            } catch (error) {
                console.error('Error parsing user data:', error);
                this.removeFromStorage('currentUser');
                this.showNotification('Session data corrupted. Please login again.', 'error');
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

        // Forgot token link
        const forgotTokenLinks = document.querySelectorAll('.forgot-token-link');
        forgotTokenLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.currentUser) {
                    document.getElementById('github-token-modal').classList.remove('hidden');
                    this.setupGitHubTokenForm();
                } else {
                    this.showNotification('Please login first', 'error');
                }
            });
        });

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

        // Add GitHub token field to signup form if not present
        const signupFormContent = document.getElementById('signup-form');
        if (signupFormContent && !document.getElementById('signup-github-token')) {
            const passwordField = signupFormContent.querySelector('input[name="confirm-password"]').closest('div');
            
            const tokenField = document.createElement('div');
            tokenField.className = 'space-y-1';
            tokenField.innerHTML = `
                <label for="signup-github-token" class="block text-sm font-medium">GitHub Token <span class="text-xs text-gray-400">(Optional for non-admin users)</span></label>
                <input id="signup-github-token" type="password" class="w-full p-2 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="GitHub Personal Access Token">
                <p class="text-xs text-gray-400">You can <a href="https://github.com/settings/tokens/new" target="_blank" class="text-primary-400 hover:underline">create a token here</a> with 'repo' scope</p>
            `;
            
            passwordField.parentNode.insertBefore(tokenField, passwordField.nextSibling);
        }

        // Add GitHub token field to login form if not present
        const loginFormContent = document.getElementById('login-form');
        if (loginFormContent && !document.getElementById('login-github-token')) {
            const passwordField = loginFormContent.querySelector('input[type="password"]').closest('div');
            
            const tokenField = document.createElement('div');
            tokenField.className = 'space-y-1';
            tokenField.innerHTML = `
                <label for="login-github-token" class="block text-sm font-medium">GitHub Token <span class="text-xs text-gray-400">(Only if token changed/lost)</span></label>
                <input id="login-github-token" type="password" class="w-full p-2 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Only needed if token changed">
                <p class="text-xs text-gray-400">Leave empty if you still have your original token</p>
            `;
            
            passwordField.parentNode.insertBefore(tokenField, passwordField.nextSibling);
        }
    }

    // Add helper method for form field validation feedback
    showFieldValidation(field, isValid, message) {
        // Get the parent container and remove any existing feedback
        const container = field.closest('div');
        const existingFeedback = container.querySelector('.validation-feedback');
        if (existingFeedback) existingFeedback.remove();
        
        // Clear existing validation styles
        field.classList.remove('ring-2', 'ring-red-500', 'ring-yellow-500', 'ring-green-500', 'animate-shake');
        
        if (message) {
            // Create feedback element
            const feedback = document.createElement('div');
            feedback.className = `validation-feedback text-xs mt-1 flex items-center ${
                isValid ? 'text-green-500' : 'text-red-500'
            }`;
            feedback.innerHTML = `
                <i class="fas fa-${isValid ? 'check-circle' : 'exclamation-circle'} mr-1"></i>
                <span>${message}</span>
            `;
            container.appendChild(feedback);
        }
        
        // Apply validation styles
        if (isValid === null) return; // No validation to show
        
        if (isValid) {
            field.classList.add('ring-2', 'ring-green-500');
        } else {
            field.classList.add('ring-2', 'ring-red-500', 'animate-shake');
            // Remove animation class after it completes to allow it to be re-applied
            setTimeout(() => field.classList.remove('animate-shake'), 1000);
        }
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const githubToken = document.getElementById('login-github-token')?.value || '';
        const rememberMe = document.getElementById('remember-me')?.checked || false;

        // Validate required fields
        let isValid = true;
        if (!email) {
            this.showFieldValidation(document.getElementById('login-email'), false, 'Email is required');
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            this.showFieldValidation(document.getElementById('login-email'), false, 'Please enter a valid email');
            isValid = false;
        } else {
            this.showFieldValidation(document.getElementById('login-email'), true, null);
        }

        if (!password) {
            this.showFieldValidation(document.getElementById('login-password'), false, 'Password is required');
            isValid = false;
        } else {
            this.showFieldValidation(document.getElementById('login-password'), true, null);
        }

        if (!isValid) {
            this.showNotification('Please correct the errors in the form', 'error');
            return;
        }

        try {
            // Disable the login button and show loading state
            const loginButton = document.querySelector('#login-form button[type="submit"]');
            const originalButtonText = loginButton.innerHTML;
            loginButton.disabled = true;
            loginButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Logging in...';
            
            // Rate limiting check
            const attempts = JSON.parse(sessionStorage.getItem('loginAttempts') || '[]');
            const recentAttempts = attempts.filter(a => Date.now() - a < 15 * 60 * 1000);
            
            if (recentAttempts.length >= 5) {
                this.showNotification('Too many login attempts. Please try again in 15 minutes.', 'error');
                loginButton.disabled = false;
                loginButton.innerHTML = originalButtonText;
                return;
            }

            // Get users from localStorage
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const hashedPassword = await this.hashPassword(password);
            const user = users.find(u => u.email === email && u.password === hashedPassword);

            if (user) {
                // Update last login time
                user.lastLogin = new Date().toISOString();
                
                // Check if we have a new GitHub token that needs to be saved
                if (githubToken) {
                    try {
                        // Show validating token state
                        this.showFieldValidation(document.getElementById('login-github-token'), null, 'Validating token...');
                        
                        // Validate the token before saving
                        await window.githubService.setToken(githubToken);
                        const validation = await window.githubService.validateToken();
                        
                        if (validation.valid) {
                            // Store the token in localStorage for this user
                            localStorage.setItem('github_token_' + email, githubToken);
                            // Set as active token
                            localStorage.setItem('active_github_token', githubToken);
                            
                            // Update token reference in user record
                            user.hasToken = true;
                            this.showFieldValidation(document.getElementById('login-github-token'), true, 'Token validated successfully!');
                            this.showNotification('New GitHub token saved successfully!', 'success');
                        } else {
                            this.showFieldValidation(document.getElementById('login-github-token'), false, 'Invalid GitHub token');
                            this.showNotification('Invalid GitHub token, but login successful', 'warning');
                        }
                    } catch (error) {
                        console.error('Token validation error:', error);
                        this.showFieldValidation(document.getElementById('login-github-token'), false, 'Token validation failed');
                        this.showNotification('Invalid GitHub token, but login successful', 'warning');
                    }
                } else if (user.hasToken) {
                    // User has a saved token, restore it as the active token
                    try {
                        const savedToken = localStorage.getItem('github_token_' + email);
                        if (savedToken) {
                            localStorage.setItem('active_github_token', savedToken);
                            await window.githubService.setToken(savedToken);
                        } else if (this.AUTO_VERIFY_ADMIN && email === this.ADMIN_EMAIL) {
                            // Auto-verify admin by setting a placeholder token
                            localStorage.setItem('active_github_token', 'admin_auto_verified');
                        }
                    } catch (error) {
                        console.error('Error setting saved token:', error);
                        // Continue with login even if token retrieval fails
                    }
                }
                
                // Save updated user data
                localStorage.setItem('users', JSON.stringify(users));
                
                // Set session data for current user
                this.currentUser = { 
                    email: user.email, 
                    name: user.name,
                    isAdmin: user.isAdmin || email === this.ADMIN_EMAIL,
                    hasToken: user.hasToken,
                    csrfToken: this.csrfToken
                };
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                sessionStorage.removeItem('loginAttempts');
                
                // Show success animation before redirecting
                loginButton.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Success!';
                loginButton.classList.remove('from-primary-500', 'to-purple-500');
                loginButton.classList.add('from-green-500', 'to-green-600');
                
                setTimeout(() => {
                this.updateUI();
                    this.showNotification(`Welcome back, ${user.name}!`, 'success');
                document.getElementById('auth-modal').classList.add('hidden');
                
                    // Special check for admin who needs to set up token
                    if (this.currentUser.isAdmin && !this.currentUser.hasToken) {
                        if (!(this.AUTO_VERIFY_ADMIN && email === this.ADMIN_EMAIL)) {
                    document.getElementById('github-token-modal').classList.remove('hidden');
                    this.setupGitHubTokenForm();
                        }
                }
                
                    // Redirect based on user role
                    if (this.currentUser.isAdmin) {
                    window.location.hash = '#dashboard';
                } else {
                    window.location.hash = '#home';
                }
                    
                    // Reset button
                    loginButton.disabled = false;
                    loginButton.innerHTML = originalButtonText;
                    loginButton.classList.remove('from-green-500', 'to-green-600');
                    loginButton.classList.add('from-primary-500', 'to-purple-500');
                }, 1000);
            } else {
                // Track failed attempt
                recentAttempts.push(Date.now());
                sessionStorage.setItem('loginAttempts', JSON.stringify(recentAttempts));
                
                // Show error animation
                loginButton.innerHTML = '<i class="fas fa-times-circle mr-2"></i>Failed';
                loginButton.classList.remove('from-primary-500', 'to-purple-500');
                loginButton.classList.add('from-red-500', 'to-red-600');
                
                // Show field errors
                this.showFieldValidation(document.getElementById('login-email'), false, 'Invalid email or password');
                this.showFieldValidation(document.getElementById('login-password'), false, null);
                
                setTimeout(() => {
                this.showNotification('Invalid email or password', 'error');
                    loginButton.disabled = false;
                    loginButton.innerHTML = originalButtonText;
                    loginButton.classList.remove('from-red-500', 'to-red-600');
                    loginButton.classList.add('from-primary-500', 'to-purple-500');
                }, 1000);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('An error occurred during login', 'error');
            
            // Reset login button
            const loginButton = document.querySelector('#login-form button[type="submit"]');
            loginButton.disabled = false;
            loginButton.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Login';
            loginButton.classList.remove('from-red-500', 'to-red-600');
            loginButton.classList.add('from-primary-500', 'to-purple-500');
        }
    }

    async handleSignup() {
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const githubToken = document.getElementById('signup-github-token')?.value || '';
        const termsAgreed = document.getElementById('terms-agree')?.checked || false;

        // Comprehensive validation
        let isValid = true;
        
        // Validate name
        if (!name) {
            this.showFieldValidation(document.getElementById('signup-name'), false, 'Name is required');
            isValid = false;
        } else if (name.length < 3) {
            this.showFieldValidation(document.getElementById('signup-name'), false, 'Name must be at least 3 characters');
            isValid = false;
        } else {
            this.showFieldValidation(document.getElementById('signup-name'), true, null);
        }
        
        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            this.showFieldValidation(document.getElementById('signup-email'), false, 'Email is required');
            isValid = false;
        } else if (!emailRegex.test(email)) {
            this.showFieldValidation(document.getElementById('signup-email'), false, 'Please enter a valid email address');
            isValid = false;
        } else {
            // Check for duplicate email
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            if (users.some(u => u.email === email)) {
                this.showFieldValidation(document.getElementById('signup-email'), false, 'Email already registered');
                isValid = false;
            } else {
                this.showFieldValidation(document.getElementById('signup-email'), true, null);
            }
        }
        
        // Validate password
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!password) {
            this.showFieldValidation(document.getElementById('signup-password'), false, 'Password is required');
            isValid = false;
        } else if (password.length < 8) {
            this.showFieldValidation(document.getElementById('signup-password'), false, 'Password must be at least 8 characters');
            isValid = false;
        } else if (!passwordRegex.test(password)) {
            this.showFieldValidation(document.getElementById('signup-password'), false, 'Password must meet all requirements');
            isValid = false;
        } else {
            this.showFieldValidation(document.getElementById('signup-password'), true, 'Strong password!');
        }
        
        // Validate password confirmation
        if (!confirmPassword) {
            this.showFieldValidation(document.getElementById('signup-confirm-password'), false, 'Please confirm your password');
            isValid = false;
        } else if (password !== confirmPassword) {
            this.showFieldValidation(document.getElementById('signup-confirm-password'), false, 'Passwords do not match');
            isValid = false;
        } else if (password === confirmPassword && passwordRegex.test(password)) {
            this.showFieldValidation(document.getElementById('signup-confirm-password'), true, 'Passwords match');
        }
        
        // Validate terms agreement
        if (!termsAgreed) {
            this.showNotification('You must agree to the Terms & Conditions', 'warning');
            isValid = false;
        }
        
        if (!isValid) {
            this.showNotification('Please correct the errors in the form', 'error');
            return;
        }

        try {
            // Disable the signup button and show loading state
            const signupButton = document.querySelector('#signup-form button[type="submit"]');
            const originalButtonText = signupButton.innerHTML;
            signupButton.disabled = true;
            signupButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating account...';
            
            // Check if this is admin email
            const isAdmin = email === this.ADMIN_EMAIL;
            let hasToken = false;
            let tokenValidationResult = null;

            // If GitHub token provided, validate it for admin role
            if (githubToken || isAdmin) {
                try {
                    // Admin requires token except for the auto-verified admin email
                    if (isAdmin && !githubToken && this.AUTO_VERIFY_ADMIN) {
                        // Auto-verify the admin account
                        hasToken = true;
                        localStorage.setItem('active_github_token', 'admin_auto_verified');
                        this.showFieldValidation(document.getElementById('signup-github-token'), true, 'Admin auto-verified');
                    } else if (githubToken) {
                        // Show validating state
                        this.showFieldValidation(document.getElementById('signup-github-token'), null, 'Validating token...');
                        
                        // Validate the token
                        await window.githubService.setToken(githubToken);
                        tokenValidationResult = await window.githubService.validateToken();
                        
                        if (tokenValidationResult.valid) {
                            hasToken = true;
                            localStorage.setItem('github_token_' + email, githubToken);
                            this.showFieldValidation(document.getElementById('signup-github-token'), true, 'Token validated!');
                        } else {
                            if (isAdmin) {
                                this.showFieldValidation(document.getElementById('signup-github-token'), false, 'Invalid token. Admin requires valid token.');
                                signupButton.disabled = false;
                                signupButton.innerHTML = originalButtonText;
                                this.showNotification('Invalid GitHub token. Admin account requires a valid token.', 'error');
            return;
                            } else {
                                this.showFieldValidation(document.getElementById('signup-github-token'), false, 'Invalid token. Account will be created without admin privileges.');
                                this.showNotification('Invalid GitHub token. Account will be created without admin privileges.', 'warning');
                            }
                        }
                    } else if (isAdmin) {
                        this.showFieldValidation(document.getElementById('signup-github-token'), false, 'Admin account requires a token');
                        signupButton.disabled = false;
                        signupButton.innerHTML = originalButtonText;
                        this.showNotification('Admin account requires a GitHub token.', 'error');
                        return;
                    }
                } catch (error) {
                    console.error('Token validation error:', error);
                    this.showFieldValidation(document.getElementById('signup-github-token'), false, 'Token validation failed');
                    
                    if (isAdmin) {
                        signupButton.disabled = false;
                        signupButton.innerHTML = originalButtonText;
                        this.showNotification('GitHub token validation failed. Admin account requires a valid token.', 'error');
            return;
                    } else {
                        this.showNotification('GitHub token validation failed. Account will be created without admin privileges.', 'warning');
                    }
                }
        }

        // Hash password before storing
        const hashedPassword = await this.hashPassword(password);

        // Add new user with enhanced security
        const newUser = { 
            name, 
            email, 
            password: hashedPassword,
                isAdmin: isAdmin,
                hasToken: hasToken,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        
            // Get existing users and add new user
            const users = JSON.parse(localStorage.getItem('users') || '[]');
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        // Auto login after signup
        this.currentUser = { 
            email: newUser.email, 
                name: newUser.name,
                isAdmin: newUser.isAdmin,
                hasToken: newUser.hasToken,
                csrfToken: this.csrfToken
        };
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
            // Show success animation
            signupButton.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Account created!';
            signupButton.classList.remove('from-primary-500', 'to-purple-500');
            signupButton.classList.add('from-green-500', 'to-green-600');
            
            setTimeout(() => {
                this.showNotification(`Welcome, ${name}! Your account was created successfully.`, 'success');
        document.getElementById('auth-modal').classList.add('hidden');
        this.updateUI();
                
                if (isAdmin) {
                    if (!hasToken && !this.AUTO_VERIFY_ADMIN) {
                        // Need to get GitHub token for admin
                        document.getElementById('github-token-modal').classList.remove('hidden');
                        this.setupGitHubTokenForm();
                    }
        window.location.hash = '#dashboard';
                } else {
                    window.location.hash = '#home';
                }
                
                // Reset button state
                signupButton.disabled = false;
                signupButton.innerHTML = originalButtonText;
                signupButton.classList.remove('from-green-500', 'to-green-600');
                signupButton.classList.add('from-primary-500', 'to-purple-500');
            }, 1500);
            
        } catch (error) {
            console.error('Signup error:', error);
            this.showNotification('An error occurred during signup', 'error');
            
            // Reset signup button
            const signupButton = document.querySelector('#signup-form button[type="submit"]');
            signupButton.disabled = false;
            signupButton.innerHTML = 'Sign Up';
        }
    }

    handleLogout() {
        // Only clear the active token on logout, preserving the saved token for next login
        localStorage.removeItem('active_github_token');
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
            
            // Show dashboard elements for admin
            if (this.currentUser.isAdmin) {
            if (dashboardSection) dashboardSection.classList.remove('hidden');
            if (dashboardMenu) dashboardMenu.classList.remove('hidden');
            if (dashboardContainer) dashboardContainer.classList.remove('hidden');
            }
            
            // Update user info
            if (userInfo) {
                userInfo.classList.remove('hidden');
                userInfo.querySelector('span').textContent = this.currentUser.name;
            }
            
            // Add token reset option in dashboard
            if (this.currentUser.isAdmin && dashboardContainer) {
                if (!document.getElementById('reset-token-link')) {
                    const resetTokenLink = document.createElement('a');
                    resetTokenLink.id = 'reset-token-link';
                    resetTokenLink.href = '#';
                    resetTokenLink.className = 'block px-4 py-2 text-gray-300 hover:bg-white/10 hover:text-white transition';
                    resetTokenLink.innerHTML = '<i class="fas fa-key mr-2"></i>Update GitHub Token';
                    resetTokenLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        document.getElementById('github-token-modal').classList.remove('hidden');
                        this.setupGitHubTokenForm();
                    });
                    
                    const dashboardMenu = document.getElementById('dashboard-menu');
                    if (dashboardMenu) {
                        dashboardMenu.appendChild(resetTokenLink);
                    }
                }
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

    showNotification(message, type = 'info') {
        // Remove existing notifications of the same type
        document.querySelectorAll(`.notification-${type}`).forEach(note => {
            note.classList.add('animate-fade-out');
            setTimeout(() => note.remove(), 300);
        });
        
        const notification = document.createElement('div');
        notification.className = `notification-${type} fixed bottom-4 right-4 glass-effect px-6 py-4 rounded-xl animate-fade-in shadow-lg flex items-center space-x-3 max-w-md z-50 border border-white/10`;
        
        // Set notification color based on type
        let iconClass, bgClass, iconColor;
        
        switch(type) {
            case 'success':
                iconClass = 'fa-check-circle';
                bgClass = 'bg-gradient-to-r from-green-500/10 to-green-600/10';
                iconColor = 'text-green-500';
                break;
            case 'warning':
                iconClass = 'fa-exclamation-triangle';
                bgClass = 'bg-gradient-to-r from-yellow-500/10 to-yellow-600/10';
                iconColor = 'text-yellow-500';
                break;
            case 'error':
                iconClass = 'fa-exclamation-circle';
                bgClass = 'bg-gradient-to-r from-red-500/10 to-red-600/10';
                iconColor = 'text-red-500';
                break;
            default:
                iconClass = 'fa-info-circle';
                bgClass = 'bg-gradient-to-r from-primary-500/10 to-primary-600/10';
                iconColor = 'text-primary-400';
        }
        
        notification.classList.add(bgClass);
        
        notification.innerHTML = `
            <div class="${iconColor} text-xl">
                <i class="fas ${iconClass}"></i>
            </div>
            <div class="flex-1 text-sm">
                ${message}
            </div>
            <button class="text-gray-400 hover:text-white transition-colors">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add close button functionality
        notification.querySelector('button').addEventListener('click', () => {
            notification.classList.add('animate-fade-out');
            setTimeout(() => notification.remove(), 300);
        });
        
        document.body.appendChild(notification);
        
        // Progress bar animation
        const progressBar = document.createElement('div');
        progressBar.className = 'absolute bottom-0 left-0 h-1 bg-white/20 w-full rounded-b-xl overflow-hidden';
        
        const progress = document.createElement('div');
        progress.className = `h-full ${type === 'success' ? 'bg-green-500' : type === 'warning' ? 'bg-yellow-500' : type === 'error' ? 'bg-red-500' : 'bg-primary-500'}`;
        progress.style.width = '100%';
        progress.style.transition = 'width 3s linear';
        
        progressBar.appendChild(progress);
        notification.appendChild(progressBar);
        
        // Animate progress bar to 0
        setTimeout(() => {
            progress.style.width = '0';
        }, 50);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('animate-fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3500);
    }

    // Add method to check if current user is admin
    isAdmin() {
        if (!this.currentUser) return false;
        return this.currentUser.isAdmin || this.currentUser.email === this.ADMIN_EMAIL;
    }

    setupGitHubTokenForm() {
        const githubTokenForm = document.getElementById('github-token-form');
        const tokenInput = document.getElementById('github-token');
        const submitButton = document.querySelector('#github-token-form button');
        
        // Clear previous feedback
        const existingFeedback = document.getElementById('token-feedback');
        if (existingFeedback) {
            existingFeedback.innerHTML = '';
        }
        
        // Add cancel button if not present
        if (!document.getElementById('cancel-token-validation')) {
            const cancelButton = document.createElement('button');
            cancelButton.id = 'cancel-token-validation';
            cancelButton.type = 'button';
            cancelButton.className = 'px-4 py-2 border border-red-400 text-red-400 rounded-lg mt-2 hidden hover:bg-red-400/10 transition-colors';
            cancelButton.innerHTML = '<i class="fas fa-times mr-2"></i>Cancel Validation';
            cancelButton.addEventListener('click', () => {
                // Reset the token validation state
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-key mr-2"></i><span>Save Token</span>';
                existingFeedback.innerHTML = '<span class="text-yellow-500"><i class="fas fa-exclamation-triangle mr-2"></i>Token validation cancelled</span>';
                
                // Hide cancel button
                cancelButton.classList.add('hidden');
                
                this.showNotification('Token validation cancelled', 'warning');
            });
            
            // Insert after the feedback area
            if (existingFeedback.nextSibling) {
                existingFeedback.parentNode.insertBefore(cancelButton, existingFeedback.nextSibling);
            } else {
                existingFeedback.parentNode.appendChild(cancelButton);
            }
        }

        if (githubTokenForm) {
            // Remove any existing listeners to prevent duplicates
            const clonedForm = githubTokenForm.cloneNode(true);
            githubTokenForm.parentNode.replaceChild(clonedForm, githubTokenForm);
            
            // Re-assign variables after cloning
            const form = document.getElementById('github-token-form');
            const submitBtn = form.querySelector('button');
            const tokenInp = document.getElementById('github-token');
            const feedback = document.getElementById('token-feedback');
            const cancelBtn = document.getElementById('cancel-token-validation');
            
            form.addEventListener('submit', async (e) => {
                // Always prevent form from submitting to avoid page navigation
                e.preventDefault();
                
                const token = tokenInp.value.trim();
                
                if (!token) {
                    this.showNotification('Please enter a valid token', 'error');
                    feedback.innerHTML = '<span class="text-red-500"><i class="fas fa-exclamation-circle mr-2"></i>Please enter a valid token</span>';
                    return;
                }

                try {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i><span>Validating...</span>';
                    feedback.innerHTML = '<div class="space-y-2"><div class="flex items-center"><span class="text-primary-400"><i class="fas fa-spinner fa-spin mr-2"></i>Validating token...</span></div><div class="w-full bg-white/10 rounded-full h-1.5 mt-1"><div class="token-validation-progress bg-primary-500 h-1.5 rounded-full" style="width: 25%"></div></div></div>';
                    
                    // Show cancel button
                    cancelBtn.classList.remove('hidden');
                    
                    // Animate progress bar
                    const progressBar = document.querySelector('.token-validation-progress');
                    setTimeout(() => { progressBar.style.width = '50%'; }, 500);

                    // Auto-approve for admin if enabled
                    if (this.AUTO_VERIFY_ADMIN && this.currentUser?.email === this.ADMIN_EMAIL) {
                        // Simulate validation
                        progressBar.style.width = '100%';
                        setTimeout(() => {
                            feedback.innerHTML = '<div class="space-y-2"><span class="text-green-500 flex items-center"><i class="fas fa-check-circle mr-2"></i>Token automatically verified for admin account!</span><div class="w-full bg-white/10 rounded-full h-1.5 mt-1"><div class="bg-green-500 h-1.5 rounded-full" style="width: 100%"></div></div></div>';
                            
                            // Store token in both locations
                            this.saveToStorage('active_github_token', token);
                            this.saveToStorage('github_token_' + this.currentUser.email, token);
                            
                            // Update user record
                            const users = JSON.parse(this.getFromStorage('users') || '[]');
                            const user = users.find(u => u.email === this.currentUser.email);
                            if (user) {
                                user.hasToken = true;
                                this.saveToStorage('users', JSON.stringify(users));
                                
                                // Update current user
                                this.currentUser.hasToken = true;
                                this.saveToStorage('currentUser', JSON.stringify(this.currentUser));
                            }
                            
                            submitBtn.innerHTML = '<i class="fas fa-check mr-2"></i><span>Token Verified</span>';
                            submitBtn.classList.remove('from-primary-500', 'to-purple-500');
                            submitBtn.classList.add('from-green-500', 'to-green-600');
                            
                            // Hide cancel button
                            cancelBtn.classList.add('hidden');
                            
                            setTimeout(() => {
                                document.getElementById('github-token-modal').classList.add('hidden');
                                this.showNotification('GitHub token saved successfully!', 'success');
                                submitBtn.innerHTML = '<i class="fas fa-key mr-2"></i><span>Save Token</span>';
                                submitBtn.classList.remove('from-green-500', 'to-green-600');
                                submitBtn.classList.add('from-primary-500', 'to-purple-500');
                                submitBtn.disabled = false;
                            }, 1500);
                        }, 1000);
                        
                        return;
                    }

                    // Normal validation flow
                    try {
                    await window.githubService.setToken(token);
                        progressBar.style.width = '75%';
                    const validation = await window.githubService.validateToken();
    
                        // Hide cancel button
                        cancelBtn.classList.add('hidden');

                    if (validation.valid) {
                            progressBar.style.width = '100%';
                            progressBar.classList.remove('bg-primary-500');
                            progressBar.classList.add('bg-green-500');
                            feedback.innerHTML = '<div class="space-y-2"><span class="text-green-500 flex items-center"><i class="fas fa-check-circle mr-2"></i>Token validated successfully!</span><div class="w-full bg-white/10 rounded-full h-1.5 mt-1"><div class="bg-green-500 h-1.5 rounded-full" style="width: 100%"></div></div></div>';
                            
                            // Store this token for the current user in both locations
                            if (this.currentUser) {
                                this.saveToStorage('active_github_token', token);
                                this.saveToStorage('github_token_' + this.currentUser.email, token);
                                
                                // Update user record
                                const users = JSON.parse(this.getFromStorage('users') || '[]');
                                const user = users.find(u => u.email === this.currentUser.email);
                                if (user) {
                                    user.hasToken = true;
                                    this.saveToStorage('users', JSON.stringify(users));
                                    
                                    // Update current user
                                    this.currentUser.hasToken = true;
                                    this.saveToStorage('currentUser', JSON.stringify(this.currentUser));
                                }
                            }
                        
                        // Initialize repository
                            feedback.innerHTML += '<div class="mt-2 py-2 px-3 rounded-lg bg-white/5"><span class="text-primary-400 flex items-center"><i class="fas fa-spinner fa-spin mr-2"></i>Initializing repository access...</span></div>';
                        
                        try {
                            // Test file operations
                                await window.githubService.updateFile('data/test.json', { test: true, timestamp: new Date().toISOString() });
                            await window.githubService.getFileContent('data/test.json');
                            
                                feedback.querySelector('div.mt-2').innerHTML = '<span class="text-green-500 flex items-center"><i class="fas fa-check-circle mr-2"></i>Repository access verified!</span>';
                                
                                submitBtn.innerHTML = '<i class="fas fa-check mr-2"></i><span>Token Verified</span>';
                                submitBtn.classList.remove('from-primary-500', 'to-purple-500');
                                submitBtn.classList.add('from-green-500', 'to-green-600');
                            
                            setTimeout(() => {
                                document.getElementById('github-token-modal').classList.add('hidden');
                                this.showNotification('GitHub token saved and verified successfully!', 'success');
                                    submitBtn.innerHTML = '<i class="fas fa-key mr-2"></i><span>Save Token</span>';
                                    submitBtn.classList.remove('from-green-500', 'to-green-600');
                                    submitBtn.classList.add('from-primary-500', 'to-purple-500');
                                    submitBtn.disabled = false;
                            }, 1500);
                        } catch (error) {
                            console.error('Repository test failed:', error);
                                feedback.querySelector('div.mt-2').innerHTML = `<span class="text-yellow-500 flex items-center"><i class="fas fa-exclamation-triangle mr-2"></i>Limited repository access: ${error.message}</span>`;
                                
                                submitBtn.disabled = false;
                                submitBtn.innerHTML = '<i class="fas fa-key mr-2"></i><span>Save Token</span>';
                                
                                setTimeout(() => {
                                    this.showNotification('Token saved but has limited repository access.', 'warning');
                                }, 1000);
                            }
                        } else {
                            feedback.innerHTML = `<span class="text-red-500 flex items-center"><i class="fas fa-exclamation-circle mr-2"></i>${validation.message || 'Token validation failed'}</span>`;
                            this.removeFromStorage('active_github_token');
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = '<i class="fas fa-key mr-2"></i><span>Save Token</span>';
                    }
                } catch (error) {
                    console.error('Token validation error:', error);
                        feedback.innerHTML = `<span class="text-red-500 flex items-center"><i class="fas fa-exclamation-circle mr-2"></i>${error.message || 'Token validation failed'}</span>`;
                        this.removeFromStorage('active_github_token');
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fas fa-key mr-2"></i><span>Save Token</span>';
                        
                        // Hide cancel button
                        cancelBtn.classList.add('hidden');
                    }
                } catch (outerError) {
                    console.error('Unexpected error during token validation:', outerError);
                    this.showNotification('An unexpected error occurred. Please try again.', 'error');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-key mr-2"></i><span>Save Token</span>';
                    
                    // Hide cancel button
                    if (cancelBtn) cancelBtn.classList.add('hidden');
                }
                
                // Always return false to prevent form submission
                return false;
            });
            
            // Add real-time token format validation
            tokenInp.addEventListener('input', () => {
                const token = tokenInp.value.trim();
                
                // Basic validation for GitHub token format (usually 40+ characters, alphanumeric)
                if (token && token.length >= 30 && /^[a-zA-Z0-9_]+$/.test(token)) {
                    tokenInp.classList.add('ring-2', 'ring-green-500');
                    tokenInp.classList.remove('ring-red-500');
                    feedback.innerHTML = '<span class="text-green-500"><i class="fas fa-check-circle mr-2"></i>Token format looks valid</span>';
                } else if (token) {
                    tokenInp.classList.add('ring-2', 'ring-red-500');
                    tokenInp.classList.remove('ring-green-500');
                    feedback.innerHTML = '<span class="text-yellow-500"><i class="fas fa-exclamation-triangle mr-2"></i>Token format may not be correct</span>';
                } else {
                    tokenInp.classList.remove('ring-2', 'ring-green-500', 'ring-red-500');
                    feedback.innerHTML = '';
                }
            });
        }
    }

    // Direct token validation method that doesn't rely on form events
    async validateGitHubToken(token) {
        if (!token) {
            this.showNotification('Please enter a valid token', 'error');
            return;
        }

        // Get UI elements
        const feedback = document.getElementById('token-feedback');
        const submitBtn = document.querySelector('#github-token-form button');
        const cancelBtn = document.getElementById('cancel-token-validation');
        
        if (!feedback || !submitBtn) {
            console.error('Required UI elements not found');
            this.showNotification('An error occurred. Please try again.', 'error');
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i><span>Validating...</span>';
            feedback.innerHTML = '<div class="space-y-2"><div class="flex items-center"><span class="text-primary-400"><i class="fas fa-spinner fa-spin mr-2"></i>Validating token...</span></div><div class="w-full bg-white/10 rounded-full h-1.5 mt-1"><div class="token-validation-progress bg-primary-500 h-1.5 rounded-full" style="width: 25%"></div></div></div>';
            
            // Show cancel button
            if (cancelBtn) cancelBtn.classList.remove('hidden');
            
            // Animate progress bar
            const progressBar = document.querySelector('.token-validation-progress');
            if (progressBar) setTimeout(() => { progressBar.style.width = '50%'; }, 500);

            // Auto-approve for admin if enabled
            if (this.AUTO_VERIFY_ADMIN && this.currentUser?.email === this.ADMIN_EMAIL) {
                // Simulate validation
                if (progressBar) progressBar.style.width = '100%';
                setTimeout(() => {
                    feedback.innerHTML = '<div class="space-y-2"><span class="text-green-500 flex items-center"><i class="fas fa-check-circle mr-2"></i>Token automatically verified for admin account!</span><div class="w-full bg-white/10 rounded-full h-1.5 mt-1"><div class="bg-green-500 h-1.5 rounded-full" style="width: 100%"></div></div></div>';
                    
                    // Store token in both locations
                    this.saveToStorage('active_github_token', token);
                    this.saveToStorage('github_token_' + this.currentUser.email, token);
                    
                    // Update user record
                    const users = JSON.parse(this.getFromStorage('users') || '[]');
                    const user = users.find(u => u.email === this.currentUser.email);
                    if (user) {
                        user.hasToken = true;
                        this.saveToStorage('users', JSON.stringify(users));
                        
                        // Update current user
                        this.currentUser.hasToken = true;
                        this.saveToStorage('currentUser', JSON.stringify(this.currentUser));
                    }
                    
                    submitBtn.innerHTML = '<i class="fas fa-check mr-2"></i><span>Token Verified</span>';
                    submitBtn.classList.remove('from-primary-500', 'to-purple-500');
                    submitBtn.classList.add('from-green-500', 'to-green-600');
                    
                    // Hide cancel button
                    if (cancelBtn) cancelBtn.classList.add('hidden');
                    
                    setTimeout(() => {
                        document.getElementById('github-token-modal').classList.add('hidden');
                        this.showNotification('GitHub token saved successfully!', 'success');
                        submitBtn.innerHTML = '<i class="fas fa-key mr-2"></i><span>Save Token</span>';
                        submitBtn.classList.remove('from-green-500', 'to-green-600');
                        submitBtn.classList.add('from-primary-500', 'to-purple-500');
                        submitBtn.disabled = false;
                    }, 1500);
                }, 1000);
                
                return;
            }

            // Normal validation flow
            try {
                await window.githubService.setToken(token);
                if (progressBar) progressBar.style.width = '75%';
                const validation = await window.githubService.validateToken();

                // Hide cancel button
                if (cancelBtn) cancelBtn.classList.add('hidden');

                if (validation.valid) {
                    if (progressBar) {
                        progressBar.style.width = '100%';
                        progressBar.classList.remove('bg-primary-500');
                        progressBar.classList.add('bg-green-500');
                    }
                    feedback.innerHTML = '<div class="space-y-2"><span class="text-green-500 flex items-center"><i class="fas fa-check-circle mr-2"></i>Token validated successfully!</span><div class="w-full bg-white/10 rounded-full h-1.5 mt-1"><div class="bg-green-500 h-1.5 rounded-full" style="width: 100%"></div></div></div>';
                    
                    // Store this token for the current user in both locations
                    if (this.currentUser) {
                        this.saveToStorage('active_github_token', token);
                        this.saveToStorage('github_token_' + this.currentUser.email, token);
                        
                        // Update user record
                        const users = JSON.parse(this.getFromStorage('users') || '[]');
                        const user = users.find(u => u.email === this.currentUser.email);
                        if (user) {
                            user.hasToken = true;
                            this.saveToStorage('users', JSON.stringify(users));
                            
                            // Update current user
                            this.currentUser.hasToken = true;
                            this.saveToStorage('currentUser', JSON.stringify(this.currentUser));
                        }
                    }
                    
                    // Initialize repository
                    feedback.innerHTML += '<div class="mt-2 py-2 px-3 rounded-lg bg-white/5"><span class="text-primary-400 flex items-center"><i class="fas fa-spinner fa-spin mr-2"></i>Initializing repository access...</span></div>';
                    
                    try {
                        // Test file operations
                        await window.githubService.updateFile('data/test.json', { test: true, timestamp: new Date().toISOString() });
                        await window.githubService.getFileContent('data/test.json');
                        
                        feedback.querySelector('div.mt-2').innerHTML = '<span class="text-green-500 flex items-center"><i class="fas fa-check-circle mr-2"></i>Repository access verified!</span>';
                        
                        submitBtn.innerHTML = '<i class="fas fa-check mr-2"></i><span>Token Verified</span>';
                        submitBtn.classList.remove('from-primary-500', 'to-purple-500');
                        submitBtn.classList.add('from-green-500', 'to-green-600');
                        
                        setTimeout(() => {
                            document.getElementById('github-token-modal').classList.add('hidden');
                            this.showNotification('GitHub token saved and verified successfully!', 'success');
                            submitBtn.innerHTML = '<i class="fas fa-key mr-2"></i><span>Save Token</span>';
                            submitBtn.classList.remove('from-green-500', 'to-green-600');
                            submitBtn.classList.add('from-primary-500', 'to-purple-500');
                            submitBtn.disabled = false;
                        }, 1500);
                    } catch (error) {
                        console.error('Repository test failed:', error);
                        feedback.querySelector('div.mt-2').innerHTML = `<span class="text-yellow-500 flex items-center"><i class="fas fa-exclamation-triangle mr-2"></i>Limited repository access: ${error.message}</span>`;
                        
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fas fa-key mr-2"></i><span>Save Token</span>';
                        
                        setTimeout(() => {
                            this.showNotification('Token saved but has limited repository access.', 'warning');
                        }, 1000);
                    }
                } else {
                    feedback.innerHTML = `<span class="text-red-500 flex items-center"><i class="fas fa-exclamation-circle mr-2"></i>${validation.message || 'Token validation failed'}</span>`;
                    this.removeFromStorage('active_github_token');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-key mr-2"></i><span>Save Token</span>';
                }
            } catch (error) {
                console.error('Token validation error:', error);
                feedback.innerHTML = `<span class="text-red-500 flex items-center"><i class="fas fa-exclamation-circle mr-2"></i>${error.message || 'Token validation failed'}</span>`;
                this.removeFromStorage('active_github_token');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-key mr-2"></i><span>Save Token</span>';
                
                // Hide cancel button
                if (cancelBtn) cancelBtn.classList.add('hidden');
            }
        } catch (outerError) {
            console.error('Unexpected error during token validation:', outerError);
            this.showNotification('An unexpected error occurred. Please try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-key mr-2"></i><span>Save Token</span>';
            
            // Hide cancel button
            if (cancelBtn) cancelBtn.classList.add('hidden');
        }
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});