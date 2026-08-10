"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FluencyNarrativePartResult {
  wordsRead: number;
  errorsCount: number;
  readingTimeSeconds: number;
}

interface NarrativeFluencyStepProps {
  title: string;
  content: string;
  continuePending?: boolean;
  onResultChange: (result: FluencyNarrativePartResult | null) => void;
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

function tokenizeWords(content: string) {
  return content.split(/\s+/).filter(Boolean);
}

export function NarrativeFluencyStep({
  title,
  content,
  continuePending = false,
  onResultChange,
  onContinue,
}: NarrativeFluencyStepProps) {
  const totalWords = useMemo(() => tokenizeWords(content).length, [content]);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [wordsRead, setWordsRead] = useState(String(totalWords));
  const [errorsCount, setErrorsCount] = useState("0");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const onResultChangeRef = useRef(onResultChange);
  onResultChangeRef.current = onResultChange;

  useEffect(() => {
    setElapsedSeconds(0);
    setIsRunning(false);
    setIsFinished(false);
    setWordsRead(String(totalWords));
    setErrorsCount("0");
    onResultChangeRef.current(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [content, totalWords]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const parsedWordsRead = Number.parseInt(wordsRead, 10);
  const parsedErrors = Number.parseInt(errorsCount, 10);
  const wordsReadValid =
    Number.isFinite(parsedWordsRead) && parsedWordsRead >= 0 && parsedWordsRead <= totalWords;
  const errorsValid =
    Number.isFinite(parsedErrors) &&
    parsedErrors >= 0 &&
    (!wordsReadValid || parsedErrors <= parsedWordsRead);
  const canContinue = isFinished && wordsReadValid && errorsValid;

  function stopTimer(finalize: boolean) {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const elapsed = Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000));
    setElapsedSeconds(elapsed);
    setIsRunning(false);
    if (finalize) {
      setIsFinished(true);
    }
  }

  function startReading() {
    if (isRunning || !content) return;
    startedAtRef.current = Date.now();
    setElapsedSeconds(0);
    setIsRunning(true);
    setIsFinished(false);
    onResultChangeRef.current(null);

    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 250);
  }

  function finishReading() {
    if (!isRunning && !isFinished) return;
    stopTimer(true);
  }

  useEffect(() => {
    if (!isFinished) {
      onResultChangeRef.current(null);
      return;
    }
    if (!wordsReadValid || !errorsValid) {
      onResultChangeRef.current(null);
      return;
    }
    onResultChangeRef.current({
      wordsRead: parsedWordsRead,
      errorsCount: parsedErrors,
      readingTimeSeconds: Math.max(1, elapsedSeconds),
    });
  }, [
    isFinished,
    wordsReadValid,
    errorsValid,
    parsedWordsRead,
    parsedErrors,
    elapsedSeconds,
  ]);

  if (!content) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">Texto nao encontrado.</p>
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
              "font-mono text-3xl font-bold tabular-nums text-bluebrand-deep",
              isRunning && "text-bluebrand-deep"
            )}
          >
            {formatTime(elapsedSeconds)}
          </span>
          {!isRunning && !isFinished ? (
            <Button onClick={startReading}>
              <Mic className="h-4 w-4" />
              Iniciar leitura + cronometro
            </Button>
          ) : null}
          {isRunning ? (
            <>
              <span className="flex items-center gap-2 text-sm text-red-600">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-600" />
                Leitura em andamento
              </span>
              <Button onClick={finishReading} className="bg-red-600 text-white hover:bg-red-700">
                <Square className="h-4 w-4" />
                Finalizar leitura
              </Button>
            </>
          ) : null}
          {isFinished ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
              Informe palavras lidas e erros
            </span>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border bg-slate-50 p-4 text-base leading-relaxed whitespace-pre-wrap text-slate-800">
        {content}
      </div>
      <p className="text-xs text-muted-foreground">
        Texto com {totalWords} palavras. Contagem oficial e preenchida pelo aplicador (sem STT nesta
        fase).
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="q3-words-read">Palavras lidas (wordsRead)</Label>
          <Input
            id="q3-words-read"
            type="number"
            min={0}
            max={totalWords}
            value={wordsRead}
            disabled={!isFinished}
            onChange={(event) => setWordsRead(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="q3-errors">Erros (errorsCount)</Label>
          <Input
            id="q3-errors"
            type="number"
            min={0}
            value={errorsCount}
            disabled={!isFinished}
            onChange={(event) => setErrorsCount(event.target.value)}
          />
        </div>
      </div>

      {isFinished && (!wordsReadValid || !errorsValid) ? (
        <p className="text-sm text-red-600">
          Informe valores validos: wordsRead entre 0 e {totalWords}; errorsCount ≤ wordsRead.
        </p>
      ) : null}

      <Button onClick={onContinue} disabled={!canContinue || continuePending}>
        {continuePending ? "Salvando..." : "Concluir leitura"}
      </Button>
    </div>
  );
}
