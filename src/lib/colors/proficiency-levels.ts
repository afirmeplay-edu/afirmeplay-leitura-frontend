/**
 * Faixas Saeb / desempenho (0–10) alinhadas ao Afirme Play
 * (`LEGENDA_DESEMPENHO_ROWS`, ranking e charts).
 */

export type ProficiencyFaixaKey = "abaixo_do_basico" | "basico" | "adequado" | "avancado";

export type ProficiencyLevelLabel = "Abaixo do Básico" | "Básico" | "Adequado" | "Avançado";

export interface ProficiencyLevelStyle {
  key: ProficiencyFaixaKey;
  label: ProficiencyLevelLabel;
  /** Hex sólido (gráficos, barras, accent). */
  hex: string;
  /** Texto sobre fundo sólido. */
  fgHex: string;
  /** Intervalo da legenda de desempenho (nota 0–10). */
  notaIntervalo: string;
  /** Classes Tailwind — badge/tag. */
  tagClass: string;
  /** Classes Tailwind — card/soft surface. */
  softClass: {
    bg: string;
    text: string;
    border: string;
    bar: string;
  };
}

export const PROFICIENCY_LEVELS: ProficiencyLevelStyle[] = [
  {
    key: "abaixo_do_basico",
    label: "Abaixo do Básico",
    hex: "#DC2626",
    fgHex: "#ffffff",
    notaIntervalo: "0,0 a 3,9",
    tagClass: "border border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300",
    softClass: {
      bg: "bg-rose-50/80 dark:bg-rose-950/20",
      text: "text-rose-700 dark:text-rose-300",
      border: "border-rose-200 dark:border-rose-900/40",
      bar: "bg-rose-600",
    },
  },
  {
    key: "basico",
    label: "Básico",
    hex: "#EAB308",
    fgHex: "#1e293b",
    notaIntervalo: "4,0 a 6,0",
    tagClass: "border border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300",
    softClass: {
      bg: "bg-amber-50/80 dark:bg-amber-950/20",
      text: "text-amber-800 dark:text-amber-300",
      border: "border-amber-200 dark:border-amber-900/40",
      bar: "bg-amber-400",
    },
  },
  {
    key: "adequado",
    label: "Adequado",
    hex: "#22C55E",
    fgHex: "#14532d",
    notaIntervalo: "6,1 a 8,0",
    tagClass: "border border-green-200 bg-green-100 text-green-800 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300",
    softClass: {
      bg: "bg-green-50/80 dark:bg-green-950/20",
      text: "text-green-800 dark:text-green-300",
      border: "border-green-200 dark:border-green-900/40",
      bar: "bg-green-400",
    },
  },
  {
    key: "avancado",
    label: "Avançado",
    hex: "#166534",
    fgHex: "#ffffff",
    notaIntervalo: "acima de 8,0",
    tagClass: "border border-green-800 bg-green-800 text-green-50 dark:border-green-700 dark:bg-green-900/80 dark:text-green-100",
    softClass: {
      bg: "bg-green-900/10 dark:bg-green-950/40",
      text: "text-green-900 dark:text-green-200",
      border: "border-green-800/40 dark:border-green-700/50",
      bar: "bg-green-800",
    },
  },
];

const BY_KEY = Object.fromEntries(PROFICIENCY_LEVELS.map((level) => [level.key, level])) as Record<
  ProficiencyFaixaKey,
  ProficiencyLevelStyle
>;

const BY_LABEL = Object.fromEntries(PROFICIENCY_LEVELS.map((level) => [level.label, level])) as Record<
  ProficiencyLevelLabel,
  ProficiencyLevelStyle
>;

const LABEL_ALIASES: Record<string, ProficiencyLevelLabel> = {
  "abaixo do básico": "Abaixo do Básico",
  "abaixo do basico": "Abaixo do Básico",
  "abaixo_do_basico": "Abaixo do Básico",
  básico: "Básico",
  basico: "Básico",
  adequado: "Adequado",
  avançado: "Avançado",
  avancado: "Avançado",
};

/**
 * Classifica nota 0–10 nas faixas oficiais de desempenho do Afirme Play.
 * Abaixo do Básico ≤ 3,9 · Básico ≤ 6,0 · Adequado ≤ 8,0 · Avançado > 8,0
 */
export function classifyNotaDesempenho(nota: number | null | undefined): ProficiencyLevelStyle | null {
  if (typeof nota !== "number" || !Number.isFinite(nota)) return null;
  if (nota <= 3.9) return BY_KEY.abaixo_do_basico;
  if (nota <= 6.0) return BY_KEY.basico;
  if (nota <= 8.0) return BY_KEY.adequado;
  return BY_KEY.avancado;
}

export function normalizeProficiencyLabel(value?: string | null): ProficiencyLevelLabel | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if ((BY_LABEL as Record<string, ProficiencyLevelStyle>)[trimmed]) {
    return trimmed as ProficiencyLevelLabel;
  }
  return LABEL_ALIASES[trimmed.toLowerCase()] ?? null;
}

export function getProficiencyLevelStyle(value?: string | null): ProficiencyLevelStyle | null {
  const label = normalizeProficiencyLabel(value);
  return label ? BY_LABEL[label] : null;
}

export function getProficiencyStyleByKey(key: ProficiencyFaixaKey): ProficiencyLevelStyle {
  return BY_KEY[key];
}
