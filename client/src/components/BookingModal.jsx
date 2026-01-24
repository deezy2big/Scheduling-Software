import React, { useState, useEffect } from 'react';

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

export function BookingModal({ isOpen, onClose, booking, resources, slotInfo, onSave, onDelete }) {
    const [formData, setFormData] = useState({
        resource_id: '',
        title: '',
        project_name: '',
        notes: '',
        color: '#3B82F6',
        start_time: '',
        end_time: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (booking) {
            // Editing existing booking
            setFormData({
                resource_id: booking.resource_id || '',
                title: booking.title || '',
                project_name: booking.project_name || '',
                notes: booking.notes || '',
                color: booking.color || booking.resource_color || '#3B82F6',
                start_time: formatDatetimeLocal(booking.start_time || booking.start),
                end_time: formatDatetimeLocal(booking.end_time || booking.end),
            });
        } else if (slotInfo) {
            // Creating new booking from slot selection
            setFormData({
                resource_id: slotInfo.resourceId || '',
                title: '',
                project_name: '',
                notes: '',
                color: '#3B82F6',
                start_time: formatDatetimeLocal(slotInfo.start),
                end_time: formatDatetimeLocal(slotInfo.end),
            });
        } else {
            // Creating new booking from button
            const now = new Date();
            const later = new Date(now.getTime() + 60 * 60 * 1000);
            setFormData({
                resource_id: resources[0]?.id || '',
                title: '',
                project_name: '',
                notes: '',
                color: '#3B82F6',
                start_time: formatDatetimeLocal(now),
                end_time: formatDatetimeLocal(later),
            });
        }
        setError('');
    }, [booking, slotInfo, resources, isOpen]);

    const formatDatetimeLocal = (date) => {
        const d = new Date(date);
        const offset = d.getTimezoneOffset();
        const local = new Date(d.getTime() - offset * 60 * 1000);
        return local.toISOString().slice(0, 16);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.resource_id) {
            setError('Please select a resource');
            return;
        }
        if (!formData.start_time || !formData.end_time) {
            setError('Start and end times are required');
            return;
        }
        if (new Date(formData.start_time) >= new Date(formData.end_time)) {
            setError('End time must be after start time');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await onSave({
                ...formData,
                id: booking?.id,
            });
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!booking || !confirm('Are you sure you want to delete this booking?')) return;

        setLoading(true);
        try {
            await onDelete(booking.id);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        {booking ? 'Edit Booking' : 'New Booking'}
                    </h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="label">Resource</label>
                        <select
                            className="input select"
                            value={formData.resource_id}
                            onChange={(e) => setFormData({ ...formData, resource_id: e.target.value })}
                        >
                            <option value="">Select a resource...</option>
                            {resources.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name} ({r.type})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="label">Title</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="e.g., Client Edit Session"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="label">Project Name</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="e.g., Netflix Documentary"
                            value={formData.project_name}
                            onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Start Time</label>
                            <input
                                type="datetime-local"
                                className="input"
                                value={formData.start_time}
                                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">End Time</label>
                            <input
                                type="datetime-local"
                                className="input"
                                value={formData.end_time}
                                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">Color</label>
                        <div className="flex gap-2">
                            {COLOR_OPTIONS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    className={`w-8 h-8 rounded-lg transition-all ${formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800' : ''
                                        }`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => setFormData({ ...formData, color })}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="label">Notes</label>
                        <textarea
                            className="input"
                            rows={2}
                            placeholder="Optional notes..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        {booking && (
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={handleDelete}
                                disabled={loading}
                            >
                                Delete
                            </button>
                        )}
                        <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                            {loading ? 'Saving...' : booking ? 'Update' : 'Create Booking'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default BookingModal;
