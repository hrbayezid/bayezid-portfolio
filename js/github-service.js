class GitHubService {
    constructor() {
        this.token = null;
        this.owner = 'hrbayezid';
        this.repo = 'bayezid-portfolio';
        this.loadToken();
    }

    loadToken() {
        // Load token from secure storage
        this.token = sessionStorage.getItem('github_token');
    }

    async setToken(token) {
        this.token = token;
        // Store token in session storage instead of localStorage for better security
        sessionStorage.setItem('github_token', token);
    }

    async validateToken() {
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Token validation failed: ${error.message}`);
            }

            const userData = await response.json();
            // Verify repository access
            const repoResponse = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!repoResponse.ok) {
                throw new Error('Token does not have access to the repository');
            }

            return {
                valid: true,
                username: userData.login,
                repoAccess: true
            };
        } catch (error) {
            console.error('Token validation error:', error);
            throw error;
        }
    }

    async getFileContent(path) {
        if (!this.token) {
            throw new Error('GitHub token not set');
        }

        try {
            const response = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) throw new Error('Failed to fetch file content');
            
            const data = await response.json();
            return JSON.parse(atob(data.content));
        } catch (error) {
            console.error('Error fetching file:', error);
            return null;
        }
    }

    async updateFile(path, content) {
        if (!this.token) {
            throw new Error('GitHub token not set');
        }

        try {
            let sha;
            // First try to get the current file
            try {
                const currentFile = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`, {
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

            // Create or update the file
            const response = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `${sha ? 'Update' : 'Create'} ${path}`,
                    content: btoa(JSON.stringify(content, null, 2)),
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
}

// Initialize GitHub service when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.githubService = new GitHubService();
});