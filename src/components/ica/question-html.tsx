"use client";

import { useMemo } from "react";
import { sanitizeQuestionHtml } from "@/lib/ica/question-html";
import { cn } from "@/lib/utils";

interface QuestionHtmlProps {
  html?: string | null;
  fallbackText?: string | null;
  className?: string;
}

export function QuestionHtml({ html, fallbackText, className }: QuestionHtmlProps) {
  const safe = useMemo(() => sanitizeQuestionHtml(html), [html]);

  if (!safe) {
    if (!fallbackText?.trim()) return null;
    return <p className={cn("question-html whitespace-pre-line", className)}>{fallbackText}</p>;
  }

  return <div className={cn("question-html", className)} dangerouslySetInnerHTML={{ __html: safe }} />;
}
