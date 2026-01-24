import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function PositionManagement() {
    const { user } = useAuth();
    const [positionGroups, setPositionGroups] = useState([]);
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Edit state
    const [editingPosition, setEditingPosition] = useState(null);
    const [editingGroup, setEditingGroup] = useState(null);

    // New position/group forms
    const [showNewPosition, setShowNewPosition] = useState(false);
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [newPosition, setNewPosition] = useState({ name: '', abbreviation: '', position_group_id: '', hourly_rate: '' });
    const [newGroup, setNewGroup] = useState({ name: '', color: '#3B82F6', description: '' });

    const isAdmin = user?.role === 'ADMIN';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [groups, pos] = await Promise.all([
                api.getPositionGroups(),
                api.getPositions()
            ]);
            setPositionGroups(groups);
            setPositions(pos);
        } catch (err) {
            setError('Failed to load positions');
        } finally {
            setLoading(false);
        }
    };

    const showMessage = (msg, isError = false) => {
        if (isError) {
            setError(msg);
            setTimeout(() => setError(''), 3000);
        } else {
            setSuccess(msg);
            setTimeout(() => setSuccess(''), 3000);
        }
    };

    const handleUpdatePosition = async (position) => {
        try {
            await api.updatePosition(position.id, {
                name: position.name,
                abbreviation: position.abbreviation,
                hourly_rate: parseFloat(position.hourly_rate)
            });
            showMessage('Position updated');
            setEditingPosition(null);
            fetchData();
        } catch (err) {
            showMessage(err.message, true);
        }
    };

    const handleDeletePosition = async (id) => {
        if (!confirm('Delete this position?')) return;
        try {
            await api.deletePosition(id);
            showMessage('Position deleted');
            fetchData();
        } catch (err) {
            showMessage(err.message, true);
        }
    };

    const handleUpdateGroup = async (group) => {
        try {
            await api.updatePositionGroup(group.id, {
                name: group.name,
                color: group.color,
                description: group.description
            });
            showMessage('Group updated');
            setEditingGroup(null);
            fetchData();
        } catch (err) {
            showMessage(err.message, true);
        }
    };

    const handleDeleteGroup = async (id) => {
        if (!confirm('Delete this group and all its positions?')) return;
        try {
            await api.deletePositionGroup(id);
            showMessage('Group deleted');
            fetchData();
        } catch (err) {
            showMessage(err.message, true);
        }
    };

    const handleCreatePosition = async (e) => {
        e.preventDefault();
        try {
            await api.createPosition({
                ...newPosition,
                hourly_rate: parseFloat(newPosition.hourly_rate) || 0,
                position_group_id: parseInt(newPosition.position_group_id)
            });
            showMessage('Position created');
            setNewPosition({ name: '', abbreviation: '', position_group_id: '', hourly_rate: '' });
            setShowNewPosition(false);
            fetchData();
        } catch (err) {
            showMessage(err.message, true);
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        try {
            await api.createPositionGroup(newGroup);
            showMessage('Group created');
            setNewGroup({ name: '', color: '#3B82F6', description: '' });
            setShowNewGroup(false);
            fetchData();
        } catch (err) {
            showMessage(err.message, true);
        }
    };

    // Group positions by their group
    const groupedPositions = positionGroups.map(group => ({
        ...group,
        positions: positions.filter(p => p.position_group_id === group.id)
    }));

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading">Loading positions...</div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Position Management</h1>
                    <p className="subtitle">Manage position groups, roles, and hourly rates</p>
                </div>
                {isAdmin && (
                    <div className="header-actions">
                        <button className="btn btn-secondary" onClick={() => setShowNewGroup(true)}>
                            + New Group
                        </button>
                        <button className="btn btn-primary" onClick={() => setShowNewPosition(true)}>
                            + New Position
                        </button>
                    </div>
                )}
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Position Groups */}
            <div className="groups-grid">
                {groupedPositions.map(group => (
                    <div key={group.id} className="group-card">
                        <div className="group-header" style={{ borderLeftColor: group.color }}>
                            {editingGroup?.id === group.id ? (
                                <div className="edit-group-form">
                                    <input
                                        type="text"
                                        value={editingGroup.name}
                                        onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                                        className="input-sm"
                                    />
                                    <input
                                        type="color"
                                        value={editingGroup.color}
                                        onChange={(e) => setEditingGroup({ ...editingGroup, color: e.target.value })}
                                        className="color-input"
                                    />
                                    <button className="btn-icon save" onClick={() => handleUpdateGroup(editingGroup)}>✓</button>
                                    <button className="btn-icon cancel" onClick={() => setEditingGroup(null)}>✕</button>
                                </div>
                            ) : (
                                <>
                                    <div className="group-title">
                                        <span className="color-dot" style={{ background: group.color }}></span>
                                        <h3>{group.name}</h3>
                                        <span className="position-count">{group.positions.length} positions</span>
                                    </div>
                                    {isAdmin && (
                                        <div className="group-actions">
                                            <button className="btn-icon" onClick={() => setEditingGroup({ ...group })}>✎</button>
                                            <button className="btn-icon delete" onClick={() => handleDeleteGroup(group.id)}>🗑</button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="positions-list">
                            {group.positions.length === 0 ? (
                                <div className="no-positions">No positions in this group</div>
                            ) : (
                                <table className="positions-table">
                                    <thead>
                                        <tr>
                                            <th>Position</th>
                                            <th>Abbrev</th>
                                            <th>Hourly Rate</th>
                                            {isAdmin && <th>Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {group.positions.map(position => (
                                            <tr key={position.id}>
                                                {editingPosition?.id === position.id ? (
                                                    <>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                value={editingPosition.name}
                                                                onChange={(e) => setEditingPosition({ ...editingPosition, name: e.target.value })}
                                                                className="input-sm"
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                value={editingPosition.abbreviation || ''}
                                                                onChange={(e) => setEditingPosition({ ...editingPosition, abbreviation: e.target.value })}
                                                                className="input-sm abbrev"
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                value={editingPosition.hourly_rate}
                                                                onChange={(e) => setEditingPosition({ ...editingPosition, hourly_rate: e.target.value })}
                                                                className="input-sm rate"
                                                                step="0.01"
                                                            />
                                                        </td>
                                                        <td>
                                                            <button className="btn-icon save" onClick={() => handleUpdatePosition(editingPosition)}>✓</button>
                                                            <button className="btn-icon cancel" onClick={() => setEditingPosition(null)}>✕</button>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td>{position.name}</td>
                                                        <td className="abbrev">{position.abbreviation}</td>
                                                        <td className="rate">${parseFloat(position.hourly_rate).toFixed(2)}/hr</td>
                                                        {isAdmin && (
                                                            <td>
                                                                <button className="btn-icon" onClick={() => setEditingPosition({ ...position })}>✎</button>
                                                                <button className="btn-icon delete" onClick={() => handleDeletePosition(position.id)}>🗑</button>
                                                            </td>
                                                        )}
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* New Position Modal */}
            {showNewPosition && (
                <div className="modal-overlay" onClick={() => setShowNewPosition(false)}>
                    <div className="modal-content small" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setShowNewPosition(false)}>×</button>
                        <h2>New Position</h2>
                        <form onSubmit={handleCreatePosition}>
                            <div className="form-group">
                                <label>Position Name *</label>
                                <input
                                    type="text"
                                    value={newPosition.name}
                                    onChange={(e) => setNewPosition({ ...newPosition, name: e.target.value })}
                                    placeholder="e.g., Stage Manager"
                                    required
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Abbreviation</label>
                                    <input
                                        type="text"
                                        value={newPosition.abbreviation}
                                        onChange={(e) => setNewPosition({ ...newPosition, abbreviation: e.target.value })}
                                        placeholder="e.g., SM"
                                        maxLength={10}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Hourly Rate ($)</label>
                                    <input
                                        type="number"
                                        value={newPosition.hourly_rate}
                                        onChange={(e) => setNewPosition({ ...newPosition, hourly_rate: e.target.value })}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Position Group *</label>
                                <select
                                    value={newPosition.position_group_id}
                                    onChange={(e) => setNewPosition({ ...newPosition, position_group_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select group...</option>
                                    {positionGroups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowNewPosition(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Position</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* New Group Modal */}
            {showNewGroup && (
                <div className="modal-overlay" onClick={() => setShowNewGroup(false)}>
                    <div className="modal-content small" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setShowNewGroup(false)}>×</button>
                        <h2>New Position Group</h2>
                        <form onSubmit={handleCreateGroup}>
                            <div className="form-group">
                                <label>Group Name *</label>
                                <input
                                    type="text"
                                    value={newGroup.name}
                                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                                    placeholder="e.g., Stage"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Color</label>
                                <div className="color-picker-row">
                                    <input
                                        type="color"
                                        value={newGroup.color}
                                        onChange={(e) => setNewGroup({ ...newGroup, color: e.target.value })}
                                    />
                                    <span>{newGroup.color}</span>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <input
                                    type="text"
                                    value={newGroup.description}
                                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                                    placeholder="Optional description"
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowNewGroup(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Group</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .page-container {
                    padding: 1.5rem;
                    max-width: 1400px;
                    margin: 0 auto;
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }

                .page-header h1 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #f1f5f9;
                    margin: 0;
                }

                .page-header .subtitle {
                    color: #64748b;
                    font-size: 0.875rem;
                    margin: 0.25rem 0 0 0;
                }

                .header-actions {
                    display: flex;
                    gap: 0.75rem;
                }

                .btn {
                    padding: 0.625rem 1.25rem;
                    border-radius: 8px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.15s;
                    border: none;
                }

                .btn-primary {
                    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                    color: white;
                }

                .btn-secondary {
                    background: transparent;
                    color: #94a3b8;
                    border: 1px solid rgba(148, 163, 184, 0.3);
                }

                .alert {
                    padding: 0.75rem 1rem;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                }

                .alert-error {
                    background: rgba(239, 68, 68, 0.2);
                    border: 1px solid #ef4444;
                    color: #fca5a5;
                }

                .alert-success {
                    background: rgba(34, 197, 94, 0.2);
                    border: 1px solid #22c55e;
                    color: #86efac;
                }

                .groups-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
                    gap: 1.5rem;
                }

                .group-card {
                    background: rgba(30, 41, 59, 0.5);
                    border-radius: 12px;
                    overflow: hidden;
                }

                .group-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    background: rgba(15, 23, 42, 0.5);
                    border-left: 4px solid;
                }

                .group-title {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .color-dot {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                }

                .group-title h3 {
                    margin: 0;
                    font-size: 1rem;
                    color: #e2e8f0;
                }

                .position-count {
                    font-size: 0.75rem;
                    color: #64748b;
                    background: rgba(100, 116, 139, 0.2);
                    padding: 0.125rem 0.5rem;
                    border-radius: 4px;
                }

                .group-actions {
                    display: flex;
                    gap: 0.25rem;
                }

                .btn-icon {
                    background: transparent;
                    border: none;
                    color: #64748b;
                    cursor: pointer;
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    transition: all 0.15s;
                }

                .btn-icon:hover {
                    background: rgba(148, 163, 184, 0.2);
                    color: #e2e8f0;
                }

                .btn-icon.delete:hover {
                    background: rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                }

                .btn-icon.save {
                    color: #22c55e;
                }

                .btn-icon.cancel {
                    color: #ef4444;
                }

                .positions-list {
                    padding: 0.5rem;
                }

                .no-positions {
                    color: #64748b;
                    text-align: center;
                    padding: 1rem;
                    font-style: italic;
                }

                .positions-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .positions-table th,
                .positions-table td {
                    padding: 0.5rem;
                    text-align: left;
                    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
                }

                .positions-table th {
                    font-size: 0.75rem;
                    color: #64748b;
                    font-weight: 500;
                    text-transform: uppercase;
                }

                .positions-table td {
                    color: #e2e8f0;
                    font-size: 0.875rem;
                }

                .positions-table .abbrev {
                    color: #94a3b8;
                    font-family: monospace;
                }

                .positions-table .rate {
                    color: #22c55e;
                    font-weight: 500;
                }

                .input-sm {
                    background: rgba(15, 23, 42, 0.8);
                    border: 1px solid rgba(59, 130, 246, 0.5);
                    border-radius: 4px;
                    padding: 0.25rem 0.5rem;
                    color: #f1f5f9;
                    font-size: 0.875rem;
                    width: 100%;
                }

                .input-sm.abbrev {
                    width: 60px;
                }

                .input-sm.rate {
                    width: 80px;
                }

                .edit-group-form {
                    display: flex;
                    gap: 0.5rem;
                    align-items: center;
                    flex: 1;
                }

                .color-input {
                    width: 32px;
                    height: 32px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }

                .modal-content.small {
                    max-width: 450px;
                }

                .form-group {
                    margin-bottom: 1rem;
                }

                .form-group label {
                    display: block;
                    font-size: 0.875rem;
                    color: #94a3b8;
                    margin-bottom: 0.5rem;
                }

                .form-group input,
                .form-group select {
                    width: 100%;
                    background: rgba(30, 41, 59, 0.8);
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    border-radius: 8px;
                    padding: 0.75rem;
                    color: #f1f5f9;
                    font-size: 0.9rem;
                }

                .form-group input:focus,
                .form-group select:focus {
                    outline: none;
                    border-color: #3b82f6;
                }

                .form-row {
                    display: flex;
                    gap: 1rem;
                }

                .form-row .form-group {
                    flex: 1;
                }

                .color-picker-row {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .color-picker-row input[type="color"] {
                    width: 48px;
                    height: 36px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    padding: 0;
                }

                .color-picker-row span {
                    color: #94a3b8;
                    font-family: monospace;
                }

                .modal-actions {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1.5rem;
                    justify-content: flex-end;
                }

                .loading {
                    text-align: center;
                    padding: 3rem;
                    color: #64748b;
                }
            `}</style>
        </div>
    );
}
