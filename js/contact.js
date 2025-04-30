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

            // Add real-time validation
            const emailInput = document.getElementById('from-email');
            if (emailInput) {
                emailInput.addEventListener('input', () => this.validateEmail(emailInput));
            }
        }
    }

    validateEmail(input) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(input.value);
        
        if (input.value && !isValid) {
            input.classList.add('border-red-500');
            input.classList.remove('border-green-500');
        } else if (input.value && isValid) {
            input.classList.add('border-green-500');
            input.classList.remove('border-red-500');
        } else {
            input.classList.remove('border-red-500', 'border-green-500');
        }
        
        return isValid;
    }

    handleSubmit() {
        const fromEmail = document.getElementById('from-email').value;
        const fromName = document.getElementById('from-name').value;
        const message = document.getElementById('contact-message').value;
        const toEmail = 'hrbayezid@gmail.com';

        if (!fromEmail || !fromName || !message) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        if (!this.validateEmail(document.getElementById('from-email'))) {
            this.showNotification('Please enter a valid email address', 'error');
            return;
        }

        // Create email content with better formatting
        const subject = `Portfolio Contact: ${fromName}`;
        const body = `From: ${fromName} (${fromEmail})\n\nMessage:\n${message}`;
        
        // Try opening default mail client first
        const mailtoLink = `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        const mailtoWindow = window.open(mailtoLink);
        
        // If mailto fails or is blocked, offer Gmail alternative
        setTimeout(() => {
            if (!mailtoWindow || mailtoWindow.closed) {
                const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${toEmail}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                this.showEmailOptions(gmailUrl);
            } else {
                // Show success message
                this.showNotification('Email client opened successfully', 'success');
                // Clear form
                document.getElementById('contact-form').reset();
            }
        }, 1000);
    }

    showEmailOptions(gmailUrl) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="glass-effect p-6 rounded-xl w-full max-w-md text-center">
                <h3 class="text-xl font-bold mb-4">Choose Email Option</h3>
                <p class="mb-6 text-gray-300">How would you like to send your message?</p>
                <div class="flex flex-col space-y-4">
                    <a href="${gmailUrl}" target="_blank" 
                        class="px-4 py-2 bg-gradient-to-r from-primary-500 to-purple-500 rounded-lg 
                        hover:from-primary-600 hover:to-purple-600 transition">
                        <i class="fab fa-google mr-2"></i>Open in Gmail
                    </a>
                    <button onclick="window.location.href='mailto:hrbayezid@gmail.com'" 
                        class="px-4 py-2 glass-effect hover:bg-white/10 transition">
                        <i class="fas fa-envelope mr-2"></i>Use Default Email Client
                    </button>
                    <button onclick="this.closest('.fixed').remove()" 
                        class="px-4 py-2 text-gray-400 hover:text-gray-300 transition">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
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
            notification.classList.add('animate-fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize contact manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.contactManager = new ContactManager();
});