/**
 * Huntarr - History Module
 * Handles displaying and managing history entries for all media apps
 */

const historyModule = {
    // State
    currentApp: 'all',
    currentPage: 1,
    totalPages: 1,
    pageSize: 20,
    searchQuery: '',
    isLoading: false,
    
    // DOM elements
    elements: {},
    
    // Initialize the history module
    init: function() {
        this.cacheElements();
        this.setupEventListeners();
        
        // Initial load if history is active section
        if (huntarrUI && huntarrUI.currentSection === 'history') {
            this.loadHistory();
        }
    },
    
    // Cache DOM elements
    cacheElements: function() {
        this.elements = {
            // History dropdown
            historyOptions: document.querySelectorAll('.history-option'),
            currentHistoryApp: document.getElementById('current-history-app'),
            historyDropdownBtn: document.querySelector('.history-dropdown-btn'),
            historyDropdownContent: document.querySelector('.history-dropdown-content'),
            
            // Table and containers
            historyTable: document.querySelector('.history-table'),
            historyTableBody: document.getElementById('historyTableBody'),
            historyContainer: document.querySelector('.history-container'),
            
            // Controls
            historySearchInput: document.getElementById('historySearchInput'),
            historySearchButton: document.getElementById('historySearchButton'),
            historyPageSize: document.getElementById('historyPageSize'),
            clearHistoryButton: document.getElementById('clearHistoryButton'),
            
            // Pagination
            historyPrevPage: document.getElementById('historyPrevPage'),
            historyNextPage: document.getElementById('historyNextPage'),
            historyCurrentPage: document.getElementById('historyCurrentPage'),
            historyTotalPages: document.getElementById('historyTotalPages'),
            
            // State displays
            historyEmptyState: document.getElementById('historyEmptyState'),
            historyLoading: document.getElementById('historyLoading')
        };
    },
    
    // Set up event listeners
    setupEventListeners: function() {
        // App selection (native select)
        const historyAppSelect = document.getElementById('historyAppSelect');
        if (historyAppSelect) {
            historyAppSelect.addEventListener('change', (e) => {
                this.handleHistoryAppChange(e.target.value);
            });
        }
        // App selection (legacy click)
        this.elements.historyOptions.forEach(option => {
            option.addEventListener('click', e => this.handleHistoryAppChange(e));
        });
        
        // Search
        this.elements.historySearchButton.addEventListener('click', () => this.handleSearch());
        this.elements.historySearchInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') this.handleSearch();
        });
        
        // Page size
        this.elements.historyPageSize.addEventListener('change', () => this.handlePageSizeChange());
        
        // Clear history
        this.elements.clearHistoryButton.addEventListener('click', () => this.handleClearHistory());
        
        // Pagination
        this.elements.historyPrevPage.addEventListener('click', () => this.handlePagination('prev'));
        this.elements.historyNextPage.addEventListener('click', () => this.handlePagination('next'));
    },
    
    // Load history data when section becomes active
    loadHistory: function() {
        if (this.elements.historyContainer) {
            this.fetchHistoryData();
        }
    },
    
    // Handle app selection changes
    handleHistoryAppChange: function(eOrValue) {
        let selectedApp;
        if (typeof eOrValue === 'string') {
            selectedApp = eOrValue;
        } else if (eOrValue && eOrValue.target) {
            selectedApp = eOrValue.target.getAttribute('data-app');
            eOrValue.preventDefault();
        }
        if (!selectedApp || selectedApp === this.currentApp) return;
        // Update UI (for legacy click)
        if (this.elements.historyOptions) {
            this.elements.historyOptions.forEach(option => {
                option.classList.remove('active');
                if (option.getAttribute('data-app') === selectedApp) {
                    option.classList.add('active');
                }
            });
        }
        // Update dropdown text (if present)
        if (this.elements.currentHistoryApp) {
            const displayName = selectedApp.charAt(0).toUpperCase() + selectedApp.slice(1);
            this.elements.currentHistoryApp.textContent = displayName;
        }
        // Reset pagination
        this.currentPage = 1;
        // Update state and fetch data
        this.currentApp = selectedApp;
        this.fetchHistoryData();
    },
    
    // Handle search
    handleSearch: function() {
        const newSearchQuery = this.elements.historySearchInput.value.trim();
        
        // Only fetch if search query changed
        if (newSearchQuery !== this.searchQuery) {
            this.searchQuery = newSearchQuery;
            this.currentPage = 1; // Reset to first page
            this.fetchHistoryData();
        }
    },
    
    // Handle page size change
    handlePageSizeChange: function() {
        const newPageSize = parseInt(this.elements.historyPageSize.value);
        if (newPageSize !== this.pageSize) {
            this.pageSize = newPageSize;
            this.currentPage = 1; // Reset to first page
            this.fetchHistoryData();
        }
    },
    
    // Handle pagination
    handlePagination: function(direction) {
        if (direction === 'prev' && this.currentPage > 1) {
            this.currentPage--;
            this.fetchHistoryData();
        } else if (direction === 'next' && this.currentPage < this.totalPages) {
            this.currentPage++;
            this.fetchHistoryData();
        }
    },
    
    // Handle clear history
    handleClearHistory: function() {
        if (confirm(`Are you sure you want to clear ${this.currentApp === 'all' ? 'all history' : this.currentApp + ' history'}?`)) {
            this.clearHistory();
        }
    },
    
    // Fetch history data from API
    fetchHistoryData: function() {
        this.setLoading(true);
        
        // Construct URL with parameters
        let url = `/api/history/${this.currentApp}?page=${this.currentPage}&page_size=${this.pageSize}`;
        if (this.searchQuery) {
            url += `&search=${encodeURIComponent(this.searchQuery)}`;
        }
        
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                this.totalPages = data.total_pages;
                this.renderHistoryData(data);
                this.updatePaginationUI();
                this.setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching history data:', error);
                this.showError('Failed to load history data. Please try again later.');
                this.setLoading(false);
            });
    },
    
    // Clear history
    clearHistory: function() {
        this.setLoading(true);
        
        fetch(`/api/history/${this.currentApp}`, {
            method: 'DELETE',
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(() => {
                // Reload data
                this.fetchHistoryData();
            })
            .catch(error => {
                console.error('Error clearing history:', error);
                this.showError('Failed to clear history. Please try again later.');
                this.setLoading(false);
            });
    },
    
    // Render history data to table
    renderHistoryData: function(data) {
        const tableBody = this.elements.historyTableBody;
        tableBody.innerHTML = '';
        
        if (!data.entries || data.entries.length === 0) {
            this.showEmptyState();
            return;
        }
        
        // Hide empty state
        this.elements.historyEmptyState.style.display = 'none';
        this.elements.historyTable.style.display = 'table';
        
        // Render rows
        data.entries.forEach(entry => {
            const row = document.createElement('tr');
            
            // Format the instance name to include app type (capitalize first letter of app type)
            const appType = entry.app_type ? entry.app_type.charAt(0).toUpperCase() + entry.app_type.slice(1) : '';
            const formattedInstance = appType ? `${appType} - ${entry.instance_name}` : entry.instance_name;
            
            // Build the row content piece by piece to ensure ID has no wrapping elements
            const processedInfoCell = document.createElement('td');
            
            // Create info icon with hover tooltip functionality
            const infoIcon = document.createElement('i');
            infoIcon.className = 'fas fa-info-circle info-hover-icon';
            // Ensure the icon has the right content and is centered
            infoIcon.style.textAlign = 'center';
            
            // Create a span for the title with wrapping enabled
            const titleSpan = document.createElement('span');
            titleSpan.className = 'processed-title';
            titleSpan.style.wordBreak = 'break-word'; // Enable word breaking
            titleSpan.style.whiteSpace = 'normal'; // Allow normal wrapping
            titleSpan.style.overflow = 'visible'; // Ensure text is not cut off
            titleSpan.innerHTML = this.escapeHtml(entry.processed_info);
            
            // Create tooltip element for JSON data
            const tooltip = document.createElement('div');
            tooltip.className = 'json-tooltip';
            
            // Add a solid background backing div to ensure no transparency
            const solidBackground = document.createElement('div');
            solidBackground.style.position = 'absolute';
            solidBackground.style.top = '0';
            solidBackground.style.left = '0';
            solidBackground.style.width = '100%';
            solidBackground.style.height = '100%';
            solidBackground.style.backgroundColor = '#121824'; // Solid dark background
            solidBackground.style.zIndex = '1';
            solidBackground.style.borderRadius = '5px';
            tooltip.appendChild(solidBackground);
            
            // Add another solid layer for extra opacity
            const extraLayer = document.createElement('div');
            extraLayer.style.position = 'absolute';
            extraLayer.style.top = '0';
            extraLayer.style.left = '0';
            extraLayer.style.width = '100%';
            extraLayer.style.height = '100%';
            extraLayer.style.backgroundColor = '#0c111d';
            extraLayer.style.opacity = '0.9';
            extraLayer.style.zIndex = '2';
            extraLayer.style.borderRadius = '5px';
            tooltip.appendChild(extraLayer);
            
            // Create a container for content that sits above the background
            const contentContainer = document.createElement('div');
            contentContainer.style.position = 'relative';
            contentContainer.style.zIndex = '5'; // Higher z-index to ensure content is on top
            contentContainer.style.pointerEvents = 'auto';
            tooltip.appendChild(contentContainer);
            
            // Format the JSON data for display
            let jsonData = {};
            try {
                // Extract available fields from the entry for the tooltip
                jsonData = {
                    title: entry.processed_info,
                    id: entry.id,
                    app: entry.app_type || 'Unknown',
                    instance: entry.instance_name || 'Default',
                    date: entry.date_time_readable,
                    operation: entry.operation_type,
                    // Add any additional fields that might be useful
                    details: entry.details || {}
                };
            } catch (e) {
                jsonData = { error: 'Could not parse JSON data', title: entry.processed_info };
            }
            
            // Create formatted JSON content
            const pre = document.createElement('pre');
            pre.className = 'json-content';
            pre.textContent = JSON.stringify(jsonData, null, 2);
            contentContainer.appendChild(pre);
            
            // Add the tooltip to the icon
            infoIcon.appendChild(tooltip);
            
            // Add positioning logic to prevent the tooltip from being cut off
            infoIcon.addEventListener('mouseenter', () => {
                setTimeout(() => {
                    // Get positions
                    const iconRect = infoIcon.getBoundingClientRect();
                    const tooltipRect = tooltip.getBoundingClientRect();
                    const viewportWidth = window.innerWidth;
                    
                    // Position the tooltip to the right of the icon by default
                    let leftPos = 35; // Start with offset to the right
                    let topPos = '100%';
                    
                    // If tooltip would go off the right edge
                    if (iconRect.left + tooltipRect.width > viewportWidth) {
                        // Move it to the left so it stays within the viewport
                        const overflow = iconRect.left + tooltipRect.width - viewportWidth;
                        leftPos = -overflow - 20; // 20px padding from edge
                    }
                    
                    // Check if tooltip would go off the bottom edge
                    const viewportHeight = window.innerHeight;
                    if (iconRect.bottom + tooltipRect.height > viewportHeight) {
                        // Position above the icon instead
                        topPos = `-${tooltipRect.height}px`;
                    }
                    
                    // Apply the calculated positions
                    tooltip.style.left = `${leftPos}px`;
                    tooltip.style.top = topPos;
                }, 0);
            });
            
            // Create a container div to hold both icon and title on the same line
            const lineContainer = document.createElement('div');
            lineContainer.className = 'title-line-container';
            // Additional inline styles to ensure proper alignment
            lineContainer.style.display = 'flex';
            lineContainer.style.alignItems = 'flex-start';
            
            // Append icon and title to the container
            lineContainer.appendChild(infoIcon);
            lineContainer.appendChild(document.createTextNode(' ')); // Add space
            lineContainer.appendChild(titleSpan);
            
            // Add the container to the cell
            processedInfoCell.appendChild(lineContainer);
            
            const operationTypeCell = document.createElement('td');
            operationTypeCell.innerHTML = this.formatOperationType(entry.operation_type);
            
            // Create a plain text ID cell with no styling
            const idCell = document.createElement('td');
            idCell.className = 'plain-id';
            idCell.textContent = entry.id; // Use textContent to ensure no HTML parsing
            
            const instanceCell = document.createElement('td');
            instanceCell.innerHTML = this.escapeHtml(formattedInstance);
            
            const timeAgoCell = document.createElement('td');
            timeAgoCell.innerHTML = this.escapeHtml(entry.how_long_ago);
            
            // Clear any existing content and append the cells
            row.innerHTML = '';
            row.appendChild(processedInfoCell);
            row.appendChild(operationTypeCell);
            row.appendChild(idCell);
            row.appendChild(instanceCell);
            row.appendChild(timeAgoCell);
            
            tableBody.appendChild(row);
        });
    },
    
    // Update pagination UI
    updatePaginationUI: function() {
        this.elements.historyCurrentPage.textContent = this.currentPage;
        this.elements.historyTotalPages.textContent = this.totalPages;
        
        // Enable/disable pagination buttons
        this.elements.historyPrevPage.disabled = this.currentPage <= 1;
        this.elements.historyNextPage.disabled = this.currentPage >= this.totalPages;
    },
    
    // Show empty state
    showEmptyState: function() {
        this.elements.historyTable.style.display = 'none';
        this.elements.historyEmptyState.style.display = 'flex';
    },
    
    // Show error
    showError: function(message) {
        // Use huntarrUI's notification system if available
        if (typeof huntarrUI !== 'undefined' && typeof huntarrUI.showNotification === 'function') {
            huntarrUI.showNotification(message, 'error');
        } else {
            alert(message);
        }
    },
    
    // Set loading state
    setLoading: function(isLoading) {
        this.isLoading = isLoading;
        
        if (isLoading) {
            this.elements.historyLoading.style.display = 'flex';
            this.elements.historyTable.style.display = 'none';
            this.elements.historyEmptyState.style.display = 'none';
        } else {
            this.elements.historyLoading.style.display = 'none';
        }
    },
    
    // Helper function to escape HTML
    escapeHtml: function(text) {
        if (text === null || text === undefined) return '';
        
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        
        return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
    },
    
    // Helper function to format operation type with gradient styling
    formatOperationType: function(operationType) {
        switch (operationType) {
            case 'missing':
                return '<span class="operation-status missing">Missing</span>';
            case 'upgrade':
                return '<span class="operation-status upgrade">Upgrade</span>';
            case 'warning':
                return '<span class="operation-status warning">Warning</span>';
            case 'error':
                return '<span class="operation-status error">Error</span>';
            case 'success':
                return '<span class="operation-status success">Success</span>';
            default:
                return operationType ? this.escapeHtml(operationType.charAt(0).toUpperCase() + operationType.slice(1)) : 'Unknown';
        }
    }
};

// Initialize when huntarrUI is ready
document.addEventListener('DOMContentLoaded', () => {
    historyModule.init();
    
    // Connect with main app
    if (typeof huntarrUI !== 'undefined') {
        // Add loadHistory to the section switch handler
        const originalSwitchSection = huntarrUI.switchSection;
        
        huntarrUI.switchSection = function(section) {
            // Call original function
            originalSwitchSection.call(huntarrUI, section);
            
            // Load history data when switching to history section
            if (section === 'history') {
                historyModule.loadHistory();
            }
        };
    }
});
