/**
 * GitHub Backend Setup Utility
 * 
 * This script initializes the necessary data files in your GitHub repository
 * to be used as a backend for your portfolio.
 */

// Function to check DOM state before performing operations
function checkDOMState(callback) {
    if (document.readyState === 'loading') {
        console.log('🕒 DOM still loading, adding event listener...');
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        console.log('✅ DOM already loaded, executing immediately');
        callback();
    }
}

// Make sure event listener is added after DOM is loaded
checkDOMState(() => {
    console.log('🔄 GitHub Backend Setup module loaded');
    
    // Make GitHubBackendSetup available globally
    window.GitHubBackendSetup = GitHubBackendSetup;

    // Add a small delay to ensure all DOM elements are fully initialized
    setTimeout(() => {
        initializeGitHubSetupButtons();
    }, 500);
    
    // Direct initialization if URL has init=true parameter
    if (window.location.search.includes('init=true')) {
        console.log('Auto-initializing GitHub backend from URL parameter');
        setTimeout(() => new GitHubBackendSetup(), 1000);
    }
});

// Initialize all GitHub Setup buttons
function initializeGitHubSetupButtons() {
    console.log('🔄 Initializing GitHub Setup buttons...');
    
    // Check if dashboard exists and add setup button events
    const setupGitHubBackendBtn = document.getElementById('github-backend-setup-btn');
    if (setupGitHubBackendBtn) {
        console.log('Found github-backend-setup-btn, adding event listener');
        setupGitHubBackendBtn.addEventListener('click', () => {
            console.log('GitHub Backend Setup button clicked');
            new GitHubBackendSetup();
        });
    } else {
        console.warn('⚠️ github-backend-setup-btn not found in DOM');
    }
    
    const initGitHubBackendBtn = document.getElementById('init-github-backend');
    if (initGitHubBackendBtn) {
        console.log('Found init-github-backend button, adding event listener');
        initGitHubBackendBtn.addEventListener('click', () => {
            console.log('Init GitHub Backend button clicked');
            new GitHubBackendSetup();
        });
    } else {
        console.warn('⚠️ init-github-backend button not found in DOM');
    }
    
    const migrateToGitHubBtn = document.getElementById('migrate-to-github');
    if (migrateToGitHubBtn) {
        console.log('Found migrate-to-github button, adding event listener');
        migrateToGitHubBtn.addEventListener('click', () => {
            console.log('Migrate to GitHub button clicked');
            if (window.githubService) {
                const setup = new GitHubBackendSetup();
                setup.migrateFromLocalStorage();
            } else {
                console.error('❌ GitHub service not initialized');
                alert('GitHub service not initialized');
            }
        });
    } else {
        console.warn('⚠️ migrate-to-github button not found in DOM');
    }
    
    const testGitHubConnectionBtn = document.getElementById('test-github-connection');
    if (testGitHubConnectionBtn) {
        console.log('Found test-github-connection button, adding event listener');
        testGitHubConnectionBtn.addEventListener('click', async () => {
            console.log('Test GitHub Connection button clicked');
            if (window.githubService) {
                await window.githubService.validateToken().then(result => {
                    console.log('Token validation result:', result);
                    
                    const statusElement = document.getElementById('github-status');
                    if (statusElement) {
                        if (result.valid) {
                            statusElement.innerHTML = `
                                <p class="text-green-400">
                                    <i class="fas fa-check-circle mr-2"></i>
                                    Connected to GitHub as ${result.username}
                                </p>
                            `;
                        } else {
                            statusElement.innerHTML = `
                                <p class="text-red-400">
                                    <i class="fas fa-times-circle mr-2"></i>
                                    GitHub connection failed: ${result.message}
                                </p>
                            `;
                        }
                    }
                    
                    if (window.syncStatus) {
                        window.syncStatus.showStatus(
                            result.valid 
                                ? `Connected to GitHub as ${result.username}` 
                                : `GitHub connection failed: ${result.message}`,
                            result.valid ? 'success' : 'error'
                        );
                    }
                });
            } else {
                console.error('GitHub service not initialized');
                alert('GitHub service not initialized');
            }
        });
    } else {
        console.warn('⚠️ test-github-connection button not found in DOM');
    }
    
    // Ensure GitHub Setup tab is visible
    const setupTab = document.querySelector('[data-tab="github-setup"]');
    if (setupTab) {
        console.log('✅ GitHub Setup tab is available in the DOM');
        setupTab.style.display = '';
    } else {
        console.error('❌ GitHub Setup tab not found in the DOM');
    }
}

class GitHubBackendSetup {
    constructor() {
        console.log('🔧 [GITHUB-SETUP] Initializing GitHub Backend Setup');
        
        // Check if DOM is fully loaded
        if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
            console.log('🕒 [GITHUB-SETUP] DOM not fully loaded, waiting...');
            const instance = this;
            window.addEventListener('DOMContentLoaded', () => {
                console.log('🌐 [GITHUB-SETUP] DOMContentLoaded fired, reinitializing');
                instance.initialize();
            });
            return;
        }
        
        this.initialize();
    }
    
    initialize() {
        this.githubService = window.githubService;
        
        if (!this.githubService) {
            console.error('❌ [GITHUB-SETUP] GitHub service not available');
            
            // Try to initialize GitHub service if it's available but not instantiated
            if (typeof GitHubService === 'function') {
                console.log('🔄 [GITHUB-SETUP] Attempting to create GitHub service instance');
                window.githubService = new GitHubService();
                this.githubService = window.githubService;
            } else {
                console.error('❌ [GITHUB-SETUP] GitHubService class not found');
                alert('GitHub service not available. The page may need to be reloaded.');
                return;
            }
        }
        
        this.dataFiles = [
            { path: 'data/projects.json', defaultContent: [] },
            { path: 'data/skills.json', defaultContent: [] },
            { path: 'data/profile.json', defaultContent: this.getDefaultProfile() },
            { path: 'data/settings.json', defaultContent: this.getDefaultSettings() }
        ];
        
        // Make sure GitHub Setup tab is visible
        this.ensureSetupTabVisibility();
        
        // Initialize UI and set up event handlers
        this.initializeUI();
        this.setupEvents();
        
        // Automatically check token status on initialization
        this.checkTokenStatus();
        
        console.log('✅ [GITHUB-SETUP] GitHub Backend Setup initialized');
    }

    // Check token status and display appropriate messages
    async checkTokenStatus() {
        console.log('🔄 Checking GitHub token status...');
        
        const token = localStorage.getItem('active_github_token');
        const statusElement = document.getElementById('github-status');
        
        if (!token) {
            console.warn('⚠️ No GitHub token found');
            if (statusElement) {
                statusElement.innerHTML = `
                    <p class="text-yellow-400">
                        <i class="fas fa-exclamation-circle mr-2"></i>
                        No GitHub token set. Please enter your token below.
                    </p>
                `;
            }
            return;
        }
        
        try {
            const result = await this.githubService.validateToken();
            console.log('Token validation result:', result);
            
            if (statusElement) {
                if (result.valid) {
                    statusElement.innerHTML = `
                        <p class="text-green-400">
                            <i class="fas fa-check-circle mr-2"></i>
                            Connected to GitHub as ${result.username}
                        </p>
                    `;
                } else {
                    statusElement.innerHTML = `
                        <p class="text-red-400">
                            <i class="fas fa-times-circle mr-2"></i>
                            GitHub connection failed: ${result.message}
                        </p>
                    `;
                }
            }
        } catch (error) {
            console.error('❌ Error validating token:', error);
            if (statusElement) {
                statusElement.innerHTML = `
                    <p class="text-red-400">
                        <i class="fas fa-times-circle mr-2"></i>
                        Error validating token: ${error.message}
                    </p>
                `;
            }
        }
    }

    // Initialize the UI elements
    initializeUI() {
        console.log('Initializing GitHub Backend Setup UI');
        
        // Show the GitHub setup tab if not already visible
        const githubSetupTab = document.getElementById('github-setup-tab');
        const tabButton = document.querySelector('[data-tab="github-setup"]');
        
        if (githubSetupTab && tabButton) {
            // Activate the tab
            document.querySelectorAll('.dashboard-tab').forEach(tab => tab.classList.remove('active'));
            tabButton.classList.add('active');
            
            // Show the content
            document.querySelectorAll('.dashboard-content').forEach(content => content.classList.add('hidden'));
            githubSetupTab.classList.remove('hidden');
            
            // Also make sure dashboard is visible
            const dashboard = document.getElementById('dashboard');
            if (dashboard) {
                dashboard.classList.remove('hidden');
            } else {
                console.error('❌ Dashboard element not found');
            }
            
            // Update status display
            this.updateStatus();
            
            // Show notification
            if (window.syncStatus) {
                window.syncStatus.showStatus('GitHub Backend Setup initialized', 'info');
            }
        } else {
            console.error('❌ GitHub setup tab or button not found');
            
            // Log DOM state for debugging
            console.log('Available tabs:', 
                Array.from(document.querySelectorAll('.dashboard-tab'))
                    .map(tab => `${tab.textContent.trim()} (${tab.getAttribute('data-tab')})`));
            
            console.log('Available content areas:', 
                Array.from(document.querySelectorAll('.dashboard-content'))
                    .map(content => content.id));
        }
    }

    // Set up event handlers
    setupEvents() {
        // GitHub config form submission
        const githubConfigForm = document.getElementById('github-config-form');
        if (githubConfigForm) {
            githubConfigForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveGitHubConfig();
            });
        }
        
        // Save GitHub config button
        const saveGitHubConfigBtn = document.getElementById('save-github-config');
        if (saveGitHubConfigBtn) {
            saveGitHubConfigBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.saveGitHubConfig();
            });
        }
        
        // Initialize GitHub backend button (already bound in DOMContentLoaded)
        
        // Test connection button
        const testGitHubConnectionBtn = document.getElementById('test-github-connection');
        if (testGitHubConnectionBtn) {
            testGitHubConnectionBtn.addEventListener('click', async () => {
                await this.testGitHubConnection();
            });
        }
    }

    // Save GitHub configuration
    async saveGitHubConfig() {
        const ownerInput = document.getElementById('github-owner');
        const repoInput = document.getElementById('github-repo');
        const tokenInput = document.getElementById('github-token');
        const branchInput = document.getElementById('github-branch');
        
        if (!ownerInput || !repoInput || !tokenInput || !branchInput) {
            this.log('Error: Form inputs not found', 'error');
            return;
        }
        
        const owner = ownerInput.value.trim();
        const repo = repoInput.value.trim();
        const token = tokenInput.value.trim();
        const branch = branchInput.value.trim();
        
        if (!owner || !repo || !token) {
            this.log('Please fill in all required fields', 'error');
            return;
        }
        
        this.log(`Saving GitHub configuration for ${owner}/${repo}...`);
        
        // Update service configuration
        if (this.githubService) {
            this.githubService.owner = owner;
            this.githubService.repo = repo;
            
            const success = await this.githubService.setToken(token);
            if (success) {
                this.log('GitHub token set successfully', 'success');
                
                // Ensure the GitHub Setup tab remains visible
                this.ensureSetupTabVisibility();
                
                // Update status display
                this.updateStatus();
            } else {
                this.log('Failed to set GitHub token', 'error');
            }
        } else {
            this.log('GitHub service not available', 'error');
        }
    }

    // Ensure GitHub Setup tab remains visible
    ensureSetupTabVisibility() {
        // First try using auth manager if available
        if (window.authManager && typeof window.authManager.ensureGitHubSetupTabVisible === 'function') {
            console.log('Using auth manager to ensure tab visibility');
            window.authManager.ensureGitHubSetupTabVisible();
            return;
        }
        
        // Fallback to manual approach
        console.log('Manually ensuring GitHub Setup tab visibility');
        const setupTab = document.querySelector('[data-tab="github-setup"]');
        const setupContent = document.getElementById('github-setup-tab');
        
        if (setupTab && setupContent) {
            setupTab.style.display = '';
            setupTab.classList.remove('hidden');
            
            if (typeof window.setupDashboardTabs === 'function') {
                window.setupDashboardTabs();
            }
            
            console.log('✅ GitHub Setup tab visibility enforced after token setup');
        } else {
            console.error('❌ GitHub Setup tab not found during visibility enforcement');
        }
    }

    // Test GitHub connection
    async testGitHubConnection() {
        if (!this.githubService) {
            this.log('GitHub service not available', 'error');
            return;
        }
        
        this.log('Testing GitHub connection...');
        
        try {
            const result = await this.githubService.validateToken();
            
            if (result.valid) {
                this.log(`GitHub token valid. Authenticated as ${result.username}`, 'success');
                
                if (result.repoAccess) {
                    this.log(`Repository access confirmed for ${this.githubService.owner}/${this.githubService.repo}`, 'success');
                } else {
                    this.log(`WARNING: No repository access for ${this.githubService.owner}/${this.githubService.repo}`, 'warning');
                }
            } else {
                this.log(`GitHub token validation failed: ${result.message}`, 'error');
            }
        } catch (error) {
            this.log(`Error testing connection: ${error.message}`, 'error');
        }
    }

    // Initialize GitHub backend by creating necessary files
    async initializeBackend() {
        if (!this.githubService) {
            this.log('GitHub service not available', 'error');
            return;
        }
        
        // Validate token first
            const validation = await this.githubService.validateToken();
            if (!validation.valid) {
            this.log(`GitHub token not valid: ${validation.message}`, 'error');
            return;
        }
        
        if (!validation.repoAccess) {
            this.log('WARNING: No repository access. Some operations may fail.', 'warning');
        }
        
        this.log(`Initializing GitHub backend for ${this.githubService.owner}/${this.githubService.repo}...`);
        
        // Create necessary files
            for (const file of this.dataFiles) {
                try {
                // Check if file exists
                const exists = await this.githubService.checkFileExists(file.path);
                
                    if (exists) {
                    this.log(`File ${file.path} already exists, skipping.`);
                } else {
                    this.log(`Creating ${file.path}...`);
                    const result = await this.githubService.createFile(
                        file.path, 
                        JSON.stringify(file.defaultContent, null, 2),
                        `Initialize ${file.path} via Portfolio Setup`
                    );
                    
                    if (result.success) {
                        this.log(`Created ${file.path} successfully`, 'success');
                    } else {
                        this.log(`Failed to create ${file.path}: ${result.message}`, 'error');
                    }
                }
            } catch (error) {
                this.log(`Error creating ${file.path}: ${error.message}`, 'error');
            }
        }
        
        this.log('GitHub backend initialization complete', 'success');
        if (window.syncStatus) {
            window.syncStatus.showStatus('GitHub backend initialized', 'success');
        }
        
        // Mark setup as complete
        localStorage.setItem('github_setup_complete', 'true');
        
        // Update status display
        this.updateStatus();
        
        // Refresh data
        if (this.githubService) {
            try {
                await Promise.all([
                    this.githubService.refreshSkillsDisplay(),
                    this.githubService.refreshProjectsDisplay()
                ]);
                this.log('Data display refreshed from GitHub', 'success');
        } catch (error) {
                this.log(`Error refreshing data: ${error.message}`, 'error');
            }
        }
    }

    // Migrate data from localStorage to GitHub
    async migrateFromLocalStorage() {
        this.log('Migrating data from localStorage to GitHub...');
        
        if (!this.githubService) {
            this.log('GitHub service not available', 'error');
            return;
        }
        
        // Check for localStorage data
        const skills = JSON.parse(localStorage.getItem('skills') || '[]');
        const projects = JSON.parse(localStorage.getItem('projects') || '[]');
        const profile = JSON.parse(localStorage.getItem('profile') || '{}');
        
        // Migrate skills
        if (skills.length > 0) {
            this.log(`Migrating ${skills.length} skills...`);
            try {
                await this.githubService.saveSkillsData(skills);
                this.log('Skills migrated successfully', 'success');
            } catch (error) {
                this.log(`Error migrating skills: ${error.message}`, 'error');
            }
        } else {
            this.log('No skills to migrate');
        }
        
        // Migrate projects
        if (projects.length > 0) {
            this.log(`Migrating ${projects.length} projects...`);
            try {
                await this.githubService.saveProjectsData(projects);
                this.log('Projects migrated successfully', 'success');
            } catch (error) {
                this.log(`Error migrating projects: ${error.message}`, 'error');
            }
        } else {
            this.log('No projects to migrate');
        }
        
        // Migrate profile
        if (Object.keys(profile).length > 0) {
            this.log('Migrating profile data...');
            try {
                await this.githubService.updateFile(
                    'data/profile.json',
                    JSON.stringify(profile, null, 2)
                );
                this.log('Profile migrated successfully', 'success');
            } catch (error) {
                this.log(`Error migrating profile: ${error.message}`, 'error');
            }
        } else {
            this.log('No profile to migrate');
        }
        
        this.log('Migration complete', 'success');
        if (window.syncStatus) {
            window.syncStatus.showStatus('Data migrated to GitHub', 'success');
        }
        
        // Refresh data
        if (this.githubService) {
            try {
                await Promise.all([
                    this.githubService.refreshSkillsDisplay(),
                    this.githubService.refreshProjectsDisplay()
                ]);
                this.log('Data display refreshed from GitHub', 'success');
        } catch (error) {
                this.log(`Error refreshing data: ${error.message}`, 'error');
            }
        }
    }

    // Log messages to the setup log and console
    log(message, type = 'info') {
        console.log(`GitHub Setup: ${message}`);
        
        const setupLog = document.getElementById('github-setup-log');
        if (setupLog) {
            const logEntry = document.createElement('div');
            logEntry.className = 'py-1';
            
            // Apply color based on message type
            let icon = '';
            let textColor = '';
        
        switch (type) {
                case 'success':
                    icon = '✅ ';
                    textColor = 'text-green-500';
                    break;
            case 'error':
                    icon = '❌ ';
                    textColor = 'text-red-500';
                break;
                case 'warning':
                    icon = '⚠️ ';
                    textColor = 'text-yellow-500';
                break;
            default:
                    icon = 'ℹ️ ';
                    textColor = 'text-gray-400';
            }
            
            logEntry.innerHTML = `<span class="${textColor}">${icon}${message}</span>`;
            setupLog.appendChild(logEntry);
            
            // Scroll to bottom
            setupLog.scrollTop = setupLog.scrollHeight;
        }
    }

    // Update status display
    async updateStatus() {
        const statusContainer = document.getElementById('github-status');
        if (!statusContainer) return;
        
        if (!this.githubService || !this.githubService.token) {
            statusContainer.innerHTML = `
                <div class="flex items-center text-yellow-500 mb-2">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    <span class="font-medium">Not Configured</span>
                </div>
                <p class="text-gray-400 text-sm">GitHub integration not set up. Please configure your repository and token.</p>
            `;
            return;
        }
        
        // Test connection
        try {
            const result = await this.githubService.validateToken();
            
            if (result.valid) {
                if (result.repoAccess) {
                    statusContainer.innerHTML = `
                        <div class="flex items-center text-green-500 mb-2">
                            <i class="fas fa-check-circle mr-2"></i>
                            <span class="font-medium">Connected</span>
                        </div>
                        <p class="text-gray-400 text-sm">GitHub integration active. Connected as <strong>${result.username}</strong>.</p>
                        <p class="text-gray-400 text-sm">Repository: ${this.githubService.owner}/${this.githubService.repo}</p>
                    `;
                } else {
                    statusContainer.innerHTML = `
                        <div class="flex items-center text-yellow-500 mb-2">
                            <i class="fas fa-exclamation-triangle mr-2"></i>
                            <span class="font-medium">Limited Access</span>
                        </div>
                        <p class="text-gray-400 text-sm">Authenticated as <strong>${result.username}</strong> but no access to repository ${this.githubService.owner}/${this.githubService.repo}.</p>
                    `;
                }
            } else {
                statusContainer.innerHTML = `
                    <div class="flex items-center text-red-500 mb-2">
                        <i class="fas fa-times-circle mr-2"></i>
                        <span class="font-medium">Authentication Failed</span>
                    </div>
                    <p class="text-gray-400 text-sm">${result.message}</p>
                `;
            }
        } catch (error) {
            statusContainer.innerHTML = `
                <div class="flex items-center text-red-500 mb-2">
                    <i class="fas fa-times-circle mr-2"></i>
                    <span class="font-medium">Connection Error</span>
                </div>
                <p class="text-gray-400 text-sm">${error.message}</p>
            `;
        }
    }

    getDefaultProfile() {
        return {
            name: "Bayezid",
            title: "Data Scientist & Web Developer",
            bio: "Passionate about data science, machine learning, and web development with 3+ years of experience in Python, data analysis, and visualization.",
            location: "Dhaka, Bangladesh",
            email: "hrbayezid@gmail.com",
            image: "https://via.placeholder.com/200",
            social: {
                github: "https://github.com/hrbayezid",
                linkedin: "https://linkedin.com/in/your-linkedin",
                twitter: "https://twitter.com/yourusername",
                kaggle: "https://kaggle.com/yourusername"
            }
        };
    }

    getDefaultSettings() {
        return {
            theme: "dark",
            showLearningSection: true,
            githubIntegration: true,
            lastUpdated: new Date().toISOString()
        };
    }
} 