"use client";

import { CheckCircle2 } from "lucide-react";
import { formatQuestionValue, type QuestionPreviewModel } from "@/lib/ica/questions";
import { cn } from "@/lib/utils";
import { QuestionHtml } from "@/components/ica/question-html";

interface QuestionPreviewProps {
  question: QuestionPreviewModel;
  showAnswer?: boolean;
  showMeta?: boolean;
  className?: string;
}

export function QuestionPreview({ question, showAnswer = true, showMeta = true, className }: QuestionPreviewProps) {
  const meta = [
    question.subjectName ? { label: "Disciplina", value: question.subjectName } : null,
    question.gradeName ? { label: "Série", value: question.gradeName } : null,
    question.difficulty ? { label: "Dificuldade", value: question.difficulty } : null,
    { label: "Valor", value: formatQuestionValue(question.value) },
    question.skillLabel ? { label: "Habilidade", value: question.skillLabel } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);

  const hasStatement = Boolean(question.formattedText?.trim() || question.text?.trim());

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2 text-sm leading-relaxed text-foreground">
        {hasStatement ? (
          <QuestionHtml html={question.formattedText} fallbackText={question.text} />
        ) : (
          <p className="text-muted-foreground">O enunciado aparece aqui.</p>
        )}
        {question.secondStatement?.trim() ? (
          <p className="whitespace-pre-line text-muted-foreground">{question.secondStatement}</p>
        ) : null}
      </div>

      <ol className="space-y-2" aria-label="Alternativas">
        {question.options.map((option) => {
          const correct = showAnswer && option.isCorrect;
          return (
            <li
              key={option.key}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-3 py-2 text-sm transition-colors duration-200",
                correct ? "border-emerald-300 bg-emerald-50" : "border-border bg-background"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  correct ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                )}
                aria-hidden
              >
                {option.letter}
              </span>
              <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                <span className="sr-only">Alternativa {option.letter}: </span>
                {option.text ? <p className="whitespace-pre-line break-words">{option.text}</p> : null}
                {option.imageSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data-URL local ou imagem do backend via /api
                  <img
                    src={option.imageSrc}
                    alt={`Imagem da alternativa ${option.letter}`}
                    className="max-h-40 rounded-lg border object-contain"
                    loading="lazy"
                  />
                ) : null}
                {!option.text && !option.imageSrc ? (
                  <p className="text-muted-foreground">Alternativa vazia</p>
                ) : null}
              </div>
              {correct ? (
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Gabarito
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      {question.formattedSolution?.trim() && showAnswer ? (
        <div className="rounded-xl border border-dashed bg-muted/40 p-3 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Resolução comentada
          </p>
          <QuestionHtml html={question.formattedSolution} />
        </div>
      ) : null}

      {showMeta ? (
        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
          {meta.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="break-words font-medium">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
