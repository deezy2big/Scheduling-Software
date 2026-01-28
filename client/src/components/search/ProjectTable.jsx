import React from 'react';
import { highlightMatch } from '../../utils/highlight';

/**
 * ProjectTable component - Table view for project search results
 * @param {Array} projects - Array of project data
 * @param {string} query - Search query for highlighting
 * @param {Function} onRowClick - Callback when row is clicked
 */
const ProjectTable = ({ projects, query, onRowClick }) => {
    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    // Format status text
    const formatStatus = (status) => {
        return status ? status.replace(/_/g, ' ') : '';
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

    const handleRowClick = (project) => {
        if (onRowClick) onRowClick(project);
    };

    if (!projects || projects.length === 0) {
        return <div className="table-empty">No projects found</div>;
    }

    return (
        <div className="search-table-container">
            <table className="search-table project-table">
                <thead>
                    <tr>
                        <th className="col-color"></th>
                        <th className="col-title">Title</th>
                        <th className="col-client">Client</th>
                        <th className="col-job-code">Job Code</th>
                        <th className="col-bid">Bid #</th>
                        <th className="col-po">PO #</th>
                        <th className="col-status">Status</th>
                        <th className="col-priority">Priority</th>
                        <th className="col-department">Department</th>
                        <th className="col-workorders">WOs</th>
                        <th className="col-actions">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {projects.map((project) => (
                        <tr
                            key={project.id}
                            className="table-row"
                            onClick={() => handleRowClick(project)}
                        >
                            <td className="col-color">
                                <div
                                    className="color-indicator"
                                    style={{ backgroundColor: project.color || '#999' }}
                                ></div>
                            </td>
                            <td className="col-title">
                                {query ? highlightMatch(project.title || 'Untitled', query) : (project.title || 'Untitled')}
                            </td>
                            <td className="col-client">
                                {query && project.client_name ? highlightMatch(project.client_name, query) : (project.client_name || 'N/A')}
                            </td>
                            <td className="col-job-code">
                                {query && project.job_code ? highlightMatch(project.job_code, query) : (project.job_code || 'N/A')}
                            </td>
                            <td className="col-bid">{project.bid_number || 'N/A'}</td>
                            <td className="col-po">{project.po_number || 'N/A'}</td>
                            <td className="col-status">
                                {project.status && (
                                    <span className={`badge ${getStatusClass(project.status)}`}>
                                        {formatStatus(project.status)}
                                    </span>
                                )}
                            </td>
                            <td className="col-priority">
                                {project.priority && (
                                    <span className={`badge ${getPriorityClass(project.priority)}`}>
                                        {project.priority}
                                    </span>
                                )}
                            </td>
                            <td className="col-department">{project.department || 'N/A'}</td>
                            <td className="col-workorders">{project.workorder_count || 0}</td>
                            <td className="col-actions">
                                <button
                                    className="table-action-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRowClick(project);
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

export default ProjectTable;
