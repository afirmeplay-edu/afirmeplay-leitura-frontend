"use client";

import { useEffect, useRef } from "react";
import type { FluencyWordStatus } from "@/lib/api/afirme-reading";
import { cn } from "@/lib/utils";

export interface ReadingCursorItem {
  id: string;
  /** Texto exibido (palavra). */
  label: string;
  /** Prefixo opcional na sequência (ex.: "01."). */
  sequenceLabel?: string;
  status: FluencyWordStatus | null;
}

interface ReadingCursorStageProps {
  items: ReadingCursorItem[];
  cursor: number;
  listening: boolean;
  mode: "list" | "narrative";
  /** No modo narrative, renderiza spans no fluxo do texto (mesma ordem de items). */
  showSequence?: boolean;
  instruction?: string;
  onSelectIndex?: (index: number) => void;
  className?: string;
}

function statusClass(status: FluencyWordStatus | null, active: boolean) {
  if (active) {
    return "border-bluebrand-base bg-bluebrand-base/10 text-bluebrand-deep shadow-sm";
  }
  switch (status) {
    case "acertou":
      return "border-emerald-300 bg-emerald-50 text-emerald-900";
    case "inventou":
    case "errou":
    case "soletrou":
      return "border-red-300 bg-red-50 text-red-900";
    case "nao_leu":
      return "border-slate-300 bg-slate-100 text-slate-600";
    default:
      return "border-slate-200 bg-white text-slate-800";
  }
}

function spanStatusClass(status: FluencyWordStatus | null, active: boolean) {
  if (active) {
    return "rounded px-1 bg-bluebrand-base/15 text-bluebrand-deep ring-2 ring-bluebrand-base";
  }
  switch (status) {
    case "acertou":
      return "rounded px-0.5 text-emerald-700";
    case "inventou":
    case "errou":
    case "soletrou":
      return "rounded px-0.5 text-red-700 underline decoration-red-400";
    case "nao_leu":
      return "rounded px-0.5 text-slate-400";
    default:
      return "text-slate-800";
  }
}

export function ReadingCursorStage({
  items,
  cursor,
  listening,
  mode,
  showSequence = true,
  instruction = "LEIA EM VOZ ALTA A PALAVRA",
  onSelectIndex,
  className,
}: ReadingCursorStageProps) {
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const current = items[cursor] ?? null;
  const total = items.length;
  const progressLabel =
    total === 0 ? "—" : `PALAVRA ${Math.min(cursor + 1, total)} / ${total}`;

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [cursor]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-xl border-2 border-bluebrand-base bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide">
          <span
            className={cn(
              "inline-flex items-center gap-2",
              listening ? "text-red-600" : "text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                listening ? "animate-pulse bg-red-600" : "bg-slate-300"
              )}
            />
            {listening ? "Ouvindo a leitura" : "Aguardando início"}
          </span>
          <span className="text-muted-foreground">{progressLabel}</span>
        </div>

        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {instruction}
        </p>
        <p className="mt-3 break-words text-center text-4xl font-bold tracking-wide text-bluebrand-deep sm:text-5xl">
          {current?.label ?? "—"}
        </p>
      </div>

      {mode === "narrative" ? (
        <div className="rounded-xl border bg-white p-4 leading-relaxed">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Texto narrativo
          </p>
          <p className="text-base sm:text-lg">
            {items.map((item, index) => {
              const active = listening && index === cursor;
              return (
                <button
                  key={item.id}
                  type="button"
                  ref={active ? activeRef : undefined}
                  disabled={!onSelectIndex}
                  onClick={() => onSelectIndex?.(index)}
                  className={cn(
                    "mr-1 inline border-0 bg-transparent p-0 text-left font-medium uppercase tracking-wide transition",
                    spanStatusClass(item.status, active),
                    onSelectIndex && "cursor-pointer"
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </p>
        </div>
      ) : null}

      {showSequence && mode === "list" ? (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Sequência da lista
          </p>
          <div className="max-h-56 space-y-2 overflow-auto pr-1">
            {items.map((item, index) => {
              const active = index === cursor;
              return (
                <button
                  key={item.id}
                  type="button"
                  ref={active ? activeRef : undefined}
                  disabled={!onSelectIndex}
                  onClick={() => onSelectIndex?.(index)}
                  className={cn(
                    "flex w-full items-center rounded-lg border px-3 py-2.5 text-left text-sm font-semibold tracking-wide transition",
                    statusClass(item.status, active),
                    onSelectIndex ? "cursor-pointer" : "cursor-default"
                  )}
                >
                  <span className="mr-2 text-xs text-muted-foreground">
                    {item.sequenceLabel ?? String(index + 1).padStart(2, "0") + "."}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
