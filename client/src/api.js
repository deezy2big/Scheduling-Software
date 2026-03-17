import React from 'react';

const API_BASE = 'http://localhost:3001/api';

// Get auth token
function getAuthHeaders() {
    const token = localStorage.getItem('rms_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    };
}

export const api = {
    // Resources
    getResources: async (filters = {}) => {
        const params = new URLSearchParams(filters);
        const res = await fetch(`${API_BASE}/resources?${params}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch resources');
        return res.json();
    },

    getResource: async (id) => {
        const res = await fetch(`${API_BASE}/resources/${id}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch resource');
        return res.json();
    },

    createResource: async (data) => {
        const res = await fetch(`${API_BASE}/resources`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create resource');
        }
        return res.json();
    },

    updateResource: async (id, data) => {
        const res = await fetch(`${API_BASE}/resources/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update resource');
        }
        return res.json();
    },

    deleteResource: async (id) => {
        const res = await fetch(`${API_BASE}/resources/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete resource');
        }
        return res.json();
    },

    // Projects (formerly work orders/bookings)
    getProjects: async (filters = {}) => {
        const params = new URLSearchParams(filters);
        const res = await fetch(`${API_BASE}/projects?${params}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch projects');
        return res.json();
    },

    getProject: async (id) => {
        const res = await fetch(`${API_BASE}/projects/${id}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch project');
        return res.json();
    },

    getWorkOrders: async (filters = {}) => {
        // Alias for backwards compatibility
        return api.getProjects(filters);
    },

    createProject: async (data) => {
        const res = await fetch(`${API_BASE}/projects`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create project');
        }
        return res.json();
    },

    updateProject: async (id, data) => {
        const res = await fetch(`${API_BASE}/projects/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update project');
        }
        return res.json();
    },

    updateWorkOrder: async (id, data) => {
        return api.updateProject(id, data);
    },

    deleteProject: async (id) => {
        const res = await fetch(`${API_BASE}/projects/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete project');
        }
        return res.json();
    },

    deleteWorkOrder: async (id) => {
        return api.deleteProject(id);
    },

    // Resource Groups
    getResourceGroups: async () => {
        const res = await fetch(`${API_BASE}/resource-groups`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch resource groups');
        return res.json();
    },

    createResourceGroup: async (data) => {
        const res = await fetch(`${API_BASE}/resource-groups`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create resource group');
        }
        return res.json();
    },

    updateResourceGroup: async (id, data) => {
        const res = await fetch(`${API_BASE}/resource-groups/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update resource group');
        }
        return res.json();
    },

    deleteResourceGroup: async (id) => {
        const res = await fetch(`${API_BASE}/resource-groups/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete resource group');
        }
        return res.json();
    },

    // Users
    getUsers: async (filters = {}) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== '' && value !== null && value !== undefined) {
                params.append(key, value);
            }
        });

        const queryString = params.toString();
        const url = queryString ? `${API_BASE}/users?${queryString}` : `${API_BASE}/users`;

        const res = await fetch(url, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
    },

    createUser: async (data) => {
        const res = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create user');
        }
        return res.json();
    },

    updateUser: async (id, data) => {
        const res = await fetch(`${API_BASE}/users/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update user');
        }
        return res.json();
    },

    updateUserPermissions: async (id, permissions) => {
        const res = await fetch(`${API_BASE}/users/${id}/permissions`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ permissions }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update permissions');
        }
        return res.json();
    },

    resetUserPassword: async (id, password) => {
        const res = await fetch(`${API_BASE}/users/${id}/password`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ password }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to reset password');
        }
        return res.json();
    },

    uploadUserAvatar: async (id, file) => {
        const formData = new FormData();
        formData.append('avatar', file);

        const token = localStorage.getItem('rms_token');
        const res = await fetch(`${API_BASE}/users/${id}/avatar`, {
            method: 'POST',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
            },
            body: formData,
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to upload avatar');
        }
        return res.json();
    },

    deleteUserAvatar: async (id) => {
        const res = await fetch(`${API_BASE}/users/${id}/avatar`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete avatar');
        }
        return res.json();
    },

    // Activity Logs
    getActivityLogs: async (filters = {}) => {
        const params = new URLSearchParams(filters);
        const res = await fetch(`${API_BASE}/activity-logs?${params}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch activity logs');
        return res.json();
    },

    getActivityStats: async () => {
        const res = await fetch(`${API_BASE}/activity-logs/stats`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch activity stats');
        return res.json();
    },

    // ============================================
    // Position Groups
    // ============================================
    getPositionGroups: async () => {
        const res = await fetch(`${API_BASE}/positions/groups`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch position groups');
        return res.json();
    },

    getPositionGroup: async (id) => {
        const res = await fetch(`${API_BASE}/positions/groups/${id}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch position group');
        return res.json();
    },

    createPositionGroup: async (data) => {
        const res = await fetch(`${API_BASE}/positions/groups`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create position group');
        }
        return res.json();
    },

    updatePositionGroup: async (id, data) => {
        const res = await fetch(`${API_BASE}/positions/groups/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update position group');
        }
        return res.json();
    },

    deletePositionGroup: async (id) => {
        const res = await fetch(`${API_BASE}/positions/groups/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete position group');
        }
        return res.json();
    },

    // ============================================
    // Positions
    // ============================================
    getPositions: async (filters = {}) => {
        const params = new URLSearchParams(filters);
        const res = await fetch(`${API_BASE}/positions?${params}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch positions');
        return res.json();
    },

    getPosition: async (id) => {
        const res = await fetch(`${API_BASE}/positions/${id}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch position');
        return res.json();
    },

    createPosition: async (data) => {
        const res = await fetch(`${API_BASE}/positions`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create position');
        }
        return res.json();
    },

    updatePosition: async (id, data) => {
        const res = await fetch(`${API_BASE}/positions/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update position');
        }
        return res.json();
    },

    deletePosition: async (id) => {
        const res = await fetch(`${API_BASE}/positions/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete position');
        }
        return res.json();
    },

    // ============================================
    // Workorders
    // ============================================
    getWorkorders: async (filters = {}) => {
        const params = new URLSearchParams(filters);
        const res = await fetch(`${API_BASE}/workorders?${params}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch workorders');
        return res.json();
    },

    getWorkorder: async (id) => {
        const res = await fetch(`${API_BASE}/workorders/${id}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch workorder');
        return res.json();
    },

    createWorkorder: async (data) => {
        const res = await fetch(`${API_BASE}/workorders`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create workorder');
        }
        return res.json();
    },

    updateWorkorder: async (id, data) => {
        const res = await fetch(`${API_BASE}/workorders/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update workorder');
        }
        return res.json();
    },

    deleteWorkorder: async (id) => {
        const res = await fetch(`${API_BASE}/workorders/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete workorder');
        }
        return res.json();
    },

    addWorkorderResource: async (workorderId, data) => {
        const res = await fetch(`${API_BASE}/workorders/${workorderId}/resources`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to add resource to workorder');
        }
        return res.json();
    },

    removeWorkorderResource: async (workorderId, resourceAssignmentId) => {
        const res = await fetch(`${API_BASE}/workorders/${workorderId}/resources/${resourceAssignmentId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to remove resource from workorder');
        }
        return res.json();
    },

    duplicateWorkorder: async (id) => {
        const res = await fetch(`${API_BASE}/workorders/${id}/duplicate`, {
            method: 'POST',
            headers: getAuthHeaders(),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to duplicate workorder');
        }
        return res.json();
    },

    // Search
    search: async (q) => {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to search');
        return res.json();
    },

    searchFull: async (q) => {
        const res = await fetch(`${API_BASE}/search/full?q=${encodeURIComponent(q)}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch full search results');
        return res.json();
    },

    searchAdvanced: async (params) => {
        const queryParams = new URLSearchParams();

        // Build query string from params object
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                if (Array.isArray(value)) {
                    value.forEach(v => queryParams.append(key, v));
                } else {
                    queryParams.set(key, value);
                }
            }
        });

        const res = await fetch(`${API_BASE}/search/advanced?${queryParams}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Advanced search failed');
        return res.json();
    },

    searchSuggestions: async (q) => {
        const res = await fetch(`${API_BASE}/search/suggestions?q=${encodeURIComponent(q)}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to get search suggestions');
        return res.json();
    },

    // ============================================
    // Resource Positions (Qualifications)
    // ============================================
    getResourcePositions: async (resourceId) => {
        const res = await fetch(`${API_BASE}/resources/${resourceId}/positions`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch resource positions');
        return res.json();
    },

    addResourcePosition: async (resourceId, data) => {
        const res = await fetch(`${API_BASE}/resources/${resourceId}/positions`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to add position to resource');
        }
        return res.json();
    },

    updateResourcePosition: async (resourceId, positionId, data) => {
        const res = await fetch(`${API_BASE}/resources/${resourceId}/positions/${positionId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update resource position');
        }
        return res.json();
    },

    removeResourcePosition: async (resourceId, positionId) => {
        const res = await fetch(`${API_BASE}/resources/${resourceId}/positions/${positionId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to remove position from resource');
        }
        return res.json();
    },

    getResourcesByPosition: async (positionId) => {
        const res = await fetch(`${API_BASE}/resources/by-position/${positionId}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch resources by position');
        return res.json();
    },

    // ============================================
    // Labor Laws
    // ============================================
    getLaborLaws: async () => {
        const res = await fetch(`${API_BASE}/laborlaws`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch labor laws');
        return res.json();
    },

    getLaborLaw: async (stateCode) => {
        const res = await fetch(`${API_BASE}/laborlaws/${stateCode}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch labor law');
        return res.json();
    },

    calculateCost: async (data) => {
        const res = await fetch(`${API_BASE}/laborlaws/calculate`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to calculate cost');
        }
        return res.json();
    },

    // ============================================
    // Services
    // ============================================
    getServices: async (filters = {}) => {
        const params = new URLSearchParams(filters);
        const res = await fetch(`${API_BASE}/services?${params}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch services');
        return res.json();
    },

    getService: async (id) => {
        const res = await fetch(`${API_BASE}/services/${id}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch service');
        return res.json();
    },

    createService: async (data) => {
        const res = await fetch(`${API_BASE}/services`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create service');
        }
        return res.json();
    },

    updateService: async (id, data) => {
        const res = await fetch(`${API_BASE}/services/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update service');
        }
        return res.json();
    },

    deleteService: async (id) => {
        const res = await fetch(`${API_BASE}/services/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete service');
        }
        return res.json();
    },

    duplicateService: async (id) => {
        const res = await fetch(`${API_BASE}/services/${id}/duplicate`, {
            method: 'POST',
            headers: getAuthHeaders(),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to duplicate service');
        }
        return res.json();
    },

    // ============================================
    // Groups (Hierarchy)
    // ============================================
    getGroups: async (filters = {}) => {
        const params = new URLSearchParams(filters);
        const res = await fetch(`${API_BASE}/groups?${params}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch groups');
        return res.json();
    },

    getGroup: async (id) => {
        const res = await fetch(`${API_BASE}/groups/${id}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch group');
        return res.json();
    },

    createGroup: async (data) => {
        const res = await fetch(`${API_BASE}/groups`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create group');
        }
        return res.json();
    },

    updateGroup: async (id, data) => {
        const res = await fetch(`${API_BASE}/groups/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update group');
        }
        return res.json();
    },

    deleteGroup: async (id) => {
        const res = await fetch(`${API_BASE}/groups/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete group');
        }
        return res.json();
    },

    // ============================================
    // Categories (Hierarchy)
    // ============================================
    getCategories: async (filters = {}) => {
        const params = new URLSearchParams(filters);
        const res = await fetch(`${API_BASE}/categories?${params}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch categories');
        return res.json();
    },

    getCategory: async (id) => {
        const res = await fetch(`${API_BASE}/categories/${id}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch category');
        return res.json();
    },

    createCategory: async (data) => {
        const res = await fetch(`${API_BASE}/categories`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create category');
        }
        return res.json();
    },

    updateCategory: async (id, data) => {
        const res = await fetch(`${API_BASE}/categories/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update category');
        }
        return res.json();
    },

    deleteCategory: async (id) => {
        const res = await fetch(`${API_BASE}/categories/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete category');
        }
        return res.json();
    },

    // ============================================
    // Types (Hierarchy)
    // ============================================
    getTypes: async (filters = {}) => {
        const params = new URLSearchParams(filters);
        const res = await fetch(`${API_BASE}/types?${params}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch types');
        return res.json();
    },

    getType: async (id) => {
        const res = await fetch(`${API_BASE}/types/${id}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch type');
        return res.json();
    },

    createType: async (data) => {
        const res = await fetch(`${API_BASE}/types`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create type');
        }
        return res.json();
    },

    updateType: async (id, data) => {
        const res = await fetch(`${API_BASE}/types/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update type');
        }
        return res.json();
    },

    deleteType: async (id) => {
        const res = await fetch(`${API_BASE}/types/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete type');
        }
        return res.json();
    },

    // User Activity
    getUserActivity: async (userId, filters = {}) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== '' && value !== null && value !== undefined) {
                params.append(key, value);
            }
        });

        const queryString = params.toString();
        const url = queryString
            ? `${API_BASE}/users/${userId}/activity?${queryString}`
            : `${API_BASE}/users/${userId}/activity`;

        const res = await fetch(url, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to fetch user activity');
        }
        return res.json();
    },

    getUserActivitySummary: async (userId) => {
        const res = await fetch(`${API_BASE}/users/${userId}/activity/summary`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to fetch activity summary');
        }
        return res.json();
    },
};

export default api;


