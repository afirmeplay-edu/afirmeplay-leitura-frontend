"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Layers } from "lucide-react";
import {
  getIcaDashboard,
  ICA_LEVEL_NAMES,
  type IcaDashboard,
  type IcaDashboardQuery,
} from "@/lib/api/afirme-reading/ica-results";
import { listWrittenTests } from "@/lib/api/afirme-reading/written-tests";
import type { WrittenTestSummary } from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import { ROUTES } from "@/config/routes";
import { ICA_BRAND } from "@/lib/ica/brand";
import { IcaCityScope } from "@/components/ica/ica-city-scope";
import { PageHeader } from "@/components/layout/page-header";
import { ChipFilter } from "@/components/shared/chip-filter";
import { PageShell } from "@/components/shared/page-shell";
import { ProficiencyLevelCards } from "@/components/shared/proficiency-level-cards";
import { SectionCard } from "@/components/shared/section-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getProficiencyLevelStyle } from "@/lib/colors/proficiency-levels";
import { cn } from "@/lib/utils";

const ALL = "all";

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

export function IcaLevelsReportPage() {
  return (
    <IcaCityScope emptyMessage="Selecione o município para consultar os níveis do ICA.">
      <IcaLevelsReportContent />
    </IcaCityScope>
  );
}

function IcaLevelsReportContent() {
  const [tests, setTests] = useState<WrittenTestSummary[]>([]);
  const [writtenTestId, setWrittenTestId] = useState("");
  const [nivelFilter, setNivelFilter] = useState(ALL);
  const [dashboard, setDashboard] = useState<IcaDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          setError(normalizeApiError(reason, "Não foi possível carregar as avaliações.").message);
        }
      });
    return () => controller.abort();
  }, []);

  const query = useMemo<IcaDashboardQuery>(
    () => ({
      nivel: nivelFilter === ALL ? undefined : nivelFilter,
    }),
    [nivelFilter]
  );

  useEffect(() => {
    if (!writtenTestId) {
      setDashboard(null);
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
        setError(normalizeApiError(reason, "Não foi possível carregar o relatório.").message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, writtenTestId]);

  const comparisonRows = (dashboard?.rows ?? []).filter((row) => row.rowLevel !== "aluno");

  return (
    <PageShell>
      <PageHeader
        brand={ICA_BRAND}
        title="Níveis de aprendizagem"
        description="Mesmo recorte populacional do painel ICA: distribuição Inep sem exigir escolher a prova como eixo principal."
        icon={Layers}
      >
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.ica.resultados}>Painel ICA</Link>
        </Button>
      </PageHeader>

      <SectionCard title="Filtros" description="Escola e nível. A prova publicada do município é resolvida automaticamente.">
        <div className="mt-1">
          <ChipFilter
            label="Nível"
            value={nivelFilter}
            onChange={setNivelFilter}
            options={[
              { value: ALL, label: "Todos" },
              ...ICA_LEVEL_NAMES.map((value) => {
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
        </div>
        {tests.length > 1 ? (
          <div className="mt-4 max-w-md space-y-1.5">
            <Label className="text-xs text-muted-foreground">Instrumento (avançado)</Label>
            <Select
              value={writtenTestId || ALL}
              onValueChange={(value) => setWrittenTestId(value === ALL ? "" : value)}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tests.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </SectionCard>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Relatório indisponível</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <SectionCard
        title="Distribuição do recorte"
        description={
          dashboard
            ? `${dashboard.niveis.validos.toLocaleString("pt-BR")} estudante(s) com proficiência · ICA ≥ 743: ${formatPercent(dashboard.kpis.percentual_ge_743)}`
            : "Selecione uma avaliação publicada."
        }
      >
        <ProficiencyLevelCards
          items={dashboard?.niveis.items ?? ICA_LEVEL_NAMES.map((name) => ({ name, count: 0, percentage: 0 }))}
          loading={loading && !dashboard}
        />
      </SectionCard>

      <SectionCard title="Comparativo por agrupamento" description="Escolas, séries ou turmas do nível atual do painel.">
        {loading && !dashboard ? (
          <Skeleton className="h-40" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Previstos</TableHead>
                  <TableHead>Alfabetizados</TableHead>
                  <TableHead>Não alfabetizados</TableHead>
                  <TableHead>Sem proficiência</TableHead>
                  <TableHead>≥ 743</TableHead>
                  {ICA_LEVEL_NAMES.map((name) => {
                    const style = getProficiencyLevelStyle(name);
                    return (
                      <TableHead key={name} className={style?.softClass.text}>
                        {name}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{formatCount(row.previstos ?? row.expected)}</TableCell>
                    <TableCell className="font-medium text-emerald-700 dark:text-emerald-400">
                      {formatCount(row.alfabetizados)}
                    </TableCell>
                    <TableCell className="font-medium text-rose-700 dark:text-rose-400">
                      {formatCount(row.nao_alfabetizados)}
                    </TableCell>
                    <TableCell>{formatCount(row.sem_proficiencia)}</TableCell>
                    <TableCell>{formatPercent(row.percentual_ge_743)}</TableCell>
                    {ICA_LEVEL_NAMES.map((name) => {
                      const style = getProficiencyLevelStyle(name);
                      return (
                        <TableCell key={name} className={cn("tabular-nums", style?.softClass.text)}>
                          {formatCount(row.niveis?.[name] ?? 0)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                {!comparisonRows.length ? (
                  <TableRow>
                    <TableCell colSpan={6 + ICA_LEVEL_NAMES.length} className="py-8 text-center text-muted-foreground">
                      Nenhum agrupamento neste recorte.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </PageShell>
  );
}
