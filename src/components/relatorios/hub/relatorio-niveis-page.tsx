"use client";

import { Layers } from "lucide-react";
import { DistribuicaoBarra } from "@/components/relatorios/fluencia/distribuicao-barra";
import { RelatorioShell } from "@/components/relatorios/hub/relatorio-shell";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRelatorioFluencia } from "@/lib/relatorios-fluencia/store";
import { formatDecimal, formatPct } from "@/lib/relatorios-fluencia/format";
import { NIVEL_COLOR } from "@/lib/relatorios-fluencia/types";

export function RelatorioNiveisPage() {
  return (
    <RelatorioShell
      title="Níveis / perfil leitor"
      description="Distribuição dos perfis leitores (PL1–LF) no recorte selecionado."
      icon={Layers}
    >
      <NiveisContent />
    </RelatorioShell>
  );
}

function NiveisContent() {
  const { relatorio, reportLoading } = useRelatorioFluencia();
  const ind = relatorio?.indicadores;

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard variant="metric" label="IFL" value={ind ? formatDecimal(ind.ifl) : "—"} icon={Layers} loading={reportLoading} />
        <StatCard
          variant="metric"
          label="Leitores fluentes"
          value={ind ? formatPct(ind.leitoresFluentesPct) : "—"}
          icon={Layers}
          loading={reportLoading}
        />
        <StatCard
          variant="featured"
          label="Pré-leitores"
          value={ind ? formatPct(ind.preLeitoresPct) : "—"}
          icon={Layers}
          loading={reportLoading}
        />
      </section>

      <SectionCard title="Distribuição" description={relatorio?.escopoLabel ?? "Recorte atual"}>
        {ind?.distribuicao?.length ? <DistribuicaoBarra distribuicao={ind.distribuicao} /> : (
          <p className="text-sm text-muted-foreground">Sem distribuição neste recorte.</p>
        )}
      </SectionCard>

      <SectionCard title="Detalhe por nível">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nível</TableHead>
                <TableHead>Estudantes</TableHead>
                <TableHead>Percentual</TableHead>
                <TableHead>Δ edição anterior</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(ind?.distribuicao ?? []).map((row) => (
                <TableRow key={row.code}>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: NIVEL_COLOR[row.code] }}
                        aria-hidden
                      />
                      {row.label}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold tabular-nums" style={{ color: NIVEL_COLOR[row.code] }}>
                    {row.estudantes}
                  </TableCell>
                  <TableCell>{formatPct(row.percentual)}</TableCell>
                  <TableCell>
                    {row.delta == null ? "—" : `${row.delta > 0 ? "+" : ""}${formatDecimal(row.delta)} p.p.`}
                  </TableCell>
                </TableRow>
              ))}
              {!ind?.distribuicao?.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Sem níveis neste recorte.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </>
  );
}
