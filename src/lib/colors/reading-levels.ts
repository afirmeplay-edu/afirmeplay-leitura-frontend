/** Paleta única do Leiturômetro ICA (níveis 1–6). Fonte da verdade visual. */

export type IcaLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type PerfilLeitorCode = "PL1" | "PL2" | "PL3" | "PL4" | "LI" | "LF";

export interface IcaLevelStyle {
  level: IcaLevel;
  label: string;
  /** Classe Tailwind da barra (mesmo tom de leiturometro.tsx). */
  bgClass: string;
  hex: string;
  /** Texto sobre o fundo sólido (contraste). */
  fgHex: string;
  /** Classes do badge ICA. */
  tagClass: string;
}

export const ICA_LEVELS: IcaLevelStyle[] = [
  {
    level: 1,
    label: "Pré-alfabético",
    bgClass: "bg-[#E45D1C]",
    hex: "#E45D1C",
    fgHex: "#ffffff",
    tagClass: "bg-[#E45D1C] text-white border-[#E45D1C]",
  },
  {
    level: 2,
    label: "Alfabético",
    bgClass: "bg-[#ED6E13]",
    hex: "#ED6E13",
    fgHex: "#ffffff",
    tagClass: "bg-[#ED6E13] text-white border-[#ED6E13]",
  },
  {
    level: 3,
    label: "Silábico-alfabético",
    bgClass: "bg-[#F08215]",
    hex: "#F08215",
    fgHex: "#ffffff",
    tagClass: "bg-[#F08215] text-white border-[#F08215]",
  },
  {
    level: 4,
    label: "Silábico",
    bgClass: "bg-[#F7AC19]",
    hex: "#F7AC19",
    fgHex: "#1e293b",
    tagClass: "bg-[#F7AC19] text-slate-900 border-[#F7AC19]",
  },
  {
    level: 5,
    label: "Silábico com valor",
    bgClass: "bg-[#62B33C]",
    hex: "#62B33C",
    fgHex: "#ffffff",
    tagClass: "bg-[#62B33C] text-white border-[#62B33C]",
  },
  {
    level: 6,
    label: "Alfabético pleno",
    bgClass: "bg-[#2EA248]",
    hex: "#2EA248",
    fgHex: "#ffffff",
    tagClass: "bg-[#2EA248] text-white border-[#2EA248]",
  },
];

/** PL1–LF alinhados à escala ICA 1–6 (mesma paleta). */
export const PERFIL_LEITOR_TO_ICA: Record<PerfilLeitorCode, IcaLevel> = {
  PL1: 1,
  PL2: 2,
  PL3: 3,
  PL4: 4,
  LI: 5,
  LF: 6,
};

export const ICA_TO_PERFIL_LEITOR: Record<IcaLevel, PerfilLeitorCode> = {
  1: "PL1",
  2: "PL2",
  3: "PL3",
  4: "PL4",
  5: "LI",
  6: "LF",
};

export const PERFIL_LEITOR_LABEL: Record<PerfilLeitorCode, string> = {
  PL1: "PL1",
  PL2: "PL2",
  PL3: "PL3",
  PL4: "PL4",
  LI: "Leitor Iniciante",
  LF: "Leitor Fluente",
};

export const PERFIL_ALFABETOMETRO_LABEL: Record<PerfilLeitorCode, string> = {
  PL1: "Pré-leitor 1",
  PL2: "Pré-leitor 2",
  PL3: "Pré-leitor 3",
  PL4: "Pré-leitor 4",
  LI: "Leitor iniciante",
  LF: "Leitor fluente",
};

export function perfilFromIcaLevel(level?: number | null): PerfilLeitorCode | null {
  if (level == null || level < 1 || level > 6) return null;
  return ICA_TO_PERFIL_LEITOR[level as IcaLevel] ?? null;
}

export function getIcaLevelStyle(level?: string | number | null): IcaLevelStyle | null {
  if (level == null || level === "" || level === "-") return null;
  const num = typeof level === "number" ? level : parseInt(String(level), 10);
  if (!Number.isFinite(num) || num < 1 || num > 6) return null;
  return ICA_LEVELS[num - 1] ?? null;
}

export function getPerfilLeitorStyle(code: PerfilLeitorCode | string): IcaLevelStyle {
  const ica = PERFIL_LEITOR_TO_ICA[code as PerfilLeitorCode] ?? 1;
  return ICA_LEVELS[ica - 1];
}
