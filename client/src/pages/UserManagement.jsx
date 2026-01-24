import React, { useState, useEffect } from 'react';
import api from '../api';
import { format } from 'date-fns';

const PERMISSION_OPTIONS = [
    { value: 'view_schedules', label: 'View Schedules' },
    { value: 'edit_schedules', label: 'Edit Schedules' },
    { value: 'manage_resources', label: 'Manage Resources' },
    { value: 'manage_users', label: 'Manage Users' },
    { value: 'view_logs', label: 'View Logs' },
];

export function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('create'); // 'create', 'edit', 'permissions', 'password'
    const [editingUser, setEditingUser] = useState(null);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        role: 'USER',
        is_active: true,
        permissions: [],
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await api.getUsers();
            setUsers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = () => {
        setEditingUser(null);
        setModalType('create');
        setFormData({
            email: '',
            password: '',
            full_name: '',
            role: 'USER',
            is_active: true,
            permissions: [],
        });
        setShowModal(true);
    };

    const handleEditUser = (user) => {
        setEditingUser(user);
        setModalType('edit');
        setFormData({
            email: user.email,
            password: '',
            full_name: user.full_name || '',
            role: user.role,
            is_active: user.is_active !== false,
            permissions: user.permissions || [],
        });
        setShowModal(true);
    };

    const handleEditPermissions = (user) => {
        setEditingUser(user);
        setModalType('permissions');
        setFormData({
            ...formData,
            permissions: user.permissions || [],
        });
        setShowModal(true);
    };

    const handleResetPassword = (user) => {
        setEditingUser(user);
        setModalType('password');
        setFormData({
            ...formData,
            password: '',
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            if (modalType === 'create') {
                // Create new user
                await api.createUser(formData);
                alert('User created successfully');
            } else if (modalType === 'edit') {
                // Update user details
                const updateData = {
                    email: formData.email,
                    full_name: formData.full_name,
                    role: formData.role,
                    is_active: formData.is_active,
                };
                if (formData.password) {
                    updateData.password = formData.password;
                }
                await api.updateUser(editingUser.id, updateData);
                alert('User updated successfully');
            } else if (modalType === 'permissions') {
                // Update permissions only
                await api.updateUserPermissions(editingUser.id, formData.permissions);
                alert('Permissions updated successfully');
            } else if (modalType === 'password') {
                // Reset password
                if (!formData.password || formData.password.length < 6) {
                    setError('Password must be at least 6 characters');
                    return;
                }
                await api.resetUserPassword(editingUser.id, formData.password);
                alert('Password reset successfully');
            }
            setShowModal(false);
            fetchUsers();
        } catch (err) {
            setError(err.message);
        }
    };

    const getModalTitle = () => {
        switch (modalType) {
            case 'create': return 'Add New User';
            case 'edit': return 'Edit User';
            case 'permissions': return 'Edit Permissions';
            case 'password': return 'Reset Password';
            default: return '';
        }
    };

    if (loading) {
        return <div className="p-6">Loading...</div>;
    }

    return (
        <div className="h-full p-6 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">User Management</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Manage users and permissions
                    </p>
                </div>
                <button className="btn btn-primary" onClick={handleAddUser}>
                    + Add User
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Users Table */}
            <div className="glass-card flex-1">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="text-left p-4 text-slate-400 font-medium">Email</th>
                            <th className="text-left p-4 text-slate-400 font-medium">Name</th>
                            <th className="text-left p-4 text-slate-400 font-medium">Role</th>
                            <th className="text-left p-4 text-slate-400 font-medium">Permissions</th>
                            <th className="text-left p-4 text-slate-400 font-medium">Last Login</th>
                            <th className="text-left p-4 text-slate-400 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                                <td className="p-4">
                                    <div className="font-medium">{user.email}</div>
                                    {!user.is_active && (
                                        <span className="text-xs text-red-400">(Inactive)</span>
                                    )}
                                </td>
                                <td className="p-4 text-slate-300">{user.full_name || '-'}</td>
                                <td className="p-4">
                                    <span className={`badge ${user.role === 'ADMIN' ? 'badge-purple' : 'badge-blue'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-1 flex-wrap">
                                        {user.permissions && user.permissions.length > 0 ? (
                                            user.permissions.map((perm) => (
                                                <span key={perm} className="badge badge-sm badge-gray">
                                                    {perm.replace('_', ' ')}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-slate-500 text-sm">No permissions</span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 text-slate-400 text-sm">
                                    {user.last_login_at
                                        ? format(new Date(user.last_login_at), 'MMM d, h:mm a')
                                        : 'Never'}
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-2">
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={() => handleEditUser(user)}
                                            title="Edit user details"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => handleEditPermissions(user)}
                                            title="Edit permissions"
                                        >
                                            Permissions
                                        </button>
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => handleResetPassword(user)}
                                            title="Reset password"
                                        >
                                            Password
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{getModalTitle()}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Create User or Edit User Form */}
                            {(modalType === 'create' || modalType === 'edit') && (
                                <>
                                    <div>
                                        <label className="label">Email</label>
                                        <input
                                            type="email"
                                            className="input"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="label">
                                            Password {modalType === 'edit' && <span className="text-slate-500 text-sm">(leave blank to keep current)</span>}
                                        </label>
                                        <input
                                            type="password"
                                            className="input"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required={modalType === 'create'}
                                            minLength={6}
                                            placeholder={modalType === 'edit' ? 'Leave blank to keep current password' : ''}
                                        />
                                    </div>

                                    <div>
                                        <label className="label">Full Name</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="label">Role</label>
                                        <select
                                            className="input"
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        >
                                            <option value="USER">User</option>
                                            <option value="ADMIN">Admin</option>
                                            <option value="MANAGER">Manager</option>
                                        </select>
                                    </div>

                                    {modalType === 'edit' && (
                                        <div>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.is_active}
                                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                                    className="w-4 h-4 rounded"
                                                />
                                                <span className="text-sm">Account Active</span>
                                            </label>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Permissions Form */}
                            {(modalType === 'permissions' || modalType === 'create') && (
                                <div>
                                    <label className="label">Permissions</label>
                                    <div className="space-y-2">
                                        {PERMISSION_OPTIONS.map((perm) => (
                                            <label key={perm.value} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.permissions.includes(perm.value)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setFormData({
                                                                ...formData,
                                                                permissions: [...formData.permissions, perm.value],
                                                            });
                                                        } else {
                                                            setFormData({
                                                                ...formData,
                                                                permissions: formData.permissions.filter((p) => p !== perm.value),
                                                            });
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded"
                                                />
                                                <span className="text-sm">{perm.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Password Reset Form */}
                            {modalType === 'password' && (
                                <div>
                                    <label className="label">New Password</label>
                                    <input
                                        type="password"
                                        className="input"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        minLength={6}
                                        placeholder="Enter new password (min 6 characters)"
                                    />
                                    <p className="text-sm text-slate-400 mt-1">
                                        User: {editingUser?.email}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary flex-1">
                                    {modalType === 'create' ? 'Create User' :
                                        modalType === 'password' ? 'Reset Password' :
                                            'Update'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserManagement;
