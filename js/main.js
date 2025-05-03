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
    if (!window.githubService) {
        window.githubService = new GitHubService();
        console.log('GitHub Service initialized');
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
        const token = localStorage.getItem('active_github_token');
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
    return {
        name: "Bayezid",
        title: "Data Scientist & Web Developer",
        bio: "Passionate about data science, machine learning, and web development.",
        location: "Bangladesh",
        email: "hrbayezid@gmail.com",
        github: "hrbayezid",
        linkedin: ""
    };
}

// Default settings data for initialization
function getDefaultSettings() {
    return {
        theme: "dark",
        github_backend_enabled: true,
        notifications: {
            email_notifications: false,
            project_updates: true,
            show_email: true
        }
    };
}

// Initialize global API client
function initializeApiClient() {
    window.apiClient = {
        get: async (endpoint) => {
            try {
                // If GitHub Service is available and initialized, use it
                if (window.githubService && window.isGitHubPagesEnvironment()) {
                    // Convert API endpoint to data path
                    const dataPath = `data${endpoint.replace('/api', '')}.json`;
                    return await window.githubService.getFileContent(dataPath);
                }
                
                // Fallback to localStorage
                const data = localStorage.getItem(endpoint.replace('/api/', ''));
                return data ? JSON.parse(data) : null;
            } catch (error) {
                console.error(`API GET error (${endpoint}):`, error);
                return null;
            }
        },
        
        post: async (endpoint, data) => {
            try {
                // If GitHub Service is available and initialized, use it
                if (window.githubService && window.isGitHubPagesEnvironment()) {
                    // Convert API endpoint to data path
                    const dataPath = `data${endpoint.replace('/api', '')}.json`;
                    return await window.githubService.updateFile(dataPath, data);
                }
                
                // Fallback to localStorage
                localStorage.setItem(endpoint.replace('/api/', ''), JSON.stringify(data));
                return true;
            } catch (error) {
                console.error(`API POST error (${endpoint}):`, error);
                return false;
            }
        },
        
        delete: async (endpoint) => {
            try {
                // If GitHub Service is available and initialized, use it
                if (window.githubService && window.isGitHubPagesEnvironment()) {
                    // Convert API endpoint to data path
                    const dataPath = `data${endpoint.replace('/api', '')}.json`;
                    return await window.githubService.deleteFile(dataPath);
                }
                
                // Fallback to localStorage
                localStorage.removeItem(endpoint.replace('/api/', ''));
                return true;
            } catch (error) {
                console.error(`API DELETE error (${endpoint}):`, error);
                return false;
            }
        }
    };
}

// Handle dashboard tab switching
function setupDashboardTabs() {
    const dashboardTabs = document.querySelectorAll('.dashboard-tab');
    const contentAreas = document.querySelectorAll('.dashboard-content');
    
    if (dashboardTabs.length === 0 || contentAreas.length === 0) {
        console.log('Dashboard tabs or content areas not found');
        return;
    }
    
    console.log('Setting up dashboard tab switching');
    
    // Add click event listeners to each tab
    dashboardTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTabId = tab.getAttribute('data-tab');
            if (!targetTabId) {
                console.error('Tab missing data-tab attribute', tab);
                return;
            }
            
            // Update active state on tabs
            dashboardTabs.forEach(t => {
                t.classList.remove('active');
            });
            tab.classList.add('active');
            
            // Show the selected content panel and hide others
            contentAreas.forEach(content => {
                if (content.id === `${targetTabId}-tab`) {
                    content.classList.remove('hidden');
                } else {
                    content.classList.add('hidden');
                }
            });
            
            console.log(`Switched to dashboard tab: ${targetTabId}`);
        });
    });
    
    // Also add event listeners to skill filters, project filters, etc.
    setupContentFilters();
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
    
    // Set up GitHub backend if needed
    setupGitHubBackend();
    
    // Initialize API client
    initializeApiClient();
    
    // Set up dashboard tabs and filters
    setupDashboardTabs();
    
    // Check if we need to show the GitHub setup UI
    if (isGitHubPagesEnvironment() && !localStorage.getItem('github_setup_complete')) {
        // We'll add code to show the setup UI if needed
        console.log('GitHub setup not complete, should show setup UI');
    }
    
    // Setup mobile menu toggle
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            const expanded = mobileMenuButton.getAttribute('aria-expanded') === 'true';
            mobileMenuButton.setAttribute('aria-expanded', !expanded);
        });
    }
    
    // Back to top button
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
    
    console.log('Portfolio initialization complete');
});