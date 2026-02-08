import React, { useState, useEffect } from 'react';
import api from '../api';

function HierarchyManager() {
    const [groups, setGroups] = useState([]);
    const [categories, setCategories] = useState([]);
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('groups'); // groups, categories, types
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // create or edit
    const [editingItem, setEditingItem] = useState(null);
    const [expandedGroupId, setExpandedGroupId] = useState(null);

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
            setError('Failed to fetch hierarchy data: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

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
        if (!window.confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) {
            return;
        }

        try {
            if (type === 'group') await api.deleteGroup(id);
            else if (type === 'category') await api.deleteCategory(id);
            else if (type === 'type') await api.deleteType(id);

            await fetchData();
            setError('');
        } catch (err) {
            setError(`Failed to delete ${type}: ` + err.message);
        }
    };

    const toggleExpandGroup = (groupId) => {
        setExpandedGroupId(expandedGroupId === groupId ? null : groupId);
    };

    if (loading) {
        return <div className="hierarchy-manager loading">Loading hierarchy...</div>;
    }

    return (
        <div className="hierarchy-manager">
            <div className="hierarchy-header">
                <h1>Hierarchy Management</h1>
                <p className="subtitle">Manage Groups, Categories, and Types</p>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'groups' ? 'active' : ''}`}
                    onClick={() => setActiveTab('groups')}
                >
                    Groups ({groups.length})
                </button>
                <button
                    className={`tab ${activeTab === 'categories' ? 'active' : ''}`}
                    onClick={() => setActiveTab('categories')}
                >
                    Categories ({categories.length})
                </button>
                <button
                    className={`tab ${activeTab === 'types' ? 'active' : ''}`}
                    onClick={() => setActiveTab('types')}
                >
                    Types ({types.length})
                </button>
                <button
                    className={`tab ${activeTab === 'hierarchy' ? 'active' : ''}`}
                    onClick={() => setActiveTab('hierarchy')}
                >
                    Full Hierarchy
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'groups' && (
                    <GroupsView
                        groups={groups}
                        onCreate={() => handleCreate('group')}
                        onEdit={(group) => handleEdit(group, 'group')}
                        onDelete={(id) => handleDelete(id, 'group')}
                    />
                )}

                {activeTab === 'categories' && (
                    <CategoriesView
                        categories={categories}
                        groups={groups}
                        onCreate={() => handleCreate('category')}
                        onEdit={(category) => handleEdit(category, 'category')}
                        onDelete={(id) => handleDelete(id, 'category')}
                    />
                )}

                {activeTab === 'types' && (
                    <TypesView
                        types={types}
                        onCreate={() => handleCreate('type')}
                        onEdit={(type) => handleEdit(type, 'type')}
                        onDelete={(id) => handleDelete(id, 'type')}
                    />
                )}

                {activeTab === 'hierarchy' && (
                    <HierarchyView
                        groups={groups}
                        categories={categories}
                        types={types}
                        expandedGroupId={expandedGroupId}
                        onToggleExpand={toggleExpandGroup}
                        onEdit={handleEdit}
                    />
                )}
            </div>

            {isModalOpen && (
                <HierarchyModal
                    mode={modalMode}
                    item={editingItem}
                    groups={groups}
                    categories={categories}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingItem(null);
                    }}
                    onSave={async () => {
                        await fetchData();
                        setIsModalOpen(false);
                        setEditingItem(null);
                    }}
                />
            )}

            <style>{`
                .hierarchy-manager {
                    padding: 2rem;
                    max-width: 1400px;
                    margin: 0 auto;
                }

                .hierarchy-header {
                    margin-bottom: 2rem;
                }

                .hierarchy-header h1 {
                    font-size: 2rem;
                    color: #f1f5f9;
                    margin-bottom: 0.5rem;
                }

                .subtitle {
                    color: #94a3b8;
                    font-size: 0.95rem;
                }

                .error-banner {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid #ef4444;
                    color: #fca5a5;
                    padding: 1rem;
                    border-radius: 8px;
                    margin-bottom: 1.5rem;
                }

                .tabs {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                    border-bottom: 2px solid #334155;
                }

                .tab {
                    padding: 0.75rem 1.5rem;
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    font-size: 0.95rem;
                    font-weight: 500;
                    cursor: pointer;
                    border-bottom: 3px solid transparent;
                    transition: all 0.2s;
                }

                .tab:hover {
                    color: #e2e8f0;
                    background: rgba(59, 130, 246, 0.05);
                }

                .tab.active {
                    color: #3b82f6;
                    border-bottom-color: #3b82f6;
                }

                .tab-content {
                    background: rgba(30, 41, 59, 0.5);
                    border-radius: 12px;
                    padding: 1.5rem;
                    min-height: 400px;
                }

                .loading {
                    text-align: center;
                    color: #94a3b8;
                    padding: 3rem;
                    font-size: 1.1rem;
                }

                /* Shared View Styles */
                .view-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }

                .view-header h2 {
                    color: #f1f5f9;
                    font-size: 1.5rem;
                }

                .items-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 1.25rem;
                }

                .item-card {
                    background: rgba(15, 23, 42, 0.6);
                    border: 1px solid rgba(148, 163, 184, 0.1);
                    border-radius: 12px;
                    padding: 1.25rem;
                    transition: all 0.2s ease;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .item-card:hover {
                    border-color: rgba(59, 130, 246, 0.4);
                    background: rgba(15, 23, 42, 0.8);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px -8px rgba(0, 0, 0, 0.4);
                }

                .item-header {
                    display: flex;
                    gap: 1rem;
                }

                .item-color {
                    width: 4px;
                    border-radius: 4px;
                    flex-shrink: 0;
                }

                .item-info {
                    flex: 1;
                }

                .item-info h3 {
                    color: #f1f5f9;
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin: 0 0 0.25rem 0;
                }

                .description {
                    color: #94a3b8;
                    font-size: 0.875rem;
                    line-height: 1.5;
                    margin: 0.5rem 0 0 0;
                }

                .item-meta {
                    display: flex;
                    gap: 1rem;
                    font-size: 0.8rem;
                    color: #64748b;
                    padding-top: 1rem;
                    border-top: 1px solid rgba(148, 163, 184, 0.1);
                }

                .item-actions {
                    display: flex;
                    gap: 0.625rem;
                    margin-top: auto;
                }

                .btn-primary {
                    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                    color: white;
                    padding: 0.625rem 1.25rem;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    border: none;
                    cursor: pointer;
                    transition: transform 0.1s;
                }

                .btn-primary:hover {
                    opacity: 0.9;
                }

                .btn-primary:active {
                    transform: scale(0.98);
                }

                .btn-secondary {
                    flex: 1;
                    background: rgba(148, 163, 184, 0.1);
                    color: #e2e8f0;
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    padding: 0.5rem;
                    border-radius: 6px;
                    font-size: 0.85rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-secondary:hover {
                    background: rgba(148, 163, 184, 0.2);
                    border-color: rgba(148, 163, 184, 0.3);
                }

                .btn-danger {
                    flex: 1;
                    background: rgba(239, 68, 68, 0.1);
                    color: #fca5a5;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    padding: 0.5rem;
                    border-radius: 6px;
                    font-size: 0.85rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-danger:hover {
                    background: rgba(239, 68, 68, 0.2);
                    border-color: rgba(239, 68, 68, 0.3);
                }

                .empty-state {
                    grid-column: 1 / -1;
                    text-align: center;
                    color: #64748b;
                    padding: 4rem 2rem;
                    background: rgba(15, 23, 42, 0.3);
                    border: 2px dashed rgba(148, 163, 184, 0.1);
                    border-radius: 12px;
                    font-style: italic;
                }

                .group-badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 0.25rem 0.625rem;
                    background: rgba(59, 130, 246, 0.15);
                    color: #60a5fa;
                    font-size: 0.75rem;
                    font-weight: 600;
                    border-radius: 6px;
                    margin-bottom: 0.5rem;
                    border: 1px solid rgba(59, 130, 246, 0.2);
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                }
            `}</style>
        </div>
    );
}

// Groups View Component
function GroupsView({ groups, onCreate, onEdit, onDelete }) {
    return (
        <div className="groups-view">
            <div className="view-header">
                <h2>Groups</h2>
                <button className="btn-primary" onClick={onCreate}>
                    + Add Group
                </button>
            </div>

            <div className="items-grid">
                {groups.length === 0 ? (
                    <div className="empty-state">
                        No groups yet. Create your first group to get started.
                    </div>
                ) : (
                    groups.map(group => (
                        <div key={group.id} className="item-card">
                            <div className="item-header">
                                <div className="item-color" style={{ backgroundColor: group.color }}></div>
                                <div className="item-info">
                                    <h3>{group.name}</h3>
                                    {group.description && <p className="description">{group.description}</p>}
                                </div>
                            </div>
                            <div className="item-meta">
                                <span>{group.category_count || 0} categories</span>
                                <span>{group.resource_count || 0} resources</span>
                            </div>
                            <div className="item-actions">
                                <button className="btn-secondary" onClick={() => onEdit(group)}>Edit</button>
                                <button className="btn-danger" onClick={() => onDelete(group.id)}>Delete</button>
                            </div>
                        </div>
                    ))
                )}
            </div>


        </div>
    );
}

// Categories View Component
function CategoriesView({ categories, groups, onCreate, onEdit, onDelete }) {
    return (
        <div className="categories-view">
            <div className="view-header">
                <h2>Categories</h2>
                <button className="btn-primary" onClick={onCreate}>
                    + Add Category
                </button>
            </div>

            <div className="items-grid">
                {categories.length === 0 ? (
                    <div className="empty-state">
                        No categories yet. Create your first category.
                    </div>
                ) : (
                    categories.map(category => (
                        <div key={category.id} className="item-card">
                            <div className="item-header">
                                <div className="item-color" style={{ backgroundColor: category.color }}></div>
                                <div className="item-info">
                                    <h3>{category.name}</h3>
                                    <div className="badge">{category.group_name}</div>
                                    {category.description && <p className="description">{category.description}</p>}
                                </div>
                            </div>
                            <div className="item-meta">
                                <span>{category.type_count || 0} types</span>
                            </div>
                            <div className="item-actions">
                                <button className="btn-secondary" onClick={() => onEdit(category)}>Edit</button>
                                <button className="btn-danger" onClick={() => onDelete(category.id)}>Delete</button>
                            </div>
                        </div>
                    ))
                )}
            </div>


        </div>
    );
}

// Types View Component
function TypesView({ types, onCreate, onEdit, onDelete }) {
    return (
        <div className="types-view">
            <div className="view-header">
                <h2>Types</h2>
                <button className="btn-primary" onClick={onCreate}>
                    + Add Type
                </button>
            </div>

            <table className="types-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Abbreviation</th>
                        <th>Category</th>
                        <th>Group</th>
                        <th>Hourly Rate</th>
                        <th>Resources</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {types.length === 0 ? (
                        <tr>
                            <td colSpan="7" className="empty-state">
                                No types yet. Create your first type.
                            </td>
                        </tr>
                    ) : (
                        types.map(type => (
                            <tr key={type.id}>
                                <td className="type-name">{type.name}</td>
                                <td>{type.abbreviation || '-'}</td>
                                <td>
                                    <span className="badge" style={{ backgroundColor: type.category_color }}>
                                        {type.category_name}
                                    </span>
                                </td>
                                <td>{type.group_name}</td>
                                <td>${type.hourly_rate ? parseFloat(type.hourly_rate).toFixed(2) : '0.00'}</td>
                                <td>{type.resource_count || 0}</td>
                                <td>
                                    <div className="table-actions">
                                        <button className="btn-sm" onClick={() => onEdit(type)}>Edit</button>
                                        <button className="btn-sm btn-danger" onClick={() => onDelete(type.id)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            <style>{`
                .types-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .types-table th {
                    background: rgba(15, 23, 42, 0.8);
                    color: #94a3b8;
                    text-align: left;
                    padding: 0.75rem;
                    font-size: 0.85rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .types-table td {
                    padding: 0.75rem;
                    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
                    color: #e2e8f0;
                    font-size: 0.9rem;
                }

                .types-table tbody tr:hover {
                    background: rgba(59, 130, 246, 0.05);
                }

                .type-name {
                    font-weight: 500;
                }

                .table-actions {
                    display: flex;
                    gap: 0.5rem;
                }

                .btn-sm {
                    padding: 0.25rem 0.75rem;
                    font-size: 0.8rem;
                    background: rgba(59, 130, 246, 0.1);
                    color: #3b82f6;
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    border-radius: 4px;
                    cursor: pointer;
                }

                .btn-sm:hover {
                    background: rgba(59, 130, 246, 0.2);
                }

                .btn-sm.btn-danger {
                    background: rgba(239, 68, 68, 0.1);
                    color: #f87171;
                    border-color: rgba(239, 68, 68, 0.3);
                }

                .btn-sm.btn-danger:hover {
                    background: rgba(239, 68, 68, 0.2);
                }
            `}</style>
        </div>
    );
}

// Hierarchy View Component (Tree View)
function HierarchyView({ groups, categories, types, expandedGroupId, onToggleExpand, onEdit }) {
    return (
        <div className="hierarchy-view">
            <h2>Full Hierarchy</h2>
            <p className="help-text">Hierarchical view of Groups → Categories → Types</p>

            <div className="hierarchy-tree">
                {groups.map(group => {
                    const groupCategories = categories.filter(c => c.group_id === group.id);
                    const isExpanded = expandedGroupId === group.id;

                    return (
                        <div key={group.id} className="tree-node">
                            <div className="tree-item group-item" onClick={() => onToggleExpand(group.id)}>
                                <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                                <div className="tree-color" style={{ backgroundColor: group.color }}></div>
                                <strong>{group.name}</strong>
                                <span className="count">({groupCategories.length} categories)</span>
                            </div>

                            {isExpanded && (
                                <div className="tree-children">
                                    {groupCategories.map(category => {
                                        const categoryTypes = types.filter(t => t.category_id === category.id);

                                        return (
                                            <div key={category.id} className="tree-node">
                                                <div className="tree-item category-item">
                                                    <div className="tree-color" style={{ backgroundColor: category.color }}></div>
                                                    <strong>{category.name}</strong>
                                                    <span className="count">({categoryTypes.length} types)</span>
                                                </div>

                                                {categoryTypes.length > 0 && (
                                                    <div className="tree-children">
                                                        {categoryTypes.map(type => (
                                                            <div key={type.id} className="tree-item type-item">
                                                                <span>{type.name}</span>
                                                                {type.abbreviation && (
                                                                    <span className="abbrev">({type.abbreviation})</span>
                                                                )}
                                                                <span className="rate">${parseFloat(type.hourly_rate || 0).toFixed(2)}/hr</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <style>{`
                .hierarchy-view h2 {
                    color: #f1f5f9;
                    margin-bottom: 0.5rem;
                }

                .help-text {
                    color: #94a3b8;
                    font-size: 0.9rem;
                    margin-bottom: 1.5rem;
                }

                .hierarchy-tree {
                    background: rgba(15, 23, 42, 0.6);
                    border-radius: 8px;
                    padding: 1rem;
                }

                .tree-node {
                    margin-bottom: 0.5rem;
                }

                .tree-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem;
                    border-radius: 4px;
                    transition: background 0.2s;
                }

                .group-item {
                    cursor: pointer;
                    font-size: 1rem;
                }

                .group-item:hover {
                    background: rgba(59, 130, 246, 0.1);
                }

                .category-item {
                    font-size: 0.95rem;
                    color: #e2e8f0;
                }

                .type-item {
                    font-size: 0.85rem;
                    color: #cbd5e1;
                }

                .tree-color {
                    width: 3px;
                    height: 16px;
                    border-radius: 2px;
                }

                .expand-icon {
                    font-size: 0.7rem;
                    color: #94a3b8;
                    width: 16px;
                }

                .count {
                    color: #64748b;
                    font-size: 0.85em;
                    font-weight: normal;
                }

                .abbrev {
                    color: #94a3b8;
                    font-size: 0.9em;
                }

                .rate {
                    color: #10b981;
                    font-weight: 500;
                    margin-left: auto;
                }

                .tree-children {
                    margin-left: 2rem;
                    margin-top: 0.5rem;
                }
            `}</style>
        </div>
    );
}

// Modal Component
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

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{mode === 'create' ? 'Create' : 'Edit'} {item.type?.charAt(0).toUpperCase() + item.type?.slice(1)}</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
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

                    {item.type === 'category' && (
                        <div className="form-group">
                            <label>Group *</label>
                            <select
                                value={formData.group_id}
                                onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                                required
                            >
                                <option value="">Select Group...</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {item.type === 'type' && (
                        <>
                            <div className="form-group">
                                <label>Category *</label>
                                <select
                                    value={formData.category_id}
                                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select Category...</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} ({c.group_name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Abbreviation</label>
                                    <input
                                        type="text"
                                        value={formData.abbreviation}
                                        onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                                        placeholder="e.g., A1, TD"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Hourly Rate</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.hourly_rate}
                                        onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Optional description"
                            rows="3"
                        />
                    </div>

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

                    <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
                        </button>
                    </div>
                </form>

                <style>{`
                    .modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.7);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 1000;
                    }

                    .modal-content {
                        background: #1e293b;
                        border-radius: 12px;
                        width: 90%;
                        max-width: 500px;
                        max-height: 90vh;
                        overflow-y: auto;
                    }

                    .modal-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 1.5rem;
                        border-bottom: 1px solid rgba(148, 163, 184, 0.1);
                    }

                    .modal-header h2 {
                        color: #f1f5f9;
                        font-size: 1.25rem;
                        margin: 0;
                    }

                    .modal-close {
                        background: none;
                        border: none;
                        color: #94a3b8;
                        font-size: 1.5rem;
                        cursor: pointer;
                        padding: 0;
                        width: 32px;
                        height: 32px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .modal-close:hover {
                        color: #f1f5f9;
                    }

                    form {
                        padding: 1.5rem;
                    }

                    .form-group {
                        margin-bottom: 1rem;
                    }

                    .form-group label {
                        display: block;
                        color: #94a3b8;
                        font-size: 0.85rem;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        margin-bottom: 0.5rem;
                    }

                    .form-group input,
                    .form-group select,
                    .form-group textarea {
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(15, 23, 42, 0.8);
                        border: 1px solid rgba(148, 163, 184, 0.2);
                        border-radius: 6px;
                        color: #f1f5f9;
                        font-size: 0.95rem;
                    }

                    .form-group input:focus,
                    .form-group select:focus,
                    .form-group textarea:focus {
                        outline: none;
                        border-color: #3b82f6;
                    }

                    .form-row {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 1rem;
                    }

                    .error-message {
                        background: rgba(239, 68, 68, 0.1);
                        border: 1px solid #ef4444;
                        color: #fca5a5;
                        padding: 0.75rem;
                        border-radius: 6px;
                        margin: 0 1.5rem 1rem;
                        font-size: 0.9rem;
                    }

                    .modal-actions {
                        display: flex;
                        justify-content: flex-end;
                        gap: 0.75rem;
                        margin-top: 1.5rem;
                    }

                    .btn-cancel {
                        padding: 0.75rem 1.5rem;
                        background: transparent;
                        color: #94a3b8;
                        border: 1px solid rgba(148, 163, 184, 0.3);
                        border-radius: 6px;
                        cursor: pointer;
                    }

                    .btn-cancel:hover {
                        background: rgba(148, 163, 184, 0.1);
                    }
                `}</style>
            </div>
        </div>
    );
}

export default HierarchyManager;
