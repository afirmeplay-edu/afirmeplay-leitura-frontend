"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Gauge, Loader2, Target } from "lucide-react";
import { toast } from "sonner";
import {
  getFluencySessionReport,
  getReadingText,
  getWordList,
  listWordLists,
  saveFluencyComprehensionAnswers,
  saveFluencySessionPart,
  submitFluencySession,
  uploadFluencySessionAudio,
  type FluencyListPartPayload,
  type FluencySessionReport,
  type FluencyTextPartPayload,
  type ReadingText,
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
  "Apresentação",
  "Microfone",
  "Q1 Palavras",
  "Q2 Pouco comuns",
  "Q3 Texto",
  "Compreensão",
  "Leiturômetro",
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

function icaScoreToLevel(score: number | null | undefined, explicit?: number | null) {
  if (explicit != null && !Number.isNaN(explicit)) {
    return Math.max(1, Math.min(6, Math.round(explicit)));
  }
  if (score == null || Number.isNaN(score)) return 1;
  return Math.max(1, Math.min(6, Math.ceil(score / (100 / 6))));
}

function todayLabel() {
  return new Intl.DateTimeFormat("pt-BR").format(new Date());
}

export function CaedAplicador() {
  const router = useRouter();
  const params = useSearchParams();

  const sessionId = params.get("sessionId") ?? "";
  const studentId = params.get("studentId") ?? params.get("aluno") ?? "";
  const studentName = params.get("studentName") ?? "";
  const className = params.get("className") ?? "";
  const schoolName = params.get("schoolName") ?? "";
  const textId = params.get("readingTextId") ?? params.get("texto") ?? "";
  const textTitleParam = params.get("textTitle") ?? "";
  const wordsWordListId = params.get("wordsWordListId") ?? "";
  const uncommonWordListId = params.get("uncommonWordListId") ?? "";

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

  const [savingFluency, setSavingFluency] = useState(false);
  const [savingMic, setSavingMic] = useState(false);
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
  const hasSession = Boolean(sessionId);
  const comprehensionReady =
    questions.length === 0 || questions.every((q) => answers[q.id] !== undefined);

  const studentLabel = useMemo(() => {
    return report?.studentName || studentName || studentId || "Aluno";
  }, [report?.studentName, studentName, studentId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!textId) {
        toast.error("Texto não informado na URL.");
        setLoadingContent(false);
        return;
      }
      if (!hasSession) {
        toast.error("sessionId ausente. Volte e monte a aplicação novamente.");
      }

      setLoadingContent(true);
      try {
        const [fullText, q1, q2, fallbackPalavras, fallbackPouco] = await Promise.all([
          getReadingText(textId),
          wordsWordListId ? getWordList(wordsWordListId).catch(() => null) : Promise.resolve(null),
          uncommonWordListId
            ? getWordList(uncommonWordListId).catch(() => null)
            : Promise.resolve(null),
          listWordLists({ kind: "PALAVRAS", active: true }),
          listWordLists({ kind: "POUCO_COMUNS", active: true }),
        ]);
        if (cancelled) return;
        setText(fullText);
        setQ1List(q1 ?? pickPreferredList(fallbackPalavras));
        setQ2List(q2 ?? pickPreferredList(fallbackPouco));
        setAnswers({});
      } catch (error) {
        if (!cancelled) {
          toast.error(
            getApiErrorMessage(error, "Não foi possível carregar texto e listas da avaliação.")
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
  }, [textId, hasSession, wordsWordListId, uncommonWordListId]);

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

  async function persistPart(payload: {
    q1?: FluencyListPartPayload;
    q2?: FluencyListPartPayload;
    q3?: FluencyTextPartPayload;
  }) {
    if (!hasSession) throw new Error("Sessão não informada.");
    await saveFluencySessionPart(sessionId, {
      kind: "FLUENCY",
      caderno: "A",
      extras: {
        sttProvider: "web_speech_api",
        browser: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      },
      ...payload,
    });
  }

  async function uploadPartAudio(
    part: "q1" | "q2" | "q3" | "mic_test",
    blob: Blob | null | undefined
  ) {
    if (!hasSession || !blob || blob.size === 0) return;
    try {
      await uploadFluencySessionAudio(sessionId, part, blob, `${part}.webm`);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          `Parte salva, mas o upload do áudio (${part}) falhou. Você pode seguir.`
        )
      );
    }
  }

  async function handleMicContinue(audioBlob: Blob | null) {
    setSavingMic(true);
    try {
      await uploadPartAudio("mic_test", audioBlob);
      next();
    } finally {
      setSavingMic(false);
    }
  }

  async function handleContinueAfterQ1() {
    const result = q1ResultRef.current;
    if (!result) {
      toast.error("Conclua a classificação de Q1 antes de continuar.");
      return;
    }
    setSavingFluency(true);
    try {
      const { audioBlob, ...q1 } = result;
      await persistPart({ q1 });
      await uploadPartAudio("q1", audioBlob);
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
    const result = q2ResultRef.current;
    if (!result) {
      toast.error("Conclua a classificação de Q2 antes de continuar.");
      return;
    }
    setSavingFluency(true);
    try {
      const { audioBlob, ...q2 } = result;
      await persistPart({ q2 });
      await uploadPartAudio("q2", audioBlob);
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
    const result = q3ResultRef.current;
    if (!result) {
      toast.error("Conclua a leitura de Q3 antes de continuar.");
      return;
    }
    setSavingFluency(true);
    try {
      const { audioBlob, ...q3 } = result;
      await persistPart({ q3 });
      await uploadPartAudio("q3", audioBlob);
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
      toast.error("Responda todas as perguntas de compreensão.");
      return;
    }
    if (!hasSession) {
      toast.error("Sessão não informada.");
      return;
    }

    setSavingComprehension(true);
    try {
      if (questions.length > 0) {
        await saveFluencyComprehensionAnswers(sessionId, {
          answers: questions.map((q) => ({
            readingTextQuestionId: q.id,
            selectedOption: answers[q.id],
          })),
        });
      }

      const reportData = await getFluencySessionReport(sessionId);
      setReport(reportData);
      next();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          "Falha ao salvar compreensão/relatório. Respostas locais mantidas — tente novamente."
        )
      );
    } finally {
      setSavingComprehension(false);
    }
  }

  async function handleSubmit() {
    if (!hasSession) {
      toast.error("Sessão não informada.");
      return;
    }
    setSubmitting(true);
    try {
      await submitFluencySession(sessionId);
      try {
        const fresh = await getFluencySessionReport(sessionId);
        setReport(fresh);
      } catch {
        /* report anterior permanece */
      }
      setSubmitted(true);
      toast.success("Avaliação finalizada com sucesso.");
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          "Falha ao finalizar a sessão. O relatório local foi mantido — tente novamente."
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  const icaLevel = icaScoreToLevel(report?.icaScore, report?.leiturimetroLevel);
  const comprehensionLabel =
    report?.comprehension?.correctCount != null && report.comprehension.total != null
      ? `${report.comprehension.correctCount}/${report.comprehension.total}`
      : `${Object.keys(answers).length}/${questions.length || 0}`;

  return (
    <FullscreenLayout
      title="Avaliação de Fluência"
      subtitle={
        loadingContent
          ? "Carregando..."
          : `${studentLabel} · ${text?.title ?? textTitleParam}`
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

        {!hasSession ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Falta <strong>sessionId</strong> na URL. Volte à seleção e monte a aplicação.
          </div>
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
                  <div className="mx-auto max-w-2xl space-y-6 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">{new Date().getFullYear()}</p>
                      <h2 className="text-2xl font-bold text-bluebrand-deep">
                        Avaliação de Fluência Leitora
                      </h2>
                      <p className="mt-1 text-muted-foreground">
                        2º ano do Ensino Fundamental • Ciclo II
                      </p>
                    </div>
                    <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
                      Resultado: <strong>Leiturômetro • Índice Criança Alfabetizada (ICA)</strong>
                    </div>
                    <div className="grid gap-3 border-t pt-4 text-left sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Estudante</p>
                        <p className="font-medium">{studentLabel}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Turma</p>
                        <p className="font-medium">{className || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Escola</p>
                        <p className="font-medium">{schoolName || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Data</p>
                        <p className="font-medium">{todayLabel()}</p>
                      </div>
                    </div>
                    <div className="rounded-lg border-l-4 border-l-bluebrand-base bg-blue-50 p-4 text-left text-sm text-blue-950">
                      <p className="font-semibold">[APLICADOR] APRESENTAÇÃO AO ESTUDANTE</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        <li>Olá! Você está participando da Avaliação de Fluência Leitora.</li>
                        <li>
                          Sua participação é muito importante para sabermos como está a sua
                          leitura.
                        </li>
                        <li>
                          Esta avaliação é composta de 3 partes: lista de palavras, lista de
                          palavras pouco comuns e leitura de texto. Bom teste!
                        </li>
                      </ul>
                    </div>
                    <Button className="w-full" disabled={!hasSession} onClick={next}>
                      Iniciar avaliação →
                    </Button>
                  </div>
                )}
                {step === 1 && (
                  <MicrophoneTestStep
                    continuePending={savingMic}
                    onContinue={(blob) => void handleMicContinue(blob)}
                  />
                )}
                {step === 2 && (
                  <WordListFluencyStep
                    questionLabel="QUESTÃO 1"
                    title="Lista de palavras"
                    words={q1Items}
                    continuePending={savingFluency}
                    onResultChange={handleQ1Result}
                    onContinue={() => void handleContinueAfterQ1()}
                  />
                )}
                {step === 3 && (
                  <WordListFluencyStep
                    questionLabel="QUESTÃO 2"
                    title="Lista de palavras pouco comuns"
                    words={q2Items}
                    continuePending={savingFluency}
                    onResultChange={handleQ2Result}
                    onContinue={() => void handleContinueAfterQ2()}
                  />
                )}
                {step === 4 && (
                  <NarrativeFluencyStep
                    title={text?.title ?? textTitleParam}
                    content={text?.content ?? ""}
                    continuePending={savingFluency}
                    onResultChange={handleQ3Result}
                    onContinue={() => void handleContinueAfterQ3()}
                  />
                )}
                {step === 5 && text && (
                  <>
                    <h2 className="text-xl font-semibold">Compreensão leitora</h2>
                    {questions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Este texto não possui perguntas de compreensão cadastradas.
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
                      disabled={!comprehensionReady || savingComprehension || !hasSession}
                    >
                      {savingComprehension ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        "Ver Leiturômetro →"
                      )}
                    </Button>
                  </>
                )}
                {step === 6 && (
                  <>
                    <h2 className="text-xl font-semibold">Relatório — Leiturômetro</h2>
                    {report ? (
                      <>
                        <Leiturometro
                          currentLevel={icaLevel}
                          score={report.icaScore ?? undefined}
                        />
                        <div className="grid gap-4 sm:grid-cols-3">
                          <StatCard
                            label="PLCM"
                            value={formatMetric(
                              report.calculatedPlcm ?? report.q3?.plcm ?? null
                            )}
                            icon={Gauge}
                          />
                          <StatCard
                            label="Precisão"
                            value={formatMetric(
                              report.calculatedAccuracy ?? report.q1?.accuracy ?? null,
                              "%"
                            )}
                            icon={Target}
                          />
                          <StatCard
                            label="Compreensão"
                            value={comprehensionLabel}
                            icon={AlertTriangle}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {report.icaScore != null ? `ICA: ${report.icaScore}` : null}
                          {report.leiturimetroLevel != null
                            ? ` · Nível: ${report.leiturimetroLevel}`
                            : null}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Relatório ainda não carregado. Volte e tente novamente.
                      </p>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                      <Button
                        className="w-full sm:w-auto"
                        onClick={() => void handleSubmit()}
                        disabled={!report || submitting || submitted || !hasSession}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Finalizando...
                          </>
                        ) : submitted ? (
                          "Avaliação salva"
                        ) : (
                          "Finalizar avaliação"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => router.push("/app/relatorios?aba=ica")}
                      >
                        Ver relatórios
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
        title="Sair da avaliação?"
        description="O progresso local desta sessão pode ser perdido se ainda não foi salvo."
        confirmLabel="Sair"
        variant="destructive"
        icon={AlertTriangle}
        onConfirm={() => router.push("/app/avaliacao-fluencia")}
      />
    </FullscreenLayout>
  );
}
