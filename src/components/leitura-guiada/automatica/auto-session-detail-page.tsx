"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Bot, CheckCircle2, Loader2, Mic, RefreshCw, RotateCcw, Square, Upload } from "lucide-react";
import { toast } from "sonner";
import { getReadingText, getWordList } from "@/lib/api/afirme-reading";
import {
  fetchGuidedAutoAudioObjectUrl,
  getGuidedAutoSession,
  getGuidedAutoSessionWords,
  saveGuidedAutoComprehension,
  uploadGuidedAutoAudio,
} from "@/lib/api/afirme-reading/guided-auto-sessions";
import type {
  GuidedAutoMatchType,
  GuidedAutoPart,
  GuidedAutoSession,
  GuidedAutoWord,
  ReadingText,
  WordList,
} from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import { ROUTES } from "@/config/routes";
import {
  configuredParts,
  GUIDED_AUTO_PART_LABEL,
  GUIDED_AUTO_STATUS_BADGE,
  GUIDED_AUTO_STATUS_LABEL,
  isGuidedAutoProcessing,
  MATCH_CLASS,
  MATCH_LABEL,
  partHasAudio,
} from "@/lib/fluencia/guided-auto";
import { formatDecimal, formatPct } from "@/lib/relatorios-fluencia/format";
import { cn } from "@/lib/utils";
import { usePartRecorder } from "@/components/leitura-guiada/automatica/use-part-recorder";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const POLL_MS = 4000;

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white px-3 py-2.5 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

interface PartRecorderProps {
  sessionId: string;
  part: GuidedAutoPart;
  sent: boolean;
  processed: boolean;
  disabled: boolean;
  words?: string[];
  textContent?: string;
  onUploaded: (session: GuidedAutoSession) => void;
}

function PartRecorder({ sessionId, part, sent, processed, disabled, words, textContent, onUploaded }: PartRecorderProps) {
  const recorder = usePartRecorder();
  const startedAtRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!recorder.recording) return;
    const timer = window.setInterval(() => {
      if (startedAtRef.current != null) setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000));
    }, 500);
    return () => window.clearInterval(timer);
  }, [recorder.recording]);

  useEffect(() => {
    if (!sent) return;
    let cancelled = false;
    let url: string | null = null;
    fetchGuidedAutoAudioObjectUrl(sessionId, part)
      .then((objectUrl) => {
        url = objectUrl;
        if (cancelled) URL.revokeObjectURL(objectUrl);
        else setSavedUrl(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [sessionId, part, sent]);

  async function handleStart() {
    setElapsed(0);
    const ok = await recorder.start();
    if (ok) startedAtRef.current = Date.now();
  }

  function handleStop() {
    startedAtRef.current = null;
    recorder.stop();
  }

  async function handleUpload() {
    if (!recorder.blob) return;
    setUploading(true);
    try {
      const session = await uploadGuidedAutoAudio(sessionId, part, recorder.blob, recorder.durationSeconds ?? undefined);
      recorder.clear();
      toast.success(`${GUIDED_AUTO_PART_LABEL[part]}: áudio enviado para correção.`);
      onUploaded(session);
    } catch (error) {
      toast.error(normalizeApiError(error, "Não foi possível enviar o áudio.").message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{GUIDED_AUTO_PART_LABEL[part]}</CardTitle>
          {processed ? (
            <Badge variant="success">Corrigida</Badge>
          ) : sent ? (
            <Badge variant="info">Áudio enviado</Badge>
          ) : (
            <Badge variant="outline">Aguardando gravação</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {words && words.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {words.map((word, index) => (
              <span key={`${word}-${index}`} className="rounded-lg border bg-white px-2.5 py-1 text-base font-medium">
                {word}
              </span>
            ))}
          </div>
        ) : null}
        {textContent ? (
          <div className="custom-scrollbar max-h-72 overflow-y-auto whitespace-pre-line rounded-xl border bg-white p-4 text-base leading-relaxed">
            {textContent}
          </div>
        ) : null}

        {savedUrl && !recorder.blob ? <audio controls src={savedUrl} className="h-10 w-full" preload="none" /> : null}
        {recorder.url ? <audio controls src={recorder.url} className="h-10 w-full" /> : null}
        {recorder.error ? <p className="text-sm text-destructive">{recorder.error}</p> : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {recorder.recording ? (
            <Button variant="destructive" onClick={handleStop}>
              <Square className="h-4 w-4" />
              Parar ({formatClock(elapsed)})
            </Button>
          ) : (
            <Button
              variant={recorder.blob ? "outline" : "default"}
              onClick={() => void handleStart()}
              disabled={disabled || uploading}
            >
              {recorder.blob || sent ? <RotateCcw className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {recorder.blob || sent ? "Gravar de novo" : "Gravar"}
            </Button>
          )}
          {recorder.blob && !recorder.recording ? (
            <Button onClick={() => void handleUpload()} disabled={disabled || uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Enviar para correção
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function AutoSessionDetailPage({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<GuidedAutoSession | null>(null);
  const [text, setText] = useState<ReadingText | null>(null);
  const [lists, setLists] = useState<Partial<Record<GuidedAutoPart, WordList>>>({});
  const [words, setWords] = useState<GuidedAutoWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [savingAnswers, setSavingAnswers] = useState(false);
  const previousStatus = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const data = await getGuidedAutoSession(sessionId);
        if (cancelled) return;
        setSession(data);
        previousStatus.current = data.status;
        const [textData, known, uncommon] = await Promise.all([
          data.readingTextId ? getReadingText(data.readingTextId).catch(() => null) : null,
          data.wordsWordListId ? getWordList(data.wordsWordListId).catch(() => null) : null,
          data.uncommonWordListId ? getWordList(data.uncommonWordListId).catch(() => null) : null,
        ]);
        if (cancelled) return;
        setText(textData);
        setLists({ ...(known ? { words: known } : {}), ...(uncommon ? { uncommon } : {}) });
        const initial: Record<string, number> = {};
        for (const answer of data.answers ?? []) initial[answer.readingTextQuestionId] = answer.selectedOption;
        setAnswers(initial);
      } catch (error) {
        if (!cancelled) setLoadError(normalizeApiError(error, "Não foi possível carregar a leitura.").message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, reloadKey]);

  const status = session?.status;
  const processedKey = Object.keys(session?.partResults ?? {}).sort().join(",");

  useEffect(() => {
    if (!processedKey) {
      setWords([]);
      return;
    }
    let cancelled = false;
    getGuidedAutoSessionWords(sessionId)
      .then((data) => !cancelled && setWords(data))
      .catch(() => !cancelled && setWords([]));
    return () => {
      cancelled = true;
    };
  }, [sessionId, processedKey]);

  useEffect(() => {
    if (!status || !isGuidedAutoProcessing(status)) return;
    const timer = window.setTimeout(async () => {
      try {
        setSession(await getGuidedAutoSession(sessionId));
      } catch {
        setSession((current) => (current ? { ...current } : current));
      }
    }, POLL_MS);
    return () => window.clearTimeout(timer);
  }, [sessionId, status, session]);

  useEffect(() => {
    if (!status) return;
    const before = previousStatus.current;
    previousStatus.current = status;
    if (!before || !isGuidedAutoProcessing(before as GuidedAutoSession["status"])) return;
    if (status === "completed") toast.success("Correção concluída.");
    else if (status === "failed") toast.error("A correção automática falhou.");
    else if (status === "awaiting_audio") toast.success("Parte corrigida. Grave as partes que faltam.");
  }, [status]);

  const parts = useMemo(() => (session ? configuredParts(session) : []), [session]);
  const questions = text?.questions ?? [];
  const busy = status ? isGuidedAutoProcessing(status) : false;

  const wordsByPart = useMemo(() => {
    const grouped: Partial<Record<GuidedAutoPart, GuidedAutoWord[]>> = {};
    for (const word of [...words].sort((a, b) => a.position - b.position)) {
      (grouped[word.part] ??= []).push(word);
    }
    return grouped;
  }, [words]);

  const handleUploaded = useCallback((data: GuidedAutoSession) => setSession(data), []);

  async function handleSaveAnswers() {
    if (!session) return;
    const items = questions
      .filter((question) => answers[question.id] != null)
      .map((question) => ({ readingTextQuestionId: question.id, selectedOption: answers[question.id] }));
    if (items.length !== questions.length) {
      toast.error("Responda todas as perguntas de compreensão.");
      return;
    }
    setSavingAnswers(true);
    try {
      setSession(await saveGuidedAutoComprehension(session.id, items));
      toast.success("Respostas de compreensão salvas.");
    } catch (error) {
      toast.error(normalizeApiError(error, "Não foi possível salvar as respostas.").message);
    } finally {
      setSavingAnswers(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Praticar · Leitura automática"
        title={session?.studentName || "Leitura automática"}
        description={text ? `Texto: ${text.title}` : undefined}
        icon={Bot}
      >
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href={ROUTES.leitura.automatica.root}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </PageHeader>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : loadError || !session ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">{loadError ?? "Leitura não encontrada."}</p>
            <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={GUIDED_AUTO_STATUS_BADGE[session.status]}>{GUIDED_AUTO_STATUS_LABEL[session.status]}</Badge>
            {busy ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Transcrevendo e corrigindo… a página atualiza sozinha.
              </span>
            ) : null}
          </div>

          {session.status === "failed" ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>A correção automática falhou</AlertTitle>
              <AlertDescription>
                {session.errorMessage || "Erro sem detalhe."} Grave e envie a parte de novo. Se o erro citar a
                transcrição, o reconhecimento de voz do servidor pode estar indisponível.
              </AlertDescription>
            </Alert>
          ) : null}

          {session.status === "completed" ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Resultado
                </CardTitle>
                <CardDescription>Calculado pelo servidor a partir da transcrição.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Metric label="PLCM" value={formatDecimal(session.calculatedPlcm)} />
                <Metric label="Precisão" value={formatPct(session.calculatedAccuracy)} />
                <Metric label="Nível de precisão" value={session.precisionLevel || "—"} />
                <Metric label="Fluência" value={session.fluencyLevel || "—"} />
                <Metric
                  label="Compreensão"
                  value={
                    session.comprehensionTotal
                      ? `${session.comprehensionCorrectCount ?? 0}/${session.comprehensionTotal}`
                      : "—"
                  }
                />
                <Metric label="ICA" value={formatDecimal(session.icaScore)} />
              </CardContent>
            </Card>
          ) : null}

          <div className="space-y-4">
            {parts.map((part) => {
              const result = session.partResults?.[part];
              const aligned = wordsByPart[part] ?? [];
              return (
                <div key={part} className="space-y-3">
                  <PartRecorder
                    sessionId={session.id}
                    part={part}
                    sent={partHasAudio(session, part)}
                    processed={Boolean(result)}
                    disabled={busy}
                    words={part === "text" ? undefined : lists[part]?.items}
                    textContent={part === "text" ? text?.content : undefined}
                    onUploaded={handleUploaded}
                  />
                  {result ? (
                    <Card>
                      <CardContent className="space-y-4 pt-6">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <Metric label="Lidas" value={String(result.wordsRead ?? "—")} />
                          <Metric label="Corretas" value={String(result.correctCount ?? "—")} />
                          <Metric label="Erros" value={String(result.errorsCount ?? "—")} />
                          <Metric label="Omitidas" value={String(result.omittedCount ?? "—")} />
                          <Metric label="Inseridas" value={String(result.extraCount ?? "—")} />
                          <Metric label="Precisão" value={formatPct(result.accuracy)} />
                          <Metric label="PLCM" value={formatDecimal(result.plcm)} />
                          <Metric
                            label="Duração"
                            value={result.durationSeconds != null ? formatClock(Math.round(result.durationSeconds)) : "—"}
                          />
                        </div>
                        {aligned.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Alinhamento palavra a palavra</p>
                            <div className="flex flex-wrap gap-1.5">
                              {aligned.map((word) => (
                                <span
                                  key={word.id}
                                  title={`${MATCH_LABEL[word.matchType]}${
                                    word.recognizedToken && word.recognizedToken !== word.expectedToken
                                      ? ` · ouvido: "${word.recognizedToken}"`
                                      : ""
                                  }`}
                                  className={cn("rounded-md border px-2 py-0.5 text-sm", MATCH_CLASS[word.matchType])}
                                >
                                  {word.expectedToken ?? word.recognizedToken ?? "—"}
                                </span>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              {(Object.keys(MATCH_LABEL) as GuidedAutoMatchType[]).map((type) => (
                                <span key={type} className="inline-flex items-center gap-1.5">
                                  <span className={cn("h-3 w-3 rounded-sm border", MATCH_CLASS[type])} />
                                  {MATCH_LABEL[type]}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {result.transcript ? (
                          <details className="text-sm">
                            <summary className="cursor-pointer font-medium">Transcrição</summary>
                            <p className="mt-2 whitespace-pre-line text-muted-foreground">{result.transcript}</p>
                          </details>
                        ) : null}
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              );
            })}
          </div>

          {session.readingTextId && questions.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Compreensão do texto</CardTitle>
                <CardDescription>Marque a alternativa que o aluno escolheu em cada pergunta.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {questions.map((question, index) => (
                  <fieldset key={question.id} className="space-y-2">
                    <legend className="text-sm font-medium">
                      {index + 1}. {question.statement}
                    </legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {question.options.map((option, optionIndex) => (
                        <label
                          key={optionIndex}
                          className={cn(
                            "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                            answers[question.id] === optionIndex ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                          )}
                        >
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            className="accent-[hsl(var(--primary))]"
                            checked={answers[question.id] === optionIndex}
                            onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
                <div className="flex justify-end">
                  <Button onClick={() => void handleSaveAnswers()} disabled={savingAnswers}>
                    {savingAnswers ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {(session.answers?.length ?? 0) > 0 ? "Atualizar respostas" : "Salvar respostas"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </PageShell>
  );
}
