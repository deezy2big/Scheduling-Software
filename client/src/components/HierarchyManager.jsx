import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
function HierarchyManager() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    const [groups, setGroups] = useState([]);
    const [categories, setCategories] = useState([]);
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filter state
    const [search, setSearch] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);

    // CRUD modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [editingItem, setEditingItem] = useState(null);

    // Admin structure panel state
    const [showStructurePanel, setShowStructurePanel] = useState(false);
    const [structureTab, setStructureTab] = useState('groups');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [groupsData, categoriesData, typesData] = await Promise.all([
                api.getGroups(),
                api.getCategories(),
                api.getTypes()
            ]);
            setGroups(groupsData);
            setCategories(categoriesData);
            setTypes(typesData);
            setError('');
        } catch (err) {
            setError('Failed to load roles: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Filtering ──────────────────────────────────────────────
    const visibleCategories = useMemo(() =>
        selectedGroupId
            ? categories.filter(c => c.group_id === selectedGroupId)
            : [],
        [categories, selectedGroupId]
    );

    const filteredTypes = useMemo(() => {
        const q = search.toLowerCase().trim();
        return types
            .filter(t => !selectedGroupId || t.group_id === selectedGroupId)
            .filter(t => !selectedCategoryId || t.category_id === selectedCategoryId)
            .filter(t => !q || [t.abbreviation, t.name, t.category_name, t.group_name]
                .some(v => v?.toLowerCase().includes(q)));
    }, [types, selectedGroupId, selectedCategoryId, search]);

    // ── Group chip handler ─────────────────────────────────────
    const handleGroupChip = (groupId) => {
        if (selectedGroupId === groupId) {
            setSelectedGroupId(null);
        } else {
            setSelectedGroupId(groupId);
        }
        setSelectedCategoryId(null);
    };

    // ── CRUD handlers ──────────────────────────────────────────
    const handleCreate = (type) => {
        setModalMode('create');
        setEditingItem({ type });
        setIsModalOpen(true);
    };

    const handleEdit = (item, type) => {
        setModalMode('edit');
        setEditingItem({ ...item, type });
        setIsModalOpen(true);
    };

    const handleDelete = async (id, type) => {
        if (!window.confirm(`Delete this ${type}? This cannot be undone.`)) return;
        try {
            if (type === 'group') await api.deleteGroup(id);
            else if (type === 'category') await api.deleteCategory(id);
            else if (type === 'type') await api.deleteType(id);
            await fetchData();
        } catch (err) {
            setError(`Failed to delete: ` + err.message);
        }
    };

    if (loading) {
        return <div className="rbc-loading">Loading roles...</div>;
    }

    return (
        <div className="rbc-page">
            {/* ── Header ─────────────────────────────────────── */}
            <div className="rbc-header">
                <div>
                    <h1>Roles &amp; Billing Codes</h1>
                    <p className="rbc-subtitle">
                        Browse and search {types.length} roles across {groups.length} departments
                    </p>
                </div>
                {isAdmin && (
                    <button
                        className="rbc-btn-structure"
                        onClick={() => setShowStructurePanel(true)}
                    >
                        ⚙ Manage Structure
                    </button>
                )}
            </div>

            {error && <div className="rbc-error">{error}</div>}

            {/* ── Search ─────────────────────────────────────── */}
            <div className="rbc-search-row">
                <div className="rbc-search-wrap">
                    <span className="rbc-search-icon">🔍</span>
                    <input
                        type="text"
                        className="rbc-search"
                        placeholder="Search by billing code, role name, or department…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="rbc-clear" onClick={() => setSearch('')}>×</button>
                    )}
                </div>
            </div>

            {/* ── Group chips ────────────────────────────────── */}
            <div className="rbc-chips">
                <button
                    className={`rbc-chip ${!selectedGroupId ? 'active' : ''}`}
                    onClick={() => { setSelectedGroupId(null); setSelectedCategoryId(null); }}
                >
                    All
                    <span className="rbc-chip-count">{types.length}</span>
                </button>
                {groups.map(g => {
                    const count = types.filter(t => t.group_id === g.id).length;
                    return (
                        <button
                            key={g.id}
                            className={`rbc-chip ${selectedGroupId === g.id ? 'active' : ''}`}
                            style={selectedGroupId === g.id ? { borderColor: g.color, color: g.color } : {}}
                            onClick={() => handleGroupChip(g.id)}
                        >
                            <span
                                className="rbc-chip-dot"
                                style={{ backgroundColor: g.color }}
                            />
                            {g.name}
                            <span className="rbc-chip-count">{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── Category sub-chips (only when group selected) ── */}
            {selectedGroupId && visibleCategories.length > 1 && (
                <div className="rbc-chips rbc-chips-sub">
                    <button
                        className={`rbc-chip rbc-chip-sm ${!selectedCategoryId ? 'active' : ''}`}
                        onClick={() => setSelectedCategoryId(null)}
                    >
                        All departments
                    </button>
                    {visibleCategories.map(c => {
                        const count = types.filter(t => t.category_id === c.id).length;
                        return (
                            <button
                                key={c.id}
                                className={`rbc-chip rbc-chip-sm ${selectedCategoryId === c.id ? 'active' : ''}`}
                                onClick={() => setSelectedCategoryId(
                                    selectedCategoryId === c.id ? null : c.id
                                )}
                            >
                                {c.name}
                                <span className="rbc-chip-count">{count}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Table ──────────────────────────────────────── */}
            <div className="rbc-table-wrap">
                <div className="rbc-table-toolbar">
                    <span className="rbc-count-label">
                        Showing <strong>{filteredTypes.length}</strong> of {types.length} roles
                        {(selectedGroupId || selectedCategoryId || search) && (
                            <button
                                className="rbc-clear-filters"
                                onClick={() => { setSearch(''); setSelectedGroupId(null); setSelectedCategoryId(null); }}
                            >
                                Clear filters
                            </button>
                        )}
                    </span>
                    {isAdmin && (
                        <button
                            className="rbc-btn-add"
                            onClick={() => handleCreate('type')}
                        >
                            + Add Role
                        </button>
                    )}
                </div>

                <table className="rbc-table">
                    <thead>
                        <tr>
                            <th style={{ width: '9rem' }}>Billing Code</th>
                            <th>Role Name</th>
                            <th>Department</th>
                            <th>Group</th>
                            <th style={{ width: '6rem', textAlign: 'center' }}>Assigned</th>
                            {isAdmin && <th style={{ width: '8rem' }}>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTypes.length === 0 ? (
                            <tr>
                                <td colSpan={isAdmin ? 6 : 5} className="rbc-empty">
                                    {search || selectedGroupId
                                        ? 'No roles match your search or filters.'
                                        : 'No roles found.'}
                                </td>
                            </tr>
                        ) : (
                            filteredTypes.map(type => (
                                <tr key={type.id}>
                                    <td>
                                        <span className="rbc-code">{type.abbreviation || '—'}</span>
                                    </td>
                                    <td className="rbc-role-name">{type.name}</td>
                                    <td>
                                        <span
                                            className="rbc-dept-badge"
                                            style={{ borderColor: type.group_color + '55', color: type.group_color }}
                                        >
                                            {type.category_name}
                                        </span>
                                    </td>
                                    <td className="rbc-group-cell">
                                        <span
                                            className="rbc-group-dot"
                                            style={{ backgroundColor: type.group_color }}
                                        />
                                        {type.group_name}
                                    </td>
                                    <td style={{ textAlign: 'center' }} className="rbc-assigned">
                                        {type.resource_count || 0}
                                    </td>
                                    {isAdmin && (
                                        <td>
                                            <div className="rbc-row-actions">
                                                <button
                                                    className="rbc-btn-sm"
                                                    onClick={() => handleEdit(type, 'type')}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="rbc-btn-sm rbc-btn-danger"
                                                    onClick={() => handleDelete(type.id, 'type')}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Role CRUD Modal ─────────────────────────────── */}
            {isModalOpen && (
                <HierarchyModal
                    mode={modalMode}
                    item={editingItem}
                    groups={groups}
                    categories={categories}
                    onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
                    onSave={async () => { await fetchData(); setIsModalOpen(false); setEditingItem(null); }}
                />
            )}

            {/* ── Manage Structure Panel (admin only) ────────── */}
            {showStructurePanel && (
                <StructurePanel
                    groups={groups}
                    categories={categories}
                    activeTab={structureTab}
                    onTabChange={setStructureTab}
                    onEdit={handleEdit}
                    onCreate={handleCreate}
                    onDelete={handleDelete}
                    onClose={() => setShowStructurePanel(false)}
                />
            )}

            <style>{`
                .rbc-page {
                    padding: 2rem;
                    max-width: 1400px;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }

                .rbc-loading {
                    padding: 3rem;
                    text-align: center;
                    color: #94a3b8;
                }

                /* Header */
                .rbc-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .rbc-header h1 {
                    font-size: 1.875rem;
                    font-weight: 700;
                    color: #f1f5f9;
                    margin: 0 0 0.25rem 0;
                }

                .rbc-subtitle {
                    color: #94a3b8;
                    font-size: 0.9rem;
                    margin: 0;
                }

                .rbc-btn-structure {
                    background: rgba(148, 163, 184, 0.1);
                    color: #cbd5e1;
                    border: 1px solid rgba(148, 163, 184, 0.25);
                    padding: 0.6rem 1.1rem;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    white-space: nowrap;
                }

                .rbc-btn-structure:hover {
                    background: rgba(148, 163, 184, 0.18);
                    color: #f1f5f9;
                }

                .rbc-error {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    color: #fca5a5;
                    padding: 0.75rem 1rem;
                    border-radius: 8px;
                    font-size: 0.9rem;
                }

                /* Search */
                .rbc-search-row {
                    display: flex;
                }

                .rbc-search-wrap {
                    position: relative;
                    flex: 1;
                }

                .rbc-search-icon {
                    position: absolute;
                    left: 0.875rem;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 0.95rem;
                    pointer-events: none;
                }

                .rbc-search {
                    width: 100%;
                    padding: 0.75rem 2.75rem 0.75rem 2.5rem;
                    background: rgba(15, 23, 42, 0.6);
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    border-radius: 10px;
                    color: #f1f5f9;
                    font-size: 0.95rem;
                    box-sizing: border-box;
                    transition: border-color 0.2s;
                }

                .rbc-search:focus {
                    outline: none;
                    border-color: #3b82f6;
                }

                .rbc-search::placeholder {
                    color: #475569;
                }

                .rbc-clear {
                    position: absolute;
                    right: 0.75rem;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: #64748b;
                    font-size: 1.25rem;
                    cursor: pointer;
                    line-height: 1;
                    padding: 0;
                }

                .rbc-clear:hover { color: #94a3b8; }

                /* Chips */
                .rbc-chips {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }

                .rbc-chips-sub {
                    padding-left: 0.25rem;
                    border-left: 2px solid rgba(148, 163, 184, 0.15);
                    margin-left: 0.25rem;
                }

                .rbc-chip {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                    padding: 0.45rem 0.875rem;
                    background: rgba(15, 23, 42, 0.6);
                    border: 1px solid rgba(148, 163, 184, 0.18);
                    border-radius: 999px;
                    color: #94a3b8;
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.15s;
                }

                .rbc-chip:hover {
                    background: rgba(59, 130, 246, 0.08);
                    border-color: rgba(59, 130, 246, 0.3);
                    color: #e2e8f0;
                }

                .rbc-chip.active {
                    background: rgba(59, 130, 246, 0.15);
                    border-color: #3b82f6;
                    color: #60a5fa;
                }

                .rbc-chip-sm {
                    padding: 0.3rem 0.75rem;
                    font-size: 0.8rem;
                }

                .rbc-chip-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }

                .rbc-chip-count {
                    background: rgba(148, 163, 184, 0.15);
                    padding: 0.05rem 0.45rem;
                    border-radius: 999px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #64748b;
                }

                .rbc-chip.active .rbc-chip-count {
                    background: rgba(59, 130, 246, 0.2);
                    color: #93c5fd;
                }

                /* Table */
                .rbc-table-wrap {
                    background: rgba(15, 23, 42, 0.4);
                    border: 1px solid rgba(148, 163, 184, 0.1);
                    border-radius: 12px;
                    overflow: hidden;
                }

                .rbc-table-toolbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.875rem 1.25rem;
                    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
                    background: rgba(15, 23, 42, 0.3);
                }

                .rbc-count-label {
                    font-size: 0.875rem;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .rbc-count-label strong {
                    color: #94a3b8;
                }

                .rbc-clear-filters {
                    background: none;
                    border: none;
                    color: #3b82f6;
                    font-size: 0.8rem;
                    cursor: pointer;
                    padding: 0;
                    text-decoration: underline;
                }

                .rbc-btn-add {
                    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 7px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: opacity 0.15s;
                }

                .rbc-btn-add:hover { opacity: 0.88; }

                .rbc-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .rbc-table th {
                    background: rgba(15, 23, 42, 0.5);
                    color: #64748b;
                    text-align: left;
                    padding: 0.75rem 1rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    white-space: nowrap;
                }

                .rbc-table td {
                    padding: 0.75rem 1rem;
                    border-bottom: 1px solid rgba(148, 163, 184, 0.07);
                    color: #cbd5e1;
                    font-size: 0.9rem;
                    vertical-align: middle;
                }

                .rbc-table tbody tr:hover td {
                    background: rgba(59, 130, 246, 0.04);
                }

                .rbc-table tbody tr:last-child td {
                    border-bottom: none;
                }

                .rbc-code {
                    font-family: 'SF Mono', 'Fira Code', monospace;
                    font-size: 0.825rem;
                    background: rgba(59, 130, 246, 0.1);
                    color: #60a5fa;
                    padding: 0.2rem 0.5rem;
                    border-radius: 5px;
                    letter-spacing: 0.03em;
                    font-weight: 600;
                    white-space: nowrap;
                }

                .rbc-role-name {
                    font-weight: 500;
                    color: #e2e8f0;
                }

                .rbc-dept-badge {
                    display: inline-block;
                    padding: 0.2rem 0.6rem;
                    border-radius: 5px;
                    border: 1px solid;
                    font-size: 0.78rem;
                    font-weight: 500;
                    white-space: nowrap;
                }

                .rbc-group-cell {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #94a3b8;
                    font-size: 0.875rem;
                }

                .rbc-group-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }

                .rbc-assigned {
                    color: #64748b;
                    font-size: 0.875rem;
                }

                .rbc-empty {
                    text-align: center;
                    color: #475569;
                    padding: 3rem;
                    font-style: italic;
                }

                .rbc-row-actions {
                    display: flex;
                    gap: 0.4rem;
                }

                .rbc-btn-sm {
                    padding: 0.25rem 0.65rem;
                    font-size: 0.78rem;
                    background: rgba(59, 130, 246, 0.1);
                    color: #60a5fa;
                    border: 1px solid rgba(59, 130, 246, 0.25);
                    border-radius: 5px;
                    cursor: pointer;
                    transition: all 0.15s;
                    white-space: nowrap;
                }

                .rbc-btn-sm:hover {
                    background: rgba(59, 130, 246, 0.2);
                }

                .rbc-btn-sm.rbc-btn-danger {
                    background: rgba(239, 68, 68, 0.08);
                    color: #f87171;
                    border-color: rgba(239, 68, 68, 0.25);
                }

                .rbc-btn-sm.rbc-btn-danger:hover {
                    background: rgba(239, 68, 68, 0.18);
                }
            `}</style>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Structure Panel (Admin only)
// ─────────────────────────────────────────────────────────────
function StructurePanel({ groups, categories, activeTab, onTabChange, onEdit, onCreate, onDelete, onClose }) {
    return (
        <div className="sp-overlay" onClick={onClose}>
            <div className="sp-drawer" onClick={e => e.stopPropagation()}>
                <div className="sp-header">
                    <div>
                        <h2>Manage Structure</h2>
                        <p>Edit groups and departments</p>
                    </div>
                    <button className="sp-close" onClick={onClose}>×</button>
                </div>

                <div className="sp-tabs">
                    <button
                        className={`sp-tab ${activeTab === 'groups' ? 'active' : ''}`}
                        onClick={() => onTabChange('groups')}
                    >
                        Groups ({groups.length})
                    </button>
                    <button
                        className={`sp-tab ${activeTab === 'categories' ? 'active' : ''}`}
                        onClick={() => onTabChange('categories')}
                    >
                        Departments ({categories.length})
                    </button>
                </div>

                <div className="sp-body">
                    {activeTab === 'groups' && (
                        <>
                            <div className="sp-toolbar">
                                <button className="sp-btn-add" onClick={() => onCreate('group')}>
                                    + Add Group
                                </button>
                            </div>
                            <div className="sp-list">
                                {groups.map(g => (
                                    <div key={g.id} className="sp-item">
                                        <span className="sp-dot" style={{ backgroundColor: g.color }} />
                                        <span className="sp-item-name">{g.name}</span>
                                        <span className="sp-item-meta">{g.category_count || 0} depts</span>
                                        <div className="sp-item-actions">
                                            <button className="rbc-btn-sm" onClick={() => onEdit(g, 'group')}>Edit</button>
                                            <button className="rbc-btn-sm rbc-btn-danger" onClick={() => onDelete(g.id, 'group')}>Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {activeTab === 'categories' && (
                        <>
                            <div className="sp-toolbar">
                                <button className="sp-btn-add" onClick={() => onCreate('category')}>
                                    + Add Department
                                </button>
                            </div>
                            <div className="sp-list">
                                {categories.map(c => (
                                    <div key={c.id} className="sp-item">
                                        <span className="sp-dot" style={{ backgroundColor: c.color }} />
                                        <div className="sp-item-info">
                                            <span className="sp-item-name">{c.name}</span>
                                            <span className="sp-item-group">{c.group_name}</span>
                                        </div>
                                        <span className="sp-item-meta">{c.type_count || 0} roles</span>
                                        <div className="sp-item-actions">
                                            <button className="rbc-btn-sm" onClick={() => onEdit(c, 'category')}>Edit</button>
                                            <button className="rbc-btn-sm rbc-btn-danger" onClick={() => onDelete(c.id, 'category')}>Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <style>{`
                    .sp-overlay {
                        position: fixed;
                        inset: 0;
                        background: rgba(0,0,0,0.55);
                        z-index: 900;
                        display: flex;
                        justify-content: flex-end;
                    }

                    .sp-drawer {
                        width: 480px;
                        max-width: 95vw;
                        background: #1e293b;
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                        box-shadow: -8px 0 32px rgba(0,0,0,0.4);
                        animation: slideIn 0.2s ease;
                    }

                    @keyframes slideIn {
                        from { transform: translateX(100%); }
                        to   { transform: translateX(0); }
                    }

                    .sp-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        padding: 1.5rem;
                        border-bottom: 1px solid rgba(148,163,184,0.1);
                    }

                    .sp-header h2 {
                        color: #f1f5f9;
                        font-size: 1.2rem;
                        margin: 0 0 0.2rem 0;
                    }

                    .sp-header p {
                        color: #64748b;
                        font-size: 0.85rem;
                        margin: 0;
                    }

                    .sp-close {
                        background: none;
                        border: none;
                        color: #64748b;
                        font-size: 1.5rem;
                        cursor: pointer;
                        line-height: 1;
                        padding: 0;
                    }

                    .sp-close:hover { color: #f1f5f9; }

                    .sp-tabs {
                        display: flex;
                        padding: 0 1.5rem;
                        border-bottom: 1px solid rgba(148,163,184,0.1);
                        gap: 0.25rem;
                    }

                    .sp-tab {
                        padding: 0.75rem 1rem;
                        background: none;
                        border: none;
                        border-bottom: 2px solid transparent;
                        color: #64748b;
                        font-size: 0.875rem;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.15s;
                    }

                    .sp-tab:hover { color: #e2e8f0; }

                    .sp-tab.active {
                        color: #3b82f6;
                        border-bottom-color: #3b82f6;
                    }

                    .sp-body {
                        flex: 1;
                        overflow-y: auto;
                        padding: 1rem 1.5rem;
                    }

                    .sp-toolbar {
                        margin-bottom: 1rem;
                    }

                    .sp-btn-add {
                        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                        color: white;
                        border: none;
                        padding: 0.5rem 1rem;
                        border-radius: 7px;
                        font-size: 0.85rem;
                        font-weight: 600;
                        cursor: pointer;
                    }

                    .sp-btn-add:hover { opacity: 0.88; }

                    .sp-list {
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                    }

                    .sp-item {
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                        padding: 0.75rem 1rem;
                        background: rgba(15,23,42,0.5);
                        border: 1px solid rgba(148,163,184,0.08);
                        border-radius: 8px;
                    }

                    .sp-dot {
                        width: 10px;
                        height: 10px;
                        border-radius: 50%;
                        flex-shrink: 0;
                    }

                    .sp-item-info {
                        display: flex;
                        flex-direction: column;
                        flex: 1;
                        min-width: 0;
                    }

                    .sp-item-name {
                        color: #e2e8f0;
                        font-size: 0.9rem;
                        font-weight: 500;
                        flex: 1;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .sp-item-group {
                        color: #64748b;
                        font-size: 0.75rem;
                    }

                    .sp-item-meta {
                        color: #475569;
                        font-size: 0.78rem;
                        white-space: nowrap;
                    }

                    .sp-item-actions {
                        display: flex;
                        gap: 0.4rem;
                        flex-shrink: 0;
                    }
                `}</style>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// CRUD Modal (unchanged logic, updated styling)
// ─────────────────────────────────────────────────────────────
function HierarchyModal({ mode, item, groups, categories, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: item?.name || '',
        description: item?.description || '',
        color: item?.color || '#3B82F6',
        display_order: item?.display_order || 0,
        group_id: item?.group_id || '',
        category_id: item?.category_id || '',
        abbreviation: item?.abbreviation || '',
        hourly_rate: item?.hourly_rate || '0.00',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const data = {
                name: formData.name,
                description: formData.description || null,
                color: formData.color,
                display_order: parseInt(formData.display_order) || 0,
            };

            if (item.type === 'category') {
                data.group_id = parseInt(formData.group_id);
            }

            if (item.type === 'type') {
                data.category_id = parseInt(formData.category_id);
                data.abbreviation = formData.abbreviation || null;
                data.hourly_rate = parseFloat(formData.hourly_rate) || 0;
            }

            if (mode === 'create') {
                if (item.type === 'group') await api.createGroup(data);
                else if (item.type === 'category') await api.createCategory(data);
                else if (item.type === 'type') await api.createType(data);
            } else {
                if (item.type === 'group') await api.updateGroup(item.id, data);
                else if (item.type === 'category') await api.updateCategory(item.id, data);
                else if (item.type === 'type') await api.updateType(item.id, data);
            }

            onSave();
        } catch (err) {
            setError(err.message);
            setSaving(false);
        }
    };

    const typeLabel = item?.type === 'type' ? 'Role' : item?.type?.charAt(0).toUpperCase() + item?.type?.slice(1);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{mode === 'create' ? 'Add' : 'Edit'} {typeLabel}</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                {error && <div className="modal-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    {/* Billing code + name row for type */}
                    {item?.type === 'type' && (
                        <div className="form-row">
                            <div className="form-group">
                                <label>Billing Code</label>
                                <input
                                    type="text"
                                    value={formData.abbreviation}
                                    onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                                    placeholder="e.g., B.01"
                                />
                            </div>
                            <div className="form-group" style={{ flex: 2 }}>
                                <label>Role Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="e.g., Director"
                                />
                            </div>
                        </div>
                    )}

                    {item?.type !== 'type' && (
                        <div className="form-group">
                            <label>Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Enter name"
                            />
                        </div>
                    )}

                    {item?.type === 'category' && (
                        <div className="form-group">
                            <label>Group *</label>
                            <select
                                value={formData.group_id}
                                onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                                required
                            >
                                <option value="">Select Group…</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {item?.type === 'type' && (
                        <div className="form-group">
                            <label>Department *</label>
                            <select
                                value={formData.category_id}
                                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                required
                            >
                                <option value="">Select Department…</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} ({c.group_name})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {item?.type === 'type' && (
                        <div className="form-group">
                            <label>Hourly Rate</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.hourly_rate}
                                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                    )}

                    {item?.type !== 'type' && (
                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Optional"
                                rows="2"
                            />
                        </div>
                    )}

                    {item?.type !== 'type' && (
                        <div className="form-row">
                            <div className="form-group">
                                <label>Color</label>
                                <input
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Display Order</label>
                                <input
                                    type="number"
                                    value={formData.display_order}
                                    onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'Saving…' : mode === 'create' ? 'Add Role' : 'Save Changes'}
                        </button>
                    </div>
                </form>

                <style>{`
                    .modal-overlay {
                        position: fixed;
                        inset: 0;
                        background: rgba(0,0,0,0.7);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 1000;
                    }

                    .modal-content {
                        background: #1e293b;
                        border-radius: 12px;
                        width: 90%;
                        max-width: 480px;
                        max-height: 90vh;
                        overflow-y: auto;
                    }

                    .modal-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 1.25rem 1.5rem;
                        border-bottom: 1px solid rgba(148,163,184,0.1);
                    }

                    .modal-header h2 {
                        color: #f1f5f9;
                        font-size: 1.15rem;
                        margin: 0;
                    }

                    .modal-close {
                        background: none;
                        border: none;
                        color: #64748b;
                        font-size: 1.5rem;
                        cursor: pointer;
                        padding: 0;
                        width: 28px;
                        height: 28px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .modal-close:hover { color: #f1f5f9; }

                    .modal-error {
                        background: rgba(239,68,68,0.1);
                        border: 1px solid rgba(239,68,68,0.3);
                        color: #fca5a5;
                        padding: 0.65rem 1.5rem;
                        font-size: 0.875rem;
                    }

                    form {
                        padding: 1.25rem 1.5rem;
                        display: flex;
                        flex-direction: column;
                        gap: 1rem;
                    }

                    .form-group {
                        display: flex;
                        flex-direction: column;
                        gap: 0.4rem;
                        flex: 1;
                    }

                    .form-group label {
                        color: #94a3b8;
                        font-size: 0.78rem;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                    }

                    .form-group input,
                    .form-group select,
                    .form-group textarea {
                        padding: 0.65rem 0.875rem;
                        background: rgba(15,23,42,0.8);
                        border: 1px solid rgba(148,163,184,0.2);
                        border-radius: 7px;
                        color: #f1f5f9;
                        font-size: 0.9rem;
                        width: 100%;
                        box-sizing: border-box;
                    }

                    .form-group input:focus,
                    .form-group select:focus,
                    .form-group textarea:focus {
                        outline: none;
                        border-color: #3b82f6;
                    }

                    .form-row {
                        display: flex;
                        gap: 0.75rem;
                    }

                    .modal-actions {
                        display: flex;
                        justify-content: flex-end;
                        gap: 0.75rem;
                        padding-top: 0.5rem;
                    }

                    .btn-cancel {
                        padding: 0.6rem 1.25rem;
                        background: transparent;
                        color: #94a3b8;
                        border: 1px solid rgba(148,163,184,0.25);
                        border-radius: 7px;
                        cursor: pointer;
                        font-size: 0.875rem;
                    }

                    .btn-cancel:hover { background: rgba(148,163,184,0.08); }

                    .btn-primary {
                        padding: 0.6rem 1.25rem;
                        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                        color: white;
                        border: none;
                        border-radius: 7px;
                        font-size: 0.875rem;
                        font-weight: 600;
                        cursor: pointer;
                    }

                    .btn-primary:hover { opacity: 0.88; }
                    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                `}</style>
            </div>
        </div>
    );
}

export default HierarchyManager;
