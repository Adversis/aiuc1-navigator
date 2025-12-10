/**
 * AIUC-1 Navigator
 * Interactive reference for the AIUC-1 Enterprise AI Risk Standard
 */

// ============================================
// Data & State
// ============================================

let standardsData = null;
let filteredRequirements = [];
let currentFilters = {
    principle: 'all',
    status: 'all',
    framework: 'all',
    search: ''
};
let currentSort = {
    column: 'id',
    direction: 'asc'
};

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    initializeFilters();
    initializeSearch();
    initializeModal();
    initializeExport();
    initializeKeyboardShortcuts();
    renderRequirements();
    updateStats();
});

async function loadData() {
    try {
        const response = await fetch('data/aiuc-1-standards.json');
        standardsData = await response.json();
        filteredRequirements = [...standardsData.requirements];
    } catch (error) {
        console.error('Error loading data:', error);
        // Fallback: try to load from inline data if available
        showError('Failed to load standards data. Please refresh the page.');
    }
}

// ============================================
// Filtering
// ============================================

function initializeFilters() {
    // Principle buttons
    document.querySelectorAll('.principle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.principle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilters.principle = btn.dataset.principle;
            applyFilters();
        });
    });

    // Status toggles
    document.querySelectorAll('.toggle-btn[data-status]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.toggle-btn[data-status]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilters.status = btn.dataset.status;
            applyFilters();
        });
    });

    // Framework select
    document.getElementById('framework-filter').addEventListener('change', (e) => {
        currentFilters.framework = e.target.value;
        applyFilters();
    });

    // Sortable columns
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = column;
                currentSort.direction = 'asc';
            }
            document.querySelectorAll('.sortable').forEach(t => t.classList.remove('sorted'));
            th.classList.add('sorted');
            applyFilters();
        });
    });
}

function initializeSearch() {
    const searchInput = document.getElementById('search-input');
    let debounceTimer;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentFilters.search = e.target.value.toLowerCase().trim();
            applyFilters();
        }, 200);
    });
}

function applyFilters() {
    if (!standardsData) return;

    filteredRequirements = standardsData.requirements.filter(req => {
        // Principle filter
        if (currentFilters.principle !== 'all' && req.principle !== currentFilters.principle) {
            return false;
        }

        // Status filter
        if (currentFilters.status !== 'all' && req.status !== currentFilters.status) {
            return false;
        }

        // Framework filter
        if (currentFilters.framework !== 'all') {
            const hasFramework = req.frameworkMappings &&
                Object.keys(req.frameworkMappings).some(fw =>
                    fw.toLowerCase().includes(currentFilters.framework.toLowerCase())
                );
            if (!hasFramework) return false;
        }

        // Search filter
        if (currentFilters.search) {
            const searchTerms = currentFilters.search.split(' ').filter(t => t.length > 0);
            const searchableText = [
                req.id,
                req.title,
                req.description,
                req.principleName,
                ...(req.keywords || []),
                ...Object.keys(req.frameworkMappings || {}),
                ...Object.values(req.frameworkMappings || {}).flat()
            ].join(' ').toLowerCase();

            return searchTerms.every(term => searchableText.includes(term));
        }

        return true;
    });

    // Sort
    filteredRequirements.sort((a, b) => {
        let aVal, bVal;

        switch (currentSort.column) {
            case 'id':
                aVal = a.id;
                bVal = b.id;
                break;
            case 'title':
                aVal = a.title.toLowerCase();
                bVal = b.title.toLowerCase();
                break;
            default:
                aVal = a.id;
                bVal = b.id;
        }

        if (currentSort.direction === 'asc') {
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
            return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
    });

    renderRequirements();
    updateStats();
}

// ============================================
// Rendering
// ============================================

function renderRequirements() {
    const tbody = document.getElementById('requirements-body');

    if (filteredRequirements.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="M21 21l-4.35-4.35"/>
                        </svg>
                        <h3 class="empty-state-title">No requirements found</h3>
                        <p class="empty-state-text">Try adjusting your filters or search terms</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredRequirements.map(req => `
        <tr data-id="${req.id}">
            <td>
                <span class="req-id" data-principle="${req.principle}">${req.id}</span>
            </td>
            <td>
                <span class="principle-badge" data-principle="${req.principle}">
                    <span class="dot"></span>
                    ${req.principleName}
                </span>
            </td>
            <td>
                <div class="req-title">${req.title}</div>
                <div class="req-description">${req.description}</div>
            </td>
            <td>
                <span class="status-badge ${req.status.toLowerCase()}">${req.status}</span>
            </td>
            <td>
                <span class="frequency-text">${req.frequency}</span>
            </td>
            <td>
                <div class="framework-tags">
                    ${getFrameworkTags(req.frameworkMappings)}
                </div>
            </td>
        </tr>
    `).join('');

    // Add click handlers for rows
    tbody.querySelectorAll('tr[data-id]').forEach(row => {
        row.addEventListener('click', () => {
            const req = standardsData.requirements.find(r => r.id === row.dataset.id);
            if (req) openModal(req);
        });
    });
}

function getFrameworkTags(mappings) {
    if (!mappings) return '';

    const frameworks = Object.keys(mappings);
    const displayFrameworks = frameworks.slice(0, 3);
    const remaining = frameworks.length - 3;

    let html = displayFrameworks.map(fw => {
        const abbrev = getFrameworkAbbrev(fw);
        return `<span class="framework-tag">${abbrev}</span>`;
    }).join('');

    if (remaining > 0) {
        html += `<span class="framework-tag">+${remaining}</span>`;
    }

    return html;
}

function getFrameworkAbbrev(framework) {
    const abbrevs = {
        'EU AI Act': 'EU',
        'ISO 42001': 'ISO',
        'NIST AI RMF': 'NIST',
        'OWASP Top 10': 'OWASP',
        'MITRE ATLAS': 'MITRE',
        'CSA AICM': 'CSA'
    };
    return abbrevs[framework] || framework;
}

function updateStats() {
    if (!standardsData) return;

    const mandatoryCount = standardsData.requirements.filter(r => r.status === 'Mandatory').length;
    const optionalCount = standardsData.requirements.filter(r => r.status === 'Optional').length;

    animateNumber('mandatory-count', mandatoryCount);
    animateNumber('optional-count', optionalCount);
    animateNumber('filtered-count', filteredRequirements.length);

    // Update principle counts
    ['A', 'B', 'C', 'D', 'E', 'F'].forEach(p => {
        const count = standardsData.requirements.filter(r => r.principle === p).length;
        const el = document.getElementById(`count-${p}`);
        if (el) el.textContent = count;
    });

    const allEl = document.getElementById('count-all');
    if (allEl) allEl.textContent = standardsData.requirements.length;
}

function animateNumber(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const current = parseInt(el.textContent) || 0;
    const duration = 300;
    const start = performance.now();

    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(current + (target - current) * eased);
        el.textContent = value;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// ============================================
// Modal
// ============================================

function initializeModal() {
    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close');

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
}

function openModal(req) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');

    content.innerHTML = `
        <div class="modal-header">
            <div class="modal-id" data-principle="${req.principle}">${req.id} · ${req.principleName}</div>
            <h2 class="modal-title">${req.title}</h2>
            <div class="modal-meta">
                <span class="modal-badge status-badge ${req.status.toLowerCase()}">
                    ${req.status}
                </span>
                <span class="modal-badge">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor">
                        <circle cx="8" cy="8" r="6"/>
                        <path d="M8 4v4l2.5 2.5"/>
                    </svg>
                    ${req.frequency}
                </span>
                <span class="modal-badge">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor">
                        <path d="M8 2v12M2 8h12"/>
                    </svg>
                    ${req.type}
                </span>
            </div>
            <p class="modal-description">${req.description}</p>
        </div>

        ${req.controlActivities ? renderControlActivities(req.controlActivities) : ''}

        ${req.gettingStarted ? renderGettingStarted(req.gettingStarted) : ''}

        ${req.frameworkMappings ? renderFrameworkMappings(req.frameworkMappings) : ''}

        ${req.keywords && req.keywords.length > 0 ? `
            <div class="modal-section">
                <h3 class="modal-section-title">Keywords</h3>
                <div class="keywords-list">
                    ${req.keywords.map(kw => `<span class="keyword-tag">${kw}</span>`).join('')}
                </div>
            </div>
        ` : ''}

        <a href="https://www.aiuc-1.com${req.url}" target="_blank" class="modal-link">
            View on AIUC-1.com
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M5 3H13V11M13 3L3 13" stroke="currentColor" stroke-width="1.5"/>
            </svg>
        </a>
    `;

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

function renderControlActivities(activities) {
    let html = '';

    if (activities.shouldInclude && activities.shouldInclude.length > 0) {
        html += `
            <div class="modal-section">
                <h3 class="modal-section-title">Control Activities - Should Include</h3>
                <ul class="control-list should">
                    ${activities.shouldInclude.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    if (activities.mayInclude && activities.mayInclude.length > 0) {
        html += `
            <div class="modal-section">
                <h3 class="modal-section-title">Control Activities - May Include</h3>
                <ul class="control-list may">
                    ${activities.mayInclude.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    return html;
}

function renderFrameworkMappings(mappings) {
    const frameworks = Object.entries(mappings);
    if (frameworks.length === 0) return '';

    return `
        <div class="modal-section">
            <h3 class="modal-section-title">Framework Mappings</h3>
            <div class="framework-grid">
                ${frameworks.map(([name, refs]) => `
                    <div class="framework-card">
                        <div class="framework-card-title">${name}</div>
                        <div class="framework-card-refs">${Array.isArray(refs) ? refs.join(', ') : refs}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderGettingStarted(gettingStarted) {
    if (!gettingStarted) return '';

    const { overview, steps, tools, template, tip } = gettingStarted;

    let html = `
        <div class="modal-section">
            <div class="getting-started">
                <h3 class="getting-started-title">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M8 1v14M1 8h14" stroke-linecap="round"/>
                        <circle cx="8" cy="8" r="6"/>
                    </svg>
                    Getting Started
                </h3>
    `;

    // Overview
    if (overview) {
        html += `<p class="getting-started-overview">${overview}</p>`;
    }

    // Steps
    if (steps && steps.length > 0) {
        html += `
            <div class="getting-started-steps">
                ${steps.map((step, i) => `
                    <div class="getting-started-step">
                        <span class="step-number">${i + 1}</span>
                        <span class="step-text">${step}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Tools
    if (tools && tools.length > 0) {
        html += `
            <div class="getting-started-tools">
                <div class="tools-label">Potential Tools</div>
                <div class="tools-grid">
                    ${tools.map(tool => `
                        <a href="${tool.url}" target="_blank" class="tool-badge">
                            ${tool.name}
                            <span class="tool-type ${tool.type}">${tool.type}</span>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Template
    if (template && template.columns && template.columns.length > 0) {
        html += `
            <div class="getting-started-template">
                <div class="template-label">Example Template</div>
                ${template.description ? `<p class="template-description">${template.description}</p>` : ''}
                <div class="template-table-wrapper">
                    <table class="template-table">
                        <thead>
                            <tr>
                                ${template.columns.map(col => `<th>${col}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${(template.rows || []).map(row => `
                                <tr>
                                    ${row.map(cell => `<td>${cell}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Tip
    if (tip) {
        html += `
            <div class="getting-started-tip">
                <span class="tip-icon">💡</span>
                <span class="tip-text">${tip}</span>
            </div>
        `;
    }

    html += `
            </div>
        </div>
    `;

    return html;
}

// ============================================
// Export
// ============================================

function initializeExport() {
    document.getElementById('export-csv').addEventListener('click', exportCSV);
}

function exportCSV() {
    if (!filteredRequirements.length) return;

    const headers = ['ID', 'Principle', 'Title', 'Description', 'Status', 'Frequency', 'Type', 'Keywords', 'URL'];
    const rows = filteredRequirements.map(req => [
        req.id,
        req.principleName,
        `"${req.title.replace(/"/g, '""')}"`,
        `"${req.description.replace(/"/g, '""')}"`,
        req.status,
        req.frequency,
        req.type,
        `"${(req.keywords || []).join(', ')}"`,
        `https://www.aiuc-1.com${req.url}`
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `aiuc-1-requirements-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// ============================================
// Keyboard Shortcuts
// ============================================

function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Focus search with /
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            document.getElementById('search-input').focus();
        }

        // Close modal with Escape
        if (e.key === 'Escape') {
            closeModal();
            document.getElementById('search-input').blur();
        }
    });
}

// ============================================
// Error Handling
// ============================================

function showError(message) {
    const tbody = document.getElementById('requirements-body');
    tbody.innerHTML = `
        <tr>
            <td colspan="6">
                <div class="empty-state">
                    <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 8v4M12 16h.01"/>
                    </svg>
                    <h3 class="empty-state-title">Error Loading Data</h3>
                    <p class="empty-state-text">${message}</p>
                </div>
            </td>
        </tr>
    `;
}
