import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

function ServiceModal({ isOpen, onClose, service, onSave, positions, positionGroups }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        is_active: true,
    });
    const [servicePositions, setServicePositions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [newPositionId, setNewPositionId] = useState('');
    const [newQuantity, setNewQuantity] = useState(1);
    const [isDirty, setIsDirty] = useState(false);
    const initialDataRef = useRef(null);
    const lastServiceIdRef = useRef(null);

    useEffect(() => {
        if (!isOpen) {
            // Only reset when modal actually closes
            initialDataRef.current = null;
            lastServiceIdRef.current = null;
            setIsDirty(false);
            setError('');
            return;
        }

        const currentServiceId = service?.id ?? 'new';

        // Only re-initialize if we haven't initialized yet, or if the service ID changed
        if (lastServiceIdRef.current === currentServiceId && initialDataRef.current) {
            return; // Already initialized for this service, don't reset
        }

        // Mark that we're initializing for this service
        lastServiceIdRef.current = currentServiceId;

        let initialState = {
            formData: {
                name: '',
                description: '',
                is_active: true,
            },
            servicePositions: []
        };

        if (service) {
            initialState = {
                formData: {
                    name: service.name || '',
                    description: service.description || '',
                    is_active: service.is_active !== false,
                },
                servicePositions: (service.positions || []).map(p => ({
                    position_id: p.position_id,
                    position_name: p.position_name,
                    abbreviation: p.abbreviation,
                    hourly_rate: p.hourly_rate,
                    group_name: p.group_name,
                    group_color: p.group_color,
                    quantity: p.quantity || 1,
                    notes: p.notes || '',
                }))
            };
        }

        setFormData(initialState.formData);
        setServicePositions(initialState.servicePositions);
        initialDataRef.current = JSON.stringify(initialState);
        setIsDirty(false);
        setError('');
        setNewPositionId('');
        setNewQuantity(1);
    }, [service, isOpen]);

    useEffect(() => {
        if (!initialDataRef.current) return;
        const currentData = JSON.stringify({ formData, servicePositions });
        setIsDirty(currentData !== initialDataRef.current);
    }, [formData, servicePositions]);

    const handleCloseRequest = () => {
        if (isDirty) {
            if (window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError('Name is required');
            return;
        }

        setLoading(true);
        // Note: Removed setError('') from here to prevent "flashing" while waiting for server response

        try {
            const submitData = {
                ...formData,
                positions: servicePositions.map(p => ({
                    position_id: p.position_id,
                    quantity: p.quantity,
                    notes: p.notes,
                })),
            };

            if (service) {
                await api.updateService(service.id, submitData);
            } else {
                await api.createService(submitData);
            }
            setIsDirty(false);
            onSave();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPosition = () => {
        if (!newPositionId) return;

        const position = positions.find(p => p.id === parseInt(newPositionId));
        if (!position) return;

        // Check if already added
        if (servicePositions.some(sp => sp.position_id === position.id)) {
            setError('This position is already in the service');
            return;
        }

        const newPosition = {
            position_id: position.id,
            position_name: position.name,
            abbreviation: position.abbreviation,
            hourly_rate: position.hourly_rate,
            group_name: position.group_name,
            group_color: position.group_color,
            quantity: newQuantity || 1,
            notes: '',
        };

        setServicePositions([...servicePositions, newPosition]);
        setNewPositionId('');
        setNewQuantity(1);
        setError('');
    };

    const handleRemovePosition = (positionId) => {
        setServicePositions(servicePositions.filter(p => p.position_id !== positionId));
    };

    const handleUpdateQuantity = (positionId, quantity) => {
        setServicePositions(servicePositions.map(p =>
            p.position_id === positionId
                ? { ...p, quantity: Math.max(1, parseInt(quantity) || 1) }
                : p
        ));
    };

    const handleUpdateNotes = (positionId, notes) => {
        setServicePositions(servicePositions.map(p =>
            p.position_id === positionId
                ? { ...p, notes }
                : p
        ));
    };

    const handleDragStart = (e, index) => {
        e.dataTransfer.setData('index', index);
        e.currentTarget.classList.add('dragging');
    };

    const handleDragEnd = (e) => {
        e.currentTarget.classList.remove('dragging');
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('drag-over');
    };

    const handleDrop = (e, toIndex) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        const fromIndex = parseInt(e.dataTransfer.getData('index'));

        if (fromIndex === toIndex) return;

        const newPositions = [...servicePositions];
        const [movedItem] = newPositions.splice(fromIndex, 1);
        newPositions.splice(toIndex, 0, movedItem);
        setServicePositions(newPositions);
    };

    if (!isOpen) return null;

    const availablePositions = positions.filter(p =>
        !servicePositions.some(sp => sp.position_id === p.id)
    );

    // Group positions by position group for better organization
    const groupedAvailablePositions = {};
    availablePositions.forEach(p => {
        const groupName = p.group_name || 'Other';
        if (!groupedAvailablePositions[groupName]) {
            groupedAvailablePositions[groupName] = [];
        }
        groupedAvailablePositions[groupName].push(p);
    });

    return (
        <div className="modal-overlay" onClick={handleCloseRequest}>
            <div className="modal-content service-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        {service ? 'Edit Service' : 'Add New Service'}
                    </h2>
                    <button type="button" className="modal-close" onClick={handleCloseRequest}>x</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {error && (
                        <div className="error-message">{error}</div>
                    )}

                    <div className="form-group">
                        <label>Service Name *</label>
                        <input
                            type="text"
                            placeholder="e.g., Basketball (MC) - Studio"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            rows={2}
                            placeholder="Optional description..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            />
                            <span>Active</span>
                        </label>
                    </div>

                    {/* Positions Section */}
                    <div className="positions-section">
                        <h3>Positions to Include</h3>

                        {servicePositions.length === 0 ? (
                            <p className="no-positions">No positions added yet. Add positions below.</p>
                        ) : (
                            <table className="positions-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '30px' }}></th>
                                        <th>Position</th>
                                        <th>Group</th>
                                        <th>Qty</th>
                                        <th>Notes</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {servicePositions.map((sp, index) => (
                                        <tr
                                            key={sp.position_id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragEnd={handleDragEnd}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, index)}
                                            className="draggable-row"
                                        >
                                            <td className="drag-handle-cell">
                                                <div className="drag-handle-icon">⠿</div>
                                            </td>
                                            <td>
                                                <span className="position-name">{sp.position_name}</span>
                                                {sp.abbreviation && <span className="position-abbr">({sp.abbreviation})</span>}
                                            </td>
                                            <td>
                                                <span
                                                    className="group-badge"
                                                    style={{ backgroundColor: sp.group_color || '#475569' }}
                                                >
                                                    {sp.group_name || 'Other'}
                                                </span>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="qty-input"
                                                    value={sp.quantity}
                                                    onChange={(e) => handleUpdateQuantity(sp.position_id, e.target.value)}
                                                    min="1"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="notes-input"
                                                    placeholder="Notes..."
                                                    value={sp.notes}
                                                    onChange={(e) => handleUpdateNotes(sp.position_id, e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="btn-remove-sm"
                                                    onClick={() => handleRemovePosition(sp.position_id)}
                                                >
                                                    x
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
                                    <option value="">Select position...</option>
                                    {Object.entries(groupedAvailablePositions).map(([groupName, groupPositions]) => (
                                        <optgroup key={groupName} label={groupName}>
                                            {groupPositions.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} {p.abbreviation ? `(${p.abbreviation})` : ''}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    className="qty-input-add"
                                    value={newQuantity}
                                    onChange={(e) => setNewQuantity(parseInt(e.target.value) || 1)}
                                    min="1"
                                    placeholder="Qty"
                                />
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

                    <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'Saving...' : service ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>

                <style>{`
                    .service-modal {
                        max-width: 700px;
                        width: 95%;
                        max-height: 90vh;
                        overflow-y: auto;
                    }
                    .modal-form {
                        display: flex;
                        flex-direction: column;
                        gap: 1rem;
                    }
                    .form-group {
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
                    .checkbox-label {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        cursor: pointer;
                    }
                    .checkbox-label input {
                        width: auto;
                        padding: 0;
                    }
                    .error-message {
                        background: rgba(239, 68, 68, 0.2);
                        border: 1px solid #ef4444;
                        color: #fca5a5;
                        padding: 0.75rem;
                        border-radius: 8px;
                    }
                    .positions-section {
                        background: rgba(15, 23, 42, 0.5);
                        border: 1px solid rgba(59, 130, 246, 0.3);
                        border-radius: 12px;
                        padding: 1rem;
                    }
                    .positions-section h3 {
                        margin: 0 0 0.75rem 0;
                        font-size: 0.9rem;
                        color: #60a5fa;
                        font-weight: 600;
                    }
                    .no-positions {
                        color: #64748b;
                        font-style: italic;
                        font-size: 0.875rem;
                    }
                    .draggable-row {
                        cursor: grab;
                        transition: transform 0.2s ease, background-color 0.2s ease;
                    }
                    .draggable-row.dragging {
                        opacity: 0.5;
                        cursor: grabbing;
                    }
                    .draggable-row.drag-over {
                        background-color: rgba(59, 130, 246, 0.05);
                        border-top: 2px solid var(--accent-primary) !important;
                    }
                    .drag-handle-cell {
                        text-align: center;
                        vertical-align: middle;
                        padding-left: 8px !important;
                        width: 40px;
                    }
                    .drag-handle-icon {
                        color: var(--text-muted);
                        font-size: 1.2rem;
                        user-select: none;
                        opacity: 0.6;
                    }
                    .draggable-row:hover .drag-handle-icon {
                        opacity: 1;
                        color: var(--text-secondary);
                    }
                    .positions-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 0.75rem;
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
                    .group-badge {
                        font-size: 0.7rem;
                        padding: 0.2rem 0.5rem;
                        border-radius: 4px;
                        color: white;
                    }
                    .qty-input {
                        width: 50px;
                        padding: 0.3rem;
                        font-size: 0.85rem;
                        background: rgba(30, 41, 59, 0.8);
                        border: 1px solid rgba(148, 163, 184, 0.2);
                        border-radius: 6px;
                        color: #f1f5f9;
                        text-align: center;
                    }
                    .notes-input {
                        width: 100%;
                        padding: 0.3rem;
                        font-size: 0.8rem;
                        background: rgba(30, 41, 59, 0.8);
                        border: 1px solid rgba(148, 163, 184, 0.2);
                        border-radius: 6px;
                        color: #94a3b8;
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
                    .qty-input-add {
                        width: 60px;
                        padding: 0.5rem;
                        background: rgba(30, 41, 59, 0.8);
                        border: 1px solid rgba(148, 163, 184, 0.2);
                        border-radius: 6px;
                        color: #f1f5f9;
                        font-size: 0.85rem;
                        text-align: center;
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
                `}</style>
            </div>
        </div>
    );
}

export function ServiceManager() {
    const [services, setServices] = useState([]);
    const [positions, setPositions] = useState([]);
    const [positionGroups, setPositionGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [showInactive, setShowInactive] = useState(false);

    const fetchServices = async () => {
        setLoading(true);
        try {
            const data = await api.getServices();
            setServices(data);
        } catch (err) {
            console.error('Failed to fetch services:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPositions = async () => {
        try {
            const data = await api.getPositions();
            setPositions(data);
        } catch (err) {
            console.error('Failed to fetch positions:', err);
        }
    };

    const fetchPositionGroups = async () => {
        try {
            const data = await api.getPositionGroups();
            setPositionGroups(data);
        } catch (err) {
            console.error('Failed to fetch position groups:', err);
        }
    };

    useEffect(() => {
        fetchServices();
        fetchPositions();
        fetchPositionGroups();
    }, []);

    const handleEdit = (service) => {
        setEditingService(service);
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this service?')) {
            return;
        }
        try {
            await api.deleteService(id);
            fetchServices();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDuplicate = async (id) => {
        try {
            await api.duplicateService(id);
            fetchServices();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleAdd = () => {
        setEditingService(null);
        setModalOpen(true);
    };

    const getFilteredServices = () => {
        let filtered = services;

        if (!showInactive) {
            filtered = filtered.filter(s => s.is_active !== false);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(s =>
                s.name.toLowerCase().includes(query) ||
                (s.description && s.description.toLowerCase().includes(query))
            );
        }

        return filtered.sort((a, b) => a.name.localeCompare(b.name));
    };

    const getTotalPositions = (service) => {
        if (!service.positions || !Array.isArray(service.positions)) return 0;
        return service.positions.reduce((sum, p) => sum + (p.quantity || 1), 0);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Services</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Create templates for bulk-adding positions to workorders
                    </p>
                </div>
                <button className="btn btn-primary" onClick={handleAdd}>
                    + Add Service
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-400">
                    <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => setShowInactive(e.target.checked)}
                    />
                    Show inactive
                </label>

                <div className="relative ml-auto">
                    <input
                        type="text"
                        placeholder="Search services..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-slate-800 border border-slate-600 rounded pl-8 pr-10 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500 w-64 transition-all"
                    />
                    <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-12 text-slate-400">Loading...</div>
            ) : services.length === 0 ? (
                <div className="glass-card text-center py-12">
                    <p className="text-slate-400">No services found.</p>
                    <button className="btn btn-primary mt-4" onClick={handleAdd}>
                        Create Your First Service
                    </button>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Description</th>
                                <th>Positions</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {getFilteredServices().map((service) => (
                                <tr
                                    key={service.id}
                                    className="service-row"
                                    onDoubleClick={() => handleEdit(service)}
                                    title={`Service: ${service.name}\n${(service.positions || []).map(p => `• ${p.quantity}x ${p.position_name}`).join('\n')}`}
                                >
                                    <td className="font-medium">{service.name}</td>
                                    <td className="text-slate-400 text-sm">
                                        {service.description || '-'}
                                    </td>
                                    <td>
                                        <div className="flex flex-wrap gap-1">
                                            {service.positions && service.positions.length > 0 ? (
                                                <>
                                                    <span className="text-sm text-slate-300">
                                                        {getTotalPositions(service)} position{getTotalPositions(service) !== 1 ? 's' : ''}
                                                    </span>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {service.positions.map((p, i) => (
                                                            <span
                                                                key={i}
                                                                className="text-[11px] px-1.5 py-0.5 rounded text-white font-medium"
                                                                style={{ backgroundColor: p.group_color || '#475569' }}
                                                            >
                                                                {p.abbreviation || p.position_name}
                                                                {p.quantity > 1 && ` x${p.quantity}`}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-xs text-slate-500">No positions</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${service.is_active !== false ? 'badge-active' : 'badge-inactive'}`}>
                                            {service.is_active !== false ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => handleEdit(service)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => handleDuplicate(service.id)}
                                                title="Duplicate this service"
                                            >
                                                Duplicate
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDelete(service.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            <ServiceModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                service={editingService}
                onSave={fetchServices}
                positions={positions}
                positionGroups={positionGroups}
            />
            <style>{`
                .service-row {
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .service-row:hover td {
                    background: rgba(59, 130, 246, 0.08) !important;
                }
                .service-row:active td {
                    background: rgba(59, 130, 246, 0.15) !important;
                }
            `}</style>
        </div>
    );
}

export default ServiceManager;
