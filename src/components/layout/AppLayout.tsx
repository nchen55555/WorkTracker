import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";

export function AppLayout() {
  return (
    <div className="flex h-screen bg-background">
      {/* Left Panel - Task/Meeting List */}
      <div className="w-[33%] min-w-[320px] max-w-[480px] border-r border-border-subtle">
        <LeftPanel />
      </div>

      {/* Right Panel - Calendar */}
      <div className="flex-1 min-w-[500px]">
        <RightPanel />
      </div>
    </div>
  );
}
