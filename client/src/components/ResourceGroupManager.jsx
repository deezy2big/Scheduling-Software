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
    '#64748B', // Slate
    '#A855F7', // Violet
];

export default function ResourceGroupManager({ isOpen, onClose, onUpdate }) {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        color: '#3B82F6',
        display_order: 0
    });

    useEffect(() => {
        if (isOpen) {
            fetchGroups();
            resetForm();
        }
    }, [isOpen]);

    const fetchGroups = async () => {
        setLoading(true);
        try {
            const data = await api.getResourceGroups();
            setGroups(data);
        } catch (err) {
            console.error('Failed to fetch groups:', err);
            setError('Failed to load groups');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            color: '#3B82F6',
            display_order: 0
        });
        setEditingId(null);
        setError('');
    };

    const handleEdit = (group) => {
        setFormData({
            name: group.name,
            color: group.color || '#3B82F6',
            display_order: group.display_order || 0
        });
        setEditingId(group.id);
        setError('');
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure? This will remove the group but not the resources in it.')) {
            return;
        }
        try {
            await api.deleteResourceGroup(id);
            fetchGroups();
            if (onUpdate) onUpdate();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setLoading(true);
        setError('');

        try {
            if (editingId) {
                await api.updateResourceGroup(editingId, formData);
            } else {
                await api.createResourceGroup(formData);
            }
            await fetchGroups();
            if (onUpdate) onUpdate();
            resetForm();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content group-manager-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Manage Resource Groups</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body">
                    {/* List of existing groups */}
                    <div className="groups-list-container">
                        <h3>Existing Groups</h3>
                        {groups.length === 0 ? (
                            <p className="no-data">No groups found.</p>
                        ) : (
                            <ul className="groups-list">
                                {groups.map(group => (
                                    <li key={group.id} className="group-item" style={{ borderLeftColor: group.color }}>
                                        <div className="group-info">
                                            <span className="group-name">{group.name}</span>
                                            {/* <span className="group-count">0 resources</span> */}
                                        </div>
                                        <div className="group-actions">
                                            <button
                                                className="btn-icon"
                                                onClick={() => handleEdit(group)}
                                                title="Edit"
                                            >
                                                ✎
                                            </button>
                                            <button
                                                className="btn-icon delete"
                                                onClick={() => handleDelete(group.id)}
                                                title="Delete"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Form to add/edit */}
                    <div className="group-form-container">
                        <h3>{editingId ? 'Edit Group' : 'Add New Group'}</h3>
                        <form onSubmit={handleSubmit}>
                            {error && <div className="error-message mb-3">{error}</div>}

                            <div className="form-group mb-3">
                                <label>Group Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Stage 1, Camera Dept"
                                    autoFocus
                                />
                            </div>

                            <div className="form-group mb-3">
                                <label>Color Tag</label>
                                <div className="color-options">
                                    {COLOR_OPTIONS.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            className={`color-circle ${formData.color === c ? 'selected' : ''}`}
                                            style={{ backgroundColor: c }}
                                            onClick={() => setFormData({ ...formData, color: c })}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="form-actions">
                                {editingId && (
                                    <button type="button" className="btn-cancel" onClick={resetForm}>
                                        Cancel Edit
                                    </button>
                                )}
                                <button type="submit" className="btn-submit" disabled={!formData.name.trim() || loading}>
                                    {loading ? 'Saving...' : (editingId ? 'Update Group' : 'Create Group')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <style>{`
                    .group-manager-modal {
                        max-width: 800px;
                        width: 90%;
                        display: flex;
                        flex-direction: column;
                        max-height: 85vh;
                    }
                    .modal-body {
                        display: flex;
                        gap: 2rem;
                        padding: 1rem 0;
                        overflow: hidden;
                    }
                    .groups-list-container {
                        flex: 1;
                        border-right: 1px solid rgba(148, 163, 184, 0.1);
                        padding-right: 2rem;
                        overflow-y: auto;
                        min-height: 300px;
                    }
                    .group-form-container {
                        flex: 0 0 300px;
                    }
                    .groups-list {
                        list-style: none;
                        padding: 0;
                        margin: 0;
                    }
                    .group-item {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: rgba(30, 41, 59, 0.4);
                        border: 1px solid rgba(148, 163, 184, 0.1);
                        border-left-width: 4px;
                        padding: 0.75rem;
                        margin-bottom: 0.5rem;
                        border-radius: 4px;
                    }
                    .group-name {
                        font-weight: 500;
                        color: #f1f5f9;
                    }
                    .group-actions {
                        display: flex;
                        gap: 0.5rem;
                    }
                    .btn-icon {
                        background: transparent;
                        border: none;
                        color: #94a3b8;
                        cursor: pointer;
                        padding: 4px;
                        border-radius: 4px;
                    }
                    .btn-icon:hover {
                        background: rgba(255, 255, 255, 0.1);
                        color: #fff;
                    }
                    .btn-icon.delete:hover {
                        background: rgba(239, 68, 68, 0.2);
                        color: #ef4444;
                    }
                    .color-options {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 0.5rem;
                        margin-top: 0.5rem;
                    }
                    .color-circle {
                        width: 24px;
                        height: 24px;
                        border-radius: 50%;
                        border: 2px solid transparent;
                        cursor: pointer;
                        transition: transform 0.2s;
                    }
                    .color-circle:hover {
                        transform: scale(1.1);
                    }
                    .color-circle.selected {
                        border-color: white;
                        box-shadow: 0 0 0 2px rgba(30, 41, 59, 0.8);
                    }
                    .form-actions {
                        display: flex;
                        justify-content: flex-end;
                        gap: 0.5rem;
                        margin-top: 1.5rem;
                    }
                    .no-data {
                        color: #64748b;
                        font-style: italic;
                    }
                    h3 {
                        font-size: 1rem;
                        color: #94a3b8;
                        margin-bottom: 1rem;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                    }
                `}</style>
            </div>
        </div>
    );
}
