import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import ResourceGroupManager from './ResourceGroupManager';
import ResourceModal from './ResourceModal';

// Icons
const FilterIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
);

const SortIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
);

const ChevronDownIcon = () => (
    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
);

export function ResourceManager({ initialGroupId }) {
    const [resources, setResources] = useState([]);
    const [positions, setPositions] = useState([]);
    const [laborLaws, setLaborLaws] = useState([]);
    const [resourceGroups, setResourceGroups] = useState([]);
    const [positionGroups, setPositionGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [activeFilters, setActiveFilters] = useState({
        group: 'STUDIO', // 'STUDIO', 'REMOTE', 'ALL'
        category: 'ALL', // Maps to Resource Group
        type: 'ALL',     // 'STAFF', 'FACILITY', 'EQUIPMENT'
        status: 'ACTIVE' // 'ACTIVE', 'INACTIVE', 'ALL'
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc', label: 'Name (A-Z)' });

    // UI State
    const [modalOpen, setModalOpen] = useState(false);
    const [groupManagerOpen, setGroupManagerOpen] = useState(false);
    const [editingResource, setEditingResource] = useState(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);

    const filterRef = useRef(null);
    const sortRef = useRef(null);

    // Close dropdowns on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
            if (sortRef.current && !sortRef.current.contains(event.target)) {
                setIsSortOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (initialGroupId) {
            // Keep filter logic generic for now
        }
    }, [initialGroupId]);

    const fetchResources = async () => {
        setLoading(true);
        try {
            const data = await api.getResources({});
            setResources(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchGroups = async () => {
        try {
            const [resGroups, posGroups] = await Promise.all([
                api.getResourceGroups(),
                api.getPositionGroups()
            ]);
            setResourceGroups(resGroups);
            setPositionGroups(posGroups);
        } catch (err) {
            console.error('Failed to fetch groups:', err);
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

    const fetchLaborLaws = async () => {
        try {
            const data = await api.getLaborLaws();
            setLaborLaws(data);
        } catch (err) {
            console.error('Failed to fetch labor laws:', err);
        }
    };

    useEffect(() => {
        fetchResources();
        fetchPositions();
        fetchLaborLaws();
        fetchGroups();
    }, []);

    const handleSortOption = (key, direction, label) => {
        setSortConfig({ key, direction, label });
        setIsSortOpen(false);
    };

    const getSortedResources = () => {
        let filtered = resources;

        // 1. Filter by Group (Hardcoded Hierarchy Level 1)
        if (activeFilters.group === 'STUDIO') {
            // Placeholder: we aren't filtering out anything for Studio yet as we haven't implemented location types
        }

        // 2. Filter by Category (Resource Groups)
        if (activeFilters.category !== 'ALL') {
            if (activeFilters.category === 'UNASSIGNED') {
                filtered = filtered.filter(r => !r.groups || r.groups.length === 0);
            } else {
                const groupId = parseInt(activeFilters.category);
                filtered = filtered.filter(r => r.groups && Array.isArray(r.groups) && r.groups.some(g => g.id === groupId));
            }
        }

        // 3. Filter by Type
        if (activeFilters.type !== 'ALL') {
            filtered = filtered.filter(r => r.type === activeFilters.type);
        }

        // 4. Filter by Status
        if (activeFilters.status !== 'ALL') {
            filtered = filtered.filter(r => (r.status || 'ACTIVE') === activeFilters.status);
        }

        // 5. Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(r => {
                const searchFields = [
                    r.name,
                    r.first_name,
                    r.last_name,
                    r.type,
                    r.email,
                    r.phone,
                    r.notes
                ];
                // Search group names
                if (r.groups && Array.isArray(r.groups)) {
                    r.groups.forEach(g => searchFields.push(g.name));
                }
                return searchFields.some(field => field && field.toLowerCase().includes(query));
            });
        }

        // 6. Sort
        const sorted = [...filtered];
        sorted.sort((a, b) => {
            if (sortConfig.key === 'name') {
                const nameA = a.type === 'STAFF' ? `${a.first_name} ${a.last_name}` : a.name;
                const nameB = b.type === 'STAFF' ? `${b.first_name} ${b.last_name}` : b.name;
                return sortConfig.direction === 'asc'
                    ? String(nameA).localeCompare(String(nameB))
                    : String(nameB).localeCompare(String(nameA));
            }
            if (sortConfig.key === 'type') {
                const typeOrder = { STAFF: 1, FACILITY: 2, EQUIPMENT: 3 };
                const valA = typeOrder[a.type] || 99;
                const valB = typeOrder[b.type] || 99;
                return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }
            if (sortConfig.key === 'status') {
                return sortConfig.direction === 'asc'
                    ? String(a.status).localeCompare(String(b.status))
                    : String(b.status).localeCompare(String(a.status));
            }
            return 0;
        });
        return sorted;
    };

    const handleEdit = (resource) => {
        setEditingResource(resource);
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this resource?')) {
            return;
        }
        try {
            await api.deleteResource(id);
            fetchResources();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleAdd = () => {
        setEditingResource(null);
        setModalOpen(true);
    };

    const getTypeBadge = (type) => {
        switch (type) {
            case 'FACILITY': return 'badge-facility';
            case 'EQUIPMENT': return 'badge-equipment';
            case 'STAFF': return 'badge-staff';
            default: return '';
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'ACTIVE': return 'badge-active';
            case 'INACTIVE': return 'badge-inactive';
            case 'MAINTENANCE': return 'badge-maintenance';
            default: return '';
        }
    };

    const sortedResources = getSortedResources();

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Resources</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Manage your facilities, equipment, and personnel
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-secondary" onClick={() => setGroupManagerOpen(true)}>
                        Manage Groups
                    </button>
                    <button className="btn btn-primary" onClick={handleAdd}>
                        + Add Resource
                    </button>
                </div>
            </div>

            {/* Toolbar: Search, Filter, Sort */}
            <div className="flex items-center justify-between gap-4 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 backdrop-blur-sm">

                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <input
                        type="text"
                        placeholder="Search resources..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded pl-10 pr-10 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                    />
                    <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                <div className="flex gap-2 relative">
                    {/* Filter Button */}
                    <div className="relative" ref={filterRef}>
                        <button
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${isFilterOpen || (activeFilters.category !== 'ALL' || activeFilters.type !== 'ALL')
                                ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                                : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                                }`}
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                        >
                            <FilterIcon />
                            <span className="text-sm font-medium">Filters</span>
                            {(activeFilters.category !== 'ALL' || activeFilters.type !== 'ALL') && (
                                <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                            <ChevronDownIcon />
                        </button>

                        {/* Filter Popover */}
                        {isFilterOpen && (
                            <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-20 overflow-hidden ring-1 ring-black/50">
                                <div className="p-4 space-y-4">
                                    {/* Group (Level 1) */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Group (Location)</label>
                                        <select
                                            value={activeFilters.group}
                                            onChange={(e) => setActiveFilters(prev => ({ ...prev, group: e.target.value }))}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="ALL">All Groups</option>
                                            <option value="STUDIO">Studio</option>
                                            {/* Placeholder for future expansion */}
                                            {/* <option value="REMOTE">Remote</option> */}
                                        </select>
                                    </div>

                                    {/* Category (Level 2 - Resource Groups) */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</label>
                                        <select
                                            value={activeFilters.category}
                                            onChange={(e) => setActiveFilters(prev => ({ ...prev, category: e.target.value }))}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="ALL">All Categories</option>
                                            {resourceGroups.map(g => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                            <option value="UNASSIGNED">Unassigned</option>
                                        </select>
                                    </div>

                                    {/* Type (Level 3) */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</label>
                                        <select
                                            value={activeFilters.type}
                                            onChange={(e) => setActiveFilters(prev => ({ ...prev, type: e.target.value }))}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="ALL">All Types</option>
                                            <option value="STAFF">Staff</option>
                                            <option value="FACILITY">Facility</option>
                                            <option value="EQUIPMENT">Equipment</option>
                                        </select>
                                    </div>

                                    {/* Status */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</label>
                                        <select
                                            value={activeFilters.status}
                                            onChange={(e) => setActiveFilters(prev => ({ ...prev, status: e.target.value }))}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="ACTIVE">Active</option>
                                            <option value="INACTIVE">Inactive</option>
                                            <option value="MAINTENANCE">Maintenance</option>
                                            <option value="ALL">All Statuses</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-900/50 border-t border-slate-700 flex justify-end">
                                    <button
                                        className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                                        onClick={() => {
                                            setActiveFilters({
                                                group: 'STUDIO',
                                                category: 'ALL',
                                                type: 'ALL',
                                                status: 'ACTIVE'
                                            });
                                        }}
                                    >
                                        Reset Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sort Button */}
                    <div className="relative" ref={sortRef}>
                        <button
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${isSortOpen
                                ? 'bg-slate-700 border-slate-500 text-white'
                                : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                                }`}
                            onClick={() => setIsSortOpen(!isSortOpen)}
                        >
                            <SortIcon />
                            <span className="text-sm font-medium">{sortConfig.label}</span>
                            <ChevronDownIcon />
                        </button>

                        {/* Sort Dropdown */}
                        {isSortOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-20 py-1 ring-1 ring-black/50">
                                {[
                                    { key: 'name', dir: 'asc', label: 'Name (A-Z)' },
                                    { key: 'name', dir: 'desc', label: 'Name (Z-A)' },
                                    { key: 'type', dir: 'asc', label: 'Type (Staff First)' },
                                    { key: 'status', dir: 'asc', label: 'Status' }
                                ].map((opt) => (
                                    <button
                                        key={`${opt.key}-${opt.dir}`}
                                        className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center justify-between group"
                                        onClick={() => handleSortOption(opt.key, opt.dir, opt.label)}
                                    >
                                        {opt.label}
                                        {sortConfig.key === opt.key && sortConfig.direction === opt.dir && (
                                            <CheckIcon />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-12 text-slate-400">Loading...</div>
            ) : sortedResources.length === 0 ? (
                <div className="glass-card text-center py-16 border border-slate-800 rounded-xl bg-slate-900/30">
                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                    </div>
                    <p className="text-slate-400 text-lg font-medium">No resources found</p>
                    <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or search query</p>
                    <button className="btn btn-primary mt-6" onClick={() => {
                        setActiveFilters({ group: 'STUDIO', category: 'ALL', type: 'ALL', status: 'ALL' });
                        setSearchQuery('');
                    }}>
                        Clear Filters
                    </button>
                </div>
            ) : (
                <div className="table-container bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                    <table className="table w-full">
                        <thead className="bg-slate-800/80 text-slate-400 text-xs uppercase font-semibold">
                            <tr>
                                <th className="w-8"></th>
                                <th className="px-6 py-4 text-left">Name</th>
                                <th className="px-6 py-4 text-left">Category</th>
                                <th className="px-6 py-4 text-left">Type</th>
                                <th className="px-6 py-4 text-left">Pay</th>
                                <th className="px-6 py-4 text-left">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {sortedResources.map((resource) => (
                                <tr key={resource.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="pl-4">
                                        <div
                                            className="w-3 h-3 rounded-full shadow-lg shadow-black/50"
                                            style={{ backgroundColor: resource.color || '#3B82F6' }}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-white">
                                            {resource.type === 'STAFF'
                                                ? `${resource.first_name || ''} ${resource.last_name || ''}`.trim() || resource.name
                                                : resource.name
                                            }
                                        </div>
                                        {resource.type === 'STAFF' && resource.email && (
                                            <div className="text-xs text-slate-400 mt-0.5">{resource.email}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {/* Resource Groups */}
                                            {resource.groups && Array.isArray(resource.groups) && resource.groups.map(g => (
                                                <span
                                                    key={`rg-${g.id}`}
                                                    className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide text-slate-300 bg-slate-800 border border-slate-700"
                                                >
                                                    {g.name}
                                                </span>
                                            ))}
                                            {(!resource.groups || resource.groups.length === 0) && (
                                                <span className="text-xs text-slate-600 italic">Unassigned</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`badge ${getTypeBadge(resource.type)} inline-flex items-center gap-1.5`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
                                            {resource.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {/* Display something for Pay if relevant */}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`badge ${getStatusBadge(resource.status)}`}>
                                            {resource.status || 'ACTIVE'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                                                onClick={() => handleEdit(resource)}
                                                title="Edit"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                className="p-1.5 hover:bg-slate-700 rounded text-red-500 hover:text-red-400 transition-colors"
                                                onClick={() => handleDelete(resource.id)}
                                                title="Delete"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
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
            <ResourceModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                resource={editingResource}
                onSave={fetchResources}
                positions={positions}
                laborLaws={laborLaws}
                resourceGroups={resourceGroups}
            />

            <ResourceGroupManager
                isOpen={groupManagerOpen}
                onClose={() => setGroupManagerOpen(false)}
                onUpdate={() => {
                    fetchGroups();
                    fetchResources();
                }}
            />

            <style>{`
                .glass-card {
                    background: rgba(30, 41, 59, 0.4);
                    backdrop-filter: blur(10px);
                }
                .badge-purple {
                    background: rgba(139, 92, 246, 0.2);
                    color: #a78bfa;
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.75rem;
                }
                 .badge {
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    letter-spacing: 0.025em;
                }
                .badge-facility { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
                .badge-equipment { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
                .badge-staff { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
                
                .badge-active { background: rgba(16, 185, 129, 0.1); color: #34d399; }
                .badge-inactive { background: rgba(100, 116, 139, 0.1); color: #94a3b8; }
                .badge-maintenance { background: rgba(239, 68, 68, 0.1); color: #f87171; }
            `}</style>
        </div>
    );
}

export default ResourceManager;
