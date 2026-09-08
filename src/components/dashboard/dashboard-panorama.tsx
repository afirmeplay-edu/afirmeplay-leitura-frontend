"use client";

import { BarChart3, School, TrendingUp, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DistribuicaoBarra } from "@/components/relatorios/fluencia/distribuicao-barra";
import { SectionCard } from "@/components/shared/section-card";
import { PERFIL_ALFABETOMETRO_LABEL, type PerfilLeitorCode } from "@/lib/colors/reading-levels";
import { evolucaoComparativo } from "@/lib/relatorios-fluencia/derived";
import { formatDecimal, formatPct, percentualFaixa } from "@/lib/relatorios-fluencia/format";
import { NIVEIS, NIVEL_COLOR, type RelatorioResultados } from "@/lib/relatorios-fluencia/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function DashboardPanorama({ relatorio }: { relatorio: RelatorioResultados }) {
  const ind = relatorio.indicadores;
  const evolucao = evolucaoComparativo(ind, relatorio.indicadoresAnteriores);
  const topEscolas = [...(relatorio.porEscola ?? [])]
    .sort((a, b) => b.ifl - a.ifl)
    .slice(0, 8)
    .map((escola) => ({
      nome: escola.escolaNome,
      ifl: Number(escola.ifl.toFixed(2)),
      avaliados: escola.avaliados,
    }));
  const turmas = [...(relatorio.porTurma ?? [])].slice(0, 8).map((turma) => {
    const row: Record<string, string | number> = {
      turma: turma.turmaNome,
    };
    for (const nivel of NIVEIS) {
      row[nivel.short] = percentualFaixa(turma.distribuicao, nivel.code) ?? 0;
    }
    return row;
  });

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <SectionCard
        variant="banner"
        icon={BarChart3}
        title="Alfabetômetro"
        description="Termômetro de leitura da rede — PL1 a leitor fluente"
      >
        {ind?.distribuicao?.length ? (
          <div className="space-y-4">
            <DistribuicaoBarra distribuicao={ind.distribuicao} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="text-right">Estudantes</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ind.distribuicao.map((item) => (
                  <TableRow key={item.code}>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: NIVEL_COLOR[item.code] }}
                        />
                        {PERFIL_ALFABETOMETRO_LABEL[item.code as PerfilLeitorCode] ?? item.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold" style={{ color: NIVEL_COLOR[item.code] }}>
                      {item.estudantes}
                    </TableCell>
                    <TableCell className="text-right">{formatPct(item.percentual)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sem distribuição disponível.</p>
        )}
      </SectionCard>

      <SectionCard icon={School} title="Resumo por escola" description="IFL no recorte atual">
        {topEscolas.length ? (
          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topEscolas} layout="vertical" margin={{ left: 8, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="nome" width={110} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatDecimal(Number(value))} />
                <Bar dataKey="ifl" name="IFL" fill="#7030A0" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma escola no recorte.</p>
        )}
      </SectionCard>

      <SectionCard
        icon={TrendingUp}
        title="Evolução de fluência"
        description="Comparação com a edição anterior do recorte"
      >
        {relatorio.indicadoresAnteriores ? (
          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolucao}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="indicador" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="anterior" name="Edição anterior" fill="#c4b0d6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="atual" name="Edição atual" fill="#7030A0" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Não há edição anterior neste recorte para comparar a evolução.
          </p>
        )}
      </SectionCard>

      <SectionCard icon={Users} title="Perfis por turma" description="Participação percentual PL1–LF">
        {turmas.length ? (
          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={turmas}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="turma" tick={{ fontSize: 10 }} interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {NIVEIS.map((nivel) => (
                  <Bar
                    key={nivel.code}
                    dataKey={nivel.short}
                    stackId="perfil"
                    fill={NIVEL_COLOR[nivel.code]}
                    name={nivel.short}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma turma no recorte.</p>
        )}
      </SectionCard>
    </section>
  );
}
