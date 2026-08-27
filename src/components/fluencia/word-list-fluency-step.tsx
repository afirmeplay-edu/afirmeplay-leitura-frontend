"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { toast } from "sonner";
import type {
  FluencyListPartPayload,
  FluencyMarkingSource,
  FluencyNotReadReason,
  FluencyWordStatus,
} from "@/lib/api/afirme-reading";
import { pickRecorderMimeType } from "@/components/fluencia/fluency-browser-utils";
import {
  NOT_READ_REASON_OPTIONS,
  type NotReadReasonValue,
} from "@/components/fluencia/not-read-reasons";
import { ReadingCursorStage } from "@/components/fluencia/reading-cursor-stage";
import { StudentAudioPlayer } from "@/components/fluencia/student-audio-player";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type WordStatus = FluencyWordStatus;

export const WORD_STATUS_OPTIONS: ReadonlyArray<{
  id: WordStatus;
  label: string;
  shortLabel: string;
}> = [
  { id: "nao_leu", label: "Não leu", shortLabel: "Não leu" },
  { id: "acertou", label: "Acertou", shortLabel: "Acertou" },
  { id: "inventou", label: "Inventou/Nomeou letras", shortLabel: "Inventou" },
  { id: "soletrou", label: "Soletrou/Silabou", shortLabel: "Soletrou" },
  { id: "errou", label: "Errou", shortLabel: "Errou" },
];

/** Statuses que entram em errorsCount (não-acerto). */
export const ERROR_STATUSES: readonly WordStatus[] = [
  "nao_leu",
  "errou",
  "inventou",
  "soletrou",
];

const WORD_CURSOR_INTERVAL_MS = 3500;

export interface FluencyListPartResult extends FluencyListPartPayload {
  audioBlob: Blob | null;
}

interface WordListFluencyStepProps {
  title: string;
  questionLabel?: string;
  words: string[];
  durationSeconds?: number;
  continuePending?: boolean;
  continueLabel?: string;
  remoteAudioSrc?: string | null;
  readOnly?: boolean;
  onResultChange: (result: FluencyListPartResult | null) => void;
  onContinue: () => void;
  onRunningChange?: (running: boolean) => void;
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

function buildPayload(
  words: string[],
  statuses: Array<WordStatus | null>,
  sources: Array<FluencyMarkingSource | null>,
  readingTimeSeconds: number,
  skipped: boolean,
  notReadReason: FluencyNotReadReason | null,
  audioBlob: Blob | null
): FluencyListPartResult {
  let lastWordPosition = 0;
  for (let i = 0; i < statuses.length; i += 1) {
    if (statuses[i] != null) lastWordPosition = i + 1;
  }

  const markings = words.map((word, index) => ({
    index,
    word,
    status: statuses[index],
    source: sources[index] ?? undefined,
  }));

  const errorsCount = statuses.filter(
    (status) => status != null && ERROR_STATUSES.includes(status)
  ).length;

  return {
    wordsRead: lastWordPosition,
    lastWordPosition,
    errorsCount,
    readingTimeSeconds: Math.max(skipped ? 0 : 1, readingTimeSeconds),
    skipped,
    notReadReason,
    transcript: null,
    markings,
    audioBlob,
  };
}

export function WordListFluencyStep({
  title,
  questionLabel = "QUESTÃO",
  words,
  durationSeconds = 60,
  continuePending = false,
  continueLabel = "Salvar esta parte",
  remoteAudioSrc = null,
  readOnly = false,
  onResultChange,
  onContinue,
  onRunningChange,
}: WordListFluencyStepProps) {
  const [statuses, setStatuses] = useState<Array<WordStatus | null>>(() => words.map(() => null));
  const [sources, setSources] = useState<Array<FluencyMarkingSource | null>>(() =>
    words.map(() => null)
  );
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [result, setResult] = useState<FluencyListPartResult | null>(null);
  const [motivo, setMotivo] = useState<NotReadReasonValue>("nao_se_aplica");
  const [cursor, setCursor] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cursorTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const statusesRef = useRef(statuses);
  const sourcesRef = useRef(sources);
  const finishedRef = useRef(false);
  const lockedTimeRef = useRef<number | null>(null);
  const onResultChangeRef = useRef(onResultChange);
  const onRunningChangeRef = useRef(onRunningChange);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);
  const wordsRef = useRef(words);
  const motivoRef = useRef(motivo);

  const wordsKey = words.join("\u0001");

  onResultChangeRef.current = onResultChange;
  onRunningChangeRef.current = onRunningChange;
  wordsRef.current = words;
  motivoRef.current = motivo;

  useEffect(() => {
    statusesRef.current = statuses;
  }, [statuses]);
  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  function stopRecorder() {
    return new Promise<Blob | null>((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        resolve(audioBlobRef.current);
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        audioBlobRef.current = blob.size > 0 ? blob : null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        resolve(audioBlobRef.current);
      };
      try {
        recorder.stop();
      } catch {
        resolve(audioBlobRef.current);
      }
    });
  }

  function resetLocalState() {
    setStatuses(words.map(() => null));
    setSources(words.map(() => null));
    setRemainingSeconds(durationSeconds);
    setIsRunning(false);
    setIsFinished(false);
    setResult(null);
    setMotivo("nao_se_aplica");
    setCursor(0);
    finishedRef.current = false;
    lockedTimeRef.current = null;
    audioBlobRef.current = null;
    chunksRef.current = [];
    onResultChangeRef.current(null);
    onRunningChangeRef.current?.(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (cursorTimerRef.current) {
      clearInterval(cursorTimerRef.current);
      cursorTimerRef.current = null;
    }
    void stopRecorder();
  }

  function startCursorAdvance() {
    if (cursorTimerRef.current) {
      clearInterval(cursorTimerRef.current);
      cursorTimerRef.current = null;
    }
    cursorTimerRef.current = setInterval(() => {
      setCursor((prev) => {
        if (prev + 1 >= wordsRef.current.length) return prev;
        return prev + 1;
      });
    }, WORD_CURSOR_INTERVAL_MS);
  }

  function goToNextWord() {
    setCursor((prev) => {
      if (prev + 1 >= wordsRef.current.length) return prev;
      return prev + 1;
    });
    startCursorAdvance();
  }

  useEffect(() => {
    resetLocalState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordsKey, durationSeconds]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (cursorTimerRef.current) clearInterval(cursorTimerRef.current);
      onRunningChangeRef.current?.(false);
      void stopRecorder();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isFinished || !result) return;
    publishResult(statusesRef.current, sourcesRef.current, {
      skipped: result.skipped,
      reason: motivo === "nao_se_aplica" ? null : (motivo as FluencyNotReadReason),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motivo]);

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

  function elapsedSeconds() {
    if (!startedAtRef.current) return 1;
    return Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000));
  }

  function publishResult(
    nextStatuses: Array<WordStatus | null>,
    nextSources: Array<FluencyMarkingSource | null>,
    options?: { skipped?: boolean; reason?: FluencyNotReadReason | null; blob?: Blob | null }
  ) {
    const skipped = Boolean(options?.skipped);
    const timeSeconds =
      skipped && !startedAtRef.current
        ? 0
        : (lockedTimeRef.current ?? Math.min(durationSeconds, elapsedSeconds()));
    const reason =
      options?.reason ??
      (motivoRef.current === "nao_se_aplica" ? null : (motivoRef.current as FluencyNotReadReason));

    const next = buildPayload(
      wordsRef.current,
      nextStatuses,
      nextSources,
      timeSeconds,
      skipped,
      reason,
      options?.blob ?? audioBlobRef.current
    );
    setResult(next);
    onResultChangeRef.current(next);
  }

  async function finalize(
    nextStatuses: Array<WordStatus | null>,
    nextSources: Array<FluencyMarkingSource | null>,
    options?: { skipped?: boolean; reason?: FluencyNotReadReason | null }
  ) {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (cursorTimerRef.current) {
      clearInterval(cursorTimerRef.current);
      cursorTimerRef.current = null;
    }

    const timeSeconds =
      options?.skipped && !startedAtRef.current
        ? 0
        : (lockedTimeRef.current ?? Math.min(durationSeconds, elapsedSeconds()));
    lockedTimeRef.current = timeSeconds;
    finishedRef.current = true;
    setIsRunning(false);
    onRunningChangeRef.current?.(false);
    setIsFinished(true);
    setRemainingSeconds(Math.max(0, durationSeconds - timeSeconds));

    const blob = await stopRecorder();
    publishResult(nextStatuses, nextSources, { ...options, blob });
  }

  async function startTimer() {
    if (isRunning || words.length === 0) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      audioBlobRef.current = null;

      const mimeType = pickRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(1000);
    } catch {
      toast.error("Não foi possível acessar o microfone. Verifique a permissão.");
      return;
    }

    setStatuses(words.map(() => null));
    setSources(words.map(() => null));
    statusesRef.current = words.map(() => null);
    sourcesRef.current = words.map(() => null);
    startedAtRef.current = Date.now();
    lockedTimeRef.current = null;
    finishedRef.current = false;
    setRemainingSeconds(durationSeconds);
    setIsRunning(true);
    onRunningChangeRef.current?.(true);
    setIsFinished(false);
    setResult(null);
    onResultChangeRef.current(null);
    setCursor(0);
    startCursorAdvance();

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const remaining = Math.max(0, durationSeconds - elapsed);
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        void finalize(statusesRef.current, sourcesRef.current);
      }
    }, 250);
  }

  function toggleWordStatus(index: number, status: WordStatus) {
    if (!result || result.skipped) return;

    setStatuses((prev) => {
      const nextStatuses = [...prev];
      const clearing = prev[index] === status;
      nextStatuses[index] = clearing ? null : status;
      const nextSources = [...sourcesRef.current];
      nextSources[index] = clearing ? null : "manual";
      setSources(nextSources);
      sourcesRef.current = nextSources;
      statusesRef.current = nextStatuses;

      queueMicrotask(() => {
        publishResult(nextStatuses, nextSources);
      });

      return nextStatuses;
    });
  }

  function handleSkip() {
    const reason =
      motivo === "nao_se_aplica" ? ("recusou" as FluencyNotReadReason) : (motivo as FluencyNotReadReason);
    if (motivo === "nao_se_aplica") {
      setMotivo("recusou");
    }
    void finalize(
      words.map(() => null),
      words.map(() => null),
      { skipped: true, reason }
    );
  }

  const cursorItems = useMemo(
    () =>
      words.map((word, index) => ({
        id: `${index}-${word}`,
        label: word,
        sequenceLabel: `${String(index + 1).padStart(2, "0")}.`,
        status: statuses[index] ?? null,
      })),
    [words, statuses]
  );

  if (words.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">
          Nenhuma lista disponível. Cadastre em Cadastros.
        </p>
      </div>
    );
  }

  const canContinue = Boolean(result) && !continuePending;
  const lastWordInput = result?.lastWordPosition ?? statuses.filter((s) => s != null).length;
  const skipped = Boolean(result?.skipped);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-bluebrand-base">
          {questionLabel}
        </p>
        <h2 className="text-xl font-semibold text-bluebrand-deep">{title}</h2>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold text-amber-800">[APLICADOR] COMANDO PADRONIZADO</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Peça ao estudante para ler as palavras em voz alta, com calma.</li>
          <li>Informe que há 60 segundos para a lista.</li>
          <li>Depois da gravação, ouça o áudio e marque cada palavra na tabela.</li>
        </ul>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">Tempo restante</p>
        <span
          className={cn(
            "font-mono text-3xl font-bold tabular-nums",
            isRunning && remainingSeconds <= 10 ? "text-red-600" : "text-bluebrand-deep"
          )}
        >
          {formatTime(remainingSeconds)}
        </span>
      </div>

      <StudentAudioPlayer
        blob={result?.audioBlob ?? audioBlobRef.current}
        src={remoteAudioSrc}
      />

      <div className="flex flex-wrap items-center gap-3">
        {!readOnly && !isRunning && !isFinished ? (
          <Button onClick={() => void startTimer()} className="bg-emerald-600 hover:bg-emerald-700">
            <Mic className="h-4 w-4" />
            Iniciar gravação + cronômetro
          </Button>
        ) : null}
        {isRunning ? (
          <>
            <span className="flex items-center gap-2 text-sm text-red-600">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-600" />
              Gravando…
            </span>
            <Button
              onClick={() => void finalize(statusesRef.current, sourcesRef.current)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              <Square className="h-4 w-4" />
              Finalizar gravação
            </Button>
          </>
        ) : null}
        {isFinished ? (
          <>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
              Ouça o áudio e marque a tabela
            </span>
            {!readOnly && !skipped ? (
              <Button variant="outline" onClick={() => void startTimer()}>
                Regravar
              </Button>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {WORD_STATUS_OPTIONS.map((option) => (
          <div key={option.id} className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">{option.shortLabel}</p>
            <p className="text-2xl font-bold text-bluebrand-deep">{counts[option.id]}</p>
          </div>
        ))}
      </div>

      <ReadingCursorStage
        mode="list"
        items={cursorItems}
        cursor={isRunning ? cursor : Math.max(0, lastWordInput - 1)}
        listening={isRunning}
        showSequence={false}
        onNextWord={isRunning ? goToNextWord : undefined}
      />

      <div className="max-h-[50vh] overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 z-10 w-12 bg-white">Nº</TableHead>
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
              const isCurrent = isRunning && index === cursor;
              return (
                <TableRow
                  key={`${word}-${index}`}
                  className={cn(isCurrent && "bg-bluebrand-base/5")}
                >
                  <TableCell className="text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </TableCell>
                  <TableCell className="font-semibold tracking-wide">{word}</TableCell>
                  {WORD_STATUS_OPTIONS.map((option) => {
                    const selected = current === option.id;
                    return (
                      <TableCell key={option.id} className="p-1 text-center">
                        <button
                          type="button"
                          disabled={!result || skipped}
                          onClick={() => toggleWordStatus(index, option.id)}
                          className={cn(
                            "flex h-8 w-full items-center justify-center rounded border text-xs transition",
                            selected
                              ? option.id === "acertou"
                                ? "border-emerald-600 bg-emerald-100"
                                : option.id === "soletrou"
                                  ? "border-violet-500 bg-violet-100"
                                  : "border-red-500 bg-red-100"
                              : "border-transparent hover:bg-muted",
                            (!result || skipped) && "cursor-not-allowed opacity-50"
                          )}
                          aria-label={`${option.label}: ${word}`}
                          aria-pressed={selected}
                        >
                          <Checkbox
                            checked={selected}
                            disabled={!result || skipped}
                            tabIndex={-1}
                            className="pointer-events-none"
                            aria-hidden
                          />
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

      <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="last-word-pos">Posição da última palavra lida</Label>
          <input
            id="last-word-pos"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={lastWordInput}
            readOnly
          />
          <p className="text-xs text-muted-foreground">
            Calculado automaticamente pelo progresso da lista (máx. {words.length}).
          </p>
        </div>
        <div className="space-y-2">
          <Label>Motivo (caso o estudante não tenha lido)</Label>
          <Select
            value={motivo}
            onValueChange={(value) => setMotivo(value as NotReadReasonValue)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOT_READ_REASON_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {readOnly ? null : (
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" onClick={handleSkip} disabled={continuePending || isRunning}>
          Pular (estudante não leu)
        </Button>
        <Button onClick={onContinue} disabled={!canContinue}>
          {continuePending ? "Salvando..." : continueLabel}
        </Button>
      </div>
      )}
    </div>
  );
}
