import type { DistribuicaoNivel, EvolucaoCode, NivelCode } from "@/lib/relatorios-fluencia/types";

const decimalPt = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatDecimal(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return decimalPt.format(value);
}

export function formatPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${decimalPt.format(value)}%`;
}

export function formatDeltaPp(delta: number | null | undefined): string {
  if (delta == null || Number.isNaN(Number(delta))) return "—";
  const formatted = decimalPt.format(Math.abs(delta));
  if (delta > 0) return `+${formatted} pp`;
  if (delta < 0) return `-${formatted} pp`;
  return `${formatted} pp`;
}

export function formatDateTimeIso(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("pt-BR");
}

export function percentualFaixa(distribuicao: DistribuicaoNivel[] | undefined, code: NivelCode): number | null {
  const item = distribuicao?.find((d) => d.code === code);
  return item == null ? null : item.percentual;
}

export function labelEvolucao(evolucao: EvolucaoCode | null | undefined): string {
  if (evolucao === "avanco") return "▲ avanço";
  if (evolucao === "regressao") return "▼ regressão";
  if (evolucao === "manutencao") return "→ manutenção";
  return "—";
}
