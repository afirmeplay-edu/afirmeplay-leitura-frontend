import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  className?: string;
  accentColor?: string;
  compact?: boolean;
  loading?: boolean;
  /** Layout do painel: label + ícone no topo, valor grande, contexto embaixo. */
  variant?: "default" | "metric" | "featured";
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  className,
  accentColor,
  compact,
  loading,
  variant = "default",
}: StatCardProps) {
  const valueNode = loading ? (
    <Skeleton className={cn("h-8 w-20", variant === "featured" && "bg-white/30")} />
  ) : (
    value
  );

  if (variant === "featured") {
    return (
      <Card
        className={cn(
          "border-0 bg-gradient-to-r from-brand-hero-from to-brand-hero-to text-white shadow-sm",
          className
        )}
      >
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-white/80">{label}</p>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
              <Icon className="h-4 w-4" />
            </div>
          </div>
          <p className="break-words text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{valueNode}</p>
          {trend ? <p className="text-xs text-white/75">{trend}</p> : null}
        </CardContent>
      </Card>
    );
  }

  if (variant === "metric") {
    return (
      <Card className={cn("transition-shadow hover:shadow-md", className)}>
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-muted-foreground">{label}</p>
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-brand-highlight"
              style={
                accentColor
                  ? { backgroundColor: `${accentColor}22`, color: accentColor }
                  : undefined
              }
            >
              <Icon className="h-4 w-4" />
            </div>
          </div>
          <p className="break-words text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
            {valueNode}
          </p>
          {trend ? <p className="text-xs text-muted-foreground">{trend}</p> : null}
        </CardContent>
      </Card>
    );
  }

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
            {valueNode}
          </p>
          {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
