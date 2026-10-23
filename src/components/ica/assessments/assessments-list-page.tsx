"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, FilePlus2, PenLine } from "lucide-react";
import { ROUTES } from "@/config/routes";
import { canWriteIca } from "@/lib/auth/roles";
import {
  CLOSED_SLOTS,
  countFilledClosed,
  isDraftEmpty,
  readAssessmentDraft,
  type AssessmentDraft,
} from "@/lib/ica/assessment-draft";
import { ICA_BRAND } from "@/lib/ica/brand";
import { useAuthStore } from "@/stores/auth-store";
import { IcaCityScope } from "@/components/ica/ica-city-scope";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function formatDateTime(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function AssessmentsListPage() {
  return (
    <IcaCityScope emptyMessage="Selecione o município para ver as avaliações.">
      <AssessmentsList />
    </IcaCityScope>
  );
}

function AssessmentsList() {
  const role = useAuthStore((state) => state.user?.role);
  const cityId = useAuthStore((state) => state.selectedCityId);
  const canWrite = canWriteIca(role);
  const [draft, setDraft] = useState<AssessmentDraft | null>(null);

  useEffect(() => {
    const stored = readAssessmentDraft(cityId);
    setDraft(stored && !isDraftEmpty(stored) ? stored : null);
  }, [cityId]);

  return (
    <PageShell>
      <PageHeader
        brand={ICA_BRAND}
        title="Avaliações"
        description="Provas do ICA com 16 itens de múltipla escolha, 3 abertos e 1 produção textual."
        icon={ClipboardCheck}
      >
        {canWrite ? (
          <Button asChild className="w-full sm:w-auto">
            <Link href={ROUTES.ica.avaliacoes.nova}>
              <FilePlus2 className="h-4 w-4" />
              Nova avaliação
            </Link>
          </Button>
        ) : null}
      </PageHeader>

      {draft && canWrite ? (
        <Card className="animate-in fade-in-0 duration-200">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-highlight/10 text-brand-highlight">
                <PenLine className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{draft.name.trim() || "Avaliação sem nome"}</p>
                <p className="text-sm text-muted-foreground">
                  Rascunho neste navegador · {countFilledClosed(draft)}/{CLOSED_SLOTS} fechadas
                  {formatDateTime(draft.updatedAt) ? ` · ${formatDateTime(draft.updatedAt)}` : ""}
                </p>
              </div>
            </div>
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href={ROUTES.ica.avaliacoes.nova}>Continuar montagem</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-highlight/10 text-brand-highlight">
            <ClipboardCheck className="h-6 w-6" aria-hidden />
          </span>
          <p className="font-medium">Nenhuma avaliação salva.</p>
          <p className="max-w-md text-sm text-muted-foreground">
            As avaliações salvas vão aparecer aqui quando a API de avaliações do ICA estiver disponível. Até lá, a
            montagem fica como rascunho no navegador.
          </p>
          {canWrite ? (
            <Button asChild className="mt-1">
              <Link href={ROUTES.ica.avaliacoes.nova}>Montar uma avaliação</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </PageShell>
  );
}
