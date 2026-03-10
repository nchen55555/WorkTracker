import { cn } from "@/utils/cn";
import { formatDuration } from "@/utils/dates";
import type { CategoryColor } from "@/types";

interface DurationBadgeProps {
  minutes: number;
  color?: CategoryColor;
}

const colorStyles: Record<string, string> = {
  // New 10-color palette
  yellow: "bg-[#FFF3CC] text-[#8B7355]",
  orange: "bg-[#FFE8CC] text-[#8B6644]",
  coral: "bg-[#FFE8DD] text-[#8B5A44]",
  pink: "bg-[#FFE8F0] text-[#8B5577]",
  purple: "bg-[#F0E8FF] text-[#6B5588]",
  blue: "bg-[#E8F0FF] text-[#556688]",
  teal: "bg-[#E8FFFF] text-[#557777]",
  green: "bg-[#E8FFF0] text-[#557755]",
  lime: "bg-[#F0FFE8] text-[#667755]",
  gray: "bg-[#F0F0F0] text-[#666666]",
  // Legacy colors
  development: "bg-[#FFF3CC] text-[#8B7355]",
  collaboration: "bg-[#FFE8CC] text-[#8B6644]",
  client: "bg-[#FFE8DD] text-[#8B5A44]",
};

export function DurationBadge({
  minutes,
  color = "yellow",
}: DurationBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-md text-sm font-semibold",
        colorStyles[color] || colorStyles.yellow
      )}
    >
      {formatDuration(minutes)}
    </span>
  );
}
