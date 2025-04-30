class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Hide dashboard by default
        const dashboardSection = document.getElementById('dashboard');
        if (dashboardSection) {
            dashboardSection.classList.add('hidden');
        }
        
        this.checkAuthState();
        this.setupEventListeners();
        this.setupDashboardLinks();
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
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Signup form
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignup();
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

    handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        // Get users from localStorage
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            this.currentUser = { 
                email: user.email, 
                name: user.name,
                isAdmin: user.isAdmin 
            };
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            this.updateUI();
            this.showNotification('Login successful!', 'success');
            document.getElementById('auth-modal').classList.add('hidden');
            
            // Only redirect to dashboard if user is admin
            if (user.isAdmin) {
                window.location.hash = '#dashboard';
            } else {
                window.location.hash = '#home';
            }
        } else {
            this.showNotification('Invalid email or password', 'error');
        }
    }

    handleSignup() {
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;

        // Validate inputs
        if (!name || !email || !password || !confirmPassword) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('Password must be at least 6 characters', 'error');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showNotification('Please enter a valid email address', 'error');
            return;
        }

        // Get existing users
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        
        // Check if email already exists
        if (users.some(u => u.email === email)) {
            this.showNotification('Email already registered', 'error');
            return;
        }

        // Add new user
        const newUser = { 
            name, 
            email, 
            password,
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        // Auto login after signup
        this.currentUser = { email: newUser.email, name: newUser.name };
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
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});