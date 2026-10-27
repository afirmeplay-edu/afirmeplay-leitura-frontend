"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ClipboardCheck, Eye, FilePlus2, PenLine, RefreshCw, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { listWrittenTests } from "@/lib/api/afirme-reading/written-tests";
import type { BankQuestionPagination, WrittenTestStatus, WrittenTestSummary } from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import { ROUTES } from "@/config/routes";
import { canWriteIca } from "@/lib/auth/roles";
import {
  countAllFilled,
  isDraftEmpty,
  readAssessmentDraft,
  TOTAL_SLOTS,
  type AssessmentDraft,
} from "@/lib/ica/assessment-draft";
import { formatLocalDateTime } from "@/lib/ica/application";
import { ICA_BRAND } from "@/lib/ica/brand";
import { formatQuestionValue } from "@/lib/ica/questions";
import { formatDateTime, WRITTEN_TEST_STATUS_LABEL } from "@/lib/ica/written-tests";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAuthStore } from "@/stores/auth-store";
import { IcaCityScope } from "@/components/ica/ica-city-scope";
import { DataListPage, type DataListColumn } from "@/components/shared/data-list-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PER_PAGE = 20;
const ALL = "__all__";

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
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const [status, setStatus] = useState<WrittenTestStatus | "">("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<WrittenTestSummary[]>([]);
  const [pagination, setPagination] = useState<BankQuestionPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const stored = readAssessmentDraft(cityId);
    setDraft(stored && !isDraftEmpty(stored) ? stored : null);
  }, [cityId]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    listWrittenTests(
      { page, per_page: PER_PAGE, status: status || undefined, q: debouncedSearch || undefined },
      { signal: controller.signal }
    )
      .then((result) => {
        setItems(result.data);
        setPagination(result.pagination);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        const { message } = normalizeApiError(error, "Não foi possível carregar as avaliações.");
        setItems([]);
        setPagination(null);
        setLoadError(message);
        toast.error(message, { id: "ica-written-tests-load" });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, status, debouncedSearch, reloadKey]);

  const columns: DataListColumn<WrittenTestSummary>[] = [
    { key: "titulo", header: "Avaliação", render: (test) => <span title={test.title}>{test.title}</span> },
    {
      key: "status",
      header: "Status",
      render: (test) => (
        <Badge variant={test.status === "publicada" ? "success" : "outline"}>{WRITTEN_TEST_STATUS_LABEL[test.status]}</Badge>
      ),
    },
    { key: "questoes", header: "Questões", render: (test) => `${test.totalQuestions}/${TOTAL_SLOTS}` },
    { key: "pontos", header: "Pontuação", render: (test) => formatQuestionValue(test.totalScore), hideOnMobile: true },
    {
      key: "aplicacao",
      header: "Aplicação",
      render: (test) => {
        if (test.status !== "publicada") return "—";
        const next = formatLocalDateTime(test.nextApplicationStart);
        return (
          <span title={next ? `Próximo início ${next}` : undefined}>
            {test.appliedClassesCount}/{test.classIds.length} turmas{next ? ` · início ${next}` : ""}
          </span>
        );
      },
      hideOnMobile: true,
    },
    {
      key: "atualizada",
      header: "Atualizada",
      render: (test) => formatDateTime(test.updatedAt ?? test.createdAt) ?? "—",
      hideOnMobile: true,
    },
  ];

  function renderActions(test: WrittenTestSummary) {
    return (
      <span className="inline-flex gap-1">
        <Button variant="ghost" size="sm" className="h-9" asChild>
          <Link href={ROUTES.ica.avaliacoes.detalhe(test.id)}>
            <Eye className="h-4 w-4" />
            Abrir
          </Link>
        </Button>
        {test.status === "publicada" ? (
          <Button variant="ghost" size="sm" className="h-9" asChild>
            <Link href={ROUTES.ica.avaliacoes.aplicacao(test.id)}>
              <ScanLine className="h-4 w-4" />
              Aplicação
            </Link>
          </Button>
        ) : null}
      </span>
    );
  }

  const filtersActive = Boolean(debouncedSearch || status);
  const emptyState = loadError ? (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-sm text-muted-foreground">{loadError}</p>
      <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
        <RefreshCw className="h-4 w-4" />
        Tentar novamente
      </Button>
    </div>
  ) : (
    <div className="flex flex-col items-center gap-3 py-10 text-center animate-in fade-in-0 duration-200">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-highlight/10 text-brand-highlight">
        <ClipboardCheck className="h-6 w-6" aria-hidden />
      </span>
      <p className="font-medium">{filtersActive ? "Nenhuma avaliação com esses filtros." : "Nenhuma avaliação salva."}</p>
      {canWrite && !filtersActive ? (
        <Button asChild>
          <Link href={ROUTES.ica.avaliacoes.nova}>
            <FilePlus2 className="h-4 w-4" />
            Montar uma avaliação
          </Link>
        </Button>
      ) : null}
    </div>
  );

  const footer =
    !loading && pagination && pagination.pages > 1 ? (
      <nav className="flex items-center justify-between gap-2 border-t pt-4 text-sm" aria-label="Paginação">
        <p className="text-muted-foreground">
          {pagination.total} {pagination.total === 1 ? "avaliação" : "avaliações"}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-10" disabled={!pagination.has_prev} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="min-w-[5rem] text-center text-muted-foreground">
            {page} / {pagination.pages}
          </span>
          <Button variant="outline" size="sm" className="h-10" disabled={!pagination.has_next} onClick={() => setPage(page + 1)}>
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </nav>
    ) : null;

  const draftCard =
    draft && canWrite ? (
        <Card className="animate-in fade-in-0 duration-200">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-highlight/10 text-brand-highlight">
                <PenLine className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{draft.title.trim() || "Avaliação sem título"}</p>
                <p className="text-sm text-muted-foreground">
                  Rascunho não salvo neste navegador · {countAllFilled(draft)}/{TOTAL_SLOTS} itens
                  {formatDateTime(draft.updatedAt) ? ` · ${formatDateTime(draft.updatedAt)}` : ""}
                </p>
              </div>
            </div>
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href={ROUTES.ica.avaliacoes.nova}>Continuar montagem</Link>
            </Button>
          </CardContent>
        </Card>
    ) : null;

  return (
      <DataListPage
        brand={ICA_BRAND}
        title="Avaliações"
        description="Provas do ICA com 20 itens: 16 de múltipla escolha, 3 de ditado e 1 de produção escrita."
        icon={ClipboardCheck}
        items={items}
        columns={columns}
        createHref={canWrite ? ROUTES.ica.avaliacoes.nova : undefined}
        createLabel="Nova avaliação"
        searchPlaceholder="Buscar pelo título"
        searchValue={search}
        onSearchChange={setSearch}
        rowHref={(test) => ROUTES.ica.avaliacoes.detalhe(test.id)}
        actions={renderActions}
        toolbar={
          <div className="space-y-4">
          {draftCard}
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="avaliacoes-status" className="text-xs text-muted-foreground">
              Status
            </Label>
            <Select value={status || ALL} onValueChange={(value) => setStatus(value === ALL ? "" : (value as WrittenTestStatus))}>
              <SelectTrigger id="avaliacoes-status" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="publicada">Publicada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>
        }
        loading={loading}
        loadingRows={5}
        emptyState={emptyState}
        footer={footer}
      />
  );
}
