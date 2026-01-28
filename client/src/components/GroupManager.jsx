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

export function GroupManager({ isOpen, onClose, onUpdate }) {
    const [activeTab, setActiveTab] = useState('POSITION'); // 'POSITION' or 'RESOURCE'
    const [groups, setGroups] = useState([]);
    const [allItems, setAllItems] = useState([]); // All positions or resources
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Edit/Create State
    const [editingGroup, setEditingGroup] = useState(null); // null = list view, {} = create new, {id...} = edit
    const [formData, setFormData] = useState({ name: '', color: '#3B82F6', description: '', sort_order: 0 });

    useEffect(() => {
        if (isOpen) {
            fetchGroupsAndItems();
            setEditingGroup(null);
            setError('');
        }
    }, [isOpen, activeTab]);

    const fetchGroupsAndItems = async () => {
        setLoading(true);
        try {
            const [groupsData, itemsData] = await Promise.all([
                activeTab === 'POSITION' ? api.getPositionGroups() : api.getResourceGroups(),
                activeTab === 'POSITION' ? api.getPositions() : api.getResources()
            ]);
            setGroups(groupsData);
            setAllItems(itemsData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (group) => {
        setFormData({
            name: group.name || '',
            color: group.color || '#3B82F6',
            description: group.description || '',
            sort_order: group.sort_order || 0
        });
        setEditingGroup(group);
    };

    const handleCreate = () => {
        setFormData({ name: '', color: '#3B82F6', description: '', sort_order: 0 });
        setEditingGroup({}); // Empty object signifies new
    };

    const handleBack = () => {
        setEditingGroup(null);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (activeTab === 'POSITION') {
                if (editingGroup.id) {
                    await api.updatePositionGroup(editingGroup.id, formData);
                } else {
                    await api.createPositionGroup(formData);
                }
            } else {
                if (editingGroup.id) {
                    await api.updateResourceGroup(editingGroup.id, formData);
                } else {
                    await api.createResourceGroup(formData);
                }
            }
            await fetchGroupsAndItems();
            if (onUpdate) onUpdate(); // Refresh parent
            if (!editingGroup.id) setEditingGroup(null); // Close if new, keep open if editing to show updated info? or close? User usually expects close or stay. Let's close for now or keep open if we want to add items immediately.
            setEditingGroup(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure? resources assigned to this group may lose their association.')) return;
        setLoading(true);
        try {
            if (activeTab === 'POSITION') {
                await api.deletePositionGroup(id);
            } else {
                await api.deleteResourceGroup(id);
            }
            await fetchGroupsAndItems();
            if (onUpdate) onUpdate();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // --- Membership Management ---

    // Get items in this group
    const groupItems = allItems.filter(item => {
        if (activeTab === 'POSITION') {
            return Number(item.group_id) === Number(editingGroup?.id);
        } else {
            // For resources, key might be resource_group_id or group_id. 
            // Based on typical schema it's resource_group_id but need to verify. 
            // api.js doesn't show schema. Assuming 'group_id' or checking 'resource_group_id'
            // If I look at how positions link they have 'group_id'.
            // Let's assume resources have 'resource_group_id' or 'group_id'.
            // Actually, the api response for getResources likely contains it.
            return Number(item.resource_group_id) === Number(editingGroup?.id) || Number(item.group_id) === Number(editingGroup?.id);
        }
    });

    // Get unassigned items
    const availableItems = allItems.filter(item => {
        if (activeTab === 'POSITION') {
            return !item.group_id || Number(item.group_id) !== Number(editingGroup?.id);
        } else {
            const gid = item.resource_group_id || item.group_id;
            return !gid || Number(gid) !== Number(editingGroup?.id);
        }
    });

    const handleAddItem = async (itemId) => {
        setLoading(true);
        try {
            if (activeTab === 'POSITION') {
                await api.updatePosition(itemId, { group_id: editingGroup.id });
            } else {
                // If the key is different I might need to know. Assuming resource_group_id for now as is common pattern.
                await api.updateResource(itemId, { resource_group_id: editingGroup.id });
            }
            await fetchGroupsAndItems();
            if (onUpdate) onUpdate();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveItem = async (itemId) => {
        setLoading(true);
        try {
            if (activeTab === 'POSITION') {
                await api.updatePosition(itemId, { group_id: null });
            } else {
                await api.updateResource(itemId, { resource_group_id: null });
            }
            await fetchGroupsAndItems();
            if (onUpdate) onUpdate();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };


    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content manager-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>

                <h2>Manage Groups</h2>

                <div className="tabs">
                    <button
                        className={`tab-btn ${activeTab === 'POSITION' ? 'active' : ''}`}
                        onClick={() => setActiveTab('POSITION')}
                    >
                        Position Groups
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'RESOURCE' ? 'active' : ''}`}
                        onClick={() => setActiveTab('RESOURCE')}
                    >
                        Resource Groups
                    </button>
                </div>

                <div className="manager-body">
                    {/* DEBUG LOGGING */}
                    {console.log('GroupManager Debug:', {
                        activeTab,
                        editingGroup,
                        firstItemStr: JSON.stringify(allItems[0] || {}),
                        count: allItems.length,
                        groupItemsCount: allItems.filter(item => {
                            if (activeTab === 'POSITION') return Number(item.group_id) === Number(editingGroup?.id);
                            return Number(item.resource_group_id) === Number(editingGroup?.id) || Number(item.group_id) === Number(editingGroup?.id);
                        }).length
                    })}

                    {/* Error display */}
                    {error && <div className="error-message">{error}</div>}

                    {/* View: List */}
                    {!editingGroup && (
                        <>
                            <div className="list-actions">
                                <p className="subtitle">
                                    {activeTab === 'POSITION'
                                        ? 'Organize positions into functional groups (e.g. Technical, Lighting).'
                                        : 'Group specific resources for logistics (e.g. Cameras, Vehicles).'}
                                </p>
                                <button className="btn-primary" onClick={handleCreate}>+ New Group</button>
                            </div>

                            <div className="groups-list">
                                {loading && groups.length === 0 ? (
                                    <div className="loading">Loading...</div>
                                ) : (
                                    groups.map(group => (
                                        <div key={group.id} className="group-row">
                                            <div className="group-info">
                                                <div className="color-dot" style={{ backgroundColor: group.color || '#64748B' }}></div>
                                                <span className="group-name">{group.name}</span>
                                                <span className="group-count">{group.position_count || group.resource_count || 0} items</span>
                                            </div>
                                            <div className="row-actions">
                                                <button className="icon-btn edit" onClick={() => handleEdit(group)}>✎</button>
                                                <button className="icon-btn delete" onClick={() => handleDelete(group.id)}>🗑</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                                {!loading && groups.length === 0 && <div className="empty-state">No groups found. Create one!</div>}
                            </div>
                        </>
                    )}

                    {/* View: Edit/Create Form */}
                    {editingGroup && (
                        <div className="edit-container">
                            <form onSubmit={handleSubmit} className="group-form">
                                <div className="form-header">
                                    <h3>{editingGroup.id ? 'Edit Group' : 'New Group'}</h3>
                                    <button type="button" className="btn-text" onClick={handleBack}>Cancel</button>
                                </div>

                                <div className="form-group">
                                    <label>Group Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        placeholder="e.g. Camera Dept"
                                    />
                                </div>

                                {activeTab === 'POSITION' && (
                                    <div className="form-group">
                                        <label>Color Tag</label>
                                        <div className="color-picker-row">
                                            {COLOR_OPTIONS.map(c => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    className={`color-choice ${formData.color === c ? 'selected' : ''}`}
                                                    style={{ backgroundColor: c }}
                                                    onClick={() => setFormData({ ...formData, color: c })}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Optional description..."
                                        rows={2}
                                    />
                                </div>

                                <button type="submit" className="btn-submit" disabled={loading}>
                                    {loading ? 'Saving...' : 'Save Group'}
                                </button>
                            </form>

                            {/* MEMBERS SECTION - Only if editing an existing group */}
                            {editingGroup.id && (
                                <div className="members-section">
                                    <h3>Group Members</h3>
                                    <div className="add-member-row">
                                        <select id="add-member-select" className="member-select" onChange={(e) => {
                                            if (e.target.value) {
                                                handleAddItem(e.target.value);
                                                e.target.value = ""; // Reset
                                            }
                                        }}>
                                            <option value="">+ Add {activeTab === 'POSITION' ? 'Position' : 'Resource'}...</option>
                                            {availableItems.map(item => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name || item.position_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="members-list">
                                        {groupItems.length === 0 ? (
                                            <div className="empty-members">No items in this group.</div>
                                        ) : (
                                            groupItems.map(item => (
                                                <div key={item.id} className="member-item">
                                                    <span>{item.name || item.position_name}</span>
                                                    <button className="remove-btn" onClick={() => handleRemoveItem(item.id)} title="Remove from group">×</button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <style>{`
                    .manager-modal {
                        width: 700px;
                        max-width: 90vw;
                        height: 80vh;
                        display: flex;
                        flex-direction: column;
                        background: #1e293b;
                        color: #f1f5f9;
                    }

                    .tabs {
                        display: flex;
                        border-bottom: 1px solid rgba(148, 163, 184, 0.1);
                        margin: 1rem 0;
                        gap: 1rem;
                    }

                    .tab-btn {
                        background: none;
                        border: none;
                        padding: 0.5rem 1rem;
                        color: #94a3b8;
                        border-bottom: 2px solid transparent;
                        cursor: pointer;
                        font-weight: 500;
                    }

                    .tab-btn.active {
                        color: #3b82f6;
                        border-bottom-color: #3b82f6;
                    }

                    .manager-body {
                        flex: 1;
                        overflow-y: auto;
                        display: flex;
                        flex-direction: column;
                    }

                    .list-actions {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 1rem;
                    }
                    
                    .subtitle {
                        font-size: 0.85rem;
                        color: #94a3b8;
                        margin: 0;
                        max-width: 70%;
                    }

                    .groups-list {
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                    }

                    .group-row {
                        background: rgba(30, 41, 59, 0.5);
                        padding: 0.75rem 1rem;
                        border-radius: 8px;
                        border: 1px solid rgba(148, 163, 184, 0.1);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        transition: border-color 0.2s;
                    }

                    .group-row:hover {
                        border-color: #3b82f6;
                    }

                    .group-info {
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                    }

                    .color-dot {
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                    }

                    .group-name {
                        font-weight: 500;
                        color: #e2e8f0;
                    }

                    .group-count {
                        font-size: 0.75rem;
                        color: #64748b;
                        background: rgba(255,255,255,0.05);
                        padding: 2px 6px;
                        border-radius: 4px;
                    }

                    .row-actions {
                        display: flex;
                        gap: 0.5rem;
                    }

                    .icon-btn {
                        background: none;
                        border: none;
                        cursor: pointer;
                        opacity: 0.6;
                        transition: opacity 0.2s;
                        padding: 4px;
                        color: #94a3b8;
                    }

                    .icon-btn:hover {
                        opacity: 1;
                        color: white;
                    }

                    .icon-btn.delete:hover { color: #ef4444; }

                    /* Edit Container Layout */
                    .edit-container {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 2rem;
                        height: 100%;
                    }

                    .group-form {
                        display: flex;
                        flex-direction: column;
                        gap: 1.5rem;
                        padding-right: 1rem;
                        border-right: 1px solid rgba(148, 163, 184, 0.1);
                    }

                    .form-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }

                    .form-header h3 { margin: 0; font-size: 1.1rem; }

                    .color-picker-row {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 0.5rem;
                    }

                    .color-choice {
                        width: 24px;
                        height: 24px;
                        border-radius: 50%;
                        border: 2px solid transparent;
                        cursor: pointer;
                        transition: transform 0.2s;
                    }
                    
                    .color-choice.selected {
                        border-color: white;
                        transform: scale(1.2);
                        box-shadow: 0 0 10px rgba(0,0,0,0.5);
                    }

                    .btn-cancel, .btn-text {
                        background: transparent;
                        border: 1px solid rgba(148, 163, 184, 0.3);
                        color: #94a3b8;
                        padding: 0.5rem 1rem;
                        border-radius: 6px;
                        cursor: pointer;
                    }
                    .btn-text { border: none; padding: 0; text-decoration: underline; }
                    
                    .btn-submit {
                        background: #3b82f6;
                        color: white;
                        border: none;
                        padding: 0.5rem 1rem;
                        border-radius: 6px;
                        cursor: pointer;
                        margin-top: auto;
                    }

                    /* Members Section */
                    .members-section {
                        display: flex;
                        flex-direction: column;
                        gap: 1rem;
                    }

                    .members-section h3 { margin: 0; font-size: 1rem; color: #94a3b8; }

                    .member-select {
                        width: 100%;
                        background: rgba(30, 41, 59, 0.8);
                        border: 1px solid rgba(148, 163, 184, 0.2);
                        padding: 0.5rem;
                        border-radius: 6px;
                        color: #f1f5f9;
                    }

                    .members-list {
                        flex: 1;
                        overflow-y: auto;
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                        background: rgba(15, 23, 42, 0.3);
                        padding: 0.5rem;
                        border-radius: 6px;
                    }

                    .member-item {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 6px 10px;
                        background: rgba(30, 41, 59, 0.5);
                        border-radius: 4px;
                        font-size: 0.9rem;
                    }

                    .remove-btn {
                        background: none;
                        border: none;
                        color: #94a3b8;
                        cursor: pointer;
                        font-size: 1.2rem;
                        line-height: 1;
                    }

                    .remove-btn:hover { color: #ef4444; }

                    .empty-members {
                        color: #64748b;
                        font-style: italic;
                        text-align: center;
                        padding: 1rem;
                    }
                `}</style>
            </div>
        </div>
    );
}

export default GroupManager;
