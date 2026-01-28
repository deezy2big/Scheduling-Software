import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * A draggable and resizable modal that behaves like a native window.
 */
export function DraggableModal({
    isOpen,
    onClose,
    title,
    hasUnsavedChanges = false,
    children,
    className = '',
    initialSize = { width: 600, height: 500 }
}) {
    // We store the modal bounds in state
    const [bounds, setBounds] = useState({
        x: 0,
        y: 0,
        width: initialSize.width,
        height: initialSize.height
    });

    // Refs for tracking movement without triggering re-renders during the drag/resize
    const interaction = useRef({
        active: false,
        type: null, // 'drag' or 'resize'
        direction: null, // 'n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'
        startX: 0,
        startY: 0,
        startBounds: { x: 0, y: 0, width: 0, height: 0 }
    });

    const modalRef = useRef(null);

    // Initial centering
    useEffect(() => {
        if (isOpen) {
            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;
            const w = initialSize.width;
            const h = initialSize.height;

            setBounds({
                x: Math.max(20, (viewportW - w) / 2),
                y: Math.max(20, (viewportH - h) / 2),
                width: w,
                height: h
            });
        }
    }, [isOpen, initialSize.width, initialSize.height]);

    const onMouseDown = (e, type, dir = null) => {
        // Only left click
        if (e.button !== 0) return;

        // Prevent default to avoid text selection during drag/resize
        e.preventDefault();
        e.stopPropagation();

        interaction.current = {
            active: true,
            type,
            direction: dir,
            startX: e.clientX,
            startY: e.clientY,
            startBounds: { ...bounds }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = useCallback((e) => {
        if (!interaction.current.active) return;

        const { type, direction, startX, startY, startBounds } = interaction.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (type === 'drag') {
            setBounds({
                ...startBounds,
                x: startBounds.x + dx,
                y: startBounds.y + dy
            });
        } else if (type === 'resize') {
            let { x, y, width, height } = { ...startBounds };
            const minW = 350;
            const minH = 200;

            // Handle horizontal resizing
            if (direction.includes('e')) {
                width = Math.max(minW, startBounds.width + dx);
            } else if (direction.includes('w')) {
                const requestedWidth = startBounds.width - dx;
                if (requestedWidth > minW) {
                    width = requestedWidth;
                    x = startBounds.x + dx;
                } else {
                    width = minW;
                    x = startBounds.x + (startBounds.width - minW);
                }
            }

            // Handle vertical resizing
            if (direction.includes('s')) {
                height = Math.max(minH, startBounds.height + dy);
            } else if (direction.includes('n')) {
                const requestedHeight = startBounds.height - dy;
                if (requestedHeight > minH) {
                    height = requestedHeight;
                    y = startBounds.y + dy;
                } else {
                    height = minH;
                    y = startBounds.y + (startBounds.height - minH);
                }
            }

            setBounds({ x, y, width, height });
        }
    }, []);

    const onMouseUp = useCallback(() => {
        interaction.current.active = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    }, [onMouseMove]);

    const handleClose = (e) => {
        if (e) e.stopPropagation();
        if (hasUnsavedChanges) {
            if (window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay-fixed">
            <div
                ref={modalRef}
                className={`draggable-resizable-modal ${className}`}
                style={{
                    left: `${bounds.x}px`,
                    top: `${bounds.y}px`,
                    width: `${bounds.width}px`,
                    height: `${bounds.height}px`
                }}
            >
                {/* 8-Way Resize Handles (placed on edges/corners) */}
                <div className="resizer resizer-n" onMouseDown={(e) => onMouseDown(e, 'resize', 'n')} />
                <div className="resizer resizer-s" onMouseDown={(e) => onMouseDown(e, 'resize', 's')} />
                <div className="resizer resizer-e" onMouseDown={(e) => onMouseDown(e, 'resize', 'e')} />
                <div className="resizer resizer-w" onMouseDown={(e) => onMouseDown(e, 'resize', 'w')} />
                <div className="resizer resizer-nw" onMouseDown={(e) => onMouseDown(e, 'resize', 'nw')} />
                <div className="resizer resizer-ne" onMouseDown={(e) => onMouseDown(e, 'resize', 'ne')} />
                <div className="resizer resizer-sw" onMouseDown={(e) => onMouseDown(e, 'resize', 'sw')} />
                <div className="resizer resizer-se" onMouseDown={(e) => onMouseDown(e, 'resize', 'se')} />

                {/* Modal Header (Drag Zone) */}
                <div
                    className="modal-header-native"
                    onMouseDown={(e) => onMouseDown(e, 'drag')}
                >
                    <span className="modal-title-native">{title}</span>
                    <button className="modal-close-native" onClick={handleClose}>×</button>
                </div>

                {/* Body scroll area */}
                <div className="modal-body-native">
                    {children}
                </div>
            </div>

            <style>{`
                .modal-overlay-fixed {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.65);
                    backdrop-filter: blur(3px);
                    z-index: 10000;
                    pointer-events: auto;
                }

                .draggable-resizable-modal {
                    position: absolute;
                    background: #1e293b;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
                    box-sizing: border-box;
                    min-width: 350px;
                    min-height: 200px;
                }

                .modal-header-native {
                    height: 48px;
                    background: #334155;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 16px;
                    cursor: grab;
                    user-select: none;
                    flex-shrink: 0;
                    border-top-left-radius: 8px;
                    border-top-right-radius: 8px;
                }
                .modal-header-native:active {
                    cursor: grabbing;
                }

                .modal-title-native {
                    font-weight: 600;
                    font-size: 1rem;
                }

                .modal-close-native {
                    background: none;
                    border: none;
                    color: #94a3b8;
                    font-size: 1.5rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    border-radius: 4px;
                    transition: all 0.2s;
                    z-index: 101;
                }
                .modal-close-native:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                }

                .modal-body-native {
                    flex: 1;
                    padding: 24px;
                    overflow-y: auto;
                    min-height: 0;
                }

                /* --- RESIZE HANDLES --- */
                .resizer {
                    position: absolute;
                    z-index: 100;
                    /* Use background for debugging if needed, usually transparent */
                }

                /* Edges (8px grab width) */
                .resizer-n { top: -4px; left: 8px; right: 8px; height: 8px; cursor: ns-resize; }
                .resizer-s { bottom: -4px; left: 8px; right: 8px; height: 8px; cursor: ns-resize; }
                .resizer-e { top: 8px; bottom: 8px; right: -4px; width: 8px; cursor: ew-resize; }
                .resizer-w { top: 8px; bottom: 8px; left: -4px; width: 8px; cursor: ew-resize; }

                /* Corners (16px x 16px) */
                .resizer-nw { top: -8px; left: -8px; width: 16px; height: 16px; cursor: nwse-resize; }
                .resizer-ne { top: -8px; right: -8px; width: 16px; height: 16px; cursor: nesw-resize; }
                .resizer-sw { bottom: -8px; left: -8px; width: 16px; height: 16px; cursor: nesw-resize; }
                .resizer-se { bottom: -8px; right: -8px; width: 16px; height: 16px; cursor: nwse-resize; }

                /* Visual indicator for se resizer */
                .resizer-se::after {
                    content: '';
                    position: absolute;
                    right: 12px;
                    bottom: 12px;
                    width: 6px;
                    height: 6px;
                    border-right: 2px solid rgba(255, 255, 255, 0.2);
                    border-bottom: 2px solid rgba(255, 255, 255, 0.2);
                    pointer-events: none;
                }
            `}</style>
        </div>
    );
}

export default DraggableModal;
