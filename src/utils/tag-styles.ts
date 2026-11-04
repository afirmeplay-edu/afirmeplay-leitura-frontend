import { getIcaLevelStyle } from "@/lib/colors/reading-levels";
import { getProficiencyLevelStyle } from "@/lib/colors/proficiency-levels";

export const REPORT_TAG_BASE =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none uppercase tracking-wide";

export type ProficiencyLabel = "Abaixo do Basico" | "Basico" | "Adequado" | "Avancado";

/** Badge das faixas Saeb / desempenho — mesmas cores do Afirme Play. */
export function getProficiencyTagClass(label?: string | null): string {
  const style = getProficiencyLevelStyle(label);
  if (style) {
    return `${REPORT_TAG_BASE} ${style.tagClass}`;
  }
  return `${REPORT_TAG_BASE} bg-slate-100 text-slate-600 border-slate-300`;
}

export function getIcaLevelTagClass(level?: string | number | null): string {
  const style = getIcaLevelStyle(level);
  if (!style) {
    return `${REPORT_TAG_BASE} bg-slate-100 text-slate-600 border-slate-300`;
  }
  return `${REPORT_TAG_BASE} ${style.tagClass}`;
}

export function getDifficultyTagClass(difficulty: string): string {
  const proficiency = getProficiencyLevelStyle(difficulty);
  if (proficiency) {
    return `${REPORT_TAG_BASE} ${proficiency.tagClass}`;
  }
  const lower = difficulty.toLowerCase();
  if (lower.includes("facil") || lower.includes("fácil")) {
    return `${REPORT_TAG_BASE} bg-emerald-100 text-emerald-800 border-emerald-300`;
  }
  if (lower.includes("medio") || lower.includes("médio")) {
    return `${REPORT_TAG_BASE} bg-amber-100 text-amber-800 border-amber-300`;
  }
  return `${REPORT_TAG_BASE} bg-red-100 text-red-800 border-red-300`;
}
