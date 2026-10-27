"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Plus, Search, SearchX } from "lucide-react";
import { listBankQuestions } from "@/lib/api/afirme-reading/questions";
import type { BankQuestion, BankQuestionPagination, BankQuestionType, Grade } from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import type { CatalogSubject } from "@/lib/api/question-catalog";
import { QUESTION_TYPE_LABEL, questionAnswerSummary, questionStatement, toPreviewModel } from "@/lib/ica/questions";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { OriginBadge } from "@/components/ica/questions/question-badges";
import {
  EMPTY_QUESTION_FILTERS,
  hasActiveQuestionFilters,
  QuestionFilters,
  type QuestionFilterValue,
} from "@/components/ica/questions/question-filters";
import { QuestionPreview } from "@/components/ica/questions/question-preview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const PER_PAGE = 10;

interface QuestionPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ex.: "Adicionar à posição 5" ou "Trocar a questão 3". */
  title: string;
  /** Tipo da posição: o seletor só lista questões desse tipo. */
  type: BankQuestionType;
  selectedIds: Set<string>;
  onPick: (question: BankQuestion) => void;
  subjects: CatalogSubject[];
  grades: Grade[];
  initialFilters?: Partial<QuestionFilterValue>;
}

export function QuestionPickerDialog({
  open,
  onOpenChange,
  title,
  type,
  selectedIds,
  onPick,
  subjects,
  grades,
  initialFilters,
}: QuestionPickerDialogProps) {
  const cityId = useAuthStore((state) => state.selectedCityId);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const [filters, setFilters] = useState<QuestionFilterValue>(EMPTY_QUESTION_FILTERS);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<BankQuestion[]>([]);
  const [pagination, setPagination] = useState<BankQuestionPagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const initialFiltersRef = useRef(initialFilters);
  initialFiltersRef.current = initialFilters;

  useEffect(() => {
    if (!open) return;
    setFilters((prev) =>
      hasActiveQuestionFilters(prev) ? prev : { ...EMPTY_QUESTION_FILTERS, ...initialFiltersRef.current }
    );
  }, [open]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, type]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    listBankQuestions(
      {
        page,
        per_page: PER_PAGE,
        type,
        q: debouncedSearch || undefined,
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
      .catch((err) => {
        if (controller.signal.aborted) return;
        setItems([]);
        setPagination(null);
        setError(normalizeApiError(err, "Não foi possível carregar as questões.").message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, page, debouncedSearch, filters, cityId, type]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(88vh,820px)] max-w-4xl flex-col gap-4 overflow-hidden p-0">
        <DialogHeader className="space-y-1 border-b px-6 pb-4 pt-6 pr-12 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Só questões de {QUESTION_TYPE_LABEL[type].toLowerCase()}. As já incluídas na avaliação ficam bloqueadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              className="pl-9"
              placeholder="Buscar no enunciado"
              aria-label="Buscar no enunciado"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              autoFocus
            />
          </div>
          <QuestionFilters
            value={filters}
            onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
            subjects={subjects}
            grades={grades}
            idPrefix="seletor"
          />
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6" aria-busy={loading}>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{error}</p>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <SearchX className="h-6 w-6" aria-hidden />
              Nenhuma questão encontrada com esses filtros.
            </div>
          ) : (
            <ul className="space-y-2 pb-2">
              {items.map((question) => {
                const already = selectedIds.has(question.id);
                const expanded = expandedId === question.id;
                const statement = questionStatement(question) || "(sem enunciado)";
                return (
                  <li
                    key={question.id}
                    className={cn(
                      "rounded-xl border p-3 transition-colors duration-200",
                      already ? "bg-muted/50" : "hover:border-brand-highlight/40"
                    )}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className={cn("text-sm", expanded ? "" : "line-clamp-2")}>{statement}</p>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <OriginBadge origin={question.origin} />
                          {question.subject?.name ? <span>{question.subject.name}</span> : null}
                          {question.grade?.name ? <span>· {question.grade.name}</span> : null}
                          {question.difficulty ? <span>· {question.difficulty}</span> : null}
                          {questionAnswerSummary(question) ? <span>· {questionAnswerSummary(question)}</span> : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-10"
                          aria-expanded={expanded}
                          onClick={() => setExpandedId(expanded ? null : question.id)}
                        >
                          <ChevronDown
                            className={cn("h-4 w-4 transition-transform duration-200", expanded && "rotate-180")}
                          />
                          {expanded ? "Ocultar" : "Pré-visualizar"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-10"
                          disabled={already}
                          onClick={() => onPick(question)}
                        >
                          {already ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          {already ? "Já na avaliação" : "Adicionar"}
                        </Button>
                      </div>
                    </div>
                    {expanded ? (
                      <div className="mt-3 border-t pt-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                        <QuestionPreview question={toPreviewModel(question)} />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <nav
          className="flex items-center justify-between gap-2 border-t px-6 py-3 text-sm"
          aria-label="Paginação do seletor"
        >
          <span className="text-muted-foreground">
            {pagination ? `${pagination.total} ${pagination.total === 1 ? "questão" : "questões"}` : "—"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10"
              disabled={loading || !pagination?.has_prev}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[4rem] text-center text-muted-foreground">
              {page} / {Math.max(pagination?.pages ?? 1, 1)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10"
              disabled={loading || !pagination?.has_next}
              onClick={() => setPage((current) => current + 1)}
              aria-label="Próxima página"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      </DialogContent>
    </Dialog>
  );
}
