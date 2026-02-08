import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';


export default function ProjectsList({ projects, onSelectProject, onNewProject }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
    const [statusFilter, setStatusFilter] = useState('all');

    // Filter and Sort Projects
    const filteredProjects = useMemo(() => {
        let items = [...projects];

        // Search Filter
        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase();
            items = items.filter(p =>
                p.title?.toLowerCase().includes(lowerQ) ||
                p.client_name?.toLowerCase().includes(lowerQ) ||
                p.job_code?.toLowerCase().includes(lowerQ) ||
                String(p.id).includes(lowerQ)
            );
        }

        // Status Filter
        if (statusFilter !== 'all') {
            items = items.filter(p => p.status === statusFilter);
        }

        // Sorting
        items.sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return items;
    }, [projects, searchQuery, sortConfig, statusFilter]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return 'text-green-400 bg-green-400/10';
            case 'IN_PROGRESS': return 'text-blue-400 bg-blue-400/10';
            case 'CANCELLED': return 'text-red-400 bg-red-400/10';
            default: return 'text-slate-400 bg-slate-400/10';
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-900 text-slate-200">
            {/* Toolbar */}
            <div className="p-4 border-b border-white/10 flex items-center gap-4 bg-slate-800/50">
                <div className="flex-1 max-w-md relative">
                    <input
                        type="text"
                        placeholder="Find project..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg pl-9 pr-10 py-2 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                    <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50"
                >
                    <option value="all">All Statuses</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>

                <div className="flex-1"></div>

                <button
                    onClick={onNewProject}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    <span>+</span> New Project
                </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/10 bg-slate-800/30 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div className="col-span-4 cursor-pointer hover:text-slate-300" onClick={() => handleSort('title')}>Project</div>
                <div className="col-span-3 cursor-pointer hover:text-slate-300" onClick={() => handleSort('client_name')}>Client</div>
                <div className="col-span-2 cursor-pointer hover:text-slate-300" onClick={() => handleSort('job_code')}>Job Code</div>
                <div className="col-span-2 cursor-pointer hover:text-slate-300" onClick={() => handleSort('status')}>Status</div>
                <div className="col-span-1 text-right cursor-pointer hover:text-slate-300" onClick={() => handleSort('id')}>#</div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredProjects.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 italic">No projects found</div>
                ) : (
                    filteredProjects.map(project => (
                        <div
                            key={project.id}
                            onDoubleClick={() => onSelectProject(project.id)}
                            className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/5 items-center hover:bg-white/5 cursor-pointer transition-colors group"
                        >
                            <div className="col-span-4 flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color || '#3b82f6' }}></span>
                                <span className="font-medium text-slate-200 group-hover:text-white truncate" title={project.title}>{project.title}</span>
                            </div>
                            <div className="col-span-3 text-sm text-slate-400 truncate" title={project.client_name}>{project.client_name || '-'}</div>
                            <div className="col-span-2 text-sm text-slate-400 font-mono">{project.job_code || '-'}</div>
                            <div className="col-span-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${getStatusColor(project.status)}`}>
                                    {project.status || 'Active'}
                                </span>
                            </div>
                            <div className="col-span-1 text-right text-xs text-slate-500 font-mono">#{project.id}</div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/10 bg-slate-800/30 text-xs text-slate-500 flex justify-between">
                <span>{filteredProjects.length} Projects</span>
            </div>
        </div>
    );
}
