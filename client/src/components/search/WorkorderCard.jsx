import React from 'react';
import { highlightMatch } from '../../utils/highlight';

/**
 * WorkorderCard component - Rich card view for workorder search results
 * @param {Object} workorder - Workorder data
 * @param {string} query - Search query for highlighting
 * @param {Function} onClick - Callback when card is clicked
 */
const WorkorderCard = ({ workorder, query, onClick }) => {
    const {
        id,
        workorder_number,
        title,
        project_title,
        project_color,
        scheduled_date,
        start_time,
        end_time,
        location,
        status,
        resource_count,
        total_cost,
        created_at,
    } = workorder;

    const handleClick = () => {
        if (onClick) onClick(workorder);
    };

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

    // Format status text
    const formatStatus = (status) => {
        return status ? status.replace(/_/g, ' ') : '';
    };

    return (
        <div className="search-card workorder-card" onClick={handleClick}>
            {/* Project color indicator */}
            {project_color && (
                <div className="card-color-bar" style={{ backgroundColor: project_color }}></div>
            )}

            {/* Card header */}
            <div className="card-header">
                <div className="card-title-row">
                    <span className="workorder-number">#{workorder_number}</span>
                    <h3 className="card-title">
                        {query ? highlightMatch(title || 'Untitled', query) : (title || 'Untitled')}
                    </h3>
                </div>
                {status && (
                    <span className={`badge ${getStatusClass(status)}`}>
                        {formatStatus(status)}
                    </span>
                )}
            </div>

            {/* Card body */}
            <div className="card-body">
                {project_title && (
                    <div className="card-field">
                        <span className="field-label">Project:</span>
                        <span className="field-value">
                            {query ? highlightMatch(project_title, query) : project_title}
                        </span>
                    </div>
                )}

                <div className="card-field-row">
                    {scheduled_date && (
                        <div className="card-field">
                            <span className="field-label">📅 Date:</span>
                            <span className="field-value">{formatDate(scheduled_date)}</span>
                        </div>
                    )}
                    {(start_time || end_time) && (
                        <div className="card-field">
                            <span className="field-label">🕐 Time:</span>
                            <span className="field-value">
                                {formatTime(start_time)} - {formatTime(end_time)}
                            </span>
                        </div>
                    )}
                </div>

                {location && (
                    <div className="card-field">
                        <span className="field-label">📍 Location:</span>
                        <span className="field-value">
                            {query ? highlightMatch(location, query) : location}
                        </span>
                    </div>
                )}

                {total_cost !== null && total_cost !== undefined && (
                    <div className="card-field">
                        <span className="field-label">💰 Cost:</span>
                        <span className="field-value cost-highlight">{formatCurrency(total_cost)}</span>
                    </div>
                )}
            </div>

            {/* Card footer */}
            <div className="card-footer">
                <div className="card-meta">
                    <span className="meta-item">
                        👥 {resource_count || 0} {resource_count === 1 ? 'Resource' : 'Resources'}
                    </span>
                </div>
                <button className="card-action-btn" onClick={(e) => { e.stopPropagation(); handleClick(); }}>
                    Edit →
                </button>
            </div>
        </div>
    );
};

export default WorkorderCard;
