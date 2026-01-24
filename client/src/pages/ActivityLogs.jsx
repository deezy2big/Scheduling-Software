import React, { useState, useEffect } from 'react';
import api from '../api';
import { format } from 'date-fns';

export function ActivityLogs() {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        action: '',
        limit: 100,
    });

    useEffect(() => {
        fetchLogs();
        fetchStats();
    }, [filters]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const data = await api.getActivityLogs(filters);
            setLogs(data.logs || []);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const data = await api.getActivityStats();
            setStats(data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    };

    const formatAction = (action) => {
        return action.replace(/_/g, ' ');
    };

    if (loading) {
        return <div className="p-6">Loading...</div>;
    }

    return (
        <div className="h-full p-6 flex flex-col gap-4">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Activity Logs</h1>
                <p className="text-slate-400 text-sm mt-1">
                    Comprehensive audit trail of all system actions
                </p>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-5 gap-4">
                    <div className="glass-card p-4">
                        <div className="text-slate-400 text-xs uppercase mb-1">Total Actions (30d)</div>
                        <div className="text-2xl font-bold">{stats.total_actions}</div>
                    </div>
                    <div className="glass-card p-4">
                        <div className="text-slate-400 text-xs uppercase mb-1">Unique Users</div>
                        <div className="text-2xl font-bold">{stats.unique_users}</div>
                    </div>
                    <div className="glass-card p-4">
                        <div className="text-slate-400 text-xs uppercase mb-1">Work Orders</div>
                        <div className="text-2xl font-bold">{stats.work_order_actions}</div>
                    </div>
                    <div className="glass-card p-4">
                        <div className="text-slate-400 text-xs uppercase mb-1">Resources</div>
                        <div className="text-2xl font-bold">{stats.resource_actions}</div>
                    </div>
                    <div className="glass-card p-4">
                        <div className="text-slate-400 text-xs uppercase mb-1">Logins</div>
                        <div className="text-2xl font-bold">{stats.login_count}</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="glass-card p-4">
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="label">Action Type</label>
                        <select
                            className="input"
                            value={filters.action}
                            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                        >
                            <option value="">All Actions</option>
                            <option value="USER_LOGIN">User Login</option>
                            <option value="WORK_ORDER_CREATE">Work Order Create</option>
                            <option value="WORK_ORDER_UPDATE">Work Order Update</option>
                            <option value="WORK_ORDER_DELETE">Work Order Delete</option>
                            <option value="RESOURCE_CREATE">Resource Create</option>
                            <option value="RESOURCE_UPDATE">Resource Update</option>
                            <option value="RESOURCE_DELETE">Resource Delete</option>
                            <option value="USER_CREATE">User Create</option>
                            <option value="PERMISSION_GRANT">Permission Grant</option>
                        </select>
                    </div>
                    <div className="w-48">
                        <label className="label">Results</label>
                        <select
                            className="input"
                            value={filters.limit}
                            onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
                        >
                            <option value="50">50</option>
                            <option value="100">100</option>
                            <option value="250">250</option>
                            <option value="500">500</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="glass-card flex-1 overflow-auto">
                <table className="w-full">
                    <thead className="sticky top-0 bg-slate-800/90 backdrop-blur">
                        <tr className="border-b border-white/10">
                            <th className="text-left p-4 text-slate-400 font-medium">Time</th>
                            <th className="text-left p-4 text-slate-400 font-medium">User</th>
                            <th className="text-left p-4 text-slate-400 font-medium">Action</th>
                            <th className="text-left p-4 text-slate-400 font-medium">Entity</th>
                            <th className="text-left p-4 text-slate-400 font-medium">Details</th>
                            <th className="text-left p-4 text-slate-400 font-medium">IP Address</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                                <td className="p-4 text-sm text-slate-400">
                                    {format(new Date(log.created_at), 'MMM d, h:mm:ss a')}
                                </td>
                                <td className="p-4">
                                    <div className="font-medium">{log.user_name || log.user_email || 'System'}</div>
                                    <div className="text-xs text-slate-400">{log.user_email}</div>
                                </td>
                                <td className="p-4">
                                    <span className={`badge ${log.action.includes('CREATE') ? 'badge-green' :
                                            log.action.includes('UPDATE') ? 'badge-blue' :
                                                log.action.includes('DELETE') ? 'badge-red' :
                                                    'badge-gray'
                                        }`}>
                                        {formatAction(log.action)}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-300">
                                    {log.entity_type ? (
                                        <>
                                            {log.entity_type} #{log.entity_id}
                                        </>
                                    ) : (
                                        '-'
                                    )}
                                </td>
                                <td className="p-4 text-sm text-slate-400">
                                    {log.details ? (
                                        <code className="text-xs">{JSON.stringify(log.details).slice(0, 100)}</code>
                                    ) : (
                                        '-'
                                    )}
                                </td>
                                <td className="p-4 text-sm text-slate-400">
                                    {log.ip_address || '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {logs.length === 0 && (
                    <div className="text-center p-8 text-slate-500">
                        No activity logs found
                    </div>
                )}
            </div>
        </div>
    );
}

export default ActivityLogs;
