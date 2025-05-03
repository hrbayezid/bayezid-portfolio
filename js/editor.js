/**
 * Portfolio Editor - Enable in-place editing for marked sections
 * This script allows direct editing of content marked with data-editable attributes
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check if editing is enabled (via URL parameter or localStorage)
    const urlParams = new URLSearchParams(window.location.search);
    const editMode = urlParams.get('edit') === 'true' || localStorage.getItem('editMode') === 'true';
    
    // Add edit mode toggle button if edit mode is enabled
    if (editMode) {
        setupEditorUI();
        enableEditMode();
    }
    
    // Setup editor UI
    function setupEditorUI() {
        // Create edit mode toggle controls
        const controlPanel = document.createElement('div');
        controlPanel.className = 'fixed top-20 right-4 z-50 glass-effect p-4 rounded-lg shadow-lg';
        controlPanel.innerHTML = `
            <div class="text-center mb-3 font-bold">Editor Controls</div>
            <div class="flex flex-col gap-2">
                <button id="save-changes" class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors">
                    <i class="fas fa-save mr-2"></i>Save Changes
                </button>
                <button id="exit-edit-mode" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
                    <i class="fas fa-times mr-2"></i>Exit Edit Mode
                </button>
                <div class="text-xs text-gray-400 mt-2">Click on any text with a dotted border to edit</div>
            </div>
        `;
        document.body.appendChild(controlPanel);
        
        // Event listeners for editor controls
        document.getElementById('save-changes').addEventListener('click', saveChanges);
        document.getElementById('exit-edit-mode').addEventListener('click', exitEditMode);
    }
    
    // Enable edit mode functionality
    function enableEditMode() {
        // Find all editable elements
        const editableElements = document.querySelectorAll('[data-editable]');
        
        editableElements.forEach(el => {
            // Mark element as editable
            el.contentEditable = true;
            el.classList.add('editable-element');
            
            // Add outline to show it's editable
            el.style.outline = '2px dotted #06b6d4';
            el.style.outlineOffset = '2px';
            
            // For image elements, add special handling
            if (el.tagName === 'IMG') {
                el.addEventListener('click', function(e) {
                    e.preventDefault();
                    const newSrc = prompt('Enter new image URL:', el.src);
                    if (newSrc && newSrc.trim() !== '') {
                        el.src = newSrc;
                    }
                });
            }
            
            // Special handling for skill percentages
            if (el.hasAttribute('data-percentage')) {
                el.addEventListener('click', function(e) {
                    e.preventDefault();
                    const currentPercent = el.getAttribute('data-percentage');
                    const newPercent = prompt('Enter skill percentage (0-100):', currentPercent);
                    if (newPercent !== null && !isNaN(newPercent) && newPercent >= 0 && newPercent <= 100) {
                        el.style.width = newPercent + '%';
                        el.setAttribute('data-percentage', newPercent);
                    }
                });
            }
        });
        
        // Store edit mode state
        localStorage.setItem('editMode', 'true');
        
        // Add CSS for editable elements
        const style = document.createElement('style');
        style.id = 'editor-styles';
        style.innerHTML = `
            .editable-element:hover {
                outline: 2px solid #06b6d4 !important;
                cursor: pointer;
            }
            .editable-element:focus {
                outline: 2px solid #8b5cf6 !important;
                box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.2);
            }
        `;
        document.head.appendChild(style);
    }
    
    // Save changes to localStorage
    function saveChanges() {
        const editableElements = document.querySelectorAll('[data-editable]');
        const savedData = {};
        
        editableElements.forEach(el => {
            const key = el.getAttribute('data-editable');
            if (el.tagName === 'IMG') {
                savedData[key] = el.src;
            } else if (el.hasAttribute('data-percentage')) {
                savedData[key] = el.getAttribute('data-percentage');
            } else {
                savedData[key] = el.innerHTML;
            }
        });
        
        localStorage.setItem('portfolioContent', JSON.stringify(savedData));
        
        // Show save confirmation
        const saveConfirm = document.createElement('div');
        saveConfirm.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        saveConfirm.textContent = 'Changes saved successfully!';
        document.body.appendChild(saveConfirm);
        
        setTimeout(() => {
            saveConfirm.remove();
        }, 3000);
    }
    
    // Exit edit mode
    function exitEditMode() {
        localStorage.removeItem('editMode');
        window.location.href = window.location.pathname; // Reload without edit parameter
    }
    
    // Load saved content when page loads
    function loadSavedContent() {
        const savedData = localStorage.getItem('portfolioContent');
        if (savedData) {
            const contentData = JSON.parse(savedData);
            
            for (const key in contentData) {
                const elements = document.querySelectorAll(`[data-editable="${key}"]`);
                elements.forEach(el => {
                    if (el.tagName === 'IMG') {
                        el.src = contentData[key];
                    } else if (el.hasAttribute('data-percentage')) {
                        el.style.width = contentData[key] + '%';
                        el.setAttribute('data-percentage', contentData[key]);
                    } else {
                        el.innerHTML = contentData[key];
                    }
                });
            }
        }
    }
    
    // Load saved content
    loadSavedContent();
});

// Add a quick access to edit mode (double click on body with Alt key)
document.body.addEventListener('dblclick', function(e) {
    if (e.altKey) {
        window.location.href = window.location.pathname + '?edit=true';
    }
}); 