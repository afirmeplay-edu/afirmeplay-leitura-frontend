"use client";

import { BarChart3 } from "lucide-react";
import { classifyNotaDesempenho } from "@/lib/colors/proficiency-levels";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function formatNota(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function NotaDesempenhoCard({
  value,
  loading,
  className,
  label = "Nota",
  scaleHint = "Escala 0–10",
}: {
  value: number | null | undefined;
  loading?: boolean;
  className?: string;
  label?: string;
  scaleHint?: string;
}) {
  const level = classifyNotaDesempenho(value);

  return (
    <Card
      className={cn("overflow-hidden border-0 shadow-sm transition-shadow hover:shadow-md", className)}
      style={
        level
          ? { backgroundColor: level.hex, color: level.fgHex }
          : undefined
      }
    >
      <CardContent className="relative space-y-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className={cn("text-xs font-medium uppercase tracking-wide", level ? "opacity-80" : "text-muted-foreground")}>
              {label}
            </p>
            {level ? (
              <p className="text-sm font-bold leading-tight tracking-tight sm:text-base">{level.label}</p>
            ) : null}
          </div>
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              level ? "bg-black/10" : "bg-brand-highlight/10 text-brand-highlight"
            )}
          >
            <BarChart3 className="h-4 w-4" />
          </div>
        </div>

        {loading ? (
          <Skeleton className={cn("h-9 w-24", level && "bg-white/25")} />
        ) : (
          <div className={cn("break-words text-3xl font-bold leading-none tracking-tight tabular-nums", !level && "text-foreground")}>
            {formatNota(value)}
          </div>
        )}

        <p className={cn("text-xs", level ? "opacity-75" : "text-muted-foreground")}>{scaleHint}</p>
      </CardContent>
    </Card>
  );
}
