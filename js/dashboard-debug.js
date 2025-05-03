/**
 * Dashboard Debugging Utilities
 * This script provides tools to help diagnose and fix dashboard-related issues
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard debugging tools loaded');
    
    // Check if tab content elements actually exist
    const tabs = document.querySelectorAll('.dashboard-tab');
    const contentAreas = document.querySelectorAll('.dashboard-content');
    
    console.log(`Dashboard tabs found: ${tabs.length}`);
    console.log(`Dashboard content areas found: ${contentAreas.length}`);
    
    // Check tab to content mapping
    const tabMapping = {};
    let missingContentAreas = [];
    
    tabs.forEach(tab => {
        const tabId = tab.getAttribute('data-tab');
        const contentId = `${tabId}-tab`;
        const contentExists = !!document.getElementById(contentId);
        
        tabMapping[tabId] = {
            tab: tabId,
            contentId: contentId,
            contentExists: contentExists
        };
        
        if (!contentExists) {
            missingContentAreas.push(contentId);
        }
    });
    
    console.log('Tab to content mapping:', tabMapping);
    
    if (missingContentAreas.length > 0) {
        console.error('Missing content areas:', missingContentAreas);
        console.info('These tabs will not work correctly until their content areas are created');
    } else {
        console.log('All dashboard tabs have corresponding content areas');
    }
    
    // Add emergency fix function
    window.fixDashboardTabs = function() {
        console.log('Applying emergency fix to dashboard tabs');
        
        // Make sure the active tab has the active class
        const tabs = document.querySelectorAll('.dashboard-tab');
        let activeFound = false;
        
        tabs.forEach(tab => {
            if (tab.classList.contains('active')) {
                activeFound = true;
                
                // Force show the corresponding content
                const tabId = tab.getAttribute('data-tab');
                const contentId = `${tabId}-tab`;
                const content = document.getElementById(contentId);
                
                if (content) {
                    // Hide all content areas first
                    document.querySelectorAll('.dashboard-content').forEach(c => {
                        c.classList.add('hidden');
                    });
                    
                    // Show the active one
                    content.classList.remove('hidden');
                    console.log('Activated content for tab:', tabId);
                }
            }
        });
        
        if (!activeFound && tabs.length > 0) {
            // Activate the first tab
            const firstTab = tabs[0];
            firstTab.classList.add('active');
            
            // Show the corresponding content
            const tabId = firstTab.getAttribute('data-tab');
            const contentId = `${tabId}-tab`;
            const content = document.getElementById(contentId);
            
            if (content) {
                // Hide all content areas first
                document.querySelectorAll('.dashboard-content').forEach(c => {
                    c.classList.add('hidden');
                });
                
                // Show the active one
                content.classList.remove('hidden');
                console.log('Activated first tab and content:', tabId);
            }
        }
        
        // Re-attach click handlers
        tabs.forEach(tab => {
            // Remove existing handlers first to avoid duplicates
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);
            
            newTab.addEventListener('click', () => {
                const targetTabId = newTab.getAttribute('data-tab');
                
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                
                // Add active class to clicked tab
                newTab.classList.add('active');
                
                // Hide all content areas
                document.querySelectorAll('.dashboard-content').forEach(content => {
                    content.classList.add('hidden');
                });
                
                // Show the target content area
                const targetContent = document.getElementById(`${targetTabId}-tab`);
                if (targetContent) {
                    targetContent.classList.remove('hidden');
                    console.log(`Showing tab content: ${targetContent.id}`);
                } else {
                    console.error(`Content area with ID "${targetTabId}-tab" not found`);
                }
            });
        });
        
        console.log('Emergency fix applied to dashboard tabs');
    };
    
    // Provide a hint in the console
    console.info('If dashboard tabs are not working, try running window.fixDashboardTabs() in the console');
}); 