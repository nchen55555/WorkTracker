import { cn } from "@/utils/cn";
import { formatDayName, formatDayNumber, isToday } from "@/utils/dates";

interface DayHeadersProps {
  days: Date[];
}

export function DayHeaders({ days }: DayHeadersProps) {
  return (
    <div className="flex ml-12">
      {days.map((day, index) => {
        const today = isToday(day);

        return (
          <div
            key={index}
            className={cn(
              "flex-1 flex flex-col items-center py-2 rounded-lg",
              today && "bg-[#FFF3CC]"
            )}
          >
            <span
              className={cn(
                "text-xs font-medium tracking-wide",
                today ? "text-[#8B7355]" : "text-text-muted"
              )}
            >
              {formatDayName(day)}
            </span>
            <span
              className={cn(
                "text-xl font-semibold",
                today ? "text-[#8B7355]" : "text-text-primary"
              )}
            >
              {formatDayNumber(day)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
