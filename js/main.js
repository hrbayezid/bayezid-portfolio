// Utility Functions
const utils = {
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    animateElement: (element, animation) => {
        element.classList.add(animation);
        element.addEventListener('animationend', () => {
            element.classList.remove(animation);
        }, { once: true });
    }
};

// Navigation
class Navigation {
    constructor() {
        this.mobileMenuButton = document.getElementById('mobile-menu-button');
        this.mobileMenu = document.getElementById('mobile-menu');
        this.backToTopButton = document.getElementById('back-to-top');
        this.init();
    }

    init() {
        this.setupMobileMenu();
        this.setupSmoothScroll();
        this.setupBackToTop();
        this.setupIntersectionObserver();
    }

    setupMobileMenu() {
        this.mobileMenuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.mobileMenu.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!this.mobileMenu.contains(e.target) && !this.mobileMenuButton.contains(e.target)) {
                this.mobileMenu.classList.add('hidden');
            }
        });

        document.addEventListener('scroll', () => {
            this.mobileMenu.classList.add('hidden');
        });

        this.mobileMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    setupBackToTop() {
        window.addEventListener('scroll', utils.debounce(() => {
            if (window.pageYOffset > 300) {
                this.backToTopButton.classList.remove('hidden');
                utils.animateElement(this.backToTopButton, 'animate-fade-in');
            } else {
                this.backToTopButton.classList.add('hidden');
            }
        }, 100));

        this.backToTopButton.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    setupIntersectionObserver() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');
        
        const options = {
            root: null,
            rootMargin: '-20% 0px -80% 0px',
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    this.highlightNavLink(id);
                }
            });
        }, options);

        sections.forEach(section => observer.observe(section));

        // Add highlight class to nav links
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }

    highlightNavLink(sectionId) {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${sectionId}`) {
                link.classList.add('active');
            }
        });
    }
}

// Project Management
class ProjectManager {
    constructor() {
        // Initialize with default projects if none exist
        const defaultProjects = [
            {
                id: 1,
                title: "Data Analysis Dashboard",
                category: "data",
                status: "completed",
                description: "Interactive dashboard for data visualization using Python and Streamlit",
                image: "https://via.placeholder.com/800x450",
                link: "https://github.com/hrbayezid/data-analysis-dashboard"
            },
            {
                id: 2,
                title: "Portfolio Website",
                category: "web",
                status: "completed",
                description: "Personal portfolio website built with HTML, TailwindCSS, and JavaScript",
                image: "https://via.placeholder.com/800x450",
                link: "https://github.com/hrbayezid/bayezid-portfolio"
            }
        ];

        // Get projects from localStorage or use defaults
        this.projects = JSON.parse(localStorage.getItem('projects')) || defaultProjects;
        if (!this.projects.length) {
            this.projects = defaultProjects;
            this.saveProjects();
        }

        this.projectsTable = document.getElementById('projects-table');
        this.projectsGrid = document.getElementById('projects-grid');
        this.addProjectBtn = document.getElementById('add-project-btn');
        this.init();
    }

    init() {
        this.renderProjects();
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.addProjectBtn.addEventListener('click', () => this.showAddProjectModal());
    }

    showAddProjectModal(project = null) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="glass-effect p-6 rounded-xl w-full max-w-md">
                <h3 class="text-xl font-bold mb-4">${project ? 'Edit' : 'Add'} Project</h3>
                <form id="project-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1">Title</label>
                        <input type="text" name="title" required class="w-full p-2 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" value="${project?.title || ''}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Category</label>
                        <select name="category" class="w-full p-2 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white">
                            <option value="web" ${project?.category === 'web' ? 'selected' : ''}>Web Development</option>
                            <option value="data" ${project?.category === 'data' ? 'selected' : ''}>Data Science</option>
                            <option value="ml" ${project?.category === 'ml' ? 'selected' : ''}>Machine Learning</option>
                            <option value="viz" ${project?.category === 'viz' ? 'selected' : ''}>Data Visualization</option>
                            <option value="cleaning" ${project?.category === 'cleaning' ? 'selected' : ''}>Data Cleaning</option>
                            <option value="sql" ${project?.category === 'sql' ? 'selected' : ''}>SQL & Database</option>
                            <option value="api" ${project?.category === 'api' ? 'selected' : ''}>API Development</option>
                            <option value="automation" ${project?.category === 'automation' ? 'selected' : ''}>Automation</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Status</label>
                        <select name="status" class="w-full p-2 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white">
                            <option value="completed" ${project?.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="in-progress" ${project?.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                            <option value="planned" ${project?.status === 'planned' ? 'selected' : ''}>Planned</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Description</label>
                        <textarea name="description" class="w-full p-2 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" rows="3">${project?.description || ''}</textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Project Image</label>
                        <div class="flex items-center space-x-4">
                            <input type="file" name="imageFile" accept="image/*" class="hidden" id="project-image-input">
                            <button type="button" onclick="document.getElementById('project-image-input').click()" class="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition">
                                Choose Image
                            </button>
                            <span id="image-filename" class="text-sm text-gray-400">${project?.image ? 'Current image selected' : 'No image selected'}</span>
                        </div>
                        <div id="image-preview" class="mt-2 ${project?.image ? '' : 'hidden'}">
                            <img src="${project?.image || ''}" alt="Preview" class="w-full h-32 object-cover rounded-lg">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Project Link</label>
                        <input type="url" name="link" class="w-full p-2 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" value="${project?.link || ''}">
                    </div>
                    <div class="flex justify-end space-x-2">
                        <button type="button" class="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition" onclick="this.closest('.fixed').remove()">Cancel</button>
                        <button type="submit" class="px-4 py-2 bg-gradient-to-r from-primary-500 to-purple-500 rounded-lg hover:from-primary-600 hover:to-purple-600 transition">Save</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // Add custom styles for select dropdowns
        const style = document.createElement('style');
        style.textContent = `
            select {
                appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 0.5rem center;
                background-size: 1.5em 1.5em;
                padding-right: 2.5rem;
            }
            select option {
                background-color: #1a1a1a;
                color: white;
            }
        `;
        document.head.appendChild(style);

        // Setup image upload preview
        const imageInput = modal.querySelector('#project-image-input');
        const imagePreview = modal.querySelector('#image-preview');
        const imageFilename = modal.querySelector('#image-filename');

        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview" class="w-full h-32 object-cover rounded-lg">`;
                    imagePreview.classList.remove('hidden');
                    imageFilename.textContent = file.name;
                };
                reader.readAsDataURL(file);
            }
        });

        const form = modal.querySelector('form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const projectData = {
                title: formData.get('title'),
                category: formData.get('category'),
                status: formData.get('status'),
                description: formData.get('description'),
                link: formData.get('link')
            };

            // Handle image upload
            const imageFile = formData.get('imageFile');
            if (imageFile && imageFile.size > 0) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    projectData.image = e.target.result;
                    this.saveProject(project, projectData);
                    modal.remove();
                    style.remove();
                };
                reader.readAsDataURL(imageFile);
            } else {
                // If no new image is selected, keep the existing one
                projectData.image = project?.image || '';
                this.saveProject(project, projectData);
                modal.remove();
                style.remove();
            }
        });
    }

    saveProject(project, projectData) {
        if (project) {
            this.updateProject(project.id, projectData);
        } else {
            this.addProject(projectData);
        }
    }

    addProject(projectData) {
        const project = {
            id: Date.now(),
            ...projectData
        };
        this.projects.push(project);
        this.saveProjects();
        this.renderProjects();
    }

    updateProject(id, projectData) {
        const index = this.projects.findIndex(p => p.id === id);
        if (index !== -1) {
            this.projects[index] = { ...this.projects[index], ...projectData };
            this.saveProjects();
            this.renderProjects();
        }
    }

    deleteProject(id) {
        this.projects = this.projects.filter(p => p.id !== id);
        this.saveProjects();
        this.renderProjects();
    }

    saveProjects() {
        localStorage.setItem('projects', JSON.stringify(this.projects));
    }

    renderProjects() {
        // Ensure we have references to the DOM elements
        if (!this.projectsGrid || !this.projectsTable) {
            console.error('Projects containers not found');
            return;
        }

        // Render projects grid (public view)
        this.projectsGrid.innerHTML = this.projects.map(project => `
            <div class="project-card glass-effect rounded-lg overflow-hidden transform hover:scale-105 transition duration-300 w-[85vw] sm:w-full mx-auto">
                <div class="relative w-full h-56">
                    <img src="${project.image || 'https://via.placeholder.com/800x450'}" 
                        alt="${project.title}" 
                        class="absolute inset-0 w-full h-full object-cover object-center"
                        loading="lazy">
                </div>
                <div class="p-4">
                    <h3 class="text-lg font-bold font-display truncate">${project.title}</h3>
                    <p class="text-gray-300 text-sm line-clamp-2 min-h-[2.5em] mt-1">${project.description}</p>
                    <div class="flex items-center justify-between mt-3">
                        <span class="px-2 py-1 rounded-full text-xs ${
                            project.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            project.status === 'in-progress' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                        }">
                            ${project.status}
                        </span>
                        <a href="${project.link || '#'}" target="_blank" rel="noopener noreferrer"
                            class="inline-block px-3 py-1 text-sm bg-gradient-to-r from-primary-500 to-purple-500 
                            rounded-full hover:from-primary-600 hover:to-purple-600 transition">
                            View Project
                        </a>
                    </div>
                </div>
            </div>
        `).join('');

        // Render dashboard table
        if (this.projectsTable) {
            this.projectsTable.innerHTML = this.projects.map(project => {
                const safeProject = { ...project };
                return `
                    <tr class="border-b border-gray-700">
                        <td class="py-4">${project.title}</td>
                        <td class="py-4">${project.category}</td>
                        <td class="py-4">
                            <span class="px-2 py-1 rounded-full text-xs ${
                                project.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                project.status === 'in-progress' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-blue-500/20 text-blue-400'
                            }">
                                ${project.status}
                            </span>
                        </td>
                        <td class="py-4">
                            <button type="button" onclick='projectManager.showAddProjectModal(${JSON.stringify(safeProject).replace(/"/g, '&quot;')})' 
                                class="text-primary-400 hover:text-primary-300 mr-2">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" onclick="projectManager.deleteProject(${project.id})" 
                                class="text-red-400 hover:text-red-300">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }
}

// Skills Management
class SkillsManager {
    constructor() {
        this.skills = JSON.parse(localStorage.getItem('skills') || '[]');
        
        // If no skills exist in localStorage, initialize with default skills
        if (this.skills.length === 0) {
            this.skills = [
                { id: 1, name: 'Python', category: 'programming-languages', proficiency: 80 },
                { id: 2, name: 'JavaScript', category: 'programming-languages', proficiency: 75 },
                { id: 3, name: 'SQL', category: 'programming-languages', proficiency: 70 },
                { id: 4, name: 'Pandas', category: 'data-science-tools', proficiency: 85 },
                { id: 5, name: 'NumPy', category: 'data-science-tools', proficiency: 80 },
                { id: 6, name: 'Machine Learning', category: 'data-science-tools', proficiency: 75 },
                { id: 7, name: 'HTML', category: 'web-development', proficiency: 90 },
                { id: 8, name: 'Tailwind CSS', category: 'web-development', proficiency: 85 },
                { id: 9, name: 'Matplotlib', category: 'data-visualization', proficiency: 80 },
                { id: 10, name: 'Seaborn', category: 'data-visualization', proficiency: 75 }
            ];
            this.saveSkills();
        }
        
        this.skillsTable = document.getElementById('skills-table');
        this.addSkillBtn = document.getElementById('add-skill-btn');
        this.init();
    }

    init() {
        this.renderSkills();
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.addSkillBtn.addEventListener('click', () => this.showAddSkillModal());
    }

    renderSkills() {
        if (!this.skillsTable) {
            console.error('Skills table element not found!');
            return;
        }
        
        // Create category groups for skills section
        const skillsByCategory = this.skills.reduce((acc, skill) => {
            if (!acc[skill.category]) {
                acc[skill.category] = [];
            }
            acc[skill.category].push(skill);
            return acc;
        }, {});

        // Render skills in dashboard table
        this.skillsTable.innerHTML = this.skills.map(skill => {
            const safeSkill = {
                id: skill.id,
                name: skill.name,
                category: skill.category,
                proficiency: skill.proficiency
            };
            
            return `
                <tr class="border-b border-gray-700">
                    <td class="py-4">${skill.name}</td>
                    <td class="py-4">${skill.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                    <td class="py-4">
                        <div class="w-full bg-white/10 rounded-full h-2.5 mb-1">
                            <div class="bg-gradient-to-r from-primary-500 to-purple-500 h-2.5 rounded-full transition-all duration-500" 
                                style="width: ${skill.proficiency}%"></div>
                        </div>
                        <span class="text-sm text-gray-400">${skill.proficiency}%</span>
                    </td>
                    <td class="py-4">
                        <button type="button" onclick="skillsManager.showAddSkillModal(${JSON.stringify(safeSkill).replace(/"/g, '&quot;')})" 
                            class="text-primary-400 hover:text-primary-300 mr-2">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" onclick="skillsManager.deleteSkill(${skill.id})" 
                            class="text-red-400 hover:text-red-300">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Update public skills section
        const skillsSection = document.querySelector('#skills .grid');
        if (skillsSection) {
            skillsSection.innerHTML = Object.entries(skillsByCategory).map(([category, skills]) => `
                <div class="glass-effect rounded-lg p-6 animate-slide-up hover:animate-float w-full max-w-md">
                    <h3 class="text-xl font-bold mb-4 font-display">${category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
                    <div class="space-y-4">
                        ${skills.map(skill => `
                            <div class="space-y-2">
                                <div class="flex justify-between">
                                    <span class="text-sm font-medium">${skill.name}</span>
                                    <span class="text-sm text-gray-400">${skill.proficiency}%</span>
                                </div>
                                <div class="w-full bg-white/10 rounded-full h-2">
                                    <div class="bg-gradient-to-r from-primary-500 to-purple-500 h-2 rounded-full transition-all duration-500" 
                                        style="width: ${skill.proficiency}%"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }
    }

    showAddSkillModal(skill = null) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="glass-effect p-6 rounded-xl w-full max-w-md">
                <h3 class="text-xl font-bold mb-4">${skill ? 'Edit' : 'Add'} Skill</h3>
                <form id="skill-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1">Skill Name</label>
                        <input type="text" name="name" required class="w-full p-2 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" value="${skill?.name || ''}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Category</label>
                        <select name="category" class="w-full p-2 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white appearance-none">
                            <option value="programming-languages" ${skill?.category === 'programming-languages' ? 'selected' : ''}>Programming Languages</option>
                            <option value="data-science-tools" ${skill?.category === 'data-science-tools' ? 'selected' : ''}>Data Science Tools</option>
                            <option value="web-development" ${skill?.category === 'web-development' ? 'selected' : ''}>Web Development</option>
                            <option value="data-visualization" ${skill?.category === 'data-visualization' ? 'selected' : ''}>Data Visualization</option>
                            <option value="data-cleaning" ${skill?.category === 'data-cleaning' ? 'selected' : ''}>Data Cleaning</option>
                            <option value="sql-database" ${skill?.category === 'sql-database' ? 'selected' : ''}>SQL & Database</option>
                        </select>
                        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
                            <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                            </svg>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Proficiency</label>
                        <input type="range" name="proficiency" min="0" max="100" class="w-full" value="${skill?.proficiency || 50}">
                        <div class="flex justify-between text-sm text-gray-400">
                            <span>Beginner</span>
                            <span>Expert</span>
                        </div>
                    </div>
                    <div class="flex justify-end space-x-2">
                        <button type="button" class="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition" onclick="this.closest('.fixed').remove()">Cancel</button>
                        <button type="submit" class="px-4 py-2 bg-gradient-to-r from-primary-500 to-purple-500 rounded-lg hover:from-primary-600 hover:to-purple-600 transition">Save</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // Add custom styles for select dropdown
        const style = document.createElement('style');
        style.textContent = `
            select {
                appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 0.5rem center;
                background-size: 1.5em 1.5em;
                padding-right: 2.5rem;
            }
            select option {
                background-color: #1a1a1a;
                color: white;
            }
        `;
        document.head.appendChild(style);

        const form = modal.querySelector('form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const skillData = Object.fromEntries(formData.entries());
            
            if (skill) {
                this.updateSkill(skill.id, skillData);
            } else {
                this.addSkill(skillData);
            }
            modal.remove();
            style.remove();
        });
    }

    addSkill(skillData) {
        const skill = {
            id: Date.now(),
            ...skillData
        };
        this.skills.push(skill);
        this.saveSkills();
        this.renderSkills();
    }

    updateSkill(id, skillData) {
        const index = this.skills.findIndex(s => s.id === id);
        if (index !== -1) {
            this.skills[index] = { ...this.skills[index], ...skillData };
            this.saveSkills();
            this.renderSkills();
        }
    }

    deleteSkill(id) {
        this.skills = this.skills.filter(s => s.id !== id);
        this.saveSkills();
        this.renderSkills();
    }

    saveSkills() {
        localStorage.setItem('skills', JSON.stringify(this.skills));
    }
}

// Contact Form
class ContactForm {
    constructor() {
        this.form = document.querySelector('#contact form');
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
    }

    handleSubmit() {
        const email = document.getElementById('from-email').value;
        const message = document.getElementById('contact-message').value;

        if (!email || !message) {
            alert('Please fill in all fields');
            return;
        }

        const subject = `New Message from ${email}`;
        const body = `From: ${email}\n\nMessage:\n${message}`;
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=hrbayezid@gmail.com&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body).replace(/%0A/g, '%0D%0A')}`;

        // Show success animation
        this.showSuccessAnimation();
        
        // Reset form
        this.form.reset();
        
        // Open Gmail after animation
        setTimeout(() => {
            window.open(gmailUrl, '_blank');
        }, 2000);
    }

    showSuccessAnimation() {
        const animation = document.createElement('div');
        animation.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        animation.innerHTML = `
            <div class="glass-effect rounded-xl p-8 text-center animate-scale-in">
                <div class="w-16 h-16 mx-auto mb-4">
                    <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                        <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                        <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                    </svg>
                </div>
                <h3 class="text-2xl font-bold mb-2">Message Sent!</h3>
                <p class="text-gray-300">I'll get back to you soon.</p>
            </div>
        `;

        document.body.appendChild(animation);

        setTimeout(() => {
            animation.remove();
        }, 3000);
    }
}

// Dashboard Management
class Dashboard {
    constructor() {
        this.menuButton = document.getElementById('dashboard-menu-button');
        this.menu = document.getElementById('dashboard-menu');
        this.tabs = document.querySelectorAll('.dashboard-tab');
        this.contents = document.querySelectorAll('.dashboard-content');
        this.profileForm = document.getElementById('profile-form');
        this.settingsForm = document.getElementById('settings-form');
        this.profileImage = document.getElementById('profile-image');
        this.profilePreview = document.getElementById('profile-preview');
        this.notificationSettings = {
            email_notifications: true,
            project_updates: true,
            show_email: true
        };
        this.init();
    }

    init() {
        this.setupMenu();
        this.setupTabs();
        this.setupForms();
        this.setupProfileImage();
        this.loadSavedData();
        this.applySettings();
        this.setupNotificationSystem();
    }

    setupMenu() {
        // Toggle menu on button click
        this.menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.menu.classList.toggle('hidden');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.menu.contains(e.target) && !this.menuButton.contains(e.target)) {
                this.menu.classList.add('hidden');
            }
        });
    }

    setupTabs() {
        this.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Remove active class from all tabs
                this.tabs.forEach(t => {
                    t.classList.remove('active', 'text-primary-400', 'border-primary-400');
                    t.classList.add('text-gray-400');
                });
                
                // Hide all content
                this.contents.forEach(c => c.classList.add('hidden'));
                
                // Add active class to clicked tab
                tab.classList.remove('text-gray-400');
                tab.classList.add('active', 'text-primary-400', 'border-primary-400');
                
                // Show corresponding content
                const tabId = tab.getAttribute('data-tab');
                const content = document.getElementById(`${tabId}-tab`);
                if (content) {
                    content.classList.remove('hidden');
                }
            });
        });
    }

    setupForms() {
        if (this.profileForm) {
            this.profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(this.profileForm);
                const profileData = Object.fromEntries(formData.entries());
                
                localStorage.setItem('profile', JSON.stringify(profileData));
                this.updateHeroSection(profileData);
                this.showSuccessMessage('Profile updated successfully!');
                this.handleProfileUpdate();
            });
        }

        if (this.settingsForm) {
            this.settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(this.settingsForm);
                const settingsData = Object.fromEntries(formData.entries());
                
                // Update notification settings
                this.notificationSettings = {
                    email_notifications: settingsData.email_notifications === 'on',
                    project_updates: settingsData.project_updates === 'on',
                    show_email: settingsData.show_email === 'on'
                };
                
                localStorage.setItem('settings', JSON.stringify(settingsData));
                localStorage.setItem('notificationSettings', JSON.stringify(this.notificationSettings));
                this.applySettings();
                this.showSuccessMessage('Settings saved successfully!');
                this.handleSettingsUpdate();
            });

            // Real-time theme switching
            const themeRadios = this.settingsForm.querySelectorAll('input[name="theme"]');
            themeRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    const settingsData = {
                        theme: radio.value,
                        email_notifications: this.settingsForm.querySelector('input[name="email_notifications"]').checked,
                        project_updates: this.settingsForm.querySelector('input[name="project_updates"]').checked,
                        show_email: this.settingsForm.querySelector('input[name="show_email"]').checked
                    };
                    localStorage.setItem('settings', JSON.stringify(settingsData));
                    this.applySettings();
                });
            });
        }
    }

    applySettings() {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        
        // Apply theme
        if (settings.theme === 'light') {
            document.documentElement.classList.remove('dark');
            document.body.classList.remove('dark');
        } else {
            document.documentElement.classList.add('dark');
            document.body.classList.add('dark');
        }

        // Apply email visibility
        const emailSection = document.querySelector('#contact .space-y-1:first-child');
        if (emailSection) {
            emailSection.style.display = settings.show_email ? 'block' : 'none';
        }

        // Update form checkboxes to match saved settings
        if (this.settingsForm) {
            Object.entries(settings).forEach(([key, value]) => {
                const input = this.settingsForm.querySelector(`[name="${key}"]`);
                if (input) {
                    if (input.type === 'checkbox') {
                        input.checked = value;
                    } else if (input.type === 'radio') {
                        input.checked = input.value === value;
                    }
                }
            });
        }

        // Update glass effect elements
        const glassElements = document.querySelectorAll('.glass-effect');
        glassElements.forEach(element => {
            if (settings.theme === 'light') {
                element.style.background = 'rgba(0, 0, 0, 0.05)';
                element.style.borderColor = 'rgba(0, 0, 0, 0.1)';
            } else {
                element.style.background = 'rgba(255, 255, 255, 0.05)';
                element.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }
        });

        // Update text colors
        const textElements = document.querySelectorAll('.text-gray-300, .text-gray-400');
        textElements.forEach(element => {
            if (settings.theme === 'light') {
                element.classList.remove('text-gray-300', 'text-gray-400');
                element.classList.add('text-gray-700');
            } else {
                element.classList.remove('text-gray-700');
                element.classList.add('text-gray-300');
            }
        });

        // Update form elements
        const formElements = document.querySelectorAll('input, textarea, select');
        formElements.forEach(element => {
            if (settings.theme === 'light') {
                element.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
                element.style.color = '#0a0a0a';
            } else {
                element.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                element.style.color = '#ffffff';
            }
        });

        // Update borders
        const borderElements = document.querySelectorAll('.border-gray-700');
        borderElements.forEach(element => {
            if (settings.theme === 'light') {
                element.style.borderColor = '#e5e7eb';
            } else {
                element.style.borderColor = '#374151';
            }
        });
    }

    updateHeroSection(profileData) {
        // Update hero section name
        const heroName = document.querySelector('#home h1');
        if (heroName) {
            heroName.textContent = profileData.name || 'Bayezid';
        }

        // Update hero section title
        const heroTitle = document.querySelector('#home p');
        if (heroTitle) {
            heroTitle.textContent = profileData.title || 'Aspiring Data Scientist | Building the Future with Code';
        }

        // Update contact section email
        const contactEmail = document.querySelector('#contact .text-gray-300');
        if (contactEmail) {
            contactEmail.textContent = profileData.email || 'hrbayezid@gmail.com';
        }
    }

    setupProfileImage() {
        if (this.profileImage && this.profilePreview) {
            this.profileImage.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        // Update profile preview in dashboard
                        this.profilePreview.src = e.target.result;
                        
                        // Update hero section profile image
                        const heroProfileImage = document.querySelector('#home .rounded-full img');
                        if (heroProfileImage) {
                            heroProfileImage.src = e.target.result;
                        }
                        
                        // Save to localStorage
                        localStorage.setItem('profileImage', e.target.result);
                        
                        // Show success message
                        this.showSuccessMessage('Profile picture updated successfully!');
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }

    showSuccessMessage(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-4 right-4 glass-effect px-6 py-3 rounded-lg animate-fade-in';
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas fa-check-circle text-green-500"></i>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    loadSavedData() {
        // Load profile data
        if (this.profileForm) {
            const savedProfile = localStorage.getItem('profile');
            if (savedProfile) {
                const profileData = JSON.parse(savedProfile);
                Object.entries(profileData).forEach(([key, value]) => {
                    const input = this.profileForm.querySelector(`[name="${key}"]`);
                    if (input) input.value = value;
                });
            }
        }

        // Load settings
        if (this.settingsForm) {
            const savedSettings = localStorage.getItem('settings');
            if (savedSettings) {
                const settingsData = JSON.parse(savedSettings);
                Object.entries(settingsData).forEach(([key, value]) => {
                    const input = this.settingsForm.querySelector(`[name="${key}"]`);
                    if (input) {
                        if (input.type === 'checkbox') {
                            input.checked = value;
                        } else if (input.type === 'radio') {
                            input.checked = input.value === value;
                        }
                    }
                });
            }
        }

        // Load profile image
        const savedImage = localStorage.getItem('profileImage');
        if (savedImage) {
            if (this.profilePreview) {
                this.profilePreview.src = savedImage;
            }
            
            const heroProfileImage = document.querySelector('#home .rounded-full img');
            if (heroProfileImage) {
                heroProfileImage.src = savedImage;
            }
        }
    }

    setupNotificationSystem() {
        // Request notification permission
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Notification permission granted');
                }
            });
        }

        // Load saved notification settings
        const savedSettings = localStorage.getItem('notificationSettings');
        if (savedSettings) {
            this.notificationSettings = JSON.parse(savedSettings);
        }

        // Update form checkboxes based on saved settings
        if (this.settingsForm) {
            Object.entries(this.notificationSettings).forEach(([key, value]) => {
                const input = this.settingsForm.querySelector(`[name="${key}"]`);
                if (input) {
                    input.checked = value;
                }
            });
        }
    }

    showNotification(title, options = {}) {
        if (!this.notificationSettings.email_notifications) return;

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                ...options
            });
        }
    }

    handleProjectUpdate(project) {
        if (!this.notificationSettings.project_updates) return;

        this.showNotification('Project Update', {
            body: `Project "${project.title}" has been updated`,
            tag: `project-${project.id}`
        });
    }

    handleProfileUpdate() {
        this.showNotification('Profile Updated', {
            body: 'Your profile has been successfully updated'
        });
    }

    handleSettingsUpdate() {
        this.showNotification('Settings Updated', {
            body: 'Your settings have been saved'
        });
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    // Initialize Dashboard first
    const dashboard = new Dashboard();
    console.log('Dashboard initialized:', dashboard);
    
    // Initialize other components
    window.projectManager = new ProjectManager();
    window.skillsManager = new SkillsManager();
    console.log('SkillsManager initialized:', window.skillsManager);
    new Navigation();
    new ContactForm();
    
    // Make dashboard globally accessible
    window.dashboard = dashboard;
});