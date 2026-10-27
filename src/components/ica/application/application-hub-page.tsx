"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, Eye, RefreshCw, ScanLine } from "lucide-react";
import { listWrittenTests } from "@/lib/api/afirme-reading/written-tests";
import type { WrittenTestSummary } from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import { ROUTES } from "@/config/routes";
import { formatLocalDateTime } from "@/lib/ica/application";
import { ICA_BRAND } from "@/lib/ica/brand";
import { formatDateTime } from "@/lib/ica/written-tests";
import { IcaCityScope } from "@/components/ica/ica-city-scope";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    listWrittenTests({ status: "publicada", per_page: 100 }, { signal: controller.signal })
      .then((result) => setItems(result.data))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setItems([]);
        setError(normalizeApiError(err, "Não foi possível carregar as avaliações publicadas.").message);
      })
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [reloadKey]);

  return (
    <PageShell>
      <PageHeader
        brand={ICA_BRAND}
        title="Aplicação e correção"
        description="Aplique as avaliações publicadas às turmas e gere os cartões-resposta."
        icon={ScanLine}
      />

      <Alert>
        <ScanLine className="h-4 w-4" />
        <AlertDescription>
          A leitura dos cartões-resposta e a correção automática ainda não existem no servidor. Por enquanto, a tela cobre
          o agendamento por turma e a geração dos cartões.
        </AlertDescription>
      </Alert>

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
                Monte a prova com as 20 questões e publique para poder aplicá-la.
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
                        <div className="flex justify-end gap-1">
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
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
