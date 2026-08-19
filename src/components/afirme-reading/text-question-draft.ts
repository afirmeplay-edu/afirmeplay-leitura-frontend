import type {
  CreateReadingQuestionPayload,
  CreateReadingTextQuestionPayload,
  ReadingQuestion,
  UpdateReadingQuestionPayload,
} from "@/lib/api/afirme-reading";

export const MIN_QUESTION_OPTIONS = 2;
export const MAX_QUESTION_OPTIONS = 5;

export interface QuestionOptionDraft {
  text: string;
  isCorrect: boolean;
}

export interface QuestionDraft {
  id?: string;
  statement: string;
  descriptor: string;
  options: QuestionOptionDraft[];
}

export function emptyQuestionDraft(): QuestionDraft {
  return {
    statement: "",
    descriptor: "",
    options: [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
  };
}

export function isQuestionDraftEmpty(question: QuestionDraft) {
  return (
    !question.statement.trim() &&
    !question.descriptor.trim() &&
    question.options.every((option) => !option.text.trim())
  );
}

export function validateQuestionDraft(question: QuestionDraft, index: number) {
  const label = `pergunta ${index + 1}`;
  if (!question.statement.trim()) {
    return `Informe o enunciado da ${label}.`;
  }
  if (!question.descriptor.trim()) {
    return `Informe o descritor da ${label}.`;
  }

  const filledOptions = question.options.filter((option) => option.text.trim());
  if (filledOptions.length < MIN_QUESTION_OPTIONS) {
    return `A ${label} precisa de pelo menos ${MIN_QUESTION_OPTIONS} alternativas.`;
  }
  if (question.options.some((option) => !option.text.trim())) {
    return `Preencha todas as alternativas da ${label}.`;
  }

  const correctCount = question.options.filter((option) => option.isCorrect).length;
  if (correctCount !== 1) {
    return `Marque o gabarito da ${label}.`;
  }

  return null;
}

export function validateQuestionDrafts(questions: QuestionDraft[], required: boolean) {
  if (required && questions.length === 0) {
    return "Adicione ao menos uma pergunta.";
  }

  const drafts = required
    ? questions
    : questions.filter((question) => Boolean(question.id) || !isQuestionDraftEmpty(question));
  if (required && drafts.some(isQuestionDraftEmpty)) {
    return "Preencha as perguntas ou remova as que estiverem em branco.";
  }

  for (let index = 0; index < drafts.length; index += 1) {
    const error = validateQuestionDraft(drafts[index], index);
    if (error) return error;
  }

  return null;
}

export function toNestedQuestionPayload(question: QuestionDraft): CreateReadingTextQuestionPayload {
  return {
    statement: question.statement.trim(),
    descriptor: question.descriptor.trim(),
    options: question.options.map((option) => ({
      text: option.text.trim(),
      isCorrect: option.isCorrect,
    })),
  };
}

export function toStandaloneQuestionPayload(question: QuestionDraft): CreateReadingQuestionPayload {
  return {
    statement: question.statement.trim(),
    descriptor: question.descriptor.trim(),
    options: question.options.map((option) => option.text.trim()),
    correctOption: question.options.findIndex((option) => option.isCorrect),
  };
}

export function filledQuestionDrafts(questions: QuestionDraft[]) {
  return questions.filter((question) => !isQuestionDraftEmpty(question));
}

export function questionToDraft(question: ReadingQuestion): QuestionDraft {
  return {
    id: question.id,
    statement: question.statement,
    descriptor: question.descriptor ?? "",
    options: question.options.map((text, index) => ({
      text,
      isCorrect: question.correctOption === index,
    })),
  };
}

export function isSameQuestion(draft: QuestionDraft, original: ReadingQuestion) {
  if (draft.statement.trim() !== original.statement) return false;
  if (draft.descriptor.trim() !== (original.descriptor ?? "")) return false;
  if (draft.options.length !== original.options.length) return false;
  return draft.options.every(
    (option, index) =>
      option.text.trim() === original.options[index] && option.isCorrect === (original.correctOption === index)
  );
}

export function toUpdateQuestionPayload(question: QuestionDraft): UpdateReadingQuestionPayload {
  return {
    statement: question.statement.trim(),
    descriptor: question.descriptor.trim(),
    options: question.options.map((option) => ({
      text: option.text.trim(),
      isCorrect: option.isCorrect,
    })),
  };
}
