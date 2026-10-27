import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ShortcutAccent } from "@/config/navigation";
import { cn } from "@/lib/utils";

const ACCENT_STYLES = {
  purple: {
    icon: "bg-violet-500/10 text-brand-highlight",
  },
  blue: {
    icon: "bg-sky-500/10 text-sky-600",
  },
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-600",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-600",
  },
  green: {
    icon: "bg-green-500/10 text-green-600",
  },
  orange: {
    icon: "bg-orange-500/10 text-orange-600",
  },
  teal: {
    icon: "bg-teal-600/10 text-teal-700",
  },
} as const satisfies Record<ShortcutAccent, { icon: string }>;

interface ShortcutTileProps {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  accent?: keyof typeof ACCENT_STYLES;
  disabled?: boolean;
}

export function ShortcutTile({
  href,
  label,
  description,
  icon: Icon,
  badge,
  accent = "blue",
  disabled = false,
}: ShortcutTileProps) {
  const styles = ACCENT_STYLES[accent];

  const card = (
    <Card className={cn("h-full", disabled ? "border-dashed bg-muted/40" : "transition-shadow hover:shadow-md")}>
      <CardContent className="flex items-center gap-3 p-4 !pt-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            disabled ? "bg-muted text-muted-foreground" : styles.icon
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="truncate">{label}</span>
            {badge ? (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {badge}
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (disabled) {
    return (
      <div className="block min-w-0 cursor-not-allowed" aria-disabled="true" title={description}>
        {card}
      </div>
    );
  }

  return (
    <Link href={href} title={description} className="block min-w-0">
      {card}
    </Link>
  );
}
