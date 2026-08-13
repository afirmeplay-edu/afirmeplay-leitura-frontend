"use client";

import {
  AlertTriangle,
  BarChart3,
  Download,
  FileSpreadsheet,
  Info,
  Printer,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RelatorioFiltros } from "@/components/relatorios/fluencia/filtros";
import { DistribuicaoBarra } from "@/components/relatorios/fluencia/distribuicao-barra";
import { EstudantesHoverCount } from "@/components/relatorios/fluencia/estudantes-hover";
import { descricaoPesosIfl } from "@/lib/relatorios-fluencia/analise";
import { exportarRelatorioExcel } from "@/lib/relatorios-fluencia/exportar";
import { pctNivel } from "@/lib/relatorios-fluencia/calc";
import {
  RelatorioFluenciaProvider,
  computarRelatorio,
  useRelatorioFluencia,
} from "@/lib/relatorios-fluencia/store";
import {
  CRITERIO_FLUENCIA,
  NIVEIS,
  NIVEL_COLOR,
  type Indicadores,
  type RelatorioPor,
} from "@/lib/relatorios-fluencia/types";
import { getMockStudents } from "@/lib/mock/students";

export function RelatorioFluenciaPage() {
  return (
    <RelatorioFluenciaProvider>
      <RelatorioFluenciaContent />
    </RelatorioFluenciaProvider>
  );
}

function RelatorioFluenciaContent() {
  const {
    relatorio,
    catalog,
    relatorioPor,
    setRelatorioPor,
    itemId,
    setItemId,
    aplicarRecorte,
    filtros,
  } = useRelatorioFluencia();
  const ind = relatorio.indicadores;

  const itemOptions = (() => {
    if (relatorioPor === "escola") {
      return catalog.escolas
        .filter((e) => !filtros.municipioId || e.municipioId === filtros.municipioId)
        .map((e) => ({ id: e.id, label: e.nome }));
    }
    if (relatorioPor === "turma") {
      return catalog.turmas
        .filter((t) => !filtros.escolaId || t.escolaId === filtros.escolaId)
        .map((t) => ({ id: t.id, label: `${t.nome}` }));
    }
    return getMockStudents()
      .filter((s) => {
        if (filtros.escolaId && s.schoolId !== filtros.escolaId) return false;
        if (filtros.turmaId && s.classId !== filtros.turmaId) return false;
        return true;
      })
      .map((s) => ({ id: s.id, label: s.name }));
  })();

  return (
    <PageShell className="print:bg-white">
      <div className="print:hidden">
        <PageHeader
          title="Relatório de resultados — Fluência"
          description="Indicadores de participação, IFL, distribuição por perfil leitor e alertas pedagógicos (dados mock)."
          icon={BarChart3}
        >
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir / PDF
          </Button>
          <Button type="button" onClick={() => exportarRelatorioExcel(relatorio)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Baixar Excel
          </Button>
        </PageHeader>
      </div>

      <div className="print:hidden space-y-4">
        <RelatorioFiltros />

        <div className="rounded-xl border bg-white p-4">
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
            <div className="w-full flex-1 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Item</Label>
              <Select value={itemId || undefined} onValueChange={setItemId}>
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
            <Button
              type="button"
              disabled={!itemId}
              onClick={() => {
                aplicarRecorte();
                const recorteRelatorio = computarRelatorio(filtros, relatorioPor, itemId);
                exportarRelatorioExcel(recorteRelatorio);
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar relatório
            </Button>
          </div>
        </div>
      </div>

      {/* Cabeçalho do relatório */}
      <div className="space-y-1 border-b pb-4">
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Relatório de resultados — {relatorio.tituloEdicao}
        </h2>
        <p className="text-sm text-muted-foreground">{relatorio.escopoLabel}</p>
        <p className="text-xs text-muted-foreground">
          Emitido em {relatorio.emitidoEm.toLocaleString("pt-BR")}
        </p>
      </div>

      {/* 8 KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Previstos" value={ind.previstos} icon={Users} />
        <StatCard label="Avaliados" value={ind.avaliados} icon={Users} />
        <StatCard label="Participação" value={`${ind.participacao}%`} icon={BarChart3} />
        <StatCard label="IFL" value={ind.ifl} icon={BarChart3} />
        <StatCard label="Leitores fluentes" value={`${ind.leitoresFluentesPct}%`} icon={BarChart3} />
        <StatCard label="Pré-leitores" value={`${ind.preLeitoresPct}%`} icon={BarChart3} />
        <StatCard label="PPM médio" value={ind.ppmMedio} icon={BarChart3} />
        <StatCard label="Precisão média" value={`${ind.precisaoMedia}%`} icon={BarChart3} />
      </div>

      {/* Distribuição */}
      <SectionCard title="Distribuição por perfil leitor">
        <div className="space-y-6">
          <DistribuicaoBarra distribuicao={ind.distribuicao} />

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
              {ind.distribuicao.map((d) => (
                <TableRow key={d.code}>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: NIVEL_COLOR[d.code] }} />
                      {d.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <EstudantesHoverCount bucket={d} />
                  </TableCell>
                  <TableCell className="text-right">{d.percentual}%</TableCell>
                  {relatorio.indicadoresAnteriores ? (
                    <TableCell className="text-right">
                      {d.delta == null ? "—" : d.delta > 0 ? `+${d.delta} pp` : `${d.delta} pp`}
                    </TableCell>
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

      {relatorio.alertas.length > 0 ? (
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
                <AlertTitle>{a.titulo}</AlertTitle>
                <AlertDescription>{a.descricao}</AlertDescription>
              </Alert>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Resumo por escola">
        <ResumoTabela
          rows={relatorio.porEscola.map((e) => ({
            id: e.escolaId,
            nome: e.escolaNome,
            ...e,
          }))}
        />
      </SectionCard>

      <SectionCard title="Resumo por turma">
        <ResumoTabela
          rows={relatorio.porTurma.map((t) => ({
            id: t.turmaId,
            nome: `${t.turmaNome} (${t.escolaNome})`,
            ...t,
          }))}
        />
      </SectionCard>

      <footer className="rounded-xl border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">Critérios de classificação</p>
        <p className="mt-1">Pesos do IFL: {descricaoPesosIfl()}.</p>
        <p className="mt-1">IFL = média ponderada dos pesos dos níveis dos estudantes avaliados.</p>
        <p className="mt-1">{CRITERIO_FLUENCIA}</p>
      </footer>
    </PageShell>
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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="text-right">Previstos</TableHead>
            <TableHead className="text-right">Avaliados</TableHead>
            <TableHead className="text-right">Participação</TableHead>
            {NIVEIS.map((n) => (
              <TableHead key={n.code} className="text-right">
                % {n.short}
              </TableHead>
            ))}
            <TableHead className="text-right">IFL</TableHead>
            <TableHead className="text-right">PPM</TableHead>
            <TableHead className="text-right">Precisão</TableHead>
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
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.nome}</TableCell>
                <TableCell className="text-right">{r.previstos}</TableCell>
                <TableCell className="text-right">{r.avaliados}</TableCell>
                <TableCell className="text-right">{r.participacao}%</TableCell>
                {NIVEIS.map((n) => (
                  <TableCell key={n.code} className="text-right">
                    {pctNivel(r, n.code)}%
                  </TableCell>
                ))}
                <TableCell className="text-right">{r.ifl}</TableCell>
                <TableCell className="text-right">{r.ppmMedio}</TableCell>
                <TableCell className="text-right">{r.precisaoMedia}%</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
