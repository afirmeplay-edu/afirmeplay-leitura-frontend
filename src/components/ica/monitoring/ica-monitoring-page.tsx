"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, CalendarClock, ClipboardCheck, Library, RefreshCw, ScanLine, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { listBankQuestions } from "@/lib/api/afirme-reading/questions";
import { listAnswerSheets, listWrittenTestClasses, listWrittenTests } from "@/lib/api/afirme-reading/written-tests";
import type {
  AnswerSheetRun,
  BankQuestionType,
  WrittenTestClassApplication,
  WrittenTestClassStatus,
  WrittenTestSummary,
} from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import { ROUTES } from "@/config/routes";
import { CLASS_STATUS_LABEL, formatLocalDateTime } from "@/lib/ica/application";
import { ICA_BRAND } from "@/lib/ica/brand";
import { ICA_QUESTION_TYPES, QUESTION_ORIGIN_LABEL, QUESTION_TYPE_LABEL } from "@/lib/ica/questions";
import { IcaCityScope } from "@/components/ica/ica-city-scope";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** Detalhe por turma só das avaliações publicadas mais recentes (uma chamada por avaliação). */
const DETAIL_LIMIT = 20;
const BAR_COLOR = "#0F766E";

type ClassCounts = Record<WrittenTestClassStatus | "nao_aplicada", number>;

interface MonitoringData {
  drafts: number;
  published: number;
  bank: Record<BankQuestionType, number>;
  bankLer: number;
  classes: ClassCounts;
  /** Turmas distintas com aplicação, sem repetir a mesma turma em avaliações diferentes. */
  appliedClassCount: number;
  expectedStudents: number;
  cardsGenerated: number;
  runsFailed: number;
  /** Avaliações cujo detalhe de turmas ou de cartões falhou; os números abaixo não as incluem por completo. */
  failedDetails: number;
  upcoming: WrittenTestSummary[];
  publishedTests: WrittenTestSummary[];
  detailedTests: number;
}

const EMPTY_COUNTS: ClassCounts = { nao_aplicada: 0, agendada: 0, em_andamento: 0, encerrada: 0 };

function runCoversClass(run: AnswerSheetRun, classId: string) {
  return run.allClasses || run.classId === classId;
}

/**
 * Por avaliação, cada turma fica com a geração concluída mais recente que a cobre.
 * Uma geração "todas as turmas" e outra de uma turma só não entram as duas inteiras:
 * a mais nova leva as turmas que cobre e a mais antiga só entra na parte que sobrou,
 * na proporção dos alunos.
 */
function cardsFromRuns(applied: WrittenTestClassApplication[], runs: AnswerSheetRun[]) {
  const newestFirst = [...runs].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  const winner = new Map<string, AnswerSheetRun>();
  const latest = new Map<string, AnswerSheetRun>();
  for (const item of applied) {
    const covering = newestFirst.filter((run) => runCoversClass(run, item.classId));
    if (covering[0]) latest.set(item.classId, covering[0]);
    const done = covering.find((run) => run.status === "concluido");
    if (done) winner.set(item.classId, done);
  }

  const failed = new Set<string>();
  latest.forEach((run) => {
    if (run.status === "erro") failed.add(run.id);
  });

  const students = new Map(applied.map((item) => [item.classId, item.studentCount]));
  const wonByRun = new Map<string, { run: AnswerSheetRun; classIds: string[] }>();
  winner.forEach((run, classId) => {
    const entry = wonByRun.get(run.id) ?? { run, classIds: [] };
    entry.classIds.push(classId);
    wonByRun.set(run.id, entry);
  });

  let generated = 0;
  wonByRun.forEach(({ run, classIds }) => {
    const scope = applied.filter((item) => runCoversClass(run, item.classId));
    const scopeStudents = scope.reduce((sum, item) => sum + item.studentCount, 0);
    const wonStudents = classIds.reduce((sum, classId) => sum + (students.get(classId) ?? 0), 0);
    if (scopeStudents > 0 && wonStudents < scopeStudents) {
      generated += Math.round((run.generatedCount * wonStudents) / scopeStudents);
      return;
    }
    generated += run.generatedCount;
  });

  return { generated, failed: failed.size };
}

async function loadMonitoring(signal: AbortSignal): Promise<MonitoringData> {
  const totalOf = (promise: Promise<{ pagination: { total: number } }>) => promise.then((result) => result.pagination.total);
  const [drafts, publishedList, bankTotals, bankLer] = await Promise.all([
    totalOf(listWrittenTests({ status: "rascunho", per_page: 1 }, { signal })),
    listWrittenTests({ status: "publicada", per_page: 100 }, { signal }),
    Promise.all(ICA_QUESTION_TYPES.map((type) => totalOf(listBankQuestions({ type, per_page: 1 }, { signal })))),
    totalOf(listBankQuestions({ origin: "afirme_ler", per_page: 1 }, { signal })),
  ]);

  const publishedTests = publishedList.data;
  const detailed = publishedTests.slice(0, DETAIL_LIMIT);
  const perTest = await Promise.all(
    detailed.map(async (test) => {
      const [classesResult, runsResult] = await Promise.allSettled([
        listWrittenTestClasses(test.id).then((data) => data.classes ?? []),
        listAnswerSheets(test.id),
      ]);
      return {
        failed: classesResult.status === "rejected" || runsResult.status === "rejected",
        classes: classesResult.status === "fulfilled" ? classesResult.value : [],
        runs: runsResult.status === "fulfilled" ? runsResult.value : [],
      };
    })
  );

  const classes = { ...EMPTY_COUNTS };
  const studentsByClass = new Map<string, number>();
  let cardsGenerated = 0;
  let runsFailed = 0;
  let failedDetails = 0;
  for (const { classes: list, runs, failed } of perTest) {
    if (failed) failedDetails += 1;
    const applied = list.filter((item) => item.applied);
    for (const item of list) {
      classes[item.status ?? "nao_aplicada"] += 1;
      if (item.applied && !studentsByClass.has(item.classId)) studentsByClass.set(item.classId, item.studentCount);
    }
    const cards = cardsFromRuns(applied, runs);
    cardsGenerated += cards.generated;
    runsFailed += cards.failed;
  }
  const expectedStudents = [...studentsByClass.values()].reduce((sum, count) => sum + count, 0);

  const upcoming = publishedTests
    .filter((test) => test.nextApplicationStart)
    .sort((a, b) => (a.nextApplicationStart ?? "").localeCompare(b.nextApplicationStart ?? ""))
    .slice(0, 5);

  return {
    drafts,
    published: publishedList.pagination.total,
    bank: Object.fromEntries(ICA_QUESTION_TYPES.map((type, index) => [type, bankTotals[index]])) as Record<
      BankQuestionType,
      number
    >,
    bankLer,
    classes,
    appliedClassCount: studentsByClass.size,
    expectedStudents,
    cardsGenerated,
    runsFailed,
    failedDetails,
    upcoming,
    publishedTests,
    detailedTests: detailed.length,
  };
}

export function IcaMonitoringPage() {
  return (
    <IcaCityScope emptyMessage="Selecione o município para ver o acompanhamento do ICA.">
      <IcaMonitoring />
    </IcaCityScope>
  );
}

function IcaMonitoring() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    loadMonitoring(controller.signal)
      .then((result) => !controller.signal.aborted && setData(result))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(normalizeApiError(err, "Não foi possível carregar o acompanhamento do ICA.").message);
      })
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [reloadKey]);

  const classChart = data
    ? (["nao_aplicada", "agendada", "em_andamento", "encerrada"] as const).map((key) => ({
        status: key === "nao_aplicada" ? "Não aplicada" : CLASS_STATUS_LABEL[key],
        turmas: data.classes[key],
      }))
    : [];
  const bankChart = data ? ICA_QUESTION_TYPES.map((type) => ({ tipo: QUESTION_TYPE_LABEL[type], questoes: data.bank[type] })) : [];
  const appliedClasses = data?.appliedClassCount ?? 0;

  return (
    <PageShell>
      <PageHeader
        brand={ICA_BRAND}
        title="Acompanhamento"
        description="Situação do banco de questões, das avaliações e da aplicação nas turmas do município."
        icon={BarChart3}
      >
        <Button variant="outline" className="w-full sm:w-auto" onClick={() => setReloadKey((key) => key + 1)} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </PageHeader>

      <Alert>
        <BarChart3 className="h-4 w-4" />
        <AlertDescription>
          O desempenho dos alunos (acertos por turma e por habilidade) depende da correção dos cartões-resposta, que ainda
          não existe no servidor. Este painel mostra o andamento da preparação e da aplicação.
        </AlertDescription>
      </Alert>

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Indicadores do ICA">
            <StatCard
              variant="metric"
              label="Questões no banco"
              value={data ? ICA_QUESTION_TYPES.reduce((sum, type) => sum + data.bank[type], 0) : 0}
              trend={data ? `${data.bankLer} criadas no ${QUESTION_ORIGIN_LABEL.afirme_ler}` : undefined}
              icon={Library}
              loading={loading}
            />
            <StatCard
              variant="metric"
              label="Avaliações"
              value={data ? data.published + data.drafts : 0}
              trend={data ? `${data.published} publicadas · ${data.drafts} em rascunho` : undefined}
              icon={ClipboardCheck}
              loading={loading}
            />
            <StatCard
              variant="metric"
              label="Turmas com aplicação"
              value={appliedClasses}
              trend={data ? `${data.expectedStudents} alunos previstos` : undefined}
              icon={Users}
              loading={loading}
            />
            <StatCard
              variant="featured"
              label="Cartões-resposta gerados"
              value={data ? data.cardsGenerated : 0}
              trend={data?.runsFailed ? `${data.runsFailed} geração(ões) com erro` : "Última geração de cada recorte"}
              icon={ScanLine}
              loading={loading}
            />
          </section>

          {data && (data.publishedTests.length > data.detailedTests || data.published > data.publishedTests.length || data.failedDetails > 0) ? (
            <p className="text-xs text-muted-foreground">
              {data.publishedTests.length > data.detailedTests
                ? `Turmas, alunos e cartões consideram as ${data.detailedTests} avaliações publicadas criadas mais recentemente. `
                : null}
              {data.published > data.publishedTests.length
                ? `A lista trouxe ${data.publishedTests.length} de ${data.published} avaliações publicadas. `
                : null}
              {data.failedDetails > 0
                ? data.failedDetails === 1
                  ? "1 avaliação não pôde ser consultada."
                  : `${data.failedDetails} avaliações não puderam ser consultadas.`
                : null}
            </p>
          ) : null}

          <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
            <SectionCard
              title="Aplicações por situação"
              description="Cada turma conta uma vez por avaliação publicada."
              icon={Users}
            >
              <div className="h-[220px] w-full min-w-0 sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis width={32} tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="turmas" name="Turmas" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
            <SectionCard title="Banco de questões por tipo" description="Visíveis para o seu perfil." icon={Library}>
              <div className="h-[220px] w-full min-w-0 sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bankChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tipo" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis width={32} tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="questoes" name="Questões" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Próximas aplicações" description="Inícios agendados no fuso de cada turma." icon={CalendarClock}>
            {!data || data.upcoming.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {loading ? "Carregando..." : "Nenhuma aplicação agendada."}
              </p>
            ) : (
              <div className="-mx-1 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Avaliação</TableHead>
                      <TableHead>Próximo início</TableHead>
                      <TableHead>Turmas aplicadas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.upcoming.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell className="max-w-[320px] truncate font-medium" title={test.title}>
                          {test.title}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatLocalDateTime(test.nextApplicationStart)}</TableCell>
                        <TableCell className="tabular-nums">
                          {test.appliedClassesCount}/{test.classIds.length}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-9" asChild>
                            <Link href={ROUTES.ica.avaliacoes.aplicacao(test.id)}>
                              <ScanLine className="h-4 w-4" />
                              Aplicação
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </>
      )}
    </PageShell>
  );
}
