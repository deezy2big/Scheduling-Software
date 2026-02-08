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

import DraggableModal from './DraggableModal';

export function ProjectModal({ isOpen, onClose, project, onSave, onDelete }) {
    const [formData, setFormData] = useState({
        title: '',
        client_name: '',
        department: '',
        job_code: '',
        priority: 'NORMAL',
        status: 'PENDING',
        notes: '',
        color: '#3B82F6',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isDirty, setIsDirty] = useState(false);

    // Initial data for dirty checking
    const [initialData, setInitialData] = useState(null);

    useEffect(() => {
        const newData = project ? {
            title: project.title || '',
            client_name: project.client_name || '',
            department: project.department || '',
            job_code: project.job_code || '',
            priority: project.priority || 'NORMAL',
            status: project.status || 'PENDING',
            notes: project.notes || '',
            color: project.color || '#3B82F6',
        } : {
            title: '',
            client_name: '',
            department: '',
            job_code: '',
            priority: 'NORMAL',
            status: 'PENDING',
            notes: '',
            color: '#3B82F6',
        };

        setFormData(newData);
        setInitialData(newData);
        setIsDirty(false);
        setError('');
    }, [project, isOpen]);

    // Check for changes
    useEffect(() => {
        if (!initialData) return;
        const isChanged = JSON.stringify(formData) !== JSON.stringify(initialData);
        setIsDirty(isChanged);
    }, [formData, initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title) {
            setError('Project title is required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let savedProject;
            if (project?.id) {
                savedProject = await api.updateProject(project.id, formData);
            } else {
                savedProject = await api.createProject(formData);
            }
            setIsDirty(false); // Clear dirty state on success
            // Pass the new/updated project ID to onSave for auto-redirect
            onSave(savedProject?.id || savedProject?.project?.id);
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

    return (
        <DraggableModal
            isOpen={isOpen}
            onClose={onClose}
            title={project ? 'Edit Project' : 'New Project'}
            hasUnsavedChanges={isDirty}
            initialSize={{ width: 850, height: 700 }}
        >
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
                        <label>Job Code</label>
                        <input
                            type="text"
                            placeholder="e.g., 2026-X01"
                            value={formData.job_code}
                            onChange={(e) => setFormData({ ...formData, job_code: e.target.value })}
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
                /* --- GLOBAL FORM STYLES --- */
                label {
                    display: block;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #94a3b8;
                    margin-bottom: 0.5rem;
                }

                input, select, textarea {
                    width: 100%;
                    background: #0f172a; /* Slate 900 */
                    border: 1px solid #334155; /* Slate 700 */
                    border-radius: 6px;
                    padding: 0.75rem 1rem;
                    color: #f8fafc; /* Slate 50 */
                    font-size: 0.9rem;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }

                input::placeholder, textarea::placeholder {
                    color: #475569;
                }

                input:focus, select:focus, textarea:focus {
                    outline: none;
                    border-color: #3b82f6; /* Blue 500 */
                    box-shadow: 0 0 0 1px #3b82f6;
                }

                .modal-subtitle {
                    color: #94a3b8;
                    font-size: 0.9rem;
                    margin-bottom: 1.5rem;
                    line-height: 1.5;
                }

                .form-row {
                    display: flex;
                    gap: 1.5rem;
                    margin-bottom: 1.5rem;
                }

                .form-group {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .color-options {
                    display: flex;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                }

                .color-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    border: 2px solid transparent;
                    cursor: pointer;
                    transition: all 0.2s;
                    position: relative;
                }
                
                .color-btn:hover {
                    transform: scale(1.1);
                }

                .color-btn.selected {
                    border-color: white;
                    box-shadow: 0 0 0 2px #3b82f6;
                    transform: scale(1.1);
                }

                .workorders-info {
                    background: rgba(15, 23, 42, 0.3);
                    border: 1px solid rgba(148, 163, 184, 0.1);
                    border-radius: 8px;
                    padding: 1rem;
                    margin: 1.5rem 0;
                }

                .workorders-info h4 {
                    margin: 0 0 1rem 0;
                    font-size: 0.9rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #cbd5e1;
                }

                .workorders-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    max-height: 200px;
                    overflow-y: auto;
                    padding-right: 0.5rem;
                }

                .workorder-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 0.75rem;
                    background: #1e293b;
                    border: 1px solid #334155;
                    border-radius: 6px;
                }

                .wo-title {
                    flex: 1;
                    color: #f1f5f9;
                    font-size: 0.9rem;
                }

                .wo-status {
                    font-size: 0.7rem;
                    font-weight: 600;
                    padding: 0.2rem 0.6rem;
                    background: rgba(59, 130, 246, 0.1);
                    color: #60a5fa;
                    border-radius: 4px;
                    text-transform: uppercase;
                }

                .wo-cost {
                    font-weight: 600;
                    color: #22c55e;
                    font-family: monospace;
                    font-size: 0.95rem;
                }

                .project-total {
                    margin-top: 1rem;
                    padding-top: 1rem;
                    border-top: 1px solid rgba(148, 163, 184, 0.2);
                    text-align: right;
                    color: #4ade80;
                    font-size: 1.1rem;
                    font-weight: 600;
                }

                .modal-actions {
                    display: flex;
                    gap: 1rem;
                    margin-top: 2rem;
                    justify-content: flex-end;
                    padding-top: 1rem;
                    border-top: 1px solid rgba(148, 163, 184, 0.1);
                }

                .btn-delete {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    padding: 0.6rem 1.25rem;
                    border-radius: 6px;
                    cursor: pointer;
                    margin-right: auto;
                    font-weight: 500;
                    transition: all 0.2s;
                }
                .btn-delete:hover {
                    background: rgba(239, 68, 68, 0.2);
                    border-color: #ef4444;
                }

                .btn-cancel {
                    background: transparent;
                    color: #94a3b8;
                    border: 1px solid #475569;
                    padding: 0.6rem 1.25rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                }
                .btn-cancel:hover {
                    border-color: #cbd5e1;
                    color: #f1f5f9;
                }

                .btn-submit {
                    background: #3b82f6;
                    color: white;
                    border: 1px solid #2563eb;
                    padding: 0.6rem 2rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    transition: all 0.2s;
                }
                .btn-submit:hover {
                    background: #2563eb;
                    transform: translateY(-1px);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
                }

                .btn-submit:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }

                .error-message {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    color: #fca5a5;
                    padding: 1rem;
                    border-radius: 8px;
                    margin-bottom: 1.5rem;
                    font-size: 0.9rem;
                }
            `}</style>
        </DraggableModal>
    );
}

export default ProjectModal;
