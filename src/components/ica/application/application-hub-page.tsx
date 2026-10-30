"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, Eye, RefreshCw, ScanLine } from "lucide-react";
import { listAnswerSheetCorrections, listWrittenTests } from "@/lib/api/afirme-reading/written-tests";
import type { AnswerSheetCorrectionsList, WrittenTestSummary } from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import { ROUTES } from "@/config/routes";
import { formatLocalDateTime } from "@/lib/ica/application";
import { ICA_BRAND } from "@/lib/ica/brand";
import { formatDateTime } from "@/lib/ica/written-tests";
import { AnswerSheetSavedResultList } from "@/components/ica/application/answer-sheet-saved-results";
import { IcaCityScope } from "@/components/ica/ica-city-scope";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ApplicationHubPage() {
  return (
    <IcaCityScope emptyMessage="Selecione o município para ver as avaliações publicadas.">
      <ApplicationHub />
    </IcaCityScope>
  );
}

function ApplicationHub() {
  const [items, setItems] = useState<WrittenTestSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [savedById, setSavedById] = useState<Record<string, AnswerSheetCorrectionsList | "error">>({});
  const [viewingId, setViewingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    listWrittenTests({ status: "publicada", per_page: 100 }, { signal: controller.signal })
      .then((result) => {
        setItems(result.data);
        setTotal(result.pagination.total);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setItems([]);
        setTotal(0);
        setError(normalizeApiError(err, "Não foi possível carregar as avaliações publicadas.").message);
      })
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [reloadKey]);

  const viewing = items.find((test) => test.id === viewingId) ?? null;
  const viewingSaved = viewingId ? savedById[viewingId] : undefined;
  const viewingStudents = viewingSaved && viewingSaved !== "error" ? viewingSaved.students : [];

  useEffect(() => {
    if (!items.length) {
      setSavedById({});
      return;
    }
    const controller = new AbortController();
    setSavedById({});
    void Promise.all(
      items.map(async (test) => {
        try {
          const list = await listAnswerSheetCorrections(test.id, { signal: controller.signal });
          return [test.id, list] as const;
        } catch {
          if (controller.signal.aborted) return null;
          return [test.id, "error"] as const;
        }
      })
    ).then((rows) => {
      if (controller.signal.aborted) return;
      const next: Record<string, AnswerSheetCorrectionsList | "error"> = {};
      for (const row of rows) {
        if (!row) continue;
        next[row[0]] = row[1];
      }
      setSavedById(next);
    });
    return () => controller.abort();
  }, [items]);

  async function retryCorrection(testId: string) {
    setSavedById((current) => {
      const next = { ...current };
      delete next[testId];
      return next;
    });
    try {
      const list = await listAnswerSheetCorrections(testId);
      setSavedById((current) => ({ ...current, [testId]: list }));
    } catch {
      setSavedById((current) => ({ ...current, [testId]: "error" }));
    }
  }

  return (
    <PageShell>
      <PageHeader
        brand={ICA_BRAND}
        title="Aplicação e correção"
        description="Agende as turmas, gere os cartões-resposta e envie as folhas digitalizadas para correção."
        icon={ScanLine}
      />

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-highlight/10 text-brand-highlight">
                <ClipboardCheck className="h-6 w-6" aria-hidden />
              </span>
              <p className="font-medium">Nenhuma avaliação publicada.</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Monte a prova com as 19 questões e publique para poder aplicá-la.
              </p>
              <Button asChild>
                <Link href={ROUTES.ica.avaliacoes.root}>Ver avaliações</Link>
              </Button>
            </div>
          ) : (
            <div className="-mx-1 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Avaliação</TableHead>
                    <TableHead>Turmas aplicadas</TableHead>
                    <TableHead>Próximo início</TableHead>
                    <TableHead>Publicada em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="max-w-[320px] truncate font-medium" title={test.title}>
                        {test.title}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {test.appliedClassesCount}/{test.classIds.length}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatLocalDateTime(test.nextApplicationStart) ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateTime(test.publishedAt) ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <CorrectionStatusButton
                            testId={test.id}
                            saved={savedById[test.id]}
                            onView={() => setViewingId(test.id)}
                            onRetry={() => void retryCorrection(test.id)}
                          />
                          <Button variant="ghost" size="sm" className="h-9" asChild>
                            <Link href={ROUTES.ica.avaliacoes.detalhe(test.id)}>
                              <Eye className="h-4 w-4" />
                              Prova
                            </Link>
                          </Button>
                          <Button size="sm" className="h-9" asChild>
                            <Link href={ROUTES.ica.avaliacoes.aplicacao(test.id)}>
                              <ScanLine className="h-4 w-4" />
                              Aplicação
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {total > items.length ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Mostrando as {items.length} avaliações publicadas criadas mais recentemente, de {total}.
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={viewing != null} onOpenChange={(open) => !open && setViewingId(null)}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <SheetHeader className="space-y-1 border-b p-6 pr-12 text-left">
            <SheetTitle>{viewing?.title ?? "Correção"}</SheetTitle>
            <SheetDescription>
              {viewingStudents.length
                ? `${viewingStudents.length} aluno(s) com correção gravada, em ordem de nome.`
                : "Correções gravadas desta avaliação."}
            </SheetDescription>
          </SheetHeader>
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-6">
            <AnswerSheetSavedResultList
              students={viewingStudents}
              writtenTestId={viewing?.id}
              onUpdated={() => {
                if (!viewingId) return;
                listAnswerSheetCorrections(viewingId)
                  .then((list) => setSavedById((prev) => ({ ...prev, [viewingId]: list })))
                  .catch(() => setSavedById((prev) => ({ ...prev, [viewingId]: "error" })));
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}

function CorrectionStatusButton({
  testId,
  saved,
  onView,
  onRetry,
}: {
  testId: string;
  saved: AnswerSheetCorrectionsList | "error" | undefined;
  onView: () => void;
  onRetry: () => void;
}) {
  if (!saved) {
    return (
      <Button variant="outline" size="sm" className="h-9" disabled>
        Verificando…
      </Button>
    );
  }
  if (saved === "error") {
    return (
      <Button variant="outline" size="sm" className="h-9" onClick={onRetry}>
        Não foi possível verificar
      </Button>
    );
  }
  if (saved.students.length === 0) {
    return (
      <Button variant="outline" size="sm" className="h-9" asChild>
        <Link href={`${ROUTES.ica.avaliacoes.aplicacao(testId)}#correcao`}>Ainda não corrigida</Link>
      </Button>
    );
  }
  return (
    <Button size="sm" className="h-9" onClick={onView} title="Ver o que foi corrigido">
      <ClipboardCheck className="h-4 w-4" />
      Já corrigida
    </Button>
  );
}
