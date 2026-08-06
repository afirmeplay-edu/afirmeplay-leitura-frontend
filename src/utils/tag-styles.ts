export const REPORT_TAG_BASE =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none uppercase tracking-wide";

export type ProficiencyLabel = "Abaixo do Basico" | "Basico" | "Adequado" | "Avancado";

export function getProficiencyTagClass(label?: string | null): string {
  const normalized = (label ?? "").trim();
  switch (normalized) {
    case "Avancado":
    case "Avançado":
      return `${REPORT_TAG_BASE} bg-green-800 text-green-50 border-green-900`;
    case "Adequado":
      return `${REPORT_TAG_BASE} bg-green-100 text-green-800 border-green-300`;
    case "Basico":
    case "Básico":
      return `${REPORT_TAG_BASE} bg-amber-100 text-amber-800 border-amber-300`;
    default:
      return `${REPORT_TAG_BASE} bg-red-100 text-red-800 border-red-300`;
  }
}

export function getIcaLevelTagClass(level?: string | number | null): string {
  if (level == null || level === "" || level === "-") {
    return `${REPORT_TAG_BASE} bg-slate-100 text-slate-600 border-slate-300`;
  }
  const num = typeof level === "number" ? level : parseInt(level, 10);
  if (num >= 4) return `${REPORT_TAG_BASE} bg-green-800 text-green-50 border-green-900`;
  if (num === 3) return `${REPORT_TAG_BASE} bg-green-100 text-green-800 border-green-300`;
  if (num === 2) return `${REPORT_TAG_BASE} bg-amber-100 text-amber-800 border-amber-300`;
  return `${REPORT_TAG_BASE} bg-red-100 text-red-800 border-red-300`;
}

export function getDifficultyTagClass(difficulty: string): string {
  const lower = difficulty.toLowerCase();
  if (lower.includes("facil") || lower.includes("fácil")) {
    return `${REPORT_TAG_BASE} bg-emerald-100 text-emerald-800 border-emerald-300`;
  }
  if (lower.includes("medio") || lower.includes("médio")) {
    return `${REPORT_TAG_BASE} bg-amber-100 text-amber-800 border-amber-300`;
  }
  return `${REPORT_TAG_BASE} bg-red-100 text-red-800 border-red-300`;
}
