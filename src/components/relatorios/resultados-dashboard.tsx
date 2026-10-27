"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  Gauge,
  Info,
  Layers,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { listGuidedAutoSessions } from "@/lib/api/afirme-reading/guided-auto-sessions";
import type { GuidedAutoSession } from "@/lib/api/afirme-reading/types";
import { getRelatorioResultados, getResultadosFiltros } from "@/lib/api/afirme-reading/resultados";
import { getApiErrorMessage } from "@/lib/api/errors";
import { ROUTES } from "@/config/routes";
import { countPrioridadeIntervencao, mediaCompreensao } from "@/lib/relatorios-fluencia/derived";
import { formatDecimal, formatPct } from "@/lib/relatorios-fluencia/format";
import {
  CATALOGO_VAZIO,
  EDICAO_LABEL,
  EDICOES_ORDEM,
  type AvaliacaoFiltro,
  type CatalogoFiltrosRelatorio,
  type EdicaoCode,
  type FiltrosRelatorio,
  type RelatorioResultados,
} from "@/lib/relatorios-fluencia/types";
import { AdminCityPicker } from "@/components/auth/admin-city-picker";
import { DashboardPanorama } from "@/components/dashboard/dashboard-panorama";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { PerfilLeitorBadge } from "@/components/shared/perfil-leitor-badge";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ALL = "__all__";
const BRAND_COLOR = "#7030A0";
const BRAND_SOFT = "#c4b0d6";

function emptyFiltros(ano: number, avaliacaoId: string, edicao: EdicaoCode, escolaId: string): FiltrosRelatorio {
  return { ano, edicao, avaliacaoId, redeId: "", municipioId: "", escolaId, serieId: "", turmaId: "", turno: "" };
}

/** Para a evolução no ano: a avaliação de cada edição que mais compartilha escolas com a escolhida. */
function pickForEdition(list: AvaliacaoFiltro[], edicao: EdicaoCode, base: AvaliacaoFiltro | null) {
  const candidates = list.filter((item) => item.edicao === edicao);
  if (!candidates.length) return null;
  if (base && base.edicao === edicao) return base;
  const baseSchools = new Set(base?.escolaIds ?? []);
  return [...candidates].sort(
    (a, b) =>
      b.escolaIds.filter((id) => baseSchools.has(id)).length - a.escolaIds.filter((id) => baseSchools.has(id)).length
  )[0];
}

interface EdicaoResumo {
  edicao: EdicaoCode;
  label: string;
  avaliacaoTitulo: string | null;
  ifl: number | null;
  ppm: number | null;
  fluentes: number | null;
  participacao: number | null;
}

export function ResultadosDashboard() {
  const [cityReady, setCityReady] = useState(false);
  const [cityKey, setCityKey] = useState("none");
  const [catalog, setCatalog] = useState<CatalogoFiltrosRelatorio>(CATALOGO_VAZIO);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [avaliacaoId, setAvaliacaoId] = useState("");
  const [escolaId, setEscolaId] = useState("");
  const [relatorio, setRelatorio] = useState<RelatorioResultados | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [evolucao, setEvolucao] = useState<EdicaoResumo[]>([]);
  const [evolucaoLoading, setEvolucaoLoading] = useState(false);
  const [pratica, setPratica] = useState<GuidedAutoSession[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const handleCityReadyChange = useCallback((ready: boolean, cityId: string | null) => {
    setCityReady(ready);
    setCityKey(cityId || "none");
    if (!ready) {
      setCatalog(CATALOGO_VAZIO);
      setRelatorio(null);
    }
  }, []);

  const canLoad = cityReady && cityKey !== "none";

  useEffect(() => {
    if (!canLoad) return;
    const ac = new AbortController();
    setCatalogLoading(true);
    setCatalogError(null);
    getResultadosFiltros({ signal: ac.signal })
      .then((data) => {
        if (ac.signal.aborted) return;
        const next: CatalogoFiltrosRelatorio = {
          anos: data.anos ?? [],
          edicoes: data.edicoes ?? [],
          avaliacoes: data.avaliacoes ?? [],
          redes: data.redes ?? [],
          municipios: data.municipios ?? [],
          escolas: data.escolas ?? [],
          series: data.series ?? [],
          turmas: data.turmas ?? [],
        };
        setCatalog(next);
        const lastYear = next.anos.length ? next.anos[next.anos.length - 1] : new Date().getFullYear();
        setAno(lastYear);
        const ofYear = next.avaliacoes.filter((item) => item.ano === lastYear);
        // Mais recente: a última edição do ano que tem avaliação.
        const preferred = [...EDICOES_ORDEM].reverse().map((edicao) => ofYear.find((item) => item.edicao === edicao)).find(Boolean);
        setAvaliacaoId(preferred?.id ?? "");
        setEscolaId("");
      })
      .catch((error) => {
        if (ac.signal.aborted || axios.isCancel(error)) return;
        setCatalogError(getApiErrorMessage(error, "Não foi possível carregar os filtros de resultados."));
      })
      .finally(() => !ac.signal.aborted && setCatalogLoading(false));
    return () => ac.abort();
  }, [canLoad, cityKey, reloadKey]);

  const avaliacoesDoAno = useMemo(() => catalog.avaliacoes.filter((item) => item.ano === ano), [catalog.avaliacoes, ano]);
  const avaliacao = avaliacoesDoAno.find((item) => item.id === avaliacaoId) ?? null;
  const escolasDaAvaliacao = useMemo(() => {
    if (!avaliacao) return [];
    const ids = new Set(avaliacao.escolaIds);
    return catalog.escolas.filter((escola) => ids.size === 0 || ids.has(escola.id));
  }, [avaliacao, catalog.escolas]);

  useEffect(() => {
    if (!canLoad || !avaliacao) {
      setRelatorio(null);
      return;
    }
    const ac = new AbortController();
    setReportLoading(true);
    setReportError(null);
    getRelatorioResultados(emptyFiltros(ano, avaliacao.id, avaliacao.edicao, escolaId), { signal: ac.signal })
      .then((data) => !ac.signal.aborted && setRelatorio(data))
      .catch((error) => {
        if (ac.signal.aborted || axios.isCancel(error)) return;
        setRelatorio(null);
        setReportError(getApiErrorMessage(error, "Não foi possível carregar os resultados."));
      })
      .finally(() => !ac.signal.aborted && setReportLoading(false));
    return () => ac.abort();
  }, [canLoad, ano, avaliacao, escolaId, reloadKey]);

  useEffect(() => {
    if (!canLoad || !avaliacao) {
      setEvolucao([]);
      return;
    }
    const ac = new AbortController();
    setEvolucaoLoading(true);
    void Promise.all(
      EDICOES_ORDEM.map(async (edicao): Promise<EdicaoResumo> => {
        const alvo = pickForEdition(avaliacoesDoAno, edicao, avaliacao);
        const vazio: EdicaoResumo = {
          edicao,
          label: EDICAO_LABEL[edicao],
          avaliacaoTitulo: alvo?.titulo ?? null,
          ifl: null,
          ppm: null,
          fluentes: null,
          participacao: null,
        };
        if (!alvo) return vazio;
        try {
          const data = await getRelatorioResultados(emptyFiltros(ano, alvo.id, edicao, escolaId), { signal: ac.signal });
          return {
            ...vazio,
            ifl: data.indicadores?.ifl ?? null,
            ppm: data.indicadores?.ppmMedio ?? null,
            fluentes: data.indicadores?.leitoresFluentesPct ?? null,
            participacao: data.indicadores?.participacao ?? null,
          };
        } catch {
          return vazio;
        }
      })
    ).then((rows) => {
      if (ac.signal.aborted) return;
      setEvolucao(rows);
      setEvolucaoLoading(false);
    });
    return () => ac.abort();
  }, [canLoad, ano, avaliacao, avaliacoesDoAno, escolaId, reloadKey]);

  useEffect(() => {
    if (!canLoad) {
      setPratica(null);
      return;
    }
    let cancelled = false;
    listGuidedAutoSessions({ limit: 100 })
      .then((data) => !cancelled && setPratica(data))
      .catch(() => !cancelled && setPratica(null));
    return () => {
      cancelled = true;
    };
  }, [canLoad, cityKey, reloadKey]);

  const ind = relatorio?.indicadores;
  const compreensao = mediaCompreensao(relatorio?.estudantes);
  const prioridade = countPrioridadeIntervencao(ind?.distribuicao);
  const turmas = useMemo(() => [...(relatorio?.porTurma ?? [])].sort((a, b) => b.ifl - a.ifl), [relatorio?.porTurma]);
  const evolucaoChart = evolucao
    .filter((row) => row.ifl != null)
    .map((row) => ({ edicao: row.label.replace("Avaliação de ", "").replace("Avaliação ", ""), IFL: row.ifl, "Fluentes %": row.fluentes }));

  const praticaResumo = useMemo(() => {
    if (!pratica) return null;
    const concluidas = pratica.filter((session) => session.status === "completed");
    const media = (values: Array<number | null | undefined>) => {
      const valid = values.filter((value): value is number => typeof value === "number" && !Number.isNaN(value));
      return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
    };
    return {
      total: pratica.length,
      concluidas: concluidas.length,
      emAndamento: pratica.filter((session) => session.status === "queued" || session.status === "processing").length,
      falhas: pratica.filter((session) => session.status === "failed").length,
      plcm: media(concluidas.map((session) => session.calculatedPlcm)),
      precisao: media(concluidas.map((session) => session.calculatedAccuracy)),
    };
  }, [pratica]);

  return (
    <PageShell>
      <PageHeader
        title="Painel de resultados"
        description="Fluência leitora da rede: indicadores, evolução no ano, turmas e alertas pedagógicos."
        icon={BarChart3}
      >
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href={ROUTES.leitura.relatoriosFluencia}>Relatório completo</Link>
        </Button>
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href={ROUTES.leitura.avaliacoes.root}>Avaliações aplicadas</Link>
        </Button>
      </PageHeader>

      <AdminCityPicker onCityReadyChange={handleCityReadyChange} />

      {!canLoad ? (
        <p className="surface-panel border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Selecione o município para carregar os resultados.
        </p>
      ) : catalogError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">{catalogError}</p>
            <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="resultados-ano" className="text-xs text-muted-foreground">
                  Ano
                </Label>
                <Select
                  value={String(ano)}
                  onValueChange={(value) => {
                    const next = Number(value);
                    setAno(next);
                    const ofYear = catalog.avaliacoes.filter((item) => item.ano === next);
                    setAvaliacaoId(ofYear[ofYear.length - 1]?.id ?? "");
                    setEscolaId("");
                  }}
                  disabled={catalogLoading || catalog.anos.length === 0}
                >
                  <SelectTrigger id="resultados-ano" className="h-10">
                    <SelectValue placeholder={catalogLoading ? "Carregando..." : "Ano"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(catalog.anos.length ? catalog.anos : [ano]).map((item) => (
                      <SelectItem key={item} value={String(item)}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="resultados-avaliacao" className="text-xs text-muted-foreground">
                  Avaliação
                </Label>
                <Select
                  value={avaliacaoId || undefined}
                  onValueChange={(value) => {
                    setAvaliacaoId(value);
                    setEscolaId("");
                  }}
                  disabled={catalogLoading || avaliacoesDoAno.length === 0}
                >
                  <SelectTrigger id="resultados-avaliacao" className="h-10">
                    <SelectValue placeholder={avaliacoesDoAno.length ? "Selecione a avaliação" : "Nenhuma avaliação no ano"} />
                  </SelectTrigger>
                  <SelectContent>
                    {avaliacoesDoAno.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.titulo} · {item.edicaoLabel ?? EDICAO_LABEL[item.edicao]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="resultados-escola" className="text-xs text-muted-foreground">
                  Escola
                </Label>
                <Select
                  value={escolaId || ALL}
                  onValueChange={(value) => setEscolaId(value === ALL ? "" : value)}
                  disabled={!avaliacao}
                >
                  <SelectTrigger id="resultados-escola" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todas as escolas</SelectItem>
                    {escolasDaAvaliacao.map((escola) => (
                      <SelectItem key={escola.id} value={escola.id}>
                        {escola.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {!catalogLoading && avaliacoesDoAno.length === 0 ? (
            <p className="surface-panel border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma avaliação de fluência com resultados neste ano.
            </p>
          ) : null}

          {reportError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Resultados indisponíveis</AlertTitle>
              <AlertDescription>{reportError}</AlertDescription>
            </Alert>
          ) : null}

          {avaliacao ? (
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicadores">
              <StatCard
                variant="featured"
                label="IFL"
                value={ind ? formatDecimal(ind.ifl) : "—"}
                trend={relatorio?.escopoLabel || "Índice de fluência leitora (0 a 10)"}
                icon={BarChart3}
                loading={reportLoading}
              />
              <StatCard
                variant="metric"
                label="Participação"
                value={formatPct(ind?.participacao)}
                trend={ind ? `${ind.avaliados} de ${ind.previstos} estudantes avaliados` : undefined}
                icon={Users}
                loading={reportLoading}
              />
              <StatCard
                variant="metric"
                label="Palavras por minuto"
                value={ind ? `${formatDecimal(ind.ppmMedio)} ppm` : "—"}
                trend={ind ? `Precisão média ${formatPct(ind.precisaoMedia)}` : undefined}
                icon={Gauge}
                loading={reportLoading}
              />
              <StatCard
                variant="metric"
                label="Compreensão média"
                value={formatPct(compreensao)}
                trend={ind ? `${prioridade} estudante(s) em PL1 e PL2` : undefined}
                icon={Target}
                loading={reportLoading}
              />
            </section>
          ) : null}

          {reportLoading ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : relatorio ? (
            <>
              <DashboardPanorama relatorio={relatorio} />

              <SectionCard
                icon={TrendingUp}
                title="Evolução no ano"
                description="Entrada, formativa e saída do mesmo ano (a avaliação de cada edição com mais escolas em comum)."
              >
                {evolucaoLoading ? (
                  <Skeleton className="h-56 w-full" />
                ) : evolucaoChart.length < 2 ? (
                  <p className="text-sm text-muted-foreground">
                    É preciso ao menos duas edições com resultado no ano para mostrar a evolução.
                  </p>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="h-[260px] w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={evolucaoChart}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="edicao" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(value) => formatDecimal(Number(value))} />
                          <Legend />
                          <Bar dataKey="IFL" fill={BRAND_COLOR} radius={[6, 6, 0, 0]} />
                          <Bar dataKey="Fluentes %" fill={BRAND_SOFT} radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Edição</TableHead>
                          <TableHead className="text-right">IFL</TableHead>
                          <TableHead className="text-right">PPM</TableHead>
                          <TableHead className="text-right">Fluentes</TableHead>
                          <TableHead className="text-right">Participação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {evolucao.map((row) => (
                          <TableRow key={row.edicao}>
                            <TableCell>
                              {row.label}
                              {row.avaliacaoTitulo ? (
                                <span className="block text-xs text-muted-foreground">{row.avaliacaoTitulo}</span>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{formatDecimal(row.ifl)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatDecimal(row.ppm)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatPct(row.fluentes)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatPct(row.participacao)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </SectionCard>

              <SectionCard icon={Layers} title="Turmas" description="Ordenadas pelo IFL do recorte.">
                {turmas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma turma no recorte.</p>
                ) : (
                  <div className="-mx-1 max-h-[420px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Turma</TableHead>
                          <TableHead>Escola</TableHead>
                          <TableHead className="text-right">Avaliados</TableHead>
                          <TableHead className="text-right">IFL</TableHead>
                          <TableHead className="text-right">PPM</TableHead>
                          <TableHead className="text-right">Precisão</TableHead>
                          <TableHead className="text-right">Fluentes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {turmas.map((turma) => (
                          <TableRow key={turma.turmaId}>
                            <TableCell className="font-medium">{turma.turmaNome}</TableCell>
                            <TableCell className="max-w-[220px] truncate">{turma.escolaNome}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {turma.avaliados}/{turma.previstos}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{formatDecimal(turma.ifl)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatDecimal(turma.ppmMedio)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatPct(turma.precisaoMedia)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatPct(turma.leitoresFluentesPct)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </SectionCard>

              <div className="grid gap-4 lg:grid-cols-2">
                <SectionCard icon={AlertTriangle} title="Alertas pedagógicos" description="Sinais do recorte atual.">
                  {relatorio.alertas?.length ? (
                    <div className="space-y-2">
                      {relatorio.alertas.map((alerta) => (
                        <Alert
                          key={alerta.id}
                          variant={alerta.severidade === "info" ? "default" : "destructive"}
                          className={
                            alerta.severidade === "warning"
                              ? "border-amber-300 bg-amber-50 py-3 text-amber-950 [&>svg]:text-amber-700"
                              : alerta.severidade === "info"
                                ? "border-sky-200 bg-sky-50 py-3"
                                : "py-3"
                          }
                        >
                          {alerta.severidade === "info" ? <Info className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                          <AlertTitle className="flex flex-wrap items-center gap-2 text-sm">
                            {alerta.titulo}
                            {alerta.nivelCode ? <PerfilLeitorBadge code={alerta.nivelCode} /> : null}
                          </AlertTitle>
                          <AlertDescription className="text-xs">{alerta.descricao}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum alerta para este recorte.</p>
                  )}
                </SectionCard>
                <SectionCard icon={BookOpen} title="Leitura analítica" variant="highlight">
                  <p className="text-sm leading-relaxed">
                    {relatorio.leituraAnalitica || "Sem leitura analítica para este recorte."}
                  </p>
                </SectionCard>
              </div>
            </>
          ) : null}

          <SectionCard
            icon={Bot}
            title="Prática com leitura automática"
            description="Últimas 100 sessões do município; médias das concluídas."
            actions={
              <Button variant="outline" size="sm" asChild>
                <Link href={ROUTES.leitura.automatica.root}>Abrir</Link>
              </Button>
            }
          >
            {!praticaResumo ? (
              <p className="text-sm text-muted-foreground">Sem sessões de leitura automática disponíveis.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <StatCard compact label="Sessões" value={praticaResumo.total} icon={Bot} />
                <StatCard compact label="Concluídas" value={praticaResumo.concluidas} icon={Bot} />
                <StatCard compact label="Em correção" value={praticaResumo.emAndamento} icon={Bot} />
                <StatCard compact label="PLCM médio" value={formatDecimal(praticaResumo.plcm)} icon={Gauge} />
                <StatCard compact label="Precisão média" value={formatPct(praticaResumo.precisao)} icon={Target} />
              </div>
            )}
          </SectionCard>
        </>
      )}
    </PageShell>
  );
}
