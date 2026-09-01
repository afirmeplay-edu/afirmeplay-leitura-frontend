import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  className?: string;
  accentColor?: string;
  compact?: boolean;
}

export function StatCard({ label, value, icon: Icon, trend, className, accentColor, compact }: StatCardProps) {
  return (
    <Card
      className={cn("transition-shadow hover:shadow-md", className)}
      style={accentColor ? { borderColor: accentColor } : undefined}
    >
      <CardContent className={cn("flex items-center gap-4 p-6", compact && "gap-2.5 px-3 py-2.5 !pt-2.5")}>
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary",
            compact && "h-8 w-8"
          )}
          style={
            accentColor
              ? { backgroundColor: `${accentColor}22`, color: accentColor }
              : undefined
          }
        >
          <Icon className={cn("h-5 w-5", compact && "h-4 w-4")} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm text-muted-foreground", compact && "text-xs")}>{label}</p>
          <p
            className={cn(
              "break-words text-2xl font-bold leading-tight tracking-tight text-foreground",
              compact && "text-lg"
            )}
          >
            {value}
          </p>
          {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
