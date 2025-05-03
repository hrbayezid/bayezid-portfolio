/**
 * Main JavaScript file for Bayezid's Portfolio
 * This file initializes core functionality and all portfolio components
 */

// Set up API endpoint constants
window.API_ENDPOINTS = {
    // Core API endpoints
    SKILLS: '/api/skills',
    PROJECTS: '/api/projects',
    PROFILE: '/api/profile',
    SOCIAL_LINKS: '/api/social_links',
    SETTINGS: '/api/settings',
    
    // GitHub API endpoints
    GITHUB_API: 'https://api.github.com',
    GITHUB_CONTENT: 'https://api.github.com/repos/{owner}/{repo}/contents',
    GITHUB_GISTS: 'https://api.github.com/gists'
};

// Function to initialize the GitHub Service
function initializeGitHubService() {
    // Check if we're in a GitHub Pages environment
    const isGitHubPages = isGitHubPagesEnvironment();
    console.log(`🌐 Running on GitHub Pages: ${isGitHubPages}`);
    
    // Make sure GitHub service is available globally
    if (!window.githubService) {
        console.log('Creating new GitHub service instance');
        window.githubService = new GitHubService();
    } else {
        console.log('GitHub service already initialized');
    }
}

// Function to check if portfolio is deployed on GitHub Pages
function isGitHubPagesEnvironment() {
    const hostname = window.location.hostname;
    return hostname.includes('.github.io') || 
           hostname === 'github.io' || 
           hostname === 'github.com' ||
           hostname === 'localhost' || // For local development testing
           hostname === '127.0.0.1';   // For local development testing
}

// Function to set up the GitHub backend
function setupGitHubBackend() {
    // Check if we're on GitHub Pages or in a development environment
    if (isGitHubPagesEnvironment()) {
        console.log('GitHub Pages environment detected, configuring backend integration');
        
        // Disable certain admin features that require write access if not authenticated
        const token = localStorage.getItem('github_token');
        if (!token) {
            console.log('No GitHub token found, running in read-only mode');
            // We'll set up read-only mode later
        } else {
            console.log('GitHub token found, attempting to use full access mode');
            // Initialize github service with the token
            initializeGitHubService();
        }
        
        // Check for data directory and required files
        checkAndCreateRequiredDirectories();
        
        // Verify .nojekyll file exists (critical for GitHub Pages)
        checkNojekyllFile();
            } else {
        console.log('Not on GitHub Pages, using local storage backend');
    }
}

// Function to check if .nojekyll file exists and create it if needed
async function checkNojekyllFile() {
    if (!window.githubService) {
        console.log('GitHub service not initialized, skipping .nojekyll check');
                return;
            }
            
    try {
        console.log('Checking for .nojekyll file (required for GitHub Pages)...');
        const nojekyllExists = await window.githubService.checkFileExists('.nojekyll');
        
        if (!nojekyllExists) {
            console.log('.nojekyll file not found, creating it...');
            const nojekyllContent = "# This file tells GitHub Pages not to process this site with Jekyll";
            
            await window.githubService.createFile('.nojekyll', nojekyllContent, 
                'Add .nojekyll file to disable Jekyll processing');
                
            console.log('.nojekyll file created successfully');
            } else {
            console.log('.nojekyll file exists, GitHub Pages will serve files correctly');
            }
        } catch (error) {
        console.error('Error checking/creating .nojekyll file:', error);
        console.warn('WARNING: Without .nojekyll file, GitHub Pages may not serve files with underscores correctly');
    }
}

// Function to check for required directories and files
async function checkAndCreateRequiredDirectories() {
    if (!window.githubService) {
        console.log('GitHub service not initialized, skipping directory check');
                return;
            }
            
    // Check if data directory exists
    try {
        console.log('Checking for data directory...');
        const dataExists = await window.githubService.checkFileExists('data');
        if (!dataExists) {
            // In production, we'd want to create directories
            // but GitHub API doesn't directly support creating directories
            // we'll need to create a file in the directory to implicitly create it
            console.log('Data directory not found, creating placeholder file');
            await window.githubService.createFile('data/README.md', 
                '# Portfolio Data\n\nThis directory contains data files for the portfolio application.');
        }
        
        // Check for essential data files
        const requiredFiles = [
            { path: 'data/projects.json', defaultContent: [] },
            { path: 'data/skills.json', defaultContent: [] },
            { path: 'data/profile.json', defaultContent: getDefaultProfile() },
            { path: 'data/settings.json', defaultContent: getDefaultSettings() }
        ];
        
        for (const file of requiredFiles) {
            const exists = await window.githubService.checkFileExists(file.path);
            if (!exists) {
                console.log(`${file.path} not found, creating with default content...`);
                await window.githubService.createFile(file.path, file.defaultContent);
            }
        }
    } catch (error) {
        console.error('Error checking/creating required files:', error);
    }
}

// Default profile data for initialization
function getDefaultProfile() {
    // Return empty object instead of dummy data
    return {};
}

// Default settings data for initialization
function getDefaultSettings() {
    // Return minimal settings with no dummy data
    return {
        theme: "dark"
    };
}

// Initialize global API client
function initializeApiClient() {
    window.apiClient = {
        lastFetchTime: {},
        cache: {}, // Add an in-memory cache for fetched data
        cacheTTL: 300000, // Increase to 5 minutes (300000ms) to reduce GitHub API calls
        maxRetries: 2,   // Maximum number of retry attempts
        
        get: async (endpoint) => {
            try {
                // Check in-memory cache first
                const now = Date.now();
                const cacheKey = endpoint;
                const cachedData = window.apiClient.cache[cacheKey];
                const lastFetch = window.apiClient.lastFetchTime[endpoint] || 0;
                
                // Use cached data if available and not expired
                if (cachedData && (now - lastFetch) < window.apiClient.cacheTTL) {
                    console.log(`📋 Using cached data for ${endpoint} (age: ${(now - lastFetch)/1000}s)`);
                    return cachedData;
                }
                
                // Add timestamp for cache busting (prevent GitHub Pages caching)
                const cacheBuster = `?v=${now}`;
                
                // For public visitors, prioritize direct raw GitHub URL fetch which works without authentication
                if (!document.querySelector('#dashboard')) {
                    // Convert API endpoint to data path for GitHub raw URL
                    const owner = 'hrbayezid';
                    const repo = 'bayezid-portfolio';
                    const dataPath = `data${endpoint.replace('/api', '')}.json`;
                    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${dataPath}${cacheBuster}`;
                    
                    console.log(`🔄 Public fetch: ${rawUrl}`);
                    
                    try {
                        const response = await fetch(rawUrl);
                        
                        if (!response.ok) {
                            if (response.status === 404) {
                                console.warn(`⚠️ File ${dataPath} not found in GitHub repository`);
                                // Return empty data structure - no fallbacks
                                return endpoint.includes('skills') || endpoint.includes('projects') ? [] : {};
                            }
                            
                            throw new Error(`GitHub fetch failed: ${response.status} ${response.statusText}`);
                        }
                        
                        const jsonData = await response.json();
                        console.log(`💾 Data loaded from direct GitHub URL: ${dataPath}`);
                        
                        // For public view, we don't cache in localStorage, only in memory during session
                        window.apiClient.cache[cacheKey] = jsonData;
                        window.apiClient.lastFetchTime[endpoint] = now;
                        
                        return jsonData;
                    } catch (error) {
                        console.error(`❌ Error fetching ${endpoint} from GitHub:`, error.message);
                        
                        // Return empty data structure without any fallbacks
                        return endpoint.includes('skills') || endpoint.includes('projects') ? [] : {};
                    }
                }
                
                // If we reach here, we're in dashboard (admin) mode with GitHub service
                if (window.githubService) {
                    // Log the attempt
                    console.log(`🔄 Admin API GET ${endpoint} (via GitHub service)`);
                    if (window.syncStatus) {
                        window.syncStatus.showStatus(`Fetching ${endpoint}...`, 'info', 2000);
                    }
                    
                    try {
                        // Convert API endpoint to data path
                        const dataPath = `data${endpoint.replace('/api', '')}.json`;
                        const data = await window.githubService.getFileContent(dataPath);
                        
                        // Cache successful results
                        window.apiClient.cache[cacheKey] = data;
                        window.apiClient.lastFetchTime[endpoint] = now;
                        
                        // Check which source was used
                        const source = window.githubService.getDataSource();
                        if (source) {
                            console.log(`✅ Data source: ${source}`);
                            if (window.syncStatus) {
                                window.syncStatus.fetchSuccess(dataPath);
                            }
                        }
                        
                        console.log(`✅ API GET ${endpoint} complete in ${Date.now() - now}ms`);
                        return data;
                    } catch (githubError) {
                        console.error(`❌ GitHub service fetch failed for ${endpoint}:`, githubError.message);
                        
                        // Fall back to direct raw GitHub URL for admin mode
                        try {
                            console.log(`🔄 Falling back to direct GitHub URL for ${endpoint}`);
                            const owner = 'hrbayezid';
                            const repo = 'bayezid-portfolio';
                            const dataPath = `data${endpoint.replace('/api', '')}.json`;
                            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${dataPath}${cacheBuster}`;
                            
                            const rawResponse = await fetch(rawUrl);
                            if (!rawResponse.ok) {
                                throw new Error(`Raw GitHub fetch failed: ${rawResponse.status} ${rawResponse.statusText}`);
                            }
                            
                            const jsonData = await rawResponse.json();
                            console.log(`💾 Data loaded from direct GitHub URL`);
                            
                            // Cache successful results
                            window.apiClient.cache[cacheKey] = jsonData;
                            window.apiClient.lastFetchTime[endpoint] = now;
                            
                            return jsonData;
                        } catch (rawError) {
                            console.error(`❌ Direct GitHub fetch also failed:`, rawError.message);
                            
                            // Show errors only in dashboard
                            if (window.syncStatus) {
                                window.syncStatus.fetchFailed(endpoint, rawError);
                                window.syncStatus.showStatus(`Error fetching ${endpoint}: ${rawError.message}`, 'error', 10000);
                            }
                            
                            // Check if we have stale cache data we can use
                            if (cachedData) {
                                console.warn(`⚠️ Using stale cached data for ${endpoint} as fallback`);
                                return cachedData;
                            }
                            
                            // Return empty data structure based on endpoint without using dummy data
                            if (endpoint.includes('skills') || endpoint.includes('projects')) {
                                return [];
                            } else if (endpoint.includes('profile')) {
                                return {};
                            } else {
                                return null;
                            }
                        }
                    }
                } else {
                    // GitHub service not available, try direct GitHub fetch
                    console.log(`🔄 GitHub service not available, using direct GitHub URL for ${endpoint}`);
                    const owner = 'hrbayezid';
                    const repo = 'bayezid-portfolio';
                    const dataPath = `data${endpoint.replace('/api', '')}.json`;
                    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${dataPath}${cacheBuster}`;
                    
                    try {
                        const response = await fetch(rawUrl);
                        if (!response.ok) {
                            throw new Error(`Raw GitHub fetch failed: ${response.status} ${response.statusText}`);
                        }
                        
                        const jsonData = await response.json();
                        console.log(`💾 Data loaded from direct GitHub URL`);
                        
                        // Cache successful results in memory only
                        window.apiClient.cache[cacheKey] = jsonData;
                        window.apiClient.lastFetchTime[endpoint] = now;
                        
                        return jsonData;
                    } catch (directError) {
                        console.error(`❌ Direct GitHub fetch failed:`, directError.message);
                        
                        // Show errors only in dashboard
                        if (document.querySelector('#dashboard')) {
                            if (window.syncStatus) {
                                window.syncStatus.showStatus(`Error fetching ${endpoint}: ${directError.message}`, 'error', 10000);
                            }
                        }
                        
                        // Check if we have stale cache data we can use
                        if (cachedData) {
                            console.warn(`⚠️ Using stale cached data for ${endpoint} as fallback`);
                            return cachedData;
                        }
                        
                        // Return empty data structure with no dummy data
                        return endpoint.includes('skills') || endpoint.includes('projects') ? [] : {};
                    }
                }
            } catch (error) {
                console.error(`❌ API GET error (${endpoint}):`, error.message);
                
                // Show errors only in dashboard
                if (document.querySelector('#dashboard')) {
                    if (window.syncStatus) {
                        window.syncStatus.showStatus(`Error fetching ${endpoint}: ${error.message}`, 'error', 10000);
                    }
                }
                
                // Return empty data with no dummy fallback
                return endpoint.includes('skills') || endpoint.includes('projects') ? [] : {};
            }
        },
        
        // Method to explicitly clear cache for an endpoint or all endpoints
        clearCache: (endpoint = null) => {
            if (endpoint) {
                delete window.apiClient.cache[endpoint];
                delete window.apiClient.lastFetchTime[endpoint];
                console.log(`🧹 Cache cleared for ${endpoint}`);
            } else {
                window.apiClient.cache = {};
                window.apiClient.lastFetchTime = {};
                console.log(`🧹 All cache cleared`);
            }
        },
        
        shouldRefresh: (endpoint) => {
            const lastFetch = window.apiClient.lastFetchTime[endpoint] || 0;
            const now = Date.now();
            return (now - lastFetch) > window.apiClient.cacheTTL;
        },
        
        post: async (endpoint, data) => {
            try {
                // Record operation start time for diagnostics
                const startTime = Date.now();
                
                // If GitHub Service is available and initialized, use it
                if (window.githubService && window.isGitHubPagesEnvironment()) {
                    console.log(`API POST ${endpoint} (via GitHub)`);
                    
                    if (window.syncStatus) {
                        window.syncStatus.showStatus(`Saving to ${endpoint}...`, 'info', 3000);
                    }
                    
                    try {
                        // Convert API endpoint to data path
                        const dataPath = `data${endpoint.replace('/api', '')}.json`;
                        const success = await window.githubService.updateFile(dataPath, data);
                        
                        if (success) {
                            console.log(`API POST ${endpoint} success in ${Date.now() - startTime}ms`);
                            
                            if (window.syncStatus) {
                                window.syncStatus.showStatus(`Data saved to ${endpoint} successfully`, 'success');
                            }
                            
                            // Force refresh cached data for this endpoint
                            window.apiClient.lastFetchTime[endpoint] = 0;
                            
                            // Refresh the UI immediately with the new data
                            if (endpoint.includes('skills')) {
                                if (typeof updateSkillsUI === 'function') {
                                    updateSkillsUI(data);
                                }
                            } else if (endpoint.includes('projects')) {
                                if (typeof updateProjectsUI === 'function') {
                                    updateProjectsUI(data);
                                }
                            } else if (endpoint.includes('profile')) {
                                if (typeof updateProfileUI === 'function') {
                                    updateProfileUI(data);
                                }
                            }
                            
                            return true;
            } else {
                            throw new Error('GitHub update failed');
                        }
                    } catch (githubError) {
                        console.error(`GitHub save failed for ${endpoint}:`, githubError);
                        
                        if (window.syncStatus) {
                            window.syncStatus.showStatus(`GitHub save failed: ${githubError.message}`, 'error', 10000);
        } else {
                            alert(`GitHub Error: Failed to save to ${endpoint}\n${githubError.message}`);
                        }
                        
                        return false;
                    }
        } else {
                    // GitHub service not available, show error
                    const errorMsg = 'GitHub service not initialized. Cannot save data.';
                    console.error(errorMsg);
                    
                    if (window.syncStatus) {
                        window.syncStatus.showStatus(errorMsg, 'error', 10000);
        } else {
                        alert(errorMsg);
                    }
                    
                    return false;
                }
            } catch (error) {
                console.error(`API POST error (${endpoint}):`, error);
                
                if (window.syncStatus) {
                    window.syncStatus.showStatus(`Error saving data: ${error.message}`, 'error', 10000);
                } else {
                    alert(`Error saving data: ${error.message}`);
                }
                
                return false;
            }
        },
        
        delete: async (endpoint) => {
            try {
                // Record operation start time for diagnostics
                const startTime = Date.now();
                
                // If GitHub Service is available and initialized, use it
                if (window.githubService && window.isGitHubPagesEnvironment()) {
                    console.log(`API DELETE ${endpoint} (via GitHub)`);
                    
                    if (window.syncStatus) {
                        window.syncStatus.showStatus(`Deleting from ${endpoint}...`, 'info', 3000);
                    }
                    
                    try {
                        // Convert API endpoint to data path
                        const dataPath = `data${endpoint.replace('/api', '')}.json`;
                        const success = await window.githubService.deleteFile(dataPath);
                        
                        if (success) {
                            console.log(`API DELETE ${endpoint} success in ${Date.now() - startTime}ms`);
                            
                            if (window.syncStatus) {
                                window.syncStatus.showStatus(`Data deleted from ${endpoint} successfully`, 'success');
                            }
                            
                            // Force refresh cached data for this endpoint
                            window.apiClient.lastFetchTime[endpoint] = 0;
                            
        return true;
                } else {
                            throw new Error('GitHub delete failed');
                        }
                    } catch (githubError) {
                        console.error(`GitHub delete failed for ${endpoint}:`, githubError);
                        
                        if (window.syncStatus) {
                            window.syncStatus.showStatus(`GitHub delete failed: ${githubError.message}`, 'error', 10000);
                    } else {
                            alert(`GitHub Error: Failed to delete from ${endpoint}\n${githubError.message}`);
                        }
                        
            return false;
        }
        } else {
                    // GitHub service not available, show error
                    const errorMsg = 'GitHub service not initialized. Cannot delete data.';
                    console.error(errorMsg);
                    
                    if (window.syncStatus) {
                        window.syncStatus.showStatus(errorMsg, 'error', 10000);
                    } else {
                        alert(errorMsg);
                    }
                    
            return false;
        }
            } catch (error) {
                console.error(`API DELETE error (${endpoint}):`, error);
                
                if (window.syncStatus) {
                    window.syncStatus.showStatus(`Error deleting data: ${error.message}`, 'error', 10000);
                } else {
                    alert(`Error deleting data: ${error.message}`);
                }
                
            return false;
        }
        },
        
        refreshData: async (endpoint) => {
            try {
                if (window.syncStatus) {
                    window.syncStatus.showStatus(`Refreshing ${endpoint} data...`, 'info', 2000);
                }
                
                // Force invalidate cache
                window.apiClient.lastFetchTime[endpoint] = 0;
                
                // Fetch fresh data
                const freshData = await window.apiClient.get(endpoint);
                
                // Update UI if possible
                if (endpoint.includes('skills')) {
                    if (typeof updateSkillsUI === 'function') {
                        updateSkillsUI(freshData);
                    }
                } else if (endpoint.includes('projects')) {
                    if (typeof updateProjectsUI === 'function') {
                        updateProjectsUI(freshData);
                    }
                } else if (endpoint.includes('profile')) {
                    if (typeof updateProfileUI === 'function') {
                        updateProfileUI(freshData);
                    }
                }
                
                if (window.syncStatus) {
                    window.syncStatus.showStatus(`${endpoint} data refreshed`, 'success', 3000);
                }
                
                return freshData;
        } catch (error) {
                console.error(`Error refreshing ${endpoint} data:`, error);
                
                if (window.syncStatus) {
                    window.syncStatus.showStatus(`Error refreshing data: ${error.message}`, 'error');
                }
                
                return null;
            }
        }
    };
    
    // Add refresh data handler to the window object
    window.refreshData = window.apiClient.refreshData;
}

// Set up dashboard tabs
function setupDashboardTabs() {
    // Debug timestamp to track when this function runs
    const setupTime = new Date().toISOString();
    console.log(`🕒 [TABS ${setupTime}] Setting up dashboard tabs`);
    
    const tabButtons = document.querySelectorAll('.dashboard-tab');
    const tabContents = document.querySelectorAll('.dashboard-content');
    const tabsContainer = document.querySelector('.dashboard-tab')?.parentElement;
    const contentContainer = document.querySelector('.dashboard-content')?.parentElement;
    
    console.log(`🔍 [TABS] Found ${tabButtons.length} tab buttons, ${tabContents.length} content areas`);
    console.log(`🔍 [TABS] Tabs container found: ${!!tabsContainer}, Content container found: ${!!contentContainer}`);
    
    // Make sure function is globally available
    if (window.setupDashboardTabs !== setupDashboardTabs) {
        window.setupDashboardTabs = setupDashboardTabs;
        console.log('🔄 [TABS] Made setupDashboardTabs globally available');
    }
    
    // Early check to make sure we have the containers
    if (!tabsContainer || !contentContainer) {
        console.warn('⚠️ [TABS] Dashboard structure not found in DOM');
        return;
    }
    
    // Ensure GitHub Setup tab exists
    let githubSetupTab = document.querySelector('[data-tab="github-setup"]');
    let githubSetupContent = document.getElementById('github-setup-tab');
    
    // Create GitHub Setup tab if it doesn't exist but containers exist
    if (!githubSetupTab && tabsContainer) {
        console.log('🔧 [TABS] Creating missing GitHub Setup tab');
        
        // Create tab button
        githubSetupTab = document.createElement('button');
        githubSetupTab.className = 'dashboard-tab px-4 py-3 font-medium';
        githubSetupTab.setAttribute('data-tab', 'github-setup');
        githubSetupTab.innerHTML = '<i class="fab fa-github mr-2"></i>GitHub Setup';
        tabsContainer.appendChild(githubSetupTab);
        
        console.log('✅ [TABS] Created GitHub Setup tab button');
    } else if (githubSetupTab) {
        console.log('✅ [TABS] GitHub Setup tab already exists');
        
        // Make sure the tab is visible
        githubSetupTab.style.display = '';
        githubSetupTab.classList.remove('hidden');
    }
    
    // Create GitHub Setup content if it doesn't exist
    if (!githubSetupContent && contentContainer) {
        console.log('🔧 [TABS] Creating missing GitHub Setup content');
        
        // Create content div
        githubSetupContent = document.createElement('div');
        githubSetupContent.id = 'github-setup-tab';
        githubSetupContent.className = 'dashboard-content hidden';
        githubSetupContent.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold">GitHub Backend Configuration</h3>
                <button id="test-github-connection" class="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-sync-alt mr-2"></i>Test Connection
                </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="glass-effect rounded-xl p-6">
                    <h4 class="text-lg font-medium mb-4">GitHub Repository Setup</h4>
                    <form id="github-config-form" class="space-y-4">
                        <div>
                            <label for="github-owner" class="block text-sm font-medium mb-1">Repository Owner</label>
                            <input type="text" id="github-owner" class="w-full p-2 rounded-lg" placeholder="e.g. hrbayezid" value="hrbayezid">
                            <p class="text-xs text-gray-400 mt-1">Your GitHub username</p>
                        </div>
                        <div>
                            <label for="github-repo" class="block text-sm font-medium mb-1">Repository Name</label>
                            <input type="text" id="github-repo" class="w-full p-2 rounded-lg" placeholder="e.g. bayezid-portfolio" value="bayezid-portfolio">
                            <p class="text-xs text-gray-400 mt-1">The name of your portfolio repository</p>
                        </div>
                        <div>
                            <label for="github-token" class="block text-sm font-medium mb-1">GitHub Personal Access Token</label>
                            <input type="password" id="github-token" class="w-full p-2 rounded-lg" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx">
                            <p class="text-xs text-gray-400 mt-1">
                                Token with 'repo' scope. 
                                <a href="https://github.com/settings/tokens/new" target="_blank" class="text-primary-400 hover:underline">
                                    Create one here
                                </a>
                            </p>
                        </div>
                        <div>
                            <label for="github-branch" class="block text-sm font-medium mb-1">Branch Name</label>
                            <input type="text" id="github-branch" class="w-full p-2 rounded-lg" placeholder="main" value="main">
                            <p class="text-xs text-gray-400 mt-1">The branch to store your data (usually 'main')</p>
                        </div>
                        <button type="submit" id="save-github-config" class="w-full py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg">
                            <i class="fas fa-save mr-2"></i>Save Configuration
                        </button>
                    </form>
                </div>
                <div class="glass-effect rounded-xl p-6">
                    <h4 class="text-lg font-medium mb-4">Status & Actions</h4>
                    <div id="github-status" class="mb-4 p-4 bg-gray-800/50 rounded-lg">
                        <p class="text-gray-400">GitHub connection status will appear here</p>
                    </div>
                    <div class="space-y-3">
                        <button id="init-github-backend" class="w-full py-2 bg-gradient-to-r from-primary-500 to-purple-500 hover:from-primary-600 hover:to-purple-600 text-white rounded-lg transition">
                            <i class="fas fa-cloud-upload-alt mr-2"></i>Initialize GitHub Backend
                        </button>
                        <button id="migrate-to-github" class="w-full py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg transition">
                            <i class="fas fa-file-export mr-2"></i>Migrate Local Data to GitHub
                        </button>
                    </div>
                </div>
            </div>
            <div class="glass-effect rounded-xl p-6">
                <h4 class="text-lg font-medium mb-4">Setup Progress</h4>
                <div id="github-setup-log" class="h-64 overflow-y-auto p-4 bg-gray-800/50 rounded-lg font-mono text-sm">
                    <p class="text-gray-400">Setup logs will appear here...</p>
                </div>
            </div>
        `;
        contentContainer.appendChild(githubSetupContent);
        
        console.log('✅ [TABS] Created GitHub Setup content');
        
        // Initialize GitHub setup buttons
        setTimeout(() => {
            if (typeof initializeGitHubSetupButtons === 'function') {
                initializeGitHubSetupButtons();
                console.log('✅ [TABS] Initialized GitHub Setup buttons');
            } else {
                console.warn('⚠️ [TABS] initializeGitHubSetupButtons function not available');
            }
        }, 500);
    } else if (githubSetupContent) {
        console.log('✅ [TABS] GitHub Setup content already exists');
    }
    
    // Now get updated tab buttons and contents
    const updatedTabButtons = document.querySelectorAll('.dashboard-tab');
    const updatedTabContents = document.querySelectorAll('.dashboard-content');
    
    // Add click event to all tab buttons
    updatedTabButtons.forEach(btn => {
        // Remove any existing click handlers to prevent duplicates
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', () => {
            // Toggle active class on tab buttons
            updatedTabButtons.forEach(b => b.classList.remove('active'));
            newBtn.classList.add('active');
            
            // Show corresponding tab content
            const tabId = newBtn.getAttribute('data-tab');
            const content = document.getElementById(`${tabId}-tab`);
            
            if (content) {
                updatedTabContents.forEach(c => c.classList.add('hidden'));
                content.classList.remove('hidden');
                
                // Log tab change
                console.log(`Tab changed to: ${tabId}`);
            } else {
                console.error(`Tab content not found: ${tabId}-tab`);
            }
        });
    });
    
    // Set the default active tab if none is active
    const activeTab = document.querySelector('.dashboard-tab.active');
    if (!activeTab && updatedTabButtons.length > 0) {
        updatedTabButtons[0].click();
    }
    
    console.log(`✅ [TABS ${setupTime}] Dashboard tabs setup complete`);
}

// Setup content filters (skills, projects)
function setupContentFilters() {
    // Skills filters in dashboard
    const skillFilters = document.querySelectorAll('.skill-filter');
    if (skillFilters.length > 0) {
        skillFilters.forEach(filter => {
            filter.addEventListener('click', () => {
                const category = filter.getAttribute('data-filter');
                
                // Update active state on filters
                skillFilters.forEach(f => f.classList.remove('active'));
                filter.classList.add('active');
                
                // Filter skills in table
                filterTableRows('#skills-table-body tr', category);
            });
        });
    }
    
    // Project filters in dashboard
    const projectFilters = document.querySelectorAll('.project-filter-admin');
    if (projectFilters.length > 0) {
        projectFilters.forEach(filter => {
            filter.addEventListener('click', () => {
                const category = filter.getAttribute('data-filter');
                
                // Update active state on filters
                projectFilters.forEach(f => f.classList.remove('active'));
                filter.classList.add('active');
                
                // Filter projects in table
                filterTableRows('#projects-table-body tr', category);
            });
        });
    }
    
    // Public project filters
    const publicProjectFilters = document.querySelectorAll('.project-filter');
    if (publicProjectFilters.length > 0) {
        publicProjectFilters.forEach(filter => {
            filter.addEventListener('click', () => {
                const category = filter.getAttribute('data-filter');
                
                // Update active state on filters
                publicProjectFilters.forEach(f => f.classList.remove('active-filter'));
                filter.classList.add('active-filter');
                
                // Filter project cards
                filterProjectCards(category);
            });
        });
    }
}

// Filter table rows based on category
function filterTableRows(selector, category) {
    const rows = document.querySelectorAll(selector);
    if (rows.length === 0) return;
    
    rows.forEach(row => {
        // Get the category cell (assumed to be the second cell)
        const categoryCell = row.querySelector('td:nth-child(2)');
        if (!categoryCell) return;
        
        if (category === 'all' || categoryCell.textContent.includes(category)) {
            row.classList.remove('hidden');
                    } else {
            row.classList.add('hidden');
        }
    });
}

// Filter project cards in the public view
function filterProjectCards(category) {
    const cards = document.querySelectorAll('#projects-grid .project-card');
    if (cards.length === 0) return;
    
    cards.forEach(card => {
        if (category === 'all' || card.getAttribute('data-category') === category) {
            card.classList.remove('hidden');
                    } else {
            card.classList.add('hidden');
        }
    });
}

// Initialize the portfolio application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing portfolio application...');
    
    // Initialize GitHub Service for both public and admin access
    initializeGitHubService();
    
    // Initialize API client
    initializeApiClient();
    
    // Set up dashboard tabs and filters if in admin area
    if (document.querySelector('#dashboard')) {
        console.log('🔧 Dashboard detected, setting up admin features');
        setupDashboardTabs();
        setupSkillsAndProjectsButtons();
        setupSettingsButtons();
        
        // Always ensure GitHub setup tab is visible after login
        ensureGitHubSetupTabIsVisible();
    } else {
        console.log('Public page detected, setting up content filters');
    }
    
    // Set up mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuToggle && mobileMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
    
    // Setup password toggle functionality for GitHub token inputs
    const passwordToggles = document.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input[type="password"]');
            if (input) {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                
                // Toggle eye icon
                const icon = this.querySelector('i');
                if (icon) {
                    if (type === 'password') {
                        icon.classList.remove('fa-eye-slash');
                        icon.classList.add('fa-eye');
                    } else {
                        icon.classList.remove('fa-eye');
                        icon.classList.add('fa-eye-slash');
                    }
                }
            }
        });
    });
    
    // Set up content filters
    setupContentFilters();
    
    // Load profile settings into settings form
    loadProfileSettings();
    
    // Set up refresh buttons
    setupRefreshButtons();
    
    // Initialize back to top button
    initBackToTopButton();
    
    // Check URL params for actions
    checkUrlParams();
    
    // Load public data for non-dashboard pages
    if (!document.querySelector('#dashboard')) {
        loadPublicPortfolioData();
    }
    
    // Setup enable edit mode button
    const enableEditModeBtn = document.getElementById('enable-edit-mode');
    if (enableEditModeBtn) {
        enableEditModeBtn.addEventListener('click', enableEditMode);
    }
});

// Make sure GitHub Setup tab is visible after login
function ensureGitHubSetupTabIsVisible() {
    console.log('🔄 Checking GitHub Setup tab visibility (main.js)...');
    
    // Wait for the DOM to be fully loaded
    if (document.readyState !== 'complete') {
        console.log('🕒 DOM not fully loaded, waiting...');
        window.addEventListener('load', ensureGitHubSetupTabIsVisible);
        return;
    }
    
    // Small delay to ensure all DOM elements are fully rendered
    setTimeout(() => {
        const setupTab = document.querySelector('[data-tab="github-setup"]');
        const setupContent = document.getElementById('github-setup-tab');
        
        if (setupTab && setupContent) {
            // Check if the dashboard is visible (we're in admin mode)
            const isDashboardVisible = !document.getElementById('dashboard')?.classList.contains('hidden');
            
            if (isDashboardVisible) {
                console.log('📊 Dashboard is visible, ensuring GitHub Setup tab is also visible');
                
                // Make sure the tab is in the DOM and not hidden
                setupTab.style.display = '';
                setupTab.classList.remove('hidden');
                
                // Debug log
                console.log('✅ GitHub Setup tab is made visible for admin');
            } else {
                console.log('ℹ️ Dashboard is not visible (not in admin mode)');
            }
        } else {
            console.error('❌ GitHub Setup tab not found in the DOM (main.js)');
            
            // Debug info
            console.log('📄 Available tabs:', 
                Array.from(document.querySelectorAll('.dashboard-tab'))
                    .map(tab => `${tab.textContent.trim()} (${tab.getAttribute('data-tab')})`));
        }
    }, 500);
}

// Load portfolio data for public pages
async function loadPublicPortfolioData() {
    console.log('🔄 Loading public portfolio data directly from GitHub...');
    
    // Add loading indicators to sections
    const sections = {
        'skills-grid': 'Loading skills...',
        'projects-grid': 'Loading projects...',
    };
    
    // Show loading indicators
    Object.keys(sections).forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            showLoadingIndicator(container, sections[id]);
        }
    });
    
    try {
        // Load skills data
        if (document.getElementById('skills-section')) {
            console.log('🔄 Loading skills data for public display...');
            try {
                const skills = await window.apiClient.get(window.API_ENDPOINTS.SKILLS);
                if (skills && skills.length > 0) {
                    console.log(`💾 Loaded ${skills.length} skills successfully`);
                    updateSkillsUI(skills);
                } else {
                    console.warn('⚠️ No skills data found or empty skills array');
                    // Show empty state
                    const skillsGrid = document.getElementById('skills-grid');
                    if (skillsGrid) {
                        showEmptyState(skillsGrid, 'No skills data available yet.');
                    }
                }
            } catch (skillsError) {
                console.error('❌ Error loading skills data:', skillsError);
                // Show error state
                const skillsGrid = document.getElementById('skills-grid');
                if (skillsGrid) {
                    showErrorState(skillsGrid, 'Could not load skills data. Please try again later.');
                }
            }
        }
        
        // Load projects data
        if (document.getElementById('projects-grid')) {
            console.log('🔄 Loading projects data for public display...');
            try {
                const projects = await window.apiClient.get(window.API_ENDPOINTS.PROJECTS);
                if (projects && projects.length > 0) {
                    console.log(`💾 Loaded ${projects.length} projects successfully`);
                    updateProjectsUI(projects);
                } else {
                    console.warn('⚠️ No projects data found or empty projects array');
                    // Show empty state
                    const projectsGrid = document.getElementById('projects-grid');
                    if (projectsGrid) {
                        showEmptyState(projectsGrid, 'No projects data available yet.');
                    }
                }
            } catch (projectsError) {
                console.error('❌ Error loading projects data:', projectsError);
                // Show error state
                const projectsGrid = document.getElementById('projects-grid');
                if (projectsGrid) {
                    showErrorState(projectsGrid, 'Could not load projects data. Please try again later.');
                }
            }
        }
        
        // Load profile data
        console.log('🔄 Loading profile data...');
        try {
            const profile = await window.apiClient.get(window.API_ENDPOINTS.PROFILE);
            if (profile && Object.keys(profile).length > 0) {
                console.log('💾 Profile data loaded successfully');
                updateProfileUI(profile);
            } else {
                console.warn('⚠️ No profile data found or empty profile object');
                // Don't update profile UI with dummy data
            }
        } catch (profileError) {
            console.error('❌ Error loading profile data:', profileError);
        }
        
        console.log('✅ Public portfolio data loading complete');
    } catch (error) {
        console.error('❌ Error loading public portfolio data:', error);
    }
}

/**
 * Utility function to show a loading indicator in a container
 * @param {HTMLElement} container - The container element
 * @param {string} message - The loading message to display
 */
function showLoadingIndicator(container, message = 'Loading...') {
    if (!container) return;
    
    // Create a loading indicator
    const loadingHTML = `
        <div class="col-span-full text-center py-8 animate-pulse">
            <div class="inline-block rounded-full h-8 w-8 bg-primary-500/50 animate-pulse mb-2"></div>
            <p class="text-gray-400">${message}</p>
        </div>
    `;
    
    // Set the loading indicator
    container.innerHTML = loadingHTML;
}

/**
 * Utility function to show an empty state in a container
 * @param {HTMLElement} container - The container element
 * @param {string} message - The empty state message to display
 */
function showEmptyState(container, message = 'No data found.') {
    if (!container) return;
    
    // Create an empty state
    const emptyHTML = `
        <div class="col-span-full text-center py-8">
            <i class="fas fa-inbox text-3xl text-gray-400 mb-2"></i>
            <p class="text-gray-400">${message}</p>
        </div>
    `;
    
    // Set the empty state
    container.innerHTML = emptyHTML;
}

/**
 * Utility function to show an error state in a container
 * @param {HTMLElement} container - The container element
 * @param {string} message - The error message to display
 */
function showErrorState(container, message = 'An error occurred. Please try again later.') {
    if (!container) return;
    
    // Create an error state
    const errorHTML = `
        <div class="col-span-full text-center py-8">
            <i class="fas fa-exclamation-triangle text-3xl text-amber-500/70 mb-2"></i>
            <p class="text-gray-400">${message}</p>
            <button class="mt-4 px-4 py-2 bg-primary-500/80 text-white rounded-lg hover:bg-primary-600/80 text-sm transition-colors refresh-data-btn">
                <i class="fas fa-sync-alt mr-1"></i>Try Again
            </button>
        </div>
    `;
    
    // Set the error state
    container.innerHTML = errorHTML;
    
    // Add event listener to the refresh button
    const refreshBtn = container.querySelector('.refresh-data-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            // Show loading indicator again
            showLoadingIndicator(container, 'Refreshing...');
            
            // Force a reload of data
            window.apiClient.clearCache();
            loadPublicPortfolioData();
        });
    }
}

// Function to handle adding a new skill
function addNewSkill() {
    console.log('Adding new skill');
    
    // Create skill form HTML
    const formHTML = `
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4">Add New Skill</h3>
            <form id="add-skill-form" class="space-y-4">
                    <div>
                    <label class="block text-sm font-medium mb-1">Skill Name</label>
                    <input type="text" id="skill-name" class="w-full px-3 py-2 bg-white/10 rounded-lg" required>
                    </div>
                    <div>
                    <label class="block text-sm font-medium mb-1">Category</label>
                    <select id="skill-category" class="w-full px-3 py-2 bg-white/10 rounded-lg">
                        <option value="programming">Programming</option>
                        <option value="data-analysis">Data Analysis</option>
                        <option value="data-visualization">Data Visualization</option>
                        <option value="machine-learning">Machine Learning</option>
                        </select>
                        </div>
                    <div>
                    <label class="block text-sm font-medium mb-1">Proficiency (0-100%)</label>
                    <input type="range" id="skill-proficiency" min="0" max="100" value="75" class="w-full">
                    <div class="text-right"><span id="proficiency-value">75</span>%</div>
                    </div>
                <div class="flex justify-end space-x-3 pt-4">
                    <button type="button" id="cancel-skill" class="px-4 py-2 bg-white/10 rounded-lg">Cancel</button>
                    <button type="submit" class="px-4 py-2 bg-primary-500 text-white rounded-lg">Save Skill</button>
                        </div>
                </form>
            </div>
        `;
        
    // Create modal element
    const modal = document.createElement('div');
    modal.classList.add('fixed', 'inset-0', 'flex', 'items-center', 'justify-center', 'z-50', 'bg-black/50');
    modal.innerHTML = `
        <div class="glass-effect rounded-xl w-full max-w-md mx-4">
            ${formHTML}
        </div>
    `;
    
    // Add modal to document
        document.body.appendChild(modal);

    // Handle proficiency range input
    const proficiencyInput = document.getElementById('skill-proficiency');
    const proficiencyValue = document.getElementById('proficiency-value');
    proficiencyInput.addEventListener('input', () => {
        proficiencyValue.textContent = proficiencyInput.value;
    });
    
    // Handle cancel button
    document.getElementById('cancel-skill').addEventListener('click', () => {
        document.body.removeChild(modal);
        });
        
        // Handle form submission
    document.getElementById('add-skill-form').addEventListener('submit', async (e) => {
                e.preventDefault();
            
        const skillName = document.getElementById('skill-name').value;
        const skillCategory = document.getElementById('skill-category').value;
        const skillProficiency = document.getElementById('skill-proficiency').value;
        
        // Create skill object
        const skill = {
            id: Date.now().toString(),
            name: skillName,
            category: skillCategory,
            proficiency: parseInt(skillProficiency),
            icon: 'fas fa-code', // Default icon
            createdAt: new Date().toISOString()
        };
        
        // Get existing skills from localStorage or API
        let skills = [];
        if (window.apiClient) {
            const existingSkills = await window.apiClient.get(window.API_ENDPOINTS.SKILLS);
            if (existingSkills && Array.isArray(existingSkills)) {
                skills = existingSkills;
            }
                } else {
            const storedSkills = localStorage.getItem('skills');
            if (storedSkills) {
                skills = JSON.parse(storedSkills);
            }
        }
        
        // Add new skill
        skills.push(skill);
        
        // Save updated skills
        if (window.apiClient) {
            await window.apiClient.post(window.API_ENDPOINTS.SKILLS, skills);
        } else {
            localStorage.setItem('skills', JSON.stringify(skills));
        }
        
        // Close modal
        document.body.removeChild(modal);
        
        // Refresh skills table
        updateSkillsTable(skills);
        
        console.log('Skill added:', skill);
    });
}

// Function to handle adding a new project
function addNewProject() {
    console.log('Adding new project');
    
    // Create project form HTML
    const formHTML = `
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4">Add New Project</h3>
            <form id="add-project-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1">Project Title</label>
                    <input type="text" id="project-title" class="w-full px-3 py-2 bg-white/10 rounded-lg" required>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Category</label>
                    <select id="project-category" class="w-full px-3 py-2 bg-white/10 rounded-lg">
                        <option value="analysis">Data Analysis</option>
                        <option value="viz">Data Visualization</option>
                        <option value="ml">Machine Learning</option>
                        <option value="dashboard">Dashboards</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Description</label>
                    <textarea id="project-description" class="w-full px-3 py-2 bg-white/10 rounded-lg" rows="3"></textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Image URL</label>
                    <input type="text" id="project-image" class="w-full px-3 py-2 bg-white/10 rounded-lg" placeholder="https://example.com/image.jpg">
                </div>
                <div class="flex justify-end space-x-3 pt-4">
                    <button type="button" id="cancel-project" class="px-4 py-2 bg-white/10 rounded-lg">Cancel</button>
                    <button type="submit" class="px-4 py-2 bg-primary-500 text-white rounded-lg">Save Project</button>
                </div>
            </form>
        </div>
    `;
    
    // Create modal element
    const modal = document.createElement('div');
    modal.classList.add('fixed', 'inset-0', 'flex', 'items-center', 'justify-center', 'z-50', 'bg-black/50');
    modal.innerHTML = `
        <div class="glass-effect rounded-xl w-full max-w-md mx-4">
            ${formHTML}
        </div>
    `;
    
    // Add modal to document
    document.body.appendChild(modal);
    
    // Handle cancel button
    document.getElementById('cancel-project').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // Handle form submission
    document.getElementById('add-project-form').addEventListener('submit', async (e) => {
                            e.preventDefault();
        
        const projectTitle = document.getElementById('project-title').value;
        const projectCategory = document.getElementById('project-category').value;
        const projectDescription = document.getElementById('project-description').value;
        const projectImage = document.getElementById('project-image').value || 'images/default-project.jpg';
        
        // Create project object
        const project = {
            id: Date.now().toString(),
            title: projectTitle,
            category: projectCategory,
            description: projectDescription,
            image: projectImage,
            createdAt: new Date().toISOString()
        };
        
        // Get existing projects from localStorage or API
        let projects = [];
        if (window.apiClient) {
            const existingProjects = await window.apiClient.get(window.API_ENDPOINTS.PROJECTS);
            if (existingProjects && Array.isArray(existingProjects)) {
                projects = existingProjects;
            }
        } else {
            const storedProjects = localStorage.getItem('projects');
            if (storedProjects) {
                projects = JSON.parse(storedProjects);
            }
        }
        
        // Add new project
        projects.push(project);
        
        // Save updated projects
        if (window.apiClient) {
            await window.apiClient.post(window.API_ENDPOINTS.PROJECTS, projects);
            } else {
            localStorage.setItem('projects', JSON.stringify(projects));
        }
        
        // Close modal
        document.body.removeChild(modal);
        
        // Refresh projects table
        updateProjectsTable(projects);
        
        console.log('Project added:', project);
    });
}

// Update skills table with current data
function updateSkillsTable(skills) {
    const tableBody = document.getElementById('skills-table-body');
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (!skills || skills.length === 0) {
        tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-4 py-4 text-center text-gray-400">No skills found. Add a new skill to get started.</td>
                </tr>
            `;
            return;
        }
        
        // Add each skill to the table
    skills.forEach(skill => {
            const row = document.createElement('tr');
        row.setAttribute('data-category', skill.category);
            
            row.innerHTML = `
                <td class="px-4 py-3">${skill.name}</td>
            <td class="px-4 py-3">${skill.category}</td>
                <td class="px-4 py-3">
                <div class="w-full bg-white/10 rounded-full h-2">
                    <div class="bg-primary-500 h-2 rounded-full" style="width: ${skill.proficiency}%"></div>
                    </div>
                </td>
                <td class="px-4 py-3">
                <button class="edit-skill-btn text-blue-400 hover:text-blue-300 mr-2" data-id="${skill.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                <button class="delete-skill-btn text-red-400 hover:text-red-300" data-id="${skill.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                </td>
            `;
            
        tableBody.appendChild(row);
    });
    
    // Update skill count in overview section
    const skillCountElement = document.querySelector('#overview-tab .glass-effect:first-child .gradient-text');
    if (skillCountElement) {
        skillCountElement.textContent = skills.length;
    }
    
    // Also update any skills sections in the public view
    updateSkillsUI(skills);
}

// Update projects table with current data
function updateProjectsTable(projects) {
    const tableBody = document.getElementById('projects-table-body');
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (!projects || projects.length === 0) {
        tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-4 py-4 text-center text-gray-400">No projects found. Add a new project to get started.</td>
                </tr>
            `;
            return;
        }
        
        // Add each project to the table
        projects.forEach(project => {
            const row = document.createElement('tr');
        row.setAttribute('data-category', project.category);
            
            row.innerHTML = `
                <td class="px-4 py-3">
                <div class="flex items-center">
                    <img src="${project.image}" alt="${project.title}" class="w-10 h-10 rounded-lg object-cover mr-3">
                    <span>${project.title}</span>
            </div>
                </td>
            <td class="px-4 py-3">${project.category}</td>
            <td class="px-4 py-3 max-w-xs truncate">${project.description}</td>
                <td class="px-4 py-3">
                <button class="edit-project-btn text-blue-400 hover:text-blue-300 mr-2" data-id="${project.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                <button class="delete-project-btn text-red-400 hover:text-red-300" data-id="${project.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                </td>
            `;
            
        tableBody.appendChild(row);
    });
    
    // Update project count in overview section
    const projectCountElement = document.querySelector('#overview-tab .glass-effect:nth-child(2) .gradient-text');
    if (projectCountElement) {
        projectCountElement.textContent = projects.length;
    }
    
    // Also update any projects sections in the public view
    updateProjectsUI(projects);
}

// Update skills display on public page
function updateSkillsUI(skills) {
    // Find the skills display container in the public view
    const skillsSection = document.getElementById('skills-section');
    if (!skillsSection) return; // Not on a page with skills display
    
    try {
        // Find the skills container
        const skillsContainer = skillsSection.querySelector('.skills-container');
        if (!skillsContainer) return;
        
        console.log('Updating skills UI with fresh data', skills.length);
        
        // Clear existing skills
        skillsContainer.innerHTML = '';
        
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
            
            skillsContainer.appendChild(skillCard);
        });
        
        // If there's a sync status manager, notify
        if (window.syncStatus) {
            window.syncStatus.showStatus('Skills UI updated with fresh data', 'success', 2000);
        }
        } catch (error) {
        console.error('Error updating skills UI:', error);
    }
}

// Update projects display on public page
function updateProjectsUI(projects) {
    // Find the projects display container in the public view
    const projectsGrid = document.getElementById('projects-grid');
    if (!projectsGrid) return; // Not on a page with projects display
    
    try {
        console.log('Updating projects UI with fresh data', projects.length);
        
        // Clear existing projects
        projectsGrid.innerHTML = '';
        
        // Add each project
        projects.forEach(project => {
            const projectCard = document.createElement('div');
            projectCard.className = 'project-card glass-effect rounded-xl overflow-hidden hover:scale-105 transition-transform';
            projectCard.setAttribute('data-category', project.category);
            
            projectCard.innerHTML = `
                <img src="${project.image}" alt="${project.title}" class="w-full h-48 object-cover">
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
        
        // If there's a sync status manager, notify
        if (window.syncStatus) {
            window.syncStatus.showStatus('Projects UI updated with fresh data', 'success', 2000);
        }
        } catch (error) {
        console.error('Error updating projects UI:', error);
    }
}

// Update profile UI elements
function updateProfileUI(profile) {
    if (!profile) return;
    
    try {
        console.log('Updating profile UI with fresh data', profile);
        
        // Update name elements
        document.querySelectorAll('[data-profile="name"]').forEach(el => {
            if (profile.name) el.textContent = profile.name;
        });
        
        // Update title elements
        document.querySelectorAll('[data-profile="title"]').forEach(el => {
            if (profile.title) el.textContent = profile.title;
        });
        
        // Update bio/intro elements
        document.querySelectorAll('[data-profile="bio"]').forEach(el => {
            if (profile.bio) el.textContent = profile.bio;
        });
        
        // Update image elements
        document.querySelectorAll('[data-profile="image"]').forEach(el => {
            if (profile.image) el.src = profile.image;
        });
        
        // Update social links if they exist
        if (profile.social) {
            // GitHub
            document.querySelectorAll('[data-social="github"]').forEach(el => {
                if (profile.social.github) el.href = profile.social.github;
            });
            
            // LinkedIn
            document.querySelectorAll('[data-social="linkedin"]').forEach(el => {
                if (profile.social.linkedin) el.href = profile.social.linkedin;
            });
            
            // Other social links as needed
        }
        
        // If there's a sync status manager, notify
        if (window.syncStatus) {
            window.syncStatus.showStatus('Profile UI updated with fresh data', 'success', 2000);
        }
    } catch (error) {
        console.error('Error updating profile UI:', error);
    }
}

// Function to set up settings buttons
function setupSettingsButtons() {
    // Settings save button
    const saveSettingsBtn = document.getElementById('save-settings');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }
    
    // Enable edit mode button
    const enableEditModeBtn = document.getElementById('enable-edit-mode');
    if (enableEditModeBtn) {
        enableEditModeBtn.addEventListener('click', enableEditMode);
    }
    
    // Add GitHub setup button events 
    // (This was previously missing which caused GitHub setup buttons not to work)
    const setupGitHubBackendBtn = document.getElementById('github-backend-setup-btn');
    if (setupGitHubBackendBtn) {
        setupGitHubBackendBtn.addEventListener('click', () => {
            console.log('Opening GitHub backend setup UI');
            if (typeof GitHubBackendSetup === 'function') {
                new GitHubBackendSetup();
                } else {
                if (window.syncStatus) {
                    window.syncStatus.showStatus('GitHub Backend Setup module not loaded', 'error');
                } else {
                    alert('GitHub Backend Setup module not loaded');
                }
                }
            });
        }
        
    const initGitHubBackendBtn = document.getElementById('init-github-backend');
    if (initGitHubBackendBtn) {
        initGitHubBackendBtn.addEventListener('click', () => {
            console.log('Initializing GitHub backend');
            if (typeof GitHubBackendSetup === 'function') {
                new GitHubBackendSetup();
                } else {
                if (window.syncStatus) {
                    window.syncStatus.showStatus('GitHub Backend Setup module not loaded', 'error');
                } else {
                    alert('GitHub Backend Setup module not loaded');
                }
            }
        });
    }
    
    // Add test connection button event
    const testGitHubConnectionBtn = document.getElementById('test-github-connection');
    if (testGitHubConnectionBtn) {
        testGitHubConnectionBtn.addEventListener('click', async () => {
            console.log('Testing GitHub connection');
            
            const statusElement = document.getElementById('github-status');
            
            if (!window.githubService) {
                const errorMsg = 'GitHub service not initialized';
                console.error(errorMsg);
                
                if (statusElement) {
                    statusElement.innerHTML = `<p class="text-red-400"><i class="fas fa-times-circle mr-2"></i>${errorMsg}</p>`;
                }
                
                if (window.syncStatus) {
                    window.syncStatus.showStatus(errorMsg, 'error');
                }
                
            return;
        }
        
            if (statusElement) {
                statusElement.innerHTML = `<p class="text-blue-400"><i class="fas fa-spinner fa-spin mr-2"></i>Testing GitHub connection...</p>`;
            }
            
            if (window.syncStatus) {
                window.syncStatus.showStatus('Testing GitHub connection...', 'info');
            }
            
            try {
                const validation = await window.githubService.validateToken();
                
                if (validation.valid) {
                    const successMsg = `Connected to GitHub as ${validation.username}`;
                    console.log(successMsg);
                    
                    if (statusElement) {
                        statusElement.innerHTML = `<p class="text-green-400"><i class="fas fa-check-circle mr-2"></i>${successMsg}</p>`;
                    }
                    
                    if (window.syncStatus) {
                        window.syncStatus.showStatus(successMsg, 'success');
                    }
                } else {
                    const errorMsg = `GitHub connection failed: ${validation.message}`;
                    console.error(errorMsg);
                    
                    if (statusElement) {
                        statusElement.innerHTML = `<p class="text-red-400"><i class="fas fa-times-circle mr-2"></i>${errorMsg}</p>`;
                    }
                    
                    if (window.syncStatus) {
                        window.syncStatus.showStatus(errorMsg, 'error');
                    }
                }
            } catch (error) {
                const errorMsg = `GitHub connection error: ${error.message}`;
                console.error(errorMsg);
                
                if (statusElement) {
                    statusElement.innerHTML = `<p class="text-red-400"><i class="fas fa-times-circle mr-2"></i>${errorMsg}</p>`;
                }
                
                if (window.syncStatus) {
                    window.syncStatus.showStatus(errorMsg, 'error');
                }
            }
        });
    }
    
    // Add refresh buttons
    setupRefreshButtons();
}

// Function to set up all skills and projects buttons
function setupSkillsAndProjectsButtons() {
    // Main skills and projects add buttons
    const addSkillMain = document.getElementById('add-skill-main');
    if (addSkillMain) {
        addSkillMain.addEventListener('click', addNewSkill);
    }
    
    const addProjectMain = document.getElementById('add-project-main');
    if (addProjectMain) {
        addProjectMain.addEventListener('click', addNewProject);
    }
    
    // Quick add buttons in overview
    const addSkillQuick = document.getElementById('add-skill-quick');
    if (addSkillQuick) {
        addSkillQuick.addEventListener('click', addNewSkill);
    }
    
    const addProjectQuick = document.getElementById('add-project-quick');
    if (addProjectQuick) {
        addProjectQuick.addEventListener('click', addNewProject);
    }
    
    // Dashboard add buttons
    const addSkillBtn = document.getElementById('add-skill-btn');
    if (addSkillBtn) {
        addSkillBtn.addEventListener('click', addNewSkill);
    }
    
    const addProjectBtn = document.getElementById('add-project-btn');
    if (addProjectBtn) {
        addProjectBtn.addEventListener('click', addNewProject);
    }
    
    // Clear buttons
    const clearSkillsBtn = document.getElementById('clear-skills-btn');
    if (clearSkillsBtn) {
        clearSkillsBtn.addEventListener('click', clearSkills);
    }
    
    const clearProjectsBtn = document.getElementById('clear-projects-btn');
    if (clearProjectsBtn) {
        clearProjectsBtn.addEventListener('click', clearProjects);
    }
    
    // Public add skill button
    const addSkillPublic = document.getElementById('add-skill-public');
    if (addSkillPublic) {
        addSkillPublic.addEventListener('click', addNewSkill);
    }
}

// Function to clear all skills
function clearSkills() {
    if (confirm('Are you sure you want to delete all skills? This action cannot be undone.')) {
        console.log('Clearing all skills');
        
        // Clear skills from localStorage or API
        if (window.apiClient) {
            window.apiClient.post(window.API_ENDPOINTS.SKILLS, []);
        } else {
            localStorage.setItem('skills', JSON.stringify([]));
        }
        
        // Update skills table
        updateSkillsTable([]);
        
        // Show notification
        showNotification('All skills have been cleared.');
    }
}

// Function to clear all projects
function clearProjects() {
    if (confirm('Are you sure you want to delete all projects? This action cannot be undone.')) {
        console.log('Clearing all projects');
        
        // Clear projects from localStorage or API
        if (window.apiClient) {
            window.apiClient.post(window.API_ENDPOINTS.PROJECTS, []);
        } else {
            localStorage.setItem('projects', JSON.stringify([]));
        }
        
        // Update projects table
        updateProjectsTable([]);
        
        // Show notification
        showNotification('All projects have been cleared.');
    }
}

// Function to enable edit mode
function enableEditMode() {
    localStorage.setItem('editMode', 'true');
    showNotification('Edit mode enabled. Reloading page...');
    
    // Redirect to index.html with edit mode parameter
    setTimeout(() => {
        window.location.href = window.location.pathname + '?edit=true';
    }, 1500);
}

// Function to save profile and social settings
async function saveSettings() {
    console.log('Saving settings');
    
    // Get profile form values
    const profileName = document.getElementById('profile-name').value.trim();
    const profileTitle = document.getElementById('profile-title').value.trim();
    const profileIntro = document.getElementById('profile-intro').value.trim();
    const profileImage = document.getElementById('profile-image').value.trim();
    
    // Get social form values
    const githubUrl = document.getElementById('github-url').value.trim();
    const linkedinUrl = document.getElementById('linkedin-url').value.trim();
    const kaggleUrl = document.getElementById('kaggle-url').value.trim();
    const mediumUrl = document.getElementById('medium-url').value.trim();
    
    // Create profile object
    const profile = {
        name: profileName || 'Bayezid',
        title: profileTitle || 'Data Analyst | Visualization Specialist',
        bio: profileIntro || 'Passionate about transforming data into meaningful insights through visualization and analysis.',
        image: profileImage || 'https://via.placeholder.com/128',
        social: {
            github: githubUrl || 'https://github.com/hrbayezid',
            linkedin: linkedinUrl || 'https://linkedin.com/in/your-linkedin',
            kaggle: kaggleUrl || 'https://kaggle.com/yourusername',
            medium: mediumUrl || 'https://medium.com/@yourusername'
        }
    };
    
    // Save profile to localStorage or API
    try {
        if (window.apiClient) {
            await window.apiClient.post(window.API_ENDPOINTS.PROFILE, profile);
                    } else {
            localStorage.setItem('profile', JSON.stringify(profile));
        }
        
        // Update the UI with the new profile info
        updateProfileUI(profile);
        
        // Show notification
        showNotification('Settings saved successfully.');
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings. Please try again.', 'error');
    }
}

// Simple notification function
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg animate-fade-in ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white shadow-lg`;
    notification.innerHTML = message;
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('opacity-0');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Load profile settings when page loads
async function loadProfileSettings() {
    try {
        let profile;
        
        if (window.apiClient) {
            profile = await window.apiClient.get(window.API_ENDPOINTS.PROFILE);
        } else {
            const profileData = localStorage.getItem('profile');
            if (profileData) {
                profile = JSON.parse(profileData);
            }
        }
        
        if (profile) {
            // Fill in profile form
            const profileNameInput = document.getElementById('profile-name');
            if (profileNameInput) profileNameInput.value = profile.name || '';
            
            const profileTitleInput = document.getElementById('profile-title');
            if (profileTitleInput) profileTitleInput.value = profile.title || '';
            
            const profileIntroInput = document.getElementById('profile-intro');
            if (profileIntroInput) profileIntroInput.value = profile.bio || '';
            
            const profileImageInput = document.getElementById('profile-image');
            if (profileImageInput) profileImageInput.value = profile.image || '';
            
            // Fill in social form
            if (profile.social) {
                const githubUrlInput = document.getElementById('github-url');
                if (githubUrlInput) githubUrlInput.value = profile.social.github || '';
                
                const linkedinUrlInput = document.getElementById('linkedin-url');
                if (linkedinUrlInput) linkedinUrlInput.value = profile.social.linkedin || '';
                
                const kaggleUrlInput = document.getElementById('kaggle-url');
                if (kaggleUrlInput) kaggleUrlInput.value = profile.social.kaggle || '';
                
                const mediumUrlInput = document.getElementById('medium-url');
                if (mediumUrlInput) mediumUrlInput.value = profile.social.medium || '';
            }
        }
                } catch (error) {
        console.error('Error loading profile settings:', error);
    }
}

// Function to set up refresh buttons in the dashboard
function setupRefreshButtons() {
    // Add refresh buttons to skills and projects sections
    const sections = [
        {id: 'skills-section', endpoint: window.API_ENDPOINTS?.SKILLS, label: 'Skills'},
        {id: 'projects-section', endpoint: window.API_ENDPOINTS?.PROJECTS, label: 'Projects'},
        {id: 'profile-section', endpoint: window.API_ENDPOINTS?.PROFILE, label: 'Profile'}
    ];
    
    sections.forEach(section => {
        const container = document.getElementById(section.id);
        if (!container) return;
        
        // Create refresh button
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors';
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Refresh ' + section.label;
        
        // Add click event
        refreshBtn.addEventListener('click', async () => {
            if (!window.apiClient || !section.endpoint) {
                console.error('API client or endpoint not available');
                return;
            }
            
            // Show loading state
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Refreshing...';
            refreshBtn.disabled = true;
            
            try {
                // Force refresh by bypassing cache
                window.apiClient.lastFetchTime[section.endpoint] = 0;
                
                // Fetch data
                const data = await window.apiClient.get(section.endpoint);
                
                // Update UI based on section
                if (section.id === 'skills-section') {
                    updateSkillsUI(data);
                    updateSkillsTable(data);
                } else if (section.id === 'projects-section') {
                    updateProjectsUI(data);
                    updateProjectsTable(data);
                } else if (section.id === 'profile-section') {
                    updateProfileUI(data);
                }
                
                // Show success message
                if (window.syncStatus) {
                    window.syncStatus.showStatus(`${section.label} data refreshed successfully`, 'success');
                }
            } catch (error) {
                console.error(`Error refreshing ${section.label} data:`, error);
                
                if (window.syncStatus) {
                    window.syncStatus.showStatus(`Error refreshing ${section.label} data: ${error.message}`, 'error');
                }
            } finally {
                // Reset button
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Refresh ' + section.label;
                refreshBtn.disabled = false;
            }
        });
        
        // Add to container
        const headerEl = container.querySelector('h2, h3');
        if (headerEl && headerEl.parentNode) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'flex items-center space-x-2 mt-2';
            buttonContainer.appendChild(refreshBtn);
            headerEl.parentNode.insertBefore(buttonContainer, headerEl.nextSibling);
            } else {
            container.prepend(refreshBtn);
        }
    });
}

// Initialize back to top button functionality
function initBackToTopButton() {
    const backToTopButton = document.getElementById('back-to-top');
    if (backToTopButton) {
        // Show button when user scrolls down
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopButton.classList.remove('hidden');
            } else {
                backToTopButton.classList.add('hidden');
            }
        });
        
        // Scroll to top when clicked
        backToTopButton.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// Check URL parameters for special actions
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for edit mode
    if (urlParams.has('edit') && urlParams.get('edit') === 'true') {
        console.log('Edit mode detected in URL');
        
        // Initialize editor if available
        if (typeof initializeEditor === 'function') {
            initializeEditor();
        } else {
            console.warn('Editor module not loaded');
        }
    }
    
    // Check for tab selection
    if (urlParams.has('tab')) {
        const tabId = urlParams.get('tab');
        console.log(`Tab selection detected in URL: ${tabId}`);
        
        // Find and activate the tab
        const tabButton = document.querySelector(`[data-tab="${tabId}"]`);
        if (tabButton) {
            tabButton.click();
        }
    }
}