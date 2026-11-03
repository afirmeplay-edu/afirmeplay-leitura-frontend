"use client";

import { Building2 } from "lucide-react";
import { RelatorioShell } from "@/components/relatorios/hub/relatorio-shell";
import { SectionCard } from "@/components/shared/section-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRelatorioFluencia } from "@/lib/relatorios-fluencia/store";
import { formatDecimal, formatPct } from "@/lib/relatorios-fluencia/format";

export function RelatorioEscolasPage() {
  return (
    <RelatorioShell
      title="Escolas e turmas"
      description="Comparativo por escola e por turma no recorte — participação, IFL e fluentes."
      icon={Building2}
    >
      <EscolasContent />
    </RelatorioShell>
  );
}

function EscolasContent() {
  const { relatorio } = useRelatorioFluencia();

  return (
    <>
      <SectionCard title="Por escola" description="Agregados escolares do recorte atual.">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Escola</TableHead>
                <TableHead>Previstos</TableHead>
                <TableHead>Avaliados</TableHead>
                <TableHead>Participação</TableHead>
                <TableHead>IFL</TableHead>
                <TableHead>Fluentes</TableHead>
                <TableHead>PPM médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(relatorio?.porEscola ?? []).map((row) => (
                <TableRow key={row.escolaId}>
                  <TableCell className="font-medium">{row.escolaNome}</TableCell>
                  <TableCell>{row.previstos}</TableCell>
                  <TableCell>{row.avaliados}</TableCell>
                  <TableCell>{formatPct(row.participacao)}</TableCell>
                  <TableCell>{formatDecimal(row.ifl)}</TableCell>
                  <TableCell>{formatPct(row.leitoresFluentesPct)}</TableCell>
                  <TableCell>{formatDecimal(row.ppmMedio)}</TableCell>
                </TableRow>
              ))}
              {!relatorio?.porEscola?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Sem escolas neste recorte.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard title="Por turma" description="Comparativo entre turmas do mesmo recorte.">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Turma</TableHead>
                <TableHead>Escola</TableHead>
                <TableHead>Previstos</TableHead>
                <TableHead>Avaliados</TableHead>
                <TableHead>Participação</TableHead>
                <TableHead>IFL</TableHead>
                <TableHead>Fluentes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(relatorio?.porTurma ?? []).map((row) => (
                <TableRow key={row.turmaId}>
                  <TableCell className="font-medium">{row.turmaNome}</TableCell>
                  <TableCell>{row.escolaNome}</TableCell>
                  <TableCell>{row.previstos}</TableCell>
                  <TableCell>{row.avaliados}</TableCell>
                  <TableCell>{formatPct(row.participacao)}</TableCell>
                  <TableCell>{formatDecimal(row.ifl)}</TableCell>
                  <TableCell>{formatPct(row.leitoresFluentesPct)}</TableCell>
                </TableRow>
              ))}
              {!relatorio?.porTurma?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Sem turmas neste recorte.
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
