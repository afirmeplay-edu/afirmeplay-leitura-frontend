"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Headphones, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import {
  fetchGuidedAudioObjectUrl,
  getGuidedSession,
  getReadingText,
  listGuidedSessions,
  listReadingTexts,
  resolveGuidedSessionAudioUrl,
  type GuidedSession,
  type ReadingQuestion,
  type ReadingText,
} from "@/lib/api/afirme-reading";
import { getApiErrorMessage } from "@/lib/api/errors";
import { AdminCityPicker } from "@/components/auth/admin-city-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "finalizada" | "em_andamento";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

function formatMetric(value: number | null | undefined, suffix = "") {
  if (value == null) return "—";
  return `${value}${suffix}`;
}

export function RevisaoLeituraGuiadaPage() {
  const [cityReady, setCityReady] = useState(false);
  const [cityKey, setCityKey] = useState("none");

  const [texts, setTexts] = useState<ReadingText[]>([]);
  const [sessions, setSessions] = useState<GuidedSession[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("finalizada");
  const [textFilter, setTextFilter] = useState<string>("all");

  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GuidedSession | null>(null);
  const [detailQuestions, setDetailQuestions] = useState<ReadingQuestion[]>([]);
  const [audioObjectUrl, setAudioObjectUrl] = useState<string | null>(null);

  const textTitleById = useMemo(() => {
    const map = new Map<string, string>();
    texts.forEach((text) => map.set(text.id, text.title));
    return map;
  }, [texts]);

  const handleCityReadyChange = useCallback((ready: boolean, cityId: string | null) => {
    setCityReady(ready);
    setCityKey(cityId || "none");
    if (!ready) {
      setSessions([]);
      setSelectedId(null);
      setDetail(null);
    }
  }, []);

  const loadTexts = useCallback(async () => {
    try {
      const data = await listReadingTexts({ orderBy: "title" });
      setTexts(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Nao foi possivel carregar os textos."));
    }
  }, []);

  const loadSessions = useCallback(async () => {
    if (!cityReady) return;
    setLoadingList(true);
    try {
      const data = await listGuidedSessions({
        status: statusFilter === "all" ? undefined : statusFilter,
        readingTextId: textFilter === "all" ? undefined : textFilter,
        limit: 100,
      });
      setSessions(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Nao foi possivel carregar as sessoes."));
      setSessions([]);
    } finally {
      setLoadingList(false);
    }
  }, [cityReady, statusFilter, textFilter]);

  useEffect(() => {
    if (!cityReady) return;
    void loadTexts();
    void loadSessions();
  }, [cityReady, cityKey, loadTexts, loadSessions]);

  useEffect(() => {
    return () => {
      if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl);
    };
  }, [audioObjectUrl]);

  async function openDetail(session: GuidedSession) {
    setSelectedId(session.id);
    setLoadingDetail(true);
    setDetail(null);
    setDetailQuestions([]);
    if (audioObjectUrl) {
      URL.revokeObjectURL(audioObjectUrl);
      setAudioObjectUrl(null);
    }

    try {
      const full = await getGuidedSession(session.id);
      setDetail(full);

      try {
        const text = await getReadingText(full.readingTextId);
        setDetailQuestions(text.questions ?? []);
      } catch {
        setDetailQuestions([]);
      }

      const audioUrl = resolveGuidedSessionAudioUrl(full);
      if (audioUrl) {
        setLoadingAudio(true);
        try {
          const objectUrl = await fetchGuidedAudioObjectUrl(audioUrl);
          setAudioObjectUrl(objectUrl);
        } catch (error) {
          toast.error(getApiErrorMessage(error, "Nao foi possivel carregar o audio."));
        } finally {
          setLoadingAudio(false);
        }
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Nao foi possivel carregar o detalhe."));
      setSelectedId(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  function closeDetail() {
    setSelectedId(null);
    setDetail(null);
    setDetailQuestions([]);
    if (audioObjectUrl) {
      URL.revokeObjectURL(audioObjectUrl);
      setAudioObjectUrl(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-bluebrand-deep">Revisao — Leitura Guiada</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Veja alunos que ja realizaram a avaliacao, o que erraram na compreensao e ouça o audio.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void loadSessions()}
          disabled={!cityReady || loadingList}
        >
          <RefreshCw className={cn("h-4 w-4", loadingList && "animate-spin")} />
          Atualizar
        </Button>
      </section>

      <AdminCityPicker onCityReadyChange={handleCityReadyChange} />

      <section className="grid gap-4 rounded-xl border bg-white p-4 shadow-sm sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            disabled={!cityReady}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="finalizada">Finalizadas</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="all">Todas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Texto</Label>
          <Select
            value={textFilter}
            onValueChange={setTextFilter}
            disabled={!cityReady}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os textos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os textos</SelectItem>
              {texts.map((text) => (
                <SelectItem key={text.id} value={text.id}>
                  {text.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {!cityReady ? (
          <p className="p-6 text-sm text-muted-foreground">
            Selecione o municipio para listar as sessoes.
          </p>
        ) : loadingList ? (
          <div className="flex items-center gap-2 p-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando sessoes...
          </div>
        ) : sessions.length === 0 ? (
          <p className="p-6 text-sm italic text-muted-foreground">
            Nenhuma sessao encontrada para os filtros atuais.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-left">
                  <th className="border-b p-3 font-medium">Aluno</th>
                  <th className="border-b p-3 font-medium">Texto</th>
                  <th className="border-b p-3 text-center font-medium">PLCM</th>
                  <th className="border-b p-3 text-center font-medium">Precisao</th>
                  <th className="border-b p-3 text-center font-medium">Prosodia</th>
                  <th className="border-b p-3 text-center font-medium">Audio</th>
                  <th className="border-b p-3 font-medium">Data</th>
                  <th className="border-b p-3 text-center font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50">
                    <td className="border-b p-3 font-medium text-bluebrand-deep">
                      {session.studentName || "Aluno"}
                    </td>
                    <td className="border-b p-3">
                      {textTitleById.get(session.readingTextId) || "Texto"}
                    </td>
                    <td className="border-b p-3 text-center">
                      {formatMetric(session.calculatedPlcm)}
                    </td>
                    <td className="border-b p-3 text-center">
                      {formatMetric(session.calculatedAccuracy, "%")}
                    </td>
                    <td className="border-b p-3 text-center">{session.prosodyLevel}</td>
                    <td className="border-b p-3 text-center">
                      {session.hasAudio ? (
                        <span className="inline-flex items-center gap-1 text-blue-700">
                          <Headphones className="h-3.5 w-3.5" />
                          Sim
                        </span>
                      ) : (
                        "Nao"
                      )}
                    </td>
                    <td className="border-b p-3 text-xs text-muted-foreground">
                      {formatDate(session.submittedAt || session.createdAt)}
                    </td>
                    <td className="border-b p-3 text-center">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void openDetail(session)}
                      >
                        Revisar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedId ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-bold text-bluebrand-deep">Detalhe da sessao</h2>
              <Button type="button" variant="ghost" size="icon" onClick={closeDetail}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              {loadingDetail || !detail ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Carregando detalhe...
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Aluno</p>
                    <p className="font-semibold text-bluebrand-deep">
                      {detail.studentName || "Aluno"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {textTitleById.get(detail.readingTextId) || "Texto"} · {detail.status}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard label="PLCM" value={formatMetric(detail.calculatedPlcm)} />
                    <MetricCard
                      label="Precisao"
                      value={formatMetric(detail.calculatedAccuracy, "%")}
                    />
                    <MetricCard label="Erros (oral)" value={String(detail.errorsCount)} />
                    <MetricCard label="Prosodia" value={String(detail.prosodyLevel)} />
                    <MetricCard
                      label="Compreensao"
                      value={formatMetric(detail.comprehensionScore, "%")}
                    />
                    <MetricCard
                      label="Acertos"
                      value={
                        detail.comprehensionCorrectCount != null &&
                        detail.comprehensionTotal != null
                          ? `${detail.comprehensionCorrectCount}/${detail.comprehensionTotal}`
                          : "—"
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-bluebrand-deep">Audio da leitura</h3>
                    {loadingAudio ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando audio...
                      </div>
                    ) : audioObjectUrl ? (
                      <audio controls src={audioObjectUrl} className="w-full" />
                    ) : (
                      <p className="text-sm text-muted-foreground">Sessao sem audio.</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-bluebrand-deep">Compreensao</h3>
                    {!detail.answers?.length ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma resposta de compreensao registrada.
                      </p>
                    ) : (
                      detail.answers.map((answer, index) => {
                        const question = detailQuestions.find(
                          (item) => item.id === answer.readingTextQuestionId
                        );
                        const selected =
                          question && answer.selectedOption != null
                            ? question.options[answer.selectedOption]
                            : null;
                        const correct =
                          question && question.correctOption != null
                            ? question.options[question.correctOption]
                            : null;

                        return (
                          <div
                            key={answer.id || `${answer.readingTextQuestionId}-${index}`}
                            className={cn(
                              "rounded-lg border p-3 text-sm",
                              answer.isCorrect
                                ? "border-emerald-200 bg-emerald-50/60"
                                : "border-red-200 bg-red-50/60"
                            )}
                          >
                            <p className="font-medium text-bluebrand-deep">
                              {index + 1}. {question?.statement || "Pergunta"}
                            </p>
                            <p className="mt-2">
                              Resposta:{" "}
                              <span className="font-medium">
                                {selected ?? `Opcao ${answer.selectedOption}`}
                              </span>
                            </p>
                            {correct ? (
                              <p className="mt-1 text-muted-foreground">
                                Gabarito: {correct}
                              </p>
                            ) : null}
                            <p className="mt-1 text-xs font-medium">
                              {answer.isCorrect ? "Correta" : "Incorreta"}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold text-bluebrand-deep">{value}</p>
    </div>
  );
}
