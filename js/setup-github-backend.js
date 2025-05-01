/**
 * GitHub Backend Setup Utility
 * 
 * This script initializes the necessary data files in your GitHub repository
 * to be used as a backend for your portfolio.
 */

class GitHubBackendSetup {
    constructor() {
        this.githubService = window.githubService;
        this.dataFiles = [
            { path: 'data/projects.json', defaultContent: [] },
            { path: 'data/skills.json', defaultContent: [] },
            { path: 'data/profile.json', defaultContent: this.getDefaultProfile() },
            { path: 'data/settings.json', defaultContent: this.getDefaultSettings() }
        ];
        this.setupUI();
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

    setupUI() {
        // Create setup UI
        const setupContainer = document.createElement('div');
        setupContainer.id = 'github-backend-setup';
        setupContainer.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80';
        setupContainer.innerHTML = `
            <div class="max-w-2xl w-full glass-effect rounded-xl p-8 animate-scale-in">
                <h2 class="text-2xl font-bold mb-6 font-display">GitHub Backend Setup</h2>
                <p class="mb-6 text-gray-300">
                    This utility will set up your GitHub repository as a backend for your portfolio.
                    You'll need a GitHub Personal Access Token with repo permissions.
                </p>

                <div id="setup-status" class="mb-6 space-y-2">
                    <p class="text-primary-400">Ready to initialize GitHub backend...</p>
                </div>

                <div id="token-input-container" class="mb-6">
                    <label class="block text-sm font-medium mb-2" for="github-token">GitHub Personal Access Token</label>
                    <input type="password" id="github-token" 
                        class="w-full p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white/10" 
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx">
                    <p class="text-sm text-gray-400 mt-2">
                        You'll need a token with 'repo' scope. 
                        <a href="https://github.com/settings/tokens/new" target="_blank" class="text-primary-400 hover:underline">
                            Create one here
                        </a>
                    </p>
                </div>

                <div class="flex space-x-3">
                    <button id="setup-button" class="px-4 py-2 bg-gradient-to-r from-primary-500 to-purple-500 rounded-lg hover:from-primary-600 hover:to-purple-600 transition">
                        Initialize Backend
                    </button>
                    <button id="close-setup" class="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition">
                        Close
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(setupContainer);

        // Add event listeners
        document.getElementById('setup-button').addEventListener('click', () => this.initializeBackend());
        document.getElementById('close-setup').addEventListener('click', () => setupContainer.remove());
    }

    async initializeBackend() {
        const statusElement = document.getElementById('setup-status');
        const token = document.getElementById('github-token').value.trim();
        
        if (!token) {
            this.updateStatus('Please enter a GitHub token', 'error');
            return;
        }
        
        try {
            // Set and validate token
            await this.githubService.setToken(token);
            this.updateStatus('Validating token...', 'info');
            
            const validation = await this.githubService.validateToken();
            if (!validation.valid) {
                throw new Error('Invalid GitHub token');
            }
            
            this.updateStatus(`Token valid! Authenticated as ${validation.username}`, 'success');
            
            // Initialize each data file
            for (const file of this.dataFiles) {
                this.updateStatus(`Creating ${file.path}...`, 'info');
                try {
                    const exists = await this.checkFileExists(file.path);
                    if (exists) {
                        this.updateStatus(`${file.path} already exists, skipping`, 'info');
                    } else {
                        await this.githubService.createFile(file.path, file.defaultContent);
                        this.updateStatus(`Created ${file.path}`, 'success');
                    }
                } catch (error) {
                    this.updateStatus(`Error creating ${file.path}: ${error.message}`, 'error');
                }
            }
            
            this.updateStatus('GitHub backend setup complete!', 'success');
            this.updateStatus('You can now close this dialog and use your portfolio with GitHub backend.', 'info');
            
            // Disable the setup button
            document.getElementById('setup-button').disabled = true;
            document.getElementById('setup-button').classList.add('opacity-50');
            document.getElementById('token-input-container').classList.add('hidden');
            
            // Add a reload button
            const reloadBtn = document.createElement('button');
            reloadBtn.innerText = 'Reload Application';
            reloadBtn.className = 'px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg hover:from-green-600 hover:to-teal-600 transition mt-4 block';
            reloadBtn.addEventListener('click', () => window.location.reload());
            statusElement.appendChild(reloadBtn);
            
        } catch (error) {
            this.updateStatus(`Setup failed: ${error.message}`, 'error');
        }
    }
    
    async checkFileExists(path) {
        try {
            const data = await this.githubService.getFileContent(path);
            return data !== null;
        } catch (error) {
            return false;
        }
    }

    updateStatus(message, type = 'info') {
        const statusElement = document.getElementById('setup-status');
        const statusItem = document.createElement('p');
        statusItem.innerText = message;
        
        switch (type) {
            case 'error':
                statusItem.className = 'text-red-400';
                break;
            case 'success':
                statusItem.className = 'text-green-400';
                break;
            case 'info':
            default:
                statusItem.className = 'text-gray-300';
        }
        
        statusElement.appendChild(statusItem);
        statusElement.scrollTop = statusElement.scrollHeight;
    }
}

// Add a setup link to the dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Check if dashboard exists and user is an admin
    const dashboardMenu = document.getElementById('dashboard-menu');
    if (dashboardMenu) {
        const setupLink = document.createElement('a');
        setupLink.href = '#';
        setupLink.className = 'block px-4 py-2 text-gray-300 hover:bg-white/10 hover:text-white transition';
        setupLink.innerHTML = '<i class="fas fa-cloud-upload-alt mr-2"></i>Setup GitHub Backend';
        setupLink.addEventListener('click', (e) => {
            e.preventDefault();
            new GitHubBackendSetup();
        });
        dashboardMenu.appendChild(setupLink);
    }
    
    // Add a link to the GitHub backend setup in the Profile tab
    const profileTab = document.getElementById('profile-tab');
    if (profileTab) {
        const setupContainer = document.createElement('div');
        setupContainer.className = 'mt-8 pt-8 border-t border-gray-700';
        setupContainer.innerHTML = `
            <h3 class="text-xl font-bold mb-4">GitHub Backend</h3>
            <p class="mb-4 text-gray-300">
                Setup GitHub as a backend for your portfolio to store data in your repository.
            </p>
            <button id="github-backend-setup-btn" class="px-4 py-2 bg-gradient-to-r from-primary-500 to-purple-500 rounded-lg hover:from-primary-600 hover:to-purple-600 transition">
                <i class="fas fa-cloud-upload-alt mr-2"></i>Setup GitHub Backend
            </button>
        `;
        profileTab.appendChild(setupContainer);
        
        document.getElementById('github-backend-setup-btn').addEventListener('click', () => {
            new GitHubBackendSetup();
        });
    }
}); 