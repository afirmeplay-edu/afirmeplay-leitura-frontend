import type {
  BankQuestion,
  BankQuestionDifficulty,
  BankQuestionOrigin,
  BankQuestionType,
  ScopeType,
} from "@/lib/api/afirme-reading/types";
import { canWriteIca, normalizeRole } from "@/lib/auth/roles";
import { htmlToPlainText, resolveQuestionAssetUrl } from "@/lib/ica/question-html";

export const ICA_QUESTION_TYPES: BankQuestionType[] = ["multipleChoice", "dictation", "text_production"];

export const QUESTION_TYPE_LABEL: Record<BankQuestionType, string> = {
  multipleChoice: "Múltipla escolha",
  dictation: "Ditado",
  text_production: "Produção escrita",
};

export const QUESTION_TYPE_HINT: Record<BankQuestionType, string> = {
  multipleChoice: "2 a 8 alternativas, uma correta. O gabarito é a letra marcada.",
  dictation: "O aplicador dita uma palavra e o aluno escreve no cartão-resposta.",
  text_production: "Comando de produção (ex.: bilhete). Sem gabarito; a correção fica com o professor.",
};

/** Limite do contrato para `dictatedWord`. */
export const DICTATED_WORD_MAX_LENGTH = 40;

/** Aliases que o backend aceita (sem diferenciar maiúsculas); o resto não é tipo do Afirme Ler. */
const TYPE_ALIASES: Record<string, BankQuestionType> = {
  multiplechoice: "multipleChoice",
  multiple_choice: "multipleChoice",
  dictation: "dictation",
  ditado: "dictation",
  text_production: "text_production",
  producao_textual: "text_production",
  "produção_textual": "text_production",
  bilhete: "text_production",
};

export function normalizeQuestionType(type: string | null | undefined): BankQuestionType | null {
  if (!type) return null;
  return TYPE_ALIASES[type.trim().toLowerCase().replace(/[\s-]+/g, "_")] ?? null;
}

export function isBankQuestionType(value: string | null | undefined): value is BankQuestionType {
  return ICA_QUESTION_TYPES.includes(value as BankQuestionType);
}

export function questionTypeLabel(type: string | null | undefined) {
  const normalized = normalizeQuestionType(type);
  return normalized ? QUESTION_TYPE_LABEL[normalized] : type || "—";
}

/** Mesma validação do backend (`parse_dictated_word`), com mensagens de tela. */
export function validateDictatedWord(raw: string): string | null {
  const word = raw.trim();
  if (!word) return "Informe a palavra que o aplicador vai ditar.";
  if (/\s/.test(word)) return "A palavra ditada deve ser uma única palavra, sem espaços.";
  if (word.length > DICTATED_WORD_MAX_LENGTH) {
    return `A palavra ditada deve ter no máximo ${DICTATED_WORD_MAX_LENGTH} caracteres.`;
  }
  return null;
}

export function questionDictatedWord(question: Pick<BankQuestion, "type" | "dictatedWord" | "correct_answer">) {
  if (normalizeQuestionType(question.type) !== "dictation") return "";
  return (question.dictatedWord ?? question.correct_answer ?? "").trim();
}

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

/**
 * Espelha `user_can_modify` (afirme_ler/services/scope_service.py): admin edita tudo; GLOBAL só admin;
 * CITY só tecadm (o município do dono não vem na resposta — o backend confirma); PRIVATE só quem criou.
 */
export function readOnlyReason(
  question: Pick<BankQuestion, "origin" | "scopeType" | "createdBy"> | null,
  user: { id?: string | null; role?: string | null } | null | undefined
): string | null {
  if (question && isPlayQuestion(question)) return "Questões do Afirme Play são somente leitura no Afirme Ler.";
  const role = normalizeRole(user?.role);
  if (!canWriteIca(role)) return "Seu perfil pode visualizar, mas não cadastrar ou editar questões.";
  if (!question || role === "admin") return null;
  if (question.scopeType === "GLOBAL") return "Questões globais só podem ser editadas por administradores.";
  if (question.scopeType === "CITY" && role !== "tecadm") {
    return "Questões do município só podem ser editadas pelo administrador ou pelo técnico do município.";
  }
  if (question.scopeType === "PRIVATE" && question.createdBy?.id && user?.id && question.createdBy.id !== user.id) {
    return "Só quem criou esta questão pode editá-la.";
  }
  return null;
}

export function questionStatement(question: Pick<BankQuestion, "text" | "formattedText">) {
  return question.text?.trim() || htmlToPlainText(question.formattedText);
}

export function questionOptions(question: Pick<BankQuestion, "options" | "alternatives">) {
  return question.options?.length ? question.options : (question.alternatives ?? []);
}

/**
 * Gabarito por posição quando `correct_answer` é uma letra (sempre, no Afirme Ler). O `isCorrect` da resposta
 * não é confiável sozinho: o formatter do backend também marca alternativas cujo texto é igual ao gabarito.
 */
export function questionCorrectFlags(
  question: Pick<BankQuestion, "options" | "alternatives" | "correct_answer" | "solution"> & { type?: string }
): boolean[] {
  const options = questionOptions(question);
  if (question.type && normalizeQuestionType(question.type) !== "multipleChoice") return options.map(() => false);
  const letter = (question.correct_answer || question.solution || "").trim().toUpperCase();
  const index = QUESTION_OPTION_LETTERS.indexOf(letter as (typeof QUESTION_OPTION_LETTERS)[number]);
  if (index >= 0 && index < options.length) return options.map((_, current) => current === index);
  return options.map((option) => option.isCorrect === true);
}

export function questionCorrectLetter(question: BankQuestion) {
  if (normalizeQuestionType(question.type) !== "multipleChoice") return "";
  const index = questionCorrectFlags(question).indexOf(true);
  if (index >= 0) return optionLetter(index);
  return (question.correct_answer || question.solution || "").trim();
}

/** Texto curto do gabarito por tipo: "Gabarito B", "Palavra: casa" ou "Sem gabarito". */
export function questionAnswerSummary(question: BankQuestion) {
  const type = normalizeQuestionType(question.type);
  if (type === "dictation") {
    const word = questionDictatedWord(question);
    return word ? `Palavra: ${word}` : "";
  }
  if (type === "text_production") return "Sem gabarito";
  const letter = questionCorrectLetter(question);
  return letter ? `Gabarito ${letter}` : "";
}

export interface QuestionPreviewOption {
  key: string;
  letter: string;
  text: string;
  imageSrc: string | null;
  isCorrect: boolean;
}

export interface QuestionPreviewModel {
  type?: BankQuestionType;
  dictatedWord?: string | null;
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
  const correct = questionCorrectFlags(question);
  const type = normalizeQuestionType(question.type) ?? "multipleChoice";
  return {
    type,
    dictatedWord: questionDictatedWord(question) || null,
    text: question.text,
    formattedText: question.formattedText,
    secondStatement: question.secondStatement,
    formattedSolution: question.formattedSolution,
    options: (type === "multipleChoice" ? questionOptions(question) : []).map((option, index) => ({
      key: `${option.id}-${index}`,
      letter: optionLetter(index),
      text: option.text ?? "",
      imageSrc: resolveQuestionAssetUrl(option.image?.imageUrl),
      isCorrect: correct[index] === true,
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
