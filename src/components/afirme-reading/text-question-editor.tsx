"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  emptyQuestionDraft,
  MAX_QUESTION_OPTIONS,
  MIN_QUESTION_OPTIONS,
  type QuestionDraft,
} from "@/components/afirme-reading/text-question-draft";

interface TextQuestionEditorProps {
  questions: QuestionDraft[];
  disabled?: boolean;
  addLabel?: string;
  onChange: (questions: QuestionDraft[]) => void;
  onRemoveQuestion?: (question: QuestionDraft) => boolean;
}

export function TextQuestionEditor({
  questions,
  disabled,
  addLabel = "Adicionar pergunta",
  onChange,
  onRemoveQuestion,
}: TextQuestionEditorProps) {
  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    onChange(questions.map((question, current) => (current === index ? { ...question, ...patch } : question)));
  }

  function updateOption(questionIndex: number, optionIndex: number, text: string) {
    const question = questions[questionIndex];
    updateQuestion(questionIndex, {
      options: question.options.map((option, current) =>
        current === optionIndex ? { ...option, text } : option
      ),
    });
  }

  function markCorrect(questionIndex: number, optionIndex: number) {
    const question = questions[questionIndex];
    updateQuestion(questionIndex, {
      options: question.options.map((option, current) => ({
        ...option,
        isCorrect: current === optionIndex,
      })),
    });
  }

  function addOption(questionIndex: number) {
    const question = questions[questionIndex];
    if (question.options.length >= MAX_QUESTION_OPTIONS) return;
    updateQuestion(questionIndex, {
      options: [...question.options, { text: "", isCorrect: false }],
    });
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    const question = questions[questionIndex];
    if (question.options.length <= MIN_QUESTION_OPTIONS) return;

    const nextOptions = question.options.filter((_, current) => current !== optionIndex);
    if (!nextOptions.some((option) => option.isCorrect) && nextOptions[0]) {
      nextOptions[0] = { ...nextOptions[0], isCorrect: true };
    }
    updateQuestion(questionIndex, { options: nextOptions });
  }

  function removeQuestion(index: number) {
    const question = questions[index];
    if (onRemoveQuestion && !onRemoveQuestion(question)) return;
    onChange(questions.filter((_, current) => current !== index));
  }

  return (
    <div className="space-y-3">
      {questions.map((question, questionIndex) => (
        <div key={question.id ?? `new-${questionIndex}`} className="space-y-3 rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Pergunta {questionIndex + 1}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-700 hover:bg-red-50"
              disabled={disabled}
              onClick={() => removeQuestion(questionIndex)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remover
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`pergunta-enunciado-${questionIndex}`}>Enunciado</Label>
            <Input
              id={`pergunta-enunciado-${questionIndex}`}
              value={question.statement}
              onChange={(event) => updateQuestion(questionIndex, { statement: event.target.value })}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`pergunta-descritor-${questionIndex}`}>Descritor</Label>
            <Input
              id={`pergunta-descritor-${questionIndex}`}
              value={question.descriptor}
              placeholder="Ex: Identificar informacao explicita"
              onChange={(event) => updateQuestion(questionIndex, { descriptor: event.target.value })}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label>Alternativas</Label>
            <p className="text-xs text-muted-foreground">Marque o gabarito em uma alternativa.</p>
            <div className="space-y-2">
              {question.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`gabarito-${question.id ?? questionIndex}`}
                    className="h-4 w-4 shrink-0 accent-bluebrand-deep"
                    checked={option.isCorrect}
                    onChange={() => markCorrect(questionIndex, optionIndex)}
                    disabled={disabled}
                    aria-label={`Marcar alternativa ${optionIndex + 1} como gabarito`}
                  />
                  <Input
                    value={option.text}
                    onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)}
                    placeholder={`Alternativa ${optionIndex + 1}`}
                    disabled={disabled}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-red-700 hover:bg-red-50"
                    disabled={disabled || question.options.length <= MIN_QUESTION_OPTIONS}
                    onClick={() => removeOption(questionIndex, optionIndex)}
                    aria-label={`Remover alternativa ${optionIndex + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            {question.options.length < MAX_QUESTION_OPTIONS ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => addOption(questionIndex)}
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar alternativa
              </Button>
            ) : null}
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => onChange([...questions, emptyQuestionDraft()])}
      >
        <Plus className="h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  );
}
