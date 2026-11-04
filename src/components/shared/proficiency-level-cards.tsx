"use client";

import {
  getProficiencyLevelStyle,
  PROFICIENCY_LEVELS,
  type ProficiencyLevelLabel,
} from "@/lib/colors/proficiency-levels";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface ProficiencyLevelCountItem {
  name: string;
  count: number;
  percentage: number | null;
}

function formatCount(value: number | null | undefined) {
  return typeof value === "number" ? value.toLocaleString("pt-BR") : "—";
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function ProficiencyLevelCards({
  items,
  loading,
}: {
  items?: ProficiencyLevelCountItem[] | null;
  loading?: boolean;
}) {
  const rows =
    items?.length
      ? items
      : PROFICIENCY_LEVELS.map((level) => ({
          name: level.label as string,
          count: 0,
          percentage: 0,
        }));

  if (loading) return <Skeleton className="h-28" />;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {rows.map((item) => {
        const style =
          getProficiencyLevelStyle(item.name) ??
          PROFICIENCY_LEVELS.find((level) => level.label === (item.name as ProficiencyLevelLabel));

        return (
          <div
            key={item.name}
            className="overflow-hidden rounded-xl border-0 p-4 shadow-sm"
            style={
              style
                ? { backgroundColor: style.hex, color: style.fgHex }
                : undefined
            }
          >
            <p className="text-sm font-bold leading-tight tracking-tight sm:text-base">
              {style?.label ?? item.name}
            </p>
            <p className="mt-3 text-3xl font-bold tabular-nums leading-none">
              {formatCount(item.count)}
            </p>
            <p className={cn("mt-2 text-xs font-medium", style ? "opacity-80" : "text-muted-foreground")}>
              {formatPercent(item.percentage)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
