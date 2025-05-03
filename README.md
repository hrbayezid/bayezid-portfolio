# Bayezid's Portfolio Website

A professional portfolio website for Bayezid, showcasing his skills and projects as a data scientist/analyst. The website includes sections for skills, projects, education, and contact information, along with an admin dashboard for content management.

## Features

- Responsive design with Tailwind CSS
- Dark mode UI with glassmorphism
- Dynamic content loading from GitHub repository
- Skills and projects display with filter functionality
- Dashboard for content management
- GitHub Pages backend integration for data persistence
- Authentication system (admin access)
- Activity logging
- Contact form

## Authentication

The site includes an admin dashboard accessible with the following credentials:
- Username: `bayezid` or Email: `hrbayezid@gmail.com`
- Password: `Bayezid@420`

## Project Structure

- `index.html` - Main HTML file
- `js/`
  - `main.js` - Core functionality and public data loading
  - `auth.js` - Authentication system
  - `github-service.js` - GitHub API client for repository operations (public read, authenticated write)
  - `github-storage.js` - GitHub backend storage implementation
  - `setup-github-backend.js` - Setup wizard for GitHub backend
  - `editor.js` - Content editing functionality
  - `contact.js` - Contact form handling
- `data/` - JSON data files for GitHub backend storage
  - `projects.json` - Portfolio projects data
  - `skills.json` - Skills data
  - `profile.json` - Profile information
  - `settings.json` - Application settings
- `.nojekyll` - Prevents GitHub Pages from using Jekyll processing

## GitHub Pages Backend Architecture

This portfolio uses a unique approach to create a "serverless backend" using GitHub Pages and the GitHub API:

### How It Works

1. **Static Site Hosting**: GitHub Pages hosts the static site files (HTML, CSS, JS)
2. **Data Storage**: Portfolio data (projects, skills, profile) is stored as JSON files in the repository
3. **Public Read Access**: Public visitors directly fetch data from raw GitHub URLs without authentication
4. **Authenticated Write Access**: Admin dashboard uses GitHub Personal Access Tokens for writing data
5. **Direct Data Fetching**: All data is fetched directly from GitHub repository, ensuring visitors always see the latest data

### Benefits of This Approach

- **Zero Backend Costs**: No need for traditional backend servers
- **Automatic Deployment**: Changes are deployed immediately through GitHub Pages
- **Version Control**: All content changes are tracked in Git history
- **Secure**: Uses GitHub's authentication and security mechanisms
- **Always Fresh Data**: Public visitors always see the latest portfolio data from the GitHub repository
- **No Token Required for Visitors**: Public pages never request GitHub authentication

## GitHub Backend Configuration

The portfolio site uses GitHub as a backend to store and manage data:

1. Login to the admin dashboard using the credentials provided
2. Go to the Settings tab
3. Enable "GitHub Backend Integration"
4. Configure GitHub settings:
   - GitHub Username: Your GitHub username
   - Repository Name: Name of an existing repository or a new one to be created
   - Personal Access Token: [Create a GitHub token](https://github.com/settings/tokens) with 'repo' scope
   - Branch: The branch to use (defaults to 'main')
5. Click "Test Connection" to verify your settings

When GitHub integration is enabled, all data (skills, projects, settings) will be stored in the specified repository as JSON files.

## Frontend-Backend Integration

The codebase is designed with a clean separation between data access and UI logic. All data operations go through an API client:

```javascript
window.apiClient = {
    get: async (endpoint) => {
        // Fetches data directly from GitHub repository
        // Public visitors: Uses raw GitHub URLs for direct access
        // Admin: Uses authenticated GitHub API with token
    },
    post: async (endpoint, data) => {
        // Creates data via GitHub API (requires authentication)
        // Only available in admin dashboard
    },
    put: async (endpoint, data) => {
        // Updates data via GitHub API (requires authentication)
        // Only available in admin dashboard
    },
    delete: async (endpoint) => {
        // Deletes data via GitHub API (requires authentication)
        // Only available in admin dashboard
    }
}
```

### API Flow

1. Application code calls `apiClient.get('/api/projects')`
2. For public visitors:
   - Directly fetches JSON from `https://raw.githubusercontent.com/username/repo/main/data/projects.json`
   - Displays data to visitors without requiring authentication
3. For admin operations:
   - Uses GitHub API with authentication token
   - Provides write access to update portfolio content

### API Endpoints

The following API endpoints are supported:

- `/api/skills` - Skills CRUD operations
- `/api/projects` - Projects CRUD operations
- `/api/profile` - Profile settings
- `/api/social_links` - Social media links
- `/api/settings` - Application settings

### Data Models

#### Skill
```javascript
{
    id: Number,
    name: String,
    category: String,
    proficiency: Number,
    description: String
}
```

#### Project
```javascript
{
    id: Number,
    title: String,
    category: String,
    description: String,
    image: String,
    demoUrl: String,
    repoUrl: String,
    tags: Array,
    featured: Boolean,
    duration: String,
    tools: String,
    challenges: String
}
```

#### User
```javascript
{
    id: Number,
    username: String,
    email: String,
    name: String,
    isAdmin: Boolean,
    lastLogin: String
}
```

## Deployment to GitHub Pages

To deploy this portfolio with GitHub Pages backend:

1. Fork or clone this repository
2. Enable GitHub Pages in your repository settings:
   - Go to Settings > Pages
   - Set source to "main" branch
   - Save the configuration
3. Wait for the GitHub Pages site to be published (check the URL in the Pages settings)
4. Visit your published site and log in to the admin dashboard
5. Configure GitHub backend using your Personal Access Token
6. Start managing your portfolio content through the dashboard

### Local Development

1. Clone the repository
2. Open with a local server, e.g.:
   ```
   python -m http.server 8080
   ```
3. Access at http://localhost:8080
4. For GitHub backend write functionality, configure settings in the admin dashboard

## Testing Your Site

To ensure your portfolio works properly for all visitors:

1. Test in regular browser window (cached data may be present)
2. Test in incognito/private browsing (tests fresh visit with no cache)
3. Test on mobile devices
4. Clear browser cache and reload to verify data loads directly from GitHub

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

Bayezid - hrbayezid@gmail.com