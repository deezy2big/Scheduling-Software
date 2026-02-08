import React, { useState, useEffect } from 'react';
import api from '../api';

// Color options for resources
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

export default function ResourceModal({ isOpen, onClose, resource, onSave, positions, laborLaws, resourceGroups }) {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        name: '', // For non-staff resources
        type: 'STAFF',
        notes: '',
        color: '#3B82F6',
        status: 'ACTIVE',
        pay_type: 'HOURLY',
        work_state: 'CA',
        email: '',
        phone: '',
        address_street: '',
        address_unit: '',
        address_city: '',
        address_state: '',
        address_zip: '',
        start_date: '',
        group_ids: [],
    });
    const [resourcePositions, setResourcePositions] = useState([]);
    const [pendingPositions, setPendingPositions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [newPositionId, setNewPositionId] = useState('');
    const [activeTab, setActiveTab] = useState('basic');
    const [isGroupsUnlocked, setIsGroupsUnlocked] = useState(false);
    const [isStatusUnlocked, setIsStatusUnlocked] = useState(false);

    useEffect(() => {
        if (resource) {
            // Parse existing groups from resource
            const existingGroupIds = resource.groups
                ? (Array.isArray(resource.groups) ? resource.groups.map(g => g.id) : [])
                : (resource.group_id ? [resource.group_id] : []);

            setFormData({
                first_name: resource.first_name || '',
                last_name: resource.last_name || '',
                name: resource.name || '',
                type: resource.type || 'STAFF',
                notes: resource.notes || resource.description || '',
                color: resource.color || '#3B82F6',
                status: resource.status || 'ACTIVE',
                pay_type: resource.pay_type || 'HOURLY',
                work_state: resource.work_state || 'CA',
                email: resource.email || '',
                phone: resource.phone || '',
                address_street: resource.address_street || '',
                address_unit: resource.address_unit || '',
                address_city: resource.address_city || '',
                address_state: resource.address_state || '',
                address_zip: resource.address_zip || '',
                start_date: resource.start_date ? resource.start_date.split('T')[0] : '',
                group_ids: existingGroupIds,
            });
            if (resource.type === 'STAFF') {
                fetchResourcePositions(resource.id);
            }
            setPendingPositions([]);
        } else {
            setFormData({
                first_name: '',
                last_name: '',
                name: '',
                type: 'STAFF',
                notes: '',
                color: '#3B82F6',
                status: 'ACTIVE',
                pay_type: 'HOURLY',
                work_state: 'CA',
                email: '',
                phone: '',
                address_street: '',
                address_unit: '',
                address_city: '',
                address_state: '',
                address_zip: '',
                start_date: '',
                group_ids: [],
            });
            setResourcePositions([]);
            setPendingPositions([]);
        }
        setError('');
        setNewPositionId('');
        setActiveTab('basic');
        setIsGroupsUnlocked(false);
        setIsStatusUnlocked(false);
    }, [resource, isOpen]);

    const fetchResourcePositions = async (resourceId) => {
        try {
            const pos = await api.getResourcePositions(resourceId);
            setResourcePositions(pos);
        } catch (err) {
            console.error('Failed to fetch resource positions:', err);
        }
    };

    const getCurrentPositions = () => {
        if (resource) {
            return resourcePositions;
        }
        return pendingPositions;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const isStaff = formData.type === 'STAFF';

        // Validate required fields
        if (isStaff && !formData.first_name.trim() && !formData.last_name.trim()) {
            setError('First name or last name is required for staff');
            return;
        }
        if (!isStaff && !formData.name.trim()) {
            setError('Name is required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const submitData = {
                ...formData,
                // Build name from first/last for staff
                name: isStaff
                    ? `${formData.first_name} ${formData.last_name}`.trim()
                    : formData.name,
            };

            let savedResource;
            if (resource) {
                savedResource = await api.updateResource(resource.id, submitData);
            } else {
                savedResource = await api.createResource(submitData);

                // Handle pending positions for new staff
                if (isStaff && pendingPositions.length > 0) {
                    for (const pos of pendingPositions) {
                        try {
                            await api.addResourcePosition(savedResource.id, {
                                position_id: pos.position_id,
                                custom_hourly_rate: pos.custom_hourly_rate
                            });
                        } catch (err) {
                            console.error('Failed to add position:', err);
                        }
                    }
                }
            }
            onSave();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPosition = async () => {
        if (!newPositionId) return;

        const position = positions.find(p => p.id === parseInt(newPositionId));
        if (!position) return;

        if (resource) {
            try {
                await api.addResourcePosition(resource.id, {
                    position_id: parseInt(newPositionId),
                    custom_hourly_rate: position.hourly_rate || null
                });
                await fetchResourcePositions(resource.id);
                setNewPositionId('');
            } catch (err) {
                setError(err.message);
            }
        } else {
            const newPending = {
                position_id: parseInt(newPositionId),
                position_name: position.name,
                abbreviation: position.abbreviation,
                custom_hourly_rate: parseFloat(position.hourly_rate) || 0,
                default_hourly_rate: parseFloat(position.hourly_rate) || 0
            };
            setPendingPositions([...pendingPositions, newPending]);
            setNewPositionId('');
        }
    };

    const handleRemovePosition = async (positionId) => {
        if (resource) {
            try {
                await api.removeResourcePosition(resource.id, positionId);
                await fetchResourcePositions(resource.id);
            } catch (err) {
                setError(err.message);
            }
        } else {
            setPendingPositions(pendingPositions.filter(p => p.position_id !== positionId));
        }
    };

    const handleUpdateRate = async (positionId, newRate) => {
        if (resource) {
            try {
                await api.updateResourcePosition(resource.id, positionId, {
                    custom_hourly_rate: parseFloat(newRate) || null
                });
                await fetchResourcePositions(resource.id);
            } catch (err) {
                setError(err.message);
            }
        } else {
            setPendingPositions(pendingPositions.map(p =>
                p.position_id === positionId
                    ? { ...p, custom_hourly_rate: parseFloat(newRate) || 0 }
                    : p
            ));
        }
    };

    const handleGroupToggle = (groupId) => {
        const id = parseInt(groupId);
        setFormData(prev => ({
            ...prev,
            group_ids: prev.group_ids.includes(id)
                ? prev.group_ids.filter(g => g !== id)
                : [...prev.group_ids, id]
        }));
    };

    if (!isOpen) return null;

    const isStaff = formData.type === 'STAFF';
    const currentPositions = getCurrentPositions();
    const availablePositions = positions.filter(p =>
        !currentPositions.some(cp => cp.position_id === p.id)
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content resource-modal-v2" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        {resource ? 'Edit Resource' : 'Add New Resource'}
                    </h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Tab Navigation */}
                <div className="modal-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'basic' ? 'active' : ''}`}
                        onClick={() => setActiveTab('basic')}
                        type="button"
                    >
                        Basic Info
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'contact' ? 'active' : ''}`}
                        onClick={() => setActiveTab('contact')}
                        type="button"
                    >
                        Contact & Address
                    </button>
                    {isStaff && (
                        <button
                            className={`tab-btn ${activeTab === 'pay' ? 'active' : ''}`}
                            onClick={() => setActiveTab('pay')}
                            type="button"
                        >
                            Pay & Positions
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {error && (
                        <div className="error-message">{error}</div>
                    )}

                    {/* Basic Info Tab */}
                    {activeTab === 'basic' && (
                        <div className="tab-content">
                            {/* Type Selection */}
                            <div className="form-row">
                                <div className="form-group" style={{ flex: '0 0 150px' }}>
                                    <label>Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="STAFF">Staff</option>
                                        <option value="FACILITY">Facility</option>
                                        <option value="EQUIPMENT">Equipment</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: '0 0 150px' }}>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="mb-0">Status</label>
                                        <button
                                            type="button"
                                            className={`btn-lock ${isStatusUnlocked ? 'unlocked' : ''}`}
                                            onClick={() => setIsStatusUnlocked(!isStatusUnlocked)}
                                            title={isStatusUnlocked ? "Lock Status" : "Unlock to change Status"}
                                        >
                                            {isStatusUnlocked ? '🔓' : '🔒'}
                                        </button>
                                    </div>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        disabled={!isStatusUnlocked}
                                        className={!isStatusUnlocked ? 'locked-input' : ''}
                                    >
                                        <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive</option>
                                        <option value="MAINTENANCE">Maintenance</option>
                                    </select>
                                </div>
                                {isStaff && (
                                    <div className="form-group" style={{ flex: '0 0 150px' }}>
                                        <label>Start Date</label>
                                        <input
                                            type="date"
                                            value={formData.start_date}
                                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Name Fields */}
                            {isStaff ? (
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>First Name *</label>
                                        <input
                                            type="text"
                                            placeholder="John"
                                            value={formData.first_name}
                                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Last Name *</label>
                                        <input
                                            type="text"
                                            placeholder="Smith"
                                            value={formData.last_name}
                                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label>Name *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Edit Bay A, Camera Kit #1"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="mb-0">Groups (multi-select)</label>
                                    <button
                                        type="button"
                                        className={`btn-lock ${isGroupsUnlocked ? 'unlocked' : ''}`}
                                        onClick={() => setIsGroupsUnlocked(!isGroupsUnlocked)}
                                        title={isGroupsUnlocked ? "Lock Groups" : "Unlock to change Groups"}
                                    >
                                        {isGroupsUnlocked ? '🔓 Unlock to Edit' : '🔒 Groups Locked'}
                                    </button>
                                </div>
                                <div className={`group-checkboxes ${!isGroupsUnlocked ? 'locked-section' : ''}`}>
                                    {resourceGroups && resourceGroups.length > 0 ? (
                                        resourceGroups.map(g => (
                                            <label
                                                key={g.id}
                                                className={`group-checkbox ${formData.group_ids.includes(g.id) ? 'selected' : ''} ${!isGroupsUnlocked ? 'disabled' : ''}`}
                                                style={{ borderColor: g.color || '#3B82F6' }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={formData.group_ids.includes(g.id)}
                                                    onChange={() => handleGroupToggle(g.id)}
                                                    disabled={!isGroupsUnlocked}
                                                />
                                                <span
                                                    className="group-color-dot"
                                                    style={{ backgroundColor: g.color || '#3B82F6' }}
                                                />
                                                {g.name}
                                            </label>
                                        ))
                                    ) : (
                                        <p className="text-slate-500 text-sm">No groups available. Create groups first.</p>
                                    )}
                                </div>
                                {!isGroupsUnlocked && formData.group_ids.length > 0 && (
                                    <p className="locked-hint">Click the lock icon to add or remove from groups.</p>
                                )}
                            </div>

                            {/* Color */}
                            <div className="form-group">
                                <label>Color Tag</label>
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

                            {/* Notes */}
                            <div className="form-group">
                                <label>Notes</label>
                                <textarea
                                    rows={3}
                                    placeholder="Additional notes..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {/* Contact & Address Tab */}
                    {activeTab === 'contact' && (
                        <div className="tab-content">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        placeholder="email@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input
                                        type="tel"
                                        placeholder="555-123-4567"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="section-divider">
                                <span>Address</span>
                            </div>

                            <div className="form-group">
                                <label>Street Address</label>
                                <input
                                    type="text"
                                    placeholder="123 Main Street"
                                    value={formData.address_street}
                                    onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group" style={{ flex: '0 0 120px' }}>
                                    <label>Apt/Unit #</label>
                                    <input
                                        type="text"
                                        placeholder="Apt 4B"
                                        value={formData.address_unit}
                                        onChange={(e) => setFormData({ ...formData, address_unit: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>City</label>
                                    <input
                                        type="text"
                                        placeholder="Los Angeles"
                                        value={formData.address_city}
                                        onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>State</label>
                                    <input
                                        type="text"
                                        placeholder="CA"
                                        value={formData.address_state}
                                        onChange={(e) => setFormData({ ...formData, address_state: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Zip Code</label>
                                    <input
                                        type="text"
                                        placeholder="90001"
                                        value={formData.address_zip}
                                        onChange={(e) => setFormData({ ...formData, address_zip: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pay & Positions Tab (Staff only) */}
                    {activeTab === 'pay' && isStaff && (
                        <div className="tab-content">
                            <div className="staff-section">
                                <h3>Pay Settings</h3>

                                <div className="pay-type-row">
                                    <label className={`pay-option ${formData.pay_type === 'HOURLY' ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="pay_type"
                                            value="HOURLY"
                                            checked={formData.pay_type === 'HOURLY'}
                                            onChange={(e) => setFormData({ ...formData, pay_type: e.target.value })}
                                        />
                                        <span>Hourly</span>
                                    </label>
                                    <label className={`pay-option ${formData.pay_type === 'GUARANTEE_8' ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="pay_type"
                                            value="GUARANTEE_8"
                                            checked={formData.pay_type === 'GUARANTEE_8'}
                                            onChange={(e) => setFormData({ ...formData, pay_type: e.target.value })}
                                        />
                                        <span>8hr Guarantee</span>
                                    </label>
                                    <label className={`pay-option ${formData.pay_type === 'GUARANTEE_10' ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="pay_type"
                                            value="GUARANTEE_10"
                                            checked={formData.pay_type === 'GUARANTEE_10'}
                                            onChange={(e) => setFormData({ ...formData, pay_type: e.target.value })}
                                        />
                                        <span>10hr Guarantee</span>
                                    </label>
                                </div>

                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label>Work State (labor law)</label>
                                    <select
                                        value={formData.work_state}
                                        onChange={(e) => setFormData({ ...formData, work_state: e.target.value })}
                                    >
                                        {laborLaws.map(law => (
                                            <option key={law.state_code} value={law.state_code}>
                                                {law.state_name} {law.daily_ot_threshold ? `(OT after ${law.daily_ot_threshold}hrs)` : '(Weekly OT only)'}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Position Qualifications */}
                                <div className="positions-section">
                                    <h3>{resource ? 'Edit Positions' : 'Add Positions'}</h3>

                                    {currentPositions.length === 0 ? (
                                        <p className="no-positions">No positions assigned yet.</p>
                                    ) : (
                                        <table className="positions-table">
                                            <thead>
                                                <tr>
                                                    <th>Position</th>
                                                    <th>Rate/hr</th>
                                                    <th></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentPositions.map(rp => (
                                                    <tr key={rp.position_id}>
                                                        <td>
                                                            <span className="position-name">{rp.position_name}</span>
                                                            {rp.abbreviation && <span className="position-abbr">({rp.abbreviation})</span>}
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                className="rate-input"
                                                                value={rp.custom_hourly_rate || rp.default_hourly_rate || ''}
                                                                onChange={(e) => handleUpdateRate(rp.position_id, e.target.value)}
                                                                step="0.01"
                                                                min="0"
                                                            />
                                                        </td>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="btn-remove-sm"
                                                                onClick={() => handleRemovePosition(rp.position_id)}
                                                            >
                                                                ✕
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}

                                    {availablePositions.length > 0 && (
                                        <div className="add-position-row">
                                            <select
                                                value={newPositionId}
                                                onChange={(e) => setNewPositionId(e.target.value)}
                                            >
                                                <option value="">Add position...</option>
                                                {availablePositions.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name} (${parseFloat(p.hourly_rate || 0).toFixed(2)}/hr)
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                className="btn-add-sm"
                                                onClick={handleAddPosition}
                                                disabled={!newPositionId}
                                            >
                                                + Add
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'Saving...' : resource ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>

                <style>{`
                    .resource-modal-v2 {
                        max-width: 700px;
                        width: 95%;
                        max-height: 90vh;
                        overflow-y: auto;
                    }
                    .modal-tabs {
                        display: flex;
                        gap: 0;
                        border-bottom: 1px solid rgba(148, 163, 184, 0.2);
                        margin-bottom: 1rem;
                    }
                    .tab-btn {
                        background: transparent;
                        border: none;
                        padding: 0.75rem 1.25rem;
                        color: #94a3b8;
                        cursor: pointer;
                        font-size: 0.9rem;
                        border-bottom: 2px solid transparent;
                        transition: all 0.2s;
                    }
                    .tab-btn:hover {
                        color: #f1f5f9;
                    }
                    .tab-btn.active {
                        color: #3b82f6;
                        border-bottom-color: #3b82f6;
                    }
                    .tab-content {
                        display: flex;
                        flex-direction: column;
                        gap: 1rem;
                        min-height: 300px;
                    }
                    .modal-form {
                        display: flex;
                        flex-direction: column;
                        gap: 1rem;
                    }
                    .form-row {
                        display: flex;
                        gap: 1rem;
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
                    .section-divider {
                        display: flex;
                        align-items: center;
                        gap: 1rem;
                        margin: 0.5rem 0;
                    }
                    .section-divider::before,
                    .section-divider::after {
                        content: '';
                        flex: 1;
                        height: 1px;
                        background: rgba(148, 163, 184, 0.2);
                    }
                    .section-divider span {
                        color: #64748b;
                        font-size: 0.8rem;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                    }
                    .group-checkboxes {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 0.5rem;
                    }
                    .group-checkbox {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.5rem 0.75rem;
                        background: rgba(30, 41, 59, 0.5);
                        border: 1px solid rgba(148, 163, 184, 0.2);
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.85rem;
                        color: #94a3b8;
                        transition: all 0.2s;
                    }
                    .group-checkbox:hover {
                        background: rgba(30, 41, 59, 0.8);
                    }
                    .group-checkbox.selected {
                        background: rgba(59, 130, 246, 0.2);
                        border-color: rgba(59, 130, 246, 0.5);
                        color: #f1f5f9;
                    }
                    .group-checkbox input {
                        display: none;
                    }
                    .group-color-dot {
                        width: 10px;
                        height: 10px;
                        border-radius: 50%;
                    }
                    .error-message {
                        background: rgba(239, 68, 68, 0.2);
                        border: 1px solid #ef4444;
                        color: #fca5a5;
                        padding: 0.75rem;
                        border-radius: 8px;
                    }
                    .staff-section {
                        background: rgba(15, 23, 42, 0.5);
                        border: 1px solid rgba(139, 92, 246, 0.3);
                        border-radius: 12px;
                        padding: 1rem;
                    }
                    .staff-section h3 {
                        margin: 0 0 0.75rem 0;
                        font-size: 0.9rem;
                        color: #a78bfa;
                        font-weight: 600;
                    }
                    .pay-type-row {
                        display: flex;
                        gap: 0.5rem;
                    }
                    .pay-option {
                        flex: 1;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.75rem;
                        border-radius: 8px;
                        cursor: pointer;
                        background: rgba(30, 41, 59, 0.5);
                        border: 1px solid transparent;
                        transition: all 0.2s;
                        font-size: 0.85rem;
                        color: #94a3b8;
                    }
                    .pay-option:hover {
                        background: rgba(30, 41, 59, 0.8);
                    }
                    .pay-option.selected {
                        background: rgba(139, 92, 246, 0.2);
                        border-color: rgba(139, 92, 246, 0.5);
                        color: #f1f5f9;
                    }
                    .positions-section {
                        margin-top: 1rem;
                        padding-top: 1rem;
                        border-top: 1px solid rgba(148, 163, 184, 0.1);
                    }
                    .no-positions {
                        color: #64748b;
                        font-style: italic;
                        font-size: 0.875rem;
                    }
                    .positions-table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .positions-table th {
                        text-align: left;
                        font-size: 0.75rem;
                        color: #64748b;
                        padding: 0.5rem;
                        border-bottom: 1px solid rgba(148, 163, 184, 0.1);
                    }
                    .positions-table td {
                        padding: 0.5rem;
                        border-bottom: 1px solid rgba(148, 163, 184, 0.05);
                    }
                    .position-name {
                        color: #f1f5f9;
                    }
                    .position-abbr {
                        color: #64748b;
                        font-size: 0.8rem;
                        margin-left: 0.25rem;
                    }
                    .rate-input {
                        width: 80px;
                        padding: 0.4rem;
                        font-size: 0.85rem;
                        background: rgba(30, 41, 59, 0.8);
                        border: 1px solid rgba(148, 163, 184, 0.2);
                        border-radius: 6px;
                        color: #22c55e;
                    }
                    .btn-remove-sm {
                        background: transparent;
                        border: none;
                        color: #ef4444;
                        cursor: pointer;
                        padding: 0.25rem 0.5rem;
                        font-size: 0.9rem;
                    }
                    .btn-remove-sm:hover {
                        background: rgba(239, 68, 68, 0.2);
                        border-radius: 4px;
                    }
                    .add-position-row {
                        display: flex;
                        gap: 0.5rem;
                        margin-top: 0.75rem;
                    }
                    .add-position-row select {
                        flex: 1;
                        padding: 0.5rem;
                        background: rgba(30, 41, 59, 0.8);
                        border: 1px solid rgba(148, 163, 184, 0.2);
                        border-radius: 6px;
                        color: #f1f5f9;
                        font-size: 0.85rem;
                    }
                    .btn-add-sm {
                        background: #22c55e;
                        color: white;
                        border: none;
                        padding: 0.5rem 1rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.85rem;
                    }
                    .btn-add-sm:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
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
                        transition: all 0.2s;
                    }
                    .color-btn.selected {
                        border-color: white;
                        transform: scale(1.1);
                    }
                    .modal-actions {
                        display: flex;
                        gap: 1rem;
                        justify-content: flex-end;
                        margin-top: 1rem;
                        padding-top: 1rem;
                        border-top: 1px solid rgba(148, 163, 184, 0.1);
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
                    .btn-lock {
                        background: rgba(148, 163, 184, 0.1);
                        border: 1px solid rgba(148, 163, 184, 0.2);
                        color: #94a3b8;
                        font-size: 0.75rem;
                        padding: 2px 8px;
                        border-radius: 4px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        transition: all 0.2s;
                    }
                    .btn-lock:hover {
                        background: rgba(148, 163, 184, 0.2);
                        color: white;
                    }
                    .btn-lock.unlocked {
                        background: rgba(34, 197, 94, 0.1);
                        border-color: rgba(34, 197, 94, 0.3);
                        color: #4ade80;
                    }
                    .locked-input {
                        cursor: not-allowed !important;
                        opacity: 0.7;
                        background-color: rgba(30, 41, 59, 0.4) !important;
                    }
                    .locked-section {
                        opacity: 0.8;
                    }
                    .group-checkbox.disabled {
                        cursor: not-allowed !important;
                        opacity: 0.6;
                    }
                    .locked-hint {
                        font-size: 0.7rem;
                        color: #64748b;
                        margin-top: 4px;
                        font-style: italic;
                    }
                `}</style>
            </div>
        </div>
    );
}
