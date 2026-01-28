import React, { useState } from 'react';

/**
 * FilterPanel component - collapsible sidebar with advanced filters
 * @param {Object} filters - Current filter values
 * @param {Function} onFilterChange - Callback when filters change
 * @param {Function} onClearAll - Callback to clear all filters
 * @param {string} activeTab - Current active tab (all, projects, workorders, resources)
 */
const FilterPanel = ({ filters, onFilterChange, onClearAll, activeTab }) => {
    const [expandedSections, setExpandedSections] = useState({
        projects: true,
        workorders: true,
        resources: true,
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    const handleInputChange = (key, value) => {
        onFilterChange(key, value);
    };

    // Count active filters
    const countActiveFilters = () => {
        return Object.values(filters).filter(value =>
            value && value !== '' && value.length !== 0
        ).length;
    };

    const activeFilterCount = countActiveFilters();

    // Determine which sections to show based on active tab
    const showProjects = activeTab === 'all' || activeTab === 'projects';
    const showWorkorders = activeTab === 'all' || activeTab === 'workorders';
    const showResources = activeTab === 'all' || activeTab === 'resources';

    return (
        <div className="filter-panel">
            <div className="filter-header">
                <h3>Filters</h3>
                {activeFilterCount > 0 && (
                    <span className="filter-count-badge">{activeFilterCount}</span>
                )}
                {activeFilterCount > 0 && (
                    <button
                        className="clear-filters-btn"
                        onClick={onClearAll}
                        title="Clear all filters"
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* Project Filters */}
            {showProjects && (
                <div className="filter-section">
                    <button
                        className="filter-section-header"
                        onClick={() => toggleSection('projects')}
                    >
                        <span>Project Filters</span>
                        <span className="toggle-icon">
                            {expandedSections.projects ? '▼' : '▶'}
                        </span>
                    </button>

                    {expandedSections.projects && (
                        <div className="filter-section-content">
                            {/* Status Filter */}
                            <div className="filter-group">
                                <label>Status</label>
                                <select
                                    value={filters.project_status}
                                    onChange={(e) => handleInputChange('project_status', e.target.value)}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="PLANNING">Planning</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="ON_HOLD">On Hold</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>

                            {/* Priority Filter */}
                            <div className="filter-group">
                                <label>Priority</label>
                                <select
                                    value={filters.project_priority}
                                    onChange={(e) => handleInputChange('project_priority', e.target.value)}
                                >
                                    <option value="">All Priorities</option>
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                    <option value="URGENT">Urgent</option>
                                </select>
                            </div>

                            {/* Department Filter */}
                            <div className="filter-group">
                                <label>Department</label>
                                <input
                                    type="text"
                                    placeholder="Enter department..."
                                    value={filters.department}
                                    onChange={(e) => handleInputChange('department', e.target.value)}
                                />
                            </div>

                            {/* Client Name Filter */}
                            <div className="filter-group">
                                <label>Client Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter client name..."
                                    value={filters.client_name}
                                    onChange={(e) => handleInputChange('client_name', e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Workorder Filters */}
            {showWorkorders && (
                <div className="filter-section">
                    <button
                        className="filter-section-header"
                        onClick={() => toggleSection('workorders')}
                    >
                        <span>Workorder Filters</span>
                        <span className="toggle-icon">
                            {expandedSections.workorders ? '▼' : '▶'}
                        </span>
                    </button>

                    {expandedSections.workorders && (
                        <div className="filter-section-content">
                            {/* Date Range */}
                            <div className="filter-group">
                                <label>Date From</label>
                                <input
                                    type="date"
                                    value={filters.date_from}
                                    onChange={(e) => handleInputChange('date_from', e.target.value)}
                                />
                            </div>

                            <div className="filter-group">
                                <label>Date To</label>
                                <input
                                    type="date"
                                    value={filters.date_to}
                                    onChange={(e) => handleInputChange('date_to', e.target.value)}
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="filter-group">
                                <label>Status</label>
                                <select
                                    value={filters.workorder_status}
                                    onChange={(e) => handleInputChange('workorder_status', e.target.value)}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="SCHEDULED">Scheduled</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>

                            {/* Location Filter */}
                            <div className="filter-group">
                                <label>Location</label>
                                <input
                                    type="text"
                                    placeholder="Enter location..."
                                    value={filters.location}
                                    onChange={(e) => handleInputChange('location', e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Resource Filters */}
            {showResources && (
                <div className="filter-section">
                    <button
                        className="filter-section-header"
                        onClick={() => toggleSection('resources')}
                    >
                        <span>Resource Filters</span>
                        <span className="toggle-icon">
                            {expandedSections.resources ? '▼' : '▶'}
                        </span>
                    </button>

                    {expandedSections.resources && (
                        <div className="filter-section-content">
                            {/* Type Filter */}
                            <div className="filter-group">
                                <label>Type</label>
                                <select
                                    value={filters.resource_type}
                                    onChange={(e) => handleInputChange('resource_type', e.target.value)}
                                >
                                    <option value="">All Types</option>
                                    <option value="STAFF">Staff</option>
                                    <option value="FACILITY">Facility</option>
                                    <option value="EQUIPMENT">Equipment</option>
                                </select>
                            </div>

                            {/* Status Filter */}
                            <div className="filter-group">
                                <label>Status</label>
                                <select
                                    value={filters.resource_status}
                                    onChange={(e) => handleInputChange('resource_status', e.target.value)}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                    <option value="MAINTENANCE">Maintenance</option>
                                </select>
                            </div>

                            {/* Pay Type Filter */}
                            <div className="filter-group">
                                <label>Pay Type</label>
                                <select
                                    value={filters.pay_type}
                                    onChange={(e) => handleInputChange('pay_type', e.target.value)}
                                >
                                    <option value="">All Pay Types</option>
                                    <option value="HOURLY">Hourly</option>
                                    <option value="SALARY">Salary</option>
                                    <option value="CONTRACT">Contract</option>
                                </select>
                            </div>

                            {/* Position Group Filter */}
                            <div className="filter-group">
                                <label>Position Group ID</label>
                                <input
                                    type="text"
                                    placeholder="Enter position group ID..."
                                    value={filters.position_group_id}
                                    onChange={(e) => handleInputChange('position_group_id', e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FilterPanel;
