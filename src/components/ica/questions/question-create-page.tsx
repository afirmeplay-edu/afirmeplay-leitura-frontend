"use client";

import { useSearchParams } from "next/navigation";
import { ROUTES } from "@/config/routes";
import { canWriteIca } from "@/lib/auth/roles";
import { isBankQuestionType } from "@/lib/ica/questions";
import { RoleGuard } from "@/components/auth/role-guard";
import { IcaCityScope } from "@/components/ica/ica-city-scope";
import { QuestionForm } from "@/components/ica/questions/question-form";

export function QuestionCreatePage() {
  const tipo = useSearchParams().get("tipo");
  const initialType = isBankQuestionType(tipo) ? tipo : undefined;

  return (
    <RoleGuard allow={canWriteIca} fallbackHref={ROUTES.ica.questoes.root}>
      <IcaCityScope emptyMessage="Selecione o município para cadastrar a questão.">
        <QuestionForm key={initialType ?? "multipleChoice"} mode="create" initialType={initialType} />
      </IcaCityScope>
    </RoleGuard>
  );
}
