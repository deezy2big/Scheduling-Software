import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';

const COLOR_OPTIONS = [
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#22C55E', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
];

function WorkorderModal({ isOpen, onClose, workorder, projects, resources, positions, onSave, onDelete }) {
    const [formData, setFormData] = useState({
        project_id: '',
        title: '',
        description: '',
        status: 'PENDING',
        scheduled_date: '',
        location: '',
        notes: '',
    });

    const [assignedResources, setAssignedResources] = useState([]);
    const [resourcePositions, setResourcePositions] = useState({}); // Cache of resource -> their positions
    const [laborLaws, setLaborLaws] = useState({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Fetch labor laws on mount
    useEffect(() => {
        const fetchLaborLaws = async () => {
            try {
                const laws = await api.getLaborLaws();
                const lawsMap = {};
                laws.forEach(law => {
                    lawsMap[law.state_code] = law;
                });
                setLaborLaws(lawsMap);
            } catch (err) {
                console.error('Failed to fetch labor laws:', err);
            }
        };
        fetchLaborLaws();
    }, []);

    useEffect(() => {
        if (workorder) {
            setFormData({
                project_id: workorder.project_id || '',
                title: workorder.title || '',
                description: workorder.description || '',
                status: workorder.status || 'PENDING',
                scheduled_date: workorder.scheduled_date ? workorder.scheduled_date.split('T')[0] : '',
                location: workorder.location || '',
                notes: workorder.notes || '',
            });
            setAssignedResources(workorder.resources || []);
        } else {
            // Reset form for new workorder
            setFormData({
                project_id: '',
                title: '',
                description: '',
                status: 'PENDING',
                scheduled_date: new Date().toISOString().split('T')[0],
                location: '',
                notes: '',
            });
            setAssignedResources([]);
        }
        setError('');
    }, [workorder, isOpen]);

    // Fetch positions for a specific resource
    const fetchResourcePositions = useCallback(async (resourceId) => {
        if (resourcePositions[resourceId]) return; // Already cached
        try {
            const positions = await api.getResourcePositions(resourceId);
            setResourcePositions(prev => ({
                ...prev,
                [resourceId]: positions
            }));
        } catch (err) {
            console.error('Failed to fetch resource positions:', err);
        }
    }, [resourcePositions]);

    const handleAddResource = () => {
        const defaultDate = formData.scheduled_date || new Date().toISOString().split('T')[0];
        const defaultStart = `${defaultDate}T08:00`;
        const defaultEnd = `${defaultDate}T17:00`;

        setAssignedResources([
            ...assignedResources,
            {
                resource_id: '',
                position_id: '',
                start_time: defaultStart,
                end_time: defaultEnd,
                cost_type: 'HOURLY',
                flat_rate: '',
                pay_type_override: '', // Empty means use resource default
                notes: '',
            }
        ]);
    };

    const handleRemoveResource = (index) => {
        const updated = [...assignedResources];
        updated.splice(index, 1);
        setAssignedResources(updated);
    };

    const handleResourceChange = (index, field, value) => {
        const updated = [...assignedResources];
        updated[index] = { ...updated[index], [field]: value };

        // When resource changes, fetch their positions and clear the position selection
        if (field === 'resource_id' && value) {
            updated[index].position_id = ''; // Reset position when resource changes
            fetchResourcePositions(value);
        }

        setAssignedResources(updated);
    };

    // Calculate cost with overtime
    const calculateResourceCost = (resource) => {
        if (resource.cost_type === 'FLAT') {
            return {
                total: parseFloat(resource.flat_rate) || 0,
                regular_hours: 0,
                ot_hours: 0,
                dt_hours: 0,
                breakdown: 'Flat rate'
            };
        }

        if (!resource.start_time || !resource.end_time || !resource.resource_id) {
            return { total: 0, regular_hours: 0, ot_hours: 0, dt_hours: 0, breakdown: '' };
        }

        const start = new Date(resource.start_time);
        const end = new Date(resource.end_time);
        const hoursWorked = Math.max((end - start) / (1000 * 60 * 60), 0);

        // Get the resource to find their pay_type and work_state
        const resourceData = resources.find(r => r.id === parseInt(resource.resource_id));
        const payType = resource.pay_type_override || resourceData?.pay_type || 'HOURLY';
        const workState = resourceData?.work_state || 'CA';

        // Get the position and hourly rate
        const resourceQualifications = resourcePositions[resource.resource_id] || [];
        const qualification = resourceQualifications.find(q => q.position_id === parseInt(resource.position_id));
        const position = positions.find(p => p.id === parseInt(resource.position_id));
        const hourlyRate = parseFloat(qualification?.custom_hourly_rate || position?.hourly_rate || 0);

        // Get labor law for the state
        const laborLaw = laborLaws[workState];

        // Apply guarantee minimum
        let billableHours = hoursWorked;
        if (payType === 'GUARANTEE_8') {
            billableHours = Math.max(hoursWorked, 8);
        } else if (payType === 'GUARANTEE_10') {
            billableHours = Math.max(hoursWorked, 10);
        }

        // Calculate overtime (California rules by default)
        const otThreshold = laborLaw?.daily_ot_threshold ? parseFloat(laborLaw.daily_ot_threshold) : 8;
        const otMultiplier = laborLaw?.daily_ot_multiplier ? parseFloat(laborLaw.daily_ot_multiplier) : 1.5;
        const dtThreshold = laborLaw?.daily_dt_threshold ? parseFloat(laborLaw.daily_dt_threshold) : 12;
        const dtMultiplier = laborLaw?.daily_dt_multiplier ? parseFloat(laborLaw.daily_dt_multiplier) : 2.0;

        let regularHours = 0;
        let otHours = 0;
        let dtHours = 0;

        if (laborLaw?.daily_dt_threshold && billableHours > dtThreshold) {
            regularHours = otThreshold;
            otHours = dtThreshold - otThreshold;
            dtHours = billableHours - dtThreshold;
        } else if (laborLaw?.daily_ot_threshold && billableHours > otThreshold) {
            regularHours = otThreshold;
            otHours = billableHours - otThreshold;
        } else {
            regularHours = billableHours;
        }

        const regularPay = regularHours * hourlyRate;
        const otPay = otHours * hourlyRate * otMultiplier;
        const dtPay = dtHours * hourlyRate * dtMultiplier;
        const total = regularPay + otPay + dtPay;

        // Build breakdown text
        let breakdown = `${regularHours.toFixed(1)}h × $${hourlyRate.toFixed(2)}`;
        if (otHours > 0) breakdown += ` + ${otHours.toFixed(1)}h OT`;
        if (dtHours > 0) breakdown += ` + ${dtHours.toFixed(1)}h DT`;
        if (payType !== 'HOURLY') {
            const guarantee = payType === 'GUARANTEE_8' ? '8hr' : '10hr';
            breakdown = `${guarantee} guarantee • ` + breakdown;
        }

        return {
            total,
            regular_hours: regularHours,
            ot_hours: otHours,
            dt_hours: dtHours,
            breakdown,
            hourly_rate: hourlyRate,
            pay_type: payType,
            work_state: workState
        };
    };

    const getTotalCost = () => {
        return assignedResources.reduce((sum, r) => sum + calculateResourceCost(r).total, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Validate
            if (!formData.project_id) {
                throw new Error('Please select a project');
            }
            if (!formData.title.trim()) {
                throw new Error('Title is required');
            }

            // Prepare resource data
            const resourcesData = assignedResources
                .filter(r => r.resource_id)
                .map(r => ({
                    resource_id: parseInt(r.resource_id),
                    position_id: r.position_id ? parseInt(r.position_id) : null,
                    start_time: r.start_time,
                    end_time: r.end_time,
                    cost_type: r.cost_type,
                    flat_rate: r.cost_type === 'FLAT' ? parseFloat(r.flat_rate) : null,
                    pay_type_override: r.pay_type_override || null,
                    notes: r.notes || null,
                }));

            const payload = {
                ...formData,
                project_id: parseInt(formData.project_id),
                resources: resourcesData,
            };

            if (workorder?.id) {
                await api.updateWorkorder(workorder.id, payload);
            } else {
                await api.createWorkorder(payload);
            }

            onSave();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!workorder?.id) return;

        if (window.confirm('Are you sure you want to delete this workorder?')) {
            try {
                await api.deleteWorkorder(workorder.id);
                onDelete?.();
                onClose();
            } catch (err) {
                setError(err.message);
            }
        }
    };

    if (!isOpen) return null;

    // Filter staff resources only
    const staffResources = resources.filter(r => r.type === 'STAFF');

    // Get available positions for a specific resource
    const getAvailablePositions = (resourceId) => {
        if (!resourceId) return positions; // Show all if no resource selected
        const qualifiedPositions = resourcePositions[resourceId];
        if (!qualifiedPositions || qualifiedPositions.length === 0) {
            return positions; // Fallback to all positions if no qualifications found
        }
        return qualifiedPositions.map(q => ({
            id: q.position_id,
            name: q.position_name,
            abbreviation: q.abbreviation,
            hourly_rate: q.custom_hourly_rate || q.default_hourly_rate,
            group_name: q.group_name,
            is_custom_rate: !!q.custom_hourly_rate
        }));
    };

    const getPayTypeBadge = (resource) => {
        const resourceData = resources.find(r => r.id === parseInt(resource.resource_id));
        const payType = resource.pay_type_override || resourceData?.pay_type;
        if (!payType || payType === 'HOURLY') return null;

        const label = payType === 'GUARANTEE_8' ? '8hr' : '10hr';
        return (
            <span className="pay-type-badge" title={`${label} Guarantee`}>
                {label}
            </span>
        );
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content workorder-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>

                <h2>{workorder?.id ? 'Edit Workorder' : 'New Workorder'}</h2>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    {/* Project Selection */}
                    <div className="form-row">
                        <div className="form-group">
                            <label>Project *</label>
                            <select
                                value={formData.project_id}
                                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                                required
                            >
                                <option value="">Select Project...</option>
                                {projects.map(project => (
                                    <option key={project.id} value={project.id}>
                                        {project.title} {project.client_name ? `- ${project.client_name}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="PENDING">Pending</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    {/* Title and Date */}
                    <div className="form-row">
                        <div className="form-group" style={{ flex: 2 }}>
                            <label>Workorder Title *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g., Day 1 - Setup"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Scheduled Date</label>
                            <input
                                type="date"
                                value={formData.scheduled_date}
                                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Location */}
                    <div className="form-group">
                        <label>Location</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            placeholder="e.g., Studio A, 123 Main St"
                        />
                    </div>

                    {/* Resources Section */}
                    <div className="resources-section">
                        <div className="section-header">
                            <h3>Resources</h3>
                            <button type="button" className="btn-add" onClick={handleAddResource}>
                                + Add Resource
                            </button>
                        </div>

                        {assignedResources.length === 0 ? (
                            <p className="no-resources">No resources assigned yet. Click "Add Resource" to assign staff or equipment.</p>
                        ) : (
                            <div className="resource-list">
                                {assignedResources.map((resource, index) => {
                                    const availablePositions = getAvailablePositions(resource.resource_id);
                                    const costInfo = calculateResourceCost(resource);

                                    return (
                                        <div key={index} className="resource-row">
                                            <div className="resource-main">
                                                <select
                                                    value={resource.resource_id}
                                                    onChange={(e) => handleResourceChange(index, 'resource_id', e.target.value)}
                                                    className="resource-select"
                                                >
                                                    <option value="">Select Resource...</option>
                                                    {staffResources.map(r => (
                                                        <option key={r.id} value={r.id}>{r.name}</option>
                                                    ))}
                                                </select>

                                                {getPayTypeBadge(resource)}

                                                <select
                                                    value={resource.position_id}
                                                    onChange={(e) => handleResourceChange(index, 'position_id', e.target.value)}
                                                    className="position-select"
                                                    disabled={!resource.resource_id}
                                                >
                                                    <option value="">Position...</option>
                                                    {availablePositions.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.abbreviation || p.name} (${parseFloat(p.hourly_rate || 0).toFixed(2)}/hr)
                                                            {p.is_custom_rate ? ' ★' : ''}
                                                        </option>
                                                    ))}
                                                </select>

                                                <input
                                                    type="datetime-local"
                                                    value={resource.start_time}
                                                    onChange={(e) => handleResourceChange(index, 'start_time', e.target.value)}
                                                    className="time-input"
                                                />
                                                <span className="time-separator">to</span>
                                                <input
                                                    type="datetime-local"
                                                    value={resource.end_time}
                                                    onChange={(e) => handleResourceChange(index, 'end_time', e.target.value)}
                                                    className="time-input"
                                                />

                                                <button
                                                    type="button"
                                                    className="btn-remove"
                                                    onClick={() => handleRemoveResource(index)}
                                                >
                                                    ×
                                                </button>
                                            </div>

                                            <div className="resource-cost-row">
                                                <select
                                                    value={resource.cost_type}
                                                    onChange={(e) => handleResourceChange(index, 'cost_type', e.target.value)}
                                                    className="cost-type-select"
                                                >
                                                    <option value="HOURLY">Hourly</option>
                                                    <option value="FLAT">Flat Rate</option>
                                                </select>

                                                {resource.cost_type === 'FLAT' && (
                                                    <input
                                                        type="number"
                                                        value={resource.flat_rate}
                                                        onChange={(e) => handleResourceChange(index, 'flat_rate', e.target.value)}
                                                        placeholder="Flat rate $"
                                                        className="flat-rate-input"
                                                        step="0.01"
                                                        min="0"
                                                    />
                                                )}

                                                {resource.cost_type === 'HOURLY' && (
                                                    <select
                                                        value={resource.pay_type_override || ''}
                                                        onChange={(e) => handleResourceChange(index, 'pay_type_override', e.target.value)}
                                                        className="pay-type-select"
                                                        title="Override resource's default pay type"
                                                    >
                                                        <option value="">Use Default</option>
                                                        <option value="HOURLY">Hourly</option>
                                                        <option value="GUARANTEE_8">8hr Guarantee</option>
                                                        <option value="GUARANTEE_10">10hr Guarantee</option>
                                                    </select>
                                                )}

                                                <div className="cost-breakdown" title={costInfo.breakdown}>
                                                    <span className="calculated-cost">
                                                        ${costInfo.total.toFixed(2)}
                                                    </span>
                                                    {costInfo.ot_hours > 0 && (
                                                        <span className="ot-badge">+OT</span>
                                                    )}
                                                    {costInfo.dt_hours > 0 && (
                                                        <span className="dt-badge">+DT</span>
                                                    )}
                                                </div>
                                            </div>

                                            {costInfo.breakdown && resource.cost_type === 'HOURLY' && (
                                                <div className="cost-detail-row">
                                                    <small className="cost-breakdown-text">{costInfo.breakdown}</small>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {assignedResources.length > 0 && (
                            <div className="total-cost">
                                <strong>Total Estimated Cost:</strong> ${getTotalCost().toFixed(2)}
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="form-group">
                        <label>Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Optional notes..."
                            rows={3}
                        />
                    </div>

                    {/* Actions */}
                    <div className="modal-actions">
                        {workorder?.id && (
                            <button type="button" className="btn-delete" onClick={handleDelete}>
                                Delete
                            </button>
                        )}
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'Saving...' : (workorder?.id ? 'Update Workorder' : 'Create Workorder')}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                .workorder-modal {
                    max-width: 900px;
                    max-height: 90vh;
                    overflow-y: auto;
                }

                .form-row {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }

                .form-group {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .form-group label {
                    font-size: 0.875rem;
                    color: #94a3b8;
                }

                .form-group input,
                .form-group select,
                .form-group textarea {
                    background: rgba(30, 41, 59, 0.8);
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    border-radius: 8px;
                    padding: 0.75rem;
                    color: #f1f5f9;
                    font-size: 0.9rem;
                }

                .form-group input:focus,
                .form-group select:focus,
                .form-group textarea:focus {
                    outline: none;
                    border-color: #3b82f6;
                }

                .resources-section {
                    background: rgba(15, 23, 42, 0.5);
                    border-radius: 12px;
                    padding: 1rem;
                    margin: 1.5rem 0;
                }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }

                .section-header h3 {
                    margin: 0;
                    font-size: 1rem;
                    color: #e2e8f0;
                }

                .btn-add {
                    background: #22c55e;
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.875rem;
                }

                .btn-add:hover {
                    background: #16a34a;
                }

                .no-resources {
                    color: #64748b;
                    text-align: center;
                    padding: 2rem;
                    font-style: italic;
                }

                .resource-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .resource-row {
                    background: rgba(30, 41, 59, 0.6);
                    border-radius: 8px;
                    padding: 0.75rem;
                }

                .resource-main {
                    display: flex;
                    gap: 0.5rem;
                    align-items: center;
                    flex-wrap: wrap;
                }

                .resource-select {
                    min-width: 150px;
                    flex: 1;
                }

                .position-select {
                    min-width: 180px;
                }

                .time-input {
                    width: 160px;
                }

                .time-separator {
                    color: #64748b;
                    font-size: 0.875rem;
                }

                .btn-remove {
                    background: #ef4444;
                    color: white;
                    border: none;
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 1.2rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .resource-cost-row {
                    display: flex;
                    gap: 0.5rem;
                    align-items: center;
                    margin-top: 0.5rem;
                    padding-left: 0.5rem;
                }

                .cost-type-select {
                    width: 120px;
                }

                .pay-type-select {
                    width: 140px;
                    font-size: 0.8rem;
                }

                .flat-rate-input {
                    width: 100px;
                }

                .cost-breakdown {
                    margin-left: auto;
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }

                .calculated-cost {
                    font-weight: 600;
                    color: #22c55e;
                }

                .ot-badge {
                    background: #f59e0b;
                    color: #1e293b;
                    font-size: 0.65rem;
                    padding: 0.1rem 0.3rem;
                    border-radius: 3px;
                    font-weight: 600;
                }

                .dt-badge {
                    background: #ef4444;
                    color: white;
                    font-size: 0.65rem;
                    padding: 0.1rem 0.3rem;
                    border-radius: 3px;
                    font-weight: 600;
                }

                .pay-type-badge {
                    background: #8b5cf6;
                    color: white;
                    font-size: 0.65rem;
                    padding: 0.15rem 0.4rem;
                    border-radius: 3px;
                    font-weight: 600;
                }

                .cost-detail-row {
                    padding: 0.25rem 0.5rem;
                    margin-top: 0.25rem;
                }

                .cost-breakdown-text {
                    color: #94a3b8;
                    font-size: 0.75rem;
                }

                .total-cost {
                    text-align: right;
                    padding-top: 1rem;
                    border-top: 1px solid rgba(148, 163, 184, 0.2);
                    margin-top: 1rem;
                    font-size: 1.1rem;
                    color: #22c55e;
                }

                .modal-actions {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1.5rem;
                    justify-content: flex-end;
                }

                .btn-delete {
                    background: transparent;
                    color: #ef4444;
                    border: 1px solid #ef4444;
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    cursor: pointer;
                    margin-right: auto;
                }

                .btn-cancel {
                    background: transparent;
                    color: #94a3b8;
                    border: 1px solid rgba(148, 163, 184, 0.3);
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    cursor: pointer;
                }

                .btn-submit {
                    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                    color: white;
                    border: none;
                    padding: 0.75rem 2rem;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                }

                .btn-submit:hover {
                    opacity: 0.9;
                }

                .btn-submit:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .error-message {
                    background: rgba(239, 68, 68, 0.2);
                    border: 1px solid #ef4444;
                    color: #fca5a5;
                    padding: 0.75rem;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                }
            `}</style>
        </div>
    );
}

export default WorkorderModal;
