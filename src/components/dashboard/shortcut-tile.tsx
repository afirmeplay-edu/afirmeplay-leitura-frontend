import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ACCENT_STYLES = {
  emerald: {
    border: "border-t-emerald-500",
    icon: "bg-emerald-500/10 text-emerald-600",
  },
  amber: {
    border: "border-t-amber-500",
    icon: "bg-amber-500/10 text-amber-600",
  },
  blue: {
    border: "border-t-blue-500",
    icon: "bg-blue-500/10 text-blue-600",
  },
  green: {
    border: "border-t-green-500",
    icon: "bg-green-500/10 text-green-600",
  },
  purple: {
    border: "border-t-purple-500",
    icon: "bg-purple-500/10 text-purple-600",
  },
  orange: {
    border: "border-t-orange-500",
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
  badge,
  accent = "blue",
}: ShortcutTileProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <Link href={href} title={description} className="block min-w-0">
      <Card className={cn("h-full border-t-2 transition-shadow hover:shadow-md", styles.border)}>
        <CardContent className="flex items-center gap-2.5 p-3 !pt-3">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              styles.icon
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{label}</p>
            {badge ? (
              <Badge variant="success" className="mt-0.5 px-1.5 py-0 text-[10px] leading-4">
                {badge}
              </Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
