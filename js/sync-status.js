/**
 * sync-status.js
 * Provides real-time feedback on synchronization between GitHub repository and frontend
 */

class SyncStatusManager {
    constructor() {
        this.statusTypes = {
            INFO: 'info',
            SUCCESS: 'success',
            WARNING: 'warning',
            ERROR: 'error'
        };
        
        this.statusContainer = null;
        this.statusTimeout = null;
        this.init();
    }
    
    init() {
        // Create status container if it doesn't exist
        if (!document.getElementById('sync-status-container')) {
            this.createStatusContainer();
        } else {
            this.statusContainer = document.getElementById('sync-status-container');
        }
        
        // Register global error handler
        window.addEventListener('error', (event) => {
            const message = `JavaScript Error: ${event.message} (${event.filename}:${event.lineno})`;
            this.showStatus(message, this.statusTypes.ERROR);
            console.error(message, event);
        });
        
        console.log('Sync Status Manager initialized');
    }
    
    createStatusContainer() {
        // Create the container element
        this.statusContainer = document.createElement('div');
        this.statusContainer.id = 'sync-status-container';
        this.statusContainer.className = 'fixed bottom-4 left-4 z-50 max-w-md overflow-hidden';
        document.body.appendChild(this.statusContainer);
    }
    
    showStatus(message, type = 'info', duration = 5000) {
        // Create status message element
        const statusElement = document.createElement('div');
        statusElement.className = `flex items-center p-3 mb-2 rounded-lg animate-slide-up text-white shadow-lg ${this.getStatusClass(type)}`;
        
        // Add appropriate icon
        const iconClass = this.getStatusIcon(type);
        
        statusElement.innerHTML = `
            <div class="mr-3 text-xl"><i class="${iconClass}"></i></div>
            <div class="flex-grow">${message}</div>
            <button class="ml-2 text-white/60 hover:text-white focus:outline-none" onclick="this.parentNode.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to container
        this.statusContainer.appendChild(statusElement);
        
        // Schedule removal
        if (duration > 0) {
            setTimeout(() => {
                if (statusElement.parentNode) {
                    statusElement.classList.add('opacity-0');
                    setTimeout(() => statusElement.remove(), 300);
                }
            }, duration);
        }
        
        // Log to console as well
        this.logToConsole(message, type);
        
        return statusElement;
    }
    
    getStatusClass(type) {
        switch (type) {
            case this.statusTypes.SUCCESS:
                return 'bg-green-500';
            case this.statusTypes.WARNING:
                return 'bg-yellow-500';
            case this.statusTypes.ERROR:
                return 'bg-red-500';
            case this.statusTypes.INFO:
            default:
                return 'bg-blue-500';
        }
    }
    
    getStatusIcon(type) {
        switch (type) {
            case this.statusTypes.SUCCESS:
                return 'fas fa-check-circle';
            case this.statusTypes.WARNING:
                return 'fas fa-exclamation-triangle';
            case this.statusTypes.ERROR:
                return 'fas fa-times-circle';
            case this.statusTypes.INFO:
            default:
                return 'fas fa-info-circle';
        }
    }
    
    logToConsole(message, type) {
        switch (type) {
            case this.statusTypes.SUCCESS:
                console.log(`%c✅ ${message}`, 'color: #10b981; font-weight: bold;');
                break;
            case this.statusTypes.WARNING:
                console.warn(`⚠️ ${message}`);
                break;
            case this.statusTypes.ERROR:
                console.error(`❌ ${message}`);
                break;
            case this.statusTypes.INFO:
            default:
                console.info(`ℹ️ ${message}`);
                break;
        }
    }
    
    // GitHub specific status methods
    fetchingFromGitHub(path) {
        return this.showStatus(`Fetching ${path} from GitHub...`, this.statusTypes.INFO, 3000);
    }
    
    fetchSuccess(path) {
        return this.showStatus(`Successfully fetched ${path} from GitHub`, this.statusTypes.SUCCESS, 3000);
    }
    
    fetchFailed(path, error) {
        const message = `Failed to fetch ${path}: ${error.message || error}`;
        return this.showStatus(message, this.statusTypes.ERROR, 10000);
    }
    
    rateLimitHit() {
        return this.showStatus(
            'GitHub API rate limit exceeded! Wait 60 minutes or configure a token for more requests.',
            this.statusTypes.ERROR,
            10000
        );
    }
    
    savingToGitHub(path) {
        return this.showStatus(`Saving ${path} to GitHub...`, this.statusTypes.INFO, 3000);
    }
    
    saveSuccess(path) {
        return this.showStatus(`Successfully saved ${path} to GitHub`, this.statusTypes.SUCCESS, 5000);
    }
    
    saveFailed(path, error) {
        const message = `Failed to save ${path}: ${error.message || error}`;
        return this.showStatus(message, this.statusTypes.ERROR, 10000);
    }
    
    // Data refresh status
    dataRefreshing(type) {
        return this.showStatus(`Refreshing ${type} data...`, this.statusTypes.INFO, 3000);
    }
    
    dataRefreshed(type) {
        return this.showStatus(`${type} data refreshed successfully`, this.statusTypes.SUCCESS, 5000);
    }
    
    dataRefreshFailed(type, error) {
        const message = `Failed to refresh ${type} data: ${error.message || error}`;
        return this.showStatus(message, this.statusTypes.ERROR, 10000);
    }
    
    // Network status
    connectionError(message) {
        return this.showStatus(`Network Error: ${message}`, this.statusTypes.ERROR, 10000);
    }
    
    // GitHub token status
    tokenInvalid() {
        return this.showStatus('GitHub token is invalid or missing. Please set a valid token.', this.statusTypes.ERROR, 10000);
    }
    
    tokenValid(username) {
        return this.showStatus(`GitHub token valid. Connected as ${username}.`, this.statusTypes.SUCCESS, 5000);
    }
}

// Initialize on load
let syncStatus;
document.addEventListener('DOMContentLoaded', () => {
    window.syncStatus = new SyncStatusManager();
    syncStatus = window.syncStatus;
}); 