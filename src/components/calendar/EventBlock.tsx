import React from "react";
import { cn } from "@/utils/cn";
import type { CalendarEvent } from "@/types";

interface EventBlockProps {
  event: CalendarEvent;
  style: {
    top: number;
    height: number;
    left?: string;
    width?: string;
  };
  onClick?: () => void;
  onResizeStart?: (e: React.MouseEvent, edge: "top" | "bottom") => void;
  onMoveStart?: (e: React.MouseEvent) => void;
  isResizing?: boolean;
  isMoving?: boolean;
}

const categoryStyles: Record<string, { bg: string; border: string; text: string }> = {
  // New 10-color palette
  yellow: { bg: "bg-[#FFF8E1]/80", border: "border-l-[#FFDE59]", text: "text-[#8B7355]" },
  orange: { bg: "bg-[#FFF0E0]/80", border: "border-l-[#FFB366]", text: "text-[#8B6644]" },
  coral: { bg: "bg-[#FFF5F0]/80", border: "border-l-[#F5A88E]", text: "text-[#8B5A44]" },
  pink: { bg: "bg-[#FFF0F8]/80", border: "border-l-[#F5A8D0]", text: "text-[#8B5577]" },
  purple: { bg: "bg-[#F8F0FF]/80", border: "border-l-[#C4A8F5]", text: "text-[#6B5588]" },
  blue: { bg: "bg-[#F0F8FF]/80", border: "border-l-[#A8C8F5]", text: "text-[#556688]" },
  teal: { bg: "bg-[#F0FFFF]/80", border: "border-l-[#A8E6E6]", text: "text-[#557777]" },
  green: { bg: "bg-[#F0FFF4]/80", border: "border-l-[#A8E6B4]", text: "text-[#557755]" },
  lime: { bg: "bg-[#F8FFF0]/80", border: "border-l-[#D4E6A8]", text: "text-[#667755]" },
  gray: { bg: "bg-[#F5F5F5]/80", border: "border-l-[#C8C8C8]", text: "text-[#666666]" },
  // Legacy colors
  development: { bg: "bg-[#FFF8E1]/80", border: "border-l-[#FFDE59]", text: "text-[#8B7355]" },
  collaboration: { bg: "bg-[#FFF0E0]/80", border: "border-l-[#FFB366]", text: "text-[#8B6644]" },
  client: { bg: "bg-[#FFF5F0]/80", border: "border-l-[#F5A88E]", text: "text-[#8B5A44]" },
};

export function EventBlock({ event, style, onClick, onResizeStart, onMoveStart, isResizing, isMoving }: EventBlockProps) {
  const styles = categoryStyles[event.categoryColor] || categoryStyles.yellow;
  const mouseDownPos = React.useRef<{ x: number; y: number } | null>(null);

  const handleResizeMouseDown = (e: React.MouseEvent, edge: "top" | "bottom") => {
    e.stopPropagation();
    e.preventDefault();
    mouseDownPos.current = null; // Suppress click after resize
    onResizeStart?.(e, edge);
  };

  const handleMoveMouseDown = (e: React.MouseEvent) => {
    // Don't start move if clicking on resize handles
    const target = e.target as HTMLElement;
    if (target.dataset.resizeHandle) return;

    e.stopPropagation();
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    onMoveStart?.(e);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!mouseDownPos.current) {
      onClick?.();
      return;
    }

    const dx = e.clientX - mouseDownPos.current.x;
    const dy = e.clientY - mouseDownPos.current.y;
    mouseDownPos.current = null;

    if (Math.abs(dx) <= 5 && Math.abs(dy) <= 5) {
      onClick?.();
    }
  };

  return (
    <div
      data-event
      onClick={handleClick}
      onMouseDown={handleMoveMouseDown}
      className={cn(
        "absolute rounded-sm border-l-[3px] px-2 py-1.5 overflow-hidden cursor-grab hover:brightness-95 transition-all group",
        styles.bg,
        styles.border,
        (isResizing || isMoving) && "z-30",
        isMoving && "cursor-grabbing opacity-90 shadow-lg"
      )}
      style={{
        top: `${style.top}px`,
        height: `${style.height}px`,
        left: style.left ? `calc(${style.left} + 2px)` : "4px",
        width: style.width ? `calc(${style.width} - 6px)` : "calc(100% - 8px)",
      }}
    >
      {/* Top resize handle */}
      <div
        data-resize-handle
        className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 hover:bg-black/10 transition-opacity"
        onMouseDown={(e) => handleResizeMouseDown(e, "top")}
      />

      <div className={cn("min-w-0 pointer-events-none", styles.text)}>
        <div className="text-sm font-semibold truncate leading-tight">
          {event.title}
        </div>
        {style.height > 40 && (
          <div className="text-xs opacity-80 mt-0.5">
            {event.startTime} – {event.endTime}
          </div>
        )}
      </div>

      {/* Bottom resize handle */}
      <div
        data-resize-handle
        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 hover:bg-black/10 transition-opacity"
        onMouseDown={(e) => handleResizeMouseDown(e, "bottom")}
      />
    </div>
  );
}
