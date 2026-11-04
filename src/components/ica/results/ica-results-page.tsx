"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Download,
  GraduationCap,
  School,
  Search,
  Users,
} from "lucide-react";
import {
  downloadIcaResultsCsv,
  getIcaDashboard,
  ICA_LEVEL_NAMES,
  ICA_STATUS_VALUES,
  type IcaDashboard,
  type IcaDashboardQuery,
  type IcaDashboardRow,
  type IcaRowLevel,
} from "@/lib/api/afirme-reading/ica-results";
import { getWrittenTest, listWrittenTests } from "@/lib/api/afirme-reading/written-tests";
import type { WrittenTestNamedRef, WrittenTestSummary } from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import { ICA_BRAND } from "@/lib/ica/brand";
import { IcaCityScope } from "@/components/ica/ica-city-scope";
import { PageHeader } from "@/components/layout/page-header";
import { ChipFilter } from "@/components/shared/chip-filter";
import { PageShell } from "@/components/shared/page-shell";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ALL = "all";

type ViewMode = "visao" | "escolas" | "series" | "turmas" | "alunos";
type GroupMode = "escolas" | "series" | "turmas" | "recorte";

interface NamedOption {
  id: string;
  name: string;
}

interface ClassOption extends NamedOption {
  schoolId: string | null;
  gradeId: string | null;
}

const ROW_KIND: Record<IcaRowLevel, string> = {
  escola: "Escola",
  serie: "Série",
  turma: "Turma",
  aluno: "Aluno",
};

function formatOne(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatTwo(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: number | null | undefined) {
  const text = formatOne(value);
  return text === "—" ? text : `${text}%`;
}

function formatCount(value: number | null | undefined) {
  return typeof value === "number" ? value.toLocaleString("pt-BR") : "—";
}

function levelCount(row: IcaDashboardRow, name: string) {
  if (!row.niveis) return null;
  return row.niveis[name] ?? 0;
}

function SelectFilter({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: NamedOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function studentList(dashboard: IcaDashboard | null): IcaDashboardRow[] {
  if (!dashboard) return [];
  if (dashboard.students.length) return dashboard.students;
  return dashboard.rows.filter((row) => row.rowLevel === "aluno");
}

function rowsOf(dashboard: IcaDashboard | null, level: IcaRowLevel) {
  return (dashboard?.rows ?? []).filter((row) => row.rowLevel === level);
}

export function IcaResultsPage() {
  return (
    <IcaCityScope emptyMessage="Selecione o município para consultar o painel ICA.">
      <IcaResultsContent />
    </IcaCityScope>
  );
}

function IcaResultsContent() {
  const [tests, setTests] = useState<WrittenTestSummary[]>([]);
  const [schools, setSchools] = useState<WrittenTestNamedRef[]>([]);
  const [grades, setGrades] = useState<WrittenTestNamedRef[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [writtenTestId, setWrittenTestId] = useState("");
  const [schoolId, setSchoolId] = useState(ALL);
  const [gradeId, setGradeId] = useState(ALL);
  const [classId, setClassId] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [nivelFilter, setNivelFilter] = useState(ALL);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [view, setView] = useState<ViewMode>("visao");
  const [dashboard, setDashboard] = useState<IcaDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    void listWrittenTests({ status: "publicada", per_page: 100 }, { signal: controller.signal })
      .then((list) => {
        if (controller.signal.aborted) return;
        setTests(list.data);
        setWrittenTestId((current) => current || list.data[0]?.id || "");
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(normalizeApiError(reason, "Não foi possível carregar as avaliações escritas do município.").message);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setSchoolId(ALL);
    setGradeId(ALL);
    setClassId(ALL);
    if (!writtenTestId) {
      setSchools([]);
      setGrades([]);
      setClasses([]);
      return;
    }
    const controller = new AbortController();
    void getWrittenTest(writtenTestId)
      .then((detail) => {
        if (controller.signal.aborted) return;
        setSchools(detail.schools ?? []);
        setGrades(detail.grades ?? []);
        setClasses(
          (detail.classes ?? []).map((item) => ({
            id: item.id,
            name: item.name ?? "Turma",
            schoolId: item.schoolId,
            gradeId: item.gradeId,
          }))
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSchools([]);
          setGrades([]);
          setClasses([]);
        }
      });
    return () => controller.abort();
  }, [writtenTestId]);

  const query = useMemo<IcaDashboardQuery>(
    () => ({
      escolaId: schoolId === ALL ? undefined : schoolId,
      serieId: gradeId === ALL ? undefined : gradeId,
      turmaId: classId === ALL ? undefined : classId,
      status: statusFilter === ALL ? undefined : statusFilter,
      nivel: nivelFilter === ALL ? undefined : nivelFilter,
      q: debouncedSearch || undefined,
    }),
    [classId, debouncedSearch, gradeId, nivelFilter, schoolId, statusFilter]
  );

  useEffect(() => {
    if (!writtenTestId) {
      setDashboard(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void getIcaDashboard(writtenTestId, query, { signal: controller.signal })
      .then((panel) => {
        if (!controller.signal.aborted) setDashboard(panel);
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        setDashboard(null);
        setError(normalizeApiError(reason, "Não foi possível carregar o painel ICA.").message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, writtenTestId]);

  const students = useMemo(() => studentList(dashboard), [dashboard]);
  const schoolOptions = schools.filter((item) => item.id).map((item) => ({ id: item.id, name: item.name ?? "Escola" }));
  const gradeOptions = grades.filter((item) => item.id).map((item) => ({ id: item.id, name: item.name ?? "Série" }));
  const classOptions = useMemo(
    () =>
      classes.filter((item) => {
        if (schoolId !== ALL && item.schoolId && item.schoolId !== schoolId) return false;
        if (gradeId !== ALL && item.gradeId && item.gradeId !== gradeId) return false;
        return true;
      }),
    [classes, gradeId, schoolId]
  );
  const aggregateRows = useMemo(
    () => (dashboard?.rows ?? []).filter((row) => row.rowLevel !== "aluno"),
    [dashboard]
  );

  async function downloadCsv() {
    if (!writtenTestId) return;
    setDownloading(true);
    try {
      await downloadIcaResultsCsv(writtenTestId, query);
    } catch (reason) {
      setError(normalizeApiError(reason, "Não foi possível baixar o CSV.").message);
    } finally {
      setDownloading(false);
    }
  }

  const placeLabel = [
    dashboard?.municipio ? `${dashboard.municipio}${dashboard.uf ? `/${dashboard.uf}` : ""}` : null,
    schoolId !== ALL ? schoolOptions.find((item) => item.id === schoolId)?.name : null,
    gradeId !== ALL ? gradeOptions.find((item) => item.id === gradeId)?.name : null,
    classId !== ALL ? classOptions.find((item) => item.id === classId)?.name : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PageShell>
      <PageHeader
        brand={ICA_BRAND}
        title="Resultados ICA"
        description="Participação, proficiência da correção finalizada, corte ≥ 743, níveis e notas 0–10."
        icon={BarChart3}
      >
        {writtenTestId ? (
          <Button variant="outline" size="sm" onClick={() => void downloadCsv()} disabled={downloading}>
            <Download className="h-4 w-4" />
            {downloading ? "Baixando…" : "CSV"}
          </Button>
        ) : null}
      </PageHeader>

      <SectionCard title="Filtros" description="Recorte territorial e classificação. A prova escrita do município é resolvida automaticamente.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectFilter
            label="Escola"
            value={schoolId}
            options={schoolOptions}
            disabled={!writtenTestId}
            onChange={(value) => {
              setSchoolId(value);
              setClassId(ALL);
            }}
          />
          <SelectFilter
            label="Série"
            value={gradeId}
            options={gradeOptions}
            disabled={!writtenTestId}
            onChange={(value) => {
              setGradeId(value);
              setClassId(ALL);
            }}
          />
          <SelectFilter
            label="Turma"
            value={classId}
            options={classOptions}
            disabled={!writtenTestId}
            onChange={setClassId}
          />
          <div className="relative min-w-0 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Busca</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Aluno, escola ou turma"
                className="pl-9"
                disabled={!writtenTestId}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <ChipFilter
            label="Visão"
            value={view}
            onChange={(value) => setView(value as ViewMode)}
            allValue="__none__"
            options={[
              { value: "visao", label: "Visão geral" },
              { value: "escolas", label: "Por escola" },
              { value: "series", label: "Por série" },
              { value: "turmas", label: "Por turma" },
              { value: "alunos", label: "Estudantes" },
            ]}
          />
          <ChipFilter
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: ALL, label: "Todos" },
              ...ICA_STATUS_VALUES.map((value) => ({ value, label: value })),
            ]}
          />
          <ChipFilter
            label="Nível"
            value={nivelFilter}
            onChange={setNivelFilter}
            options={[
              { value: ALL, label: "Todos" },
              ...ICA_LEVEL_NAMES.map((value) => ({ value, label: value })),
            ]}
          />
        </div>

        {tests.length > 1 ? (
          <div className="mt-4 max-w-md space-y-1.5">
            <Label className="text-xs text-muted-foreground">Instrumento (avançado)</Label>
            <Select value={writtenTestId || ALL} onValueChange={(value) => setWrittenTestId(value === ALL ? "" : value)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Prova escrita publicada" />
              </SelectTrigger>
              <SelectContent>
                {tests.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Só aparece quando há mais de uma prova escrita publicada no município.
            </p>
          </div>
        ) : null}
      </SectionCard>

      {!writtenTestId && !loading ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Sem prova escrita publicada</AlertTitle>
          <AlertDescription>
            Publique uma avaliação ICA neste município para montar o painel populacional. O seletor de prova não é o
            eixo principal — o recorte é território e classificação.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Painel indisponível</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {placeLabel ? <p className="text-sm text-muted-foreground">Recorte: {placeLabel}</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          variant="metric"
          label="Previstos"
          value={dashboard?.kpis.previstos ?? 0}
          icon={Users}
          loading={loading}
          trend="Estudantes no recorte"
        />
        <StatCard
          variant="metric"
          label="Participação"
          value={formatPercent(dashboard?.kpis.participacao_percentual)}
          icon={GraduationCap}
          loading={loading}
          trend={`${formatCount(dashboard?.kpis.avaliados)} avaliados`}
        />
        <StatCard
          variant="featured"
          label="% ≥ 743"
          value={formatPercent(dashboard?.kpis.percentual_ge_743)}
          icon={School}
          loading={loading}
          trend={`${formatCount(dashboard?.kpis.alfabetizados)} alfabetizados`}
        />
        <StatCard
          variant="metric"
          label="Não alfabetizados"
          value={formatCount(dashboard?.kpis.nao_alfabetizados ?? 0)}
          icon={Users}
          loading={loading}
          trend="Proficiência abaixo de 743"
        />
        <StatCard
          variant="metric"
          label="Sem proficiência"
          value={formatCount(dashboard?.kpis.sem_proficiencia ?? 0)}
          icon={Users}
          loading={loading}
          trend="Sem correção finalizada"
        />
        <StatCard
          variant="metric"
          label="Proficiência média"
          value={formatOne(dashboard?.kpis.proficiencia_media)}
          icon={BarChart3}
          loading={loading}
          trend="Escala 0–1000"
        />
        <StatCard
          variant="metric"
          label="Nota convertida média"
          value={formatTwo(dashboard?.kpis.nota_prof_media)}
          icon={BarChart3}
          loading={loading}
          trend="0–10 · média da nota exata"
        />
        <StatCard
          variant="metric"
          label="Nota TCT média"
          value={formatTwo(dashboard?.kpis.nota_tct_media)}
          icon={BarChart3}
          loading={loading}
          trend="0–10 · pontos / 34"
        />
      </section>

      {(view === "visao" || view === "alunos") && (
        <SectionCard
          title="Níveis de aprendizagem"
          description={
            dashboard?.niveis.validos
              ? `${dashboard.niveis.validos.toLocaleString("pt-BR")} estudante(s) com proficiência no recorte.`
              : "Nenhum estudante com correção finalizada neste recorte."
          }
        >
          {loading && !dashboard ? (
            <Skeleton className="h-28" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(dashboard?.niveis.items ?? ICA_LEVEL_NAMES.map((name) => ({ name, count: 0, percentage: 0 }))).map(
                (item) => (
                  <div key={item.name} className="rounded-xl border p-4">
                    <p className="text-xs font-medium text-muted-foreground">{item.name}</p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums">{formatCount(item.count)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatPercent(item.percentage)}</p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(item.percentage ?? 0, 100)}%`,
                          background: "var(--system-gradient)",
                        }}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </SectionCard>
      )}

      {view === "visao" ? (
        <SectionCard
          title="Diagnóstico (IAD)"
          description="Aptos com nota ≥ 70 e travas de leitura ≥ 11, palavras ≥ 2 e texto ≥ 7. Este índice não é o status de alfabetização."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border p-4">
              <p className="text-xs text-muted-foreground">Avaliados válidos</p>
              <p className="mt-2 text-2xl font-semibold">{formatCount(dashboard?.diagnostic.valid)}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs text-muted-foreground">Aptos (IAD)</p>
              <p className="mt-2 text-2xl font-semibold">{formatCount(dashboard?.diagnostic.apt)}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs text-muted-foreground">IAD</p>
              <p className="mt-2 text-2xl font-semibold">{formatPercent(dashboard?.diagnostic.iad_percentage)}</p>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {view === "visao" ? (
        <SectionCard title="Agrupamento do recorte" description="Escolas, séries ou turmas devolvidos para os filtros atuais.">
          <GroupTable rows={aggregateRows} mode="recorte" loading={loading && !dashboard} />
        </SectionCard>
      ) : null}

      {view === "escolas" ? (
        <SectionCard title="Indicadores por escola" description="Valores agregados devolvidos para o recorte atual.">
          <GroupTable rows={rowsOf(dashboard, "escola")} mode="escolas" loading={loading && !dashboard} detailed />
        </SectionCard>
      ) : null}

      {view === "series" ? (
        <SectionCard title="Indicadores por série" description="Valores agregados devolvidos para o recorte atual.">
          <GroupTable rows={rowsOf(dashboard, "serie")} mode="series" loading={loading && !dashboard} detailed />
        </SectionCard>
      ) : null}

      {view === "turmas" ? (
        <SectionCard title="Indicadores por turma" description="Valores agregados devolvidos para o recorte atual.">
          <GroupTable rows={rowsOf(dashboard, "turma")} mode="turmas" loading={loading && !dashboard} detailed />
        </SectionCard>
      ) : null}

      {view === "alunos" || (view === "visao" && students.length > 0) ? (
        <SectionCard
          title={view === "alunos" ? "Relação individual de estudantes" : "Estudantes do recorte"}
          description="Valores da correção finalizada. Sem correção, a proficiência fica vazia e o status é Não avaliado."
        >
          <StudentsTable rows={view === "visao" ? students.slice(0, 12) : students} loading={loading && !dashboard} />
          {view === "visao" && students.length > 12 ? (
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={() => setView("alunos")}>
                Ver todos os {students.length.toLocaleString("pt-BR")} estudantes
              </Button>
            </div>
          ) : null}
        </SectionCard>
      ) : null}
    </PageShell>
  );
}

function GroupTable({
  rows,
  mode,
  loading,
  detailed,
}: {
  rows: IcaDashboardRow[];
  mode: GroupMode;
  loading?: boolean;
  detailed?: boolean;
}) {
  const showKind = mode === "recorte";
  const showSchool =
    mode === "series" ||
    mode === "turmas" ||
    (mode === "recorte" && rows.some((row) => row.rowLevel !== "escola"));
  const showSerie = mode === "turmas";
  const colSpan = 1 + (showKind ? 1 : 0) + (showSchool ? 1 : 0) + (showSerie ? 1 : 0) + 7 + (detailed ? 7 : 0);

  if (loading) return <Skeleton className="h-40" />;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {showKind ? <TableHead>Tipo</TableHead> : null}
            <TableHead>
              {mode === "escolas" ? "Escola" : mode === "series" ? "Série" : mode === "turmas" ? "Turma" : "Nome"}
            </TableHead>
            {showSchool ? <TableHead>Escola</TableHead> : null}
            {showSerie ? <TableHead>Série</TableHead> : null}
            <TableHead>Previstos</TableHead>
            <TableHead>Avaliados</TableHead>
            <TableHead>Participação</TableHead>
            <TableHead>Alfabetizados</TableHead>
            <TableHead>Não alfabetizados</TableHead>
            <TableHead>Sem proficiência</TableHead>
            <TableHead>≥ 743</TableHead>
            {detailed ? (
              <>
                <TableHead>Abaixo</TableHead>
                <TableHead>Básico</TableHead>
                <TableHead>Adequado</TableHead>
                <TableHead>Avançado</TableHead>
                <TableHead>TCT /10</TableHead>
                <TableHead>Prof. /10</TableHead>
                <TableHead>Proficiência</TableHead>
              </>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.rowLevel}-${row.id}`}>
              {showKind ? <TableCell>{ROW_KIND[row.rowLevel]}</TableCell> : null}
              <TableCell className="font-medium">{row.name}</TableCell>
              {showSchool ? <TableCell>{row.rowLevel === "escola" ? "—" : (row.schoolName ?? "—")}</TableCell> : null}
              {showSerie ? <TableCell>{row.serieName ?? "—"}</TableCell> : null}
              <TableCell>{formatCount(row.previstos ?? row.expected)}</TableCell>
              <TableCell>{formatCount(row.avaliados ?? row.evaluated_diagnostic)}</TableCell>
              <TableCell>{formatPercent(row.participacao_percentual ?? row.percentage)}</TableCell>
              <TableCell>{formatCount(row.alfabetizados)}</TableCell>
              <TableCell>{formatCount(row.nao_alfabetizados)}</TableCell>
              <TableCell>{formatCount(row.sem_proficiencia)}</TableCell>
              <TableCell>{formatPercent(row.percentual_ge_743)}</TableCell>
              {detailed ? (
                <>
                  <TableCell>{formatCount(levelCount(row, "Abaixo do Básico"))}</TableCell>
                  <TableCell>{formatCount(levelCount(row, "Básico"))}</TableCell>
                  <TableCell>{formatCount(levelCount(row, "Adequado"))}</TableCell>
                  <TableCell>{formatCount(levelCount(row, "Avançado"))}</TableCell>
                  <TableCell>{formatTwo(row.nota_tct_media)}</TableCell>
                  <TableCell>{formatTwo(row.nota_prof_media)}</TableCell>
                  <TableCell>{formatOne(row.proficiencia_media)}</TableCell>
                </>
              ) : null}
            </TableRow>
          ))}
          {!rows.length ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="py-8 text-center text-muted-foreground">
                Nenhum agrupamento neste recorte.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}

function StudentsTable({ rows, loading }: { rows: IcaDashboardRow[]; loading?: boolean }) {
  if (loading) return <Skeleton className="h-40" />;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Aluno</TableHead>
            <TableHead>Escola</TableHead>
            <TableHead>Série / turma</TableHead>
            <TableHead>Pontos</TableHead>
            <TableHead>Nota TCT /10</TableHead>
            <TableHead>Nota prof. /10</TableHead>
            <TableHead>Proficiência</TableHead>
            <TableHead>Nível</TableHead>
            <TableHead>Situação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell>{row.schoolName ?? "—"}</TableCell>
              <TableCell>{[row.serieName, row.className].filter(Boolean).join(" · ") || "—"}</TableCell>
              <TableCell>{formatCount(row.pontos_34)}</TableCell>
              <TableCell>{formatTwo(row.nota_tct_0_10)}</TableCell>
              <TableCell>{formatTwo(row.nota_prof_0_10)}</TableCell>
              <TableCell>{formatOne(row.proficiencia)}</TableCell>
              <TableCell>{row.nivel_aprendizagem ?? "—"}</TableCell>
              <TableCell>{row.status ?? "—"}</TableCell>
            </TableRow>
          ))}
          {!rows.length ? (
            <TableRow>
              <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                Nenhum estudante neste recorte.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
