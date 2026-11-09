"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Eraser,
  Filter,
  Loader2,
  Printer,
  Target,
  Users,
} from "lucide-react";
import {
  getAcertosNiveisFiltros,
  getAcertosNiveisRelatorio,
  type AcertosNiveisFiltrosCatalog,
  type AcertosNiveisQuery,
  type AcertosNiveisRelatorio,
} from "@/lib/api/afirme-reading/acertos-niveis";
import { ICA_LEVEL_NAMES, ICA_STATUS_VALUES } from "@/lib/api/afirme-reading/ica-results";
import { getWrittenTest, listWrittenTests } from "@/lib/api/afirme-reading/written-tests";
import { normalizeApiError } from "@/lib/api/errors";
import { ROUTES } from "@/config/routes";
import {
  classifyHabilidadePercentual,
  getProficiencyLevelStyle,
  HABILIDADE_PERCENT_INTERVALOS,
} from "@/lib/colors/proficiency-levels";
import { ICA_BRAND } from "@/lib/ica/brand";
import { formatIcaSkillDisplay } from "@/lib/ica/skill-display";
import { cn } from "@/lib/utils";
import { IcaCityScope } from "@/components/ica/ica-city-scope";
import { PageHeader } from "@/components/layout/page-header";
import { AvaliacaoPicker } from "@/components/shared/avaliacao-picker";
import { ChipFilter } from "@/components/shared/chip-filter";
import { PageShell } from "@/components/shared/page-shell";
import { ProficiencyLevelBadge } from "@/components/shared/proficiency-level-badge";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WRITTEN_TEST_STATUS_LABEL } from "@/lib/ica/written-tests";
import type { WrittenTestStatus } from "@/lib/api/afirme-reading/types";

const ALL = "all";
const EMPTY_CATALOG: AcertosNiveisFiltrosCatalog = {
  avaliacoes: [],
  escolas: [],
  series: [],
  turmas: [],
  turnos: [],
  niveis: [...ICA_LEVEL_NAMES],
  status: [],
};

function formatOne(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatPercent(value: number | null | undefined) {
  const text = formatOne(value);
  return text === "—" ? text : `${text}%`;
}

function formatCount(value: number | null | undefined) {
  return typeof value === "number" ? value.toLocaleString("pt-BR") : "—";
}

function formatAcertos(acertos: number | null | undefined, total: number | null | undefined) {
  if (typeof acertos !== "number") return "—";
  if (typeof total !== "number") return String(acertos);
  return `${acertos}/${total}`;
}

function SelectFilter({
  label,
  value,
  options,
  disabled,
  onChange,
  placeholder = "Todos",
}: {
  label: string;
  value: string;
  options: { id: string; nome: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-10">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DistribuicaoClassificacao({
  niveis,
  distribuicao,
}: {
  niveis: string[];
  distribuicao: AcertosNiveisRelatorio["distribuicao"];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {niveis.map((nome) => {
        const item = distribuicao[nome] ?? { quantidade: 0, percentual: 0 };
        const style = getProficiencyLevelStyle(nome);
        const pct =
          typeof item.percentual === "number" && Number.isFinite(item.percentual)
            ? Math.max(0, Math.min(100, item.percentual))
            : 0;

        return (
          <div key={nome} className="space-y-2">
            <div className="relative flex h-20 items-center justify-center overflow-hidden rounded-lg bg-muted/60">
              <div
                className="absolute inset-x-0 bottom-0 transition-all"
                style={{
                  height: `${pct}%`,
                  backgroundColor: style?.hex ?? "#64748b",
                }}
              />
              {pct > 0 ? (
                <span
                  className="relative z-10 text-sm font-semibold tabular-nums"
                  style={{ color: pct >= 35 ? style?.fgHex ?? "#fff" : undefined }}
                >
                  {formatPercent(item.percentual)}
                </span>
              ) : null}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {formatCount(item.quantidade)} ({formatPercent(item.percentual)})
              </span>{" "}
              {nome}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function PrintReport({
  report,
  generatedAt,
}: {
  report: AcertosNiveisRelatorio;
  generatedAt: Date;
}) {
  const placeParts = [
    report.meta.escola ? `Escola: ${report.meta.escola}` : null,
    report.meta.serie ? `Série: ${report.meta.serie}` : null,
    report.meta.turma ? `Turma: ${report.meta.turma}` : null,
  ].filter(Boolean);
  const municipioLabel = [report.meta.municipio, report.meta.estado].filter(Boolean).join(" / ");
  const niveis = report.niveis.length ? report.niveis : [...ICA_LEVEL_NAMES];
  const ind = report.indicadores;

  return (
    <div className="space-y-8 print:space-y-6">
      <header className="space-y-2 border-b border-border pb-4 text-center print:border-slate-300">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-highlight">
          Relatório de acertos e níveis
        </p>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {municipioLabel || report.meta.titulo}
        </h2>
        {municipioLabel ? <p className="text-sm text-muted-foreground">{report.meta.titulo}</p> : null}
        {placeParts.length ? (
          <p className="text-sm text-muted-foreground">{placeParts.join(" · ")}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Participantes: {formatCount(ind.alunosAvaliados)}
          {typeof report.meta.totalItens === "number" ? ` · Itens: ${report.meta.totalItens}` : ""}
        </p>
      </header>

      <section className="space-y-3 break-inside-avoid">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Indicadores
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Alunos avaliados" value={formatCount(ind.alunosAvaliados)} icon={Users} />
          <StatCard label="Turmas" value={formatCount(ind.turmas)} icon={Users} />
          <StatCard
            label="Média de acertos"
            value={formatPercent(ind.mediaAcertosPercentual)}
            icon={Target}
          />
          <StatCard
            label="Média de proficiência"
            value={formatOne(ind.mediaProficiencia)}
            icon={Target}
          />
        </div>
      </section>

      <section className="space-y-3 break-inside-avoid">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Distribuição por classificação
        </h3>
        <DistribuicaoClassificacao niveis={niveis} distribuicao={report.distribuicao} />
      </section>

      {report.habilidades.length ? (
        <section className="space-y-3 break-inside-avoid">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Habilidades
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {report.habilidades.map((skill) => {
              const display = formatIcaSkillDisplay(skill.codigo, skill.label);
              const faixa =
                getProficiencyLevelStyle(skill.nivel) ??
                getProficiencyLevelStyle(skill.faixa) ??
                classifyHabilidadePercentual(skill.percentualAcertos);
              const pct =
                typeof skill.percentualAcertos === "number" && Number.isFinite(skill.percentualAcertos)
                  ? Math.max(0, Math.min(100, skill.percentualAcertos))
                  : null;
              return (
                <article
                  key={`${skill.codigo}-${skill.label ?? ""}`}
                  className={cn(
                    "rounded-xl border p-4",
                    faixa?.softClass.bg,
                    faixa?.softClass.border
                  )}
                >
                  <p className={cn("text-xs font-semibold uppercase tracking-wide", faixa?.softClass.text)}>
                    {display?.code ?? skill.codigo}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {display?.label && display.label !== display.code
                      ? display.label
                      : skill.label || "Habilidade"}
                  </p>
                  <p className={cn("mt-3 text-2xl font-semibold tabular-nums", faixa?.softClass.text)}>
                    {formatPercent(skill.percentualAcertos)}
                  </p>
                  {faixa ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {HABILIDADE_PERCENT_INTERVALOS[faixa.key]} · {faixa.label}
                    </p>
                  ) : null}
                  {pct != null ? (
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                      <div
                        className={cn("h-full rounded-full", faixa?.softClass.bar ?? "bg-muted-foreground")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Relatório de desempenho geral
        </h3>
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="bg-brand-highlight/10 hover:bg-brand-highlight/10">
                <TableHead>Aluno</TableHead>
                <TableHead>Acertos</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Proficiência</TableHead>
                <TableHead>Nível</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.alunos.map((aluno, index) => (
                <TableRow key={aluno.id || `${aluno.nome}-${index}`}>
                  <TableCell className="font-medium">
                    {index + 1}. {aluno.nome}
                    {(aluno.escola || aluno.serie || aluno.turma) && !report.meta.turma ? (
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                        {[aluno.escola, aluno.serie, aluno.turma].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatAcertos(aluno.acertos, aluno.totalItens ?? report.meta.totalItens)}
                  </TableCell>
                  <TableCell className="tabular-nums">{formatOne(aluno.nota)}</TableCell>
                  <TableCell className="tabular-nums">{formatOne(aluno.proficiencia)}</TableCell>
                  <TableCell>
                    <ProficiencyLevelBadge level={aluno.nivel} />
                  </TableCell>
                </TableRow>
              ))}
              {!report.alunos.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Nenhum aluno no recorte.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </section>

      {report.porTurma.length > 1 || (report.porTurma.length === 1 && !report.meta.turma) ? (
        <section className="space-y-3 break-inside-avoid">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Por turma
          </h3>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Série</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Alunos</TableHead>
                  <TableHead>Média acertos</TableHead>
                  <TableHead>Média proficiência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.porTurma.map((row, index) => (
                  <TableRow key={`${row.serie}-${row.turma}-${index}`}>
                    <TableCell>{row.serie ?? "—"}</TableCell>
                    <TableCell className="font-medium">{row.turma ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">{formatCount(row.alunosAvaliados)}</TableCell>
                    <TableCell className="tabular-nums">
                      {formatPercent(row.mediaAcertosPercentual)}
                    </TableCell>
                    <TableCell className="tabular-nums">{formatOne(row.mediaProficiencia)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground print:border-slate-300">
        <span>Afirme Play Soluções Educativas</span>
        <span>{generatedAt.toLocaleString("pt-BR")}</span>
      </footer>
    </div>
  );
}

export function IcaAcertosNiveisPage() {
  return (
    <IcaCityScope emptyMessage="Selecione o município para consultar o relatório de acertos e níveis.">
      <IcaAcertosNiveisContent />
    </IcaCityScope>
  );
}

function IcaAcertosNiveisContent() {
  const [catalog, setCatalog] = useState<AcertosNiveisFiltrosCatalog>(EMPTY_CATALOG);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [scopeFromTest, setScopeFromTest] = useState<{
    escolas: AcertosNiveisFiltrosCatalog["escolas"];
    series: AcertosNiveisFiltrosCatalog["series"];
    turmas: AcertosNiveisFiltrosCatalog["turmas"];
  } | null>(null);

  const [avaliacaoId, setAvaliacaoId] = useState("");
  const [escolaId, setEscolaId] = useState(ALL);
  const [serieId, setSerieId] = useState(ALL);
  const [turmaId, setTurmaId] = useState(ALL);
  const [turno, setTurno] = useState(ALL);
  const [nivel, setNivel] = useState(ALL);
  const [status, setStatus] = useState(ALL);

  const [report, setReport] = useState<AcertosNiveisRelatorio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setCatalogLoading(true);
    setCatalogError(null);

    void (async () => {
      try {
        const filtros = await getAcertosNiveisFiltros("escrita", { signal: controller.signal });
        if (controller.signal.aborted) return;

        let next = filtros;
        if (!next.avaliacoes.length) {
          const list = await listWrittenTests(
            { status: "publicada", per_page: 100 },
            { signal: controller.signal }
          );
          if (controller.signal.aborted) return;
          next = {
            ...next,
            avaliacoes: list.data.map((item) => ({
              id: item.id,
              nome: item.title,
              titulo: item.title,
              status: item.status,
            })),
          };
        }

        setCatalog(next);
        setAvaliacaoId((current) => current || next.avaliacoes[0]?.id || "");
      } catch (reason) {
        if (controller.signal.aborted) return;
        try {
          const list = await listWrittenTests(
            { status: "publicada", per_page: 100 },
            { signal: controller.signal }
          );
          if (controller.signal.aborted) return;
          setCatalog({
            ...EMPTY_CATALOG,
            avaliacoes: list.data.map((item) => ({
              id: item.id,
              nome: item.title,
              titulo: item.title,
              status: item.status,
            })),
          });
          setAvaliacaoId((current) => current || list.data[0]?.id || "");
          setCatalogError(null);
        } catch {
          if (!controller.signal.aborted) {
            setCatalogError(
              normalizeApiError(reason, "Não foi possível carregar os filtros do relatório.").message
            );
          }
        }
      } finally {
        if (!controller.signal.aborted) setCatalogLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    setEscolaId(ALL);
    setSerieId(ALL);
    setTurmaId(ALL);
    setTurno(ALL);
    setScopeFromTest(null);

    if (!avaliacaoId) return;
    if (catalog.escolas.length || catalog.series.length || catalog.turmas.length) return;

    const controller = new AbortController();
    void getWrittenTest(avaliacaoId)
      .then((detail) => {
        if (controller.signal.aborted) return;
        setScopeFromTest({
          escolas: (detail.schools ?? []).map((item) => ({
            id: item.id,
            nome: item.name ?? "Escola",
          })),
          series: (detail.grades ?? []).map((item) => ({
            id: item.id,
            nome: item.name ?? "Série",
          })),
          turmas: (detail.classes ?? []).map((item) => ({
            id: item.id,
            nome: item.name ?? "Turma",
            escolaId: item.schoolId ?? null,
            serieId: item.gradeId ?? null,
            turno: null,
          })),
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) setScopeFromTest(null);
      });

    return () => controller.abort();
  }, [avaliacaoId, catalog.escolas.length, catalog.series.length, catalog.turmas.length]);

  const escolaOptions = catalog.escolas.length ? catalog.escolas : (scopeFromTest?.escolas ?? []);
  const serieOptions = catalog.series.length ? catalog.series : (scopeFromTest?.series ?? []);
  const turmasBase = catalog.turmas.length ? catalog.turmas : (scopeFromTest?.turmas ?? []);
  const turmaOptions = useMemo(
    () =>
      turmasBase.filter((turma) => {
        if (escolaId !== ALL && turma.escolaId && turma.escolaId !== escolaId) return false;
        if (serieId !== ALL && turma.serieId && turma.serieId !== serieId) return false;
        if (turno !== ALL && turma.turno && turma.turno !== turno) return false;
        return true;
      }),
    [escolaId, serieId, turmasBase, turno]
  );
  const turnoOptions = catalog.turnos.length
    ? catalog.turnos
    : Array.from(
        new Set(turmasBase.map((turma) => turma.turno).filter((value): value is string => Boolean(value)))
      );
  const nivelOptions = catalog.niveis.length ? catalog.niveis : [...ICA_LEVEL_NAMES];
  const statusOptions = catalog.status.length ? catalog.status : [...ICA_STATUS_VALUES];

  const query = useMemo<AcertosNiveisQuery | null>(() => {
    if (!avaliacaoId) return null;
    return {
      fonte: "escrita",
      avaliacaoId,
      escolaId: escolaId === ALL ? undefined : escolaId,
      serieId: serieId === ALL ? undefined : serieId,
      turmaId: turmaId === ALL ? undefined : turmaId,
      turno: turno === ALL ? undefined : turno,
      nivel: nivel === ALL ? undefined : nivel,
      status: status === ALL ? undefined : status,
    };
  }, [avaliacaoId, escolaId, nivel, serieId, status, turmaId, turno]);

  useEffect(() => {
    if (!query) {
      setReport(null);
      setGeneratedAt(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void getAcertosNiveisRelatorio(query, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setReport(data);
        setGeneratedAt(new Date());
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        setReport(null);
        setGeneratedAt(null);
        setError(normalizeApiError(reason, "Não foi possível carregar o relatório.").message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [query]);

  function limparFiltrosEspecificos() {
    setEscolaId(ALL);
    setSerieId(ALL);
    setTurmaId(ALL);
    setTurno(ALL);
    setNivel(ALL);
    setStatus(ALL);
  }

  return (
    <PageShell className="print:bg-white">
      <div className="print:hidden space-y-6">
        <PageHeader
          brand={ICA_BRAND}
          title="Acertos e níveis"
          description="Desempenho agregado da prova escrita: acertos, nota, proficiência e distribuição SAEB."
          icon={Target}
        >
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.ica.resultados}>Painel ICA</Link>
          </Button>
          <Button type="button" size="sm" onClick={() => window.print()} disabled={!report || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            Exportar PDF
          </Button>
        </PageHeader>

        <SectionCard
          title="Filtros"
          description="Avaliação é obrigatória. Escola, série e turma refinam o recorte. O município vem do contexto."
          icon={Filter}
          actions={
            <Button type="button" variant="outline" size="sm" onClick={limparFiltrosEspecificos}>
              <Eraser className="h-4 w-4" />
              Limpar filtros
            </Button>
          }
        >
          {catalogError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Filtros indisponíveis</AlertTitle>
              <AlertDescription>{catalogError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AvaliacaoPicker
              className="sm:col-span-2 lg:col-span-2"
              value={avaliacaoId}
              options={catalog.avaliacoes.map((item) => ({
                id: item.id,
                titulo: item.titulo,
                status: item.status,
                tags: item.status
                  ? [
                      WRITTEN_TEST_STATUS_LABEL[item.status as WrittenTestStatus] ?? item.status,
                    ]
                  : undefined,
              }))}
              series={serieOptions}
              onChange={setAvaliacaoId}
              disabled={catalogLoading || catalog.avaliacoes.length === 0}
              placeholder={
                catalogLoading
                  ? "Carregando…"
                  : catalog.avaliacoes.length
                    ? "Selecione a avaliação"
                    : "Nenhuma avaliação publicada"
              }
              emptyMessage="Nenhuma avaliação publicada neste município."
            />
            <SelectFilter
              label="Escola"
              value={escolaId}
              options={escolaOptions}
              disabled={!avaliacaoId || catalogLoading}
              onChange={(value) => {
                setEscolaId(value);
                setTurmaId(ALL);
              }}
            />
            <SelectFilter
              label="Série"
              value={serieId}
              options={serieOptions}
              disabled={!avaliacaoId || catalogLoading}
              onChange={(value) => {
                setSerieId(value);
                setTurmaId(ALL);
              }}
            />
            <SelectFilter
              label="Turma"
              value={turmaId}
              options={turmaOptions}
              disabled={!avaliacaoId || catalogLoading}
              onChange={setTurmaId}
            />
            <SelectFilter
              label="Turno"
              value={turno}
              options={turnoOptions.map((item) => ({ id: item, nome: item }))}
              disabled={!avaliacaoId || catalogLoading || turnoOptions.length === 0}
              onChange={(value) => {
                setTurno(value);
                setTurmaId(ALL);
              }}
            />
          </div>

          <div className="mt-4 space-y-3">
            <ChipFilter
              label="Nível"
              value={nivel}
              onChange={setNivel}
              options={[
                { value: ALL, label: "Todos" },
                ...nivelOptions.map((value) => {
                  const style = getProficiencyLevelStyle(value);
                  return {
                    value,
                    label: value,
                    accentColor: style?.hex,
                    accentTextColor: style?.fgHex,
                  };
                }),
              ]}
            />
            <ChipFilter
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: ALL, label: "Todos" },
                ...statusOptions.map((value) => ({ value, label: value })),
              ]}
            />
          </div>

          <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2 text-xs text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-100">
            Ordem dos filtros: Avaliação → Escola → Série → Turma. Escola, série e turma são opcionais
            para refinar os resultados.
          </p>
        </SectionCard>

        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Relatório indisponível</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading && !report ? <Skeleton className="h-64" /> : null}
      </div>

      {report && generatedAt ? (
        <div className="surface-panel p-4 sm:p-6 print:border-0 print:bg-white print:p-0 print:shadow-none">
          <PrintReport report={report} generatedAt={generatedAt} />
        </div>
      ) : null}

      {!loading && !report && !error && avaliacaoId ? (
        <p className="print:hidden text-sm text-muted-foreground">
          Nenhum dado devolvido para o recorte atual.
        </p>
      ) : null}

      {!avaliacaoId && !catalogLoading ? (
        <p className="print:hidden text-sm text-muted-foreground">
          Selecione uma avaliação publicada para gerar o relatório.
        </p>
      ) : null}
    </PageShell>
  );
}
