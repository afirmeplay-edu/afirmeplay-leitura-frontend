import { Globe2, Lock, MapPin } from "lucide-react";
import type { BankQuestionOrigin, ScopeType } from "@/lib/api/afirme-reading/types";
import {
  normalizeQuestionType,
  QUESTION_ORIGIN_LABEL,
  QUESTION_SCOPE_HINT,
  QUESTION_SCOPE_LABEL,
  questionTypeLabel,
} from "@/lib/ica/questions";
import { cn } from "@/lib/utils";

const TYPE_STYLE = {
  multipleChoice: {
    className: "border-brand-highlight/30 bg-brand-highlight/5 text-brand-highlight",
    lines: ["Múltipla", "escolha"] as const,
  },
  dictation: {
    className: "border-amber-300 bg-amber-50 text-amber-900",
    lines: ["Ditado"] as const,
  },
  text_production: {
    className: "border-rose-300 bg-rose-50 text-rose-800",
    lines: ["Produção", "escrita"] as const,
  },
} as const;

export function QuestionTypeBadge({ type, className }: { type: string | null | undefined; className?: string }) {
  const normalized = normalizeQuestionType(type);
  const style = normalized ? TYPE_STYLE[normalized] : null;
  const lines = style?.lines ?? [questionTypeLabel(type)];
  return (
    <span
      title={questionTypeLabel(type)}
      className={cn(
        "inline-flex max-w-[5.5rem] rounded-md border px-1.5 py-1 text-[12px] font-medium leading-tight",
        style?.className ?? "border-slate-200 bg-slate-50 text-slate-700",
        className
      )}
    >
      <span className="min-w-0">
        {lines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </span>
    </span>
  );
}

export function OriginBadge({
  origin,
  className,
  compact,
}: {
  origin: BankQuestionOrigin;
  className?: string;
  /** Rótulo curto para tabelas densas. */
  compact?: boolean;
}) {
  const play = origin === "afirme_play";
  const label = compact ? (play ? "Play" : "Educacional") : (QUESTION_ORIGIN_LABEL[origin] ?? origin);
  return (
    <span
      title={QUESTION_ORIGIN_LABEL[origin] ?? origin}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        play ? "border-amber-300 bg-amber-50 text-amber-900" : "border-teal-200 bg-teal-50 text-teal-800",
        className
      )}
    >
      {play ? <Lock className="h-3 w-3" aria-hidden /> : null}
      {label}
    </span>
  );
}

const SCOPE_ICON = { GLOBAL: Globe2, CITY: MapPin, PRIVATE: Lock } as const;

export function ScopeBadge({ scope, className }: { scope: ScopeType; className?: string }) {
  const Icon = SCOPE_ICON[scope] ?? Globe2;
  return (
    <span
      title={QUESTION_SCOPE_HINT[scope]}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700",
        className
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {QUESTION_SCOPE_LABEL[scope] ?? scope}
    </span>
  );
}
