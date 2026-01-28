import React from 'react';
import { highlightMatch } from '../../utils/highlight';

/**
 * ResourceCard component - Rich card view for resource search results
 * @param {Object} resource - Resource data
 * @param {string} query - Search query for highlighting
 * @param {Function} onClick - Callback when card is clicked
 */
const ResourceCard = ({ resource, query, onClick }) => {
    const {
        id,
        color,
        name,
        email,
        phone,
        type,
        status,
        pay_type,
        position_groups,
        created_at,
    } = resource;

    const handleClick = () => {
        if (onClick) onClick(resource);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    // Get type badge class and icon
    const getTypeInfo = (type) => {
        const typeMap = {
            'STAFF': { class: 'type-staff', icon: '👤' },
            'FACILITY': { class: 'type-facility', icon: '🏢' },
            'EQUIPMENT': { class: 'type-equipment', icon: '🔧' },
        };
        return typeMap[type] || { class: 'type-default', icon: '📦' };
    };

    // Get status badge class
    const getStatusClass = (status) => {
        const statusMap = {
            'ACTIVE': 'status-active',
            'INACTIVE': 'status-inactive',
            'MAINTENANCE': 'status-maintenance',
        };
        return statusMap[status] || 'status-default';
    };

    const typeInfo = getTypeInfo(type);

    return (
        <div className="search-card resource-card" onClick={handleClick}>
            {/* Color indicator */}
            <div className="card-color-bar" style={{ backgroundColor: color || '#999' }}></div>

            {/* Card header */}
            <div className="card-header">
                <div className="resource-header">
                    <div className="resource-avatar" style={{ backgroundColor: color || '#999' }}>
                        <span className="avatar-icon">{typeInfo.icon}</span>
                    </div>
                    <div className="resource-title-section">
                        <h3 className="card-title">
                            {query ? highlightMatch(name || 'Unnamed', query) : (name || 'Unnamed')}
                        </h3>
                        <div className="card-badges">
                            {type && (
                                <span className={`badge ${typeInfo.class}`}>
                                    {type}
                                </span>
                            )}
                            {status && (
                                <span className={`badge ${getStatusClass(status)}`}>
                                    {status}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Card body */}
            <div className="card-body">
                {email && (
                    <div className="card-field">
                        <span className="field-label">📧 Email:</span>
                        <span className="field-value">
                            {query ? highlightMatch(email, query) : email}
                        </span>
                    </div>
                )}

                {phone && (
                    <div className="card-field">
                        <span className="field-label">📞 Phone:</span>
                        <span className="field-value">{phone}</span>
                    </div>
                )}

                {pay_type && (
                    <div className="card-field">
                        <span className="field-label">💳 Pay Type:</span>
                        <span className="field-value">{pay_type}</span>
                    </div>
                )}

                {position_groups && position_groups.length > 0 && (
                    <div className="card-field">
                        <span className="field-label">🎯 Positions:</span>
                        <div className="position-tags">
                            {position_groups.map((group, index) => (
                                <span key={index} className="position-tag">
                                    {group}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Card footer */}
            <div className="card-footer">
                <div className="card-meta">
                    <span className="meta-item">
                        📅 {formatDate(created_at)}
                    </span>
                </div>
                <button className="card-action-btn" onClick={(e) => { e.stopPropagation(); handleClick(); }}>
                    View →
                </button>
            </div>
        </div>
    );
};

export default ResourceCard;
