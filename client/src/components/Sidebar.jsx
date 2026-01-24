import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export function Sidebar({ activeView, onViewChange }) {
    const { user, logout } = useAuth();

    const navItems = [
        { id: 'schedule', label: 'Schedule', icon: '📅' },
        { id: 'resources', label: 'Resources', icon: '🏢', adminOnly: true },
        { id: 'users', label: 'Users', icon: '👥', adminOnly: true },
        { id: 'logs', label: 'Activity Logs', icon: '📋', adminOnly: true },
    ];

    return (
        <aside className="w-64 h-screen glass flex flex-col">
            {/* Logo/Brand */}
            <div className="p-6 border-b border-white/10">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    RMS Pro
                </h1>
                <p className="text-xs text-slate-400 mt-1">Work Order Management</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
                <ul className="space-y-2">
                    {navItems.filter(item => !item.adminOnly || user?.role === 'ADMIN').map((item) => (
                        <li key={item.id}>
                            <button
                                onClick={() => onViewChange(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${activeView === item.id
                                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <span className="text-lg">{item.icon}</span>
                                <span className="font-medium">{item.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* User Info & Logout */}
            <div className="p-4 border-t border-white/10">
                <div className="glass-card p-3 mb-3">
                    <div className="text-xs text-slate-400 uppercase mb-1">Logged in as</div>
                    <div className="font-medium text-sm truncate">{user?.full_name || user?.email}</div>
                    <div className={`text-xs mt-1 inline-block px-2 py-0.5 rounded ${user?.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                        }`}>
                        {user?.role}
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="btn btn-secondary w-full text-sm"
                >
                    ← Logout
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
