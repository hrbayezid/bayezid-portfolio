/**
 * GitHub Storage API for Portfolio Website
 * This module provides functions to use GitHub as a backend for storing portfolio data
 */

class GitHubStorage {
    constructor() {
        this.initialized = false;
        this.config = {
            owner: 'hrbayezid',
            repo: 'bayezid-portfolio',
            token: '',
            branch: 'main'
        };
        
        this.init();
    }
    
    init() {
        console.log('Initializing GitHub Storage API...');
        
        // Load configuration from GitHub service if available
        this.loadConfig();
        
        // Initialize the API client if not done already
        if (!window.apiClient || !window.apiClient.github) {
            this.setupApiClient();
        }
        
        this.initialized = true;
        console.log('💾 GitHub Storage API initialized');
    }
    
    loadConfig() {
        try {
            // Use token from GitHub service only if available
            if (window.githubService) {
                // Only grab owner and repo information - not token
                this.config.owner = window.githubService.owner;
                this.config.repo = window.githubService.repo;
                
                // Only set token if available and user is in admin mode
                if (window.githubService.token && document.querySelector('#dashboard')) {
                    this.config.token = window.githubService.token;
                    console.log('GitHub token loaded for admin operations');
                } else {
                    console.log('Running in public read-only mode (no token needed)');
                }
                
                console.log('GitHub configuration loaded from GitHub service');
            } else {
                console.log('No GitHub service available, using default configuration');
            }
            
            return this.config;
        } catch (error) {
            console.error('Error loading GitHub configuration:', error);
            
            if (window.syncStatus) {
                window.syncStatus.showStatus(`Error loading GitHub configuration: ${error.message}`, 'error');
            }
            
            return this.config;
        }
    }
    
    saveConfig(newConfig) {
        try {
            // Update config
            this.config = {
                ...this.config,
                ...newConfig
            };
            
            // If we have a GitHub service, update it as well
            if (window.githubService && document.querySelector('#dashboard')) {
                if (newConfig.token) {
                    window.githubService.setToken(newConfig.token);
                }
            }
            
            console.log('GitHub configuration saved');
            
            if (window.syncStatus) {
                window.syncStatus.showStatus('GitHub configuration updated', 'success');
            }
            
            return true;
        } catch (error) {
            console.error('Error saving GitHub configuration:', error);
            
            if (window.syncStatus) {
                window.syncStatus.showStatus(`Error saving GitHub configuration: ${error.message}`, 'error');
            }
            
            return false;
        }
    }
    
    isConfigured() {
        // For read operations, we only need owner and repo
        // For write operations, we also need a token
        const readConfigured = !!(this.config.owner && this.config.repo);
        const writeConfigured = readConfigured && !!this.config.token;
        
        // In dashboard mode, check for write configuration
        if (document.querySelector('#dashboard')) {
            return writeConfigured;
        }
        
        // In public mode, we only need read configuration
        return readConfigured;
    }
    
    setupApiClient() {
        if (!window.apiClient) {
            window.apiClient = {};
        }
        
        window.apiClient.github = {
            // Helper to make GitHub API requests
            request: async (url, options = {}) => {
                try {
                    const { owner, repo, token, branch } = this.config;
                    
                    // For public reads, we only need owner and repo
                    if (!owner || !repo) {
                        const errorMsg = 'GitHub configuration is incomplete: missing owner or repo';
                        
                        console.error(errorMsg);
                        if (window.syncStatus) {
                            window.syncStatus.showStatus(errorMsg, 'error');
                        }
                        
                        return {
                            success: false,
                            error: errorMsg
                        };
                    }
                    
                    // Check for token only if it's a write operation
                    const isWriteOperation = options.method === 'PUT' || 
                                           options.method === 'POST' || 
                                           options.method === 'DELETE';
                                           
                    if (isWriteOperation && !token) {
                        const errorMsg = 'GitHub configuration is incomplete: token required for write operations';
                        
                        // Only show error in dashboard
                        if (document.querySelector('#dashboard')) {
                            console.error(errorMsg);
                            if (window.syncStatus) {
                                window.syncStatus.showStatus(errorMsg, 'error');
                            }
                        } else {
                            console.warn('Write operation attempted in public mode (skipped)');
                        }
                        
                        return {
                            success: false,
                            error: errorMsg
                        };
                    }
                    
                    // Process URL template if it contains placeholders
                    let processedUrl = url;
                    if (url.includes('{owner}')) {
                        processedUrl = processedUrl.replace('{owner}', owner);
                    }
                    if (url.includes('{repo}')) {
                        processedUrl = processedUrl.replace('{repo}', repo);
                    }
                    if (url.includes('{branch}')) {
                        processedUrl = processedUrl.replace('{branch}', branch);
                    }
                    
                    // Add cache busting parameter
                    if (!processedUrl.includes('?')) {
                        processedUrl += `?t=${Date.now()}`;
                    } else {
                        processedUrl += `&t=${Date.now()}`;
                    }
                    
                    // Set authentication header only if token is available
                    const headers = {
                        'Accept': 'application/vnd.github.v3+json',
                        ...options.headers
                    };
                    
                    // Only add Authorization header if token is available
                    if (token && isWriteOperation) {
                        headers['Authorization'] = `token ${token}`;
                    }
                    
                    if (options.method === 'POST' || options.method === 'PUT') {
                        headers['Content-Type'] = 'application/json';
                    }
                    
                    // Make the request with error handling
                    console.log(`[GitHub API] ${options.method || 'GET'} request to ${processedUrl}`);
                    
                    if (window.syncStatus) {
                        window.syncStatus.showStatus(`GitHub API Request: ${options.method || 'GET'} ${processedUrl}`, 'info', 2000);
                    }
                    
                    const fetchOptions = {
                        method: options.method || 'GET',
                        headers,
                        ...options
                    };
                    
                    // Convert body to JSON string if it exists
                    if (options.body) {
                        fetchOptions.body = JSON.stringify(options.body);
                    }
                    
                    const response = await fetch(processedUrl, fetchOptions);
                    
                    if (!response.ok) {
                        // Check for rate limit issues
                        if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
                            const rateLimitError = 'GitHub API rate limit exceeded';
                            
                            if (window.syncStatus) {
                                window.syncStatus.rateLimitHit();
                            } else {
                                console.warn(rateLimitError);
                            }
                            
                            throw new Error(rateLimitError);
                        }
                        
                        const errorData = await response.json().catch(() => ({}));
                        const errorMsg = errorData.message || 
                            `GitHub API error: ${response.status} ${response.statusText}`;
                        
                        // Only show UI error in dashboard
                        if (document.querySelector('#dashboard')) {
                            if (window.syncStatus) {
                                window.syncStatus.showStatus(errorMsg, 'error');
                            }
                        } else {
                            console.warn(`⚠️ GitHub API error: ${errorMsg}`);
                        }
                        
                        throw new Error(errorMsg);
                    }
                    
                    // Check if response is empty
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const data = await response.json();
                        return {
                            success: true,
                            data,
                            source: 'github'
                        };
                    } else {
                        return {
                            success: true,
                            data: null,
                            source: 'github'
                        };
                    }
                } catch (error) {
                    console.error(`[GitHub API] Request error:`, error);
                    
                    // Only show UI error in dashboard
                    if (document.querySelector('#dashboard')) {
                        if (window.syncStatus) {
                            window.syncStatus.showStatus(`GitHub API Error: ${error.message}`, 'error');
                        }
                    } else {
                        console.warn(`⚠️ GitHub API request failed: ${error.message}`);
                    }
                    
                    return {
                        success: false,
                        error: error.message || 'GitHub API request failed',
                        errorDetails: error
                    };
                }
            },
            
            // Get user info (to verify token)
            user: async () => {
                const API_ENDPOINTS = window.API_ENDPOINTS || {
                    GITHUB_API: 'https://api.github.com'
                };
                
                return await window.apiClient.github.request(`${API_ENDPOINTS.GITHUB_API}/user`);
            },
            
            // Get content directly from raw GitHub URL without requiring token
            getContent: async (path) => {
                try {
                    // Convert API endpoint to GitHub content path
                    const contentPath = path.replace('/api/', '').replace(/\/$/, '') + '.json';
                    console.log(`🔄 Fetching ${contentPath} from GitHub...`);
                    
                    // First try the raw GitHub approach, which works without authentication
                    const rawUrl = `https://raw.githubusercontent.com/${this.config.owner}/${this.config.repo}/main/${contentPath}?t=${Date.now()}`;
                    console.log(`📄 Accessing public URL: ${rawUrl}`);
                    
                    const response = await fetch(rawUrl);
                    
                    if (!response.ok) {
                        if (response.status === 404) {
                            console.warn(`⚠️ File ${contentPath} not found`);
                            throw new Error(`File ${contentPath} not found in GitHub repository`);
                        }
                        
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
                    
                    console.log(`💾 Data loaded from GitHub: ${contentPath}`);
                    return {
                        success: true,
                        data: content,
                        source: 'github-raw'
                    };
                } catch (error) {
                    console.warn(`⚠️ Could not load data: ${error.message}`);
                    
                    // Determine empty state based on path
                    let emptyData = {};
                    if (path.includes('skills')) {
                        emptyData = [];
                    } else if (path.includes('projects')) {
                        emptyData = [];
                    } else if (path.includes('profile')) {
                        emptyData = {};
                    }
                    
                    return {
                        success: false,
                        error: error.message,
                        data: emptyData
                    };
                }
            },
            
            // Create or update content
            createContent: async (path, data) => {
                // Check if token is available for write operations
                if (!this.config.token) {
                    console.error('🔒 Token required: No GitHub token available for write operations');
                    return {
                        success: false,
                        error: 'GitHub token not available. Please log in to make changes.'
                    };
                }
                
                // Convert API endpoint to GitHub content path
                const contentPath = path.replace('/api/', '').replace(/\/$/, '') + '.json';
                
                const API_ENDPOINTS = window.API_ENDPOINTS || {
                    GITHUB_CONTENT: 'https://api.github.com/repos/{owner}/{repo}/contents'
                };
                
                // Get the current file to check if it exists (to know if we're creating or updating)
                const current = await window.apiClient.github.request(
                    `${API_ENDPOINTS.GITHUB_CONTENT}/${contentPath}`, 
                    { method: 'GET' }
                );
                
                // If file exists, we need to update it with the sha
                if (current.success) {
                    return await window.apiClient.github.updateContent(path, data, current.data.sha);
                }
                
                return await window.apiClient.github.request(
                    `${API_ENDPOINTS.GITHUB_CONTENT}/${contentPath}`, 
                    {
                        method: 'PUT',
                        body: {
                            message: `Create ${contentPath}`,
                            content: btoa(JSON.stringify(data)),
                            branch: this.config.branch
                        }
                    }
                );
            },
            
            // Update content
            updateContent: async (path, data, sha) => {
                // Check if token is available for write operations
                if (!this.config.token) {
                    console.error('🔒 Token required: No GitHub token available for write operations');
                    return {
                        success: false,
                        error: 'GitHub token not available. Please log in to make changes.'
                    };
                }
                
                // Convert API endpoint to GitHub content path
                const contentPath = path.replace('/api/', '').replace(/\/$/, '') + '.json';
                
                const API_ENDPOINTS = window.API_ENDPOINTS || {
                    GITHUB_CONTENT: 'https://api.github.com/repos/{owner}/{repo}/contents'
                };
                
                // If no sha provided, we need to get it first
                if (!sha) {
                    const current = await window.apiClient.github.request(
                        `${API_ENDPOINTS.GITHUB_CONTENT}/${contentPath}`, 
                        { method: 'GET' }
                    );
                    
                    if (current.success) {
                        sha = current.data.sha;
                    } else {
                        // File doesn't exist, create it instead
                        return await window.apiClient.github.createContent(path, data);
                    }
                }
                
                return await window.apiClient.github.request(
                    `${API_ENDPOINTS.GITHUB_CONTENT}/${contentPath}`, 
                    {
                        method: 'PUT',
                        body: {
                            message: `Update ${contentPath}`,
                            content: btoa(JSON.stringify(data)),
                            sha,
                            branch: this.config.branch
                        }
                    }
                );
            },
            
            // Delete content
            deleteContent: async (path) => {
                // Check if token is available for write operations
                if (!this.config.token) {
                    console.error('🔒 Token required: No GitHub token available for delete operations');
                    return {
                        success: false,
                        error: 'GitHub token not available. Please log in to delete content.'
                    };
                }
                
                // Convert API endpoint to GitHub content path
                const contentPath = path.replace('/api/', '').replace(/\/$/, '') + '.json';
                
                const API_ENDPOINTS = window.API_ENDPOINTS || {
                    GITHUB_CONTENT: 'https://api.github.com/repos/{owner}/{repo}/contents'
                };
                
                // Get the current file to get the sha
                const current = await window.apiClient.github.request(
                    `${API_ENDPOINTS.GITHUB_CONTENT}/${contentPath}`, 
                    { method: 'GET' }
                );
                
                // If file doesn't exist, return success (already deleted)
                if (!current.success) {
                    return { success: true, message: 'File already deleted or does not exist' };
                }
                
                return await window.apiClient.github.request(
                    `${API_ENDPOINTS.GITHUB_CONTENT}/${contentPath}`, 
                    {
                        method: 'DELETE',
                        body: {
                            message: `Delete ${contentPath}`,
                            sha: current.data.sha,
                            branch: this.config.branch
                        }
                    }
                );
            },
            
            // Test the connection to GitHub
            testConnection: async () => {
                try {
                    // For read operations, we only need owner and repo
                    if (!this.config.owner || !this.config.repo) {
                        const errorMsg = 'GitHub is not configured: missing owner or repo';
                        console.error(errorMsg);
                        
                        if (window.syncStatus) {
                            window.syncStatus.showStatus(errorMsg, 'error');
                        }
                        
                        return { success: false, error: errorMsg };
                    }
                    
                    // First test raw github access which doesn't require authentication
                    try {
                        const rawUrl = `https://raw.githubusercontent.com/${this.config.owner}/${this.config.repo}/main/README.md?t=${Date.now()}`;
                        const readmeResponse = await fetch(rawUrl);
                        
                        if (readmeResponse.ok) {
                            console.log('✅ Public GitHub access successful');
                            
                            // If we're in public mode, this is all we need
                            if (!document.querySelector('#dashboard')) {
                                return { 
                                    success: true, 
                                    message: 'Public GitHub access successful',
                                    isPublic: true
                                };
                            }
                        }
                    } catch (readError) {
                        console.warn('⚠️ Public GitHub access check failed:', readError.message);
                    }
                    
                    // For admin/dashboard mode, also check token if available
                    if (document.querySelector('#dashboard')) {
                        if (!this.config.token) {
                            const warnMsg = 'GitHub token not set: write operations will be unavailable';
                            console.warn(warnMsg);
                            
                            if (window.syncStatus) {
                                window.syncStatus.showStatus(warnMsg, 'warning');
                            }
                            
                            return { 
                                success: true, 
                                message: 'Public GitHub access successful, but token not set for write operations',
                                isPublic: true,
                                writeAccess: false
                            };
                        }
                        
                        // Test the token by making a user API call
                        const response = await window.apiClient.github.user();
                        
                        if (response.success) {
                            console.log(`✅ Connected to GitHub as ${response.data.login} with write access`);
                            
                            if (window.syncStatus) {
                                window.syncStatus.showStatus(`Connected to GitHub as ${response.data.login}`, 'success');
                            }
                            
                            return { 
                                success: true, 
                                message: `Connected to GitHub as ${response.data.login}`,
                                user: response.data,
                                writeAccess: true
                            };
                        } else {
                            const errorMsg = response.error || 'Failed to validate GitHub token';
                            console.error(errorMsg);
                            
                            if (window.syncStatus) {
                                window.syncStatus.showStatus(errorMsg, 'error');
                            }
                            
                            return { 
                                success: false, 
                                error: errorMsg,
                                writeAccess: false
                            };
                        }
                    }
                    
                    // Default return for non-dashboard mode
                    return { 
                        success: true, 
                        message: 'Public GitHub access successful',
                        isPublic: true
                    };
                } catch (error) {
                    console.error('Error testing GitHub connection:', error);
                    
                    if (window.syncStatus) {
                        window.syncStatus.showStatus(`Error testing GitHub connection: ${error.message}`, 'error');
                    }
                    
                    return { success: false, error: error.message || 'Unknown error' };
                }
            }
        };
    }
}

// Initialize the GitHub Storage API when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create the GitHub storage instance
    window.GITHUB_CONFIG = new GitHubStorage();
}); 