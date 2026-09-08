"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  ClipboardList,
  Gauge,
  Info,
  Layers,
  type LucideIcon,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { DASHBOARD_FEATURE_CARDS } from "@/config/navigation";
import { getRelatorioResultados, getResultadosFiltros } from "@/lib/api/afirme-reading/resultados";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getSelectedCityId, getSelectedCitySlug } from "@/lib/city-domain";
import { countPrioridadeIntervencao } from "@/lib/relatorios-fluencia/derived";
import { formatDecimal, formatPct } from "@/lib/relatorios-fluencia/format";
import {
  avaliacoesDoFiltro,
  type CatalogoFiltrosRelatorio,
  type EdicaoCode,
  type FiltrosRelatorio,
  type RelatorioResultados,
} from "@/lib/relatorios-fluencia/types";
import { AdminCityPicker } from "@/components/auth/admin-city-picker";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { DashboardPanorama } from "@/components/dashboard/dashboard-panorama";
import { ShortcutTile } from "@/components/dashboard/shortcut-tile";
import { PageShell } from "@/components/shared/page-shell";
import { PerfilLeitorBadge } from "@/components/shared/perfil-leitor-badge";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

const SHORTCUT_ICONS: Record<string, LucideIcon> = {
  "/app/avaliacao-fluencia": Gauge,
  "/app/avaliacao-leitura-guiada": BookOpen,
  "/app/avaliacoes": Layers,
  "/app/relatorios-fluencia": BarChart3,
};

function hasCityContext() {
  return Boolean(getSelectedCityId() || getSelectedCitySlug());
}

function pickAvaliacaoId(catalog: CatalogoFiltrosRelatorio, ano: number, edicao: EdicaoCode) {
  const list = avaliacoesDoFiltro(catalog, ano, edicao);
  return list.length === 1 ? list[0].id : "";
}

function defaultFiltros(catalog: CatalogoFiltrosRelatorio): FiltrosRelatorio {
  const ano = catalog.anos.length > 0 ? catalog.anos[catalog.anos.length - 1] : new Date().getFullYear();
  const ids = catalog.edicoes.map((e) => e.id);
  const edicao: EdicaoCode = ids.includes("formativa") ? "formativa" : (ids[0] ?? "formativa");
  return {
    ano,
    edicao,
    avaliacaoId: pickAvaliacaoId(catalog, ano, edicao),
    redeId: "",
    municipioId: "",
    escolaId: "",
    serieId: "",
    turmaId: "",
    turno: "",
  };
}

function ppmTrend(atual: number | undefined, anterior: number | null | undefined) {
  if (atual == null || anterior == null || Number.isNaN(atual) || Number.isNaN(anterior)) {
    return "Palavras por minuto na rede";
  }
  const delta = atual - anterior;
  const formatted = formatDecimal(Math.abs(delta));
  if (delta > 0) return `+${formatted} ppm em relação à edição anterior`;
  if (delta < 0) return `-${formatted} ppm em relação à edição anterior`;
  return "Sem variação em relação à edição anterior";
}

export function DashboardHome() {
  const [cityReady, setCityReady] = useState(false);
  const [cityKey, setCityKey] = useState("none");
  const [loading, setLoading] = useState(false);
  const [relatorio, setRelatorio] = useState<RelatorioResultados | null>(null);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);

  const handleCityReadyChange = useCallback((ready: boolean, cityId: string | null) => {
    setCityReady(ready);
    setCityKey(cityId || "none");
    if (!ready) {
      setRelatorio(null);
      setEmptyMessage(null);
    }
  }, []);

  const canLoad = cityReady && cityKey !== "none";

  useEffect(() => {
    if (!canLoad || !hasCityContext()) return;

    const ac = new AbortController();
    setLoading(true);
    setEmptyMessage(null);

    void (async () => {
      try {
        const filtrosData = await getResultadosFiltros({ signal: ac.signal });
        if (ac.signal.aborted) return;

        const catalog: CatalogoFiltrosRelatorio = {
          anos: filtrosData.anos ?? [],
          edicoes: filtrosData.edicoes ?? [],
          avaliacoes: filtrosData.avaliacoes ?? [],
          redes: filtrosData.redes ?? [],
          municipios: filtrosData.municipios ?? [],
          escolas: filtrosData.escolas ?? [],
          series: filtrosData.series ?? [],
          turmas: filtrosData.turmas ?? [],
        };

        const filtros = defaultFiltros(catalog);
        if (!filtros.avaliacaoId) {
          const list = avaliacoesDoFiltro(catalog, filtros.ano, filtros.edicao);
          if (list.length === 0) {
            setRelatorio(null);
            setEmptyMessage("Nenhuma avaliação disponível para o período padrão.");
            return;
          }
          filtros.avaliacaoId = list[0].id;
        }

        const report = await getRelatorioResultados(filtros, { signal: ac.signal });
        if (ac.signal.aborted) return;
        setRelatorio(report);
      } catch (error) {
        if (ac.signal.aborted || axios.isCancel(error)) return;
        setRelatorio(null);
        toast.error(getApiErrorMessage(error, "Não foi possível carregar os indicadores do painel."));
        setEmptyMessage("Não foi possível carregar os indicadores.");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [canLoad, cityKey]);

  const ind = relatorio?.indicadores;
  const prioridade = countPrioridadeIntervencao(ind?.distribuicao);
  const fluentesCount = ind?.distribuicao?.find((d) => d.code === "LF")?.estudantes ?? null;
  const topAlertas = [...(relatorio?.alertas ?? [])].slice(0, 3);

  return (
    <PageShell>
      <AdminCityPicker onCityReadyChange={handleCityReadyChange} />

      <DashboardHero distribuicao={ind?.distribuicao} />

      {!canLoad ? (
        <p className="text-sm text-muted-foreground">
          Selecione o município para carregar o panorama da rede.
        </p>
      ) : null}

      {canLoad && loading ? (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </section>
      ) : null}

      {canLoad && !loading ? (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {emptyMessage ? (
            <p className="col-span-full text-sm text-muted-foreground">{emptyMessage}</p>
          ) : null}
          <StatCard
            variant="featured"
            label="IFL da rede"
            value={ind ? formatDecimal(ind.ifl) : "—"}
            icon={BarChart3}
            trend="Índice de fluência leitora (0 a 10)"
          />
          <StatCard
            variant="metric"
            label="Palavras por minuto"
            value={ind ? `${formatDecimal(ind.ppmMedio)} ppm` : "—"}
            icon={Gauge}
            trend={ppmTrend(ind?.ppmMedio, relatorio?.indicadoresAnteriores?.ppmMedio)}
          />
          <StatCard
            variant="metric"
            label="Leitores fluentes"
            value={formatPct(ind?.leitoresFluentesPct)}
            icon={BookOpen}
            trend={
              fluentesCount != null && ind
                ? `${fluentesCount} de ${ind.avaliados} estudantes`
                : "Perfil LF no recorte"
            }
          />
          <StatCard
            variant="metric"
            label="Prioridade PL1 e PL2"
            value={ind ? String(prioridade) : "—"}
            icon={AlertTriangle}
            trend="Intervenção imediata"
          />
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {DASHBOARD_FEATURE_CARDS.map((card) => (
          <ShortcutTile
            key={card.href}
            href={card.href}
            label={card.label}
            description={card.description}
            accent={card.accent}
            icon={SHORTCUT_ICONS[card.href] ?? ClipboardList}
          />
        ))}
      </section>

      {canLoad && loading ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : null}

      {canLoad && !loading && relatorio ? (
        <>
          <DashboardPanorama relatorio={relatorio} />

          {topAlertas.length ? (
            <SectionCard title="Alertas pedagógicos" description="Sinais do recorte atual" icon={AlertTriangle}>
              <div className="space-y-2">
                {topAlertas.map((alerta) => (
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
                    <AlertDescription className="line-clamp-2 text-xs">{alerta.descricao}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </SectionCard>
          ) : null}
        </>
      ) : null}
    </PageShell>
  );
}
