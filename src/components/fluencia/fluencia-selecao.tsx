"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Gauge, Info, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  listEvaluations,
  listReadingSessions,
  type ReadingEvaluation,
  type ReadingEvaluationSession,
} from "@/lib/api/afirme-reading";
import { getApiErrorMessage } from "@/lib/api/errors";
import { AdminCityPicker } from "@/components/auth/admin-city-picker";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function sessionLabel(session: ReadingEvaluationSession) {
  const name = session.studentName ?? session.studentId;
  return `${name} · ${session.status}`;
}

export function FluenciaSelecao() {
  const router = useRouter();
  const [cityReady, setCityReady] = useState(false);
  const [evaluationId, setEvaluationId] = useState("");
  const [sessionId, setSessionId] = useState("");

  const [evaluations, setEvaluations] = useState<ReadingEvaluation[]>([]);
  const [sessions, setSessions] = useState<ReadingEvaluationSession[]>([]);
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const selectedEvaluation = useMemo(
    () => evaluations.find((item) => item.id === evaluationId) ?? null,
    [evaluations, evaluationId]
  );
  const selectedSession = useMemo(
    () => sessions.find((item) => item.id === sessionId) ?? null,
    [sessions, sessionId]
  );

  const applicableSessions = useMemo(
    () => sessions.filter((item) => item.status === "pendente" || item.status === "em_andamento"),
    [sessions]
  );

  const handleCityReadyChange = useCallback((ready: boolean) => {
    setCityReady(ready);
    if (!ready) {
      setEvaluations([]);
      setSessions([]);
      setEvaluationId("");
      setSessionId("");
    }
  }, []);

  const loadEvaluations = useCallback(async () => {
    setLoadingEvaluations(true);
    try {
      const data = await listEvaluations();
      const filtered = data.filter(
        (item) =>
          (item.assessmentType === "fluencia" || item.assessmentType === "completa") &&
          (item.status === "agendada" || item.status === "em_andamento")
      );
      setEvaluations(filtered);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Nao foi possivel carregar as avaliacoes."));
      setEvaluations([]);
    } finally {
      setLoadingEvaluations(false);
    }
  }, []);

  useEffect(() => {
    if (!cityReady) return;
    setEvaluationId("");
    setSessionId("");
    setSessions([]);
    void loadEvaluations();
  }, [cityReady, loadEvaluations]);

  useEffect(() => {
    if (!cityReady || !evaluationId) {
      setSessions([]);
      setSessionId("");
      return;
    }

    let cancelled = false;
    async function load() {
      setLoadingSessions(true);
      setSessionId("");
      try {
        const data = await listReadingSessions(evaluationId);
        if (!cancelled) setSessions(data);
      } catch (error) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, "Nao foi possivel carregar as sessoes."));
          setSessions([]);
        }
      } finally {
        if (!cancelled) setLoadingSessions(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [cityReady, evaluationId]);

  const canStart = Boolean(
    cityReady &&
      evaluationId &&
      sessionId &&
      selectedEvaluation?.readingTextId &&
      selectedSession?.studentId
  );

  function handleStart() {
    if (!selectedEvaluation || !selectedSession) {
      toast.error("Selecione uma avaliacao e uma sessao de aluno.");
      return;
    }
    const params = new URLSearchParams({
      evaluationId: selectedEvaluation.id,
      sessionId: selectedSession.id,
      texto: selectedEvaluation.readingTextId,
      aluno: selectedSession.studentId,
      assessmentType: selectedEvaluation.assessmentType,
    });
    router.push(`/app/avaliacao-fluencia/aplicar?${params.toString()}`);
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Compromisso Crianca Alfabetizada · ICA"
        title="Avaliacao de Fluencia Leitora"
        description="Selecione a avaliacao aplicada e a sessao do estudante para iniciar."
        icon={Gauge}
      />

      <Alert className="border-l-4 border-l-bluebrand-base">
        <Info className="h-4 w-4 text-bluebrand-base" />
        <AlertDescription>
          As sessoes sao criadas no apply da avaliacao. Escolha uma avaliacao agendada/em andamento e o
          aluno pendente correspondente.
        </AlertDescription>
      </Alert>

      <AdminCityPicker onCityReadyChange={handleCityReadyChange} />

      <Card>
        <CardContent className="grid gap-6 pt-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Avaliacao</Label>
              <Select
                value={evaluationId || undefined}
                onValueChange={setEvaluationId}
                disabled={!cityReady || loadingEvaluations}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !cityReady
                        ? "Selecione o municipio primeiro"
                        : loadingEvaluations
                          ? "Carregando avaliacoes..."
                          : "Selecione a avaliacao"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {evaluations.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title} · {item.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingEvaluations ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Carregando avaliacoes...
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sessao / estudante</Label>
              <Select
                value={sessionId || undefined}
                onValueChange={setSessionId}
                disabled={!evaluationId || loadingSessions}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !evaluationId
                        ? "Selecione a avaliacao primeiro"
                        : loadingSessions
                          ? "Carregando sessoes..."
                          : "Selecione o estudante"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {applicableSessions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {sessionLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingSessions ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Carregando sessoes...
                </p>
              ) : null}
            </div>

            {selectedSession ? (
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">Sessao selecionada</p>
                <p className="text-sm text-muted-foreground">
                  {selectedSession.studentName ?? selectedSession.studentId} · {selectedSession.status}
                </p>
                {selectedEvaluation ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Texto da avaliacao: {selectedEvaluation.readingTextId}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
        <Button className="w-full sm:w-auto" disabled={!canStart} onClick={handleStart}>
          Iniciar Avaliacao de Fluencia
        </Button>
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href="/app/configuracao-avaliacao">Configurar</Link>
        </Button>
        <Button variant="ghost" asChild className="w-full sm:w-auto">
          <Link href="/app">Inicio</Link>
        </Button>
      </div>
    </div>
  );
}
