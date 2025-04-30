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
            // First get the current file to get its SHA
            const currentFile = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }).then(res => res.json());

            // Update the file
            const response = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Update ${path}`,
                    content: btoa(JSON.stringify(content, null, 2)),
                    sha: currentFile.sha
                })
            });

            if (!response.ok) throw new Error('Failed to update file');
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