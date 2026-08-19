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
}

export function StatCard({ label, value, icon: Icon, trend, className, accentColor }: StatCardProps) {
  return (
    <Card
      className={cn("transition-shadow hover:shadow-md", className)}
      style={accentColor ? { borderColor: accentColor } : undefined}
    >
      <CardContent className="flex items-center gap-4 p-6">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          style={
            accentColor
              ? { backgroundColor: `${accentColor}22`, color: accentColor }
              : undefined
          }
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="break-words text-2xl font-bold leading-tight tracking-tight text-foreground">
            {value}
          </p>
          {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
