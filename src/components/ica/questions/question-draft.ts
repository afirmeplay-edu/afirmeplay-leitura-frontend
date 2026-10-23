import type {
  BankQuestion,
  BankQuestionDifficulty,
  BankQuestionImage,
  BankQuestionOptionPayload,
  CreateBankQuestionPayload,
  UpdateBankQuestionPayload,
} from "@/lib/api/afirme-reading/types";
import { buildQuestionHtml, extractImageSources, htmlToPlainText, resolveQuestionAssetUrl } from "@/lib/ica/question-html";
import {
  MAX_QUESTION_OPTIONS,
  MIN_QUESTION_OPTIONS,
  optionLetter,
  QUESTION_DIFFICULTIES,
  questionCorrectFlags,
  questionOptions,
} from "@/lib/ica/questions";

export interface OptionDraft {
  /** Chave estável para React/animação; a letra é sempre a posição. */
  key: string;
  text: string;
  image: string | BankQuestionImage | null;
  isCorrect: boolean;
}

export interface QuestionDraft {
  text: string;
  statementImages: string[];
  secondStatement: string;
  subjectId: string;
  gradeId: string;
  educationStageId: string;
  difficulty: string;
  skillId: string;
  value: string;
  topics: string;
  solution: string;
  options: OptionDraft[];
}

export type QuestionField =
  | "text"
  | "subjectId"
  | "gradeId"
  | "value"
  | "options"
  | `option-${number}`;

export interface QuestionValidationError {
  field: QuestionField;
  message: string;
}

let keySeed = 0;
export function newOptionKey() {
  keySeed += 1;
  return `opt-${Date.now().toString(36)}-${keySeed}`;
}

export function emptyOption(): OptionDraft {
  return { key: newOptionKey(), text: "", image: null, isCorrect: false };
}

export function emptyQuestionDraft(): QuestionDraft {
  return {
    text: "",
    statementImages: [],
    secondStatement: "",
    subjectId: "",
    gradeId: "",
    educationStageId: "",
    difficulty: "",
    skillId: "",
    value: "1",
    topics: "",
    solution: "",
    options: Array.from({ length: 4 }, emptyOption),
  };
}

export function draftFromQuestion(question: BankQuestion): QuestionDraft {
  const correct = questionCorrectFlags(question);
  return {
    text: question.text?.trim() || htmlToPlainText(question.formattedText),
    statementImages: extractImageSources(question.formattedText),
    secondStatement: question.secondStatement ?? "",
    subjectId: question.subject?.id ?? "",
    gradeId: question.grade?.id ?? "",
    educationStageId: question.educationStage?.id ?? "",
    difficulty: question.difficulty ?? "",
    skillId: question.skills?.[0] ?? "",
    value: question.value != null ? String(question.value) : "1",
    topics: (question.topics ?? []).filter((topic): topic is string => typeof topic === "string").join(", "),
    solution: htmlToPlainText(question.formattedSolution),
    options: questionOptions(question).map((option, index) => ({
      key: newOptionKey(),
      text: option.text ?? "",
      image: option.image ?? null,
      isCorrect: correct[index] === true,
    })),
  };
}

/** HTML que o editor simples não reproduz (negrito, tabelas…). Serve para avisar antes de reescrever. */
export function hasRichFormatting(html: string | null | undefined) {
  if (!html) return false;
  return /<(?!\/?(p|br|img)\b)[a-z][^>]*>/i.test(html);
}

export function optionImageSrc(image: OptionDraft["image"]) {
  if (!image) return null;
  return typeof image === "string" ? resolveQuestionAssetUrl(image) : resolveQuestionAssetUrl(image.imageUrl);
}

function parseValue(raw: string) {
  const normalized = raw.replace(",", ".").trim();
  if (!normalized) return Number.NaN;
  return Number(normalized);
}

/** Mesmas regras do backend (CONTRATO_QUESTOES.md), com as mensagens do contrato em linguagem de tela. */
export function validateQuestionDraft(draft: QuestionDraft): QuestionValidationError[] {
  const errors: QuestionValidationError[] = [];
  if (!draft.text.trim()) errors.push({ field: "text", message: "Informe o enunciado." });
  if (!draft.subjectId) errors.push({ field: "subjectId", message: "Selecione a disciplina." });
  if (!draft.gradeId) errors.push({ field: "gradeId", message: "Selecione a série." });

  const value = parseValue(draft.value);
  if (!Number.isFinite(value) || value <= 0) {
    errors.push({ field: "value", message: "O valor deve ser um número maior que zero." });
  }

  if (draft.options.length < MIN_QUESTION_OPTIONS) {
    errors.push({ field: "options", message: "Informe pelo menos 2 alternativas." });
  } else if (draft.options.length > MAX_QUESTION_OPTIONS) {
    errors.push({ field: "options", message: "Informe no máximo 8 alternativas (letras A a H)." });
  }

  draft.options.forEach((option, index) => {
    if (!option.text.trim() && !option.image) {
      errors.push({
        field: `option-${index}`,
        message: `A alternativa ${optionLetter(index)} precisa de texto ou imagem.`,
      });
    }
  });

  const correctCount = draft.options.filter((option) => option.isCorrect).length;
  if (correctCount !== 1) {
    errors.push({ field: "options", message: "Marque exatamente uma alternativa correta." });
  }

  return errors;
}

function toOptionPayload(option: OptionDraft, index: number): BankQuestionOptionPayload {
  const payload: BankQuestionOptionPayload = {
    id: optionLetter(index),
    text: option.text.trim(),
    isCorrect: option.isCorrect === true,
  };
  if (option.image) payload.image = option.image;
  return payload;
}

function splitTopics(raw: string) {
  return raw
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean);
}

export function buildCreatePayload(draft: QuestionDraft): CreateBankQuestionPayload {
  const text = draft.text.trim();
  const payload: CreateBankQuestionPayload = {
    text,
    formattedText: buildQuestionHtml(text, draft.statementImages, "Imagem do enunciado"),
    type: "multipleChoice",
    subjectId: draft.subjectId,
    grade: draft.gradeId,
    value: parseValue(draft.value),
    options: draft.options.map(toOptionPayload),
  };
  if (draft.secondStatement.trim()) payload.secondStatement = draft.secondStatement.trim();
  if (draft.educationStageId) payload.educationStageId = draft.educationStageId;
  if (QUESTION_DIFFICULTIES.includes(draft.difficulty as BankQuestionDifficulty)) {
    payload.difficulty = draft.difficulty as BankQuestionDifficulty;
  }
  if (draft.skillId) payload.skills = draft.skillId;
  const topics = splitTopics(draft.topics);
  if (topics.length) payload.topics = topics;
  if (draft.solution.trim()) payload.formattedSolution = buildQuestionHtml(draft.solution.trim());
  return payload;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Só os campos alterados. Se as alternativas mudaram, manda a lista inteira (o backend substitui). */
export function buildUpdatePayload(initial: QuestionDraft, current: QuestionDraft): UpdateBankQuestionPayload {
  const payload: UpdateBankQuestionPayload = {};

  if (current.text.trim() !== initial.text.trim() || !same(current.statementImages, initial.statementImages)) {
    payload.text = current.text.trim();
    payload.formattedText = buildQuestionHtml(current.text.trim(), current.statementImages, "Imagem do enunciado");
  }
  if (current.secondStatement.trim() !== initial.secondStatement.trim()) {
    payload.secondStatement = current.secondStatement.trim();
  }
  if (current.subjectId !== initial.subjectId) payload.subjectId = current.subjectId;
  if (current.gradeId !== initial.gradeId) payload.grade = current.gradeId;
  if (current.educationStageId !== initial.educationStageId) {
    payload.educationStageId = current.educationStageId || null;
  }
  if (current.difficulty !== initial.difficulty) {
    payload.difficulty = (current.difficulty || null) as BankQuestionDifficulty | null;
  }
  if (current.skillId !== initial.skillId) payload.skills = current.skillId || null;
  if (parseValue(current.value) !== parseValue(initial.value)) payload.value = parseValue(current.value);
  if (!same(splitTopics(current.topics), splitTopics(initial.topics))) payload.topics = splitTopics(current.topics);
  if (current.solution.trim() !== initial.solution.trim()) {
    payload.formattedSolution = current.solution.trim() ? buildQuestionHtml(current.solution.trim()) : "";
  }

  const strip = (options: OptionDraft[]) =>
    options.map(({ text, image, isCorrect }) => ({ text: text.trim(), image, isCorrect }));
  if (!same(strip(current.options), strip(initial.options))) {
    payload.options = current.options.map(toOptionPayload);
  }

  return payload;
}

export function isDraftDirty(initial: QuestionDraft, current: QuestionDraft) {
  const { options: a, ...restA } = initial;
  const { options: b, ...restB } = current;
  const strip = (options: OptionDraft[]) => options.map(({ text, image, isCorrect }) => ({ text, image, isCorrect }));
  return !same(restA, restB) || !same(strip(a), strip(b));
}
