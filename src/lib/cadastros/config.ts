import type { WordListKind } from "@/lib/api/afirme-reading";
import { isKnownWordListKind } from "@/lib/afirme-reading/evaluation-contract";

export type CatalogWordListKind = "PALAVRAS_CONHECIDAS" | "POUCO_COMUNS";

export const CADASTROS_PATHS = {
  root: "/app/cadastros",
  conhecidas: "/app/cadastros/palavras-conhecidas",
  poucoComuns: "/app/cadastros/palavras-pouco-comuns",
  textos: "/app/cadastros/textos",
} as const;

export interface WordListKindConfig {
  kind: CatalogWordListKind;
  title: string;
  description: string;
  listHref: string;
  createHref: string;
  editHref: (id: string) => string;
  createLabel: string;
  emptyLabel: string;
  recommendedCount: number;
  adminOnly: boolean;
}

export const WORD_LIST_KIND_CONFIG: Record<CatalogWordListKind, WordListKindConfig> = {
  PALAVRAS_CONHECIDAS: {
    kind: "PALAVRAS_CONHECIDAS",
    title: "Lista de palavras conhecidas",
    description: "Cadastre e gerencie as listas usadas na leitura de palavras conhecidas (Q1).",
    listHref: CADASTROS_PATHS.conhecidas,
    createHref: `${CADASTROS_PATHS.conhecidas}/novo`,
    editHref: (id) => `${CADASTROS_PATHS.conhecidas}/${id}`,
    createLabel: "Nova lista",
    emptyLabel: "Nenhuma lista de palavras conhecidas cadastrada.",
    recommendedCount: 60,
    adminOnly: true,
  },
  POUCO_COMUNS: {
    kind: "POUCO_COMUNS",
    title: "Lista de palavras pouco comuns",
    description: "Cadastre e gerencie as listas usadas na leitura de palavras pouco comuns (Q2).",
    listHref: CADASTROS_PATHS.poucoComuns,
    createHref: `${CADASTROS_PATHS.poucoComuns}/novo`,
    editHref: (id) => `${CADASTROS_PATHS.poucoComuns}/${id}`,
    createLabel: "Nova lista",
    emptyLabel: "Nenhuma lista de palavras pouco comuns cadastrada.",
    recommendedCount: 40,
    adminOnly: false,
  },
};

export function belongsToWordListKind(listKind: WordListKind | string, pageKind: CatalogWordListKind) {
  if (pageKind === "POUCO_COMUNS") return listKind === "POUCO_COMUNS";
  return isKnownWordListKind(listKind);
}
