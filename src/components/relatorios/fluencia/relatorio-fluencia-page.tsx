"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Download,
  FileSpreadsheet,
  Gauge,
  Info,
  Loader2,
  Printer,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { PerfilLeitorBadge } from "@/components/shared/perfil-leitor-badge";
import { StudentInfoDialog, type StudentInfoSeed } from "@/components/shared/student-info-dialog";
import { PerfilIndividual } from "@/components/relatorios/fluencia/perfil-individual";
import { TabelaEstudantes } from "@/components/relatorios/fluencia/tabela-estudantes";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RelatorioFiltros } from "@/components/relatorios/fluencia/filtros";
import { DistribuicaoBarra } from "@/components/relatorios/fluencia/distribuicao-barra";
import { EstudantesHoverCount } from "@/components/relatorios/fluencia/estudantes-hover";
import { countPrioridadeIntervencao, escolasNoRecorte, mediaCompreensao } from "@/lib/relatorios-fluencia/derived";
import { exportarRelatorioExcel } from "@/lib/relatorios-fluencia/exportar";
import { formatDateTimeIso, formatDecimal, formatDeltaPp, formatPct, percentualFaixa } from "@/lib/relatorios-fluencia/format";
import { RelatorioFluenciaProvider, useRelatorioFluencia } from "@/lib/relatorios-fluencia/store";
import { PERFIL_ALFABETOMETRO_LABEL, getPerfilLeitorStyle, type PerfilLeitorCode } from "@/lib/colors/reading-levels";
import {
  NIVEIS,
  avaliacoesDoFiltro,
  type Indicadores,
  type RelatorioPor,
  type ResultadoEstudante,
} from "@/lib/relatorios-fluencia/types";
import { getApiErrorMessage } from "@/lib/api/errors";
import { AdminCityPicker } from "@/components/auth/admin-city-picker";

export function RelatorioFluenciaPage() {
  const [cityReady, setCityReady] = useState(false);
  const [cityKey, setCityKey] = useState("none");

  const handleCityReadyChange = useCallback((ready: boolean, cityId: string | null) => {
    setCityReady(ready);
    setCityKey(cityId || "none");
  }, []);

  const canLoad = cityReady && cityKey !== "none";

  return (
    <PageShell className="print:bg-white">
      <div className="print:hidden space-y-4">
        <PageHeader
          eyebrow="Relatórios de leitura"
          title="Alfabetômetro e relatórios da rede"
          description="Panorama de fluência leitora da rede para feedback pedagógico."
          icon={BarChart3}
        />
        <AdminCityPicker onCityReadyChange={handleCityReadyChange} />
      </div>

      {canLoad ? (
        <RelatorioFluenciaProvider key={cityKey}>
          <RelatorioFluenciaContent />
        </RelatorioFluenciaProvider>
      ) : (
        <p className="print:hidden text-sm text-muted-foreground">
          Selecione o município para carregar o relatório.
        </p>
      )}
    </PageShell>
  );
}

function RelatorioFluenciaContent() {
  const {
    relatorio,
    catalog,
    catalogLoading,
    catalogError,
    reportLoading,
    reportError,
    relatorioPor,
    setRelatorioPor,
    itemId,
    setItemId,
    filtros,
    recarregar,
    baixarRecorte,
  } = useRelatorioFluencia();
  const [studentSeed, setStudentSeed] = useState<StudentInfoSeed | null>(null);
  const [estudanteSel, setEstudanteSel] = useState<ResultadoEstudante | null>(null);
  const [buscaEstudante, setBuscaEstudante] = useState("");
  const [baixando, setBaixando] = useState(false);
  const ind = relatorio?.indicadores;
  const corFluentes = getPerfilLeitorStyle("LF").hex;
  const corPreLeitores = getPerfilLeitorStyle("PL1").hex;
  const modoEstudante = relatorioPor === "estudante";

  const listaEstudantes = useMemo(() => {
    const q = buscaEstudante.trim().toLowerCase();
    return [...(relatorio?.estudantes ?? [])]
      .filter((e) => !q || e.nome.toLowerCase().includes(q) || e.matricula.toLowerCase().includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [relatorio?.estudantes, buscaEstudante]);

  const itemOptions = (() => {
    const avaliacao = avaliacoesDoFiltro(catalog, filtros.ano, filtros.edicao).find(
      (a) => a.id === filtros.avaliacaoId
    );
    if (relatorioPor === "escola") {
      return catalog.escolas
        .filter((e) => {
          if (!e.id) return false;
          if (avaliacao?.escolaIds?.length && !avaliacao.escolaIds.includes(e.id)) return false;
          if (filtros.municipioId && e.municipioId !== filtros.municipioId) return false;
          return true;
        })
        .map((e) => ({ id: e.id, label: e.nome }));
    }
    if (relatorioPor === "turma") {
      return catalog.turmas
        .filter((t) => {
          if (!t.id) return false;
          if (avaliacao?.turmaIds?.length && !avaliacao.turmaIds.includes(t.id)) return false;
          if (filtros.escolaId && t.escolaId !== filtros.escolaId) return false;
          if (filtros.serieId && t.serieId !== filtros.serieId) return false;
          return true;
        })
        .map((t) => ({ id: t.id, label: t.nome }));
    }
    return [];
  })();

  const handleExportarAtual = () => {
    if (!relatorio) return;
    exportarRelatorioExcel(relatorio);
  };

  const handleBaixarRecorte = async () => {
    if (!itemId) return;
    setBaixando(true);
    try {
      const recorte = await baixarRecorte();
      exportarRelatorioExcel(recorte);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível baixar o recorte."));
    } finally {
      setBaixando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="print:hidden flex flex-wrap items-center justify-end gap-2">
        {reportLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        <Button type="button" onClick={() => window.print()} disabled={!relatorio}>
          <Printer className="mr-2 h-4 w-4" />
          Exportar PDF
        </Button>
        <Button type="button" variant="outline" onClick={handleExportarAtual} disabled={!relatorio}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Exportar Excel
        </Button>
        <Button type="button" variant="outline" onClick={() => window.print()} disabled={!relatorio}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>

      <div className="print:hidden space-y-4">
        {catalogError ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Filtros indisponíveis</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              {catalogError}
              <Button type="button" size="sm" variant="outline" onClick={recarregar}>
                Tentar de novo
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <RelatorioFiltros />

        <div className="surface-panel p-4">
          <p className="mb-3 text-sm font-medium">Relatório por</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full space-y-1.5 sm:max-w-[200px]">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={relatorioPor} onValueChange={(v) => setRelatorioPor(v as RelatorioPor)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="escola">Escola</SelectItem>
                  <SelectItem value="turma">Turma</SelectItem>
                  <SelectItem value="estudante">Estudante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!modoEstudante ? (
              <>
                <div className="w-full flex-1 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Item</Label>
                  <Select
                    value={itemId || undefined}
                    onValueChange={setItemId}
                    disabled={!filtros.avaliacaoId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {itemOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" disabled={!itemId || !filtros.avaliacaoId || baixando} onClick={() => void handleBaixarRecorte()}>
                  {baixando ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Baixar relatório
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground sm:pb-2">
                A lista nominal abaixo usa os filtros de Ano, Edição, Rede, Município, Escola, Série, Turma e
                Turno. Clique em um estudante para abrir o perfil.
              </p>
            )}
          </div>
        </div>
      </div>

      {!filtros.avaliacaoId && !catalogLoading && !catalogError ? (
        <p className="text-sm text-muted-foreground">
          Selecione uma avaliação para ver os resultados.
        </p>
      ) : null}

      {reportError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Não foi possível carregar o relatório</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {reportError}
            <Button type="button" size="sm" variant="outline" onClick={recarregar}>
              Tentar de novo
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {(catalogLoading || reportLoading) && !relatorio ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      ) : null}

      {relatorio && ind ? (
        <>
          <div className="space-y-1 border-b pb-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Relatório de resultados — {relatorio.avaliacaoTitulo || relatorio.tituloEdicao}
            </h2>
            {relatorio.avaliacaoTitulo && relatorio.tituloEdicao ? (
              <p className="text-sm text-muted-foreground">{relatorio.tituloEdicao}</p>
            ) : null}
            <p className="text-sm text-muted-foreground">{relatorio.escopoLabel}</p>
            <p className="text-xs text-muted-foreground">Emitido em {formatDateTimeIso(relatorio.emitidoEm)}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              variant="featured"
              label="Estudantes avaliados"
              value={ind.avaliados}
              icon={Users}
              trend={`${escolasNoRecorte(relatorio)} ${escolasNoRecorte(relatorio) === 1 ? "escola" : "escolas"} da rede`}
            />
            <StatCard
              variant="metric"
              label="Leitores fluentes"
              value={formatPct(ind.leitoresFluentesPct)}
              icon={BookOpen}
              accentColor={corFluentes}
              trend="Perfil LF"
            />
            <StatCard
              variant="metric"
              label="Prioridade de intervenção"
              value={countPrioridadeIntervencao(ind.distribuicao)}
              icon={AlertTriangle}
              accentColor={corPreLeitores}
              trend="Perfis PL1 e PL2"
            />
            <StatCard
              variant="metric"
              label="Compreensão média"
              value={formatPct(mediaCompreensao(relatorio.estudantes))}
              icon={Gauge}
              trend="Perguntas após a leitura"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard variant="metric" label="Previstos" value={ind.previstos} icon={Users} />
            <StatCard variant="metric" label="Participação" value={formatPct(ind.participacao)} icon={BarChart3} />
            <StatCard variant="metric" label="IFL" value={formatDecimal(ind.ifl)} icon={BarChart3} />
            <StatCard variant="metric" label="PPM médio" value={formatDecimal(ind.ppmMedio)} icon={Gauge} />
          </div>

          {modoEstudante ? (
            <SectionCard
              title={`${listaEstudantes.length} estudantes no recorte`}
              description="Resultados individuais da edição selecionada, com comparação ao perfil da edição anterior."
              actions={
                <Input
                  value={buscaEstudante}
                  onChange={(e) => setBuscaEstudante(e.target.value)}
                  placeholder="Buscar por nome"
                  className="h-9 w-56"
                />
              }
            >
              <TabelaEstudantes lista={listaEstudantes} onAbrir={setEstudanteSel} />
            </SectionCard>
          ) : null}

          <SectionCard icon={BarChart3} variant="banner" title="Alfabetômetro" description="Distribuição por perfil leitor">
            <div className="space-y-6">
              <DistribuicaoBarra distribuicao={ind.distribuicao ?? []} />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Perfil</TableHead>
                    <TableHead className="text-right">Estudantes</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    {relatorio.indicadoresAnteriores ? (
                      <TableHead className="text-right">Δ vs. anterior</TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ind.distribuicao ?? []).map((d) => (
                    <TableRow key={d.code}>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: getPerfilLeitorStyle(d.code).hex }}
                          />
                          {PERFIL_ALFABETOMETRO_LABEL[d.code as PerfilLeitorCode] ?? d.label}
                        </span>
                      </TableCell>
                      <TableCell
                        className="text-right font-semibold"
                        style={{ color: getPerfilLeitorStyle(d.code).hex }}
                      >
                        <EstudantesHoverCount
                          bucket={d}
                          ano={filtros.ano}
                          avaliacaoId={filtros.avaliacaoId}
                          onSelectStudent={setStudentSeed}
                        />
                      </TableCell>
                      <TableCell className="text-right">{formatPct(d.percentual)}</TableCell>
                      {relatorio.indicadoresAnteriores ? (
                        <TableCell className="text-right">{formatDeltaPp(d.delta)}</TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>

          <SectionCard title="Leitura analítica" variant="highlight">
            <p className="text-sm leading-relaxed">{relatorio.leituraAnalitica}</p>
          </SectionCard>

          {relatorio.alertas?.length ? (
            <SectionCard title="Alertas pedagógicos">
              <div className="space-y-3">
                {relatorio.alertas.map((a) => (
                  <Alert
                    key={a.id}
                    variant={a.severidade === "info" ? "default" : "destructive"}
                    className={
                      a.severidade === "warning"
                        ? "border-amber-300 bg-amber-50 text-amber-950 [&>svg]:text-amber-700"
                        : a.severidade === "info"
                          ? "border-sky-200 bg-sky-50"
                          : undefined
                    }
                  >
                    {a.severidade === "info" ? <Info className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    <AlertTitle className="flex flex-wrap items-center gap-2">
                      {a.titulo}
                      {a.nivelCode ? <PerfilLeitorBadge code={a.nivelCode} /> : null}
                    </AlertTitle>
                    <AlertDescription>{a.descricao}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </SectionCard>
          ) : null}

          {!modoEstudante ? (
            <>
              <SectionCard title="Resumo por escola">
                <ResumoTabela
                  rows={(relatorio.porEscola ?? []).map((e) => ({
                    id: e.escolaId,
                    nome: e.escolaNome,
                    ...e,
                  }))}
                />
              </SectionCard>

              <SectionCard title="Resumo por turma">
                <ResumoTabela
                  rows={(relatorio.porTurma ?? []).map((t) => ({
                    id: t.turmaId,
                    nome: `${t.turmaNome} (${t.escolaNome})`,
                    ...t,
                  }))}
                />
              </SectionCard>
            </>
          ) : null}

          {relatorio.criterios ? (
            <footer className="rounded-xl border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">Critérios de classificação</p>
              <p className="mt-1">Pesos do IFL: {relatorio.criterios.pesosIfl}</p>
              <p className="mt-1">{relatorio.criterios.iflDescricao}</p>
              <p className="mt-1">{relatorio.criterios.fluencia}</p>
            </footer>
          ) : null}
        </>
      ) : null}

      <StudentInfoDialog
        open={studentSeed != null}
        onOpenChange={(open) => {
          if (!open) setStudentSeed(null);
        }}
        seed={studentSeed}
      />
      <PerfilIndividual
        estudante={estudanteSel}
        ano={filtros.ano}
        edicao={filtros.edicao}
        avaliacaoId={filtros.avaliacaoId}
        onFechar={() => setEstudanteSel(null)}
      />
    </div>
  );
}

function ResumoTabela({
  rows,
}: {
  rows: Array<
    Indicadores & {
      id: string;
      nome: string;
    }
  >;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Role para o lado para ver % PL1–LF, IFL, PPM e precisão. O cabeçalho permanece visível ao rolar.
      </p>
      <div className="relative">
        <div className="max-h-[min(70vh,28rem)] overflow-auto rounded-md border">
          <table className="w-full min-w-[1100px] caption-bottom text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 top-0 z-30 bg-card shadow-[1px_0_0_0_hsl(var(--border))]">
                  Nome
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-card text-right">Previstos</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card text-right">Avaliados</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card text-right">Participação</TableHead>
                {NIVEIS.map((n) => {
                  const cor = getPerfilLeitorStyle(n.code).hex;
                  return (
                    <TableHead
                      key={n.code}
                      className="sticky top-0 z-20 bg-card text-right font-semibold"
                      style={{ color: cor }}
                    >
                      % {n.short}
                    </TableHead>
                  );
                })}
                <TableHead className="sticky top-0 z-20 bg-card text-right">IFL</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card text-right">PPM</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card text-right">Precisão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10 + NIVEIS.length} className="text-center text-muted-foreground">
                    Nenhum dado no escopo selecionado.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id} className="group">
                    <TableCell className="sticky left-0 z-10 bg-card font-medium shadow-[1px_0_0_0_hsl(var(--border))] group-hover:bg-muted/50">
                      {r.nome}
                    </TableCell>
                    <TableCell className="text-right">{r.previstos}</TableCell>
                    <TableCell className="text-right">{r.avaliados}</TableCell>
                    <TableCell className="text-right">{formatPct(r.participacao)}</TableCell>
                    {NIVEIS.map((n) => (
                      <TableCell
                        key={n.code}
                        className="text-right font-medium"
                        style={{ color: getPerfilLeitorStyle(n.code).hex }}
                      >
                        {formatPct(percentualFaixa(r.distribuicao, n.code))}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">{formatDecimal(r.ifl)}</TableCell>
                    <TableCell className="text-right">{formatDecimal(r.ppmMedio)}</TableCell>
                    <TableCell className="text-right">{formatPct(r.precisaoMedia)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </table>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-md bg-gradient-to-l from-card to-transparent"
        />
      </div>
    </div>
  );
}
