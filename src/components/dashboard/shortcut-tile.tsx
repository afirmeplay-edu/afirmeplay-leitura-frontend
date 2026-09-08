import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
} as const;

interface ShortcutTileProps {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  accent?: keyof typeof ACCENT_STYLES;
}

export function ShortcutTile({
  href,
  label,
  description,
  icon: Icon,
  accent = "blue",
}: ShortcutTileProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <Link href={href} title={description} className="block min-w-0">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-3 p-4 !pt-4">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              styles.icon
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{label}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
