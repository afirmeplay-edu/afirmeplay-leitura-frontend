"use client";

import { useEffect, useMemo, useRef } from "react";
import type { FluencyWordStatus } from "@/lib/api/afirme-reading";
import type { SentenceStatus } from "@/components/fluencia/manual-marking";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ReadingCursorItem {
  id: string;
  /** Texto exibido (palavra). */
  label: string;
  /** Prefixo opcional na sequência (ex.: "01."). */
  sequenceLabel?: string;
  status: FluencyWordStatus | null;
  sentenceIndex?: number;
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
  /** Clique para ciclar marcação (depois da gravação). */
  onMarkWord?: (index: number) => void;
  /** Avança manualmente para a próxima palavra durante a leitura. */
  onNextWord?: () => void;
  sentenceStatuses?: SentenceStatus[];
  /** Esconde o card da palavra atual (modo correção do professor). */
  hideHero?: boolean;
  /** Esconde o indicador de escuta (visualização read-only). */
  showListening?: boolean;
  className?: string;
}

function statusClass(status: FluencyWordStatus | null, active: boolean) {
  if (active) {
    return "border-bluebrand-base bg-bluebrand-base/10 text-bluebrand-deep shadow-sm";
  }
  switch (status) {
    case "acertou":
      return "border-emerald-300 bg-emerald-50 text-emerald-900";
    case "soletrou":
    case "silabou":
      return "border-violet-300 bg-violet-50 text-violet-900";
    case "inventou":
    case "errou":
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
    case "soletrou":
    case "silabou":
      return "rounded px-0.5 text-violet-800 underline decoration-dotted decoration-violet-500";
    case "inventou":
    case "errou":
      return "rounded px-0.5 text-red-700 underline decoration-red-400";
    case "nao_leu":
      return "rounded px-0.5 text-slate-400";
    default:
      return "text-slate-800";
  }
}

function sentenceClass(status: SentenceStatus | undefined) {
  switch (status) {
    case "all_correct":
      return "rounded-md bg-emerald-50 px-1 py-0.5 ring-1 ring-emerald-200";
    case "partial":
      return "rounded-md bg-amber-50 px-1 py-0.5 ring-1 ring-amber-200";
    case "mostly_wrong":
      return "rounded-md bg-red-50 px-1 py-0.5 ring-1 ring-red-200";
    default:
      return "";
  }
}

function ListeningStatus({ listening }: { listening: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide",
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
  );
}

export function ReadingCursorStage({
  items,
  cursor,
  listening,
  mode,
  showSequence = true,
  instruction = "LEIA EM VOZ ALTA A PALAVRA",
  onSelectIndex,
  onMarkWord,
  onNextWord,
  sentenceStatuses,
  hideHero = false,
  showListening = true,
  className,
}: ReadingCursorStageProps) {
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const current = items[cursor] ?? null;
  const total = items.length;
  const progressLabel =
    total === 0 ? "—" : `PALAVRA ${Math.min(cursor + 1, total)} / ${total}`;

  const sentenceGroups = useMemo(() => {
    if (mode !== "narrative") return [];
    const groups: Array<{ sentenceIndex: number; start: number; items: ReadingCursorItem[] }> = [];
    items.forEach((item, index) => {
      const sentenceIndex = item.sentenceIndex ?? 0;
      const last = groups[groups.length - 1];
      if (!last || last.sentenceIndex !== sentenceIndex) {
        groups.push({ sentenceIndex, start: index, items: [item] });
        return;
      }
      last.items.push(item);
    });
    return groups;
  }, [items, mode]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [cursor]);

  function handleWordClick(index: number) {
    if (onMarkWord) {
      onMarkWord(index);
      return;
    }
    onSelectIndex?.(index);
  }

  const wordInteractive = Boolean(onMarkWord || onSelectIndex);

  return (
    <div className={cn("space-y-4", className)}>
      {!hideHero && mode !== "narrative" ? (
        <div className="rounded-xl border-2 border-bluebrand-base bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            {showListening ? <ListeningStatus listening={listening} /> : <span />}
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {progressLabel}
            </span>
          </div>

          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {instruction}
          </p>
          <p className="mt-3 break-words text-center text-4xl font-bold tracking-wide text-bluebrand-deep sm:text-5xl">
            {current?.label ?? "—"}
          </p>
          {listening && onNextWord ? (
            <div className="mt-5 flex justify-end">
              <Button
                type="button"
                onClick={onNextWord}
                disabled={total === 0 || cursor >= total - 1}
              >
                Próxima Palavra
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === "narrative" ? (
        <div className="rounded-xl border bg-white p-4 leading-relaxed">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Texto narrativo
            </p>
            {showListening ? <ListeningStatus listening={listening} /> : null}
          </div>
          {onMarkWord ? (
            <p className="mb-3 text-xs text-muted-foreground">
              Clique na palavra: 1× correta · 2× errada · 3× soletrada · 4× limpar
            </p>
          ) : null}
          <div className="space-y-2 text-base sm:text-lg">
            {sentenceGroups.map((group) => {
              const status = sentenceStatuses?.[group.sentenceIndex];
              return (
                <span
                  key={`s-${group.sentenceIndex}-${group.start}`}
                  className={cn("inline", sentenceClass(status))}
                >
                  {group.items.map((item, offset) => {
                    const index = group.start + offset;
                    const active = listening && index === cursor;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        ref={active ? activeRef : undefined}
                        disabled={!wordInteractive}
                        onClick={() => handleWordClick(index)}
                        className={cn(
                          "mr-1 inline border-0 bg-transparent p-0 text-left font-medium uppercase tracking-wide transition",
                          spanStatusClass(item.status, active),
                          wordInteractive && "cursor-pointer"
                        )}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </span>
              );
            })}
          </div>
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
