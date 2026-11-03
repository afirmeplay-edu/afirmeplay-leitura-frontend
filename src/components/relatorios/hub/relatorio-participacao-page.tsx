"use client";

import { Users } from "lucide-react";
import { RelatorioShell } from "@/components/relatorios/hub/relatorio-shell";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRelatorioFluencia } from "@/lib/relatorios-fluencia/store";
import { formatPct } from "@/lib/relatorios-fluencia/format";

export function RelatorioParticipacaoPage() {
  return (
    <RelatorioShell
      title="Participação"
      description="Previstos, avaliados e percentual de participação no recorte — escolas, séries e turmas."
      icon={Users}
    >
      <ParticipacaoContent />
    </RelatorioShell>
  );
}

function ParticipacaoContent() {
  const { relatorio, reportLoading } = useRelatorioFluencia();
  const ind = relatorio?.indicadores;

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard variant="metric" label="Previstos" value={ind?.previstos ?? 0} icon={Users} loading={reportLoading} />
        <StatCard variant="metric" label="Avaliados" value={ind?.avaliados ?? 0} icon={Users} loading={reportLoading} />
        <StatCard
          variant="featured"
          label="Participação"
          value={ind ? formatPct(ind.participacao) : "—"}
          icon={Users}
          loading={reportLoading}
        />
      </section>

      <SectionCard title="Por escola" description="Participação agregada no recorte atual.">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Escola</TableHead>
                <TableHead>Previstos</TableHead>
                <TableHead>Avaliados</TableHead>
                <TableHead>Participação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(relatorio?.porEscola ?? []).map((row) => (
                <TableRow key={row.escolaId}>
                  <TableCell className="font-medium">{row.escolaNome}</TableCell>
                  <TableCell>{row.previstos}</TableCell>
                  <TableCell>{row.avaliados}</TableCell>
                  <TableCell>{formatPct(row.participacao)}</TableCell>
                </TableRow>
              ))}
              {!relatorio?.porEscola?.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Sem escolas neste recorte.
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
