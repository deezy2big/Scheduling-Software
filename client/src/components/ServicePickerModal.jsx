import React, { useState, useEffect } from 'react';

export function ServicePickerModal({ isOpen, onClose, onSelect, services = [] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedServiceId, setExpandedServiceId] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setExpandedServiceId(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const filteredServices = services
        .filter(s => s.is_active !== false)
        .filter(s => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (
                s.name.toLowerCase().includes(query) ||
                (s.description && s.description.toLowerCase().includes(query))
            );
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    const getTotalPositions = (service) => {
        if (!service.positions || !Array.isArray(service.positions)) return 0;
        return service.positions.reduce((sum, p) => sum + (p.quantity || 1), 0);
    };

    const handleSelect = (service) => {
        // Return the positions array to the parent component
        onSelect(service.positions || []);
    };

    const toggleExpand = (serviceId) => {
        setExpandedServiceId(expandedServiceId === serviceId ? null : serviceId);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content service-picker-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Load Service</h2>
                    <button className="modal-close" onClick={onClose}>x</button>
                </div>

                <div className="modal-body">
                    <p className="help-text">
                        Select a service to add its positions to the workorder.
                    </p>

                    <div className="search-box relative">
                        <input
                            type="text"
                            placeholder="Search services..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                }
                            }}
                            autoFocus
                            className="pr-10"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div className="services-list">
                        {filteredServices.length === 0 ? (
                            <div className="no-services">
                                {services.length === 0
                                    ? 'No services have been created yet.'
                                    : 'No services match your search.'}
                            </div>
                        ) : (
                            filteredServices.map((service) => (
                                <div key={service.id} className="service-item">
                                    <div className="service-main" onClick={() => toggleExpand(service.id)}>
                                        <div className="service-info">
                                            <div className="service-name">{service.name}</div>
                                            {service.description && (
                                                <div className="service-description">{service.description}</div>
                                            )}
                                            <div className="service-meta">
                                                {getTotalPositions(service)} position{getTotalPositions(service) !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                        <div className="service-actions">
                                            <button
                                                className="btn-expand"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleExpand(service.id);
                                                }}
                                            >
                                                {expandedServiceId === service.id ? '▼' : '▶'}
                                            </button>
                                            <button
                                                className="btn-select"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelect(service);
                                                }}
                                            >
                                                Load
                                            </button>
                                        </div>
                                    </div>

                                    {expandedServiceId === service.id && service.positions && service.positions.length > 0 && (
                                        <div className="service-positions">
                                            {service.positions.map((p, i) => (
                                                <div key={i} className="position-item">
                                                    <span
                                                        className="position-badge"
                                                        style={{ backgroundColor: p.group_color || '#475569' }}
                                                    >
                                                        {p.group_name || 'Other'}
                                                    </span>
                                                    <span className="position-name">
                                                        {p.position_name}
                                                        {p.abbreviation && ` (${p.abbreviation})`}
                                                    </span>
                                                    {p.quantity > 1 && (
                                                        <span className="position-qty">x{p.quantity}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose}>
                        Cancel
                    </button>
                </div>

                <style>{`
                    .service-picker-modal {
                        max-width: 500px;
                        width: 95%;
                        max-height: 80vh;
                        display: flex;
                        flex-direction: column;
                    }
                    .modal-body {
                        flex: 1;
                        overflow-y: auto;
                        padding: 1rem;
                    }
                    .help-text {
                        color: #94a3b8;
                        font-size: 0.875rem;
                        margin-bottom: 1rem;
                    }
                    .search-box {
                        margin-bottom: 1rem;
                    }
                    .search-box input {
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(30, 41, 59, 0.8);
                        border: 1px solid rgba(148, 163, 184, 0.2);
                        border-radius: 8px;
                        color: #f1f5f9;
                        font-size: 0.9rem;
                    }
                    .search-box input:focus {
                        outline: none;
                        border-color: #3b82f6;
                    }
                    .services-list {
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                    }
                    .no-services {
                        text-align: center;
                        color: #64748b;
                        padding: 2rem;
                        font-style: italic;
                    }
                    .service-item {
                        background: rgba(30, 41, 59, 0.5);
                        border: 1px solid rgba(148, 163, 184, 0.1);
                        border-radius: 8px;
                        overflow: hidden;
                    }
                    .service-main {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 0.75rem;
                        cursor: pointer;
                        transition: background 0.2s;
                    }
                    .service-main:hover {
                        background: rgba(59, 130, 246, 0.1);
                    }
                    .service-info {
                        flex: 1;
                    }
                    .service-name {
                        font-weight: 500;
                        color: #f1f5f9;
                    }
                    .service-description {
                        font-size: 0.8rem;
                        color: #64748b;
                        margin-top: 0.25rem;
                    }
                    .service-meta {
                        font-size: 0.75rem;
                        color: #94a3b8;
                        margin-top: 0.25rem;
                    }
                    .service-actions {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    }
                    .btn-expand {
                        background: transparent;
                        border: none;
                        color: #64748b;
                        cursor: pointer;
                        padding: 0.25rem 0.5rem;
                        font-size: 0.75rem;
                    }
                    .btn-select {
                        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                        color: white;
                        border: none;
                        padding: 0.5rem 1rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.85rem;
                        font-weight: 500;
                    }
                    .btn-select:hover {
                        opacity: 0.9;
                    }
                    .service-positions {
                        border-top: 1px solid rgba(148, 163, 184, 0.1);
                        padding: 0.75rem;
                        background: rgba(15, 23, 42, 0.5);
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                    }
                    .position-item {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        font-size: 0.85rem;
                    }
                    .position-badge {
                        font-size: 0.65rem;
                        padding: 0.15rem 0.4rem;
                        border-radius: 4px;
                        color: white;
                    }
                    .position-name {
                        color: #e2e8f0;
                    }
                    .position-qty {
                        color: #94a3b8;
                        font-size: 0.8rem;
                    }
                    .modal-footer {
                        padding: 1rem;
                        border-top: 1px solid rgba(148, 163, 184, 0.1);
                        display: flex;
                        justify-content: flex-end;
                    }
                    .btn-cancel {
                        background: transparent;
                        color: #94a3b8;
                        border: 1px solid rgba(148, 163, 184, 0.3);
                        padding: 0.5rem 1rem;
                        border-radius: 6px;
                        cursor: pointer;
                    }
                `}</style>
            </div>
        </div>
    );
}

export default ServicePickerModal;
