import { useRef, useState, useCallback, useEffect } from "react";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";

const MIN_LEFT = 320;
const MAX_LEFT = 600;
const DEFAULT_LEFT = 400;
const STORAGE_KEY = "app-layout-left-width";

export function AppLayout() {
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const n = parseInt(saved, 10);
      if (n >= MIN_LEFT && n <= MAX_LEFT) return n;
    }
    return DEFAULT_LEFT;
  });
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = leftWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [leftWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = Math.min(MAX_LEFT, Math.max(MIN_LEFT, startWidth.current + delta));
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      localStorage.setItem(STORAGE_KEY, String(leftWidth));
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [leftWidth]);

  return (
    <div className="flex h-screen bg-background">
      {/* Left Panel - Task/Meeting List */}
      <div className="shrink-0 overflow-hidden" style={{ width: leftWidth }}>
        <LeftPanel />
      </div>

      {/* Draggable divider */}
      <div
        onMouseDown={handleMouseDown}
        className="shrink-0 w-1 cursor-col-resize hover:bg-[#FFDE59]/40 active:bg-[#FFDE59]/60 transition-colors border-r border-border-subtle"
      />

      {/* Right Panel - Calendar */}
      <div className="flex-1 min-w-[500px] overflow-hidden">
        <RightPanel />
      </div>
    </div>
  );
}
