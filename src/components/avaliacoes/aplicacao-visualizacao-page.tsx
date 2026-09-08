"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, List, MessageCircleQuestion } from "lucide-react";
import { toast } from "sonner";
import {
  fetchFluencyAudioObjectUrl,
  getStudentApplication,
  getWordList,
  type FluencyWordStatus,
  type StudentApplicationListPart,
  type StudentApplicationResult,
  type StudentApplicationWord,
} from "@/lib/api/afirme-reading";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/api/errors";
import { EDICAO_LABEL, type EdicaoCode } from "@/lib/relatorios-fluencia/types";
import { tokenizeNarrative } from "@/components/fluencia/fluency-browser-utils";
import { assignSentenceIndices } from "@/components/fluencia/manual-marking";
import {
  ReadingCursorStage,
  type ReadingCursorItem,
} from "@/components/fluencia/reading-cursor-stage";
import { StudentAudioPlayer } from "@/components/fluencia/student-audio-player";
import { AdminCityPicker } from "@/components/auth/admin-city-picker";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/shared/page-shell";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<FluencyWordStatus, string> = {
  nao_leu: "Não leu",
  acertou: "Acertou",
  inventou: "Inventou",
  silabou: "Silabou",
  soletrou: "Soletrou",
  errou: "Errou",
};

const STATUS_CLASS: Record<FluencyWordStatus, string> = {
  nao_leu: "border-slate-300 bg-slate-100 text-slate-600",
  acertou: "border-emerald-300 bg-emerald-50 text-emerald-900",
  inventou: "border-red-300 bg-red-50 text-red-900",
  silabou: "border-violet-300 bg-violet-50 text-violet-900",
  soletrou: "border-violet-300 bg-violet-50 text-violet-900",
  errou: "border-red-300 bg-red-50 text-red-900",
};

function statusLabel(status: FluencyWordStatus | null | undefined) {
  if (!status) return "Sem marca";
  return STATUS_LABEL[status] ?? status;
}

function expandListPart(
  part: StudentApplicationListPart | null | undefined,
  catalogItems?: string[]
): Array<{ index: number; label: string; status: FluencyWordStatus | null }> {
  if (!part) return [];
  const byIndex = new Map((part.words ?? []).map((word) => [word.index, word]));
  const lastPos = part.lastWordPosition ?? 0;
  const maxFromWords = (part.words ?? []).reduce((max, word) => Math.max(max, word.index), -1);
  const maxFromCatalog = (catalogItems?.length ?? 0) - 1;
  const maxIndex = Math.max(maxFromWords, maxFromCatalog, lastPos > 0 ? lastPos - 1 : -1);
  if (maxIndex < 0) return [];

  const items: Array<{ index: number; label: string; status: FluencyWordStatus | null }> = [];
  for (let index = 0; index <= maxIndex; index += 1) {
    const marked = byIndex.get(index);
    items.push({
      index,
      label: marked?.word || catalogItems?.[index] || "—",
      status: marked?.status ?? null,
    });
  }
  return items;
}

function textMarkings(aplicacao: StudentApplicationResult | null): StudentApplicationWord[] {
  const texto = aplicacao?.texto;
  if (!texto) return [];
  return texto.words ?? texto.markings ?? [];
}

function evaluationKindLabel(kind: StudentApplicationResult["evaluationKind"]) {
  if (!kind) return "Fluência";
  return EDICAO_LABEL[kind as EdicaoCode] ?? kind;
}

export function AplicacaoVisualizacaoPage({
  evaluationId,
  studentId,
}: {
  evaluationId: string;
  studentId: string;
}) {
  const [cityReady, setCityReady] = useState(false);
  const [cityKey, setCityKey] = useState("none");
  const [aplicacao, setAplicacao] = useState<StudentApplicationResult | null>(null);
  const [listCatalog, setListCatalog] = useState<Record<string, string[]>>({});
  const [audio, setAudio] = useState<{ q1?: string; q2?: string; q3?: string }>({});
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState("lista1");

  const handleCityReadyChange = useCallback((ready: boolean, cityId: string | null) => {
    setCityReady(ready);
    setCityKey(cityId || "none");
    if (!ready) setAplicacao(null);
  }, []);

  const load = useCallback(async () => {
    if (!cityReady || !studentId || !evaluationId) return;
    setLoading(true);
    setNotFound(false);
    try {
      const data = await getStudentApplication(studentId, evaluationId);
      setAplicacao(data);

      const ids = [data.lista1?.wordListId, data.lista2?.wordListId].filter(
        (id): id is string => Boolean(id)
      );
      if (ids.length) {
        const entries = await Promise.all(
          ids.map(async (id) => {
            try {
              const list = await getWordList(id);
              return [id, Array.isArray(list.items) ? list.items : []] as const;
            } catch {
              return [id, []] as const;
            }
          })
        );
        setListCatalog(Object.fromEntries(entries));
      } else {
        setListCatalog({});
      }
    } catch (error) {
      if (getApiErrorStatus(error) === 404) {
        setNotFound(true);
        setAplicacao(null);
        return;
      }
      toast.error(getApiErrorMessage(error, "Não foi possível carregar a prova aplicada."));
    } finally {
      setLoading(false);
    }
  }, [cityReady, studentId, evaluationId]);

  useEffect(() => {
    if (!cityReady || cityKey === "none") return;
    void load();
  }, [cityReady, cityKey, load]);

  useEffect(() => {
    if (!aplicacao?.sessionId) return;
    const sessionId = aplicacao.sessionId;
    let cancelled = false;
    const created: string[] = [];

    async function resolvePart(part: "q1" | "q2" | "q3") {
      try {
        const url = await fetchFluencyAudioObjectUrl(sessionId, part);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return undefined;
        }
        created.push(url);
        return url;
      } catch {
        return undefined;
      }
    }

    void (async () => {
      const [q1, q2, q3] = await Promise.all([
        resolvePart("q1"),
        resolvePart("q2"),
        resolvePart("q3"),
      ]);
      if (cancelled) return;
      setAudio({ q1, q2, q3 });
    })();

    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [aplicacao]);

  const lista1Items = useMemo(
    () =>
      expandListPart(
        aplicacao?.lista1,
        aplicacao?.lista1?.wordListId ? listCatalog[aplicacao.lista1.wordListId] : undefined
      ),
    [aplicacao, listCatalog]
  );
  const lista2Items = useMemo(
    () =>
      expandListPart(
        aplicacao?.lista2,
        aplicacao?.lista2?.wordListId ? listCatalog[aplicacao.lista2.wordListId] : undefined
      ),
    [aplicacao, listCatalog]
  );

  const textItems = useMemo<ReadingCursorItem[]>(() => {
    const texto = aplicacao?.texto;
    if (!texto?.content) return [];
    const { tokens } = tokenizeNarrative(texto.content);
    const sentenceIndex = assignSentenceIndices(tokens.map((token) => token.display));
    const byIndex = new Map(textMarkings(aplicacao).map((word) => [word.index, word]));
    const lastPos = texto.lastWordPosition ?? texto.wordsRead ?? 0;
    const hasMarkings = Boolean(texto.hasWordMarkings);

    return tokens.map((token, index) => {
      const marked = byIndex.get(index);
      let status: FluencyWordStatus | null = marked?.status ?? null;
      if (!hasMarkings && lastPos > 0 && index >= lastPos) {
        status = "nao_leu";
      }
      return {
        id: `t-${index}`,
        label: token.display,
        status,
        sentenceIndex: sentenceIndex[index] ?? 0,
      };
    });
  }, [aplicacao]);

  const textCursor = useMemo(() => {
    const lastPos = aplicacao?.texto?.lastWordPosition ?? aplicacao?.texto?.wordsRead ?? 0;
    if (lastPos <= 0) return 0;
    return Math.max(0, Math.min(textItems.length - 1, lastPos - 1));
  }, [aplicacao, textItems.length]);

  const errorLines = aplicacao?.texto?.lines?.filter((line) => (line.wrongWordsCount ?? 0) > 0) ?? [];

  return (
    <PageShell>
      <PageHeader
        icon={BookOpen}
        title={aplicacao?.studentName ?? "Visualização da prova"}
        description="Leitura palavra a palavra das listas, do texto narrativo e da compreensão."
      >
        <Button variant="outline" asChild>
          <Link href={`/app/avaliacoes/${evaluationId}`}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </PageHeader>

      <AdminCityPicker onCityReadyChange={handleCityReadyChange} />

      {loading ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      ) : notFound ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Prova não encontrada. O aluno ainda não tem sessão aplicada nesta avaliação.
          </CardContent>
        </Card>
      ) : !aplicacao ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {!cityReady
              ? "Selecione o município para carregar a prova."
              : "Não foi possível exibir a aplicação."}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{evaluationKindLabel(aplicacao.evaluationKind)}</Badge>
            <Badge variant="outline">{aplicacao.status}</Badge>
            {aplicacao.texto?.title ? (
              <Badge variant="outline">{aplicacao.texto.title}</Badge>
            ) : null}
          </div>

          <StatusLegend />

          <Tabs value={tab} onValueChange={setTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="lista1" className="gap-2">
                <List className="h-4 w-4" />
                Lista 1
              </TabsTrigger>
              <TabsTrigger value="lista2" className="gap-2">
                <List className="h-4 w-4" />
                Lista 2
              </TabsTrigger>
              <TabsTrigger value="texto" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Texto
              </TabsTrigger>
              <TabsTrigger value="compreensao" className="gap-2">
                <MessageCircleQuestion className="h-4 w-4" />
                Compreensão
              </TabsTrigger>
            </TabsList>

            <TabsContent value="lista1">
              <WordListReview
                title="Lista de palavras"
                items={lista1Items}
                lastWordPosition={aplicacao.lista1?.lastWordPosition}
                audioSrc={audio.q1}
              />
            </TabsContent>
            <TabsContent value="lista2">
              <WordListReview
                title="Palavras pouco comuns"
                items={lista2Items}
                lastWordPosition={aplicacao.lista2?.lastWordPosition}
                audioSrc={audio.q2}
              />
            </TabsContent>
            <TabsContent value="texto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {aplicacao.texto?.title ?? "Texto narrativo"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {aplicacao.texto?.hasWordMarkings
                      ? "Palavras coloridas conforme a marcação do professor."
                      : "Texto completo. O destaque indica até onde o aluno leu."}
                    {aplicacao.texto?.wordsRead != null && aplicacao.texto?.totalWords != null
                      ? ` ${aplicacao.texto.wordsRead}/${aplicacao.texto.totalWords} palavras lidas.`
                      : null}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {textItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Texto não disponível nesta aplicação.</p>
                  ) : (
                    <ReadingCursorStage
                      items={textItems}
                      cursor={textCursor}
                      listening={false}
                      mode="narrative"
                      showListening={false}
                      hideHero
                    />
                  )}
                  {errorLines.length > 0 && !aplicacao.texto?.hasWordMarkings ? (
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Linhas com erro
                      </p>
                      <ul className="space-y-1 text-sm">
                        {errorLines.map((line) => (
                          <li key={line.lineIndex}>
                            <span className="font-medium">Linha {line.lineIndex + 1}:</span>{" "}
                            {line.text}{" "}
                            <span className="text-muted-foreground">
                              ({line.wrongWordsCount}{" "}
                              {line.wrongWordsCount === 1 ? "erro" : "erros"})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <StudentAudioPlayer src={audio.q3} label="Áudio do texto" />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="compreensao">
              <ComprehensionReview aplicacao={aplicacao} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </PageShell>
  );
}

function StatusLegend() {
  const statuses: FluencyWordStatus[] = [
    "acertou",
    "errou",
    "inventou",
    "soletrou",
    "silabou",
    "nao_leu",
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((status) => (
        <span
          key={status}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-medium",
            STATUS_CLASS[status]
          )}
        >
          {STATUS_LABEL[status]}
        </span>
      ))}
    </div>
  );
}

function WordListReview({
  title,
  items,
  lastWordPosition,
  audioSrc,
}: {
  title: string;
  items: Array<{ index: number; label: string; status: FluencyWordStatus | null }>;
  lastWordPosition?: number | null;
  audioSrc?: string;
}) {
  const cursor = lastWordPosition && lastWordPosition > 0 ? lastWordPosition - 1 : -1;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {items.length === 0
            ? "Esta parte não está disponível nesta aplicação."
            : lastWordPosition
              ? `Última palavra lida na posição ${lastWordPosition}.`
              : "Marcações da lista."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length > 0 ? (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <li
                key={item.index}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-semibold tracking-wide",
                  item.status ? STATUS_CLASS[item.status] : "border-slate-200 bg-white text-slate-800",
                  cursor === item.index && "ring-2 ring-brand-highlight"
                )}
                title={statusLabel(item.status)}
              >
                <span className="mr-2 text-xs font-normal text-muted-foreground">
                  {String(item.index + 1).padStart(2, "0")}.
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        ) : null}
        <StudentAudioPlayer src={audioSrc} label={`Áudio — ${title}`} />
      </CardContent>
    </Card>
  );
}

function ComprehensionReview({ aplicacao }: { aplicacao: StudentApplicationResult }) {
  const data = aplicacao.compreensao;
  const answers = data?.answers ?? [];
  const score =
    data?.score != null
      ? Number.isInteger(data.score)
        ? `${data.score}%`
        : `${data.score.toFixed(1)}%`
      : "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Compreensão leitora</CardTitle>
        <p className="text-sm text-muted-foreground">
          {data?.correctCount != null && data.total != null
            ? `${data.correctCount}/${data.total} acertos · ${score}`
            : "Sem resultado de compreensão nesta aplicação."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {answers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma resposta detalhada disponível.</p>
        ) : (
          <ol className="space-y-4">
            {answers.map((answer, index) => {
              const statement = answer.statement || answer.question || `Pergunta ${index + 1}`;
              const selected =
                answer.selectedOptionText ??
                (answer.options && answer.selectedOption != null
                  ? answer.options[answer.selectedOption]
                  : null) ??
                (answer.selectedOption != null ? `Alternativa ${answer.selectedOption + 1}` : "—");
              return (
                <li key={answer.readingTextQuestionId ?? answer.questionId ?? index} className="space-y-1">
                  <p className="font-medium">{statement}</p>
                  <p className="text-sm">
                    Resposta: {selected}{" "}
                    {answer.isCorrect == null ? null : (
                      <Badge variant={answer.isCorrect ? "success" : "destructive"} className="ml-1">
                        {answer.isCorrect ? "Correta" : "Incorreta"}
                      </Badge>
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
