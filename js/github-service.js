class GitHubService {
    constructor() {
        this.token = null;
        this.owner = 'hrbayezid';
        this.repo = 'bayezid-portfolio';
        this.dataFolder = 'data';
        this.loadToken();
        this.apiBaseUrl = 'https://api.github.com';
        this.fallbackToLocalStorage = false; // Disabled localStorage fallback
        this.currentDataSource = null; // Will track current source for debugging ('github-api' or 'github-raw')
        this.syncStatus = null; // Will be populated after DOM is ready
        
        // Wait for DOM to be ready to access syncStatus
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.syncStatus = window.syncStatus;
                
                // Initial load of data after DOM is ready
                this.initialLoadData();
            });
        } else {
            this.syncStatus = window.syncStatus;
            this.initialLoadData();
        }
    }
    
    // Initial data load after construction
    async initialLoadData() {
        try {
            console.log('🔄 Loading portfolio data from GitHub...');
            
            // Always load public data from GitHub regardless of token status
            await Promise.all([
                this.refreshSkillsDisplay(),
                this.refreshProjectsDisplay(),
                this.loadProfileData()
            ]);
            
            console.log('✅ Initial public data loaded successfully');
            
            // Only validate token if in dashboard (admin) mode
            if (document.querySelector('#dashboard') && this.token) {
                console.log('Admin dashboard detected, validating token...');
                const tokenStatus = await this.validateToken();
                
                if (tokenStatus.valid) {
                    console.log('✅ Token validated successfully for admin operations');
                    if (this.syncStatus) {
                        this.syncStatus.showStatus('Connected to GitHub with write access', 'success');
                    }
                } else {
                    console.warn('⚠️ Token not valid, running in read-only mode');
                    if (this.syncStatus) {
                        this.syncStatus.showStatus('GitHub token not valid. Using read-only mode.', 'warning');
                    }
                }
            } else if (document.querySelector('#dashboard') && !this.token) {
                console.warn('⚠️ No token provided for dashboard. Write operations will be unavailable.');
                if (this.syncStatus) {
                    this.syncStatus.showStatus('No GitHub token. Running in read-only mode.', 'warning');
                }
            } else {
                console.log('ℹ️ Public read-only mode: no token required');
            }
        } catch (error) {
            console.error('❌ Error during initial data load:', error);
            if (this.syncStatus) {
                this.syncStatus.showStatus('Error loading initial data: ' + error.message, 'error');
            }
        }
    }

    loadToken() {
        // Only load token for admin dashboard
        if (document.querySelector('#dashboard')) {
            // Load token from local storage
            this.token = localStorage.getItem('active_github_token');
            if (!this.token) {
                console.log('No active GitHub token found - admin features will be limited');
            } else {
                console.log('GitHub token found for admin operations');
            }
        } else {
            // For public pages, clear any existing token
            this.token = null;
            console.log('Public mode: no token required for viewing portfolio data');
        }
    }

    async setToken(token) {
        if (!token) {
            console.error('Attempted to set empty token');
            if (this.syncStatus) this.syncStatus.showStatus('Attempted to set empty GitHub token', 'error');
            return false;
        }
        
        try {
            this.token = token;
            // Store token in localStorage for persistence
            localStorage.setItem('active_github_token', token);
            if (this.syncStatus) this.syncStatus.showStatus('GitHub token set successfully', 'success');
            
            // Validate the token after setting
            const validation = await this.validateToken();
            if (validation.valid) {
                // Immediately load data after token validation
                await this.initialLoadData();
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error('Error setting token:', error);
            if (this.syncStatus) this.syncStatus.showStatus(`Error setting GitHub token: ${error.message}`, 'error');
            return false;
        }
    }

    async validateToken() {
        if (!this.token) {
            // For public visitors, just return a quiet invalid state without warnings
            return { 
                valid: false, 
                message: 'No token provided',
                isPublicVisitor: true // Flag to indicate it's just a public user
            };
        }
        
        try {
            // For admin auto-verification, return valid without checking
            if (this.token === 'admin_auto_verified') {
                if (this.syncStatus) this.syncStatus.showStatus('Admin token auto-verified', 'success');
                return {
                    valid: true,
                    username: 'admin',
                    repoAccess: true,
                    message: 'Admin token auto-verified'
                };
            }
            
            // First check if the token format is valid
            if (!/^[a-zA-Z0-9_]+$/.test(this.token) || this.token.length < 30) {
                if (this.syncStatus) this.syncStatus.showStatus('Invalid GitHub token format', 'error');
                return { 
                    valid: false, 
                    message: 'Invalid token format' 
                };
            }
            
            // Use try-catch for fetch to handle network errors
            try {
                if (this.syncStatus) this.syncStatus.showStatus('Validating GitHub token...', 'info');
                
                const response = await fetch(`${this.apiBaseUrl}/user`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (!response.ok) {
                    // Check for rate limit errors
                    if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
                        if (this.syncStatus) this.syncStatus.rateLimitHit();
                        throw new Error('GitHub API rate limit exceeded');
                    }
                    
                    const error = await response.json();
                    if (this.syncStatus) this.syncStatus.showStatus(`Token validation failed: ${error.message}`, 'error');
                    throw new Error(`Token validation failed: ${error.message || 'Invalid token'}`);
                }

                const userData = await response.json();
                
                // Verify repository access
                try {
                    if (this.syncStatus) this.syncStatus.showStatus('Checking repository access...', 'info');
                    
                    const repoResponse = await fetch(`${this.apiBaseUrl}/repos/${this.owner}/${this.repo}`, {
                        headers: {
                            'Authorization': `Bearer ${this.token}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });

                    if (!repoResponse.ok) {
                        if (this.syncStatus) this.syncStatus.showStatus(`Token valid but lacks repository access: ${this.owner}/${this.repo}`, 'warning');
                        return {
                            valid: true,
                            username: userData.login,
                            repoAccess: false,
                            message: 'Token valid but lacks repository access'
                        };
                    }

                    if (this.syncStatus) this.syncStatus.showStatus('GitHub token fully verified with repository access', 'success');
                    return {
                        valid: true,
                        username: userData.login,
                        repoAccess: true,
                        message: 'Token fully verified with repository access'
                    };
                } catch (repoError) {
                    // Token is valid but repo access failed
                    if (this.syncStatus) this.syncStatus.showStatus(`Token valid but repo access check failed: ${repoError.message}`, 'warning');
                    return {
                        valid: true,
                        username: userData.login,
                        repoAccess: false,
                        message: 'Token valid but repo access check failed'
                    };
                }
            } catch (networkError) {
                // Handle network errors specifically
                console.error('Network error during validation:', networkError);
                if (this.syncStatus) this.syncStatus.showStatus(`Network error during validation: ${networkError.message}`, 'error');
                return {
                    valid: false,
                    message: 'Network error: Could not connect to GitHub'
                };
            }
        } catch (error) {
            console.error('Token validation error:', error);
            if (this.syncStatus) this.syncStatus.showStatus(`Token validation error: ${error.message}`, 'error');
            return { 
                valid: false, 
                message: error.message || 'Token validation failed'
            };
        }
    }

    async getFileContent(path) {
        // Reset current data source
        this.currentDataSource = null;
        
        // Add timestamp for cache busting
        const cacheBuster = `?t=${Date.now()}`;
        
        try {
            console.log(`🔄 Fetching ${path} from GitHub...`);
            if (this.syncStatus) this.syncStatus.fetchingFromGitHub(path);
            
            // Always prioritize raw GitHub content which works without authentication
            const rawUrl = `https://raw.githubusercontent.com/${this.owner}/${this.repo}/main/${path}${cacheBuster}`;
            console.log(`📄 Accessing public URL: ${rawUrl}`);
            
            try {
                const response = await fetch(rawUrl);
                
                if (response.status === 404) {
                    console.warn(`⚠️ File ${path} not found in GitHub repository`);
                    throw new Error(`File ${path} not found in GitHub repository`);
                }
                
                if (!response.ok) {
                    throw new Error(`GitHub raw content fetch failed: ${response.status} ${response.statusText}`);
                }
                
                const text = await response.text();
                let content;
                
                try {
                    content = JSON.parse(text);
                } catch (e) {
                    // Not a JSON file
                    content = text;
                }
                
                this.currentDataSource = 'github-raw';
                console.log(`💾 Data loaded from GitHub: ${path}`);
                if (this.syncStatus) this.syncStatus.fetchSuccess(path);
                return content;
            } catch (error) {
                console.error(`❌ Error fetching ${path} from GitHub: ${error.message}`);
                
                if (this.syncStatus) this.syncStatus.fetchFailed(path, error);
                
                // Only show errors for admins in dashboard
                if (document.querySelector('#dashboard')) {
                    if (this.syncStatus) {
                        this.syncStatus.showStatus(`GitHub Error: ${error.message}`, 'error', 10000);
                    }
                }
                
                // Return empty data structure based on path
                if (path.includes('skills.json')) {
                    console.log('📊 Returning empty skills array due to fetch failure');
                    return [];
                } else if (path.includes('projects.json')) {
                    console.log('📋 Returning empty projects array due to fetch failure');
                    return [];
                } else if (path.includes('profile.json')) {
                    console.log('👤 Returning empty profile object due to fetch failure');
                    return {};
                } else {
                    throw error; // Allow the caller to handle other errors
                }
            }
        } catch (error) {
            console.error(`❌ Error fetching ${path}:`, error.message);
            
            if (this.syncStatus) this.syncStatus.fetchFailed(path, error);
            
            // Only show errors for admins in dashboard
            if (document.querySelector('#dashboard')) {
                if (this.syncStatus) {
                    this.syncStatus.showStatus(`GitHub Error: ${error.message}`, 'error', 10000);
                }
            }
            
            // Return empty data structure based on path
            if (path.includes('skills.json')) {
                console.log('📊 Returning empty skills array due to fetch failure');
                return [];
            } else if (path.includes('projects.json')) {
                console.log('📋 Returning empty projects array due to fetch failure');
                return [];
            } else if (path.includes('profile.json')) {
                console.log('👤 Returning empty profile object due to fetch failure');
                return {};
            } else {
                throw error; // Allow the caller to handle other errors
            }
        }
    }

    async updateFile(path, content) {
        // Authentication is required for writing to GitHub
        if (!this.token) {
            const message = '🔒 GitHub authentication required: Token not set. Please log in to update files.';
            console.error(message);
            
            // Only show the error in dashboard, not on public pages
            if (document.querySelector('#dashboard')) {
                if (this.syncStatus) {
                    this.syncStatus.showStatus(message, 'error', 10000);
                } else {
                    alert(message);
                }
            }
            
            throw new Error(message);
        }

        try {
            console.log(`💾 Saving ${path} to GitHub...`);
            if (this.syncStatus) this.syncStatus.savingToGitHub(path);
            let sha;
            
            // First try to get the current file
            try {
                const currentFile = await fetch(`${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }).then(res => res.json());
                sha = currentFile.sha;
            } catch (error) {
                // File doesn't exist yet, that's ok
                console.log(`📝 File ${path} doesn't exist yet, will create it`);
                sha = null;
            }

            // Prepare content - ensure it's a string
            let contentStr = typeof content === 'object' 
                ? JSON.stringify(content, null, 2) 
                : content.toString();

            // Create or update the file
            const response = await fetch(`${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `${sha ? 'Update' : 'Create'} ${path}`,
                    content: btoa(contentStr),
                    ...(sha ? { sha } : {})
                })
            });

            if (!response.ok) {
                // Check if it's a rate limit issue
                if (response.status === 403) {
                    const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
                    if (rateLimitRemaining === '0') {
                        if (this.syncStatus) this.syncStatus.rateLimitHit();
                        throw new Error('GitHub API rate limit exceeded');
                    }
                }
                
                const error = await response.json();
                const errorMessage = `Failed to ${sha ? 'update' : 'create'} file: ${error.message}`;
                
                if (this.syncStatus) this.syncStatus.saveFailed(path, error);
                console.error(`❌ ${errorMessage}`);
                
                // Only show error in dashboard
                if (document.querySelector('#dashboard')) {
                    if (this.syncStatus) {
                        this.syncStatus.showStatus(errorMessage, 'error', 10000);
                    } else {
                        alert(errorMessage);
                    }
                }
                
                throw new Error(errorMessage);
            }
            
            console.log(`✅ Successfully saved ${path} to GitHub`);
            if (this.syncStatus) this.syncStatus.saveSuccess(path);
            
            return true;
        } catch (error) {
            console.error(`❌ Error updating file ${path}:`, error.message);
            
            if (this.syncStatus) this.syncStatus.saveFailed(path, error);
            
            // Only show error in dashboard
            if (document.querySelector('#dashboard')) {
                if (this.syncStatus) {
                    this.syncStatus.showStatus(`GitHub Error: ${error.message}`, 'error', 10000);
                } else {
                    alert(`GitHub Error: Failed to update ${path}\n${error.message}`);
                }
            }
            
            return false;
        }
    }

    async getAllProjectsData() {
        return await this.getFileContent(`${this.dataFolder}/projects.json`);
    }

    async getAllSkillsData() {
        return await this.getFileContent(`${this.dataFolder}/skills.json`);
    }

    async saveProjectsData(projects) {
        const result = await this.updateFile(`${this.dataFolder}/projects.json`, projects);
        
        // If successful, refresh any project display on the page
        if (result) {
            const projectCards = document.querySelectorAll('#projects-grid .project-card');
            if (projectCards.length > 0) {
                this.refreshProjectsDisplay();
            }
        }
        
        return result;
    }
    
    async saveSkillsData(skills) {
        const result = await this.updateFile(`${this.dataFolder}/skills.json`, skills);
        
        // If successful, refresh any skills display on the page
        if (result) {
            const skillsSection = document.getElementById('skills-section');
            if (skillsSection) {
                this.refreshSkillsDisplay();
            }
        }
        
        return result;
    }
    
    async refreshProjectsDisplay() {
        // Refresh projects display on the main page if applicable
        if (this.syncStatus) {
            this.syncStatus.showStatus('Refreshing projects display...', 'info', 2000);
        }
        
        try {
            // Try to find any loaded projects UI and update it
            const projectsGrid = document.getElementById('projects-grid');
            if (projectsGrid) {
                const freshProjects = await this.getAllProjectsData();
                
                // If there's a function to update the UI, call it
                if (typeof updateProjectsUI === 'function') {
                    updateProjectsUI(freshProjects);
                } else {
                    // Manually update the projects UI since the function might not be available
                    this.updateProjectsUI(freshProjects);
                    
                    // Show a refresh notification
                    if (this.syncStatus) {
                        this.syncStatus.showStatus(
                            'Projects updated manually.',
                            'success',
                            5000
                        );
                    }
                }
            }
        } catch (error) {
            console.error('Error refreshing projects display:', error);
        }
    }
    
    async refreshSkillsDisplay() {
        // Refresh skills display on the main page if applicable
        if (this.syncStatus) {
            this.syncStatus.showStatus('Refreshing skills display...', 'info', 2000);
        }
        
        try {
            // Try to find any loaded skills UI and update it
            const skillsSection = document.getElementById('skills-section');
            
            if (skillsSection) {
                console.log('Found skills section, loading data...');
                const freshSkills = await this.getAllSkillsData();
                console.log('Skills data loaded:', freshSkills);
                
                // Check for specific skill containers
                const skillsContainer = skillsSection.querySelector('.skills-container') || 
                                       skillsSection.querySelector('#skills-grid') ||
                                       document.getElementById('skills-grid');
                                       
                if (skillsContainer) {
                    console.log('Found skills container:', skillsContainer);
                    // Clear existing skills
                    skillsContainer.innerHTML = '';
                    
                    if (!freshSkills || freshSkills.length === 0) {
                        skillsContainer.innerHTML = '<div class="col-span-full text-center py-8 text-gray-400">No skills added yet.</div>';
                        return;
                    }
                    
                    // Add each skill
                    freshSkills.forEach(skill => {
                        const skillCard = document.createElement('div');
                        skillCard.className = 'glass-effect rounded-xl p-5 hover:scale-105 transition-transform';
                        skillCard.setAttribute('data-category', skill.category);
                        
                        skillCard.innerHTML = `
                            <div class="flex justify-between items-start mb-3">
                                <h3 class="text-lg font-bold">${skill.name}</h3>
                                <div class="text-xs font-medium bg-white/10 rounded-full px-2 py-1">${skill.category}</div>
                            </div>
                            <div class="w-full bg-white/10 rounded-full h-2 mt-2">
                                <div class="bg-gradient-to-r from-primary-500 to-accent-500 h-2 rounded-full" style="width: ${skill.proficiency}%"></div>
                            </div>
                            <div class="flex justify-between mt-1">
                                <span class="text-xs">${skill.proficiency}%</span>
                            </div>
                        `;
                        
                        skillsContainer.appendChild(skillCard);
                    });
                    
                    // If there's a sync status manager, notify
                    if (this.syncStatus) {
                        this.syncStatus.showStatus('Skills UI updated with fresh data', 'success', 2000);
                    }
                } else {
                    console.warn('Skills container not found in the skills section');
                    // If there's a function to update the UI, call it
                    if (typeof updateSkillsUI === 'function') {
                        updateSkillsUI(freshSkills);
                    } else {
                        // Manually update the skills UI since the function might not be available
                        this.updateSkillsUI(freshSkills);
                    }
                }
            } else {
                console.warn('Skills section not found');
            }
        } catch (error) {
            console.error('Error refreshing skills display:', error);
            if (this.syncStatus) {
                this.syncStatus.showStatus('Error updating skills: ' + error.message, 'error');
            }
        }
    }

    // Add a fallback manual update function in case updateSkillsUI is not defined
    updateSkillsUI(skills) {
        try {
            const skillsGrid = document.getElementById('skills-grid');
            
            if (!skillsGrid) {
                console.error('Skills grid element not found');
                return;
            }
            
            console.log('Manually updating skills UI with data:', skills);
            
            // Clear existing skills
            skillsGrid.innerHTML = '';
            
            if (!skills || skills.length === 0) {
                skillsGrid.innerHTML = '<div class="col-span-full text-center py-8 text-gray-400">No skills added yet.</div>';
                return;
            }
            
            // Add each skill
            skills.forEach(skill => {
                const skillCard = document.createElement('div');
                skillCard.className = 'glass-effect rounded-xl p-5 hover:scale-105 transition-transform';
                skillCard.setAttribute('data-category', skill.category);
                
                skillCard.innerHTML = `
                    <div class="flex justify-between items-start mb-3">
                        <h3 class="text-lg font-bold">${skill.name}</h3>
                        <div class="text-xs font-medium bg-white/10 rounded-full px-2 py-1">${skill.category}</div>
                    </div>
                    <div class="w-full bg-white/10 rounded-full h-2 mt-2">
                        <div class="bg-gradient-to-r from-primary-500 to-accent-500 h-2 rounded-full" style="width: ${skill.proficiency}%"></div>
                    </div>
                    <div class="flex justify-between mt-1">
                        <span class="text-xs">${skill.proficiency}%</span>
                    </div>
                `;
                
                skillsGrid.appendChild(skillCard);
            });
            
            // Show skills grid and hide static skills if present
            const staticSkills = document.getElementById('static-skills');
            if (staticSkills) {
                staticSkills.classList.add('hidden');
            }
            
            // Show the empty state message if needed
            const emptyState = document.getElementById('no-skills-message');
            if (emptyState) {
                if (skills.length === 0) {
                    emptyState.classList.remove('hidden');
                } else {
                    emptyState.classList.add('hidden');
                }
            }
        } catch (error) {
            console.error('Error manually updating skills UI:', error);
        }
    }

    // Add a fallback manual update function in case updateProjectsUI is not defined
    updateProjectsUI(projects) {
        try {
            const projectsGrid = document.getElementById('projects-grid');
            
            if (!projectsGrid) {
                console.error('Projects grid element not found');
                return;
            }
            
            console.log('Manually updating projects UI with data:', projects);
            
            // Clear existing projects
            projectsGrid.innerHTML = '';
            
            if (!projects || projects.length === 0) {
                // If there's an empty state message, show it
                const noProjectsMessage = document.getElementById('no-projects-message');
                if (noProjectsMessage) {
                    noProjectsMessage.classList.remove('hidden');
                } else {
                    projectsGrid.innerHTML = '<div class="col-span-full text-center py-8 text-gray-400">No projects added yet.</div>';
                }
                return;
            }
            
            // If there's a no projects message, hide it
            const noProjectsMessage = document.getElementById('no-projects-message');
            if (noProjectsMessage) {
                noProjectsMessage.classList.add('hidden');
            }
            
            // Add each project
            projects.forEach(project => {
                const projectCard = document.createElement('div');
                projectCard.className = 'project-card glass-effect rounded-xl overflow-hidden hover:scale-105 transition-transform';
                projectCard.setAttribute('data-category', project.category);
                
                projectCard.innerHTML = `
                    <img src="${project.image || 'images/default-project.jpg'}" alt="${project.title}" class="w-full h-48 object-cover">
                    <div class="p-5">
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="text-lg font-bold">${project.title}</h3>
                            <div class="text-xs font-medium bg-white/10 rounded-full px-2 py-1">${project.category}</div>
                        </div>
                        <p class="text-sm text-gray-300">${project.description}</p>
                        <div class="mt-4 flex justify-between items-center">
                            <a href="#" class="flex items-center text-primary-400 hover:text-primary-300 text-sm">
                                <i class="fas fa-info-circle mr-1"></i>
                                Details
                            </a>
                            <a href="#" class="flex items-center text-primary-400 hover:text-primary-300 text-sm">
                                <i class="fas fa-external-link-alt mr-1"></i>
                                View
                            </a>
                        </div>
                    </div>
                `;
                
                projectsGrid.appendChild(projectCard);
            });
        } catch (error) {
            console.error('Error manually updating projects UI:', error);
        }
    }

    // Check if a file exists in the repository
    async checkFileExists(path) {
        try {
            const headers = {
                'Accept': 'application/vnd.github.v3+json'
            };
            
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }
            
            // Add cache busting
            const response = await fetch(`${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/contents/${path}?t=${Date.now()}`, {
                headers: headers,
                method: 'GET'
            });
            
            return response.status === 200;
        } catch (error) {
            console.error(`Error checking if ${path} exists:`, error);
            return false;
        }
    }

    async createFile(path, content, commitMessage = null) {
        if (!this.token) {
            const message = 'GitHub token not set. Authentication required for creating files.';
            console.error(message);
            
            if (this.syncStatus) {
                this.syncStatus.showStatus(message, 'error', 10000);
            } else {
                alert(message);
            }
            
            throw new Error(message);
        }

        try {
            if (this.syncStatus) this.syncStatus.savingToGitHub(path);
            
            // Check if file already exists
            const exists = await this.checkFileExists(path);
            if (exists) {
                console.log(`File ${path} already exists, updating instead of creating`);
                return await this.updateFile(path, content);
            }
            
            // Prepare content - ensure it's a string
            let contentStr = typeof content === 'object' 
                ? JSON.stringify(content, null, 2) 
                : content.toString();

            const defaultMessage = `Create ${path}`;
            
            // Create the file
            const response = await fetch(`${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: commitMessage || defaultMessage,
                    content: btoa(contentStr)
                })
            });

            if (!response.ok) {
                const error = await response.json();
                if (this.syncStatus) this.syncStatus.saveFailed(path, error);
                
                // Show a big visible error message
                const errorMessage = `Failed to create file: ${error.message}`;
                if (this.syncStatus) {
                    this.syncStatus.showStatus(errorMessage, 'error', 10000);
                } else {
                    alert(errorMessage);
                }
                
                throw new Error(errorMessage);
            }
            
            if (this.syncStatus) this.syncStatus.saveSuccess(path);
            console.log(`File ${path} created successfully`);
            
            return true;
        } catch (error) {
            console.error('Error creating file:', error);
            if (this.syncStatus) this.syncStatus.saveFailed(path, error);
            return false;
        }
    }

    async deleteFile(path, commitMessage = null) {
        if (!this.token) {
            const message = 'GitHub token not set. Authentication required for deleting files.';
            console.error(message);
            
            if (this.syncStatus) {
                this.syncStatus.showStatus(message, 'error', 10000);
            } else {
                alert(message);
            }
            
            throw new Error(message);
        }

        try {
            // Get file to retrieve SHA
            const fileData = await fetch(`${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!fileData.ok) {
                if (fileData.status === 404) {
                    console.log(`File ${path} not found, nothing to delete`);
                    return true;
                }
                
                const error = await fileData.json();
                if (this.syncStatus) this.syncStatus.saveFailed(path, error);
                
                // Show a big visible error message
                const errorMessage = `Failed to delete file: ${error.message}`;
                if (this.syncStatus) {
                    this.syncStatus.showStatus(errorMessage, 'error', 10000);
                } else {
                    alert(errorMessage);
                }
                
                throw new Error(errorMessage);
            }
            
            const data = await fileData.json();
            const sha = data.sha;
            
            // Delete the file
            const response = await fetch(`${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: commitMessage || `Delete ${path}`,
                    sha: sha
                })
            });

            if (!response.ok) {
                const error = await response.json();
                if (this.syncStatus) this.syncStatus.saveFailed(path, error);
                
                // Show a big visible error message
                const errorMessage = `Failed to delete file: ${error.message}`;
                if (this.syncStatus) {
                    this.syncStatus.showStatus(errorMessage, 'error', 10000);
                } else {
                    alert(errorMessage);
                }
                
                throw new Error(errorMessage);
            }
            
            if (this.syncStatus) this.syncStatus.saveSuccess(path);
            console.log(`File ${path} deleted successfully`);
            
            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            if (this.syncStatus) this.syncStatus.saveFailed(path, error);
            return false;
        }
    }

    // Get the current data source for debugging
    getDataSource() {
        return this.currentDataSource || 'unknown';
    }

    // Load profile data from GitHub
    async loadProfileData() {
        try {
            console.log('🔄 Loading profile data...');
            const profileData = await this.getFileContent(`${this.dataFolder}/profile.json`);
            
            // Update profile UI if available
            if (typeof updateProfileUI === 'function') {
                updateProfileUI(profileData);
            }
            
            console.log('✅ Profile data loaded successfully');
            return profileData;
        } catch (error) {
            console.error('❌ Error loading profile data:', error);
            return {};
        }
    }
}

// Initialize GitHub service when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.githubService = new GitHubService();
});
