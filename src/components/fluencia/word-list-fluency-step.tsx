"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type WordStatus =
  | "nao_leu"
  | "acertou"
  | "inventou"
  | "soletrou"
  | "errou";

export const WORD_STATUS_OPTIONS: ReadonlyArray<{
  id: WordStatus;
  label: string;
  shortLabel: string;
}> = [
  { id: "nao_leu", label: "Nao leu", shortLabel: "Nao leu" },
  { id: "acertou", label: "Acertou", shortLabel: "Acertou" },
  { id: "inventou", label: "Inventou/Nomeou letras", shortLabel: "Inventou" },
  { id: "soletrou", label: "Soletrou/Silabou", shortLabel: "Soletrou" },
  { id: "errou", label: "Errou", shortLabel: "Errou" },
];

/**
 * Statuses que entram em errorsCount (nao-acerto).
 * TODO: confirmar regra pedagogica de Soletrou/Silabou no calculo de errorsCount
 */
export const ERROR_STATUSES: readonly WordStatus[] = [
  "nao_leu",
  "errou",
  "inventou",
  "soletrou",
];

export interface FluencyListPartResult {
  wordsRead: number;
  errorsCount: number;
  readingTimeSeconds: number;
  statuses: Array<WordStatus | null>;
}

interface WordListFluencyStepProps {
  title: string;
  words: string[];
  durationSeconds?: number;
  continuePending?: boolean;
  onResultChange: (result: FluencyListPartResult | null) => void;
  onContinue: () => void;
}

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const s = (safe % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function countByStatus(statuses: Array<WordStatus | null>, status: WordStatus) {
  return statuses.reduce((total, item) => (item === status ? total + 1 : total), 0);
}

function buildResult(
  statuses: Array<WordStatus | null>,
  readingTimeSeconds: number
): FluencyListPartResult {
  const wordsRead = statuses.filter((status) => status != null).length;
  const errorsCount = statuses.filter(
    (status) => status != null && ERROR_STATUSES.includes(status)
  ).length;
  return {
    wordsRead,
    errorsCount,
    readingTimeSeconds: Math.max(1, readingTimeSeconds),
    statuses,
  };
}

export function WordListFluencyStep({
  title,
  words,
  durationSeconds = 60,
  continuePending = false,
  onResultChange,
  onContinue,
}: WordListFluencyStepProps) {
  const [statuses, setStatuses] = useState<Array<WordStatus | null>>(() =>
    words.map(() => null)
  );
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [result, setResult] = useState<FluencyListPartResult | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const statusesRef = useRef(statuses);
  const finishedRef = useRef(false);
  const lockedTimeRef = useRef<number | null>(null);
  const onResultChangeRef = useRef(onResultChange);
  const wordsKey = words.join("\u0001");

  onResultChangeRef.current = onResultChange;

  useEffect(() => {
    statusesRef.current = statuses;
  }, [statuses]);

  useEffect(() => {
    setStatuses(words.map(() => null));
    setRemainingSeconds(durationSeconds);
    setIsRunning(false);
    setIsFinished(false);
    setResult(null);
    finishedRef.current = false;
    lockedTimeRef.current = null;
    onResultChangeRef.current(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // wordsKey cobre mudanca da lista; words e usado so para resetar tamanho
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordsKey, durationSeconds]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const counts = useMemo(
    () => ({
      nao_leu: countByStatus(statuses, "nao_leu"),
      acertou: countByStatus(statuses, "acertou"),
      inventou: countByStatus(statuses, "inventou"),
      soletrou: countByStatus(statuses, "soletrou"),
      errou: countByStatus(statuses, "errou"),
    }),
    [statuses]
  );

  const classifiedCount = useMemo(
    () => statuses.filter((status) => status != null).length,
    [statuses]
  );

  function elapsedSeconds() {
    if (!startedAtRef.current) return 1;
    return Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000));
  }

  function persistResult(nextStatuses: Array<WordStatus | null>, timeSeconds: number) {
    const next = buildResult(nextStatuses, timeSeconds);
    setResult(next);
    onResultChangeRef.current(next);
  }

  function finishSession(nextStatuses: Array<WordStatus | null>) {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const timeSeconds =
      lockedTimeRef.current ?? Math.min(durationSeconds, elapsedSeconds());
    lockedTimeRef.current = timeSeconds;
    finishedRef.current = true;
    setIsRunning(false);
    setIsFinished(true);
    setRemainingSeconds(Math.max(0, durationSeconds - timeSeconds));
    persistResult(nextStatuses, timeSeconds);
  }

  function startTimer() {
    if (isRunning || isFinished || words.length === 0) return;

    startedAtRef.current = Date.now();
    lockedTimeRef.current = null;
    finishedRef.current = false;
    setRemainingSeconds(durationSeconds);
    setIsRunning(true);
    setIsFinished(false);
    setResult(null);
    onResultChangeRef.current(null);

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const remaining = Math.max(0, durationSeconds - elapsed);
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        finishSession(statusesRef.current);
      }
    }, 250);
  }

  function toggleWordStatus(index: number, status: WordStatus) {
    if (!isRunning && !isFinished) return;

    setStatuses((prev) => {
      const next = [...prev];
      next[index] = prev[index] === status ? null : status;

      const classified = next.filter((item) => item != null).length;
      const shouldFinish = classified === words.length && words.length > 0;

      queueMicrotask(() => {
        if (shouldFinish || finishedRef.current) {
          finishSession(next);
        }
      });

      return next;
    });
  }

  if (words.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">
          Nenhuma lista disponivel. Cadastre em Configurar Avaliacao.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "font-mono text-3xl font-bold tabular-nums",
              isRunning && remainingSeconds <= 10
                ? "text-red-600"
                : "text-bluebrand-deep"
            )}
          >
            {formatTime(remainingSeconds)}
          </span>
          {!isRunning && !isFinished ? (
            <Button onClick={startTimer}>
              <Mic className="h-4 w-4" />
              Iniciar gravacao + cronometro
            </Button>
          ) : null}
          {isRunning ? (
            <span className="flex items-center gap-2 text-sm text-red-600">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-600" />
              Em andamento
            </span>
          ) : null}
          {isFinished ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
              Etapa pronta para concluir
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {WORD_STATUS_OPTIONS.map((option) => (
          <div key={option.id} className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">{option.shortLabel}</p>
            <p className="text-2xl font-bold text-bluebrand-deep">{counts[option.id]}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Classificadas: {classifiedCount}/{words.length}
        {result
          ? ` · wordsRead ${result.wordsRead} · errorsCount ${result.errorsCount} · tempo ${result.readingTimeSeconds}s`
          : !isRunning && !isFinished
            ? " · Inicie o cronometro para marcar as palavras"
            : null}
      </p>

      <div className="max-h-[50vh] overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 z-10 w-[28%] bg-white">Palavra</TableHead>
              {WORD_STATUS_OPTIONS.map((option) => (
                <TableHead
                  key={option.id}
                  className="sticky top-0 z-10 bg-white px-2 text-center text-[11px] sm:text-xs"
                >
                  {option.shortLabel}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {words.map((word, index) => {
              const current = statuses[index];
              return (
                <TableRow key={`${word}-${index}`}>
                  <TableCell className="font-medium">{word}</TableCell>
                  {WORD_STATUS_OPTIONS.map((option) => {
                    const selected = current === option.id;
                    return (
                      <TableCell key={option.id} className="p-1 text-center">
                        <button
                          type="button"
                          disabled={!isRunning && !isFinished}
                          onClick={() => toggleWordStatus(index, option.id)}
                          className={cn(
                            "h-8 w-full rounded border text-xs transition",
                            selected
                              ? option.id === "acertou"
                                ? "border-emerald-600 bg-emerald-100 text-emerald-900"
                                : "border-red-500 bg-red-100 text-red-900"
                              : "border-transparent hover:bg-muted",
                            !isRunning && !isFinished && "cursor-not-allowed opacity-50"
                          )}
                          aria-label={`${option.label}: ${word}`}
                          aria-pressed={selected}
                        >
                          {selected ? "●" : "○"}
                        </button>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Button onClick={onContinue} disabled={!result || continuePending}>
        {continuePending ? "Salvando..." : "Concluir etapa"}
      </Button>
    </div>
  );
}
