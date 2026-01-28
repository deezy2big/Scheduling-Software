import React from 'react';
import { highlightMatch } from '../../utils/highlight';

/**
 * ResourceTable component - Table view for resource search results
 * @param {Array} resources - Array of resource data
 * @param {string} query - Search query for highlighting
 * @param {Function} onRowClick - Callback when row is clicked
 */
const ResourceTable = ({ resources, query, onRowClick }) => {
    // Get type icon
    const getTypeIcon = (type) => {
        const typeMap = {
            'STAFF': '👤',
            'FACILITY': '🏢',
            'EQUIPMENT': '🔧',
        };
        return typeMap[type] || '📦';
    };

    // Get type badge class
    const getTypeClass = (type) => {
        const typeMap = {
            'STAFF': 'type-staff',
            'FACILITY': 'type-facility',
            'EQUIPMENT': 'type-equipment',
        };
        return typeMap[type] || 'type-default';
    };

    // Get status badge class
    const getStatusClass = (status) => {
        const statusMap = {
            'ACTIVE': 'status-active',
            'INACTIVE': 'status-inactive',
            'MAINTENANCE': 'status-maintenance',
        };
        return statusMap[status] || 'status-default';
    };

    const handleRowClick = (resource) => {
        if (onRowClick) onRowClick(resource);
    };

    if (!resources || resources.length === 0) {
        return <div className="table-empty">No resources found</div>;
    }

    return (
        <div className="search-table-container">
            <table className="search-table resource-table">
                <thead>
                    <tr>
                        <th className="col-color"></th>
                        <th className="col-name">Name</th>
                        <th className="col-type">Type</th>
                        <th className="col-email">Email</th>
                        <th className="col-phone">Phone</th>
                        <th className="col-positions">Positions</th>
                        <th className="col-pay-type">Pay Type</th>
                        <th className="col-status">Status</th>
                        <th className="col-actions">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {resources.map((resource) => (
                        <tr
                            key={resource.id}
                            className="table-row"
                            onClick={() => handleRowClick(resource)}
                        >
                            <td className="col-color">
                                <div
                                    className="color-indicator"
                                    style={{ backgroundColor: resource.color || '#999' }}
                                ></div>
                            </td>
                            <td className="col-name">
                                <div className="name-cell">
                                    <span className="type-icon">{getTypeIcon(resource.type)}</span>
                                    <span className="name-text">
                                        {query ? highlightMatch(resource.name || 'Unnamed', query) : (resource.name || 'Unnamed')}
                                    </span>
                                </div>
                            </td>
                            <td className="col-type">
                                {resource.type && (
                                    <span className={`badge ${getTypeClass(resource.type)}`}>
                                        {resource.type}
                                    </span>
                                )}
                            </td>
                            <td className="col-email">
                                {query && resource.email
                                    ? highlightMatch(resource.email, query)
                                    : (resource.email || 'N/A')}
                            </td>
                            <td className="col-phone">{resource.phone || 'N/A'}</td>
                            <td className="col-positions">
                                {resource.position_groups && resource.position_groups.length > 0 ? (
                                    <div className="position-tags-inline">
                                        {resource.position_groups.map((group, index) => (
                                            <span key={index} className="position-tag-small">
                                                {group}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    'N/A'
                                )}
                            </td>
                            <td className="col-pay-type">{resource.pay_type || 'N/A'}</td>
                            <td className="col-status">
                                {resource.status && (
                                    <span className={`badge ${getStatusClass(resource.status)}`}>
                                        {resource.status}
                                    </span>
                                )}
                            </td>
                            <td className="col-actions">
                                <button
                                    className="table-action-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRowClick(resource);
                                    }}
                                >
                                    View
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ResourceTable;
