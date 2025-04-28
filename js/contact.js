class ContactManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }
    }

    handleSubmit() {
        const fromEmail = document.getElementById('from-email').value;
        const message = document.getElementById('contact-message').value;
        const toEmail = 'hrbayezid@gmail.com';

        if (!fromEmail || !message) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(fromEmail)) {
            this.showNotification('Please enter a valid email address', 'error');
            return;
        }

        // Create mailto link
        const subject = 'Contact from Portfolio Website';
        const body = encodeURIComponent(message);
        const mailtoLink = `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${body}&from=${encodeURIComponent(fromEmail)}`;

        // Open email client
        window.location.href = mailtoLink;

        // Show success message
        this.showNotification('Email client opened. Please send your message.', 'success');

        // Clear form
        document.getElementById('contact-form').reset();
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `fixed bottom-4 right-4 glass-effect px-6 py-3 rounded-lg animate-fade-in ${
            type === 'success' ? 'text-green-500' : 'text-red-500'
        }`;
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize contact manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.contactManager = new ContactManager();
}); 