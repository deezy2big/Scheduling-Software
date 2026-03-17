import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

export function Sidebar({ activeView, onViewChange, onAction, positionGroups = [], selectedGroupId = null, projects = [], onSearch }) {
    const { user, logout } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isManagementOpen, setIsManagementOpen] = useState(true);
    const [isSchedulingOpen, setIsSchedulingOpen] = useState(true);
    const [isProjectMgmtOpen, setIsProjectMgmtOpen] = useState(true);


    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ projects: [], workorders: [], resources: [] });

    // Debounced Search Handler
    const handleSearch = useCallback(async (q) => {
        if (!q || q.length < 2) {
            setSearchResults({ projects: [], workorders: [], resources: [] });
            return;
        }
        try {
            const results = await api.search(q);
            setSearchResults(results);
        } catch (error) {
            console.error("Search failed:", error);
        }
    }, []);

    const toggleSidebar = () => setIsCollapsed(!isCollapsed);

    const handleAction = (actionId) => {
        if (onAction) onAction(actionId);
    };

    return (
        <aside className={`${isCollapsed ? 'w-20' : 'w-72'} h-screen glass flex flex-col transition-all duration-300 relative z-50 border-r border-white/10`}>
            {/* Logo/Brand & Toggle */}
            <div className={`p-6 border-b border-white/10 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                {!isCollapsed && (
                    <div className="overflow-hidden whitespace-nowrap">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            RMS Pro
                        </h1>
                        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Work Order Management</p>
                    </div>
                )}
                <button
                    onClick={toggleSidebar}
                    className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto overflow-x-hidden custom-scrollbar">

                <div className="mb-6">
                    {!isCollapsed && (
                        <button
                            onClick={() => setIsSchedulingOpen(!isSchedulingOpen)}
                            className="w-full flex items-center justify-between px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
                        >
                            <span>Scheduling</span>
                            <span className={`transition-transform duration-200 ${isSchedulingOpen ? '' : '-rotate-90'}`}>▾</span>
                        </button>
                    )}
                    {(isSchedulingOpen || isCollapsed) && (
                        <div className="space-y-1">
                            <SidebarItem
                                id="schedule"
                                label="View Schedule"
                                icon="📅"
                                active={activeView === 'schedule'}
                                onClick={() => onViewChange('schedule')}
                                isCollapsed={isCollapsed}
                            />
                        </div>
                    )}
                </div>

                {/* PROJECT MANAGEMENT SECTION */}
                <div className="mb-6">
                    {!isCollapsed && (
                        <button
                            onClick={() => setIsProjectMgmtOpen(!isProjectMgmtOpen)}
                            className="w-full flex items-center justify-between px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
                        >
                            <span>Project Mgmt</span>
                            <span className={`transition-transform duration-200 ${isProjectMgmtOpen ? '' : '-rotate-90'}`}>▾</span>
                        </button>
                    )}
                    {(isProjectMgmtOpen || isCollapsed) && (
                        <div className="space-y-1">
                            <SidebarItem
                                id="projects"
                                label="Projects"
                                icon="📂"
                                active={activeView === 'projects'}
                                onClick={() => onViewChange('projects')}
                                isCollapsed={isCollapsed}
                            />
                        </div>
                    )}
                </div>

                {/* MANAGEMENT SECTION */}
                <div className="mb-6">
                    {!isCollapsed && (
                        <button
                            onClick={() => setIsManagementOpen(!isManagementOpen)}
                            className="w-full flex items-center justify-between px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
                        >
                            <span>Management</span>
                            <span className={`transition-transform duration-200 ${isManagementOpen ? '' : '-rotate-90'}`}>▾</span>
                        </button>
                    )}
                    {(isManagementOpen || isCollapsed) && (
                        <div className="space-y-1">
                            {/* MANAGEMENT CONSOLE - All admin features in one place */}
                            <SidebarItem
                                id="management"
                                label="Management Console"
                                icon="⚙️"
                                active={activeView === 'management'}
                                onClick={() => onViewChange('management')}
                                isCollapsed={isCollapsed}
                                adminOnly
                                userRole={user?.role}
                            />

                            {/* DEDICATED SEARCH LINK */}
                            <SidebarItem
                                id="search"
                                label="Search"
                                icon="🔍"
                                active={activeView === 'search'}
                                onClick={() => onViewChange('search')}
                                isCollapsed={isCollapsed}
                            />

                            {/* QUICK SEARCH PANEL */}
                            {!isCollapsed && (
                                <div className="px-2 mb-3 relative">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search projects, WO, resources..."
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                handleSearch(e.target.value);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    onSearch && onSearch(searchQuery);
                                                    setSearchResults({ projects: [], workorders: [], resources: [] });
                                                }
                                            }}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                                        />
                                        <span className="absolute left-2.5 top-1.5 text-slate-500 text-xs">🔍</span>
                                        {searchQuery && (
                                            <button
                                                onClick={() => {
                                                    setSearchQuery('');
                                                    setSearchResults({ projects: [], workorders: [], resources: [] });
                                                }}
                                                className="absolute right-2.5 top-1.5 text-slate-500 hover:text-slate-300 transition-colors text-[10px]"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>

                                    {/* Search Results Dropdown */}
                                    {(searchQuery.length >= 2 && (searchResults.projects?.length > 0 || searchResults.workorders?.length > 0 || searchResults.resources?.length > 0)) && (
                                        <div className="absolute left-2 right-2 top-full mt-1 bg-[#1e293b] border border-white/10 rounded-lg shadow-xl z-[100] max-h-64 overflow-y-auto custom-scrollbar">

                                            {/* Projects */}
                                            {searchResults.projects?.length > 0 && (
                                                <div className="p-2 border-b border-white/5">
                                                    <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Projects</div>
                                                    {searchResults.projects.map(p => (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => { onAction(`view-project-${p.id}`); setSearchQuery(''); }}
                                                            className="w-full text-left text-xs text-blue-400 hover:text-blue-300 py-1 truncate"
                                                        >
                                                            {p.title}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Workorders */}
                                            {searchResults.workorders?.length > 0 && (
                                                <div className="p-2 border-b border-white/5">
                                                    <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Workorders</div>
                                                    {searchResults.workorders.map(w => (
                                                        <button
                                                            key={w.id}
                                                            onClick={() => { onAction(`edit-workorder-${w.id}`); setSearchQuery(''); }}
                                                            className="w-full text-left py-1 group"
                                                        >
                                                            <div className="text-xs text-slate-300 group-hover:text-white truncate">{w.title}</div>
                                                            <div className="text-[10px] text-slate-500">{w.workorder_number || `#${w.id}`}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Resources */}
                                            {searchResults.resources?.length > 0 && (
                                                <div className="p-2">
                                                    <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Resources</div>
                                                    {searchResults.resources.map(r => (
                                                        <div key={r.id} className="text-xs text-slate-400 py-1 flex justify-between">
                                                            <span>{r.name}</span>
                                                            <span className="text-[10px] border border-white/10 px-1 rounded">{r.type}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="p-2 border-t border-white/5 text-center bg-white/5">
                                                <button
                                                    onClick={() => {
                                                        onSearch && onSearch(searchQuery);
                                                        setSearchResults({ projects: [], workorders: [], resources: [] });
                                                    }}
                                                    className="text-[10px] text-blue-400 hover:text-blue-300 w-full font-semibold uppercase tracking-wide py-1"
                                                >
                                                    View all results →
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </nav>

            {/* User Info & Logout */}
            <div className="p-4 border-t border-white/10">
                {!isCollapsed ? (
                    <>
                        <div className="glass-card p-4 mb-3 bg-white/5 border border-white/10 rounded-xl">
                            <div className="text-[10px] text-slate-500 uppercase tracking-tighter mb-1 font-bold">Logged in as</div>
                            <div className="font-semibold text-sm text-slate-200 truncate">{user?.full_name || user?.email}</div>
                            <div className={`text-[10px] mt-2 inline-flex items-center px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${user?.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse"></span>
                                {user?.role}
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="btn btn-secondary w-full text-xs py-2.5 flex items-center justify-center gap-2 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all"
                        >
                            <span>←</span> Logout
                        </button>
                    </>
                ) : (
                    <button
                        onClick={logout}
                        className="p-3 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors w-full flex justify-center"
                        title="Logout"
                    >
                        <span className="text-xl">🚪</span>
                    </button>
                )}
            </div>
        </aside>
    );
}

function SidebarItem({ id, label, icon, active, onClick, isCollapsed, isAction, adminOnly, userRole }) {
    if (adminOnly && userRole !== 'ADMIN') return null;

    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl text-left transition-all duration-200 relative group
                ${active
                    ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border border-blue-500/20 shadow-lg shadow-blue-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent hover:border-white/5'
                } ${isAction ? 'font-normal italic text-slate-300' : 'font-medium'}`}
            title={isCollapsed ? label : ""}
        >
            <span className={`text-lg flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? 'filter drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : ''}`}>
                {icon}
            </span>
            {!isCollapsed && <span className="text-sm tracking-tight whitespace-nowrap">{label}</span>}
            {active && !isCollapsed && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
            )}
        </button>
    );
}

function SidebarSubItem({ label, active, onClick, color }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-left transition-all duration-200 ml-1
                ${active
                    ? 'text-blue-400 bg-blue-500/10 border-l-2 border-blue-500'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border-l-2 border-transparent'
                }`}
        >
            {color && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></span>
            )}
            <span className="text-xs font-medium truncate">{label}</span>
        </button>
    );
}

export default Sidebar;

