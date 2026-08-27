"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Gauge, Loader2, Target } from "lucide-react";
import { toast } from "sonner";
import {
  fetchFluencyAudioObjectUrl,
  getFluencySession,
  getFluencySessionReport,
  getReadingText,
  getWordList,
  listWordLists,
  saveFluencyComprehensionAnswers,
  saveFluencySessionPart,
  submitFluencySession,
  uploadFluencySessionAudio,
  type FluencyAudioPart,
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
import { StudentAudioPlayer } from "@/components/fluencia/student-audio-player";
import { isSerieTurmaCompleta } from "@/lib/fluencia/class-label";
import { perfilFromIcaLevel } from "@/lib/colors/reading-levels";
import { PerfilLeitorBadge } from "@/components/shared/perfil-leitor-badge";
import { StudentInfoDialog, StudentNameButton } from "@/components/shared/student-info-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  isPracticeActivityTab,
  parsePracticeActivityTab,
  parsePracticeTab,
  PRACTICE_TABS,
  type PracticeTab,
} from "@/components/fluencia/practice-tabs";

type GatePhase = "apresentacao" | "microfone" | "abas";

export type CaedAplicadorMode = "oficial" | "praticar";

interface CaedAplicadorProps {
  mode?: CaedAplicadorMode;
}

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

export function CaedAplicador({ mode = "oficial" }: CaedAplicadorProps) {
  const router = useRouter();
  const params = useSearchParams();
  const isPractice = mode === "praticar";
  const layoutTitle = isPractice ? "Praticar Avaliação de Fluência" : "Avaliação de Fluência";

  const sessionId = params.get("sessionId") ?? "";
  const evaluationId = params.get("evaluationId") ?? "";
  const viewMode = params.get("view") === "1";
  const backHref = isPractice
    ? "/app/avaliacao-leitura-guiada"
    : evaluationId
      ? `/app/avaliacao-fluencia?evaluationId=${encodeURIComponent(evaluationId)}`
      : "/app/avaliacao-fluencia";
  const studentId = params.get("studentId") ?? params.get("aluno") ?? "";
  const studentName = params.get("studentName") ?? "";
  const classId = params.get("classId") ?? "";
  const className = params.get("className") ?? "";
  const schoolId = params.get("schoolId") ?? "";
  const schoolName = params.get("schoolName") ?? "";
  const textId = params.get("readingTextId") ?? params.get("texto") ?? "";
  const textTitleParam = params.get("textTitle") ?? "";
  const wordsWordListId = params.get("wordsWordListId") ?? "";
  const uncommonWordListId = params.get("uncommonWordListId") ?? "";

  const [phase, setPhase] = useState<GatePhase>(() => {
    if (isPractice) return "microfone";
    if (viewMode) return "abas";
    return "apresentacao";
  });
  const [activeTab, setActiveTab] = useState<PracticeTab>(() => {
    if (viewMode) return "leiturometro";
    const fromUrl = isPractice
      ? parsePracticeActivityTab(params.get("aba"))
      : parsePracticeTab(params.get("aba"));
    return fromUrl ?? "palavras";
  });
  const [recordingTab, setRecordingTab] = useState<PracticeTab | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [confirmExit, setConfirmExit] = useState(false);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [q1Saved, setQ1Saved] = useState(false);
  const [q2Saved, setQ2Saved] = useState(false);
  const [q3Saved, setQ3Saved] = useState(false);
  const [remoteAudio, setRemoteAudio] = useState<Partial<Record<FluencyAudioPart, string>>>({});

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
  const [submitted, setSubmitted] = useState(viewMode);

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

    async function loadRemoteAudio(id: string) {
      const parts: FluencyAudioPart[] = ["q1", "q2", "q3", "mic_test"];
      const next: Partial<Record<FluencyAudioPart, string>> = {};
      await Promise.all(
        parts.map(async (part) => {
          try {
            next[part] = await fetchFluencyAudioObjectUrl(id, part);
          } catch {
            /* parte sem áudio */
          }
        })
      );
      if (!cancelled) {
        setRemoteAudio((current) => {
          Object.values(current).forEach((url) => {
            if (url) URL.revokeObjectURL(url);
          });
          return next;
        });
      } else {
        Object.values(next).forEach((url) => {
          if (url) URL.revokeObjectURL(url);
        });
      }
    }

    async function load() {
      if (!hasSession) {
        toast.error("sessionId ausente. Volte e monte a aplicação novamente.");
      }

      setLoadingContent(true);
      try {
        let nextTextId = textId;
        let nextKnownId = wordsWordListId;
        let nextUncommonId = uncommonWordListId;

        if (sessionId) {
          const session = await getFluencySession(sessionId);
          if (cancelled) return;
          nextTextId = nextTextId || session.readingTextId || "";
          nextKnownId =
            nextKnownId || session.knownWordListId || session.wordsWordListId || "";
          nextUncommonId = nextUncommonId || session.uncommonWordListId || "";

          if (session.answers?.length) {
            const nextAnswers: Record<string, number> = {};
            for (const answer of session.answers) {
              nextAnswers[answer.readingTextQuestionId] = answer.selectedOption;
            }
            setAnswers(nextAnswers);
          }

          const isView = viewMode || session.status === "finalizada";
          if (isView) {
            setPhase("abas");
            setActiveTab("leiturometro");
            setSubmitted(true);
            try {
              const reportData = await getFluencySessionReport(sessionId);
              if (!cancelled) setReport(reportData);
            } catch {
              /* relatório pode falhar se ainda não houver dados */
            }
          } else if (!isPractice && session.status === "em_andamento") {
            setPhase("abas");
          }

          if (
            !isPractice &&
            (viewMode ||
              session.status === "finalizada" ||
              session.hasAudio ||
              Object.keys(session.audioUrls ?? {}).length > 0)
          ) {
            void loadRemoteAudio(sessionId);
          }
        }

        if (!nextTextId) {
          toast.error("Texto não informado na URL.");
          setLoadingContent(false);
          return;
        }

        const fullText = await getReadingText(nextTextId);
        if (cancelled) return;

        const [q1, q2] = await Promise.all([
          nextKnownId ? getWordList(nextKnownId).catch(() => null) : Promise.resolve(null),
          nextUncommonId ? getWordList(nextUncommonId).catch(() => null) : Promise.resolve(null),
        ]);
        if (cancelled) return;

        let nextQ1 = q1;
        let nextQ2 = q2;
        if (!nextQ1 || !nextQ2) {
          const gradeId = fullText.gradeId || undefined;
          const [fallbackPalavras, fallbackPouco] = await Promise.all([
            nextQ1
              ? Promise.resolve([] as WordList[])
              : listWordLists({ kind: "PALAVRAS", active: true, gradeId }),
            nextQ2
              ? Promise.resolve([] as WordList[])
              : listWordLists({ kind: "POUCO_COMUNS", active: true, gradeId }),
          ]);
          if (cancelled) return;
          nextQ1 = nextQ1 ?? pickPreferredList(fallbackPalavras);
          nextQ2 = nextQ2 ?? pickPreferredList(fallbackPouco);
        }

        setText(fullText);
        setQ1List(nextQ1);
        setQ2List(nextQ2);
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
      setRemoteAudio((current) => {
        Object.values(current).forEach((url) => {
          if (url) URL.revokeObjectURL(url);
        });
        return {};
      });
    };
  }, [
    textId,
    hasSession,
    sessionId,
    wordsWordListId,
    uncommonWordListId,
    viewMode,
    isPractice,
  ]);

  const handleQ1Result = useCallback((result: FluencyListPartResult | null) => {
    setQ1Result(result);
    setQ1Saved(false);
  }, []);
  const handleQ2Result = useCallback((result: FluencyListPartResult | null) => {
    setQ2Result(result);
    setQ2Saved(false);
  }, []);
  const handleQ3Result = useCallback((result: FluencyNarrativePartResult | null) => {
    setQ3Result(result);
    setQ3Saved(false);
  }, []);

  function syncTabToUrl(tab: PracticeTab) {
    if (!isPractice) return;
    const nextParams = new URLSearchParams(params.toString());
    nextParams.set("aba", tab);
    router.replace(`?${nextParams.toString()}`, { scroll: false });
  }

  function handleTabChange(next: string) {
    const tab = next as PracticeTab;
    if (isPractice && !isPracticeActivityTab(tab)) return;
    if (recordingTab && recordingTab !== tab) {
      toast.message("Finalize a gravação antes de trocar de aba.");
      return;
    }
    setActiveTab(tab);
    syncTabToUrl(tab);
  }

  function goToNextWizardTab(from: PracticeTab) {
    const order: PracticeTab[] = isPractice
      ? ["palavras", "pouco-comuns", "texto"]
      : ["palavras", "pouco-comuns", "texto", "compreensao", "leiturometro"];
    const index = order.indexOf(from);
    const next = index >= 0 ? order[index + 1] : undefined;
    if (!next) return;
    handleTabChange(next);
    requestAnimationFrame(() => {
      document.getElementById("fluency-wizard-scroll")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  useEffect(() => {
    if (isPractice && phase === "apresentacao") {
      setPhase("microfone");
    }
  }, [isPractice, phase]);

  useEffect(() => {
    if (!isPractice) return;
    const fromUrl = parsePracticeActivityTab(params.get("aba"));
    if (!fromUrl || fromUrl === activeTab) return;
    if (recordingTab) {
      toast.message("Finalize a gravação antes de trocar de aba.");
      return;
    }
    setActiveTab(fromUrl);
  }, [isPractice, params, activeTab, recordingTab]);

  async function persistPart(payload: {
    q1?: FluencyListPartPayload;
    q2?: FluencyListPartPayload;
    q3?: FluencyTextPartPayload;
  }) {
    if (!hasSession) throw new Error("Sessão não informada.");
    const body = {
      kind: "FLUENCY" as const,
      caderno: "A",
      extras: {
        browser: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      },
      ...payload,
    };
    await saveFluencySessionPart(sessionId, body);
  }

  async function uploadPartAudio(
    part: "q1" | "q2" | "q3" | "mic_test",
    blob: Blob | null | undefined
  ) {
    // Prática: áudio só no browser (blob local). Some ao sair da página.
    if (isPractice || !hasSession || !blob || blob.size === 0) return;
    try {
      await uploadFluencySessionAudio(sessionId, part, blob, `${part}.webm`);
      const objectUrl = URL.createObjectURL(blob);
      setRemoteAudio((current) => {
        const previous = current[part];
        if (previous) URL.revokeObjectURL(previous);
        return { ...current, [part]: objectUrl };
      });
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
      const requested =
        (isPractice
          ? parsePracticeActivityTab(params.get("aba"))
          : parsePracticeTab(params.get("aba"))) ?? activeTab;
      setActiveTab(requested);
      if (isPractice) syncTabToUrl(requested);
      setPhase("abas");
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
      setQ1Saved(true);
      toast.success("Palavras salvas.");
      goToNextWizardTab("palavras");
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
      setQ2Saved(true);
      toast.success("Pouco comuns salvo.");
      goToNextWizardTab("pouco-comuns");
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
      setQ3Saved(true);
      toast.success("Texto salvo.");
      goToNextWizardTab("texto");
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
        const answersPayload = {
          answers: questions.map((q) => ({
            readingTextQuestionId: q.id,
            selectedOption: answers[q.id],
          })),
        };
        await saveFluencyComprehensionAnswers(sessionId, answersPayload);
      }

      const reportData = await getFluencySessionReport(sessionId);
      setReport(reportData);
      setActiveTab("leiturometro");
      syncTabToUrl("leiturometro");
      toast.success("Compreensão salva.");
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
  const perfilCode = perfilFromIcaLevel(icaLevel);
  const classLabel = className.trim();
  const classLabelVisivel = isSerieTurmaCompleta(classLabel) ? classLabel : "";
  const schoolLabel = schoolName.trim();
  const textLabel = text?.title ?? textTitleParam;
  const headerSubtitleText = loadingContent
    ? "Carregando..."
    : [studentLabel, classLabelVisivel || null, schoolLabel || null, textLabel || null]
        .filter(Boolean)
        .join(" · ");
  const openStudentDialog = () => setStudentDialogOpen(true);
  const comprehensionLabel =
    report?.comprehension?.correctCount != null && report.comprehension.total != null
      ? `${report.comprehension.correctCount}/${report.comprehension.total}`
      : `${Object.keys(answers).length}/${questions.length || 0}`;

  return (
    <FullscreenLayout
      title={layoutTitle}
      subtitleTitle={headerSubtitleText}
      subtitle={
        loadingContent ? (
          "Carregando..."
        ) : (
          <>
            <StudentNameButton name={studentLabel} onClick={openStudentDialog} />
            {classLabelVisivel ? <span> · {classLabelVisivel}</span> : null}
            {schoolLabel ? <span> · {schoolLabel}</span> : null}
            {textLabel ? <span> · {textLabel}</span> : null}
          </>
        )
      }
      backHref={backHref}
      onClose={() => setConfirmExit(true)}
      embedded={isPractice}
    >
      <div className="mx-auto w-full min-w-0 max-w-7xl space-y-4 sm:space-y-6">
        {phase === "abas" ? (
          <p className="text-sm text-muted-foreground">
            Navegue pelas abas na ordem que preferir. Grave, ouça o áudio e marque manualmente.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {phase === "apresentacao" ? "Apresentação" : "Teste de microfone"}
          </p>
        )}

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
                {phase === "apresentacao" && !isPractice ? (
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
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Estudante</p>
                        <StudentNameButton
                          name={studentLabel}
                          onClick={openStudentDialog}
                          className="block w-full break-words text-left font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                      {classLabelVisivel ? (
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Série / Turma</p>
                          <p className="break-words font-medium" title={classLabelVisivel}>
                            {classLabelVisivel}
                          </p>
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Escola</p>
                        <p className="break-words font-medium" title={schoolName || "—"}>
                          {schoolName || "—"}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Data</p>
                        <p className="truncate font-medium" title={todayLabel()}>
                          {todayLabel()}
                        </p>
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
                    <Button
                      className="w-full"
                      disabled={!hasSession}
                      onClick={() => setPhase("microfone")}
                    >
                      {isPractice ? "Iniciar prática →" : "Iniciar avaliação →"}
                    </Button>
                  </div>
                ) : null}

                {phase === "microfone" ? (
                  <MicrophoneTestStep
                    continuePending={savingMic}
                    onContinue={(blob) => void handleMicContinue(blob)}
                  />
                ) : null}

                {phase === "abas" ? (
                  <div id="fluency-wizard-scroll">
                  <Tabs value={activeTab} onValueChange={handleTabChange}>
                    {isPractice ? null : (
                      <TabsList>
                        {PRACTICE_TABS.map((tab) => {
                          const unsaved =
                            (tab.id === "palavras" && q1Result && !q1Saved) ||
                            (tab.id === "pouco-comuns" && q2Result && !q2Saved) ||
                            (tab.id === "texto" && q3Result && !q3Saved);
                          return (
                            <TabsTrigger
                              key={tab.id}
                              value={tab.id}
                              disabled={
                                Boolean(savingFluency) ||
                                (Boolean(recordingTab) && recordingTab !== tab.id)
                              }
                              className="gap-2"
                            >
                              {tab.label}
                              {unsaved ? (
                                <span
                                  className="h-1.5 w-1.5 rounded-full bg-amber-500"
                                  title="Alterações não salvas"
                                />
                              ) : null}
                            </TabsTrigger>
                          );
                        })}
                      </TabsList>
                    )}

                    <TabsContent
                      value="palavras"
                      forceMount
                      className={cn(
                        "data-[state=inactive]:hidden",
                        activeTab !== "palavras" && "hidden"
                      )}
                    >
                      <WordListFluencyStep
                        questionLabel="QUESTÃO 1"
                        title={isPractice ? "Praticar palavras conhecidas" : "Lista de palavras"}
                        words={q1Items}
                        continuePending={savingFluency}
                        continueLabel="Salvar esta parte"
                        remoteAudioSrc={remoteAudio.q1}
                        readOnly={viewMode || submitted}
                        onResultChange={handleQ1Result}
                        onContinue={() => void handleContinueAfterQ1()}
                        onRunningChange={(running) =>
                          setRecordingTab((prev) =>
                            running ? "palavras" : prev === "palavras" ? null : prev
                          )
                        }
                      />
                    </TabsContent>

                    <TabsContent
                      value="pouco-comuns"
                      forceMount
                      className={cn(
                        "data-[state=inactive]:hidden",
                        activeTab !== "pouco-comuns" && "hidden"
                      )}
                    >
                      <WordListFluencyStep
                        questionLabel="QUESTÃO 2"
                        title={
                          isPractice
                            ? "Praticar palavras pouco conhecidas"
                            : "Lista de palavras pouco comuns"
                        }
                        words={q2Items}
                        continuePending={savingFluency}
                        continueLabel="Salvar esta parte"
                        remoteAudioSrc={remoteAudio.q2}
                        readOnly={viewMode || submitted}
                        onResultChange={handleQ2Result}
                        onContinue={() => void handleContinueAfterQ2()}
                        onRunningChange={(running) =>
                          setRecordingTab((prev) =>
                            running ? "pouco-comuns" : prev === "pouco-comuns" ? null : prev
                          )
                        }
                      />
                    </TabsContent>

                    <TabsContent
                      value="texto"
                      forceMount
                      className={cn(
                        "data-[state=inactive]:hidden",
                        activeTab !== "texto" && "hidden"
                      )}
                    >
                      <NarrativeFluencyStep
                        title={text?.title ?? textTitleParam}
                        content={text?.content ?? ""}
                        continuePending={savingFluency}
                        continueLabel="Salvar esta parte"
                        remoteAudioSrc={remoteAudio.q3}
                        readOnly={viewMode || submitted}
                        onResultChange={handleQ3Result}
                        onContinue={() => void handleContinueAfterQ3()}
                        onRunningChange={(running) =>
                          setRecordingTab((prev) =>
                            running ? "texto" : prev === "texto" ? null : prev
                          )
                        }
                      />
                    </TabsContent>

                    {!isPractice ? (
                      <>
                    <TabsContent
                      value="compreensao"
                      forceMount
                      className={cn(
                        "data-[state=inactive]:hidden",
                        activeTab !== "compreensao" && "hidden"
                      )}
                    >
                      <div className="space-y-6">
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
                                      disabled={viewMode || submitted}
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
                          disabled={
                            !comprehensionReady ||
                            savingComprehension ||
                            !hasSession ||
                            viewMode ||
                            submitted
                          }
                        >
                          {savingComprehension ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            "Salvar e ver Leiturômetro"
                          )}
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent
                      value="leiturometro"
                      forceMount
                      className={cn(
                        "data-[state=inactive]:hidden",
                        activeTab !== "leiturometro" && "hidden"
                      )}
                    >
                      <div className="space-y-6">
                        <h2 className="text-xl font-semibold">Relatório — Leiturômetro</h2>
                        {report ? (
                          <>
                            <Leiturometro
                              currentLevel={icaLevel}
                              score={report.icaScore ?? undefined}
                            />
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <PerfilLeitorBadge code={perfilCode} />
                            </div>
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
                            <div className="grid gap-3 sm:grid-cols-2">
                              {remoteAudio.mic_test ? (
                                <StudentAudioPlayer
                                  src={remoteAudio.mic_test}
                                  label="Áudio — teste de microfone"
                                />
                              ) : null}
                              {remoteAudio.q1 ? (
                                <StudentAudioPlayer src={remoteAudio.q1} label="Áudio — Q1 palavras" />
                              ) : null}
                              {remoteAudio.q2 ? (
                                <StudentAudioPlayer
                                  src={remoteAudio.q2}
                                  label="Áudio — Q2 pouco comuns"
                                />
                              ) : null}
                              {remoteAudio.q3 ? (
                                <StudentAudioPlayer src={remoteAudio.q3} label="Áudio — Q3 texto" />
                              ) : null}
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Salve a compreensão para gerar o relatório. Você pode visitar esta aba
                            a qualquer momento.
                          </p>
                        )}
                        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                          <Button
                            className="w-full sm:w-auto"
                            onClick={() => void handleSubmit()}
                            disabled={!report || submitting || submitted || viewMode || !hasSession}
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
                      </div>
                    </TabsContent>
                      </>
                    ) : null}
                  </Tabs>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <StudentInfoDialog
        open={studentDialogOpen}
        onOpenChange={setStudentDialogOpen}
        seed={{
          studentId,
          name: studentLabel,
          className: classLabelVisivel,
          schoolName,
          classId,
          schoolId,
          perfilCode,
        }}
      />
      <ConfirmDialog
        open={confirmExit}
        onOpenChange={setConfirmExit}
        title={isPractice ? "Sair da prática?" : "Sair da avaliação?"}
        description="O progresso local desta sessão pode ser perdido se ainda não foi salvo."
        confirmLabel="Sair"
        variant="destructive"
        icon={AlertTriangle}
        onConfirm={() => router.push(backHref)}
      />
    </FullscreenLayout>
  );
}
