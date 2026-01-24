import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays, isSameDay, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import api from '../api';
import ProjectModal from './ProjectModal';
import WorkorderModal from './WorkorderModal';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

export default function Scheduler() {
    const [events, setEvents] = useState([]);
    const [resources, setResources] = useState([]);
    const [positions, setPositions] = useState([]);
    const [positionGroups, setPositionGroups] = useState([]);
    const [projects, setProjects] = useState([]);
    const [view, setView] = useState(Views.WEEK);
    const [date, setDate] = useState(new Date());

    // Filter state
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [filterPanelOpen, setFilterPanelOpen] = useState(true);

    // Date range filter
    const [dateRangeStart, setDateRangeStart] = useState('');
    const [dateRangeEnd, setDateRangeEnd] = useState('');

    // Focused resource view (null = all resources, number = single resource)
    const [focusedResourceId, setFocusedResourceId] = useState(null);

    // Modal state
    const [projectModalOpen, setProjectModalOpen] = useState(false);
    const [workorderModalOpen, setWorkorderModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedWorkorder, setSelectedWorkorder] = useState(null);

    // Toast state
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchData = useCallback(async () => {
        try {
            const [resResources, resProjects, resPositions, resPositionGroups, resWorkorders] = await Promise.all([
                api.getResources({ status: 'ACTIVE' }),
                api.getProjects(),
                api.getPositions(),
                api.getPositionGroups(),
                api.getWorkorders()
            ]);

            const formattedResources = resResources.map(r => ({
                ...r,
                resourceId: r.id,
                resourceTitle: `${r.name}`,
            }));

            // Convert workorder resources to calendar events
            const formattedEvents = [];
            resWorkorders.forEach(wo => {
                if (wo.resources) {
                    wo.resources.forEach(resource => {
                        formattedEvents.push({
                            id: `wo-${wo.id}-${resource.id}`,
                            workorderId: wo.id,
                            projectId: wo.project_id,
                            resourceId: resource.resource_id,
                            title: wo.title,
                            projectTitle: wo.project_title,
                            positionName: resource.position_abbrev || resource.position_name,
                            resourceName: resource.resource_name,
                            start: new Date(resource.start_time),
                            end: new Date(resource.end_time),
                            color: wo.color || '#3B82F6',
                            workorder: wo,
                        });
                    });
                }
            });

            setResources(formattedResources);
            setEvents(formattedEvents);
            setProjects(resProjects);
            setPositions(resPositions);
            setPositionGroups(resPositionGroups);

            // Initialize selected groups to all groups
            if (selectedGroups.length === 0 && resPositionGroups.length > 0) {
                setSelectedGroups(resPositionGroups.map(g => g.id));
            }
        } catch (error) {
            console.error("Error fetching data", error);
            showToast('Failed to load data', 'error');
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Filter resources based on selected position groups
    const filteredResources = resources.filter(r => {
        // If focusing on a single resource, show only that one
        if (focusedResourceId) {
            return r.id === focusedResourceId;
        }

        // Equipment and facilities are always shown
        if (r.type !== 'STAFF') return true;

        // If no groups selected, hide all staff (unless explicitly focused, handled above)
        if (selectedGroups.length === 0) return false;

        // Parse positions safely
        let positions = r.positions;
        if (typeof positions === 'string') {
            try {
                positions = JSON.parse(positions);
            } catch (e) {
                positions = [];
            }
        }
        if (!Array.isArray(positions)) positions = [];

        // Show staff only if they have a position in the selected groups
        // OR if they have NO positions (Unassigned), always show them so they aren't lost
        if (positions.length === 0) return true;

        return positions.some(p =>
            selectedGroups.map(Number).includes(Number(p.group_id))
        );
    });

    // Helper to get days for the grid
    const getGridDays = () => {
        let start, end;

        if (dateRangeStart && dateRangeEnd) {
            start = parse(dateRangeStart, 'yyyy-MM-dd', new Date());
            end = parse(dateRangeEnd, 'yyyy-MM-dd', new Date());
        } else if (view === Views.DAY) {
            start = date;
            end = date;
        } else if (view === Views.MONTH) {
            start = startOfMonth(date);
            end = endOfMonth(date);
        } else if (view === Views.WORK_WEEK) {
            start = startOfWeek(date, { weekStartsOn: 1 }); // Start Monday
            end = addDays(start, 4); // End Friday
        } else {
            // Default Week
            start = startOfWeek(date, { weekStartsOn: 0 });
            end = addDays(start, 6);
        }

        const days = [];
        let day = start;
        while (day <= end) {
            days.push(day);
            day = addDays(day, 1);
        }
        return days;
    };

    const gridDays = getGridDays();

    const handleSelectSlot = ({ resourceId, start, end }) => {
        setSelectedWorkorder(null);
        setWorkorderModalOpen(true);
    };

    const handleSelectEvent = (event) => {
        // Fetch the full workorder data
        setSelectedWorkorder(event.workorder);
        setWorkorderModalOpen(true);
    };

    const handleNewProject = () => {
        setSelectedProject(null);
        setProjectModalOpen(true);
    };

    const handleNewWorkorder = () => {
        setSelectedWorkorder(null);
        setWorkorderModalOpen(true);
    };

    const handleSaveProject = () => {
        fetchData();
        showToast('Project saved successfully');
    };

    const handleSaveWorkorder = () => {
        fetchData();
        showToast('Workorder saved successfully');
    };

    const handleDeleteWorkorder = () => {
        fetchData();
        showToast('Workorder deleted');
    };

    const toggleGroup = (groupId) => {
        setSelectedGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    const selectAllGroups = () => {
        setSelectedGroups(positionGroups.map(g => g.id));
    };

    const clearAllGroups = () => {
        setSelectedGroups([]);
    };

    // Custom event styling
    const eventStyleGetter = (event) => {
        return {
            style: {
                background: event.color || '#3B82F6',
                border: 'none',
                borderRadius: '4px',
                opacity: 1,
                fontSize: '0.75rem',
            }
        };
    };

    // Custom event component
    const EventComponent = ({ event }) => (
        <div className="event-content">
            <div className="event-title">{event.title}</div>
            {event.positionName && (
                <div className="event-position">{event.positionName}</div>
            )}
        </div>
    );

    return (
        <div className="scheduler-container">
            {/* Filter Panel */}
            <div className={`filter-panel ${filterPanelOpen ? 'open' : 'closed'}`}>
                <div className="filter-header">
                    <h3>Position Groups</h3>
                    <button
                        className="toggle-btn"
                        onClick={() => setFilterPanelOpen(!filterPanelOpen)}
                    >
                        {filterPanelOpen ? '◀' : '▶'}
                    </button>
                </div>

                {filterPanelOpen && (
                    <div className="filter-content">
                        <div className="filter-actions">
                            <button onClick={selectAllGroups}>All</button>
                            <button onClick={clearAllGroups}>None</button>
                        </div>

                        <div className="group-list">
                            {positionGroups.map(group => (
                                <label key={group.id} className="group-item">
                                    <input
                                        type="checkbox"
                                        checked={selectedGroups.includes(group.id)}
                                        onChange={() => toggleGroup(group.id)}
                                    />
                                    <span
                                        className="group-color"
                                        style={{ background: group.color }}
                                    />
                                    <span className="group-name">{group.name}</span>
                                    <span className="group-count">{group.position_count}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="scheduler-main">
                {/* Header */}
                <div className="scheduler-header">
                    <div>
                        <h1>Schedule</h1>
                        <p className="subtitle">View and manage workorders</p>
                    </div>
                    <div className="header-actions">
                        <button className="btn btn-secondary" onClick={handleNewProject}>
                            + New Project
                        </button>
                        <button className="btn btn-primary" onClick={handleNewWorkorder}>
                            + New Workorder
                        </button>
                    </div>
                </div>

                {/* Date Range Selector */}
                <div className="date-range-controls">
                    <label>From:</label>
                    <input
                        type="date"
                        value={dateRangeStart}
                        onChange={(e) => setDateRangeStart(e.target.value)}
                        className="date-input"
                    />
                    <label>To:</label>
                    <input
                        type="date"
                        value={dateRangeEnd}
                        onChange={(e) => setDateRangeEnd(e.target.value)}
                        className="date-input"
                    />
                    {(dateRangeStart || dateRangeEnd) && (
                        <button
                            className="btn btn-small"
                            onClick={() => { setDateRangeStart(''); setDateRangeEnd(''); }}
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* Focused Resource Banner */}
                {focusedResourceId && (
                    <div className="focused-resource-banner">
                        <span>Viewing: {resources.find(r => r.id === focusedResourceId)?.name || 'Resource'}</span>
                        <button
                            className="btn btn-small"
                            onClick={() => { setFocusedResourceId(null); setView(Views.WEEK); }}
                        >
                            ← Back to All
                        </button>
                    </div>
                )}

                {/* View Selector */}
                <div className="view-controls">
                    {[
                        { key: Views.DAY, label: 'Day' },
                        { key: Views.WEEK, label: 'Week' },
                        { key: Views.WORK_WEEK, label: 'Work Week' },
                        { key: Views.MONTH, label: 'Month' },
                    ].map((v) => (
                        <button
                            key={v.key}
                            onClick={() => setView(v.key)}
                            className={`view-btn ${view === v.key ? 'active' : ''}`}
                        >
                            {v.label}
                        </button>
                    ))}
                </div>

                {!focusedResourceId ? (
                    <div className="calendar-wrapper custom-grid-wrapper">
                        <div
                            className="custom-grid"
                            style={{ '--col-count': gridDays.length }}
                        >
                            {/* Header Row */}
                            <div className="grid-header" style={{ gridTemplateColumns: `200px repeat(${gridDays.length}, minmax(120px, 1fr))` }}>
                                <div className="resource-header">Resource</div>
                                {gridDays.map(dayDate => {
                                    const isToday = isSameDay(dayDate, new Date());
                                    // Show day number only if month view or many days
                                    const isMonthView = view === Views.MONTH || gridDays.length > 7;
                                    return (
                                        <div key={dayDate.toString()} className={`day-header ${isToday ? 'today' : ''}`}>
                                            <div className="day-name">{format(dayDate, 'EEE')}</div>
                                            <div className="day-date">{format(dayDate, isMonthView ? 'd' : 'MMM d')}</div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Resource Rows */}
                            <div className="grid-body">
                                {filteredResources.map(resource => (
                                    <div key={resource.id} className="grid-row" style={{ gridTemplateColumns: `200px repeat(${gridDays.length}, minmax(120px, 1fr))` }}>
                                        {/* Resource Info Column */}
                                        <div className="resource-cell">
                                            <div className="resource-info">
                                                <div className="resource-name">{resource.name}</div>
                                                <div className="resource-meta">
                                                    {resource.type === 'STAFF' ? (
                                                        (resource.positions && resource.positions.length > 0) ? (
                                                            resource.positions.map(p => (
                                                                <span key={p.position_id} className="badge badge-staff" style={{ marginRight: '4px' }}>
                                                                    {p.abbreviation || p.position_name?.substring(0, 3)}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="badge badge-staff" style={{ opacity: 0.7 }}>Unassigned</span>
                                                        )
                                                    ) : (
                                                        <span className="badge badge-facility">
                                                            {resource.type}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                className="resource-focus-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFocusedResourceId(resource.id);
                                                    setView(Views.MONTH);
                                                    setDateRangeStart('');
                                                    setDateRangeEnd('');
                                                }}
                                                title="View this resource's calendar"
                                            >
                                                📅
                                            </button>
                                        </div>

                                        {/* Days Columns */}
                                        {gridDays.map(dayDate => {
                                            // Find events specifically for this resource on this day
                                            const dayEvents = events.filter(evt =>
                                                evt.resourceId === resource.id &&
                                                (
                                                    isSameDay(evt.start, dayDate) ||
                                                    (evt.start < addDays(dayDate, 1) && evt.end > dayDate)
                                                )
                                            );

                                            return (
                                                <div
                                                    key={dayDate.toString()}
                                                    className="day-cell"
                                                    onClick={() => handleSelectSlot({ resourceId: resource.id, start: dayDate, end: dayDate })}
                                                >
                                                    {dayEvents.map(evt => (
                                                        <div
                                                            key={evt.id}
                                                            className="workorder-card"
                                                            style={{ borderLeftColor: evt.color }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSelectEvent({ workorder: evt.workorder });
                                                            }}
                                                            title={`${evt.title} (${format(evt.start, 'h:mma')} - ${format(evt.end, 'h:mma')})`}
                                                        >
                                                            {(view !== Views.MONTH && gridDays.length <= 7) && (
                                                                <div className="wo-time">
                                                                    {format(evt.start, 'h:mma')} - {format(evt.end, 'h:mma')}
                                                                </div>
                                                            )}
                                                            <div className="wo-title">{evt.title}</div>
                                                            {(view !== Views.MONTH && gridDays.length <= 7) && evt.positionName && (
                                                                <div className="wo-position">{evt.positionName}</div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="calendar-wrapper">
                        <Calendar
                            localizer={localizer}
                            events={events.filter(evt => evt.resourceId === focusedResourceId)}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: 'calc(100vh - 250px)' }}
                            view={view}
                            onView={setView}
                            date={date}
                            onNavigate={setDate}
                            onSelectEvent={(evt) => handleSelectEvent({ workorder: evt.workorder })}
                            onSelectSlot={(slotInfo) => handleSelectSlot({ resourceId: focusedResourceId, start: slotInfo.start, end: slotInfo.end })}
                            selectable
                            components={{
                                event: ({ event }) => (
                                    <div className="event-content" title={event.title}>
                                        <div className="event-title">{event.title}</div>
                                    </div>
                                )
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Project Modal */}
            <ProjectModal
                isOpen={projectModalOpen}
                onClose={() => setProjectModalOpen(false)}
                project={selectedProject}
                onSave={handleSaveProject}
            />

            {/* Workorder Modal */}
            <WorkorderModal
                isOpen={workorderModalOpen}
                onClose={() => setWorkorderModalOpen(false)}
                workorder={selectedWorkorder}
                projects={projects}
                resources={resources}
                positions={positions}
                onSave={handleSaveWorkorder}
                onDelete={handleDeleteWorkorder}
            />

            {/* Toast Notifications */}
            {toast && (
                <div className="toast-container">
                    <div className={`toast toast-${toast.type}`}>
                        {toast.type === 'success' ? '✓' : '✕'} {toast.message}
                    </div>
                </div>
            )}

            <style>{`
                .scheduler-container {
                    display: flex;
                    height: 100%;
                    gap: 0;
                }

                .filter-panel {
                    background: rgba(15, 23, 42, 0.95);
                    border-right: 1px solid rgba(148, 163, 184, 0.1);
                    transition: width 0.3s ease;
                    display: flex;
                    flex-direction: column;
                }

                .filter-panel.open {
                    width: 220px;
                }

                .filter-panel.closed {
                    width: 40px;
                }

                .filter-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
                }

                .filter-header h3 {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #e2e8f0;
                    margin: 0;
                    white-space: nowrap;
                    overflow: hidden;
                }

                .filter-panel.closed .filter-header h3 {
                    display: none;
                }

                .toggle-btn {
                    background: none;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    padding: 0.25rem;
                    font-size: 0.75rem;
                }

                .filter-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0.5rem;
                }

                .filter-actions {
                    display: flex;
                    gap: 0.5rem;
                    padding: 0.5rem;
                }

                .filter-actions button {
                    flex: 1;
                    padding: 0.25rem 0.5rem;
                    font-size: 0.75rem;
                    background: rgba(59, 130, 246, 0.2);
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    color: #93c5fd;
                    border-radius: 4px;
                    cursor: pointer;
                }

                .group-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .group-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: background 0.15s;
                }

                .group-item:hover {
                    background: rgba(148, 163, 184, 0.1);
                }

                .group-item input {
                    accent-color: #3b82f6;
                }

                .group-color {
                    width: 12px;
                    height: 12px;
                    border-radius: 3px;
                }

                .group-name {
                    flex: 1;
                    font-size: 0.875rem;
                    color: #e2e8f0;
                }

                .group-count {
                    font-size: 0.75rem;
                    color: #64748b;
                    background: rgba(100, 116, 139, 0.2);
                    padding: 0.125rem 0.375rem;
                    border-radius: 4px;
                }

                .scheduler-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    padding: 1.5rem;
                    overflow: hidden;
                }

                .scheduler-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }

                .scheduler-header h1 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #f1f5f9;
                    margin: 0;
                }

                .scheduler-header .subtitle {
                    color: #64748b;
                    font-size: 0.875rem;
                    margin: 0.25rem 0 0 0;
                }

                .header-actions {
                    display: flex;
                    gap: 0.75rem;
                }

                .btn {
                    padding: 0.625rem 1.25rem;
                    border-radius: 8px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.15s;
                }

                .btn-primary {
                    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                    color: white;
                    border: none;
                }

                .btn-secondary {
                    background: transparent;
                    color: #94a3b8;
                    border: 1px solid rgba(148, 163, 184, 0.3);
                }

                .btn-secondary:hover {
                    background: rgba(148, 163, 184, 0.1);
                }

                .view-controls {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }

                .view-btn {
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    background: transparent;
                    color: #94a3b8;
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    cursor: pointer;
                    font-size: 0.875rem;
                    transition: all 0.15s;
                }

                .view-btn.active {
                    background: #3b82f6;
                    color: white;
                    border-color: #3b82f6;
                }

                .calendar-wrapper {
                    flex: 1;
                    min-height: 0;
                    background: rgba(30, 41, 59, 0.5);
                    border-radius: 12px;
                    padding: 1rem;
                    overflow: auto;
                }

                .date-range-controls {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.5rem;
                    padding: 0.5rem;
                    background: rgba(30, 41, 59, 0.5);
                    border-radius: 8px;
                }

                .date-range-controls label {
                    color: #94a3b8;
                    font-size: 0.875rem;
                }

                .date-input {
                    background: rgba(15, 23, 42, 0.6);
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    color: #e2e8f0;
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-family: inherit;
                    color-scheme: dark;
                }

                .focused-resource-banner {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(59, 130, 246, 0.2);
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    padding: 0.75rem 1rem;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                    color: #93c5fd;
                    font-weight: 500;
                }

                /* Update Resource Cell Layout */
                .resource-cell {
                    padding: 0.75rem;
                    border-right: 1px solid rgba(148, 163, 184, 0.1);
                    background: rgba(30, 41, 59, 0.5);
                    display: flex;
                    flex-direction: row; /* Changed to row */
                    justify-content: space-between;
                    align-items: center;
                    position: sticky;
                    left: 0;
                    z-index: 5;
                }

                .resource-info {
                    display: flex;
                    flex-direction: column;
                }

                .resource-focus-btn {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    font-size: 1.25rem;
                    opacity: 0.5;
                    transition: opacity 0.2s;
                    padding: 4px;
                    border-radius: 4px;
                }

                .resource-focus-btn:hover {
                    opacity: 1;
                    background: rgba(255, 255, 255, 0.1);
                }

                    height: 100%;
                }

                .event-content {
                    padding: 2px 4px;
                }

                .event-title {
                    font-weight: 500;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .event-position {
                    font-size: 0.65rem;
                    opacity: 0.8;
                }

                .toast-container {
                    position: fixed;
                    top: 1rem;
                    right: 1rem;
                    z-index: 1000;
                }

                .toast {
                    padding: 0.75rem 1.25rem;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    animation: slideIn 0.3s ease;
                }

                .toast-success {
                    background: rgba(34, 197, 94, 0.9);
                    color: white;
                }

                .toast-error {
                    background: rgba(239, 68, 68, 0.9);
                    color: white;
                }

                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                /* Custom Grid Styles */
                .custom-grid-wrapper {
                    padding: 0;
                    overflow: auto;
                    background: #0f172a; /* Match body bg */
                }

                .custom-grid {
                    display: grid;
                    min-width: 1000px; /* Ensure horizontal scroll on small screens */
                }

                .grid-header {
                    display: grid;
                    grid-template-columns: 200px repeat(7, 1fr);
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    background: #1e293b;
                    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
                }

                .resource-header {
                    padding: 1rem;
                    font-weight: 600;
                    color: #94a3b8;
                    border-right: 1px solid rgba(148, 163, 184, 0.1);
                    display: flex;
                    align-items: center;
                }

                .day-header {
                    padding: 0.75rem;
                    text-align: center;
                    border-right: 1px solid rgba(148, 163, 184, 0.1);
                    background: #1e293b;
                }

                .day-header.today {
                    background: rgba(59, 130, 246, 0.1);
                }

                .day-name {
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    color: #94a3b8;
                    font-weight: 600;
                }

                .day-date {
                    font-size: 0.9rem;
                    color: #e2e8f0;
                    margin-top: 0.25rem;
                }

                .grid-body {
                    display: flex;
                    flex-direction: column;
                }

                .grid-row {
                    display: grid;
                    /* grid-template-columns set via inline style */
                    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
                    min-height: 80px;
                }

                .grid-row:hover {
                    background: rgba(30, 41, 59, 0.3);
                }



                .resource-name {
                    font-weight: 500;
                    color: #f1f5f9;
                    font-size: 0.9rem;
                }

                .resource-meta {
                    margin-top: 0.25rem;
                }

                .day-cell {
                    padding: 0.5rem;
                    border-right: 1px solid rgba(148, 163, 184, 0.1);
                    min-height: 80px;
                    cursor: pointer;
                    transition: background 0.2s;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .day-cell:hover {
                    background: rgba(255, 255, 255, 0.02);
                }

                .workorder-card {
                    background: rgba(30, 41, 59, 0.9);
                    border-left: 3px solid #3b82f6;
                    padding: 0.35rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }

                .workorder-card:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                    z-index: 2;
                }

                .wo-time {
                    font-size: 0.65rem;
                    color: #94a3b8;
                    margin-bottom: 2px;
                }

                .wo-title {
                    font-weight: 600;
                    color: #e2e8f0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .wo-position {
                    font-size: 0.65rem;
                    color: #cbd5e1;
                    margin-top: 2px;
                    font-style: italic;
                }

                .badge {
                    display: inline-block;
                    padding: 0.15rem 0.4rem;
                    border-radius: 4px;
                    font-size: 0.65rem;
                    font-weight: 500;
                    text-transform: uppercase;
                }

                .badge-staff {
                    background: rgba(59, 130, 246, 0.2);
                    color: #93c5fd;
                }

                .badge-facility {
                    background: rgba(16, 185, 129, 0.2);
                    color: #6ee7b7;
                }
            `}</style>
        </div>
    );
}
