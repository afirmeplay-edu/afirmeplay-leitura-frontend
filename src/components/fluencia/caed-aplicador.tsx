"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Gauge, Loader2, Target } from "lucide-react";
import { toast } from "sonner";
import {
  getReadingText,
  getReport,
  listWordLists,
  saveComprehensionAnswers,
  saveFluency,
  startReadingSession,
  submitSession,
  type FluencySessionReport,
  type ReadingText,
  type SaveFluencyPayload,
  type WordList,
} from "@/lib/api/afirme-reading";
import { getApiErrorMessage } from "@/lib/api/errors";
import { FullscreenLayout } from "@/components/layout/fullscreen-layout";
import { Leiturometro } from "@/components/fluencia/leiturometro";
import { MicrophoneTestStep } from "@/components/fluencia/microphone-test-step";
import {
  NarrativeFluencyStep,
  type FluencyNarrativePartResult,
} from "@/components/fluencia/narrative-fluency-step";
import {
  WordListFluencyStep,
  type FluencyListPartResult,
} from "@/components/fluencia/word-list-fluency-step";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  "Capa",
  "Microfone",
  "Q1 Palavras",
  "Q2 Pouco comuns",
  "Q3 Texto",
  "Compreensao",
  "Relatorio",
];

function pickPreferredList(lists: WordList[]) {
  return (
    lists.find((list) => list.isDefault && list.active) ??
    lists.find((list) => list.active) ??
    lists[0] ??
    null
  );
}

function formatMetric(value: number | null | undefined, suffix = "") {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value}${suffix}`;
}

/** Mapeia ICA 0–100 para faixa 1–6 do Leiturômetro visual. */
function icaScoreToLevel(score: number | null | undefined) {
  if (score == null || Number.isNaN(score)) return 1;
  return Math.max(1, Math.min(6, Math.ceil(score / (100 / 6))));
}

function buildFluencyPayload(input: {
  q1: FluencyListPartResult | null;
  q2: FluencyListPartResult | null;
  q3: FluencyNarrativePartResult | null;
  q1Words: string[];
}): SaveFluencyPayload {
  const payload: SaveFluencyPayload = {
    kind: "FLUENCY",
    caderno: "A",
    notReadReason: null,
    prosodyLevel: 3,
    extras: { notes: "wizard-fluencia" },
  };

  if (input.q1) {
    payload.q1 = {
      wordsRead: input.q1.wordsRead,
      errorsCount: input.q1.errorsCount,
      readingTimeSeconds: input.q1.readingTimeSeconds,
      markings: input.q1.statuses.map((status, index) => ({
        index,
        word: input.q1Words[index] ?? null,
        status,
      })),
    };
  }

  if (input.q2) {
    payload.q2 = {
      wordsRead: input.q2.wordsRead,
      errorsCount: input.q2.errorsCount,
      readingTimeSeconds: input.q2.readingTimeSeconds,
    };
  }

  if (input.q3) {
    payload.q3 = {
      wordsRead: input.q3.wordsRead,
      errorsCount: input.q3.errorsCount,
      readingTimeSeconds: input.q3.readingTimeSeconds,
    };
  }

  return payload;
}

export function CaedAplicador() {
  const router = useRouter();
  const params = useSearchParams();
  const evaluationId = params.get("evaluationId") ?? "";
  const sessionId = params.get("sessionId") ?? "";
  const studentId = params.get("aluno") ?? "";
  const textId = params.get("texto") ?? "";
  const assessmentType = params.get("assessmentType") ?? "completa";
  const supportsComprehension =
    assessmentType === "completa" || assessmentType === "compreensao";

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [confirmExit, setConfirmExit] = useState(false);

  const [text, setText] = useState<ReadingText | null>(null);
  const [q1List, setQ1List] = useState<WordList | null>(null);
  const [q2List, setQ2List] = useState<WordList | null>(null);
  const [loadingContent, setLoadingContent] = useState(true);

  const [q1Result, setQ1Result] = useState<FluencyListPartResult | null>(null);
  const [q2Result, setQ2Result] = useState<FluencyListPartResult | null>(null);
  const [q3Result, setQ3Result] = useState<FluencyNarrativePartResult | null>(null);
  const [report, setReport] = useState<FluencySessionReport | null>(null);

  const [sessionStarted, setSessionStarted] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
  const [savingFluency, setSavingFluency] = useState(false);
  const [savingComprehension, setSavingComprehension] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const q1ResultRef = useRef(q1Result);
  const q2ResultRef = useRef(q2Result);
  const q3ResultRef = useRef(q3Result);
  q1ResultRef.current = q1Result;
  q2ResultRef.current = q2Result;
  q3ResultRef.current = q3Result;

  const questions = text?.questions ?? [];
  const q1Items = q1List?.items ?? [];
  const q2Items = q2List?.items ?? [];
  const hasSessionIds = Boolean(evaluationId && sessionId);
  const comprehensionReady =
    questions.length === 0 || questions.every((q) => answers[q.id] !== undefined);

  const studentLabel = useMemo(() => {
    return report?.studentName || studentId || "Aluno";
  }, [report?.studentName, studentId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!textId) {
        toast.error("Texto nao informado na URL.");
        setLoadingContent(false);
        return;
      }
      if (!hasSessionIds) {
        toast.error("evaluationId/sessionId ausentes. Volte e selecione uma sessao.");
      }

      setLoadingContent(true);
      try {
        const [fullText, palavras, poucoComuns] = await Promise.all([
          getReadingText(textId),
          listWordLists({ kind: "PALAVRAS", active: true }),
          listWordLists({ kind: "POUCO_COMUNS", active: true }),
        ]);
        if (cancelled) return;
        setText(fullText);
        setQ1List(pickPreferredList(palavras));
        setQ2List(pickPreferredList(poucoComuns));
        setAnswers({});
      } catch (error) {
        if (!cancelled) {
          toast.error(
            getApiErrorMessage(error, "Nao foi possivel carregar texto e listas da avaliacao.")
          );
          setText(null);
          setQ1List(null);
          setQ2List(null);
        }
      } finally {
        if (!cancelled) setLoadingContent(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [textId, hasSessionIds]);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  const handleQ1Result = useCallback((result: FluencyListPartResult | null) => {
    setQ1Result(result);
  }, []);
  const handleQ2Result = useCallback((result: FluencyListPartResult | null) => {
    setQ2Result(result);
  }, []);
  const handleQ3Result = useCallback((result: FluencyNarrativePartResult | null) => {
    setQ3Result(result);
  }, []);

  async function ensureSessionStarted() {
    if (!hasSessionIds) {
      throw new Error("Sessao nao informada (evaluationId/sessionId).");
    }
    if (sessionStarted) return;
    await startReadingSession(evaluationId, sessionId);
    setSessionStarted(true);
  }

  async function persistFluency(parts: {
    q1?: FluencyListPartResult | null;
    q2?: FluencyListPartResult | null;
    q3?: FluencyNarrativePartResult | null;
  }) {
    if (!hasSessionIds) {
      throw new Error("Sessao nao informada (evaluationId/sessionId).");
    }
    const payload = buildFluencyPayload({
      q1: parts.q1 ?? q1ResultRef.current,
      q2: parts.q2 ?? q2ResultRef.current,
      q3: parts.q3 ?? q3ResultRef.current,
      q1Words: q1Items,
    });
    if (!payload.q1 && !payload.q2 && !payload.q3) {
      throw new Error("Nenhuma parte de fluencia para salvar.");
    }
    await saveFluency(evaluationId, sessionId, payload);
  }

  async function handleStartFromCover() {
    if (!hasSessionIds) {
      toast.error("Selecione avaliacao e sessao na tela anterior.");
      return;
    }
    setStartingSession(true);
    try {
      await ensureSessionStarted();
      toast.success("Sessao iniciada.");
      next();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Nao foi possivel iniciar a sessao."));
    } finally {
      setStartingSession(false);
    }
  }

  async function handleContinueAfterQ1() {
    if (!q1ResultRef.current) {
      toast.error("Conclua a classificacao de Q1 antes de continuar.");
      return;
    }
    setSavingFluency(true);
    try {
      await ensureSessionStarted();
      await persistFluency({ q1: q1ResultRef.current });
      next();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          "Falha ao salvar Q1. Seu progresso local foi mantido — tente novamente."
        )
      );
    } finally {
      setSavingFluency(false);
    }
  }

  async function handleContinueAfterQ2() {
    if (!q2ResultRef.current) {
      toast.error("Conclua a classificacao de Q2 antes de continuar.");
      return;
    }
    setSavingFluency(true);
    try {
      await ensureSessionStarted();
      await persistFluency({
        q1: q1ResultRef.current,
        q2: q2ResultRef.current,
      });
      next();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          "Falha ao salvar Q2. Seu progresso local foi mantido — tente novamente."
        )
      );
    } finally {
      setSavingFluency(false);
    }
  }

  async function handleContinueAfterQ3() {
    if (!q3ResultRef.current) {
      toast.error("Conclua a leitura de Q3 antes de continuar.");
      return;
    }
    setSavingFluency(true);
    try {
      await ensureSessionStarted();
      await persistFluency({
        q1: q1ResultRef.current,
        q2: q2ResultRef.current,
        q3: q3ResultRef.current,
      });
      next();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          "Falha ao salvar Q3. Seu progresso local foi mantido — tente novamente."
        )
      );
    } finally {
      setSavingFluency(false);
    }
  }

  async function handleContinueAfterComprehension() {
    if (!comprehensionReady) {
      toast.error("Responda todas as perguntas de compreensao.");
      return;
    }
    if (!hasSessionIds) {
      toast.error("Sessao nao informada.");
      return;
    }

    setSavingComprehension(true);
    try {
      await ensureSessionStarted();

      if (supportsComprehension && questions.length > 0) {
        await saveComprehensionAnswers(evaluationId, sessionId, {
          answers: questions.map((q) => ({
            readingTextQuestionId: q.id,
            selectedOption: answers[q.id],
          })),
        });
      }

      const reportData = await getReport(evaluationId, sessionId);
      setReport(reportData);
      next();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          "Falha ao salvar compreensao/relatorio. Respostas locais mantidas — tente novamente."
        )
      );
    } finally {
      setSavingComprehension(false);
    }
  }

  async function handleSubmit() {
    if (!hasSessionIds) {
      toast.error("Sessao nao informada.");
      return;
    }
    setSubmitting(true);
    try {
      await submitSession(evaluationId, sessionId);
      setSubmitted(true);
      toast.success("Avaliacao finalizada com sucesso.");
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          "Falha ao finalizar a sessao. O relatorio local foi mantido — tente novamente."
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  const icaLevel = icaScoreToLevel(report?.icaScore);
  const comprehensionLabel =
    report?.comprehension.correctCount != null && report.comprehension.total != null
      ? `${report.comprehension.correctCount}/${report.comprehension.total}`
      : `${Object.keys(answers).length}/${questions.length || 0}`;

  return (
    <FullscreenLayout
      title="Avaliacao de Fluencia"
      subtitle={
        loadingContent ? "Carregando..." : `${studentLabel} · ${text?.title ?? ""}`
      }
      backHref="/app/avaliacao-fluencia"
      onClose={() => setConfirmExit(true)}
    >
      <div className="mx-auto w-full min-w-0 max-w-5xl space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Etapa {step + 1} de {STEPS.length}
            </span>
            <span>{STEPS[step]}</span>
          </div>
          <Progress value={((step + 1) / STEPS.length) * 100} />
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 snap-x sm:flex-wrap sm:overflow-visible">
          {STEPS.map((s, i) => (
            <Badge
              key={s}
              variant={i === step ? "default" : i < step ? "info" : "outline"}
              className="shrink-0 snap-start"
            >
              <span className="sm:hidden">{i + 1}</span>
              <span className="hidden sm:inline">
                {i + 1}. {s}
              </span>
            </Badge>
          ))}
        </div>

        {!hasSessionIds ? (
          <AlertMissingSession />
        ) : null}

        <Card>
          <CardContent className="space-y-6 pt-6">
            {loadingContent ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Carregando texto e listas de palavras...
              </div>
            ) : (
              <>
                {step === 0 && (
                  <>
                    <h2 className="text-xl font-semibold text-bluebrand-deep">
                      Preparacao da avaliacao
                    </h2>
                    <p className="text-muted-foreground">
                      Esta avaliacao mede fluencia leitora em tres etapas: lista de palavras, palavras
                      pouco comuns e leitura de texto narrativo com compreensao.
                    </p>
                    <Button
                      onClick={() => void handleStartFromCover()}
                      disabled={!hasSessionIds || startingSession}
                    >
                      {startingSession ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Iniciando sessao...
                        </>
                      ) : (
                        "Continuar"
                      )}
                    </Button>
                  </>
                )}
                {step === 1 && <MicrophoneTestStep onContinue={next} />}
                {step === 2 && (
                  <WordListFluencyStep
                    title="Q1 — Lista de palavras (60s)"
                    words={q1Items}
                    continuePending={savingFluency}
                    onResultChange={handleQ1Result}
                    onContinue={() => void handleContinueAfterQ1()}
                  />
                )}
                {step === 3 && (
                  <WordListFluencyStep
                    title="Q2 — Palavras pouco comuns (60s)"
                    words={q2Items}
                    continuePending={savingFluency}
                    onResultChange={handleQ2Result}
                    onContinue={() => void handleContinueAfterQ2()}
                  />
                )}
                {step === 4 && (
                  <NarrativeFluencyStep
                    title="Q3 — Texto narrativo"
                    content={text?.content ?? ""}
                    continuePending={savingFluency}
                    onResultChange={handleQ3Result}
                    onContinue={() => void handleContinueAfterQ3()}
                  />
                )}
                {step === 5 && text && (
                  <>
                    <h2 className="text-xl font-semibold">Compreensao leitora</h2>
                    {questions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Este texto nao possui perguntas de compreensao cadastradas.
                      </p>
                    ) : (
                      questions.map((q) => (
                        <div key={q.id} className="space-y-2">
                          <p className="font-medium">{q.statement}</p>
                          {q.descriptor ? (
                            <p className="text-xs text-muted-foreground">{q.descriptor}</p>
                          ) : null}
                          <div className="space-y-1">
                            {q.options.map((opt, i) => (
                              <label
                                key={`${q.id}-${i}`}
                                className="flex cursor-pointer items-center gap-2 rounded border p-2 hover:bg-muted/50"
                              >
                                <input
                                  type="radio"
                                  name={q.id}
                                  checked={answers[q.id] === i}
                                  onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                                />
                                {opt}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                    <Button
                      onClick={() => void handleContinueAfterComprehension()}
                      disabled={!comprehensionReady || savingComprehension || !hasSessionIds}
                    >
                      {savingComprehension ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        "Ver resultado"
                      )}
                    </Button>
                  </>
                )}
                {step === 6 && (
                  <>
                    <h2 className="text-xl font-semibold">Relatorio — Leiturometro</h2>
                    {report ? (
                      <>
                        <Leiturometro
                          currentLevel={icaLevel}
                          score={report.icaScore ?? undefined}
                        />
                        <div className="grid gap-4 sm:grid-cols-3">
                          <StatCard
                            label="PLCM"
                            value={formatMetric(report.calculatedPlcm)}
                            icon={Gauge}
                          />
                          <StatCard
                            label="Precisao"
                            value={formatMetric(report.calculatedAccuracy, "%")}
                            icon={Target}
                          />
                          <StatCard
                            label="Compreensao"
                            value={comprehensionLabel}
                            icon={AlertTriangle}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {report.precisionLevel ? `Precisao: ${report.precisionLevel}` : null}
                          {report.precisionLevel && report.fluencyLevel ? " · " : null}
                          {report.fluencyLevel ? `Fluencia: ${report.fluencyLevel}` : null}
                          {report.icaScore != null ? ` · ICA: ${report.icaScore}` : null}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Relatorio ainda nao carregado. Volte e tente novamente.
                      </p>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                      <Button
                        className="w-full sm:w-auto"
                        onClick={() => void handleSubmit()}
                        disabled={!report || submitting || submitted || !hasSessionIds}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Finalizando...
                          </>
                        ) : submitted ? (
                          "Avaliacao salva"
                        ) : (
                          "Salvar avaliacao"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => router.push("/app/relatorios?aba=ica")}
                      >
                        Ver relatorios
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog
        open={confirmExit}
        onOpenChange={setConfirmExit}
        title="Sair da avaliacao?"
        description="O progresso local desta sessao pode ser perdido se ainda nao foi salvo."
        confirmLabel="Sair"
        variant="destructive"
        icon={AlertTriangle}
        onConfirm={() => router.push("/app/avaliacao-fluencia")}
      />
    </FullscreenLayout>
  );
}

function AlertMissingSession() {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Faltam <strong>evaluationId</strong> e <strong>sessionId</strong> na URL. Volte a selecao e
      escolha uma avaliacao/sessao aplicadas.
    </div>
  );
}
