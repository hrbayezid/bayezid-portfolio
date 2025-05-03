class GitHubService {
    constructor() {
        this.token = null;
        this.owner = 'hrbayezid';
        this.repo = 'bayezid-portfolio';
        this.dataFolder = 'data';
        this.loadToken();
        this.apiBaseUrl = 'https://api.github.com';
    }

    loadToken() {
        // Load token from local storage instead of session storage
        this.token = localStorage.getItem('active_github_token');
        if (!this.token) {
            console.log('No active GitHub token found');
        }
    }

    async setToken(token) {
        if (!token) {
            console.error('Attempted to set empty token');
            return false;
        }
        
        try {
            this.token = token;
            // Store token in localStorage for persistence
            localStorage.setItem('active_github_token', token);
            return true;
        } catch (error) {
            console.error('Error setting token:', error);
            return false;
        }
    }

    async validateToken() {
        if (!this.token) {
            return { valid: false, message: 'No token provided' };
        }
        
        try {
            // For admin auto-verification, return valid without checking
            if (this.token === 'admin_auto_verified') {
                return {
                    valid: true,
                    username: 'admin',
                    repoAccess: true,
                    message: 'Admin token auto-verified'
                };
            }
            
            // First check if the token format is valid
            if (!/^[a-zA-Z0-9_]+$/.test(this.token) || this.token.length < 30) {
                return { 
                    valid: false, 
                    message: 'Invalid token format' 
                };
            }
            
            // Use try-catch for fetch to handle network errors
            try {
                const response = await fetch(`${this.apiBaseUrl}/user`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(`Token validation failed: ${error.message || 'Invalid token'}`);
                }

                const userData = await response.json();
                
                // Verify repository access
                try {
                    const repoResponse = await fetch(`${this.apiBaseUrl}/repos/${this.owner}/${this.repo}`, {
                        headers: {
                            'Authorization': `Bearer ${this.token}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });

                    if (!repoResponse.ok) {
                        return {
                            valid: true,
                            username: userData.login,
                            repoAccess: false,
                            message: 'Token valid but lacks repository access'
                        };
                    }

                    return {
                        valid: true,
                        username: userData.login,
                        repoAccess: true,
                        message: 'Token fully verified with repository access'
                    };
                } catch (repoError) {
                    // Token is valid but repo access failed
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
                return {
                    valid: false,
                    message: 'Network error: Could not connect to GitHub'
                };
            }
        } catch (error) {
            console.error('Token validation error:', error);
            return { 
                valid: false, 
                message: error.message || 'Token validation failed'
            };
        }
    }

    async getFileContent(path) {
        try {
            // Check if token is available for authenticated request
            const headers = {
                'Accept': 'application/vnd.github.v3+json'
            };
            
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }

            // Use raw content URL for public files if no token
            if (!this.token) {
                // Try to fetch from raw GitHub content first (works for public repos)
                try {
                    const rawResponse = await fetch(`https://raw.githubusercontent.com/${this.owner}/${this.repo}/main/${path}`);
                    
                    if (rawResponse.ok) {
                        const text = await rawResponse.text();
                        try {
                            return JSON.parse(text);
                        } catch (e) {
                            return text;
                        }
                    }
                } catch (e) {
                    console.warn('Could not fetch from raw GitHub, falling back to API', e);
                }
            }

            // Fall back to API
            const response = await fetch(`${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`, {
                headers: headers
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`File ${path} not found, returning empty array or object`);
                    return path.endsWith('.json') ? [] : {};
                }
                throw new Error(`Failed to fetch file content: ${response.statusText}`);
            }
            
            const data = await response.json();
            const content = atob(data.content);
            try {
                return JSON.parse(content);
            } catch (e) {
                return content;
            }
        } catch (error) {
            console.error('Error fetching file:', error);
            return path.endsWith('.json') ? [] : null;
        }
    }

    async updateFile(path, content) {
        if (!this.token) {
            throw new Error('GitHub token not set. Authentication required for updating files.');
        }

        try {
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
                const error = await response.json();
                throw new Error(`Failed to ${sha ? 'update' : 'create'} file: ${error.message}`);
            }
            return true;
        } catch (error) {
            console.error('Error updating file:', error);
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
        return await this.updateFile(`${this.dataFolder}/projects.json`, projects);
    }
    
    async saveSkillsData(skills) {
        return await this.updateFile(`${this.dataFolder}/skills.json`, skills);
    }

    // Check if a file exists in the repository
    async checkFileExists(path) {
        try {
            // First, try using the raw GitHub URL for faster checks
            const rawResponse = await fetch(`https://raw.githubusercontent.com/${this.owner}/${this.repo}/main/${path}`);
            
            if (rawResponse.ok) {
                return true;
            }
            
            // If raw check failed, try the API (which might work if we have a token)
            if (this.token) {
                const apiResponse = await fetch(`${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                return apiResponse.ok;
            }
            
            return false;
        } catch (error) {
            console.warn(`Error checking if file exists (${path}):`, error);
            return false;
        }
    }

    async createFile(path, content, commitMessage = null) {
        if (!this.token) {
            throw new Error('GitHub token not set. Authentication required for creating files.');
        }

        try {
            let contentStr = typeof content === 'object' 
                ? JSON.stringify(content, null, 2) 
                : content.toString();

            const message = commitMessage || `Create ${path}`;
            
            const response = await fetch(`${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    content: btoa(contentStr)
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Failed to create file: ${error.message}`);
            }
            return true;
        } catch (error) {
            console.error('Error creating file:', error);
            return false;
        }
    }

    async deleteFile(path, commitMessage = null) {
        if (!this.token) {
            throw new Error('GitHub token not set. Authentication required for deleting files.');
        }

        try {
            // Get the file's SHA
            const fileResponse = await fetch(`${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!fileResponse.ok) {
                throw new Error(`File not found: ${path}`);
            }
            
            const fileData = await fileResponse.json();
            const sha = fileData.sha;
            
            const message = commitMessage || `Delete ${path}`;
            
            const response = await fetch(`${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    sha: sha
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Failed to delete file: ${error.message}`);
            }
            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            return false;
        }
    }
}

// Initialize GitHub service when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.githubService = new GitHubService();
});