import { cn } from "@/lib/utils";
import {
  getProficiencyLevelStyle,
  type ProficiencyLevelStyle,
} from "@/lib/colors/proficiency-levels";
import { REPORT_TAG_BASE } from "@/utils/tag-styles";

export function ProficiencyLevelBadge({
  level,
  className,
  fallback = "—",
}: {
  level?: string | null;
  className?: string;
  fallback?: string;
}) {
  const style = getProficiencyLevelStyle(level);
  if (!style) {
    return <span className={cn("text-sm text-muted-foreground", className)}>{fallback}</span>;
  }

  return (
    <span className={cn(REPORT_TAG_BASE, style.tagClass, className)}>{style.label}</span>
  );
}

export function ProficiencyLevelDot({ style }: { style: ProficiencyLevelStyle }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: style.hex }}
      aria-hidden
    />
  );
}
