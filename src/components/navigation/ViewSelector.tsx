import { cn } from "@/utils/cn";
import { useViewStore } from "@/stores/viewStore";
import type { ViewType } from "@/types";

const tabs: { id: ViewType; label: string }[] = [
  { id: "dailies", label: "Dailies" },
  { id: "meetings", label: "Meetings" },
  { id: "notes", label: "Notes" },
];

const tabStyles: Record<ViewType, { active: string; inactive: string }> = {
  dailies: {
    active: "bg-[#FFF3CC] border-[#FFDE59] text-[#8B7355]",
    inactive: "bg-white border-[#F5EED9] text-[#A8A89C] hover:bg-[#FFFCF5]",
  },
  meetings: {
    active: "bg-[#FFF9F0] border-[#FFE8D6] text-[#A89080]",
    inactive: "bg-white border-[#F5EED9] text-[#A8A89C] hover:bg-[#FFFCF5]",
  },
  notes: {
    active: "bg-[#FFF8F0] border-[#F5E6D6] text-[#8B7355]",
    inactive: "bg-white border-[#F5EED9] text-[#A8A89C] hover:bg-[#FFFCF5]",
  },
};

export function ViewSelector() {
  const { activeView, setActiveView } = useViewStore();

  return (
    <div className="flex gap-2">
      {tabs.map((tab) => {
        const isActive = activeView === tab.id;
        const styles = tabStyles[tab.id];

        return (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={cn(
              "px-4 py-2.5 rounded-[10px] border-[1.5px] transition-colors",
              "font-medium text-lg",
              isActive ? styles.active : styles.inactive
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
