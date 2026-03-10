import { WeeklyCalendar } from "@/components/calendar/WeeklyCalendar";

export function RightPanel() {
  return (
    <div className="flex flex-col h-full py-6 px-8 overflow-hidden">
      <WeeklyCalendar />
    </div>
  );
}
