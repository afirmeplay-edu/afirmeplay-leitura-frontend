import { Globe2, Lock, MapPin } from "lucide-react";
import type { BankQuestionOrigin, ScopeType } from "@/lib/api/afirme-reading/types";
import { QUESTION_ORIGIN_LABEL, QUESTION_SCOPE_HINT, QUESTION_SCOPE_LABEL } from "@/lib/ica/questions";
import { cn } from "@/lib/utils";

export function OriginBadge({ origin, className }: { origin: BankQuestionOrigin; className?: string }) {
  const play = origin === "afirme_play";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        play ? "border-amber-300 bg-amber-50 text-amber-900" : "border-teal-200 bg-teal-50 text-teal-800",
        className
      )}
    >
      {play ? <Lock className="h-3 w-3" aria-hidden /> : null}
      {QUESTION_ORIGIN_LABEL[origin] ?? origin}
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
