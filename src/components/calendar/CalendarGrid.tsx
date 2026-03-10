import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/utils/cn";
import { EventBlock } from "./EventBlock";
import { AllDayEvent } from "./AllDayEvent";
import { DragPreview } from "./DragPreview";
import { getTimeSlotPosition, getEventHeight, formatTime, pixelToTime, calculateDuration } from "@/utils/dates";
import type { CalendarEvent } from "@/types";
import { format, isToday } from "date-fns";

interface DragCreateData {
  scheduledDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

interface EventResizeData {
  eventId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

interface EventMoveData {
  eventId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

interface CalendarGridProps {
  days: Date[];
  events: CalendarEvent[];
  startHour?: number;
  endHour?: number;
  onEventClick?: (event: CalendarEvent) => void;
  onDragCreate?: (data: DragCreateData) => void;
  onEventResize?: (data: EventResizeData) => void;
  onEventMove?: (data: EventMoveData) => void;
}

interface PositionedEvent {
  event: CalendarEvent;
  column: number;
  totalColumns: number;
}

// Calculate overlapping events and assign columns (Google Calendar style)
function calculateEventPositions(dayEvents: CalendarEvent[]): PositionedEvent[] {
  if (dayEvents.length === 0) return [];

  // Convert times to minutes for easier comparison
  const eventsWithMinutes = dayEvents.map((event) => {
    const [startH, startM] = event.startTime.split(":").map(Number);
    const [endH, endM] = event.endTime.split(":").map(Number);
    return {
      event,
      startMinutes: startH * 60 + startM,
      endMinutes: endH * 60 + endM,
    };
  });

  // Sort by start time, then by duration (longer events first)
  eventsWithMinutes.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return (b.endMinutes - b.startMinutes) - (a.endMinutes - a.startMinutes);
  });

  // Assign columns using a greedy algorithm
  const positioned: PositionedEvent[] = [];
  const columns: { endMinutes: number }[] = [];

  for (const { event, startMinutes, endMinutes } of eventsWithMinutes) {
    // Find the first column where this event fits (no overlap)
    let column = 0;
    while (column < columns.length && columns[column].endMinutes > startMinutes) {
      column++;
    }

    // Assign to this column
    if (column >= columns.length) {
      columns.push({ endMinutes });
    } else {
      columns[column].endMinutes = endMinutes;
    }

    positioned.push({ event, column, totalColumns: 0 });
  }

  // Calculate total columns for each event based on overlapping events
  for (let i = 0; i < positioned.length; i++) {
    const { event } = positioned[i];
    const [startH, startM] = event.startTime.split(":").map(Number);
    const [endH, endM] = event.endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Find max column among all overlapping events
    let maxColumn = positioned[i].column;
    for (let j = 0; j < positioned.length; j++) {
      const other = positioned[j].event;
      const [otherStartH, otherStartM] = other.startTime.split(":").map(Number);
      const [otherEndH, otherEndM] = other.endTime.split(":").map(Number);
      const otherStart = otherStartH * 60 + otherStartM;
      const otherEnd = otherEndH * 60 + otherEndM;

      // Check if they overlap
      if (startMinutes < otherEnd && endMinutes > otherStart) {
        maxColumn = Math.max(maxColumn, positioned[j].column);
      }
    }

    positioned[i].totalColumns = maxColumn + 1;
  }

  return positioned;
}

export function CalendarGrid({
  days,
  events,
  startHour = 0,
  endHour = 24,
  onEventClick,
  onDragCreate,
  onEventResize,
  onEventMove,
}: CalendarGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => startHour + i
  );

  // Drag-to-create state
  const [isDragging, setIsDragging] = useState(false);
  const [dragDate, setDragDate] = useState<string | null>(null);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [dragCurrentY, setDragCurrentY] = useState<number>(0);
  const dragColumnRef = useRef<HTMLDivElement | null>(null);

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizingEvent, setResizingEvent] = useState<CalendarEvent | null>(null);
  const [resizeEdge, setResizeEdge] = useState<"top" | "bottom" | null>(null);
  const [resizeStartY, setResizeStartY] = useState<number>(0);
  const [resizeCurrentY, setResizeCurrentY] = useState<number>(0);
  const resizeColumnRef = useRef<HTMLDivElement | null>(null);

  // Drag-to-move state
  const [isMoving, setIsMoving] = useState(false);
  const [movingEvent, setMovingEvent] = useState<CalendarEvent | null>(null);
  const [moveStartY, setMoveStartY] = useState<number>(0);
  const [moveCurrentY, setMoveCurrentY] = useState<number>(0);
  const [moveTargetDate, setMoveTargetDate] = useState<string | null>(null);
  const moveColumnRef = useRef<HTMLDivElement | null>(null);
  const dayColumnsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // Calculate drag preview position and times
  const getDragPreviewData = useCallback(() => {
    if (!isDragging || dragDate === null) return null;

    const minY = Math.min(dragStartY, dragCurrentY);
    const maxY = Math.max(dragStartY, dragCurrentY);
    const height = maxY - minY;

    // Minimum height of 15 minutes (15 pixels)
    const adjustedHeight = Math.max(height, 15);
    const adjustedMaxY = minY + adjustedHeight;

    const startTime = pixelToTime(minY, 15, startHour);
    const endTime = pixelToTime(adjustedMaxY, 15, startHour);
    const durationMinutes = calculateDuration(startTime, endTime);

    return {
      top: minY,
      height: adjustedHeight,
      startTime,
      endTime,
      durationMinutes,
    };
  }, [isDragging, dragDate, dragStartY, dragCurrentY, startHour]);

  // Mouse handlers for drag-to-create
  const handleMouseDown = useCallback((e: React.MouseEvent, day: Date) => {
    // Only handle left click on empty space (not on events)
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[data-event]')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    // getBoundingClientRect already accounts for scroll position
    const y = e.clientY - rect.top;

    setIsDragging(true);
    setDragDate(format(day, "yyyy-MM-dd"));
    setDragStartY(y);
    setDragCurrentY(y);
    dragColumnRef.current = e.currentTarget as HTMLDivElement;

    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragColumnRef.current) return;

    const rect = dragColumnRef.current.getBoundingClientRect();
    // getBoundingClientRect already accounts for scroll position
    const y = e.clientY - rect.top;

    // Clamp to valid range
    const maxY = (endHour - startHour) * 60;
    setDragCurrentY(Math.max(0, Math.min(y, maxY)));
  }, [isDragging, endHour, startHour]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !dragDate) {
      setIsDragging(false);
      return;
    }

    const previewData = getDragPreviewData();
    if (previewData && onDragCreate) {
      onDragCreate({
        scheduledDate: dragDate,
        startTime: previewData.startTime,
        endTime: previewData.endTime,
        durationMinutes: previewData.durationMinutes,
      });
    }

    // Reset drag state
    setIsDragging(false);
    setDragDate(null);
    setDragStartY(0);
    setDragCurrentY(0);
    dragColumnRef.current = null;
  }, [isDragging, dragDate, getDragPreviewData, onDragCreate]);

  const handleMouseLeave = useCallback(() => {
    // Cancel drag if mouse leaves the calendar
    if (isDragging) {
      setIsDragging(false);
      setDragDate(null);
      setDragStartY(0);
      setDragCurrentY(0);
      dragColumnRef.current = null;
    }
    // Cancel resize if mouse leaves the calendar
    if (isResizing) {
      setIsResizing(false);
      setResizingEvent(null);
      setResizeEdge(null);
      setResizeStartY(0);
      setResizeCurrentY(0);
      resizeColumnRef.current = null;
    }
    // Cancel move if mouse leaves the calendar
    if (isMoving) {
      setIsMoving(false);
      setMovingEvent(null);
      setMoveStartY(0);
      setMoveCurrentY(0);
      setMoveTargetDate(null);
      moveColumnRef.current = null;
    }
  }, [isDragging, isResizing, isMoving]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, event: CalendarEvent, edge: "top" | "bottom", columnEl: HTMLDivElement) => {
    e.stopPropagation();
    e.preventDefault();

    const rect = columnEl.getBoundingClientRect();
    const y = e.clientY - rect.top;

    setIsResizing(true);
    setResizingEvent(event);
    setResizeEdge(edge);
    setResizeStartY(y);
    setResizeCurrentY(y);
    resizeColumnRef.current = columnEl;
  }, []);

  const getResizedEventTimes = useCallback(() => {
    if (!isResizing || !resizingEvent || !resizeEdge) return null;

    const deltaY = resizeCurrentY - resizeStartY;
    const originalTop = getTimeSlotPosition(resizingEvent.startTime, startHour);
    const originalHeight = getEventHeight(resizingEvent.durationMinutes);

    let newTop = originalTop;
    let newHeight = originalHeight;

    if (resizeEdge === "top") {
      // Moving top edge - adjust start time
      newTop = Math.max(0, originalTop + deltaY);
      newHeight = originalHeight - deltaY;
    } else {
      // Moving bottom edge - adjust end time
      newHeight = Math.max(15, originalHeight + deltaY); // Minimum 15 minutes
    }

    // Ensure minimum height of 15 pixels (15 minutes)
    newHeight = Math.max(15, newHeight);

    // Calculate new times
    const startTime = pixelToTime(newTop, 15, startHour);
    const endTime = pixelToTime(newTop + newHeight, 15, startHour);
    const durationMinutes = calculateDuration(startTime, endTime);

    return { top: newTop, height: newHeight, startTime, endTime, durationMinutes };
  }, [isResizing, resizingEvent, resizeEdge, resizeCurrentY, resizeStartY, startHour]);

  const handleResizeEnd = useCallback(() => {
    if (!isResizing || !resizingEvent) {
      setIsResizing(false);
      return;
    }

    const resizedData = getResizedEventTimes();
    if (resizedData && onEventResize) {
      onEventResize({
        eventId: resizingEvent.id,
        startTime: resizedData.startTime,
        endTime: resizedData.endTime,
        durationMinutes: resizedData.durationMinutes,
      });
    }

    // Reset resize state
    setIsResizing(false);
    setResizingEvent(null);
    setResizeEdge(null);
    setResizeStartY(0);
    setResizeCurrentY(0);
    resizeColumnRef.current = null;
  }, [isResizing, resizingEvent, getResizedEventTimes, onEventResize]);

  // Move handlers
  const handleMoveStart = useCallback((e: React.MouseEvent, event: CalendarEvent, columnEl: HTMLDivElement, dateStr: string) => {
    e.stopPropagation();
    e.preventDefault();

    const rect = columnEl.getBoundingClientRect();
    const y = e.clientY - rect.top;

    setIsMoving(true);
    setMovingEvent(event);
    setMoveStartY(y);
    setMoveCurrentY(y);
    setMoveTargetDate(dateStr);
    moveColumnRef.current = columnEl;
  }, []);

  const getMovedEventPosition = useCallback(() => {
    if (!isMoving || !movingEvent || !moveTargetDate) return null;

    const deltaY = moveCurrentY - moveStartY;
    const originalTop = getTimeSlotPosition(movingEvent.startTime, startHour);

    // Calculate new top position, snapping to 15-minute intervals
    let newTop = originalTop + deltaY;
    newTop = Math.round(newTop / 15) * 15; // Snap to 15-minute intervals
    newTop = Math.max(0, Math.min(newTop, (endHour - startHour) * 60 - movingEvent.durationMinutes));

    // Calculate new times based on position
    const startTime = pixelToTime(newTop, 15, startHour);
    const endTime = pixelToTime(newTop + movingEvent.durationMinutes, 15, startHour);

    return {
      top: newTop,
      height: movingEvent.durationMinutes,
      startTime,
      endTime,
      scheduledDate: moveTargetDate,
      durationMinutes: movingEvent.durationMinutes,
    };
  }, [isMoving, movingEvent, moveTargetDate, moveCurrentY, moveStartY, startHour, endHour]);

  const handleMoveEnd = useCallback(() => {
    if (!isMoving || !movingEvent) {
      setIsMoving(false);
      return;
    }

    const movedData = getMovedEventPosition();
    if (movedData && onEventMove) {
      onEventMove({
        eventId: movingEvent.id,
        scheduledDate: movedData.scheduledDate,
        startTime: movedData.startTime,
        endTime: movedData.endTime,
        durationMinutes: movedData.durationMinutes,
      });
    }

    // Reset move state
    setIsMoving(false);
    setMovingEvent(null);
    setMoveStartY(0);
    setMoveCurrentY(0);
    setMoveTargetDate(null);
    moveColumnRef.current = null;
  }, [isMoving, movingEvent, getMovedEventPosition, onEventMove]);

  // Global mouse up listener to handle mouse up outside the calendar
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => handleMouseUp();
      window.addEventListener("mouseup", handleGlobalMouseUp);
      return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
    }
  }, [isDragging, handleMouseUp]);

  // Global mouse up listener for resize
  useEffect(() => {
    if (isResizing) {
      const handleGlobalMouseUp = () => handleResizeEnd();
      window.addEventListener("mouseup", handleGlobalMouseUp);
      return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
    }
  }, [isResizing, handleResizeEnd]);

  // Global mouse move listener for resize (to handle moves outside the calendar)
  useEffect(() => {
    if (isResizing && resizeColumnRef.current) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const rect = resizeColumnRef.current!.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const maxY = (endHour - startHour) * 60;
        setResizeCurrentY(Math.max(0, Math.min(y, maxY)));
      };
      window.addEventListener("mousemove", handleGlobalMouseMove);
      return () => window.removeEventListener("mousemove", handleGlobalMouseMove);
    }
  }, [isResizing, endHour, startHour]);

  // Global mouse up listener for move
  useEffect(() => {
    if (isMoving) {
      const handleGlobalMouseUp = () => handleMoveEnd();
      window.addEventListener("mouseup", handleGlobalMouseUp);
      return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
    }
  }, [isMoving, handleMoveEnd]);

  // Global mouse move listener for move
  useEffect(() => {
    if (isMoving) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        // Find which day column the mouse is over
        const found: { column: HTMLDivElement; date: string } | null = (() => {
          for (const [dateStr, col] of dayColumnsRef.current.entries()) {
            const rect = col.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right) {
              return { column: col, date: dateStr };
            }
          }
          return null;
        })();

        if (found) {
          const rect = found.column.getBoundingClientRect();
          const y = e.clientY - rect.top;
          const maxY = (endHour - startHour) * 60;
          setMoveCurrentY(Math.max(0, Math.min(y, maxY)));
          setMoveTargetDate(found.date);
          moveColumnRef.current = found.column;
        }
      };
      window.addEventListener("mousemove", handleGlobalMouseMove);
      return () => window.removeEventListener("mousemove", handleGlobalMouseMove);
    }
  }, [isMoving, endHour, startHour]);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Calculate current time line position (pixels from top)
  const getCurrentTimePosition = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const totalMinutes = (hours - startHour) * 60 + minutes;
    return totalMinutes; // 1 pixel per minute (60px per hour)
  };

  // Scroll to 8am on mount so users see a reasonable starting view
  useEffect(() => {
    if (scrollRef.current) {
      const scrollToHour = 8; // 8 AM
      const pixelsPerHour = 60;
      scrollRef.current.scrollTop = (scrollToHour - startHour) * pixelsPerHour;
    }
  }, [startHour]);

  const getEventsForDay = (day: Date, allDay: boolean) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return events.filter(
      (event) => event.scheduledDate === dateStr && !!event.isAllDay === allDay
    );
  };

  // Check if there are any all-day events
  const hasAllDayEvents = events.some((e) => e.isAllDay);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* All-day events row */}
      {hasAllDayEvents && (
        <div className="flex border-b border-border-subtle flex-shrink-0">
          {/* Empty space for time labels */}
          <div className="w-12 flex-shrink-0 flex items-center justify-end pr-3">
            <span className="text-[10px] text-text-muted uppercase">All day</span>
          </div>

          {/* All-day events for each day */}
          <div className="flex flex-1">
            {days.map((day, dayIndex) => {
              const allDayEvents = getEventsForDay(day, true);

              return (
                <div
                  key={dayIndex}
                  className={cn(
                    "flex-1 py-1.5 px-0.5 flex flex-col gap-1 min-h-[32px] overflow-hidden",
                    dayIndex < days.length - 1 && "border-r border-border-subtle"
                  )}
                >
                  {allDayEvents.map((event) => (
                    <AllDayEvent
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick?.(event)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex">
          {/* Time labels */}
          <div className="flex flex-col w-12 flex-shrink-0">
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-[60px] flex items-start justify-end pr-3"
              >
                <span className="text-xs text-text-muted -mt-2">
                  {formatTime(`${hour.toString().padStart(2, "0")}:00`)}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div
            className="flex flex-1"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {days.map((day, dayIndex) => {
              const timedEvents = getEventsForDay(day, false);
              const dateStr = format(day, "yyyy-MM-dd");
              const dragPreviewData = getDragPreviewData();
              const showDragPreview = isDragging && dragDate === dateStr && dragPreviewData;
              const movedEventData = getMovedEventPosition();
              const showMovingEventHere = isMoving && moveTargetDate === dateStr && movedEventData;

              return (
                <div
                  key={dayIndex}
                  data-day-column
                  ref={(el) => {
                    if (el) {
                      dayColumnsRef.current.set(dateStr, el);
                    }
                  }}
                  className={cn(
                    "flex-1 relative cursor-crosshair select-none",
                    dayIndex < days.length - 1 && "border-r border-border-subtle"
                  )}
                  onMouseDown={(e) => handleMouseDown(e, day)}
                >
                  {/* Hour grid lines */}
                  {hours.map((hour, hourIndex) => (
                    <div
                      key={hour}
                      className={cn(
                        "h-[60px] border-t border-border-subtle",
                        hourIndex === 0 && "border-t-0"
                      )}
                    />
                  ))}

                  {/* Drag preview */}
                  {showDragPreview && (
                    <DragPreview
                      top={dragPreviewData.top}
                      height={dragPreviewData.height}
                      startTime={dragPreviewData.startTime}
                      endTime={dragPreviewData.endTime}
                    />
                  )}

                  {/* Moving event preview - show in target day column */}
                  {showMovingEventHere && movingEvent && (
                    <EventBlock
                      event={{ ...movingEvent, startTime: movedEventData.startTime, endTime: movedEventData.endTime }}
                      style={{
                        top: movedEventData.top,
                        height: movedEventData.height,
                      }}
                      isMoving={true}
                    />
                  )}

                  {/* Timed Events */}
                  {calculateEventPositions(timedEvents).map(({ event, column, totalColumns }) => {
                    const isThisEventResizing = isResizing && resizingEvent?.id === event.id;
                    const isThisEventMoving = isMoving && movingEvent?.id === event.id;
                    const resizedData = isThisEventResizing ? getResizedEventTimes() : null;

                    // Hide the original event while it's being moved
                    if (isThisEventMoving) {
                      return null;
                    }

                    return (
                      <EventBlock
                        key={event.id}
                        event={event}
                        style={{
                          top: resizedData ? resizedData.top : getTimeSlotPosition(event.startTime, startHour),
                          height: resizedData ? resizedData.height : getEventHeight(event.durationMinutes),
                          left: `${(column / totalColumns) * 100}%`,
                          width: `${(1 / totalColumns) * 100}%`,
                        }}
                        onClick={() => !isResizing && !isMoving && onEventClick?.(event)}
                        onResizeStart={(e, edge) => {
                          const columnEl = e.currentTarget.closest('[data-day-column]') as HTMLDivElement;
                          if (columnEl) {
                            handleResizeStart(e, event, edge, columnEl);
                          }
                        }}
                        onMoveStart={(e) => {
                          const columnEl = e.currentTarget.closest('[data-day-column]') as HTMLDivElement;
                          if (columnEl) {
                            handleMoveStart(e, event, columnEl, dateStr);
                          }
                        }}
                        isResizing={isThisEventResizing}
                      />
                    );
                  })}

                  {/* Current time indicator - only show on today's column */}
                  {isToday(day) && (
                    <div
                      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                      style={{ top: getCurrentTimePosition() }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-[#EA4335] -ml-1" />
                      <div className="flex-1 h-[2px] bg-[#EA4335]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
