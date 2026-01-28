import React from 'react';
import { highlightMatch } from '../../utils/highlight';

/**
 * ProjectCard component - Rich card view for project search results
 * @param {Object} project - Project data
 * @param {string} query - Search query for highlighting
 * @param {Function} onClick - Callback when card is clicked
 */
const ProjectCard = ({ project, query, onClick }) => {
    const {
        id,
        color,
        title,
        client_name,
        job_code,
        bid_number,
        po_number,
        status,
        priority,
        department,
        workorder_count,
        created_at,
    } = project;

    const handleClick = () => {
        if (onClick) onClick(project);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    // Get status badge class
    const getStatusClass = (status) => {
        const statusMap = {
            'PLANNING': 'status-planning',
            'APPROVED': 'status-approved',
            'IN_PROGRESS': 'status-in-progress',
            'ON_HOLD': 'status-on-hold',
            'COMPLETED': 'status-completed',
            'CANCELLED': 'status-cancelled',
        };
        return statusMap[status] || 'status-default';
    };

    // Get priority badge class
    const getPriorityClass = (priority) => {
        const priorityMap = {
            'LOW': 'priority-low',
            'MEDIUM': 'priority-medium',
            'HIGH': 'priority-high',
            'URGENT': 'priority-urgent',
        };
        return priorityMap[priority] || 'priority-default';
    };

    // Format status text
    const formatStatus = (status) => {
        return status ? status.replace(/_/g, ' ') : '';
    };

    return (
        <div className="search-card project-card" onClick={handleClick}>
            {/* Color indicator */}
            <div className="card-color-bar" style={{ backgroundColor: color || '#999' }}></div>

            {/* Card header */}
            <div className="card-header">
                <h3 className="card-title">
                    {query ? highlightMatch(title || 'Untitled', query) : (title || 'Untitled')}
                </h3>
                <div className="card-badges">
                    {status && (
                        <span className={`badge ${getStatusClass(status)}`}>
                            {formatStatus(status)}
                        </span>
                    )}
                    {priority && (
                        <span className={`badge ${getPriorityClass(priority)}`}>
                            {priority}
                        </span>
                    )}
                </div>
            </div>

            {/* Card body */}
            <div className="card-body">
                {client_name && (
                    <div className="card-field">
                        <span className="field-label">Client:</span>
                        <span className="field-value">
                            {query ? highlightMatch(client_name, query) : client_name}
                        </span>
                    </div>
                )}

                {job_code && (
                    <div className="card-field">
                        <span className="field-label">Job Code:</span>
                        <span className="field-value">
                            {query ? highlightMatch(job_code, query) : job_code}
                        </span>
                    </div>
                )}

                <div className="card-field-row">
                    {bid_number && (
                        <div className="card-field">
                            <span className="field-label">Bid #:</span>
                            <span className="field-value">{bid_number}</span>
                        </div>
                    )}
                    {po_number && (
                        <div className="card-field">
                            <span className="field-label">PO #:</span>
                            <span className="field-value">{po_number}</span>
                        </div>
                    )}
                </div>

                {department && (
                    <div className="card-field">
                        <span className="field-label">Department:</span>
                        <span className="field-value">{department}</span>
                    </div>
                )}
            </div>

            {/* Card footer */}
            <div className="card-footer">
                <div className="card-meta">
                    <span className="meta-item">
                        📋 {workorder_count || 0} {workorder_count === 1 ? 'Workorder' : 'Workorders'}
                    </span>
                    <span className="meta-item">
                        📅 {formatDate(created_at)}
                    </span>
                </div>
                <button className="card-action-btn" onClick={(e) => { e.stopPropagation(); handleClick(); }}>
                    Edit →
                </button>
            </div>
        </div>
    );
};

export default ProjectCard;
