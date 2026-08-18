export type PracticeTab =
  | "palavras"
  | "pouco-comuns"
  | "texto"
  | "compreensao"
  | "leiturometro";

export const PRACTICE_TABS: ReadonlyArray<{
  id: PracticeTab;
  label: string;
  practiceLabel: string;
}> = [
  { id: "palavras", label: "Palavras", practiceLabel: "Praticar palavras conhecidas" },
  {
    id: "pouco-comuns",
    label: "Pouco Comuns",
    practiceLabel: "Praticar palavras pouco conhecidas",
  },
  { id: "texto", label: "Texto", practiceLabel: "Praticar texto" },
  { id: "compreensao", label: "Compreensão", practiceLabel: "Compreensão" },
  { id: "leiturometro", label: "Leiturômetro", practiceLabel: "Leiturômetro" },
];

export function parsePracticeTab(value: string | null | undefined): PracticeTab | null {
  if (!value) return null;
  return PRACTICE_TABS.some((tab) => tab.id === value) ? (value as PracticeTab) : null;
}
