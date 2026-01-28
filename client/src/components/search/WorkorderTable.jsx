import React from 'react';
import { highlightMatch } from '../../utils/highlight';

/**
 * WorkorderTable component - Table view for workorder search results
 * @param {Array} workorders - Array of workorder data
 * @param {string} query - Search query for highlighting
 * @param {Function} onRowClick - Callback when row is clicked
 */
const WorkorderTable = ({ workorders, query, onRowClick }) => {
    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    // Format time
    const formatTime = (timeString) => {
        if (!timeString) return '';
        return timeString.substring(0, 5); // HH:MM
    };

    // Format currency
    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    // Format status text
    const formatStatus = (status) => {
        return status ? status.replace(/_/g, ' ') : '';
    };

    // Get status badge class
    const getStatusClass = (status) => {
        const statusMap = {
            'SCHEDULED': 'status-scheduled',
            'IN_PROGRESS': 'status-in-progress',
            'COMPLETED': 'status-completed',
            'CANCELLED': 'status-cancelled',
        };
        return statusMap[status] || 'status-default';
    };

    const handleRowClick = (workorder) => {
        if (onRowClick) onRowClick(workorder);
    };

    if (!workorders || workorders.length === 0) {
        return <div className="table-empty">No workorders found</div>;
    }

    return (
        <div className="search-table-container">
            <table className="search-table workorder-table">
                <thead>
                    <tr>
                        <th className="col-wo-number">WO #</th>
                        <th className="col-title">Title</th>
                        <th className="col-project">Project</th>
                        <th className="col-date">Date</th>
                        <th className="col-time">Time</th>
                        <th className="col-location">Location</th>
                        <th className="col-resources">Resources</th>
                        <th className="col-cost">Cost</th>
                        <th className="col-status">Status</th>
                        <th className="col-actions">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {workorders.map((workorder) => (
                        <tr
                            key={workorder.id}
                            className="table-row"
                            onClick={() => handleRowClick(workorder)}
                        >
                            <td className="col-wo-number">
                                <span className="wo-number">#{workorder.workorder_number}</span>
                            </td>
                            <td className="col-title">
                                {query ? highlightMatch(workorder.title || 'Untitled', query) : (workorder.title || 'Untitled')}
                            </td>
                            <td className="col-project">
                                <div className="project-cell">
                                    {workorder.project_color && (
                                        <div
                                            className="color-indicator"
                                            style={{ backgroundColor: workorder.project_color }}
                                        ></div>
                                    )}
                                    <span>
                                        {query && workorder.project_title
                                            ? highlightMatch(workorder.project_title, query)
                                            : (workorder.project_title || 'N/A')}
                                    </span>
                                </div>
                            </td>
                            <td className="col-date">{formatDate(workorder.scheduled_date)}</td>
                            <td className="col-time">
                                {formatTime(workorder.start_time)} - {formatTime(workorder.end_time)}
                            </td>
                            <td className="col-location">
                                {query && workorder.location
                                    ? highlightMatch(workorder.location, query)
                                    : (workorder.location || 'N/A')}
                            </td>
                            <td className="col-resources">{workorder.resource_count || 0}</td>
                            <td className="col-cost">
                                <span className="cost-value">{formatCurrency(workorder.total_cost)}</span>
                            </td>
                            <td className="col-status">
                                {workorder.status && (
                                    <span className={`badge ${getStatusClass(workorder.status)}`}>
                                        {formatStatus(workorder.status)}
                                    </span>
                                )}
                            </td>
                            <td className="col-actions">
                                <button
                                    className="table-action-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRowClick(workorder);
                                    }}
                                >
                                    Edit
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default WorkorderTable;
