import React from 'react';

const PERMISSION_OPTIONS = [
    { value: 'view_schedules', label: 'View Schedules' },
    { value: 'edit_schedules', label: 'Edit Schedules' },
    { value: 'manage_resources', label: 'Manage Resources' },
    { value: 'manage_users', label: 'Manage Users' },
    { value: 'view_logs', label: 'View Logs' },
];

/**
 * UserFilters Component
 *
 * Provides filtering controls for the user management table
 *
 * @param {Object} props
 * @param {Object} props.filters - Current filter values
 * @param {function} props.onFilterChange - Callback when filters change (key, value) => void
 * @param {function} props.onClearFilters - Callback to clear all filters
 */
export function UserFilters({ filters, onFilterChange, onClearFilters }) {
    return (
        <div className="glass-card p-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Filters</h3>
                <button
                    onClick={onClearFilters}
                    className="btn btn-sm btn-secondary"
                >
                    Clear All
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Search */}
                <div>
                    <label className="label">Search</label>
                    <input
                        type="text"
                        placeholder="Email or name..."
                        value={filters.search}
                        onChange={(e) => onFilterChange('search', e.target.value)}
                        className="input"
                    />
                </div>

                {/* Role Filter */}
                <div>
                    <label className="label">Role</label>
                    <select
                        value={filters.role}
                        onChange={(e) => onFilterChange('role', e.target.value)}
                        className="input"
                    >
                        <option value="">All Roles</option>
                        <option value="ADMIN">Admin</option>
                        <option value="MANAGER">Manager</option>
                        <option value="USER">User</option>
                    </select>
                </div>

                {/* Status Filter */}
                <div>
                    <label className="label">Status</label>
                    <select
                        value={filters.is_active}
                        onChange={(e) => onFilterChange('is_active', e.target.value)}
                        className="input"
                    >
                        <option value="">All Statuses</option>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </select>
                </div>

                {/* Permission Filter */}
                <div>
                    <label className="label">Permission</label>
                    <select
                        value={filters.permission}
                        onChange={(e) => onFilterChange('permission', e.target.value)}
                        className="input"
                    >
                        <option value="">All Permissions</option>
                        {PERMISSION_OPTIONS.map(perm => (
                            <option key={perm.value} value={perm.value}>
                                {perm.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Last Login From */}
                <div>
                    <label className="label">Last Login From</label>
                    <input
                        type="date"
                        value={filters.last_login_from}
                        onChange={(e) => onFilterChange('last_login_from', e.target.value)}
                        className="input"
                    />
                </div>

                {/* Last Login To */}
                <div>
                    <label className="label">Last Login To</label>
                    <input
                        type="date"
                        value={filters.last_login_to}
                        onChange={(e) => onFilterChange('last_login_to', e.target.value)}
                        className="input"
                    />
                </div>

                {/* Sort By */}
                <div>
                    <label className="label">Sort By</label>
                    <select
                        value={filters.sort_by}
                        onChange={(e) => onFilterChange('sort_by', e.target.value)}
                        className="input"
                    >
                        <option value="created_at">Created Date</option>
                        <option value="last_login_at">Last Login</option>
                        <option value="email">Email</option>
                        <option value="full_name">Name</option>
                        <option value="role">Role</option>
                    </select>
                </div>

                {/* Sort Order */}
                <div>
                    <label className="label">Sort Order</label>
                    <select
                        value={filters.sort_order}
                        onChange={(e) => onFilterChange('sort_order', e.target.value)}
                        className="input"
                    >
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                    </select>
                </div>
            </div>
        </div>
    );
}

export default UserFilters;
