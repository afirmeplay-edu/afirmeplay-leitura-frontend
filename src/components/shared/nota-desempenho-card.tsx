"use client";

import { BarChart3 } from "lucide-react";
import {
  classifyNotaDesempenho,
  NOTA_DESEMPENHO_GRADIENT,
  notaPointerPercent,
  PROFICIENCY_LEVELS,
} from "@/lib/colors/proficiency-levels";
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
  scaleHint = "0–10 · pontos / 34",
}: {
  value: number | null | undefined;
  loading?: boolean;
  className?: string;
  label?: string;
  scaleHint?: string;
}) {
  const level = classifyNotaDesempenho(value);
  const pointer = notaPointerPercent(value);

  return (
    <Card
      className={cn(
        "transition-shadow hover:shadow-md",
        level ? `${level.softClass.border} ${level.softClass.bg}` : null,
        className
      )}
    >
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={
              level
                ? { backgroundColor: `${level.hex}22`, color: level.hex }
                : undefined
            }
          >
            <BarChart3 className="h-4 w-4" />
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div
            className={cn("break-words text-2xl font-bold leading-tight tracking-tight tabular-nums sm:text-3xl", level?.softClass.text)}
          >
            {formatNota(value)}
          </div>
        )}

        {level ? (
          <p className={cn("text-xs font-medium", level.softClass.text)}>
            {level.label}
            <span className="font-normal text-muted-foreground"> · {scaleHint}</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">{scaleHint}</p>
        )}

        <div className="space-y-1.5 pt-1">
          <div className="relative pt-3">
            <div
              className="h-2 w-full rounded-full"
              style={{ background: NOTA_DESEMPENHO_GRADIENT }}
              aria-hidden
            />
            {typeof value === "number" && Number.isFinite(value) ? (
              <div
                className="absolute top-0 -translate-x-1/2"
                style={{ left: `${pointer}%` }}
                title={level ? `Nível por nota: ${level.label}` : undefined}
              >
                <div className="h-0 w-0 border-l-[5px] border-r-[5px] border-t-[8px] border-l-transparent border-r-transparent border-t-slate-900 dark:border-t-white" />
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-muted-foreground">
            {PROFICIENCY_LEVELS.map((item) => (
              <span key={item.key} className="inline-flex items-center gap-1">
                <span className={cn("h-1.5 w-1.5 rounded-full", item.softClass.bar)} />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
