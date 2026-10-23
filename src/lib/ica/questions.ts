import type {
  BankQuestion,
  BankQuestionDifficulty,
  BankQuestionOrigin,
  ScopeType,
} from "@/lib/api/afirme-reading/types";
import { canWriteIca } from "@/lib/auth/roles";
import { htmlToPlainText, resolveQuestionAssetUrl } from "@/lib/ica/question-html";

export const QUESTION_OPTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
export const MIN_QUESTION_OPTIONS = 2;
export const MAX_QUESTION_OPTIONS = QUESTION_OPTION_LETTERS.length;

export const QUESTION_DIFFICULTIES: BankQuestionDifficulty[] = [
  "Abaixo do Básico",
  "Básico",
  "Adequado",
  "Avançado",
];

export const QUESTION_ORIGIN_LABEL: Record<BankQuestionOrigin, string> = {
  afirme_ler: "Afirme Ler",
  afirme_play: "Afirme Play · somente leitura",
};

export const QUESTION_SCOPE_LABEL: Record<ScopeType, string> = {
  GLOBAL: "Global",
  CITY: "Município",
  PRIVATE: "Privada",
};

export const QUESTION_SCOPE_HINT: Record<ScopeType, string> = {
  GLOBAL: "Visível em todos os municípios",
  CITY: "Visível no município",
  PRIVATE: "Visível só para quem criou",
};

export function optionLetter(index: number) {
  return QUESTION_OPTION_LETTERS[index] ?? String(index + 1);
}

export function isPlayQuestion(question: Pick<BankQuestion, "origin">) {
  return question.origin === "afirme_play";
}

/** Previsível no front: origem Play ou papel sem escrita. O escopo fino (quem criou) o backend decide (403). */
export function readOnlyReason(
  question: Pick<BankQuestion, "origin"> | null,
  role: string | null | undefined
): string | null {
  if (question && isPlayQuestion(question)) return "Questões do Afirme Play são somente leitura no Afirme Ler.";
  if (!canWriteIca(role)) return "Seu perfil pode visualizar, mas não cadastrar ou editar questões.";
  return null;
}

export function questionStatement(question: Pick<BankQuestion, "text" | "formattedText">) {
  return question.text?.trim() || htmlToPlainText(question.formattedText);
}

export function questionOptions(question: Pick<BankQuestion, "options" | "alternatives">) {
  return question.options?.length ? question.options : (question.alternatives ?? []);
}

export function questionCorrectLetter(question: BankQuestion) {
  const fromApi = (question.correct_answer || question.solution || "").trim();
  if (fromApi) return fromApi;
  const index = questionOptions(question).findIndex((option) => option.isCorrect);
  return index >= 0 ? optionLetter(index) : "";
}

export interface QuestionPreviewOption {
  key: string;
  letter: string;
  text: string;
  imageSrc: string | null;
  isCorrect: boolean;
}

export interface QuestionPreviewModel {
  text: string;
  formattedText?: string | null;
  secondStatement?: string | null;
  formattedSolution?: string | null;
  options: QuestionPreviewOption[];
  value?: number | null;
  difficulty?: string | null;
  subjectName?: string | null;
  gradeName?: string | null;
  skillLabel?: string | null;
}

export function toPreviewModel(question: BankQuestion, skillLabel?: string | null): QuestionPreviewModel {
  return {
    text: question.text,
    formattedText: question.formattedText,
    secondStatement: question.secondStatement,
    formattedSolution: question.formattedSolution,
    options: questionOptions(question).map((option, index) => ({
      key: `${option.id}-${index}`,
      letter: optionLetter(index),
      text: option.text ?? "",
      imageSrc: resolveQuestionAssetUrl(option.image?.imageUrl),
      isCorrect: option.isCorrect === true,
    })),
    value: question.value,
    difficulty: question.difficulty,
    subjectName: question.subject?.name,
    gradeName: question.grade?.name,
    skillLabel: skillLabel ?? null,
  };
}

export function formatQuestionValue(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  const formatted = Number.isInteger(value) ? String(value) : value.toLocaleString("pt-BR");
  return `${formatted} ${value === 1 ? "ponto" : "pontos"}`;
}
