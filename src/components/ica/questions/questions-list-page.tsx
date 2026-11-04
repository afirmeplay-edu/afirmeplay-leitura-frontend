"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Eye, FilePlus2, Library, Pencil, RefreshCw, SearchX } from "lucide-react";
import { toast } from "sonner";
import { listBankQuestions } from "@/lib/api/afirme-reading/questions";
import type { BankQuestion, BankQuestionOrigin, BankQuestionPagination } from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import { ROUTES } from "@/config/routes";
import { canWriteIca } from "@/lib/auth/roles";
import { ICA_BRAND } from "@/lib/ica/brand";
import {
  formatQuestionValue,
  isBankQuestionType,
  questionAnswerSummary,
  questionStatement,
  readOnlyReason,
} from "@/lib/ica/questions";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useQuestionCatalog } from "@/hooks/use-question-catalog";
import { useAuthStore } from "@/stores/auth-store";
import { DataListPage, type DataListColumn } from "@/components/shared/data-list-page";
import { IcaCityScope } from "@/components/ica/ica-city-scope";
import { OriginBadge, QuestionTypeBadge, ScopeBadge } from "@/components/ica/questions/question-badges";
import {
  hasActiveQuestionFilters,
  QuestionFilters,
  type QuestionFilterValue,
} from "@/components/ica/questions/question-filters";
import { ExpandableStatement } from "@/components/ica/questions/expandable-statement";
import { QuestionPreviewSheet } from "@/components/ica/questions/question-preview-sheet";
import { QuestionSkillCell } from "@/components/ica/questions/question-skill-cell";
import { DifficultyBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const PER_PAGE = 20;
const ORIGINS: BankQuestionOrigin[] = ["afirme_ler", "afirme_play"];

function readFilters(params: URLSearchParams): QuestionFilterValue {
  const origin = params.get("origin") ?? "";
  const type = params.get("type") ?? "";
  return {
    type: isBankQuestionType(type) ? type : "",
    subjectId: params.get("subject_id") ?? "",
    gradeId: params.get("grade_id") ?? "",
    difficulty: params.get("difficulty") ?? "",
    origin: ORIGINS.includes(origin as BankQuestionOrigin) ? (origin as BankQuestionOrigin) : "",
  };
}

function readPage(params: URLSearchParams) {
  const page = Number(params.get("page"));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function QuestionsListPage() {
  return (
    <IcaCityScope emptyMessage="Selecione o município para carregar o banco de questões.">
      <QuestionsList />
    </IcaCityScope>
  );
}

function QuestionsList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const canWrite = canWriteIca(user?.role);
  const { subjects, grades } = useQuestionCatalog();

  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const page = readPage(searchParams);
  const urlQuery = searchParams.get("q") ?? "";

  const [searchInput, setSearchInput] = useState(urlQuery);
  const debouncedSearch = useDebouncedValue(searchInput.trim());
  const [items, setItems] = useState<BankQuestion[]>([]);
  const [pagination, setPagination] = useState<BankQuestionPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [preview, setPreview] = useState<BankQuestion | null>(null);

  const updateUrl = useCallback(
    (patch: Record<string, string | number | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "" || (key === "page" && value === 1)) next.delete(key);
        else next.set(key, String(value));
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const lastDebouncedRef = useRef(debouncedSearch);

  useEffect(() => {
    if (lastDebouncedRef.current === debouncedSearch) return;
    lastDebouncedRef.current = debouncedSearch;
    if (debouncedSearch !== urlQuery) updateUrl({ q: debouncedSearch || null, page: null });
  }, [debouncedSearch, updateUrl, urlQuery]);

  useEffect(() => {
    setSearchInput((current) => (current.trim() === urlQuery ? current : urlQuery));
  }, [urlQuery]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);

    listBankQuestions(
      {
        page,
        per_page: PER_PAGE,
        type: filters.type || undefined,
        q: urlQuery || undefined,
        subject_id: filters.subjectId || undefined,
        grade_id: filters.gradeId || undefined,
        difficulty: filters.difficulty || undefined,
        origin: filters.origin || undefined,
      },
      { signal: controller.signal }
    )
      .then((result) => {
        setItems(result.data);
        setPagination(result.pagination);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        const { message } = normalizeApiError(error, "Não foi possível carregar as questões.");
        setItems([]);
        setPagination(null);
        setLoadError(message);
        toast.error(message, { id: "ica-questions-load" });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [filters, page, reloadKey, urlQuery]);

  function applyFilters(patch: Partial<QuestionFilterValue>) {
    const next = { ...filters, ...patch };
    updateUrl({
      type: next.type || null,
      subject_id: next.subjectId || null,
      grade_id: next.gradeId || null,
      difficulty: next.difficulty || null,
      origin: next.origin || null,
      page: null,
    });
  }

  function clearFilters() {
    setSearchInput("");
    updateUrl({ q: null, type: null, subject_id: null, grade_id: null, difficulty: null, origin: null, page: null });
  }

  const filtersActive = hasActiveQuestionFilters(filters) || Boolean(urlQuery);

  function replaceQuestion(updated: BankQuestion) {
    setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setPreview((current) => (current?.id === updated.id ? updated : current));
  }

  const columns: DataListColumn<BankQuestion>[] = [
    {
      key: "enunciado",
      header: "Enunciado",
      noTruncate: true,
      className: "w-[14rem] min-w-[14rem] max-w-[14rem]",
      headerClassName: "w-[14rem]",
      render: (question) => {
        const statement = questionStatement(question) || "(sem enunciado)";
        return (
          <div className="space-y-1">
            <ExpandableStatement text={statement} />
            <Link
              href={ROUTES.ica.questoes.detalhe(question.id)}
              className="text-xs font-medium text-brand-highlight hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              Abrir
            </Link>
          </div>
        );
      },
    },
    {
      key: "tipo",
      header: "Tipo",
      noTruncate: true,
      className: "w-[6rem]",
      headerClassName: "w-[6rem]",
      render: (question) => <QuestionTypeBadge type={question.type} />,
    },
    {
      key: "gabarito",
      header: "Gab.",
      className: "w-[3.5rem] text-center tabular-nums",
      headerClassName: "w-[3.5rem] text-center",
      render: (question) => (
        <span className="font-medium" title={questionAnswerSummary(question) || undefined}>
          {questionAnswerSummary(question) || "—"}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "habilidade",
      header: "Habilidade",
      noTruncate: true,
      className: "w-[8rem]",
      headerClassName: "w-[8rem]",
      render: (question) => (
        <QuestionSkillCell
          question={question}
          editable={canWrite && !readOnlyReason(question, user)}
          onUpdated={replaceQuestion}
        />
      ),
    },
    {
      key: "disciplina",
      header: "Disciplina",
      className: "max-w-[8rem]",
      render: (question) => question.subject?.name ?? "—",
    },
    {
      key: "serie",
      header: "Série",
      className: "max-w-[5rem]",
      render: (question) => question.grade?.name ?? "—",
    },
    {
      key: "dificuldade",
      header: "Dificuldade",
      hideOnMobile: true,
      className: "max-w-[7rem]",
      render: (question) =>
        question.difficulty ? <DifficultyBadge difficulty={question.difficulty} /> : "—",
    },
    {
      key: "valor",
      header: "Pts",
      hideOnMobile: true,
      className: "w-[3.5rem] text-right tabular-nums",
      headerClassName: "w-[3.5rem] text-right",
      render: (question) => {
        const value = question.value;
        if (value == null || Number.isNaN(value)) return "—";
        const short = Number.isInteger(value) ? String(value) : value.toLocaleString("pt-BR");
        return <span title={formatQuestionValue(value)}>{short}</span>;
      },
    },
    {
      key: "origem",
      header: "Origem",
      noTruncate: true,
      className: "w-[7.5rem]",
      render: (question) => (
        <span className="inline-flex flex-col items-start gap-1">
          <OriginBadge origin={question.origin} compact />
          <ScopeBadge scope={question.scopeType} />
        </span>
      ),
    },
  ];

  function renderActions(question: BankQuestion) {
    const reason = readOnlyReason(question, user);
    return (
      <span className="inline-flex gap-1">
        <Button variant="ghost" size="sm" className="h-9" onClick={() => setPreview(question)}>
          <Eye className="h-4 w-4" />
          Visualizar
        </Button>
        {reason ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="inline-flex">
                <Button variant="ghost" size="sm" className="h-9" disabled aria-label="Editar (indisponível)">
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{reason}</TooltipContent>
          </Tooltip>
        ) : (
          <Button variant="ghost" size="sm" className="h-9" asChild>
            <Link href={ROUTES.ica.questoes.detalhe(question.id)}>
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          </Button>
        )}
      </span>
    );
  }

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
        {filtersActive ? <SearchX className="h-6 w-6" /> : <Library className="h-6 w-6" />}
      </span>
      <div className="space-y-1">
        <p className="font-medium">
          {filtersActive ? "Nenhuma questão com esses filtros." : "Nenhuma questão no banco ainda."}
        </p>
        <p className="text-sm text-muted-foreground">
          {filtersActive
            ? "Tente outra busca ou limpe os filtros."
            : "Cadastre a primeira questão: múltipla escolha, ditado ou produção escrita."}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {filtersActive ? (
          <Button variant="outline" onClick={clearFilters}>
            Limpar filtros
          </Button>
        ) : null}
        {canWrite ? (
          <Button asChild>
            <Link href={ROUTES.ica.questoes.nova}>
              <FilePlus2 className="h-4 w-4" />
              Criar questão
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );

  const total = pagination?.total ?? 0;
  const firstItem = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const lastItem = Math.min(page * PER_PAGE, total);

  const footer =
    !loading && pagination && total > 0 ? (
      <nav
        className="flex flex-col items-center justify-between gap-2 border-t pt-4 text-sm sm:flex-row"
        aria-label="Paginação"
      >
        <p className="text-muted-foreground">
          {firstItem}–{lastItem} de {total} {total === 1 ? "questão" : "questões"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-10"
            disabled={!pagination.has_prev}
            onClick={() => updateUrl({ page: page - 1 })}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="min-w-[5rem] text-center text-muted-foreground" aria-current="page">
            {page} / {Math.max(pagination.pages, 1)}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-10"
            disabled={!pagination.has_next}
            onClick={() => updateUrl({ page: page + 1 })}
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </nav>
    ) : null;

  return (
    <TooltipProvider delayDuration={200}>
      <DataListPage
        brand={ICA_BRAND}
        title="Banco de questões"
        description="Questões de múltipla escolha, ditado e produção escrita do Afirme Educacional e do Afirme Play visíveis para o seu perfil."
        icon={Library}
        items={items}
        columns={columns}
        createHref={canWrite ? ROUTES.ica.questoes.nova : undefined}
        createLabel="Nova questão"
        searchPlaceholder="Buscar no enunciado"
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        rowHref={(question) => ROUTES.ica.questoes.detalhe(question.id)}
        actions={renderActions}
        toolbar={
          <QuestionFilters value={filters} onChange={applyFilters} subjects={subjects} grades={grades} withType />
        }
        loading={loading}
        loadingRows={6}
        emptyState={emptyState}
        footer={footer}
      />
      <QuestionPreviewSheet question={preview} onOpenChange={(open) => !open && setPreview(null)} />
    </TooltipProvider>
  );
}
