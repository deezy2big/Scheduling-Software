import React, { useState, useEffect } from 'react';
import api from '../api';

const COLOR_OPTIONS = [
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#22C55E', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
];

export function ProjectModal({ isOpen, onClose, project, onSave, onDelete }) {
    const [formData, setFormData] = useState({
        title: '',
        client_name: '',
        department: '',
        priority: 'NORMAL',
        status: 'PENDING',
        notes: '',
        color: '#3B82F6',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (project) {
            setFormData({
                title: project.title || '',
                client_name: project.client_name || '',
                department: project.department || '',
                priority: project.priority || 'NORMAL',
                status: project.status || 'PENDING',
                notes: project.notes || '',
                color: project.color || '#3B82F6',
            });
        } else {
            setFormData({
                title: '',
                client_name: '',
                department: '',
                priority: 'NORMAL',
                status: 'PENDING',
                notes: '',
                color: '#3B82F6',
            });
        }
        setError('');
    }, [project, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title) {
            setError('Project title is required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            if (project?.id) {
                await api.updateProject(project.id, formData);
            } else {
                await api.createProject(formData);
            }
            onSave();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!project || !confirm('Are you sure you want to delete this project? All workorders will also be deleted.')) return;

        setLoading(true);
        try {
            await api.deleteProject(project.id);
            onDelete?.();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>

                <h2>{project ? 'Edit Project' : 'New Project'}</h2>
                <p className="modal-subtitle">
                    Projects are containers for workorders. Create a project first, then add workorders with resource assignments.
                </p>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="error-message">{error}</div>
                    )}

                    {/* Project Details */}
                    <div className="form-row">
                        <div className="form-group" style={{ flex: 2 }}>
                            <label>Project Title *</label>
                            <input
                                type="text"
                                placeholder="e.g., Netflix - Stranger Things S5"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Client Name</label>
                            <input
                                type="text"
                                placeholder="e.g., Netflix"
                                value={formData.client_name}
                                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Department</label>
                            <input
                                type="text"
                                placeholder="e.g., Production"
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Priority</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            >
                                <option value="LOW">Low</option>
                                <option value="NORMAL">Normal</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="PENDING">Pending</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Color</label>
                        <div className="color-options">
                            {COLOR_OPTIONS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    className={`color-btn ${formData.color === color ? 'selected' : ''}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => setFormData({ ...formData, color })}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Notes</label>
                        <textarea
                            rows={3}
                            placeholder="Optional project notes..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    {/* Workorders Info (if editing) */}
                    {project?.workorders && project.workorders.length > 0 && (
                        <div className="workorders-info">
                            <h4>Workorders ({project.workorders.length})</h4>
                            <div className="workorders-list">
                                {project.workorders.map(wo => (
                                    <div key={wo.id} className="workorder-item">
                                        <span className="wo-title">{wo.title}</span>
                                        <span className="wo-status">{wo.status}</span>
                                        <span className="wo-cost">${wo.total_cost?.toFixed(2) || '0.00'}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="project-total">
                                <strong>Total Project Cost:</strong> ${project.total_cost?.toFixed(2) || '0.00'}
                            </div>
                        </div>
                    )}

                    <div className="modal-actions">
                        {project && (
                            <button
                                type="button"
                                className="btn-delete"
                                onClick={handleDelete}
                                disabled={loading}
                            >
                                Delete
                            </button>
                        )}
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
                        </button>
                    </div>
                </form>

                <style>{`
                    .modal-subtitle {
                        color: #64748b;
                        font-size: 0.875rem;
                        margin-bottom: 1.5rem;
                    }

                    .form-row {
                        display: flex;
                        gap: 1rem;
                        margin-bottom: 1rem;
                    }

                    .form-group {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                    }

                    .form-group label {
                        font-size: 0.875rem;
                        color: #94a3b8;
                    }

                    .form-group input,
                    .form-group select,
                    .form-group textarea {
                        background: rgba(30, 41, 59, 0.8);
                        border: 1px solid rgba(148, 163, 184, 0.2);
                        border-radius: 8px;
                        padding: 0.75rem;
                        color: #f1f5f9;
                        font-size: 0.9rem;
                    }

                    .form-group input:focus,
                    .form-group select:focus,
                    .form-group textarea:focus {
                        outline: none;
                        border-color: #3b82f6;
                    }

                    .color-options {
                        display: flex;
                        gap: 0.5rem;
                    }

                    .color-btn {
                        width: 28px;
                        height: 28px;
                        border-radius: 6px;
                        border: 2px solid transparent;
                        cursor: pointer;
                        transition: all 0.15s;
                    }

                    .color-btn.selected {
                        border-color: white;
                        transform: scale(1.1);
                    }

                    .workorders-info {
                        background: rgba(15, 23, 42, 0.5);
                        border-radius: 8px;
                        padding: 1rem;
                        margin: 1rem 0;
                    }

                    .workorders-info h4 {
                        margin: 0 0 0.75rem 0;
                        font-size: 0.875rem;
                        color: #94a3b8;
                    }

                    .workorders-list {
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                    }

                    .workorder-item {
                        display: flex;
                        align-items: center;
                        gap: 1rem;
                        padding: 0.5rem;
                        background: rgba(30, 41, 59, 0.5);
                        border-radius: 6px;
                    }

                    .wo-title {
                        flex: 1;
                        color: #e2e8f0;
                    }

                    .wo-status {
                        font-size: 0.75rem;
                        padding: 0.25rem 0.5rem;
                        background: rgba(59, 130, 246, 0.2);
                        color: #93c5fd;
                        border-radius: 4px;
                    }

                    .wo-cost {
                        font-weight: 600;
                        color: #22c55e;
                    }

                    .project-total {
                        margin-top: 0.75rem;
                        padding-top: 0.75rem;
                        border-top: 1px solid rgba(148, 163, 184, 0.2);
                        text-align: right;
                        color: #22c55e;
                        font-size: 1.1rem;
                    }

                    .modal-actions {
                        display: flex;
                        gap: 1rem;
                        margin-top: 1.5rem;
                        justify-content: flex-end;
                    }

                    .btn-delete {
                        background: transparent;
                        color: #ef4444;
                        border: 1px solid #ef4444;
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        cursor: pointer;
                        margin-right: auto;
                    }

                    .btn-cancel {
                        background: transparent;
                        color: #94a3b8;
                        border: 1px solid rgba(148, 163, 184, 0.3);
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        cursor: pointer;
                    }

                    .btn-submit {
                        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                        color: white;
                        border: none;
                        padding: 0.75rem 2rem;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                    }

                    .btn-submit:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }

                    .error-message {
                        background: rgba(239, 68, 68, 0.2);
                        border: 1px solid #ef4444;
                        color: #fca5a5;
                        padding: 0.75rem;
                        border-radius: 8px;
                        margin-bottom: 1rem;
                    }
                `}</style>
            </div>
        </div>
    );
}

export default ProjectModal;
