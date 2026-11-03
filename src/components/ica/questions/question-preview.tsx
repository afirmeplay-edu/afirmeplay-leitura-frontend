"use client";

import { CheckCircle2, ImageIcon, Megaphone, Mic, PenLine } from "lucide-react";
import { normalizeDictationMarks } from "@/lib/ica/dictation-marks";
import { formatQuestionValue, QUESTION_TYPE_LABEL, type QuestionPreviewModel } from "@/lib/ica/questions";
import { cn } from "@/lib/utils";
import { QuestionHtml } from "@/components/ica/question-html";

interface QuestionPreviewProps {
  question: QuestionPreviewModel;
  showAnswer?: boolean;
  showMeta?: boolean;
  className?: string;
}

export function QuestionPreview({ question, showAnswer = true, showMeta = true, className }: QuestionPreviewProps) {
  const type = question.type ?? "multipleChoice";
  const meta = [
    { label: "Tipo", value: QUESTION_TYPE_LABEL[type] },
    question.subjectName ? { label: "Disciplina", value: question.subjectName } : null,
    question.gradeName ? { label: "Série", value: question.gradeName } : null,
    question.difficulty ? { label: "Dificuldade", value: question.difficulty } : null,
    { label: "Valor", value: formatQuestionValue(question.value) },
    question.skillLabel ? { label: "Habilidade", value: question.skillLabel } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);

  const hasStatement = Boolean(question.formattedText?.trim() || question.text?.trim());
  const marks = normalizeDictationMarks(question.dictationMarks);

  const Mark = ({ label }: { label: string }) => (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900"
      title={`${label}: o aplicador lê em voz alta`}
    >
      <Megaphone className="h-3 w-3" aria-hidden />
      Ler
    </span>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {question.title?.trim() ? (
        <div className="flex items-start gap-2">
          <p className="flex-1 font-semibold">{question.title}</p>
          {marks.title ? <Mark label="Título" /> : null}
        </div>
      ) : null}
      <div className="space-y-2 text-sm leading-relaxed text-foreground">
        {hasStatement ? (
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <QuestionHtml html={question.formattedText} fallbackText={question.text} />
            </div>
            {marks.statement ? <Mark label="Enunciado" /> : null}
          </div>
        ) : (
          <p className="text-muted-foreground">O enunciado aparece aqui.</p>
        )}
        {question.secondStatement?.trim() ? (
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 whitespace-pre-line text-muted-foreground">{question.secondStatement}</p>
            {marks.support ? <Mark label="Texto de apoio" /> : null}
          </div>
        ) : null}
        {marks.images.length ? (
          <p className="flex items-center gap-1.5 text-xs text-amber-900">
            <Megaphone className="h-3.5 w-3.5" aria-hidden />
            Ler as imagens {marks.images.map((index) => index + 1).join(", ")}.
          </p>
        ) : null}
      </div>

      {type === "dictation" && question.stimulus === "image" ? (
        <div className="flex items-start gap-3 rounded-xl border border-dashed px-3 py-2.5 text-sm">
          <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-highlight" aria-hidden />
          <div className="min-w-0 space-y-1">
            <p className="text-muted-foreground">O aluno escreve o nome da figura. A foto sai na prova. A descrição não sai.</p>
            {showAnswer ? (
              <p className="font-semibold text-emerald-700">
                {question.imageDescription ? `Descrição: ${question.imageDescription}` : "Descrição ainda não gerada"}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {type === "dictation" && question.stimulus !== "image" ? (
        <div className="flex items-start gap-3 rounded-xl border border-dashed px-3 py-2.5 text-sm">
          <Mic className="mt-0.5 h-4 w-4 shrink-0 text-brand-highlight" aria-hidden />
          <div className="min-w-0 space-y-1">
            <p className="text-muted-foreground">O aluno escreve a palavra ditada no cartão-resposta. A palavra não sai na prova.</p>
            {showAnswer ? (
              <p className="font-semibold text-emerald-700">
                {question.dictatedWord ? `Palavra ditada: ${question.dictatedWord}` : "Palavra ditada não informada"}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {type === "text_production" ? (
        <div className="flex items-start gap-3 rounded-xl border border-dashed px-3 py-2.5 text-sm text-muted-foreground">
          <PenLine className="mt-0.5 h-4 w-4 shrink-0 text-brand-highlight" aria-hidden />
          <p>Espaço de escrita no cartão-resposta. Sem gabarito: a correção é feita pelo professor.</p>
        </div>
      ) : null}

      <ol className={cn("space-y-2", type !== "multipleChoice" && "hidden")} aria-label="Alternativas">
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
              {marks.options.includes(option.letter) ? <Mark label={`Alternativa ${option.letter}`} /> : null}
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
