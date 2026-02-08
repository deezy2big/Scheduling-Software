import React, { useState, useEffect, useCallback, useRef } from 'react';
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

import DraggableModal from './DraggableModal';
import ResourcePickerModal from './ResourcePickerModal';
import ServicePickerModal from './ServicePickerModal';

function WorkorderModal({ isOpen, onClose, workorder, initialSlot, projects, resources, positions, onSave, onDelete }) {
    const [formData, setFormData] = useState({
        project_id: '',
        title: '',
        description: '',
        status: 'PENDING',
        scheduled_date: '',
        start_time: '08:00',
        end_time: '17:00',
        location: '',
        notes: '',
        bid_number: '',
        po_number: '',
    });

    const [assignedResources, setAssignedResources] = useState([]);
    const [resourcePositions, setResourcePositions] = useState({}); // Cache of resource -> their positions
    const [laborLaws, setLaborLaws] = useState({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [isResourcePickerOpen, setIsResourcePickerOpen] = useState(false);
    const [isServicePickerOpen, setIsServicePickerOpen] = useState(false);
    const [services, setServices] = useState([]);

    // Snapshot for dirty checking using refs to avoid effect dependencies issues
    const initialDataRef = useRef(null);

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

    // Fetch services on mount
    useEffect(() => {
        const fetchServices = async () => {
            try {
                const data = await api.getServices({ is_active: 'true' });
                setServices(data);
            } catch (err) {
                console.error('Failed to fetch services:', err);
            }
        };
        fetchServices();
    }, []);

    useEffect(() => {
        let initialForm = {};
        let initialRes = [];

        if (workorder) {
            initialForm = {
                project_id: workorder.project_id || '',
                title: workorder.title || '',
                description: workorder.description || '',
                status: workorder.status || 'PENDING',
                scheduled_date: workorder.scheduled_date ? workorder.scheduled_date.split('T')[0] : '',
                start_time: workorder.start_time ? new Date(workorder.start_time).toTimeString().slice(0, 5) : '08:00',
                end_time: workorder.end_time ? new Date(workorder.end_time).toTimeString().slice(0, 5) : '17:00',
                location: workorder.location || '',
                notes: workorder.notes || '',
                bid_number: workorder.bid_number || '',
                po_number: workorder.po_number || '',
                job_type: workorder.job_type || 'REMOTE',
                location_category: workorder.location_category || '',
                location_region: workorder.location_region || '',
            };
            initialRes = workorder.resources || [];
        } else {
            // Reset form for new workorder
            // If initialSlot is provided (from click-and-drag), use those values
            const defaultDate = initialSlot?.start ? new Date(initialSlot.start).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            const defaultStartTime = initialSlot?.start ? new Date(initialSlot.start).toTimeString().slice(0, 5) : '08:00';
            const defaultEndTime = initialSlot?.end ? new Date(initialSlot.end).toTimeString().slice(0, 5) : '17:00';

            // Check if we have a "new workorder with project context" (no ID but has project_id)
            const preSelectedProject = workorder?.project_id ? workorder.project_id : '';

            initialForm = {
                project_id: preSelectedProject,
                title: '',
                description: '',
                status: 'PENDING',
                scheduled_date: defaultDate,
                start_time: defaultStartTime,
                end_time: defaultEndTime,
                location: '',
                notes: '',
                bid_number: '',
                po_number: '',
                job_type: 'REMOTE',
                location_category: '',
                location_region: '',
            };

            // If initialSlot has a resourceId, pre-assign that resource
            if (initialSlot?.resourceId) {
                const selectedResource = resources?.find(r => r.id === initialSlot.resourceId);
                if (selectedResource) {
                    initialRes = [{
                        resource_id: selectedResource.id,
                        name: selectedResource.name,
                        position_id: null,
                        position_name: '',
                        position_abbrev: '',
                    }];
                }
            } else {
                initialRes = [];
            }
        }

        setFormData(initialForm);
        setAssignedResources(initialRes);
        initialDataRef.current = { formData: initialForm, assignedResources: initialRes };
        setIsDirty(false);
        setError('');
    }, [workorder, isOpen, initialSlot, resources]);

    // Check dirty state
    useEffect(() => {
        if (!initialDataRef.current) return;
        const formChanged = JSON.stringify(formData) !== JSON.stringify(initialDataRef.current.formData);
        const resChanged = JSON.stringify(assignedResources) !== JSON.stringify(initialDataRef.current.assignedResources);
        setIsDirty(formChanged || resChanged);
    }, [formData, assignedResources]);

    // Update resource dates when main scheduled date changes
    useEffect(() => {
        if (!formData.scheduled_date || assignedResources.length === 0) return;

        const newResources = assignedResources.map(r => {
            if (!r.start_time || !r.end_time) return r;

            // Extract existing times
            const startTime = r.start_time.includes('T') ? r.start_time.split('T')[1] : r.start_time;
            const endTime = r.end_time.includes('T') ? r.end_time.split('T')[1] : r.end_time;

            return {
                ...r,
                start_time: `${formData.scheduled_date}T${startTime}`,
                end_time: `${formData.scheduled_date}T${endTime}`
            };
        });

        // Only update if there are changes to avoid loop
        if (JSON.stringify(newResources) !== JSON.stringify(assignedResources)) {
            setAssignedResources(newResources);
        }
    }, [formData.scheduled_date]);

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

    const handleDuplicate = async () => {
        if (!workorder?.id) return;
        if (!window.confirm('Duplicate this workorder?')) return;

        setLoading(true);
        try {
            await api.duplicateWorkorder(workorder.id);
            onSave(); // Refresh list
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddResource = () => {
        const defaultDate = formData.scheduled_date || new Date().toISOString().split('T')[0];
        const defaultStart = `${defaultDate}T${formData.start_time || '08:00'}`;
        const defaultEnd = `${defaultDate}T${formData.end_time || '17:00'}`;

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

    const handleAddRequirement = () => {
        handleAddResource();
    };

    // Handle adding multiple resources from the picker
    // Handle adding multiple resources from the picker
    const handleAddMultipleResources = (selectedRows) => {
        const defaultDate = formData.scheduled_date || new Date().toISOString().split('T')[0];
        const defaultStart = `${defaultDate}T${formData.start_time || '08:00'}`;
        const defaultEnd = `${defaultDate}T${formData.end_time || '17:00'}`;

        const newResources = selectedRows.map(row => {
            // Support both new flattened row structure and legacy resource object
            const resourceId = row.resourceId || row.id;
            const resourceName = row.name;
            const positionId = row.positionId || '';

            return {
                resource_id: resourceId,
                name: resourceName,
                position_id: positionId,
                start_time: defaultStart,
                end_time: defaultEnd,
                cost_type: 'HOURLY',
                flat_rate: '',
                pay_type_override: '',
                notes: '',
            };
        });

        setAssignedResources(prev => [...prev, ...newResources]);

        // Fetch positions for all new resources
        newResources.forEach(r => fetchResourcePositions(r.resource_id));

        setIsResourcePickerOpen(false);
    };

    // Handle loading a service (bulk add positions)
    const handleLoadService = (servicePositions) => {
        const defaultDate = formData.scheduled_date || new Date().toISOString().split('T')[0];
        const defaultStart = `${defaultDate}T${formData.start_time || '08:00'}`;
        const defaultEnd = `${defaultDate}T${formData.end_time || '17:00'}`;

        // Create position slots for each position in the service
        const newSlots = [];
        servicePositions.forEach(sp => {
            // Handle quantity - create multiple slots if quantity > 1
            for (let i = 0; i < (sp.quantity || 1); i++) {
                newSlots.push({
                    resource_id: '',  // Empty - to be filled by user
                    position_id: sp.position_id,
                    position_name: sp.position_name,
                    position_abbrev: sp.abbreviation,
                    start_time: defaultStart,
                    end_time: defaultEnd,
                    cost_type: 'HOURLY',
                    flat_rate: '',
                    pay_type_override: '',
                    notes: sp.notes || '',
                });
            }
        });

        setAssignedResources([...assignedResources, ...newSlots]);
        setIsServicePickerOpen(false);
    };

    const syncAllResourcesTimes = () => {
        const datePart = formData.scheduled_date || new Date().toISOString().split('T')[0];
        // Ensure time is in 2-digit format if needed
        const newStart = `${datePart}T${formData.start_time || '08:00'}`;
        const newEnd = `${datePart}T${formData.end_time || '17:00'}`;

        setAssignedResources(prev => prev.map(r => ({
            ...r,
            start_time: newStart,
            end_time: newEnd
        })));
    };

    const handleRemoveResource = (index) => {
        const updated = [...assignedResources];
        updated.splice(index, 1);
        setAssignedResources(updated);
    };

    const handleResourceTimeChange = (index, field, timeValue) => {
        // inputs are now just HH:mm
        const updated = [...assignedResources];
        const datePart = formData.scheduled_date || new Date().toISOString().split('T')[0];

        // Ensure full ISO format for backend consistency
        updated[index] = {
            ...updated[index],
            [field]: `${datePart}T${timeValue}`
        };
        setAssignedResources(updated);
    };

    const handleResourceChange = (index, field, value) => {
        const updated = [...assignedResources];
        updated[index] = { ...updated[index], [field]: value };

        // When resource changes, fetch their positions and clear the position selection
        // When resource changes
        if (field === 'resource_id' && value) {
            // Find the selected resource object to check qualifications
            const selectedStaff = staffResources.find(r => String(r.id) === String(value));

            // If the resource exists and HAS the current position in their profile, keep it. Otherwise reset.
            const currentPositionId = updated[index].position_id;
            const isQualified = selectedStaff?.positions?.some(p => String(p.position_id) === String(currentPositionId));

            if (!isQualified) {
                updated[index].position_id = '';
            }
            // Always fetch positions for the new resource so the dropdown updates
            fetchResourcePositions(value);
        }

        setAssignedResources(updated);
    };

    const handleDragStart = (e, index) => {
        e.dataTransfer.setData('index', index);
        e.currentTarget.classList.add('dragging');
    };

    const handleDragEnd = (e) => {
        e.currentTarget.classList.remove('dragging');
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('drag-over');
    };

    const handleDrop = (e, toIndex) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        const fromIndex = parseInt(e.dataTransfer.getData('index'));

        if (fromIndex === toIndex) return;

        const newResources = [...assignedResources];
        const [movedItem] = newResources.splice(fromIndex, 1);
        newResources.splice(toIndex, 0, movedItem);
        setAssignedResources(newResources);
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
                // Format main workorder times as full timestamps for the database
                start_time: formData.scheduled_date && formData.start_time ? `${formData.scheduled_date}T${formData.start_time}` : null,
                end_time: formData.scheduled_date && formData.end_time ? `${formData.scheduled_date}T${formData.end_time}` : null,
                resources: resourcesData,
            };

            if (workorder?.id) {
                await api.updateWorkorder(workorder.id, payload);
            } else {
                await api.createWorkorder(payload);
            }

            setIsDirty(false);
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

    const handleKeyDown = (e) => {
        // Prevent form submission on Enter key press
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    };

    return (
        <DraggableModal
            isOpen={isOpen}
            onClose={onClose}
            title={workorder?.id ? 'Edit Workorder' : 'New Workorder'}
            hasUnsavedChanges={isDirty}
            initialSize={{ width: 1100, height: 850 }}
            className="workorder-modal-wrapper"
        >

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
                {/* Project Selection */}
                <div className="header-compact-grid">
                    <div className="compact-row">
                        <div className="field-group title-field">
                            <label>Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Workorder Title"
                                required
                                className="input-compact"
                            />
                        </div>
                        <div className="field-group project-field">
                            <label>Project</label>
                            <select
                                value={formData.project_id}
                                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                                required
                                className="input-compact"
                                disabled={workorder && !workorder.id && workorder.project_id} // Disable if creating new from project context
                            >
                                <option value="">Select Project...</option>
                                {projects.map(project => (
                                    <option key={project.id} value={project.id}>
                                        {project.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="field-group" style={{ maxWidth: '120px' }}>
                            <label>Job Type</label>
                            <select
                                value={formData.job_type}
                                onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}
                                className="input-compact"
                            >
                                <option value="REMOTE">Remote</option>
                                <option value="STUDIO">Studio</option>
                            </select>
                        </div>
                        <div className="field-group status-field">
                            <label>Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="input-compact"
                            >
                                <option value="PENDING">Pending</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                            </select>
                        </div>
                    </div>
                    <div className="compact-row">
                        <div className="field-group">
                            <label>Date</label>
                            <input
                                type="date"
                                value={formData.scheduled_date}
                                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                                className="input-compact"
                            />
                        </div>
                        <div className="field-group time-field">
                            <label>Time</label>
                            <div className="time-range-compact">
                                <input
                                    type="time"
                                    value={formData.start_time}
                                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                    className="input-compact"
                                />
                                <span>-</span>
                                <input
                                    type="time"
                                    value={formData.end_time}
                                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                    className="input-compact"
                                />
                            </div>
                        </div>
                        <div className="field-group location-field">
                            <label>Location</label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="Location"
                                className="input-compact"
                            />
                        </div>
                    </div>
                    <div className="compact-row">
                        <div className="field-group">
                            <label>Bid #</label>
                            <input
                                type="text"
                                value={formData.bid_number}
                                onChange={(e) => setFormData({ ...formData, bid_number: e.target.value })}
                                placeholder="Optional Bid #"
                                className="input-compact"
                            />
                        </div>
                        <div className="field-group">
                            <label>PO #</label>
                            <input
                                type="text"
                                value={formData.po_number}
                                onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                                placeholder="Optional PO #"
                                className="input-compact"
                            />
                        </div>
                        <div className="field-group">
                            <label>Region</label>
                            <input
                                type="text"
                                value={formData.location_region}
                                onChange={(e) => setFormData({ ...formData, location_region: e.target.value })}
                                placeholder="e.g. AZ"
                                className="input-compact"
                            />
                        </div>
                        <div className="field-group">
                            <label>Loc. Category</label>
                            <select
                                value={formData.location_category}
                                onChange={(e) => setFormData({ ...formData, location_category: e.target.value })}
                                className="input-compact"
                            >
                                <option value="">-</option>
                                <option value="VENUE">Venue</option>
                                <option value="CONTROL_ROOM">Control Room</option>
                                <option value="STUDIO">Studio</option>
                                <option value="REMOTE">Remote Site</option>
                            </select>
                        </div>
                    </div>
                </div>


                {/* Resources Section */}
                <div className="resources-section">
                    <div className="section-header">
                        <h3>Resources</h3>
                        <div className="section-actions">
                            <button type="button" className="btn-secondary-small" onClick={() => setIsServicePickerOpen(true)} title="Load positions from a service template">
                                🔧 Load Service
                            </button>
                            <button type="button" className="btn-secondary-small" onClick={syncAllResourcesTimes} title="Set all resources to workorder time">
                                ↺ Sync Times
                            </button>
                            <button type="button" className="btn-secondary-small" onClick={() => setIsResourcePickerOpen(true)} title="Select multiple resources">
                                📃 Multi-Select
                            </button>
                            <button type="button" className="btn-primary-small" onClick={handleAddResource}>
                                <span style={{ marginRight: '5px' }}>+</span> Add Resource
                            </button>
                            <button
                                type="button"
                                className="btn-secondary-small"
                                onClick={handleAddRequirement}
                            >
                                <span style={{ marginRight: '5px' }}>+</span> Add Requirement
                            </button>
                        </div>
                    </div>

                    <div className="resource-list">
                        {assignedResources.length === 0 ? (
                            <div className="resource-list-empty" onClick={handleAddResource}>
                                <p>No resources assigned yet. Click "+ Add Resource" or click here to start.</p>
                            </div>
                        ) : (
                            assignedResources.map((resource, index) => {
                                const availablePositions = getAvailablePositions(resource.resource_id);
                                const costInfo = calculateResourceCost(resource);

                                return (
                                    <React.Fragment key={index}>
                                        <div
                                            className="resource-row-compact draggable-resource"
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragEnd={handleDragEnd}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, index)}
                                        >
                                            <div className="col-drag-handle">
                                                <div className="drag-handle-icon">⠿</div>
                                            </div>
                                            <div className="col-resource">
                                                {!resource.resource_id && resource.position_id && (
                                                    <div className="open-req-icon" title="Open Requirement">⚠️</div>
                                                )}
                                                <select
                                                    value={resource.resource_id}
                                                    onChange={(e) => handleResourceChange(index, 'resource_id', e.target.value)}
                                                >
                                                    <option value="">
                                                        {resource.position_id ? '* Open Requirement *' : 'Select Resource...'}
                                                    </option>
                                                    {staffResources
                                                        .filter(r => {
                                                            // If no position selected, show all
                                                            if (!resource.position_id) return true;
                                                            // If currently selected, always show
                                                            if (Number(r.id) === Number(resource.resource_id)) return true;

                                                            // Filter based on qualifications
                                                            // Each resource has .positions array: [{position_id: 1, group_id: 2}, ...]
                                                            if (!r.positions || !Array.isArray(r.positions)) return true; // Fallback if data missing
                                                            return r.positions.some(p => Number(p.position_id) === Number(resource.position_id));
                                                        })
                                                        .map(r => (
                                                            <option key={r.id} value={r.id}>{r.name}</option>
                                                        ))}
                                                </select>
                                            </div>
                                            <div className="col-position">
                                                <select
                                                    value={resource.position_id}
                                                    onChange={(e) => handleResourceChange(index, 'position_id', e.target.value)}
                                                >
                                                    <option value="">Position...</option>
                                                    {availablePositions.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.abbreviation || p.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-time">
                                                <input
                                                    type="time"
                                                    value={resource.start_time ? resource.start_time.split('T')[1]?.substring(0, 5) : ''}
                                                    onChange={(e) => handleResourceTimeChange(index, 'start_time', e.target.value)}
                                                />
                                                <span>-</span>
                                                <input
                                                    type="time"
                                                    value={resource.end_time ? resource.end_time.split('T')[1]?.substring(0, 5) : ''}
                                                    onChange={(e) => handleResourceTimeChange(index, 'end_time', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-pay">
                                                <select
                                                    value={resource.cost_type === 'FLAT' ? 'FLAT' : (resource.pay_type_override || 'HOURLY')}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === 'FLAT') {
                                                            handleResourceChange(index, 'cost_type', 'FLAT');
                                                        } else {
                                                            // Clear flat_rate when switching away from FLAT
                                                            const updated = [...assignedResources];
                                                            updated[index] = {
                                                                ...updated[index],
                                                                cost_type: 'HOURLY',
                                                                flat_rate: '',
                                                                pay_type_override: val === 'HOURLY' ? '' : val
                                                            };
                                                            setAssignedResources(updated);
                                                        }
                                                    }}
                                                >
                                                    <option value="HOURLY">Hourly</option>
                                                    <option value="GUARANTEE_8">Guarantee 8</option>
                                                    <option value="GUARANTEE_10">Guarantee 10</option>
                                                    <option value="FLAT">Flat</option>
                                                </select>
                                            </div>
                                            <div className="col-cost">
                                                {resource.cost_type === 'FLAT' ? (
                                                    <input
                                                        type="number"
                                                        value={resource.flat_rate}
                                                        onChange={(e) => handleResourceChange(index, 'flat_rate', e.target.value)}
                                                        placeholder="$"
                                                        className="input-flat"
                                                    />
                                                ) : (
                                                    <span className="cost-display" title={costInfo.breakdown}>
                                                        ${costInfo.total.toFixed(0)}
                                                        {costInfo.ot_hours > 0 && <small className="ot-marker">OT</small>}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="col-actions">
                                                <button type="button" className="btn-icon-remove" onClick={() => handleRemoveResource(index)}>×</button>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })
                        )}
                    </div>

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
                        <div style={{ marginRight: 'auto', display: 'flex', gap: '10px' }}>
                            <button type="button" className="btn-delete" onClick={handleDelete} style={{ marginRight: 0 }}>
                                Delete
                            </button>
                            <button type="button" className="btn-duplicate" onClick={handleDuplicate}>
                                Duplicate
                            </button>
                        </div>
                    )}
                    <button type="button" className="btn-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" className="btn-submit" disabled={loading}>
                        {loading ? 'Saving...' : (workorder?.id ? 'Update Workorder' : 'Create Workorder')}
                    </button>
                </div>
            </form >

            <style>{`
                .workorder-modal-wrapper h2 {
                    flex-shrink: 0;
                    margin-top: 0;
                }

                /* --- GLOBAL FORM STYLES --- */
                
                .draggable-resource {
                    cursor: grab;
                    transition: all 0.2s ease;
                }
                
                .draggable-resource.dragging {
                    opacity: 0.5;
                    cursor: grabbing;
                }
                
                .draggable-resource.drag-over {
                    background: rgba(59, 130, 246, 0.05);
                    border-top: 2px solid var(--accent-primary) !important;
                }
                
                .col-drag-handle {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 30px;
                    padding-left: 5px;
                }
                
                .drag-handle-icon {
                    color: var(--text-muted);
                    font-size: 1.1rem;
                    user-select: none;
                    opacity: 0.5;
                }
                
                .draggable-resource:hover .drag-handle-icon {
                    opacity: 1;
                    color: var(--text-secondary);
                }

                .open-req-icon {
                    position: absolute;
                    left: -22px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 1rem;
                    pointer-events: none;
                }
                
                .col-resource {
                    position: relative;
                }

                label {
                    display: block;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #94a3b8;
                    margin-bottom: 0.5rem;
                }

                input, select, textarea {
                    width: 100%;
                    background: #0f172a; /* Slate 900 */
                    border: 1px solid #334155; /* Slate 700 */
                    border-radius: 6px;
                    padding: 0.75rem 1rem;
                    color: #f8fafc; /* Slate 50 */
                    font-size: 0.9rem;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }

                input::placeholder, textarea::placeholder {
                    color: #475569;
                }

                input:focus, select:focus, textarea:focus {
                    outline: none;
                    border-color: #3b82f6; /* Blue 500 */
                    box-shadow: 0 0 0 1px #3b82f6;
                }
                
                /* Specific overrides for the header grid content */
                .header-grid input, .header-grid select {
                     background: #0f172a;
                     border-color: #334155;
                }

                .workorder-modal-wrapper form {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    gap: 1.5rem; /* Main spacing between sections */
                }

                .header-compact-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    background: #1e293b;
                    padding: 0.75rem;
                    border-radius: 8px;
                    border: 1px solid #334155;
                    margin-bottom: 0.5rem;
                }
                .compact-row {
                    display: flex;
                    gap: 0.75rem;
                }
                .field-group { flex: 1; min-width: 0; }
                .title-field { flex: 2; }
                .project-field { flex: 1.5; }
                .status-field { flex: 1; max-width: 140px; }
                .time-field { flex: 1.5; }
                .location-field { flex: 1.5; }
                
                .compact-row label {
                    font-size: 0.65rem;
                    margin-bottom: 0.25rem;
                }
                .input-compact {
                    padding: 0.4rem 0.5rem;
                    font-size: 0.85rem;
                    height: 32px;
                }
                .time-range-compact {
                    display: flex;
                    gap: 0.25rem;
                    align-items: center;
                }
                
                /* Resource List Redesign */
                .resources-section {
                    padding: 0;
                    border-radius: 0;
                    background: transparent;
                    border: none;
                    gap: 0.5rem;
                }
                .section-header {
                    margin-bottom: 0.5rem;
                    padding: 0 0.5rem;
                    border: none;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .section-actions {
                    display: flex;
                    gap: 0.5rem;
                    align-items: center;
                }

                .btn-primary-small {
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 0.3rem 0.75rem;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    transition: background 0.2s;
                }
                .btn-primary-small:hover { background: #2563eb; }

                .btn-secondary-small {
                    background: transparent;
                    color: #94a3b8;
                    border: 1px solid #475569;
                    padding: 0.3rem 0.75rem;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }
                .btn-secondary-small:hover { border-color: #cbd5e1; color: #f1f5f9; }
                .resource-list {
                    background: #0f172a;
                    border: 1px solid #334155;
                    border-radius: 8px;
                    padding: 0;
                    overflow-x: auto; /* Enable horizontal scroll if window is too small for grid */
                    min-height: 100px;
                    display: flex;
                    flex-direction: column;
                }

                .resource-list-empty {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #64748b;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: background 0.2s;
                    min-height: 100px;
                }
                .resource-list-empty:hover {
                    background: rgba(59, 130, 246, 0.05);
                    color: #94a3b8;
                }
                
                .resource-row-compact {
                    display: grid;
                    grid-template-columns: 30px 200px 140px 180px 100px 90px 40px;
                    gap: 0.75rem;
                    align-items: center;
                    padding: 0.6rem 0.75rem;
                    background: #1e293b;
                    border-bottom: 1px solid #334155;
                    font-size: 0.85rem;
                    min-width: 880px; /* Enforce minimum internal width for the grid */
                }
                .resource-row-compact:last-child { border-bottom: none; }
                
                .resource-row-compact select,
                .resource-row-compact input[type="time"],
                .resource-row-compact input[type="number"] {
                    padding: 0.4rem 0.5rem;
                    height: 32px;
                    font-size: 0.8rem;
                    background: #0f172a;
                    border: 1px solid #475569;
                    border-radius: 4px;
                    color: #f8fafc;
                }
                
                .col-time {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }
                .col-time input { 
                    flex: 1;
                    min-width: 0;
                    text-align: center; 
                }
                .col-time span {
                    color: #64748b;
                    flex-shrink: 0;
                }
                
                .col-cost {
                     text-align: right;
                     font-weight: 600;
                     color: #4ade80;
                     display: flex;
                     align-items: center;
                     justify-content: flex-end;
                }
                
                .cost-display {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                }
                
                .btn-icon-remove {
                    width: 24px;
                    height: 24px;
                    line-height: 1;
                    padding: 0;
                    border: none;
                    background: transparent;
                    color: #ef4444;
                    cursor: pointer;
                    font-size: 1.2rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .btn-icon-remove:hover {
                    background: rgba(239, 68, 68, 0.1);
                    border-radius: 4px;
                }
                
                .ot-marker {
                    background: #f59e0b;
                    color: #000;
                    font-size: 0.6rem;
                    padding: 0 2px;
                    border-radius: 2px;
                    margin-left: 4px;
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

                .btn-duplicate {
                    background: transparent;
                    color: #3b82f6;
                    border: 1px solid #3b82f6;
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    cursor: pointer;
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

            {/* Resource Picker Modal for Multi-Select */}
            <ResourcePickerModal
                isOpen={isResourcePickerOpen}
                onClose={() => setIsResourcePickerOpen(false)}
                onSelect={handleAddMultipleResources}
                resources={resources}
                positions={positions}
                existingResourceIds={assignedResources.map(r => parseInt(r.resource_id)).filter(Boolean)}
            />

            {/* Service Picker Modal for Loading Service Templates */}
            <ServicePickerModal
                isOpen={isServicePickerOpen}
                onClose={() => setIsServicePickerOpen(false)}
                onSelect={handleLoadService}
                services={services}
            />
        </DraggableModal >
    );
}

export default WorkorderModal;
