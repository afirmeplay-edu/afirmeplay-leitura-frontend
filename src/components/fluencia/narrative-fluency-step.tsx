"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { toast } from "sonner";
import type {
  FluencyNotReadReason,
  FluencyTextLinePayload,
  FluencyTextPartPayload,
  FluencyWordStatus,
} from "@/lib/api/afirme-reading";
import {
  pickRecorderMimeType,
  tokenizeNarrative,
} from "@/components/fluencia/fluency-browser-utils";
import {
  assignSentenceIndices,
  countTextErrors,
  cycleTextWordMark,
  lastMarkedPosition,
  markUnmarkedInSentenceAsCorrect,
  sentenceStatusByIndex,
  type TextWordMark,
} from "@/components/fluencia/manual-marking";
import {
  NOT_READ_REASON_OPTIONS,
  type NotReadReasonValue,
} from "@/components/fluencia/not-read-reasons";
import { ReadingCursorStage } from "@/components/fluencia/reading-cursor-stage";
import { StudentAudioPlayer } from "@/components/fluencia/student-audio-player";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export interface FluencyNarrativePartResult extends FluencyTextPartPayload {
  audioBlob: Blob | null;
}

interface NarrativeFluencyStepProps {
  title: string;
  content: string;
  continuePending?: boolean;
  continueLabel?: string;
  remoteAudioSrc?: string | null;
  readOnly?: boolean;
  onResultChange: (result: FluencyNarrativePartResult | null) => void;
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

function markToStatus(mark: TextWordMark): FluencyWordStatus | null {
  if (mark === "unmarked") return null;
  return mark;
}

export function NarrativeFluencyStep({
  title,
  content,
  continuePending = false,
  continueLabel = "Salvar esta parte",
  remoteAudioSrc = null,
  readOnly = false,
  onResultChange,
  onContinue,
  onRunningChange,
}: NarrativeFluencyStepProps) {
  const { lines, tokens } = useMemo(() => tokenizeNarrative(content), [content]);
  const totalWords = tokens.length;
  const sentenceIndex = useMemo(
    () => assignSentenceIndices(tokens.map((token) => token.display)),
    [tokens]
  );

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [marks, setMarks] = useState<TextWordMark[]>(() => tokens.map(() => "unmarked"));
  const [obeyedSensePauses, setObeyedSensePauses] = useState<"sim" | "nao" | "">("");
  const [motivo, setMotivo] = useState<NotReadReasonValue>("nao_se_aplica");
  const [skipped, setSkipped] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const onResultChangeRef = useRef(onResultChange);
  const onRunningChangeRef = useRef(onRunningChange);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const finishedRef = useRef(false);
  const tokensRef = useRef(tokens);
  const linesRef = useRef(lines);
  const audioBlobRef = useRef<Blob | null>(null);
  const marksRef = useRef(marks);
  const elapsedRef = useRef(0);
  const skippedRef = useRef(false);
  const motivoRef = useRef(motivo);
  const pausesRef = useRef(obeyedSensePauses);

  onResultChangeRef.current = onResultChange;
  onRunningChangeRef.current = onRunningChange;
  tokensRef.current = tokens;
  linesRef.current = lines;
  marksRef.current = marks;
  elapsedRef.current = elapsedSeconds;
  skippedRef.current = skipped;
  motivoRef.current = motivo;
  pausesRef.current = obeyedSensePauses;

  function stopRecorder(): Promise<Blob | null> {
    return new Promise((resolve) => {
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
        const next = blob.size > 0 ? blob : null;
        audioBlobRef.current = next;
        setAudioBlob(next);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        resolve(next);
      };
      try {
        recorder.stop();
      } catch {
        resolve(audioBlobRef.current);
      }
    });
  }

  function buildWrongByLine(nextMarks: TextWordMark[]) {
    const counts = linesRef.current.map(() => 0);
    tokensRef.current.forEach((token, index) => {
      const mark = nextMarks[index];
      if (mark === "errou" || mark === "soletrou") {
        counts[token.lineIndex] = (counts[token.lineIndex] ?? 0) + 1;
      }
    });
    return counts;
  }

  function buildResultFromState(
    nextMarks: TextWordMark[],
    options?: {
      skipped?: boolean;
      reason?: FluencyNotReadReason | null;
      blob?: Blob | null;
      elapsed?: number;
      pauses?: "sim" | "nao" | "";
    }
  ): FluencyNarrativePartResult {
    const isSkipped = Boolean(options?.skipped);
    const lastPos = lastMarkedPosition(nextMarks);
    const errorsCount = countTextErrors(nextMarks);
    const wrong = buildWrongByLine(nextMarks);
    const linePayload: FluencyTextLinePayload[] = linesRef.current.map((text, lineIndex) => ({
      lineIndex,
      text,
      wrongWordsCount: wrong[lineIndex] ?? 0,
    }));
    const pauses = options?.pauses ?? pausesRef.current;

    return {
      wordsRead: isSkipped ? 0 : lastPos,
      totalWords: tokensRef.current.length,
      errorsCount: isSkipped ? 0 : errorsCount,
      unreadAfterEnd: isSkipped
        ? tokensRef.current.length
        : Math.max(0, tokensRef.current.length - lastPos),
      readingTimeSeconds: isSkipped ? 0 : Math.max(1, options?.elapsed ?? elapsedRef.current),
      skipped: isSkipped,
      notReadReason:
        options?.reason ??
        (motivoRef.current === "nao_se_aplica" ? null : (motivoRef.current as FluencyNotReadReason)),
      obeyedSensePauses:
        isSkipped ? null : pauses === "sim" ? true : pauses === "nao" ? false : null,
      transcript: null,
      lines: linePayload,
      audioBlob: options?.blob ?? audioBlobRef.current,
    };
  }

  function emitResult(
    nextMarks: TextWordMark[],
    options?: {
      skipped?: boolean;
      reason?: FluencyNotReadReason | null;
      blob?: Blob | null;
      elapsed?: number;
      pauses?: "sim" | "nao" | "";
    }
  ) {
    const payload = buildResultFromState(nextMarks, options);
    if (payload.obeyedSensePauses == null && !payload.skipped) {
      onResultChangeRef.current(null);
      return;
    }
    onResultChangeRef.current(payload);
  }

  useEffect(() => {
    setElapsedSeconds(0);
    setIsRunning(false);
    setIsFinished(false);
    finishedRef.current = false;
    setMarks(tokens.map(() => "unmarked"));
    setObeyedSensePauses("");
    setMotivo("nao_se_aplica");
    setSkipped(false);
    skippedRef.current = false;
    setAudioBlob(null);
    audioBlobRef.current = null;
    onResultChangeRef.current(null);
    onRunningChangeRef.current?.(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    void stopRecorder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, tokens, lines]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      onRunningChangeRef.current?.(false);
      void stopRecorder();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startReading() {
    if (isRunning || !content || tokens.length === 0) return;
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
      toast.error("Não foi possível acessar o microfone.");
      return;
    }

    startedAtRef.current = Date.now();
    finishedRef.current = false;
    setElapsedSeconds(0);
    setIsRunning(true);
    onRunningChangeRef.current?.(true);
    setIsFinished(false);
    setSkipped(false);
    skippedRef.current = false;
    setMarks(tokens.map(() => "unmarked"));
    marksRef.current = tokens.map(() => "unmarked");
    setAudioBlob(null);
    onResultChangeRef.current(null);

    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 250);
  }

  async function finishReading() {
    if (finishedRef.current && !isRunning) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const elapsed = Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000));
    setElapsedSeconds(elapsed);
    elapsedRef.current = elapsed;
    finishedRef.current = true;
    setIsRunning(false);
    onRunningChangeRef.current?.(false);
    setIsFinished(true);
    const blob = await stopRecorder();
    emitResult(marksRef.current, { blob, elapsed });
  }

  function handleWordClick(index: number) {
    if (readOnly || skipped) return;
    if (!isRunning && !isFinished) return;
    setMarks((prev) => {
      const next = [...prev];
      next[index] = cycleTextWordMark(prev[index] ?? "unmarked");
      marksRef.current = next;
      if (finishedRef.current) emitResult(next);
      return next;
    });
  }

  function handleSentenceClick(targetSentence: number) {
    if (readOnly || skipped) return;
    if (!isRunning && !isFinished) return;
    setMarks((prev) => {
      const next = markUnmarkedInSentenceAsCorrect(prev, sentenceIndex, targetSentence);
      marksRef.current = next;
      if (finishedRef.current) emitResult(next);
      return next;
    });
  }

  function handleSkip() {
    const reason =
      motivo === "nao_se_aplica" ? ("recusou" as FluencyNotReadReason) : (motivo as FluencyNotReadReason);
    if (motivo === "nao_se_aplica") setMotivo("recusou");
    setSkipped(true);
    skippedRef.current = true;
    finishedRef.current = true;
    setIsRunning(false);
    onRunningChangeRef.current?.(false);
    setIsFinished(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    void stopRecorder();
    const empty = tokens.map(() => "unmarked" as const);
    setMarks(empty);
    marksRef.current = empty;
    emitResult(empty, { skipped: true, reason, blob: null, elapsed: 0 });
  }

  useEffect(() => {
    if (!isFinished || skipped) return;
    emitResult(marks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished, skipped, obeyedSensePauses, motivo, audioBlob, marks]);

  const wrongByLine = useMemo(() => buildWrongByLine(marks), [marks]);
  const lastPos = lastMarkedPosition(marks);
  const errorsCount = countTextErrors(marks);
  const unreadAfterEnd = Math.max(0, totalWords - lastPos);
  const sentenceStatuses = useMemo(
    () => sentenceStatusByIndex(marks, sentenceIndex),
    [marks, sentenceIndex]
  );

  const cursorItems = useMemo(
    () =>
      tokens.map((token, index) => ({
        id: `t-${index}`,
        label: token.display,
        status: markToStatus(marks[index] ?? "unmarked"),
        sentenceIndex: sentenceIndex[index],
      })),
    [tokens, marks, sentenceIndex]
  );

  const canMark = !readOnly && !skipped && (isRunning || isFinished);

  const canContinue =
    isFinished &&
    (skipped || obeyedSensePauses === "sim" || obeyedSensePauses === "nao") &&
    !continuePending;

  if (!content || tokens.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">Texto não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
          QUESTÃO 3 — LEITURA DE TEXTO
        </p>
        <h2 className="text-xl font-semibold text-bluebrand-deep">{title}</h2>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold text-amber-800">[APLICADOR] COMANDO PADRONIZADO</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Peça ao estudante para ler o texto em voz alta, com atenção.</li>
          <li>Informe que depois haverá perguntas de compreensão.</li>
          <li>Enquanto o estudante lê, clique nas palavras ou na frase para marcar.</li>
        </ul>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">Tempo de leitura</p>
        <span className="font-mono text-3xl font-bold tabular-nums text-violet-700">
          {formatTime(elapsedSeconds)}
        </span>
      </div>

      <StudentAudioPlayer blob={audioBlob} src={remoteAudioSrc} />

      <div className="flex flex-wrap items-center gap-3">
        {!readOnly && !isRunning && !isFinished ? (
          <Button
            onClick={() => void startReading()}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Mic className="h-4 w-4" />
            Iniciar gravação + leitura
          </Button>
        ) : null}
        {isRunning ? (
          <>
            <span className="flex items-center gap-2 text-sm text-red-600">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-600" />
              Leitura em andamento
            </span>
            <Button
              onClick={() => void finishReading()}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              <Square className="h-4 w-4" />
              Finalizar leitura
            </Button>
          </>
        ) : null}
        {isFinished && !skipped && !readOnly ? (
          <Button variant="outline" onClick={() => void startReading()}>
            Regravar
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-800">1 clique: correta</span>
        <span className="rounded bg-red-50 px-2 py-1 text-red-800">2 cliques: errada</span>
        <span className="rounded bg-violet-50 px-2 py-1 text-violet-800">3 cliques: soletrada</span>
        <span className="rounded bg-amber-50 px-2 py-1 text-amber-900">frase com 1–2 erros</span>
        <span className="rounded bg-red-100 px-2 py-1 text-red-900">frase com 3+ erros</span>
      </div>

      <ReadingCursorStage
        mode="narrative"
        items={cursorItems}
        cursor={Math.max(0, lastPos - 1)}
        listening={isRunning && !isFinished}
        instruction="LEIA EM VOZ ALTA O TEXTO"
        sentenceStatuses={sentenceStatuses}
        onMarkWord={canMark ? handleWordClick : undefined}
        onMarkSentence={canMark ? handleSentenceClick : undefined}
      />

      <div className="overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Nº da linha</TableHead>
              <TableHead>Texto</TableHead>
              <TableHead className="w-40 text-center">Palavras lidas erradas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, index) => (
              <TableRow key={`${index}-${line.slice(0, 12)}`}>
                <TableCell className="text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </TableCell>
                <TableCell className="font-medium uppercase tracking-wide">{line}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "block text-center font-mono text-lg",
                      (wrongByLine[index] ?? 0) > 0 && "text-red-600"
                    )}
                  >
                    {wrongByLine[index] ?? 0}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="font-semibold uppercase tracking-wide text-bluebrand-deep">
          Registro de leitura de texto
        </h3>
        <p className="text-xs text-muted-foreground">
          Preenchido automaticamente a partir das marcações no texto.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="q3-words-read">Posição da última palavra lida</Label>
            <Input
              id="q3-words-read"
              readOnly
              value={skipped ? 0 : lastPos}
            />
            <p className="text-xs text-muted-foreground">Total de palavras do texto: {totalWords}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="q3-errors">Total de palavras lidas de modo errado</Label>
            <Input id="q3-errors" readOnly value={skipped ? 0 : errorsCount} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="q3-unread">Palavras não lidas (após o encerramento)</Label>
          <Input id="q3-unread" readOnly value={skipped ? totalWords : unreadAfterEnd} />
        </div>

        <div className="space-y-2">
          <Label>O estudante obedeceu às pausas de sentido?</Label>
          <div className="flex gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="sense-pauses"
                checked={obeyedSensePauses === "sim"}
                disabled={!isFinished || skipped}
                onChange={() => setObeyedSensePauses("sim")}
              />
              Sim
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="sense-pauses"
                checked={obeyedSensePauses === "nao"}
                disabled={!isFinished || skipped}
                onChange={() => setObeyedSensePauses("nao")}
              />
              Não
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Motivo (caso o estudante não tenha lido)</Label>
          <Select value={motivo} onValueChange={(value) => setMotivo(value as NotReadReasonValue)}>
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
        <Button
          type="button"
          variant="outline"
          onClick={handleSkip}
          disabled={continuePending || isRunning}
        >
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
