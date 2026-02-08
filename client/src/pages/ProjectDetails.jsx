import React, { useState, useEffect } from 'react';
import api from '../api';
import '../styles/ProjectDetails.css';
import { format } from 'date-fns';
import WorkorderModal from '../components/WorkorderModal';

const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
};

export default function ProjectDetails({ projectId, onClose }) {
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('by_wk_order');
    const [error, setError] = useState(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedWorkorder, setSelectedWorkorder] = useState(null);

    // Data for Modal
    const [allProjects, setAllProjects] = useState([]);
    const [allResources, setAllResources] = useState([]);
    const [allPositions, setAllPositions] = useState([]);

    const fetchDependencies = async () => {
        try {
            const [projectsData, resourcesData, positionsData] = await Promise.all([
                api.getProjects(),
                api.getResources(),
                api.getPositions()
            ]);
            setAllProjects(projectsData);
            setAllResources(resourcesData);
            setAllPositions(positionsData);
        } catch (err) {
            console.error("Failed to load dependencies:", err);
        }
    };

    const fetchProject = async () => {
        try {
            setLoading(true);
            const data = await api.getProject(projectId);
            setProject(data);
        } catch (err) {
            console.error(err);
            setError('Failed to load project details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) {
            fetchProject();
            fetchDependencies();
        }
    }, [projectId]);

    const handleNewWorkorder = () => {
        setSelectedWorkorder(null);
        setIsModalOpen(true);
    };

    const handleEditWorkorder = (wo) => {
        setSelectedWorkorder(wo);
        setIsModalOpen(true);
    };

    const handleDeleteWorkorder = async (woId) => {
        if (!window.confirm('Are you sure you want to delete this workorder?')) return;
        try {
            await api.deleteWorkorder(woId);
            fetchProject();
        } catch (err) {
            alert('Failed to delete workorder');
        }
    };

    const handleModalSave = () => {
        fetchProject();
        setIsModalOpen(false);
    };

    const handleDuplicateWorkorder = async (woId) => {
        if (!window.confirm('Are you sure you want to duplicate this workorder?')) return;
        try {
            await api.duplicateWorkorder(woId);
            fetchProject(); // Refresh
        } catch (err) {
            alert('Failed to duplicate workorder');
        }
    };

    if (!projectId) return null;
    if (loading) return <div className="p-8 text-center text-slate-400">Loading Package Details...</div>;
    if (error) return <div className="p-8 text-center text-red-400">{error}</div>;
    if (!project) return <div className="p-8 text-center text-slate-400">Project not found</div>;

    // Financials
    const targetPrice = parseFloat(project.estimated_budget) || 0;
    const jobTotal = parseFloat(project.total_cost) || 0;
    const difference = targetPrice - jobTotal;
    const taxes = jobTotal * 0.0825; // Example tax rate or 0
    const finalTotal = jobTotal + taxes;

    return (
        <div className="project-details-container">
            {/* Header */}
            <div className="pd-header">
                <div className="pd-title-row">
                    <h2>Package: {project.title}</h2>
                    {project.client_name && <span className="text-slate-400">| {project.client_name}</span>}
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${project.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {project.status}
                    </span>
                </div>
                {onClose && (
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕ Close</button>
                )}
            </div>

            {/* Title Bar Details */}
            <div className="bg-slate-800 p-3 border-b border-slate-700 grid grid-cols-4 gap-4 text-sm">
                <div>
                    <span className="text-slate-500 block text-xs uppercase">Client</span>
                    <span className="text-slate-200">{project.client_name || '-'}</span>
                </div>
                <div>
                    <span className="text-slate-500 block text-xs uppercase">Bid #</span>
                    <span className="text-slate-200">{project.bid_number || '-'}</span>
                </div>
                <div>
                    <span className="text-slate-500 block text-xs uppercase">PO #</span>
                    <span className="text-slate-200">{project.po_number || '-'}</span>
                </div>
                <div>
                    <span className="text-slate-500 block text-xs uppercase">Job Code</span>
                    <span className="text-slate-200">{project.job_code || '-'}</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="pd-tabs">
                {['Main', 'by Wk Order'].map(tab => (
                    <button
                        key={tab}
                        className={`pd-tab ${activeTab === tab.toLowerCase().replace(/ /g, '_') ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.toLowerCase().replace(/ /g, '_'))}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="pd-content">
                {/* Toolbar */}
                <div className="pd-toolbar">
                    <button className="btn-icon-text" onClick={handleNewWorkorder}>
                        <span>+</span> New Workorder
                    </button>
                    <button className="btn-icon-text" onClick={() => {/* Handle Quick Edit */ }}>
                        ⚡ Quick Edit
                    </button>
                    <button className="btn-icon-text" onClick={() => fetchProject()}>
                        Refresh
                    </button>
                </div>

                {/* Workorders Table */}
                <div className="pd-table-wrapper">
                    <table className="pd-table">
                        <thead>
                            <tr>
                                <th>Wk Order</th>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Job Name</th>
                                <th>Job Type</th>
                                <th>Resources</th>
                                <th className="text-right">Total</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {project.workorders && project.workorders.length > 0 ? (
                                project.workorders.map(wo => (
                                    <tr
                                        key={wo.id}
                                        onDoubleClick={() => handleEditWorkorder(wo)}
                                        className="cursor-pointer hover:bg-slate-700/50"
                                        title="Double-click to edit"
                                    >
                                        <td className="font-mono text-blue-400">{wo.workorder_number || wo.id}</td>
                                        <td>{wo.scheduled_date ? format(new Date(wo.scheduled_date), 'MM/dd/yyyy') : '-'}</td>
                                        <td>{wo.description || wo.title}</td>
                                        <td>{wo.title}</td>
                                        <td>
                                            {wo.job_type && (
                                                <span className={`status-badge ${wo.job_type.toLowerCase()}`}>
                                                    {wo.job_type}
                                                </span>
                                            )}
                                        </td>
                                        <td>{wo.resources?.length || 0}</td>
                                        <td className="money">{formatCurrency(wo.total_cost)}</td>
                                        <td className="text-center">
                                            <button
                                                onClick={() => handleEditWorkorder(wo)}
                                                className="text-xs text-slate-400 hover:text-white px-2"
                                                title="Edit"
                                            >
                                                ✎
                                            </button>
                                            <button
                                                onClick={() => handleDuplicateWorkorder(wo.id)}
                                                className="text-xs text-slate-400 hover:text-white px-2"
                                                title="Duplicate"
                                            >
                                                ❐
                                            </button>
                                            <button
                                                onClick={() => handleDeleteWorkorder(wo.id)}
                                                className="text-xs text-red-400 hover:text-red-200 px-2"
                                                title="Delete"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="text-center py-8 text-slate-500">
                                        No workorders found. Create one to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer / Financials */}
            <div className="pd-footer">
                <div className="pd-footer-item">
                    <span className="pd-footer-label">Target Price</span>
                    <span className="pd-footer-value">{formatCurrency(targetPrice)}</span>
                </div>
                <div className="pd-footer-item">
                    <span className="pd-footer-label">Difference</span>
                    <span className={`pd-footer-value ${difference < 0 ? 'negative' : 'positive'}`}>
                        {formatCurrency(difference)}
                    </span>
                </div>
                <div className="pd-footer-item">
                    <span className="pd-footer-label">Actual Price</span>
                    <span className="pd-footer-value">{formatCurrency(jobTotal)}</span>
                </div>
                <div className="pd-footer-item ml-auto">
                    <span className="pd-footer-label">Job Total (w/Tax)</span>
                    <span className="pd-footer-value text-xl">{formatCurrency(finalTotal)}</span>
                </div>
            </div>
            {/* Modal */}
            {
                isModalOpen && (
                    <WorkorderModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        workorder={selectedWorkorder}
                        projects={allProjects}
                        resources={allResources}
                        positions={allPositions}
                        initialSlot={selectedWorkorder ? null : { start: new Date(), project_id: project.id }} // Pre-select project for new WO
                        onSave={handleModalSave}
                        onDelete={handleModalSave}
                    />
                )
            }
        </div >
    );
}
