import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';

/**
 * ResourcePickerModal - A modal for selecting multiple resources at once
 * Inspired by legacy "Resources List" window with filtering and multi-select
 */
export default function ResourcePickerModal({
    isOpen,
    onClose,
    onSelect,
    resources = [],
    positions = [],
    positionGroups = [],
    existingResourceIds = [] // Resources already assigned to prevent duplicates
}) {
    const [searchText, setSearchText] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [selectedPositionId, setSelectedPositionId] = useState('');
    const [availableOnly, setAvailableOnly] = useState(false);
    const [viewMode, setViewMode] = useState('by_name'); // 'by_name', 'by_type', 'by_category'
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [lastClickedId, setLastClickedId] = useState(null);
    const [allPositionGroups, setAllPositionGroups] = useState([]);

    // Fetch position groups if not provided
    useEffect(() => {
        if (positionGroups.length === 0) {
            api.getPositionGroups().then(setAllPositionGroups).catch(console.error);
        } else {
            setAllPositionGroups(positionGroups);
        }
    }, [positionGroups]);

    // Reset selection when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedIds(new Set());
            setSearchText('');
        }
    }, [isOpen]);

    // Create flattened list: one row per resource+position combination
    // If a resource has no positions, they get one row with no position info
    const flattenedResources = useMemo(() => {
        const staffResources = resources.filter(r => r.type === 'STAFF');
        const flattened = [];

        staffResources.forEach(resource => {
            // Exclude already assigned resources
            if (existingResourceIds.includes(resource.id)) return;

            if (resource.positions && resource.positions.length > 0) {
                // Create one row per position
                resource.positions.forEach(rp => {
                    const fullPosition = positions.find(p => p.id === rp.position_id);
                    const group = allPositionGroups.find(g => g.id === rp.group_id);

                    flattened.push({
                        resourceId: resource.id,
                        resource: resource,
                        positionId: rp.position_id,
                        positionName: fullPosition ? (fullPosition.abbreviation || fullPosition.name) : '-',
                        groupId: rp.group_id,
                        groupName: group ? group.name : '-',
                        name: resource.name,
                        // Unique key for this row
                        rowKey: `${resource.id}-${rp.position_id}`
                    });
                });
            } else {
                // Resource with no positions - show once
                flattened.push({
                    resourceId: resource.id,
                    resource: resource,
                    positionId: null,
                    positionName: '-',
                    groupId: null,
                    groupName: '-',
                    name: resource.name,
                    rowKey: `${resource.id}-none`
                });
            }
        });

        return flattened;
    }, [resources, positions, allPositionGroups, existingResourceIds]);

    // Filter the flattened list
    const filteredRows = useMemo(() => {
        let filtered = [...flattenedResources];

        // Search filter
        if (searchText.trim()) {
            const query = searchText.toLowerCase();
            filtered = filtered.filter(row =>
                row.name?.toLowerCase().includes(query) ||
                row.resource.first_name?.toLowerCase().includes(query) ||
                row.resource.last_name?.toLowerCase().includes(query) ||
                row.resource.email?.toLowerCase().includes(query) ||
                row.positionName?.toLowerCase().includes(query)
            );
        }

        // Group filter
        if (selectedGroupId) {
            filtered = filtered.filter(row => row.groupId === parseInt(selectedGroupId));
        }

        // Position filter
        if (selectedPositionId) {
            filtered = filtered.filter(row => row.positionId === parseInt(selectedPositionId));
        }

        // Sort based on view mode
        switch (viewMode) {
            case 'by_type': // By Position
                filtered.sort((a, b) => {
                    const posCompare = (a.positionName || '').localeCompare(b.positionName || '');
                    if (posCompare !== 0) return posCompare;
                    return (a.name || '').localeCompare(b.name || '');
                });
                break;
            case 'by_category': // By Position Group
                filtered.sort((a, b) => {
                    const groupCompare = (a.groupName || '').localeCompare(b.groupName || '');
                    if (groupCompare !== 0) return groupCompare;
                    return (a.name || '').localeCompare(b.name || '');
                });
                break;
            case 'by_name':
            default:
                filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }

        return filtered;
    }, [flattenedResources, searchText, selectedGroupId, selectedPositionId, viewMode]);

    // Get positions for selected group
    const groupPositions = useMemo(() => {
        if (!selectedGroupId) return positions;
        return positions.filter(p => p.group_id === parseInt(selectedGroupId));
    }, [selectedGroupId, positions]);

    const toggleSelection = (rowKey) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(rowKey)) {
                next.delete(rowKey);
            } else {
                next.add(rowKey);
            }
            return next;
        });
    };

    const selectAll = () => {
        // Select all filtered rows by their unique rowKey
        const uniqueKeys = filteredRows.map(r => r.rowKey);
        setSelectedIds(new Set(uniqueKeys));
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
    };

    const handleConfirmSelection = () => {
        // Return the full row objects which contain resource info AND position info
        const selectedRows = filteredRows.filter(r => selectedIds.has(r.rowKey));
        onSelect(selectedRows);
        onClose();
    };

    // Get display info for a resource - look up actual position names from positions prop
    const getResourcePositionInfo = (resource) => {
        if (!resource.positions || resource.positions.length === 0) {
            return '-';
        }

        // resource.positions contains {position_id, group_id} objects
        // We need to look up the actual position name from the positions prop
        const positionNames = resource.positions
            .map(rp => {
                const fullPosition = positions.find(p => p.id === rp.position_id);
                if (fullPosition) {
                    return fullPosition.abbreviation || fullPosition.name;
                }
                return null;
            })
            .filter(Boolean);

        return positionNames.length > 0 ? positionNames.join(', ') : '-';
    };

    const handleRowClick = (e, rowKey) => {
        // Prevent default text selection
        if (e.shiftKey) {
            window.getSelection()?.removeAllRanges();
        }

        // Handle modifier keys
        if (e.metaKey || e.ctrlKey) {
            // Toggle individual
            toggleSelection(rowKey);
            setLastClickedId(rowKey);
        } else if (e.shiftKey && lastClickedId) {
            // Range select based on row indices
            const currentIndex = filteredRows.findIndex(r => r.rowKey === rowKey);
            const lastIndex = filteredRows.findIndex(r => r.rowKey === lastClickedId);

            if (currentIndex !== -1 && lastIndex !== -1) {
                const start = Math.min(currentIndex, lastIndex);
                const end = Math.max(currentIndex, lastIndex);

                const rangeKeys = filteredRows.slice(start, end + 1).map(r => r.rowKey);

                setSelectedIds(prev => {
                    const next = new Set(prev);
                    rangeKeys.forEach(key => next.add(key));
                    return next;
                });
            }
        } else {
            // Simple click - select ONLY this one
            setSelectedIds(new Set([rowKey]));
            setLastClickedId(rowKey);
        }
    };

    // Get position group names for a resource
    const getResourceGroupInfo = (resource) => {
        if (!resource.positions || resource.positions.length === 0) {
            return '-';
        }

        // Get unique group IDs from the resource's positions
        const groupIds = [...new Set(resource.positions.map(rp => rp.group_id).filter(Boolean))];

        // Look up group names from allPositionGroups
        const groupNames = groupIds
            .map(gid => {
                const group = allPositionGroups.find(g => g.id === gid);
                return group ? group.name : null;
            })
            .filter(Boolean);

        return groupNames.length > 0 ? groupNames.join(', ') : '-';
    };

    if (!isOpen) return null;

    return (
        <div className="resource-picker-overlay">
            <div className="resource-picker-modal">
                {/* Header */}
                <div className="rp-header">
                    <h3>📋 Resources List</h3>
                    <button onClick={onClose} className="rp-close-btn">✕</button>
                </div>

                {/* Filters Bar */}
                <div className="rp-filters" onKeyDown={(e) => {
                    if (e.key === 'Enter') e.preventDefault();
                }}>
                    <div className="rp-filter-row">
                        <div className="rp-filter-group">
                            <label>Find:</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    placeholder="Search resources..."
                                    className="rp-search-input pr-8"
                                />
                                {searchText && (
                                    <button
                                        onClick={() => setSearchText('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors text-xs"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="rp-filter-group">
                            <label>Position Group:</label>
                            <select
                                value={selectedGroupId}
                                onChange={(e) => {
                                    setSelectedGroupId(e.target.value);
                                    setSelectedPositionId(''); // Reset position when group changes
                                }}
                                className="rp-select"
                            >
                                <option value="">All Groups</option>
                                {allPositionGroups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="rp-filter-group">
                            <label>Position:</label>
                            <select
                                value={selectedPositionId}
                                onChange={(e) => setSelectedPositionId(e.target.value)}
                                className="rp-select"
                            >
                                <option value="">All Positions</option>
                                {groupPositions.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.abbreviation || p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="rp-filter-group rp-checkbox-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={availableOnly}
                                    onChange={(e) => setAvailableOnly(e.target.checked)}
                                />
                                Avail. Only
                            </label>
                        </div>
                    </div>
                </div>

                {/* View Mode Tabs */}
                <div className="rp-tabs">
                    <button
                        className={`rp-tab ${viewMode === 'by_name' ? 'active' : ''}`}
                        onClick={() => setViewMode('by_name')}
                    >
                        By Description
                    </button>
                    <button
                        className={`rp-tab ${viewMode === 'by_type' ? 'active' : ''}`}
                        onClick={() => setViewMode('by_type')}
                    >
                        By Position
                    </button>
                    <button
                        className={`rp-tab ${viewMode === 'by_category' ? 'active' : ''}`}
                        onClick={() => setViewMode('by_category')}
                    >
                        By Position Group
                    </button>
                    <div className="rp-tab-actions">
                        <button onClick={selectAll} className="rp-action-btn">Select All</button>
                        <button onClick={clearSelection} className="rp-action-btn">Clear</button>
                    </div>
                </div>

                {/* Resources Table */}
                <div className="rp-table-wrapper">
                    <table className="rp-table">
                        <thead>
                            <tr>
                                <th className="rp-th-checkbox"></th>
                                <th>Position</th>
                                <th>Position Group</th>
                                <th>Description / Name</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="rp-empty">
                                        No resources found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map(row => (
                                    <tr
                                        key={row.rowKey}
                                        className={selectedIds.has(row.rowKey) ? 'rp-row-selected' : ''}
                                        onClick={(e) => handleRowClick(e, row.rowKey)}
                                    >
                                        <td className="rp-td-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(row.rowKey)}
                                                onChange={() => toggleSelection(row.rowKey)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </td>
                                        <td className="rp-td-type">
                                            {row.positionName}
                                        </td>
                                        <td className="rp-td-category">
                                            {row.groupName}
                                        </td>
                                        <td className="rp-td-name">
                                            {row.name}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="rp-footer">
                    <div className="rp-selection-count">
                        {selectedIds.size} resource{selectedIds.size !== 1 ? 's' : ''} selected
                    </div>
                    <div className="rp-footer-actions">
                        <button
                            onClick={handleConfirmSelection}
                            disabled={selectedIds.size === 0}
                            className="rp-btn-select"
                        >
                            ✓ Select
                        </button>
                        <button onClick={onClose} className="rp-btn-close">
                            Close
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .resource-picker-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .resource-picker-modal {
                    background: #1e293b;
                    border: 1px solid #475569;
                    border-radius: 8px;
                    width: 95%;
                    max-width: 1100px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }

                .rp-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background: #0f172a;
                    border-bottom: 1px solid #334155;
                    border-radius: 8px 8px 0 0;
                }

                .rp-header h3 {
                    margin: 0;
                    font-size: 1rem;
                    color: #e2e8f0;
                }

                .rp-close-btn {
                    background: none;
                    border: none;
                    color: #94a3b8;
                    font-size: 1.25rem;
                    cursor: pointer;
                }
                .rp-close-btn:hover {
                    color: #fff;
                }

                .rp-filters {
                    padding: 12px 16px;
                    background: #334155;
                    border-bottom: 1px solid #475569;
                }

                .rp-filter-row {
                    display: flex;
                    gap: 16px;
                    flex-wrap: wrap;
                    align-items: flex-end;
                }

                .rp-filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .rp-filter-group label {
                    font-size: 0.7rem;
                    text-transform: uppercase;
                    color: #94a3b8;
                    font-weight: 600;
                }

                .rp-search-input {
                    padding: 6px 10px;
                    background: #0f172a;
                    border: 1px solid #475569;
                    border-radius: 4px;
                    color: #f1f5f9;
                    font-size: 0.85rem;
                    width: 180px;
                }

                .rp-select {
                    padding: 6px 10px;
                    background: #0f172a;
                    border: 1px solid #475569;
                    border-radius: 4px;
                    color: #f1f5f9;
                    font-size: 0.85rem;
                    min-width: 140px;
                }

                .rp-checkbox-group {
                    flex-direction: row !important;
                    align-items: center !important;
                }

                .rp-checkbox-group label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.8rem;
                    cursor: pointer;
                }

                .rp-tabs {
                    display: flex;
                    gap: 0;
                    background: #1e293b;
                    border-bottom: 1px solid #334155;
                    padding: 0 8px;
                }

                .rp-tab {
                    padding: 8px 16px;
                    background: transparent;
                    border: none;
                    border-bottom: 2px solid transparent;
                    color: #94a3b8;
                    font-size: 0.8rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .rp-tab:hover {
                    color: #e2e8f0;
                }

                .rp-tab.active {
                    color: #3b82f6;
                    border-bottom-color: #3b82f6;
                }

                .rp-tab-actions {
                    margin-left: auto;
                    display: flex;
                    gap: 8px;
                    padding: 6px 0;
                }

                .rp-action-btn {
                    padding: 4px 10px;
                    background: #475569;
                    border: none;
                    border-radius: 4px;
                    color: #e2e8f0;
                    font-size: 0.75rem;
                    cursor: pointer;
                }
                .rp-action-btn:hover {
                    background: #64748b;
                }

                .rp-table-wrapper {
                    flex: 1;
                    overflow: auto;
                    background: #0f172a;
                }

                .rp-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.8rem;
                }

                .rp-table th {
                    background: #1e293b;
                    color: #94a3b8;
                    font-weight: 600;
                    text-align: left;
                    padding: 8px 12px;
                    border-bottom: 1px solid #334155;
                    position: sticky;
                    top: 0;
                    z-index: 1;
                }

                .rp-th-checkbox {
                    width: 40px;
                }

                .rp-table td {
                    padding: 6px 12px;
                    border-bottom: 1px solid #1e293b;
                    color: #cbd5e1;
                }

                .rp-table tbody tr {
                    cursor: pointer;
                    transition: background 0.1s;
                }

                .rp-table tbody tr:hover {
                    background: #334155;
                }

                .rp-row-selected {
                    background: #1e40af !important;
                }

                .rp-row-selected td {
                    color: #fff;
                }

                .rp-td-checkbox {
                    text-align: center;
                }

                .rp-td-type {
                    color: #60a5fa;
                    font-weight: 500;
                }

                .rp-td-category {
                    color: #94a3b8;
                }

                .rp-td-name {
                    color: #f1f5f9;
                }

                .rp-empty {
                    text-align: center;
                    color: #64748b;
                    padding: 32px !important;
                }

                .rp-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background: #0f172a;
                    border-top: 1px solid #334155;
                    border-radius: 0 0 8px 8px;
                }

                .rp-selection-count {
                    color: #94a3b8;
                    font-size: 0.85rem;
                }

                .rp-footer-actions {
                    display: flex;
                    gap: 8px;
                }

                .rp-btn-select {
                    padding: 8px 20px;
                    background: linear-gradient(135deg, #22c55e, #16a34a);
                    border: none;
                    border-radius: 4px;
                    color: #fff;
                    font-weight: 600;
                    font-size: 0.85rem;
                    cursor: pointer;
                }
                .rp-btn-select:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .rp-btn-select:not(:disabled):hover {
                    opacity: 0.9;
                }

                .rp-btn-close {
                    padding: 8px 20px;
                    background: #475569;
                    border: none;
                    border-radius: 4px;
                    color: #e2e8f0;
                    font-size: 0.85rem;
                    cursor: pointer;
                }
                .rp-btn-close:hover {
                    background: #64748b;
                }
            `}</style>
        </div>
    );
}
