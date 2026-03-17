import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../api';

const ACTION_ICONS = {
    USER_LOGIN: '🔐',
    USER_CREATE: '➕',
    USER_UPDATE: '✏️',
    USER_DELETE: '🗑️',
    USER_AVATAR_UPLOAD: '📸',
    USER_AVATAR_DELETE: '🚫',
    PERMISSION_UPDATE: '🔑',
    PASSWORD_RESET: '🔒',
    BULK_USER_IMPORT: '📥',
    BULK_USER_DELETE: '🗑️',
    BULK_PERMISSION_UPDATE: '🔑',
    RESOURCE_CREATE: '➕',
    RESOURCE_UPDATE: '✏️',
    RESOURCE_DELETE: '🗑️',
    PROJECT_CREATE: '➕',
    PROJECT_UPDATE: '✏️',
    PROJECT_DELETE: '🗑️',
    WORKORDER_CREATE: '➕',
    WORKORDER_UPDATE: '✏️',
    WORKORDER_DELETE: '🗑️',
};

const ACTION_COLORS = {
    USER_LOGIN: 'text-blue-400',
    USER_CREATE: 'text-green-400',
    USER_UPDATE: 'text-yellow-400',
    USER_DELETE: 'text-red-400',
    USER_AVATAR_UPLOAD: 'text-purple-400',
    USER_AVATAR_DELETE: 'text-orange-400',
    default: 'text-slate-400'
};

/**
 * UserActivityModal Component
 *
 * Displays user activity history in three tabs:
 * - Timeline: Chronological list of all actions
 * - Summary: Activity statistics and breakdown
 * - Login History: Recent login records
 *
 * @param {Object} props
 * @param {Object} props.user - User object
 * @param {function} props.onClose - Callback to close modal
 */
export function UserActivityModal({ user, onClose }) {
    const [activeTab, setActiveTab] = useState('timeline');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Timeline state
    const [activities, setActivities] = useState([]);
    const [activityPagination, setActivityPagination] = useState({
        total: 0,
        limit: 20,
        offset: 0
    });
    const [activityFilters, setActivityFilters] = useState({
        action_type: '',
        entity_type: '',
        start_date: '',
        end_date: ''
    });

    // Summary state
    const [summary, setSummary] = useState(null);

    useEffect(() => {
        if (activeTab === 'timeline') {
            fetchActivities();
        } else if (activeTab === 'summary' || activeTab === 'logins') {
            fetchSummary();
        }
    }, [activeTab, activityPagination.offset, activityFilters]);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const data = await api.getUserActivity(user.id, {
                ...activityFilters,
                limit: activityPagination.limit,
                offset: activityPagination.offset
            });
            setActivities(data.activities || []);
            setActivityPagination(prev => ({
                ...prev,
                total: data.total || 0
            }));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async () => {
        try {
            setLoading(true);
            const data = await api.getUserActivitySummary(user.id);
            setSummary(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleActivityFilterChange = (key, value) => {
        setActivityFilters(prev => ({ ...prev, [key]: value }));
        setActivityPagination(prev => ({ ...prev, offset: 0 }));
    };

    const handleNextPage = () => {
        setActivityPagination(prev => ({
            ...prev,
            offset: Math.min(prev.offset + prev.limit, prev.total - 1)
        }));
    };

    const handlePrevPage = () => {
        setActivityPagination(prev => ({
            ...prev,
            offset: Math.max(prev.offset - prev.limit, 0)
        }));
    };

    const getActionIcon = (action) => ACTION_ICONS[action] || '📋';
    const getActionColor = (action) => ACTION_COLORS[action] || ACTION_COLORS.default;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">User Activity</h2>
                        <p className="text-sm text-slate-400 mt-1">
                            {user.full_name || user.email}
                        </p>
                    </div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 px-6">
                    <button
                        className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                            activeTab === 'timeline'
                                ? 'border-blue-500 text-blue-400'
                                : 'border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                        onClick={() => setActiveTab('timeline')}
                    >
                        Timeline
                    </button>
                    <button
                        className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                            activeTab === 'summary'
                                ? 'border-blue-500 text-blue-400'
                                : 'border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                        onClick={() => setActiveTab('summary')}
                    >
                        Summary
                    </button>
                    <button
                        className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                            activeTab === 'logins'
                                ? 'border-blue-500 text-blue-400'
                                : 'border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                        onClick={() => setActiveTab('logins')}
                    >
                        Login History
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="mx-6 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading && <div className="text-center text-slate-400">Loading...</div>}

                    {!loading && activeTab === 'timeline' && (
                        <div className="space-y-4">
                            {/* Filters */}
                            <div className="grid grid-cols-2 gap-4 p-4 glass-card">
                                <div>
                                    <label className="label text-xs">Action Type</label>
                                    <select
                                        value={activityFilters.action_type}
                                        onChange={(e) => handleActivityFilterChange('action_type', e.target.value)}
                                        className="input input-sm"
                                    >
                                        <option value="">All Actions</option>
                                        <option value="USER_LOGIN">Login</option>
                                        <option value="USER_CREATE">User Create</option>
                                        <option value="USER_UPDATE">User Update</option>
                                        <option value="USER_DELETE">User Delete</option>
                                        <option value="RESOURCE_CREATE">Resource Create</option>
                                        <option value="PROJECT_CREATE">Project Create</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label text-xs">Entity Type</label>
                                    <select
                                        value={activityFilters.entity_type}
                                        onChange={(e) => handleActivityFilterChange('entity_type', e.target.value)}
                                        className="input input-sm"
                                    >
                                        <option value="">All Types</option>
                                        <option value="user">User</option>
                                        <option value="resource">Resource</option>
                                        <option value="project">Project</option>
                                        <option value="workorder">Workorder</option>
                                    </select>
                                </div>
                            </div>

                            {/* Activity List */}
                            <div className="space-y-2">
                                {activities.length === 0 ? (
                                    <div className="text-center text-slate-500 py-8">
                                        No activity found
                                    </div>
                                ) : (
                                    activities.map((activity) => (
                                        <div
                                            key={activity.id}
                                            className="p-4 glass-card hover:bg-white/5 transition-colors"
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="text-2xl">{getActionIcon(activity.action)}</span>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-medium ${getActionColor(activity.action)}`}>
                                                            {activity.action.replace(/_/g, ' ')}
                                                        </span>
                                                        <span className="text-slate-500">•</span>
                                                        <span className="text-sm text-slate-400">
                                                            {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                                                        </span>
                                                    </div>
                                                    {activity.entity_type && (
                                                        <div className="text-sm text-slate-400 mt-1">
                                                            {activity.entity_type} #{activity.entity_id}
                                                        </div>
                                                    )}
                                                    {activity.ip_address && (
                                                        <div className="text-xs text-slate-500 mt-1">
                                                            IP: {activity.ip_address}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Pagination */}
                            {activityPagination.total > activityPagination.limit && (
                                <div className="flex items-center justify-between pt-4">
                                    <div className="text-sm text-slate-400">
                                        Showing {activityPagination.offset + 1}-
                                        {Math.min(activityPagination.offset + activityPagination.limit, activityPagination.total)} of{' '}
                                        {activityPagination.total}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handlePrevPage}
                                            disabled={activityPagination.offset === 0}
                                            className="btn btn-sm btn-secondary disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={handleNextPage}
                                            disabled={activityPagination.offset + activityPagination.limit >= activityPagination.total}
                                            className="btn btn-sm btn-secondary disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {!loading && activeTab === 'summary' && summary && (
                        <div className="space-y-6">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="glass-card p-4">
                                    <div className="text-sm text-slate-400">Total Actions</div>
                                    <div className="text-2xl font-bold mt-1">{summary.stats.total_actions}</div>
                                </div>
                                <div className="glass-card p-4">
                                    <div className="text-sm text-slate-400">Login Count</div>
                                    <div className="text-2xl font-bold mt-1">{summary.stats.login_count}</div>
                                </div>
                                <div className="glass-card p-4">
                                    <div className="text-sm text-slate-400">Last 7 Days</div>
                                    <div className="text-2xl font-bold mt-1">{summary.stats.actions_last_7_days}</div>
                                </div>
                                <div className="glass-card p-4">
                                    <div className="text-sm text-slate-400">Last 30 Days</div>
                                    <div className="text-2xl font-bold mt-1">{summary.stats.actions_last_30_days}</div>
                                </div>
                                <div className="glass-card p-4">
                                    <div className="text-sm text-slate-400">Active Days</div>
                                    <div className="text-2xl font-bold mt-1">{summary.stats.active_days}</div>
                                </div>
                                <div className="glass-card p-4">
                                    <div className="text-sm text-slate-400">Last Activity</div>
                                    <div className="text-sm font-medium mt-1">
                                        {summary.stats.last_activity
                                            ? format(new Date(summary.stats.last_activity), 'MMM d, yyyy')
                                            : 'Never'}
                                    </div>
                                </div>
                            </div>

                            {/* Action Breakdown */}
                            <div className="glass-card p-4">
                                <h3 className="font-semibold mb-4">Top Actions</h3>
                                <div className="space-y-2">
                                    {summary.actionBreakdown.map((item) => (
                                        <div key={item.action} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span>{getActionIcon(item.action)}</span>
                                                <span className="text-sm">{item.action.replace(/_/g, ' ')}</span>
                                            </div>
                                            <span className="text-sm font-medium">{item.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {!loading && activeTab === 'logins' && summary && (
                        <div className="space-y-2">
                            <h3 className="font-semibold mb-4">Recent Logins (Last 10)</h3>
                            {summary.recentLogins.length === 0 ? (
                                <div className="text-center text-slate-500 py-8">
                                    No login history found
                                </div>
                            ) : (
                                summary.recentLogins.map((login, idx) => (
                                    <div key={idx} className="glass-card p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-medium">
                                                    {format(new Date(login.created_at), 'MMM d, yyyy h:mm a')}
                                                </div>
                                                <div className="text-sm text-slate-400 mt-1">
                                                    IP: {login.ip_address || 'Unknown'}
                                                </div>
                                                {login.user_agent && (
                                                    <div className="text-xs text-slate-500 mt-1">
                                                        {login.user_agent}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-2xl">🔐</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default UserActivityModal;
