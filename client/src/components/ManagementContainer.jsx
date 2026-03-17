import React, { useState } from 'react';
import ResourceManager from './ResourceManager';
import ServiceManager from './ServiceManager';
import HierarchyManager from './HierarchyManager';
import UserManagement from '../pages/UserManagement';
import ActivityLogs from '../pages/ActivityLogs';
import PositionManagement from '../pages/PositionManagement';

function ManagementContainer() {
    const [activeTab, setActiveTab] = useState('resources');

    const tabs = [
        { id: 'resources', label: 'Resources', icon: '👥' },
        { id: 'services', label: 'Services', icon: '🔧' },
        { id: 'hierarchy', label: 'Roles & Billing Codes', icon: '🎬' },
        { id: 'positions', label: 'Positions', icon: '💼' },
        { id: 'users', label: 'Users', icon: '👤' },
        { id: 'logs', label: 'Activity Logs', icon: '📋' },
    ];

    return (
        <div className="management-container">
            <div className="management-header">
                <h1>Management Console</h1>
                <p className="subtitle">Centralized management for resources, services, and system settings</p>
            </div>

            <div className="tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className="tab-icon">{tab.icon}</span>
                        <span className="tab-label">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="tab-content">
                {activeTab === 'resources' && <ResourceManager />}
                {activeTab === 'services' && <ServiceManager />}
                {activeTab === 'hierarchy' && <HierarchyManager />}
                {activeTab === 'positions' && <PositionManagement />}
                {activeTab === 'users' && <UserManagement />}
                {activeTab === 'logs' && <ActivityLogs />}
            </div>

            <style>{`
                .management-container {
                    padding: 2rem;
                    max-width: 1600px;
                    margin: 0 auto;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }

                .management-header {
                    margin-bottom: 2rem;
                }

                .management-header h1 {
                    font-size: 2rem;
                    color: #f1f5f9;
                    margin-bottom: 0.5rem;
                }

                .subtitle {
                    color: #94a3b8;
                    font-size: 0.95rem;
                }

                .tabs {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                    border-bottom: 2px solid #334155;
                    overflow-x: auto;
                    flex-shrink: 0;
                }

                .tab {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    font-size: 0.95rem;
                    font-weight: 500;
                    cursor: pointer;
                    border-bottom: 3px solid transparent;
                    transition: all 0.2s;
                    white-space: nowrap;
                }

                .tab:hover {
                    color: #e2e8f0;
                    background: rgba(59, 130, 246, 0.05);
                }

                .tab.active {
                    color: #3b82f6;
                    border-bottom-color: #3b82f6;
                }

                .tab-icon {
                    font-size: 1.1rem;
                }

                .tab-label {
                    font-weight: 600;
                }

                .tab-content {
                    flex: 1;
                    overflow-y: auto;
                    background: rgba(30, 41, 59, 0.3);
                    border-radius: 12px;
                    padding: 0;
                }

                /* Override child component padding to fit within tab content */
                .tab-content > * {
                    height: 100%;
                }
            `}</style>
        </div>
    );
}

export default ManagementContainer;
