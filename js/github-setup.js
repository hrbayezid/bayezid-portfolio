/**
 * GitHub Backend Setup Tab Functionality
 * This script handles the GitHub backend setup tab in the dashboard
 */

class GitHubSetupManager {
    constructor() {
        this.githubService = window.githubService;
        this.githubStorage = window.GITHUB_CONFIG;
        this.setupEventListeners();
        this.loadSavedConfig();
        this.logMessage('GitHub setup tab initialized');
    }

    setupEventListeners() {
        // GitHub config form
        const configForm = document.getElementById('github-config-form');
        if (configForm) {
            configForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveConfiguration();
            });
        }

        // Test connection button
        const testConnectionBtn = document.getElementById('test-github-connection');
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => this.testConnection());
        }

        // Initialize backend button
        const initBackendBtn = document.getElementById('init-github-backend');
        if (initBackendBtn) {
            initBackendBtn.addEventListener('click', () => this.initializeBackend());
        }

        // Migrate data button
        const migrateDataBtn = document.getElementById('migrate-to-github');
        if (migrateDataBtn) {
            migrateDataBtn.addEventListener('click', () => this.migrateLocalDataToGitHub());
        }
    }

    loadSavedConfig() {
        try {
            // Load from GitHub Storage
            const config = this.githubStorage.loadConfig();
            
            // Fill in form values if available
            if (config.owner) {
                document.getElementById('github-owner').value = config.owner;
            }
            
            if (config.repo) {
                document.getElementById('github-repo').value = config.repo;
            }
            
            if (config.branch) {
                document.getElementById('github-branch').value = config.branch;
            }
            
            // For security, we don't pre-fill the token field
            // But check if we have a saved token and update status
            if (config.token) {
                const tokenInput = document.getElementById('github-token');
                tokenInput.placeholder = '••••••••••••••••••••••••••';
                
                // Update the status
                this.updateStatus('Configuration loaded from local storage. Token is saved but hidden for security.');
                this.logMessage('Loaded saved GitHub configuration');
            }
        } catch (error) {
            console.error('Error loading GitHub configuration:', error);
            this.logMessage('Error loading saved configuration', 'error');
        }
    }

    saveConfiguration() {
        try {
            const owner = document.getElementById('github-owner').value.trim();
            const repo = document.getElementById('github-repo').value.trim();
            const token = document.getElementById('github-token').value.trim();
            const branch = document.getElementById('github-branch').value.trim() || 'main';
            
            // Validate inputs
            if (!owner) {
                this.updateStatus('Please enter a repository owner (username)', 'error');
                return;
            }
            
            if (!repo) {
                this.updateStatus('Please enter a repository name', 'error');
                return;
            }
            
            // Only update token if provided
            const config = {
                owner,
                repo,
                branch
            };
            
            if (token) {
                config.token = token;
                
                // Also update the GitHub service token
                this.githubService.setToken(token);
                this.githubService.owner = owner;
                this.githubService.repo = repo;
            }
            
            // Save configuration
            const saved = this.githubStorage.saveConfig(config);
            
            if (saved) {
                this.updateStatus('GitHub configuration saved successfully', 'success');
                this.logMessage('Configuration saved');
                
                // Test the connection
                this.testConnection();
            } else {
                this.updateStatus('Failed to save configuration', 'error');
                this.logMessage('Failed to save configuration', 'error');
            }
        } catch (error) {
            console.error('Error saving configuration:', error);
            this.updateStatus('Error: ' + error.message, 'error');
            this.logMessage('Error saving configuration: ' + error.message, 'error');
        }
    }

    async testConnection() {
        try {
            this.updateStatus('Testing GitHub connection...', 'info');
            this.logMessage('Testing GitHub connection...');
            
            // Get token from input field or config
            const inputToken = document.getElementById('github-token').value.trim();
            const token = inputToken || this.githubStorage.config.token;
            
            // Check if token exists
            if (!token) {
                this.updateStatus('No GitHub token set. Please add a token and save configuration.', 'error');
                this.logMessage('No GitHub token set', 'error');
                return;
            }
            
            // If token was directly input and not yet saved, use it temporarily
            if (inputToken && inputToken !== this.githubStorage.config.token) {
                this.logMessage('Using token from input field for testing');
                
                // Temporarily set token for validation
                await this.githubService.setToken(inputToken);
                
                // Update owner and repo if they exist in form fields
                const owner = document.getElementById('github-owner').value.trim();
                const repo = document.getElementById('github-repo').value.trim();
                
                if (owner) this.githubService.owner = owner;
                if (repo) this.githubService.repo = repo;
            }
            
            // Test using GitHub Storage API
            if (window.apiClient && window.apiClient.github) {
                const result = await window.apiClient.github.testConnection();
                
                if (result.success) {
                    this.updateStatus(`Connected to GitHub as ${result.user.login}`, 'success');
                    this.logMessage(`Connected to GitHub as ${result.user.login}`, 'success');
                } else {
                    this.updateStatus(`Connection failed: ${result.error}`, 'error');
                    this.logMessage(`Connection failed: ${result.error}`, 'error');
                }
            } else {
                // Fallback to GitHub Service
                const validation = await this.githubService.validateToken();
                
                if (validation.valid) {
                    this.updateStatus(`Connected to GitHub as ${validation.username}`, 'success');
                    this.logMessage(`Connected to GitHub as ${validation.username}`, 'success');
                    
                    // If test was successful and we were using an input token, suggest saving
                    if (inputToken && inputToken !== this.githubStorage.config.token) {
                        this.updateStatus(`Connection successful! Click "Save Configuration" to save this token.`, 'success');
                    }
                } else {
                    this.updateStatus(`Connection failed: ${validation.message}`, 'error');
                    this.logMessage(`Connection failed: ${validation.message}`, 'error');
                }
            }
        } catch (error) {
            console.error('Error testing connection:', error);
            this.updateStatus('Error testing connection: ' + error.message, 'error');
            this.logMessage('Error testing connection: ' + error.message, 'error');
        }
    }

    async initializeBackend() {
        try {
            this.updateStatus('Initializing GitHub backend...', 'info');
            this.logMessage('Starting GitHub backend initialization');
            
            // Get token from input field or config
            const inputToken = document.getElementById('github-token').value.trim();
            const token = inputToken || this.githubStorage.config.token;
            
            // Check if we have a token
            if (!token) {
                this.updateStatus('No GitHub token set. Please add a token and save configuration.', 'error');
                this.logMessage('No GitHub token set', 'error');
                return;
            }
            
            // If token was directly input and not yet saved, use it temporarily
            if (inputToken && inputToken !== this.githubStorage.config.token) {
                this.logMessage('Using token from input field for initialization');
                
                // Temporarily set token for backend initialization
                await this.githubService.setToken(inputToken);
                
                // Update owner and repo if they exist in form fields
                const owner = document.getElementById('github-owner').value.trim();
                const repo = document.getElementById('github-repo').value.trim();
                
                if (owner) this.githubService.owner = owner;
                if (repo) this.githubService.repo = repo;
            }
            
            // Data files to create
            const dataFiles = [
                { path: 'data/projects.json', defaultContent: [] },
                { path: 'data/skills.json', defaultContent: [] },
                { path: 'data/profile.json', defaultContent: this.getDefaultProfile() },
                { path: 'data/settings.json', defaultContent: this.getDefaultSettings() }
            ];
            
            // Create .nojekyll file if not exists
            this.logMessage('Checking for .nojekyll file');
            const nojekyllExists = await this.githubService.checkFileExists('.nojekyll');
            
            if (!nojekyllExists) {
                this.logMessage('Creating .nojekyll file');
                await this.githubService.createFile('.nojekyll', 'This file ensures GitHub Pages does not process the site with Jekyll', 'Add .nojekyll file');
                this.logMessage('Created .nojekyll file', 'success');
            } else {
                this.logMessage('.nojekyll file already exists, skipping');
            }
            
            // Initialize each data file
            for (const file of dataFiles) {
                this.logMessage(`Checking for ${file.path}`);
                const exists = await this.githubService.checkFileExists(file.path);
                
                if (exists) {
                    this.logMessage(`${file.path} already exists, skipping`);
                } else {
                    this.logMessage(`Creating ${file.path}`);
                    await this.githubService.createFile(file.path, file.defaultContent);
                    this.logMessage(`Created ${file.path}`, 'success');
                }
            }
            
            this.updateStatus('GitHub backend initialization complete!', 'success');
            this.logMessage('GitHub backend initialization complete!', 'success');
        } catch (error) {
            console.error('Error initializing backend:', error);
            this.updateStatus('Error: ' + error.message, 'error');
            this.logMessage('Error initializing backend: ' + error.message, 'error');
        }
    }

    async migrateLocalDataToGitHub() {
        try {
            this.updateStatus('Starting data migration to GitHub...', 'info');
            this.logMessage('Starting data migration from localStorage to GitHub');
            
            // Get token from input field or config
            const inputToken = document.getElementById('github-token').value.trim();
            const owner = document.getElementById('github-owner').value.trim();
            const repo = document.getElementById('github-repo').value.trim();
            
            // Check if we have required fields
            if (!inputToken && !this.githubStorage.config.token) {
                this.updateStatus('No GitHub token set. Please add a token and save configuration.', 'error');
                this.logMessage('No GitHub token set', 'error');
                return;
            }
            
            if (!owner && !this.githubStorage.config.owner) {
                this.updateStatus('No repository owner set. Please enter an owner and save configuration.', 'error');
                this.logMessage('No repository owner set', 'error');
                return;
            }
            
            if (!repo && !this.githubStorage.config.repo) {
                this.updateStatus('No repository name set. Please enter a repository name and save configuration.', 'error');
                this.logMessage('No repository name set', 'error');
                return;
            }
            
            // If token was directly input and not yet saved, use it temporarily
            if (inputToken && inputToken !== this.githubStorage.config.token) {
                this.logMessage('Using token from input field for migration');
                
                // Temporarily set token for migration
                await this.githubService.setToken(inputToken);
                
                // Update owner and repo if they exist in form fields
                if (owner) this.githubService.owner = owner;
                if (repo) this.githubService.repo = repo;
            }
            
            // Use the migration function if available
            if (window.apiClient && window.apiClient.github && window.apiClient.github.migrateLocalToGitHub) {
                const result = await window.apiClient.github.migrateLocalToGitHub();
                
                if (result.success) {
                    this.updateStatus(result.message, 'success');
                    this.logMessage(result.message, 'success');
                    
                    // Log details for each data type
                    for (const [key, res] of Object.entries(result.results)) {
                        this.logMessage(`${key}: ${res.success ? 'Success' : 'Failed - ' + res.error}`);
                    }
                } else {
                    this.updateStatus(`Migration failed: ${result.error}`, 'error');
                    this.logMessage(`Migration failed: ${result.error}`, 'error');
                }
            } else {
                // Manual migration
                this.logMessage('Migration helper not available, performing manual migration');
                
                // Define the data keys to migrate
                const dataKeys = {
                    'skills': 'data/skills.json',
                    'projects': 'data/projects.json',
                    'profile': 'data/profile.json',
                    'settings': 'data/settings.json'
                };
                
                // Migrate each data key
                for (const [key, path] of Object.entries(dataKeys)) {
                    this.logMessage(`Migrating ${key} data to ${path}`);
                    
                    // Get data from localStorage
                    const data = localStorage.getItem(key);
                    if (!data) {
                        this.logMessage(`No ${key} data found in localStorage, skipping`);
                        continue;
                    }
                    
                    try {
                        // Parse data
                        const parsedData = JSON.parse(data);
                        
                        // Save to GitHub
                        const exists = await this.githubService.checkFileExists(path);
                        
                        if (exists) {
                            await this.githubService.updateFile(path, parsedData);
                            this.logMessage(`Updated ${path} with localStorage data`, 'success');
                        } else {
                            await this.githubService.createFile(path, parsedData);
                            this.logMessage(`Created ${path} with localStorage data`, 'success');
                        }
                    } catch (error) {
                        console.error(`Error processing ${key} data:`, error);
                        this.logMessage(`Error migrating ${key} data: ${error.message}`, 'error');
                    }
                }
                
                this.updateStatus('Data migration completed', 'success');
                this.logMessage('Data migration completed', 'success');
            }
        } catch (error) {
            console.error('Error during migration:', error);
            this.updateStatus('Error during migration: ' + error.message, 'error');
            this.logMessage('Error during migration: ' + error.message, 'error');
        }
    }

    getDefaultProfile() {
        return {
            name: "Bayezid",
            title: "Data Scientist & Web Developer",
            bio: "Passionate about data science, machine learning, and web development.",
            location: "Bangladesh",
            email: "hrbayezid@gmail.com",
            github: "hrbayezid",
            linkedin: "your-linkedin"
        };
    }

    getDefaultSettings() {
        return {
            theme: "auto",
            notifications: {
                email_notifications: true,
                project_updates: true,
                show_email: true
            }
        };
    }

    updateStatus(message, type = 'info') {
        const statusElement = document.getElementById('github-status');
        if (!statusElement) return;
        
        let className = 'p-4 rounded-lg';
        let icon = '';
        
        switch (type) {
            case 'success':
                className += ' bg-green-900/30 text-green-400';
                icon = '<i class="fas fa-check-circle mr-2"></i>';
                break;
            case 'error':
                className += ' bg-red-900/30 text-red-400';
                icon = '<i class="fas fa-exclamation-circle mr-2"></i>';
                break;
            case 'info':
            default:
                className += ' bg-gray-800/50 text-gray-300';
                icon = '<i class="fas fa-info-circle mr-2"></i>';
        }
        
        statusElement.className = className;
        statusElement.innerHTML = `${icon}${message}`;
    }

    logMessage(message, type = 'info') {
        const logElement = document.getElementById('github-setup-log');
        if (!logElement) return;
        
        const logItem = document.createElement('p');
        const timestamp = new Date().toLocaleTimeString();
        
        switch (type) {
            case 'success':
                logItem.className = 'text-green-400';
                break;
            case 'error':
                logItem.className = 'text-red-400';
                break;
            case 'info':
            default:
                logItem.className = 'text-gray-300';
        }
        
        logItem.innerText = `[${timestamp}] ${message}`;
        logElement.appendChild(logItem);
        logElement.scrollTop = logElement.scrollHeight;
    }
}

// Initialize the GitHub Setup Manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on a page with the GitHub setup tab
    if (document.getElementById('github-setup-tab')) {
        window.githubSetupManager = new GitHubSetupManager();
    }
}); 