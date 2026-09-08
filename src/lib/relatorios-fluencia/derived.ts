import type {
  DistribuicaoNivel,
  Indicadores,
  RelatorioResultados,
  ResultadoEstudante,
} from "@/lib/relatorios-fluencia/types";

export function countPrioridadeIntervencao(distribuicao?: DistribuicaoNivel[] | null) {
  if (!distribuicao?.length) return 0;
  return distribuicao
    .filter((item) => item.code === "PL1" || item.code === "PL2")
    .reduce((sum, item) => sum + (item.estudantes || 0), 0);
}

export function mediaCompreensao(estudantes?: ResultadoEstudante[] | null) {
  const values = (estudantes ?? [])
    .filter((item) => item.avaliado && item.compreensaoPct != null && !Number.isNaN(item.compreensaoPct))
    .map((item) => item.compreensaoPct as number);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function escolasNoRecorte(relatorio?: RelatorioResultados | null) {
  const fromSummary = relatorio?.porEscola?.length ?? 0;
  if (fromSummary > 0) return fromSummary;
  const ids = new Set((relatorio?.estudantes ?? []).map((item) => item.escolaId).filter(Boolean));
  return ids.size;
}

export function evolucaoComparativo(atual?: Indicadores, anterior?: Indicadores | null) {
  return [
    { indicador: "IFL", atual: atual?.ifl ?? 0, anterior: anterior?.ifl ?? 0 },
    { indicador: "PPM", atual: atual?.ppmMedio ?? 0, anterior: anterior?.ppmMedio ?? 0 },
    { indicador: "Fluentes %", atual: atual?.leitoresFluentesPct ?? 0, anterior: anterior?.leitoresFluentesPct ?? 0 },
  ];
}
