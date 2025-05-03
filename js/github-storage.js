/**
 * GitHub Storage API for Portfolio Website
 * This module provides functions to use GitHub as a backend for storing portfolio data
 */

class GitHubStorage {
    constructor() {
        this.initialized = false;
        this.config = {
            owner: '',
            repo: '',
            token: '',
            branch: 'main'
        };
        
        this.init();
    }
    
    init() {
        console.log('Initializing GitHub Storage API...');
        
        // Load configuration from localStorage
        this.loadConfig();
        
        // Initialize the API client if not done already
        if (!window.apiClient || !window.apiClient.github) {
            this.setupApiClient();
        }
        
        this.initialized = true;
        console.log('GitHub Storage API initialized');
    }
    
    loadConfig() {
        try {
            // Load from localStorage
            const storedConfig = localStorage.getItem('github_config');
            if (storedConfig) {
                const parsedConfig = JSON.parse(storedConfig);
                this.config = {
                    ...this.config,
                    ...parsedConfig
                };
                console.log('GitHub configuration loaded');
            } else {
                console.log('No stored GitHub configuration found');
            }
            
            return this.config;
        } catch (error) {
            console.error('Error loading GitHub configuration:', error);
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
            
            // Save to localStorage
            localStorage.setItem('github_config', JSON.stringify(this.config));
            console.log('GitHub configuration saved');
            
            return true;
        } catch (error) {
            console.error('Error saving GitHub configuration:', error);
            return false;
        }
    }
    
    isConfigured() {
        return !!(this.config.owner && this.config.repo && this.config.token);
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
                    
                    // Check if GitHub is configured
                    if (!owner || !repo || !token) {
                        return {
                            success: false,
                            error: 'GitHub configuration is incomplete'
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
                    
                    // Set authentication header
                    const headers = {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        ...options.headers
                    };
                    
                    if (options.method === 'POST' || options.method === 'PUT') {
                        headers['Content-Type'] = 'application/json';
                    }
                    
                    // Make the request with error handling
                    console.log(`[GitHub API] ${options.method || 'GET'} request to ${processedUrl}`);
                    
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
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(
                            errorData.message || 
                            `GitHub API error: ${response.status} ${response.statusText}`
                        );
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
            
            // Get content
            getContent: async (path) => {
                // Convert API endpoint to GitHub content path
                const contentPath = path.replace('/api/', '').replace(/\/$/, '') + '.json';
                
                const API_ENDPOINTS = window.API_ENDPOINTS || {
                    GITHUB_CONTENT: 'https://api.github.com/repos/{owner}/{repo}/contents'
                };
                
                // Make the request
                const response = await window.apiClient.github.request(
                    `${API_ENDPOINTS.GITHUB_CONTENT}/${contentPath}`, 
                    { method: 'GET' }
                );
                
                if (response.success && response.data && response.data.content) {
                    try {
                        // GitHub API returns Base64 encoded content
                        const decodedContent = atob(response.data.content);
                        const parsedData = JSON.parse(decodedContent);
                        
                        return {
                            success: true,
                            data: parsedData,
                            source: 'github'
                        };
                    } catch (error) {
                        return {
                            success: false,
                            error: 'Failed to parse content: ' + error.message,
                            errorDetails: error
                        };
                    }
                }
                
                return response;
            },
            
            // Create or update content
            createContent: async (path, data) => {
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
            
            // Helper to migrate all localStorage data to GitHub
            migrateLocalToGitHub: async () => {
                try {
                    console.log('Starting data migration to GitHub...');
                    
                    // Check if GitHub is configured properly
                    if (!this.isConfigured()) {
                        return {
                            success: false,
                            error: 'GitHub is not fully configured'
                        };
                    }
                    
                    // Define the data keys to migrate
                    const dataKeys = ['skills', 'projects', 'profile_settings', 'social_links'];
                    const results = {};
                    
                    // Migrate each data key
                    for (const key of dataKeys) {
                        console.log(`Migrating ${key} data to GitHub...`);
                        
                        // Get data from localStorage
                        const data = localStorage.getItem(key);
                        if (!data) {
                            console.log(`No ${key} data found in localStorage, skipping`);
                            results[key] = { success: true, message: 'No data to migrate' };
                            continue;
                        }
                        
                        try {
                            // Parse data
                            const parsedData = JSON.parse(data);
                            
                            // Save to GitHub
                            const result = await window.apiClient.github.createContent(`/api/${key}`, parsedData);
                            results[key] = result;
                            
                            if (result.success) {
                                console.log(`Successfully migrated ${key} data to GitHub`);
                            } else {
                                console.error(`Failed to migrate ${key} data:`, result.error);
                            }
                        } catch (error) {
                            console.error(`Error processing ${key} data:`, error);
                            results[key] = { 
                                success: false, 
                                error: `Error processing data: ${error.message}` 
                            };
                        }
                    }
                    
                    // Check if all migrations were successful
                    const allSuccessful = Object.values(results).every(result => result.success);
                    
                    return {
                        success: allSuccessful,
                        results,
                        message: allSuccessful ? 
                            'All data successfully migrated to GitHub' : 
                            'Some data failed to migrate, see results for details'
                    };
                } catch (error) {
                    console.error('Error during migration:', error);
                    return {
                        success: false,
                        error: error.message || 'Migration failed'
                    };
                }
            },
            
            // Test the connection to GitHub
            testConnection: async () => {
                try {
                    if (!this.isConfigured()) {
                        return { success: false, error: 'GitHub is not fully configured' };
                    }
                    
                    // Test the connection by making a simple API call
                    const response = await window.apiClient.github.user();
                    
                    if (response.success) {
                        return { 
                            success: true, 
                            message: `Connected to GitHub as ${response.data.login}`,
                            user: response.data 
                        };
                    } else {
                        return { success: false, error: response.error || 'Failed to connect to GitHub' };
                    }
                } catch (error) {
                    console.error('Error testing GitHub connection:', error);
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