"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import type { BankQuestion } from "@/lib/api/afirme-reading/types";
import { ROUTES } from "@/config/routes";
import { useSkillLabel } from "@/hooks/use-skill-label";
import { questionCorrectLetter, readOnlyReason, toPreviewModel } from "@/lib/ica/questions";
import { useAuthStore } from "@/stores/auth-store";
import { OriginBadge, ScopeBadge } from "@/components/ica/questions/question-badges";
import { QuestionPreview } from "@/components/ica/questions/question-preview";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface QuestionPreviewSheetProps {
  question: BankQuestion | null;
  onOpenChange: (open: boolean) => void;
  footer?: ReactNode;
}

export function QuestionPreviewSheet({ question, onOpenChange, footer }: QuestionPreviewSheetProps) {
  const role = useAuthStore((state) => state.user?.role);
  const skillLabel = useSkillLabel(question);
  const reason = question ? readOnlyReason(question, role) : null;
  const letter = question ? questionCorrectLetter(question) : "";

  return (
    <Sheet open={Boolean(question)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        {question ? (
          <>
            <SheetHeader className="space-y-2 border-b p-6 pr-12 text-left">
              <div className="flex flex-wrap gap-1.5">
                <OriginBadge origin={question.origin} />
                <ScopeBadge scope={question.scopeType} />
              </div>
              <SheetTitle>Pré-visualização da questão</SheetTitle>
              <SheetDescription>
                {letter ? `Gabarito: ${letter}` : "Sem gabarito definido"}
                {question.createdBy?.name ? ` · Criada por ${question.createdBy.name}` : ""}
                {question.version ? ` · Versão ${question.version}` : ""}
              </SheetDescription>
            </SheetHeader>
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-6">
              <QuestionPreview question={toPreviewModel(question, skillLabel)} />
            </div>
            <div className="flex flex-col-reverse gap-2 border-t p-4 sm:flex-row sm:justify-end">
              {footer}
              {!footer && !reason ? (
                <Button asChild>
                  <Link href={ROUTES.ica.questoes.detalhe(question.id)}>
                    <Pencil className="h-4 w-4" />
                    Editar questão
                  </Link>
                </Button>
              ) : null}
              {!footer && reason ? <p className="text-sm text-muted-foreground">{reason}</p> : null}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
