export const NOT_READ_REASON_OPTIONS = [
  { value: "nao_se_aplica", label: "— Não se aplica —" },
  { value: "recusou", label: "O(a) estudante se recusou a ler" },
  { value: "nao_consegue", label: "O(a) estudante disse que não consegue ler" },
  { value: "nao_sabe", label: "O(a) estudante disse que não sabe ler" },
] as const;

export type NotReadReasonValue = (typeof NOT_READ_REASON_OPTIONS)[number]["value"];
