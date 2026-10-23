"use client";

import { ROUTES } from "@/config/routes";
import { canWriteIca } from "@/lib/auth/roles";
import { RoleGuard } from "@/components/auth/role-guard";
import { IcaCityScope } from "@/components/ica/ica-city-scope";
import { QuestionForm } from "@/components/ica/questions/question-form";

export function QuestionCreatePage() {
  return (
    <RoleGuard allow={canWriteIca} fallbackHref={ROUTES.ica.questoes.root}>
      <IcaCityScope emptyMessage="Selecione o município para cadastrar a questão.">
        <QuestionForm mode="create" />
      </IcaCityScope>
    </RoleGuard>
  );
}
