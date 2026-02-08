import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays, isSameDay, startOfMonth, endOfMonth, differenceInMinutes, addMinutes, startOfDay, getWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths, isBefore, isAfter } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import api from '../api';
import ProjectModal from './ProjectModal';
import WorkorderModal from './WorkorderModal';
import GroupManager from './GroupManager';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './Scheduler.css';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

// Time slot configuration - Dynamic 2-hour intervals for labels
const TIME_DISPLAY_SLOTS = [
    { label: '6a', hour: 6 },
    { label: '8a', hour: 8 },
    { label: '10a', hour: 10 },
    { label: '12p', hour: 12 },
    { label: '2p', hour: 14 },
    { label: '4p', hour: 16 },
    { label: '6p', hour: 18 },
    { label: '8p', hour: 20 },
    { label: '10p', hour: 22 },
];

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 23; // 11 PM
const SLOT_HEIGHT = 80;
const RESOURCE_COLUMN_WIDTH = 220;

// MiniCalendar Component for Date Selection
const MiniCalendar = ({ selectedDates, onSelect, onClose }) => {
    const [viewDate, setViewDate] = useState(new Date());
    const [pendingDates, setPendingDates] = useState([...selectedDates]);
    const [dragStart, setDragStart] = useState(null);
    const [dragEnd, setDragEnd] = useState(null);

    const updateSelection = (day, e) => {
        if (Array.isArray(day)) {
            setPendingDates(day.sort((a, b) => a - b));
            return;
        }
        const isMulti = e?.metaKey || e?.ctrlKey;
        const isRange = e?.shiftKey;
        if (isRange && pendingDates.length > 0) {
            const lastDate = pendingDates[pendingDates.length - 1];
            const start = isBefore(day, lastDate) ? day : lastDate;
            const end = isAfter(day, lastDate) ? day : lastDate;
            const range = eachDayOfInterval({ start, end });
            const currentIds = new Set(pendingDates.map(d => d.getTime()));
            const newDates = [...pendingDates];
            range.forEach(d => {
                if (!currentIds.has(d.getTime())) newDates.push(d);
            });
            setPendingDates(newDates.sort((a, b) => a - b));
        } else if (isMulti) {
            const exists = pendingDates.find(d => isSameDay(d, day));
            if (exists) {
                setPendingDates(pendingDates.filter(d => !isSameDay(d, day)));
            } else {
                setPendingDates([...pendingDates, day].sort((a, b) => a - b));
            }
        } else {
            setPendingDates([day]);
        }
    };

    const header = (
        <div className="mini-cal-header">
            <button onClick={(e) => { e.stopPropagation(); setViewDate(subMonths(viewDate, 1)); }}>◀</button>
            <span>{format(viewDate, 'MMMM yyyy')}</span>
            <button onClick={(e) => { e.stopPropagation(); setViewDate(addMonths(viewDate, 1)); }}>▶</button>
        </div>
    );

    const daysHeader = (
        <div className="mini-cal-days-header">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
        </div>
    );

    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const handleMouseDown = (day, e) => {
        if (e.button !== 0) return; // Only left click
        setDragStart(day);
        setDragEnd(day);
    };

    const handleMouseEnter = (day) => {
        if (dragStart) {
            setDragEnd(day);
        }
    };

    const handleMouseUp = useCallback(() => {
        if (dragStart && dragEnd) {
            if (!isSameDay(dragStart, dragEnd)) {
                const start = isBefore(dragStart, dragEnd) ? dragStart : dragEnd;
                const end = isAfter(dragStart, dragEnd) ? dragStart : dragEnd;
                const range = eachDayOfInterval({ start, end });
                updateSelection(range);
            }
        }
        setDragStart(null);
        setDragEnd(null);
    }, [dragStart, dragEnd, onSelect]);

    useEffect(() => {
        if (dragStart) {
            window.addEventListener('mouseup', handleMouseUp);
            return () => window.removeEventListener('mouseup', handleMouseUp);
        }
    }, [dragStart, handleMouseUp]);

    const handleDayClick = (day, e) => {
        e.stopPropagation();
        // Only trigger click selection if we didn't just finish a drag range
        if (dragStart && dragEnd && !isSameDay(dragStart, dragEnd)) return;
        updateSelection(day, e);
    };

    return (
        <div className="mini-calendar" onClick={e => e.stopPropagation()} onMouseLeave={() => { }}>
            {header}
            {daysHeader}
            <div className="mini-cal-grid">
                {days.map(day => {
                    const isSelected = pendingDates.some(d => isSameDay(d, day));
                    const isCurrentMonth = isSameMonth(day, viewDate);

                    const isDragging = dragStart && dragEnd && (
                        (isBefore(day, dragEnd) && isAfter(day, dragStart)) ||
                        (isBefore(day, dragStart) && isAfter(day, dragEnd)) ||
                        isSameDay(day, dragStart) ||
                        isSameDay(day, dragEnd)
                    );

                    return (
                        <div
                            key={day.toString()}
                            className={`mini-cal-day ${!isCurrentMonth ? 'faded' : ''} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
                            onMouseDown={(e) => handleMouseDown(day, e)}
                            onMouseEnter={() => handleMouseEnter(day)}
                            onClick={(e) => handleDayClick(day, e)}
                        >
                            {format(day, 'd')}
                        </div>
                    );
                })}
            </div>
            <div className="mini-cal-actions">
                <button onClick={(e) => { e.stopPropagation(); setPendingDates([]); }} className="btn-text">Clear</button>
                <button
                    onClick={(e) => { e.stopPropagation(); onSelect(pendingDates); onClose(); }}
                    className="btn-primary btn-sm"
                >
                    Apply Selection
                </button>
            </div>
        </div>
    );
};

export default function Scheduler({ sidebarAction, onDataChange, onProjectCreated }) {
    const [events, setEvents] = useState([]);
    const [resources, setResources] = useState([]);
    const [positions, setPositions] = useState([]);
    const [positionGroups, setPositionGroups] = useState([]);
    const [projects, setProjects] = useState([]);
    const [view, setView] = useState(Views.WEEK);
    const [date, setDate] = useState(new Date());
    const [isCompactMode, setIsCompactMode] = useState(false);

    // Filter state
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [filterPanelOpen, setFilterPanelOpen] = useState(true);

    // Schedule Book tabs state
    const [activeScheduleBook, setActiveScheduleBook] = useState('all');

    // Date range filter
    const [dateRangeStart, setDateRangeStart] = useState('');
    const [dateRangeEnd, setDateRangeEnd] = useState('');

    // Custom Date Selection State
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [selectedDates, setSelectedDates] = useState([]);

    // Focused resource view (null = all resources, number = single resource)
    const [focusedResourceId, setFocusedResourceId] = useState(null);

    // Collapsed groups state
    const [collapsedGroups, setCollapsedGroups] = useState({});

    // Group drag state
    const [draggedGroupId, setDraggedGroupId] = useState(null);
    const [dragOverGroupId, setDragOverGroupId] = useState(null);
    const [groupOrder, setGroupOrder] = useState(() => {
        // Initialize from localStorage if available
        try {
            const saved = localStorage.getItem('scheduler-group-order');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Modal state
    const [projectModalOpen, setProjectModalOpen] = useState(false);
    const [workorderModalOpen, setWorkorderModalOpen] = useState(false);
    const [groupManagerOpen, setGroupManagerOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedWorkorder, setSelectedWorkorder] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null); // For click-and-drag workorder creation

    // Drag selection state for timeline view (horizontal drag across time)
    const [dragSelection, setDragSelection] = useState(null); // { resourceId, dayDate, startX, currentX, startTime, endTime, rect }
    const [isDragging, setIsDragging] = useState(false);

    // Toast state
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchData = useCallback(async () => {
        try {
            const [resResources, resProjects, resPositions, resCategories, resWorkorders] = await Promise.all([
                api.getResources({ status: 'ACTIVE' }),
                api.getProjects(),
                api.getPositions(),
                api.getCategories(),
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
                // Check if workorder has any open requirements (unassigned positions)
                // We check if any resource entry has a position_id but no resource_id
                const hasOpenRequirements = wo.resources && wo.resources.some(r => !r.resource_id && r.position_id);

                if (wo.resources) {
                    wo.resources.forEach(resource => {
                        // Only create events for assigned resources
                        if (!resource.resource_id) return;

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
                            hasOpenRequirements: hasOpenRequirements,
                        });
                    });
                }
            });

            setResources(formattedResources);
            setEvents(formattedEvents);
            setProjects(resProjects);
            setPositions(resPositions);
            setPositionGroups(resCategories);
        } catch (error) {
            console.error("Error fetching data", error);
            showToast('Failed to load data', 'error');
        }
    }, []);

    // Initialize selected groups only once when groups are loaded
    useEffect(() => {
        if (selectedGroups.length === 0 && positionGroups.length > 0) {
            // Check if this is the first load (to avoid overriding user's manual "deselect all")
            // We can check if previous state was empty because of initialization vs user action.
            // But simplify: Only default to All if we have groups and haven't touched selection yet?
            // Actually, the user COMPLAINED about it resetting when they selected None.
            // So we should ONLY initialize if we believe it's the app start.
            // Since we don't have a "hasInitialized" flag in state, we can assume if the array is empty 
            // AND we just loaded groups, we might want to set them. 
            // BUT, if the user explicitly cleared them, we don't want to reset.
            // The previous bug was that fetchData was called, saw 0 selected, and Reset them.
            // By moving this out of fetchData, we solve the recursion.
            // But we still need to know: should we select all on load?
            // Let's use a ref to track if we've done the initial populate.
        }
    }, [positionGroups]); // We'll rely on the ref approach in the next chunk or handle logic differently.

    // Better Approach: Use a ref to track initialization
    const groupsInitializedRef = React.useRef(false);

    useEffect(() => {
        if (!groupsInitializedRef.current && positionGroups.length > 0) {
            setSelectedGroups(positionGroups.map(g => g.id));
            groupsInitializedRef.current = true;
        }
    }, [positionGroups]);

    // Handle schedule book tab changes
    useEffect(() => {
        if (activeScheduleBook === 'all') {
            // When "All Resources" is selected, show all groups
            setSelectedGroups(positionGroups.map(g => g.id));
        }
    }, [activeScheduleBook, positionGroups]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!sidebarAction) return;

        if (sidebarAction === 'new-project') {
            handleNewProject();
        } else if (sidebarAction === 'new-workorder') {
            handleNewWorkorder();
        } else if (sidebarAction === 'manage-groups') {
            setGroupManagerOpen(true);
        } else if (String(sidebarAction).startsWith('edit-workorder-')) {
            const woId = parseInt(sidebarAction.split('-')[2]);
            // Ideally fetch latest, but finding in loaded data is faster for now
            // We need to fetch specific workorder to get full nested data
            api.getWorkorder(woId).then(wo => {
                setSelectedWorkorder(wo);
                setWorkorderModalOpen(true);
            }).catch(console.error);
        } else if (String(sidebarAction).startsWith('new-workorder-project-')) {
            const projId = parseInt(sidebarAction.split('project-')[1]);
            setSelectedWorkorder({ project_id: projId }); // Pre-select project
            setWorkorderModalOpen(true);
        }
    }, [sidebarAction]);

    // Global mouse up to handle drag cancellation
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                setDragSelection(null);
            }
        };

        if (isDragging) {
            document.addEventListener('mouseup', handleGlobalMouseUp);
            // Prevent text selection during drag
            document.body.style.userSelect = 'none';
        } else {
            document.body.style.userSelect = '';
        }

        return () => {
            document.removeEventListener('mouseup', handleGlobalMouseUp);
            document.body.style.userSelect = '';
        };
    }, [isDragging]);

    const filteredResources = resources.filter(r => {
        if (focusedResourceId) return r.id === focusedResourceId;
        if (r.type !== 'STAFF') return true;
        if (selectedGroups.length === 0) return false;

        let types = r.types;
        if (typeof types === 'string') {
            try { types = JSON.parse(types); } catch (e) { types = []; }
        }
        if (!Array.isArray(types)) types = [];
        if (types.length === 0) return true;

        return types.some(t => selectedGroups.map(Number).includes(Number(t.category_id)));
    });

    const groupedResources = useMemo(() => {
        const grouped = {};
        const unassigned = [];

        filteredResources.forEach(resource => {
            let types = resource.types;
            if (typeof types === 'string') {
                try { types = JSON.parse(types); } catch (e) { types = []; }
            }
            if (!Array.isArray(types)) types = [];

            if (resource.type !== 'STAFF') {
                const typeKey = resource.type || 'OTHER';
                if (!grouped[`type_${typeKey}`]) {
                    grouped[`type_${typeKey}`] = {
                        id: `type_${typeKey}`,
                        name: typeKey === 'FACILITY' ? 'Facilities' : typeKey === 'EQUIPMENT' ? 'Equipment' : typeKey,
                        color: '#6366f1',
                        resources: [],
                        isTypeGroup: true,
                    };
                }
                grouped[`type_${typeKey}`].resources.push(resource);
            } else if (types.length === 0) {
                unassigned.push(resource);
            } else {
                types.forEach(t => {
                    const categoryId = t.category_id;
                    const category = positionGroups.find(c => c.id === categoryId);
                    if (category && !grouped[categoryId]) {
                        grouped[categoryId] = {
                            id: categoryId,
                            name: category.name,
                            color: category.color || '#3b82f6',
                            resources: [],
                        };
                    }
                    if (grouped[categoryId] && !grouped[categoryId].resources.find(r => r.id === resource.id)) {
                        grouped[categoryId].resources.push(resource);
                    }
                });
            }
        });

        if (unassigned.length > 0) {
            grouped['unassigned'] = { id: 'unassigned', name: '* Unassigned Labor', color: '#64748b', resources: unassigned };
        }
        return grouped;
    }, [filteredResources, positionGroups]);

    // Initialize group order when groupedResources changes
    useEffect(() => {
        const groupIds = Object.keys(groupedResources);
        // Don't update if groupedResources is empty (still loading)
        if (groupIds.length === 0) return;

        setGroupOrder(prevOrder => {
            // If we have a saved order, merge it with current groups
            if (prevOrder.length > 0) {
                // Keep existing order for groups that still exist, add new groups at the end
                const existingInOrder = prevOrder.filter(id => groupIds.includes(String(id)));
                const newGroups = groupIds.filter(id => !prevOrder.map(String).includes(String(id)));
                return [...existingInOrder, ...newGroups];
            }
            // No saved order, use default
            return groupIds;
        });
    }, [groupedResources]);

    // Persist group order to localStorage (only when we have real data)
    const groupOrderInitialized = useRef(false);
    useEffect(() => {
        // Only save after we've had at least one valid order
        if (groupOrder.length > 0) {
            groupOrderInitialized.current = true;
            localStorage.setItem('scheduler-group-order', JSON.stringify(groupOrder));
        }
    }, [groupOrder]);

    // Create ordered groups array for rendering
    const orderedGroups = useMemo(() => {
        return groupOrder
            .map(id => {
                // Handle both string and number keys
                return groupedResources[id] || groupedResources[String(id)] || groupedResources[Number(id)];
            })
            .filter(Boolean); // Filter out any that don't exist
    }, [groupOrder, groupedResources]);

    const getGridDays = () => {
        if (selectedDates.length > 0) {
            // If custom dates selected, return them sorted
            return [...selectedDates].sort((a, b) => a - b);
        }

        let start, end;
        if (dateRangeStart && dateRangeEnd) {
            start = parse(dateRangeStart, 'yyyy-MM-dd', new Date());
            end = parse(dateRangeEnd, 'yyyy-MM-dd', new Date());
        } else if (view === Views.DAY) {
            start = date; end = date;
        } else if (view === Views.MONTH) {
            start = startOfMonth(date); end = endOfMonth(date);
        } else {
            start = startOfWeek(date, { weekStartsOn: 0 }); end = addDays(start, 6);
        }

        // Safety check if start/end are invalid
        if (!start || !end) return [new Date()];

        const days = [];
        let day = start;
        while (day <= end) { days.push(day); day = addDays(day, 1); }
        return days;
    };

    const gridDays = getGridDays();

    const toggleGroupCollapse = (groupId) => {
        setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    // Group drag handlers
    const handleGroupDragStart = (e, groupId) => {
        e.stopPropagation();
        const stringId = String(groupId);
        setDraggedGroupId(stringId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleGroupDragOver = (e, groupId) => {
        e.preventDefault();
        e.stopPropagation();
        const stringId = String(groupId);
        if (draggedGroupId && draggedGroupId !== stringId) {
            setDragOverGroupId(stringId);
        }
    };

    const handleGroupDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverGroupId(null);
    };

    const handleGroupDrop = (e, targetGroupId) => {
        e.preventDefault();
        e.stopPropagation();

        const targetId = String(targetGroupId);
        const draggedId = draggedGroupId;

        if (!draggedId || draggedId === targetId) {
            setDraggedGroupId(null);
            setDragOverGroupId(null);
            return;
        }

        // Reorder the groups
        setGroupOrder(prevOrder => {
            const newOrder = [...prevOrder];
            const draggedIndex = newOrder.findIndex(id => String(id) === draggedId);
            const targetIndex = newOrder.findIndex(id => String(id) === targetId);

            if (draggedIndex !== -1 && targetIndex !== -1) {
                // Remove from old position and insert at new position
                const [removed] = newOrder.splice(draggedIndex, 1);
                newOrder.splice(targetIndex, 0, removed);

                const draggedGroup = groupedResources[draggedId] || groupedResources[Number(draggedId)];
                showToast(`Moved ${draggedGroup?.name || 'group'} to new position`, 'success');
            }

            return newOrder;
        });

        setDraggedGroupId(null);
        setDragOverGroupId(null);
    };

    const handleGroupDragEnd = () => {
        setDraggedGroupId(null);
        setDragOverGroupId(null);
    };

    const handleSelectSlot = ({ resourceId, start, end }) => {
        // Capture the selected time slot for click-and-drag workorder creation
        setSelectedSlot({
            resourceId,
            start,
            end,
        });
        setSelectedWorkorder(null); // Creating new workorder, not editing
        setWorkorderModalOpen(true);
    };

    // Helper function to convert X position to time
    const xPositionToTime = (x, cellWidth, dayDate) => {
        const hoursInDay = DAY_END_HOUR - DAY_START_HOUR;
        const hourFloat = (x / cellWidth) * hoursInDay + DAY_START_HOUR;

        // Round to nearest 15 minutes for smoother dragging
        const hour = Math.floor(hourFloat);
        const minutes = (hourFloat - hour) * 60;
        const roundedMinutes = Math.round(minutes / 15) * 15;

        const time = new Date(dayDate);
        time.setHours(hour, roundedMinutes, 0, 0);

        // Handle minute overflow
        if (roundedMinutes === 60) {
            time.setHours(hour + 1, 0, 0, 0);
        }

        return time;
    };

    // Drag handlers for timeline view (horizontal drag)
    const handleMouseDown = (e, resourceId, dayDate) => {
        if (e.button !== 0) return; // Only left click
        e.preventDefault();

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;

        const startTime = xPositionToTime(x, rect.width, dayDate);

        setIsDragging(true);
        setDragSelection({
            resourceId,
            dayDate,
            startX: x,
            currentX: x,
            startTime,
            endTime: startTime,
            rect,
        });
    };

    const handleMouseMove = (e, resourceId, dayDate) => {
        if (!isDragging || !dragSelection) return;
        if (dragSelection.resourceId !== resourceId || dragSelection.dayDate.getTime() !== dayDate.getTime()) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));

        const currentTime = xPositionToTime(x, rect.width, dayDate);

        setDragSelection(prev => ({
            ...prev,
            currentX: x,
            endTime: currentTime,
        }));
    };

    const handleMouseUp = (_e, resourceId, dayDate) => {
        if (!isDragging || !dragSelection) return;
        if (dragSelection.resourceId !== resourceId || dragSelection.dayDate.getTime() !== dayDate.getTime()) return;

        let startDate = new Date(dragSelection.startTime);
        let endDate = new Date(dragSelection.endTime);

        // Ensure start is before end
        if (endDate < startDate) {
            [startDate, endDate] = [endDate, startDate];
        }

        // Ensure minimum 30-minute duration
        if (endDate <= startDate) {
            endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
        }

        // Reset drag state
        setIsDragging(false);
        setDragSelection(null);

        // Open workorder modal with selected slot
        handleSelectSlot({
            resourceId,
            start: startDate,
            end: endDate,
        });
    };

    const handleSelectEvent = (event) => {
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

    const handleSaveProject = (newProjectId) => {
        fetchData();
        if (onDataChange) onDataChange();
        showToast('Project saved successfully');
        // If a new project was created, trigger navigation to its details
        if (newProjectId && onProjectCreated) {
            onProjectCreated(newProjectId);
        }
    };

    const handleSaveWorkorder = () => {
        fetchData();
        if (onDataChange) onDataChange();
        showToast('Workorder saved successfully');
    };

    const handleDeleteWorkorder = () => {
        fetchData();
        if (onDataChange) onDataChange();
        showToast('Workorder deleted');
    };

    const toggleGroup = (groupId) => {
        setSelectedGroups(prev => {
            const numGroupId = Number(groupId);
            const numPrev = prev.map(Number);
            if (numPrev.includes(numGroupId)) {
                return prev.filter(id => Number(id) !== numGroupId);
            } else {
                return [...prev, groupId];
            }
        });
    };

    const selectAllGroups = () => {
        if (activeScheduleBook === 'all') {
            setSelectedGroups(positionGroups.map(g => g.id));
        } else {
            // If a specific schedule book is active, only select that one
            setSelectedGroups([activeScheduleBook]);
        }
    };
    const clearAllGroups = () => setSelectedGroups([]);

    const navigatePrevious = () => {
        if (view === Views.DAY) setDate(addDays(date, -1));
        else if (view === Views.WEEK) setDate(addDays(date, -7));
        else setDate(addDays(startOfMonth(date), -1));
    };

    const navigateNext = () => {
        if (view === Views.DAY) setDate(addDays(date, 1));
        else if (view === Views.WEEK) setDate(addDays(date, 7));
        else setDate(addDays(endOfMonth(date), 1));
    };

    const goToToday = () => {
        const today = new Date();
        setDate(today);
        setSelectedDates([]); // Clear selection to revert to standard view
        setDateRangeStart('');
        setDateRangeEnd('');
    };

    const handleDateSelect = (day) => {
        if (Array.isArray(day)) {
            setSelectedDates(day.sort((a, b) => a - b));
        } else {
            setSelectedDates([day]);
        }
    };

    const calculateEventStyle = (event, dayDate, eventIndex, totalEvents) => {
        const dayStart = new Date(dayDate);
        dayStart.setHours(DAY_START_HOUR, 0, 0, 0);
        const dayEnd = new Date(dayDate);
        dayEnd.setHours(DAY_END_HOUR, 0, 0, 0);
        const totalMinutesInDay = (DAY_END_HOUR - DAY_START_HOUR) * 60;
        const eventStart = Math.max(event.start, dayStart);
        const eventEnd = Math.min(event.end, dayEnd);
        const startDiff = differenceInMinutes(eventStart, dayStart);
        const duration = differenceInMinutes(eventEnd, eventStart);
        const leftPercent = Math.max(0, (startDiff / totalMinutesInDay) * 100);
        const widthPercent = Math.min(100 - leftPercent, (duration / totalMinutesInDay) * 100);

        // Calculate vertical position when multiple events exist
        const heightPercent = totalEvents > 1 ? (100 / totalEvents) : 100;
        const topPercent = eventIndex * heightPercent;

        return {
            left: `${leftPercent}%`,
            width: `${Math.max(widthPercent, 2)}%`,
            top: `${topPercent}%`,
            height: `${heightPercent}%`
        };
    };

    const getEventsForResourceDay = (resourceId, dayDate) => {
        // Use startOfDay to get midnight in local timezone for the grid day
        const dayStart = startOfDay(dayDate);
        const dayEnd = addDays(dayStart, 1);

        return events.filter(evt => {
            if (evt.resourceId !== resourceId) return false;

            // Get the event's start date in local timezone
            const eventStartDay = startOfDay(evt.start);
            const eventEndDay = startOfDay(evt.end);

            // An event should appear on a day if:
            // 1. It starts on this day (primary case)
            // 2. It spans across this day (multi-day events)
            const startsOnThisDay = isSameDay(eventStartDay, dayStart);
            const spansCrossThis = eventStartDay < dayStart && eventEndDay >= dayStart;

            return startsOnThisDay || spansCrossThis;
        });
    };

    return (
        <div className="scheduler-container">
            <div className={`filter-panel ${filterPanelOpen ? 'open' : 'closed'}`}>
                <div className="filter-header">
                    <h3>{activeScheduleBook === 'all' ? 'Position Groups' : positionGroups.find(g => g.id === activeScheduleBook)?.name || 'Position Groups'}</h3>
                    <div className="filter-header-actions">
                        <button className="icon-btn settings-btn" onClick={() => setGroupManagerOpen(true)} title="Manage Groups">⚙️</button>
                        <button className="toggle-btn" onClick={() => setFilterPanelOpen(!filterPanelOpen)}>
                            {filterPanelOpen ? '◀' : '▶'}
                        </button>
                    </div>
                </div>
                {filterPanelOpen && (
                    <div className="filter-content">
                        <div className="filter-actions">
                            <button onClick={selectAllGroups}>All</button>
                            <button onClick={clearAllGroups}>None</button>
                        </div>
                        <div className="group-list">
                            {positionGroups
                                .filter(group => activeScheduleBook === 'all' || group.id === activeScheduleBook)
                                .map(group => (
                                    <label key={group.id} className="group-item">
                                        <input type="checkbox" checked={selectedGroups.includes(group.id)} onChange={() => toggleGroup(group.id)} />
                                        <span className="group-color" style={{ background: group.color }} />
                                        <span className="group-name">{group.name}</span>
                                        <span className="group-count">{group.position_count}</span>
                                    </label>
                                ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="scheduler-main">
                <div className="scheduler-header">
                    <div>
                        <h1>Schedule</h1>
                        <p className="subtitle">View and manage workorders</p>
                    </div>
                </div>

                <div className="controls-row">
                    <div className="date-navigation">
                        <div className="date-selector-wrapper" style={{ position: 'relative', width: '300px' }}>
                            <button
                                className="nav-btn date-trigger-btn"
                                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                            >
                                📅 {selectedDates.length > 0
                                    ? `${selectedDates.length} days selected`
                                    : format(date, 'EEEE, MMMM d, yyyy')}
                            </button>

                            {isCalendarOpen && (
                                <>
                                    <div className="calendar-backdrop" onClick={() => setIsCalendarOpen(false)} />
                                    <div className="calendar-popover">
                                        <MiniCalendar
                                            selectedDates={selectedDates}
                                            onSelect={(dates) => handleDateSelect(dates)}
                                            onClose={() => setIsCalendarOpen(false)}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="nav-buttons">
                            {/* Left/Right buttons removed as requested */}
                            <button onClick={goToToday} className="nav-btn today-btn">Today</button>
                        </div>
                    </div>
                    <div className="view-controls">
                        {[Views.DAY, Views.WEEK, Views.MONTH].map(v => (
                            <button key={v} onClick={() => { setView(v); setSelectedDates([]); }} className={`view-btn ${view === v ? 'active' : ''}`}>
                                {v.charAt(0).toUpperCase() + v.slice(1).replace('_', ' ')}
                            </button>
                        ))}
                        <button
                            className={`view-btn ${isCompactMode ? 'active' : ''}`}
                            onClick={() => setIsCompactMode(!isCompactMode)}
                            title={isCompactMode ? "Switch to Scrolling View" : "Switch to Fit Screen View"}
                        >
                            {isCompactMode ? '↔ Fit' : '↔ Scroll'}
                        </button>
                    </div>
                </div>

                {/* Schedule Book Tabs */}
                <div className="schedule-book-tabs">
                    <button
                        className={`schedule-book-tab ${activeScheduleBook === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveScheduleBook('all')}
                    >
                        📚 All Resources
                    </button>
                    {positionGroups.map(group => (
                        <button
                            key={group.id}
                            className={`schedule-book-tab ${activeScheduleBook === group.id ? 'active' : ''}`}
                            onClick={() => {
                                setActiveScheduleBook(group.id);
                                // Auto-select this group in the filter
                                setSelectedGroups([group.id]);
                            }}
                        >
                            📋 {group.name}
                        </button>
                    ))}
                </div>

                {!focusedResourceId ? (
                    <div className="timeline-wrapper">
                        <div className={`timeline-grid ${isCompactMode ? 'compact-mode' : ''}`}>
                            <div className="timeline-header">
                                <div className="timeline-corner">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <button
                                                onClick={() => {
                                                    const newCollapsed = {};
                                                    groupOrder.forEach(id => newCollapsed[id] = true);
                                                    setCollapsedGroups(newCollapsed);
                                                }}
                                                style={{
                                                    background: 'transparent',
                                                    border: '1px solid rgba(148, 163, 184, 0.3)',
                                                    color: '#94a3b8',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 500,
                                                    transition: 'all 0.2s'
                                                }}
                                                title="Collapse All Groups"
                                            >
                                                ▶ All
                                            </button>
                                            <button
                                                onClick={() => setCollapsedGroups({})}
                                                style={{
                                                    background: 'transparent',
                                                    border: '1px solid rgba(148, 163, 184, 0.3)',
                                                    color: '#94a3b8',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 500,
                                                    transition: 'all 0.2s'
                                                }}
                                                title="Expand All Groups"
                                            >
                                                ▼ All
                                            </button>
                                        </div>
                                        <div className="timezone-label">Pacific Time</div>
                                    </div>
                                </div>
                                <div className="timeline-days">
                                    {gridDays.map(dayDate => (
                                        <div key={dayDate.toString()} className={`timeline-day ${isSameDay(dayDate, new Date()) ? 'today' : ''}`}>
                                            <div className="day-header-info">
                                                <span className="day-label">{format(dayDate, 'EEE MMM d')}</span>
                                                <span className="week-label">Wk. {getWeek(dayDate)}</span>
                                            </div>
                                            <div className="time-slots">
                                                {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }).map((_, idx) => {
                                                    const hour = DAY_START_HOUR + idx;
                                                    const label = TIME_DISPLAY_SLOTS.find(s => s.hour === hour)?.label;
                                                    return <div key={hour} className="time-slot-header">{label || ''}</div>;
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="timeline-body">
                                {orderedGroups.map(group => (
                                    <div key={group.id} className="resource-group">
                                        <div
                                            className={`group-header-row ${dragOverGroupId === String(group.id) ? 'drag-over' : ''}`}
                                            draggable={true}
                                            onDragStart={(e) => handleGroupDragStart(e, group.id)}
                                            onDragOver={(e) => handleGroupDragOver(e, group.id)}
                                            onDragLeave={handleGroupDragLeave}
                                            onDrop={(e) => handleGroupDrop(e, group.id)}
                                            onDragEnd={handleGroupDragEnd}
                                        >
                                            <div className="group-header-cell" onClick={() => toggleGroupCollapse(group.id)}>
                                                <span className="drag-handle" style={{ cursor: 'grab', marginRight: '8px', opacity: 0.5 }}>⠿</span>
                                                <span className="collapse-icon">{collapsedGroups[group.id] ? '▶' : '▼'}</span>
                                                <span className="group-indicator" style={{ backgroundColor: group.color }} />
                                                <span className="group-name">{group.name}</span>
                                            </div>
                                            <div className="group-timeline-cells">
                                                {gridDays.map(dayDate => (
                                                    <div key={dayDate.toString()} className="group-day-cell">
                                                        <div className="time-grid-lines">
                                                            {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }).map((_, idx) => <div key={idx} className="time-grid-line" />)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {!collapsedGroups[group.id] && group.resources.map(resource => (
                                            <div key={resource.id} className="resource-row">
                                                <div className="resource-cell">
                                                    <div className="resource-info">
                                                        <span className="resource-name" title={resource.name}>{resource.name}</span>
                                                        <div className="resource-positions">
                                                            {resource.type === 'STAFF' ? (
                                                                resource.types?.slice(0, 2).map(t => (
                                                                    <span key={t.type_id} className="position-badge">{t.abbreviation || t.type_name?.substring(0, 3)}</span>
                                                                ))
                                                            ) : <span className="type-badge">{resource.type}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="resource-timeline">
                                                    {gridDays.map(dayDate => (
                                                        <div
                                                            key={dayDate.toString()}
                                                            className="day-cell"
                                                            onMouseDown={(e) => handleMouseDown(e, resource.id, dayDate)}
                                                            onMouseMove={(e) => handleMouseMove(e, resource.id, dayDate)}
                                                            onMouseUp={(e) => handleMouseUp(e, resource.id, dayDate)}
                                                            style={{ cursor: isDragging ? 'ew-resize' : 'crosshair', position: 'relative' }}
                                                        >
                                                            <div className="time-grid-lines">
                                                                {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }).map((_, idx) => <div key={idx} className="time-grid-line" />)}
                                                            </div>

                                                            {/* Drag selection overlay - Horizontal */}
                                                            {isDragging && dragSelection &&
                                                                dragSelection.resourceId === resource.id &&
                                                                dragSelection.dayDate.getTime() === dayDate.getTime() && (() => {
                                                                    const leftX = Math.min(dragSelection.startX, dragSelection.currentX);
                                                                    const rightX = Math.max(dragSelection.startX, dragSelection.currentX);
                                                                    const width = rightX - leftX;

                                                                    // Determine actual start and end times
                                                                    const actualStart = dragSelection.startTime < dragSelection.endTime ? dragSelection.startTime : dragSelection.endTime;
                                                                    const actualEnd = dragSelection.startTime < dragSelection.endTime ? dragSelection.endTime : dragSelection.startTime;

                                                                    return (
                                                                        <div
                                                                            className="drag-selection-overlay"
                                                                            style={{
                                                                                position: 'absolute',
                                                                                left: `${leftX}px`,
                                                                                width: `${Math.max(width, 2)}px`,
                                                                                top: 0,
                                                                                bottom: 0,
                                                                                backgroundColor: 'rgba(59, 130, 246, 0.25)',
                                                                                border: '2px solid rgba(59, 130, 246, 0.7)',
                                                                                borderRadius: '4px',
                                                                                pointerEvents: 'none',
                                                                                zIndex: 5,
                                                                            }}
                                                                        >
                                                                            {/* Start time tooltip */}
                                                                            <div style={{
                                                                                position: 'absolute',
                                                                                left: dragSelection.startX < dragSelection.currentX ? '-2px' : 'auto',
                                                                                right: dragSelection.startX >= dragSelection.currentX ? '-2px' : 'auto',
                                                                                top: '-28px',
                                                                                backgroundColor: 'rgba(59, 130, 246, 0.95)',
                                                                                color: 'white',
                                                                                padding: '4px 8px',
                                                                                borderRadius: '4px',
                                                                                fontSize: '12px',
                                                                                fontWeight: 600,
                                                                                whiteSpace: 'nowrap',
                                                                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                                                            }}>
                                                                                {format(actualStart, 'h:mm a')}
                                                                            </div>

                                                                            {/* End time tooltip */}
                                                                            <div style={{
                                                                                position: 'absolute',
                                                                                left: dragSelection.startX >= dragSelection.currentX ? '-2px' : 'auto',
                                                                                right: dragSelection.startX < dragSelection.currentX ? '-2px' : 'auto',
                                                                                bottom: '-28px',
                                                                                backgroundColor: 'rgba(147, 51, 234, 0.95)',
                                                                                color: 'white',
                                                                                padding: '4px 8px',
                                                                                borderRadius: '4px',
                                                                                fontSize: '12px',
                                                                                fontWeight: 600,
                                                                                whiteSpace: 'nowrap',
                                                                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                                                            }}>
                                                                                {format(actualEnd, 'h:mm a')}
                                                                            </div>

                                                                            {/* Duration display in center */}
                                                                            {width > 60 && (() => {
                                                                                const totalMinutes = differenceInMinutes(actualEnd, actualStart);
                                                                                const hours = Math.floor(totalMinutes / 60);
                                                                                const minutes = totalMinutes % 60;
                                                                                const durationText = hours > 0
                                                                                    ? `${hours}h ${minutes}m`
                                                                                    : `${minutes} min`;

                                                                                return (
                                                                                    <div style={{
                                                                                        position: 'absolute',
                                                                                        left: '50%',
                                                                                        top: '50%',
                                                                                        transform: 'translate(-50%, -50%)',
                                                                                        backgroundColor: 'rgba(30, 41, 59, 0.9)',
                                                                                        color: '#60a5fa',
                                                                                        padding: '4px 10px',
                                                                                        borderRadius: '6px',
                                                                                        fontSize: '11px',
                                                                                        fontWeight: 700,
                                                                                        whiteSpace: 'nowrap',
                                                                                        border: '1px solid rgba(59, 130, 246, 0.4)',
                                                                                    }}>
                                                                                        {durationText}
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    );
                                                                })()
                                                            }

                                                            <div className="events-container">
                                                                {(() => {
                                                                    const dayEvents = getEventsForResourceDay(resource.id, dayDate);
                                                                    return dayEvents.map((evt, idx) => (
                                                                        <div key={evt.id} className="event-bar"
                                                                            style={{ ...calculateEventStyle(evt, dayDate, idx, dayEvents.length), backgroundColor: evt.color }}
                                                                            onClick={(e) => { e.stopPropagation(); handleSelectEvent({ workorder: evt.workorder }); }}
                                                                            title={`${evt.title}\nJob ID: ${evt.workorderId}\n${format(evt.start, 'h:mm a')} - ${format(evt.end, 'h:mm a')}${evt.hasOpenRequirements ? '\n⚠️ Has Open Requirements' : ''}`}>
                                                                            <span className="event-title">
                                                                                {evt.hasOpenRequirements && <span className="event-warning-icon">⚠️ </span>}
                                                                                {evt.title}
                                                                            </span>
                                                                            <span className="event-subtitle">Job ID: {evt.workorderId}</span>
                                                                        </div>
                                                                    ));
                                                                })()}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="calendar-wrapper">
                        <Calendar localizer={localizer} events={events.filter(evt => evt.resourceId === focusedResourceId)}
                            startAccessor="start" endAccessor="end" style={{ height: 'calc(100vh - 250px)' }}
                            view={view} onView={setView} date={date} onNavigate={setDate}
                            onSelectEvent={(evt) => handleSelectEvent({ workorder: evt.workorder })}
                            onSelectSlot={(slotInfo) => handleSelectSlot({ resourceId: focusedResourceId, start: slotInfo.start, end: slotInfo.end })}
                            selectable />
                    </div>
                )}
            </div>

            <ProjectModal isOpen={projectModalOpen} onClose={() => setProjectModalOpen(false)} project={selectedProject} onSave={handleSaveProject} />
            <WorkorderModal
                isOpen={workorderModalOpen}
                onClose={() => {
                    setWorkorderModalOpen(false);
                    setSelectedSlot(null); // Clear selected slot when modal closes
                }}
                workorder={selectedWorkorder}
                initialSlot={selectedSlot}
                projects={projects}
                resources={resources}
                positions={positions}
                onSave={handleSaveWorkorder}
                onDelete={handleDeleteWorkorder}
            />
            <GroupManager isOpen={groupManagerOpen} onClose={() => setGroupManagerOpen(false)} onUpdate={fetchData} />

            {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}>{toast.type === 'success' ? '✓' : '✕'} {toast.message}</div></div>}

            <style>{`
                .scheduler-container { display: flex; height: 100%; background: #0a0e17; color: #f1f5f9; }
                .filter-panel { background: rgba(15, 23, 42, 0.95); border-right: 1px solid rgba(148, 163, 184, 0.1); transition: width 0.3s; display: flex; flex-direction: column; overflow: hidden; }
                .filter-panel.open { width: 220px; }
                .filter-panel.closed { width: 44px; }
                .filter-panel.closed .filter-header { justify-content: center; padding: 1rem 0; }
                .filter-panel.closed h3 { display: none; }
                .filter-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid rgba(148, 163, 184, 0.1); }
                .filter-header h3 { font-size: 0.875rem; margin: 0; white-space: nowrap; }
                .toggle-btn { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; }
                .filter-content { flex: 1; overflow-y: auto; padding: 0.5rem; }
                .filter-actions { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
                .filter-actions button { flex: 1; font-size: 0.75rem; padding: 4px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); color: #60a5fa; border-radius: 4px; }
                .group-list { display: flex; flex-direction: column; gap: 4px; }
                .group-item { display: flex; align-items: center; gap: 8px; padding: 6px; border-radius: 4px; cursor: pointer; }
                .group-item:hover { background: rgba(255, 255, 255, 0.05); }
                .group-color { width: 10px; height: 10px; border-radius: 2px; }
                .group-name { flex: 1; font-size: 0.8rem; }
                .group-count { font-size: 0.7rem; color: #64748b; }

                .scheduler-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
                .scheduler-header { display: flex; justify-content: space-between; padding: 1rem 1.5rem; background: #0f172a; border-bottom: 1px solid rgba(148, 163, 184, 0.2); }
                .scheduler-header h1 { margin: 0; font-size: 1.25rem; }
                .subtitle { margin: 4px 0 0 0; font-size: 0.75rem; color: #64748b; }
                .header-actions { display: flex; gap: 12px; }
                .btn { padding: 8px 16px; border-radius: 6px; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: 0.2s; }
                .btn-primary { background: #3b82f6; color: white; border: none; }
                .btn-secondary { background: transparent; color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3); }

                .controls-row { display: flex; align-items: stretch; gap: 12px; padding: 0.75rem 1.5rem; background: #111827; border-bottom: 1px solid rgba(148, 163, 184, 0.1); }
                .date-navigation { display: flex; align-items: stretch; gap: 12px; }
                .date-selector-wrapper { display: flex; }
                .date-trigger-btn { width: 100%; text-align: left; background: #1f2937; border: 1px solid #374151; color: #f3f4f6; padding: 0 16px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; font-size: 0.9rem; font-weight: 500; }
                .date-trigger-btn:hover { background: #374151; }
                
                .nav-buttons { display: flex; }
                .today-btn { padding: 0 24px; font-weight: 600; background: #1f2937; color: #e5e7eb; border: 1px solid #374151; border-radius: 6px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
                .today-btn:hover { background: #374151; color: white; }

                .view-controls { display: flex; gap: 4px; flex: 1; }
                .view-btn { flex: 1; padding: 8px 12px; font-size: 0.85rem; background: #1f2937; border: 1px solid #374151; color: #9ca3af; border-radius: 6px; cursor: pointer; text-align: center; font-weight: 500; transition: all 0.2s; }
                .view-btn.active { background: #3b82f6; color: white; border-color: #3b82f6; box-shadow: 0 0 10px rgba(59, 130, 246, 0.3); }

                /* Mini Calendar Styles */
                .calendar-backdrop { position: fixed; inset: 0; z-index: 90; }
                .calendar-popover { position: absolute; top: calc(100% + 8px); left: 0; width: 300px; background: #1e293b; border: 1px solid #334155; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 100; padding: 12px; }
                .mini-calendar { display: flex; flex-direction: column; gap: 8px; }
                .mini-cal-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #334155; color: white; font-weight: 600; }
                .mini-cal-header button { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px 8px; font-size: 1rem; }
                .mini-cal-header button:hover { color: white; }
                .mini-cal-days-header { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; color: #64748b; font-size: 0.75rem; padding: 4px 0; }
                .mini-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
                .mini-cal-day { padding: 6px; text-align: center; font-size: 0.85rem; color: #e2e8f0; cursor: pointer; border-radius: 4px; }
                .mini-cal-day:hover { background: #334155; }
                .mini-cal-day.faded { opacity: 0.3; }
                .mini-cal-day.selected { background: #3b82f6; color: white; font-weight: bold; }
                .mini-cal-day.dragging { background: rgba(59, 130, 246, 0.4); border-radius: 4px; }
                .mini-cal-actions { display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid #334155; }
                .btn-text { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 0.8rem; }
                .btn-text:hover { color: white; }
                .btn-sm { padding: 4px 12px; font-size: 0.8rem; }

                .timeline-wrapper { flex: 1; overflow: auto; background: #111827; position: relative; z-index: 1; }
                .timeline-grid { display: flex; flex-direction: column; min-width: fit-content; }
                .timeline-header { display: flex; position: sticky; top: 0; z-index: 10; background: #111827; border-bottom: 1px solid rgba(148, 163, 184, 0.2); }
                .timeline-corner { width: ${RESOURCE_COLUMN_WIDTH}px; flex-shrink: 0; background: #0f172a; border-right: 1px solid rgba(148, 163, 184, 0.2); display: flex; align-items: center; justify-content: center; }
                .timezone-label { font-size: 0.6rem; color: #64748b; text-transform: uppercase; }
                .timeline-days { display: flex; flex: 1; }
                .timeline-day { flex: 1; min-width: 400px; border-right: 1px solid rgba(148, 163, 184, 0.1); background: #0f172a; }
                .day-header-info { padding: 8px; border-bottom: 1px solid rgba(148, 163, 184, 0.05); display: flex; justify-content: space-between; }
                .week-label { font-size: 0.6rem; color: #475569; }
                .day-label { font-size: 0.8rem; font-weight: 600; }
                .time-slots { display: grid; grid-template-columns: repeat(${(DAY_END_HOUR - DAY_START_HOUR)}, 1fr); height: 20px; }
                .time-slot-header { font-size: 0.6rem; color: #4b5563; text-align: center; line-height: 20px; border-right: 1px solid rgba(148, 163, 184, 0.03); }

                .timeline-body { display: flex; flex-direction: column; }
                .group-header-row { display: flex; background: rgba(31, 41, 55, 0.8); border-bottom: 1px solid rgba(148, 163, 184, 0.1); cursor: pointer; height: 32px; }
                .group-header-cell { width: ${RESOURCE_COLUMN_WIDTH}px; flex-shrink: 0; display: flex; align-items: center; gap: 8px; padding: 0 12px; border-right: 1px solid rgba(148, 163, 184, 0.1); font-size: 0.75rem; font-weight: 600; }
                .group-timeline-cells { display: flex; flex: 1; }
                .group-day-cell { flex: 1; min-width: 400px; position: relative; }
                .resource-row { display: flex; border-bottom: 1px solid rgba(148, 163, 184, 0.05); height: ${SLOT_HEIGHT}px; }
                .resource-cell { width: ${RESOURCE_COLUMN_WIDTH}px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; background: #0f172a; border-right: 1px solid rgba(148, 163, 184, 0.2); position: sticky; left: 0; z-index: 5; }
                .resource-info { display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
                .resource-name { font-size: 0.8rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .resource-positions { display: flex; gap: 4px; }
                .position-badge { font-size: 0.6rem; padding: 1px 4px; background: #1e293b; color: #94a3b8; border-radius: 2px; }
                .type-badge { font-size: 0.6rem; padding: 1px 4px; background: #312e81; color: #a5b4fc; border-radius: 2px; }
                .resource-timeline { display: flex; flex: 1; }
                .day-cell { flex: 1; min-width: 400px; position: relative; background: rgba(17, 24, 39, 0.3); }
                .day-cell:hover { background: rgba(255, 255, 255, 0.02); }
                .time-grid-lines { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(${(DAY_END_HOUR - DAY_START_HOUR)}, 1fr); pointer-events: none; }
                .time-grid-line { border-right: 1px solid rgba(255, 255, 255, 0.03); }
                .events-container { position: absolute; inset: 4px 0; pointer-events: none; }
                .event-bar { position: absolute; border-radius: 4px; padding: 4px 8px; color: white; cursor: pointer; z-index: 10; border: 1px solid rgba(255, 255, 255, 0.25); display: flex; flex-direction: column; justify-content: center; pointer-events: auto; box-sizing: border-box; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
                .event-bar:hover { filter: brightness(1.15); z-index: 20; box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
                .event-title { font-size: 0.7rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; display: flex; align-items: center; }
                .event-subtitle { font-size: 0.6rem; opacity: 0.8; }
                .event-warning-icon { font-size: 0.8em; margin-right: 4px; }

                .calendar-wrapper { flex: 1; padding: 1rem; background: #1f2937; margin: 1rem; border-radius: 8px; }
                .toast-container { position: fixed; top: 20px; right: 20px; z-index: 1000; }
                .toast { padding: 10px 20px; border-radius: 6px; font-size: 0.85rem; color: white; background: #10b981; }

                /* Compact Mode - Fit to Screen */
                .timeline-grid.compact-mode { min-width: 100%; }
                .timeline-grid.compact-mode .timeline-wrapper { overflow: hidden; }
                .timeline-grid.compact-mode .timeline-day,
                .timeline-grid.compact-mode .group-day-cell,
                .timeline-grid.compact-mode .day-cell { min-width: 0; flex: 1; }
                .timeline-grid.compact-mode .resource-row { height: 60px; }
                .timeline-grid.compact-mode .group-header-row { height: 28px; }
                .timeline-grid.compact-mode .day-header-info { padding: 4px; font-size: 0.7rem; }
                .timeline-grid.compact-mode .week-label { font-size: 0.55rem; }
                .timeline-grid.compact-mode .day-label { font-size: 0.7rem; }
                .timeline-grid.compact-mode .time-slots { height: 16px; }
                .timeline-grid.compact-mode .time-slot-header { font-size: 0.5rem; line-height: 16px; }
                .timeline-grid.compact-mode .resource-name { font-size: 0.7rem; }
                .timeline-grid.compact-mode .position-badge { font-size: 0.55rem; }
                .timeline-grid.compact-mode .event-bar { padding: 2px 6px; }
                .timeline-grid.compact-mode .event-title { font-size: 0.6rem; }
                .timeline-grid.compact-mode .event-subtitle { font-size: 0.55rem; }

                /* Schedule Book Tabs */
                .schedule-book-tabs { display: flex; gap: 2px; background: #1f2937; padding: 0; border-bottom: 1px solid rgba(148, 163, 184, 0.2); overflow-x: auto; }
                .schedule-book-tab { flex: 0 0 auto; padding: 12px 24px; background: #374151; color: #9ca3af; border: none; font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: all 0.2s; white-space: nowrap; border-bottom: 3px solid transparent; }
                .schedule-book-tab:hover { background: #4b5563; color: #e5e7eb; }
                .schedule-book-tab.active { background: #1e293b; color: white; border-bottom-color: #3b82f6; box-shadow: inset 0 -3px 0 0 #3b82f6; }
            `}</style>
        </div>
    );
}
