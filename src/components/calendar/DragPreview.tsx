import { cn } from "@/utils/cn";

interface DragPreviewProps {
  top: number;
  height: number;
  startTime: string;
  endTime: string;
}

export function DragPreview({ top, height, startTime, endTime }: DragPreviewProps) {
  return (
    <div
      className={cn(
        "absolute rounded-sm border-l-[3px] px-2 py-1.5 overflow-hidden pointer-events-none",
        "bg-[#FFDE59]/30 border-l-[#FFDE59] border border-dashed border-[#FFDE59]/50"
      )}
      style={{
        top: `${top}px`,
        height: `${Math.max(height, 15)}px`,
        left: "4px",
        width: "calc(100% - 8px)",
        zIndex: 50,
      }}
    >
      <div className="flex items-center gap-1 text-[#8B7355]">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="text-xs font-medium">
          {startTime} – {endTime}
        </span>
      </div>
    </div>
  );
}
