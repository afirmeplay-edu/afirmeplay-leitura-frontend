"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileQuestion, Lock, RefreshCw } from "lucide-react";
import { getBankQuestion } from "@/lib/api/afirme-reading/questions";
import type { BankQuestion } from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import { ROUTES } from "@/config/routes";
import { ICA_BRAND } from "@/lib/ica/brand";
import { questionCorrectLetter, readOnlyReason, toPreviewModel } from "@/lib/ica/questions";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { IcaCityScope } from "@/components/ica/ica-city-scope";
import { OriginBadge, ScopeBadge } from "@/components/ica/questions/question-badges";
import { QuestionForm } from "@/components/ica/questions/question-form";
import { QuestionPreview } from "@/components/ica/questions/question-preview";
import { useSkillLabel } from "@/hooks/use-skill-label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function BackButton() {
  return (
    <Button variant="outline" asChild className="w-full sm:w-auto">
      <Link href={ROUTES.ica.questoes.root}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Link>
    </Button>
  );
}

function QuestionReadOnlyView({ question, reason }: { question: BankQuestion; reason: string }) {
  const skillLabel = useSkillLabel(question);
  const letter = questionCorrectLetter(question);
  return (
    <PageShell>
      <PageHeader brand={ICA_BRAND} title="Questão" description={letter ? `Gabarito: ${letter}` : undefined} icon={FileQuestion}>
        <BackButton />
      </PageHeader>
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertTitle>Somente leitura</AlertTitle>
        <AlertDescription>{reason}</AlertDescription>
      </Alert>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <OriginBadge origin={question.origin} />
        <ScopeBadge scope={question.scopeType} />
        {question.createdBy?.name ? <span>Criada por {question.createdBy.name}</span> : null}
        {question.version ? <span>· Versão {question.version}</span> : null}
      </div>
      <Card>
        <CardContent className="pt-6">
          <QuestionPreview question={toPreviewModel(question, skillLabel)} />
        </CardContent>
      </Card>
    </PageShell>
  );
}

export function QuestionDetailPage({ id }: { id: string }) {
  return (
    <IcaCityScope emptyMessage="Selecione o município para abrir a questão.">
      <QuestionDetail id={id} />
    </IcaCityScope>
  );
}

function QuestionDetail({ id }: { id: string }) {
  const user = useAuthStore((state) => state.user);
  const [question, setQuestion] = useState<BankQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status: number | null; message: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getBankQuestion(id)
      .then((data) => {
        if (!cancelled) setQuestion(data);
      })
      .catch((err) => {
        if (cancelled) return;
        const normalized = normalizeApiError(err, "Não foi possível carregar a questão.");
        setQuestion(null);
        setError({ status: normalized.status, message: normalized.message });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  if (loading) {
    return (
      <PageShell>
        <Skeleton className="h-16 w-full max-w-xl rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,400px)]">
          <Skeleton className="h-[420px] rounded-2xl" />
          <Skeleton className="h-[320px] rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  if (error || !question) {
    const notFound = error?.status === 404;
    return (
      <PageShell>
        <PageHeader brand={ICA_BRAND} title="Questão" icon={FileQuestion}>
          <BackButton />
        </PageHeader>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="font-medium">{notFound ? "Questão não encontrada." : "Não foi possível abrir a questão."}</p>
            <p className="max-w-md text-sm text-muted-foreground">
              {notFound
                ? "Ela pode não existir ou não estar visível para o seu perfil e município."
                : error?.message}
            </p>
            {!notFound ? (
              <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const reason = readOnlyReason(question, user);
  if (reason) return <QuestionReadOnlyView question={question} reason={reason} />;

  return <QuestionForm key={question.id} mode="edit" question={question} onSaved={setQuestion} />;
}
