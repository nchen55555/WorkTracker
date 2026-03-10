import { cn } from "@/utils/cn";
import type { CalendarEvent } from "@/types";

interface AllDayEventProps {
  event: CalendarEvent;
  onClick?: () => void;
}

const categoryStyles: Record<string, { bg: string; border: string; text: string }> = {
  // New 10-color palette
  yellow: { bg: "bg-[#FFF8E1]", border: "border-l-[#FFDE59]", text: "text-[#8B7355]" },
  orange: { bg: "bg-[#FFF0E0]", border: "border-l-[#FFB366]", text: "text-[#8B6644]" },
  coral: { bg: "bg-[#FFF5F0]", border: "border-l-[#F5A88E]", text: "text-[#8B5A44]" },
  pink: { bg: "bg-[#FFF0F8]", border: "border-l-[#F5A8D0]", text: "text-[#8B5577]" },
  purple: { bg: "bg-[#F8F0FF]", border: "border-l-[#C4A8F5]", text: "text-[#6B5588]" },
  blue: { bg: "bg-[#F0F8FF]", border: "border-l-[#A8C8F5]", text: "text-[#556688]" },
  teal: { bg: "bg-[#F0FFFF]", border: "border-l-[#A8E6E6]", text: "text-[#557777]" },
  green: { bg: "bg-[#F0FFF4]", border: "border-l-[#A8E6B4]", text: "text-[#557755]" },
  lime: { bg: "bg-[#F8FFF0]", border: "border-l-[#D4E6A8]", text: "text-[#667755]" },
  gray: { bg: "bg-[#F5F5F5]", border: "border-l-[#C8C8C8]", text: "text-[#666666]" },
  // Legacy colors
  development: { bg: "bg-[#FFF8E1]", border: "border-l-[#FFDE59]", text: "text-[#8B7355]" },
  collaboration: { bg: "bg-[#FFF0E0]", border: "border-l-[#FFB366]", text: "text-[#8B6644]" },
  client: { bg: "bg-[#FFF5F0]", border: "border-l-[#F5A88E]", text: "text-[#8B5A44]" },
};

export function AllDayEvent({ event, onClick }: AllDayEventProps) {
  const styles = categoryStyles[event.categoryColor] || categoryStyles.development;

  return (
    <div
      onClick={onClick}
      className={cn(
        "px-2 py-0.5 rounded-sm border-l-2 text-xs font-medium truncate cursor-pointer hover:brightness-95 transition-all max-w-full",
        styles.bg,
        styles.border,
        styles.text
      )}
      title={event.title}
    >
      {event.title}
    </div>
  );
}
