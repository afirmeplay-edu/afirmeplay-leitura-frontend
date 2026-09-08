"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Eye,
  FileText,
  List,
  Loader2,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteEvaluation,
  getEvaluation,
  listEvaluations,
  type ReadingEvaluation,
  type ReadingEvaluationStatus,
} from "@/lib/api/afirme-reading";
import { listGrades } from "@/lib/api/grades";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  canDeleteEvaluation,
  canEditEvaluation,
  getEvaluationKind,
  getEvaluationKindLabel,
  getKnownWordListId,
  getCreatorId,
  isPrivilegedStaffRole,
} from "@/lib/afirme-reading/evaluation-contract";
import { useAuthStore } from "@/stores/auth-store";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageShell } from "@/components/shared/page-shell";
import { StatCard } from "@/components/shared/stat-card";
import { AdminCityPicker } from "@/components/auth/admin-city-picker";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const TAB_TRIGGER_CLASS =
  "group relative flex min-h-[2.75rem] flex-1 items-center justify-center gap-2 rounded-none border-0 px-3 py-2.5 text-center text-xs font-medium leading-snug shadow-none transition-colors duration-200 sm:min-h-12 sm:flex-1 sm:px-4 sm:text-sm " +
  "text-muted-foreground hover:bg-muted/70 hover:text-foreground " +
  "data-[state=active]:z-[1] data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-sm " +
  "data-[state=active]:after:absolute data-[state=active]:after:inset-x-3 data-[state=active]:after:bottom-0 data-[state=active]:after:h-[3px] data-[state=active]:after:rounded-t-sm data-[state=active]:after:bg-primary data-[state=active]:after:content-['']";

const STATUS_LABEL: Record<ReadingEvaluationStatus, string> = {
  rascunho: "Rascunho",
  agendada: "Agendada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const TYPE_BADGE_CLASS: Record<string, string> = {
  entrada: "border-blue-300 bg-blue-500/15 text-blue-700 dark:border-blue-700 dark:text-blue-300",
  formativa: "border-violet-300 bg-violet-500/15 text-violet-700 dark:border-violet-700 dark:text-violet-300",
  saida: "border-amber-300 bg-amber-500/15 text-amber-800 dark:border-amber-700 dark:text-amber-300",
};

function applyHref(evaluation: ReadingEvaluation) {
  const params = new URLSearchParams();
  params.set("evaluationId", evaluation.id);
  return `/app/avaliacao-fluencia?${params.toString()}`;
}

function applyAction(evaluation: ReadingEvaluation) {
  if (evaluation.status === "em_andamento") {
    return { label: "Continuar", disabled: false };
  }
  if (evaluation.status === "concluida" || evaluation.status === "cancelada") {
    return { label: STATUS_LABEL[evaluation.status], disabled: true };
  }
  return { label: "Aplicar", disabled: false };
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isSameMonth(value: string | null, now = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

export function ListarAvaliacaoPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [cityReady, setCityReady] = useState(false);
  const [cityKey, setCityKey] = useState("none");
  const [tab, setTab] = useState("mine");
  const [evaluations, setEvaluations] = useState<ReadingEvaluation[]>([]);
  const [grades, setGrades] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [listFilter, setListFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewing, setViewing] = useState<ReadingEvaluation | null>(null);
  const [loadingView, setLoadingView] = useState(false);
  const [deleting, setDeleting] = useState<ReadingEvaluation | null>(null);

  useEffect(() => {
    if (isPrivilegedStaffRole(user?.role)) {
      setTab("all");
    }
  }, [user?.role]);

  const handleCityReadyChange = useCallback((ready: boolean, cityId: string | null) => {
    setCityReady(ready);
    setCityKey(cityId || "none");
    if (!ready) {
      setEvaluations([]);
      setSelectedIds([]);
    }
  }, []);

  const loadEvaluations = useCallback(async () => {
    if (!cityReady) return;
    setLoading(true);
    try {
      const [items, gradeData] = await Promise.all([listEvaluations(), listGrades().catch(() => [])]);
      setEvaluations(Array.isArray(items) ? items : []);
      setGrades(Array.isArray(gradeData) ? gradeData : []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível carregar as avaliações."));
      setEvaluations([]);
    } finally {
      setLoading(false);
    }
  }, [cityReady]);

  useEffect(() => {
    if (!cityReady || cityKey === "none") return;
    void loadEvaluations();
  }, [cityReady, cityKey, loadEvaluations]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return evaluations.filter((item) => {
      if (tab === "mine" && user?.id) {
        const creatorId = getCreatorId(item);
        if (creatorId && creatorId !== user.id) return false;
      }
      if (term) {
        const haystack = `${item.title} ${item.description ?? ""} ${getEvaluationKindLabel(item)} ${item.createdBy?.name ?? ""}`.toLowerCase();
        if (!haystack.includes(term) && !item.id.toLowerCase().includes(term)) return false;
      }
      const kind = getEvaluationKind(item);
      if (typeFilter !== "all" && kind !== typeFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (listFilter === "conhecidas" && !getKnownWordListId(item)) return false;
      if (listFilter === "pouco-comuns" && !item.uncommonWordListId) return false;
      if (gradeFilter !== "all") {
        const ids = item.gradeIds?.length ? item.gradeIds : item.gradeId ? [item.gradeId] : [];
        if (!ids.includes(gradeFilter)) return false;
      }
      return true;
    });
  }, [evaluations, search, typeFilter, statusFilter, listFilter, gradeFilter, tab, user?.id]);

  const stats = useMemo(() => {
    const total = evaluations.length;
    const thisMonth = evaluations.filter((item) => isSameMonth(item.createdAt)).length;
    const completed = evaluations.filter((item) => item.status === "concluida").length;
    const pending = evaluations.filter(
      (item) => item.status === "rascunho" || item.status === "agendada" || item.status === "em_andamento"
    ).length;
    const withKnown = evaluations.filter((item) => Boolean(getKnownWordListId(item))).length;
    const withUncommon = evaluations.filter((item) => Boolean(item.uncommonWordListId)).length;
    return { total, thisMonth, completed, pending, withKnown, withUncommon };
  }, [evaluations]);

  function handleTabChange(value: string) {
    if (value === "create") {
      router.push("/app/avaliacao-fluencia/criar");
      return;
    }
    setTab(value);
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));
  }

  async function handleView(evaluation: ReadingEvaluation) {
    setViewing(evaluation);
    setLoadingView(true);
    try {
      const detail = await getEvaluation(evaluation.id);
      setViewing(detail);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível carregar a ficha da avaliação."));
    } finally {
      setLoadingView(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    await deleteEvaluation(deleting.id);
    toast.success("Avaliação excluída.");
    setViewing((current) => (current?.id === deleting.id ? null : current));
    setDeleting(null);
    await loadEvaluations();
  }

  return (
    <PageShell>
      <PageHeader
        icon={List}
        title="Listar Avaliação"
        description="Acompanhe as avaliações de fluência criadas. Clique em Aplicar para testar com um aluno."
      />

      <AdminCityPicker onCityReadyChange={handleCityReadyChange} />

      <section>
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
          <li>
            <StatCard
              variant="metric"
              label="Total de Avaliações"
              value={stats.total}
              icon={FileText}
              loading={loading}
              trend={`${stats.withKnown} palavras conhecidas • ${stats.withUncommon} pouco comuns`}
            />
          </li>
          <li>
            <StatCard
              variant="metric"
              label="Este mês"
              value={stats.thisMonth}
              icon={TrendingUp}
              loading={loading}
              trend="Avaliações criadas no período"
            />
          </li>
          <li>
            <StatCard
              variant="metric"
              label="Resultados"
              value={stats.completed}
              icon={BarChart3}
              loading={loading}
              trend={`${stats.pending} pendentes de aplicação`}
            />
          </li>
          <li>
            <StatCard
              variant="metric"
              label="Em andamento"
              value={evaluations.filter((item) => item.status === "em_andamento").length}
              icon={Users}
              loading={loading}
              trend="Avaliações em andamento no momento"
            />
          </li>
        </ul>
      </section>

      <Tabs value={tab} onValueChange={handleTabChange} className="w-full space-y-6">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm ring-1 ring-border/50">
          <TabsList className="flex h-auto w-full flex-col divide-y divide-border rounded-none bg-muted/40 p-0 text-muted-foreground sm:flex-row sm:flex-nowrap sm:justify-stretch sm:divide-x sm:divide-y-0">
            <TabsTrigger value="mine" className={TAB_TRIGGER_CLASS}>
              <FileText className="h-4 w-4 shrink-0 opacity-70" />
              Minhas Avaliações
            </TabsTrigger>
            {isPrivilegedStaffRole(user?.role) ? (
              <TabsTrigger value="all" className={TAB_TRIGGER_CLASS}>
                <FileText className="h-4 w-4 shrink-0 opacity-70" />
                Todas Avaliações
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="create" className={TAB_TRIGGER_CLASS}>
              <Plus className="h-4 w-4 shrink-0 opacity-70" />
              Criar Nova
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar avaliações..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
            disabled={!cityReady}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="entrada">Avaliação de Entrada</SelectItem>
              <SelectItem value="formativa">Avaliação Formativa</SelectItem>
              <SelectItem value="saida">Avaliação de Saída</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={listFilter} onValueChange={setListFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Lista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="conhecidas">Palavras conhecidas</SelectItem>
              <SelectItem value="pouco-comuns">Palavras pouco comuns</SelectItem>
            </SelectContent>
          </Select>
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Série" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {grades.map((grade) => (
                <SelectItem key={grade.id} value={grade.id}>
                  {grade.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void loadEvaluations()}
            disabled={!cityReady || loading}
            aria-label="Atualizar lista"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Avaliações</h2>
        <p className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "avaliação encontrada" : "avaliações encontradas"}
        </p>
      </div>

      {loading ? (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <li key={index}>
              <Card>
                <CardHeader className="space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardFooter>
                  <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">
              {!cityReady
                ? "Selecione o município para ver as avaliações."
                : "Nenhuma avaliação encontrada com os filtros atuais."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" role="list">
          {filtered.map((evaluation) => {
            const checked = selectedIds.includes(evaluation.id);
            const action = applyAction(evaluation);
            return (
              <li key={evaluation.id}>
                <Card
                  className={cn(
                    "flex h-full flex-col overflow-hidden border-border/80 shadow-sm transition-shadow hover:shadow-md",
                    checked && "ring-2 ring-primary/30"
                  )}
                >
                  <CardHeader className="space-y-3 pb-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => toggleSelected(evaluation.id, Boolean(value))}
                        aria-label={`Selecionar avaliação ${evaluation.title}`}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="line-clamp-2 text-base font-semibold leading-tight">
                          {evaluation.title}
                        </h3>
                        {evaluation.description ? (
                          <p className="line-clamp-2 text-xs text-muted-foreground">{evaluation.description}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          TYPE_BADGE_CLASS[getEvaluationKind(evaluation) ?? ""] ?? ""
                        )}
                      >
                        {getEvaluationKindLabel(evaluation)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {STATUS_LABEL[evaluation.status]}
                      </Badge>
                      {getKnownWordListId(evaluation) ? (
                        <Badge variant="outline" className="text-xs">
                          Palavras conhecidas
                        </Badge>
                      ) : null}
                      {evaluation.uncommonWordListId ? (
                        <Badge variant="outline" className="text-xs">
                          Palavras pouco comuns
                        </Badge>
                      ) : null}
                      {(evaluation.grades?.length
                        ? evaluation.grades
                        : evaluation.grade
                          ? [evaluation.grade]
                          : []
                      ).map((grade) => (
                        <Badge key={grade.id} variant="outline" className="text-xs">
                          {grade.name}
                        </Badge>
                      ))}
                    </div>

                    <div className="space-y-1.5 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground/80">Criador: </span>
                        {evaluation.createdBy?.name ?? "—"}
                      </div>
                      <div>
                        <span className="font-medium text-foreground/80">Criada em: </span>
                        {formatDate(evaluation.createdAt)}
                      </div>
                      <div>
                        <span className="font-medium text-foreground/80">Aplicada em: </span>
                        {formatDateTime(evaluation.applicationStart)}
                      </div>
                      <div>
                        <span className="font-medium text-foreground/80">Início: </span>
                        {formatDateTime(evaluation.applicationStart)}
                      </div>
                      <div>
                        <span className="font-medium text-foreground/80">Término: </span>
                        {formatDateTime(evaluation.applicationEnd)}
                      </div>
                    </div>
                  </CardHeader>

                  <CardFooter className="mt-auto border-t bg-muted/20 pt-4">
                    <div className="flex w-full items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={action.disabled}
                        className="min-h-9 min-w-0 flex-1 gap-1 whitespace-nowrap bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                        onClick={() => {
                          if (action.disabled) return;
                          router.push(applyHref(evaluation));
                        }}
                      >
                        <Play className="h-3.5 w-3.5" />
                        {action.label}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-9 w-9 shrink-0 px-0"
                        aria-label={`Visualizar avaliação ${evaluation.title}`}
                        title="Visualizar"
                        onClick={() => void handleView(evaluation)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEditEvaluation(evaluation, user?.id) ||
                      canDeleteEvaluation(evaluation, user?.id, user?.role) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 w-9 shrink-0 px-0"
                              aria-label={`Mais ações de ${evaluation.title}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {canEditEvaluation(evaluation, user?.id) ? (
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() =>
                                  router.push(`/app/avaliacao-fluencia/criar?id=${evaluation.id}`)
                                }
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                            ) : null}
                            {canDeleteEvaluation(evaluation, user?.id, user?.role) ? (
                              <DropdownMenuItem
                                className="cursor-pointer text-red-600 focus:text-red-700"
                                onSelect={(event) => {
                                  event.preventDefault();
                                  window.setTimeout(() => setDeleting(evaluation), 0);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 shrink-0 px-0"
                          aria-label={`Mais ações de ${evaluation.title}`}
                          disabled
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {loading && evaluations.length > 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Atualizando lista...
        </p>
      ) : null}

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewing?.title ?? "Avaliação"}</DialogTitle>
            <DialogDescription>
              {viewing ? getEvaluationKindLabel(viewing) : "Detalhes da avaliação selecionada."}
            </DialogDescription>
          </DialogHeader>
          {loadingView ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando ficha...
            </div>
          ) : viewing ? (
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-medium">Criador: </span>
                {viewing.createdBy?.name ?? "—"}
              </p>
              <p>
                <span className="font-medium">Status: </span>
                {STATUS_LABEL[viewing.status]}
              </p>
              <p>
                <span className="font-medium">Texto: </span>
                {viewing.readingText?.title ?? "—"}
              </p>
              <p>
                <span className="font-medium">Lista conhecidas: </span>
                {viewing.knownWordList?.name ?? (getKnownWordListId(viewing) ? "Selecionada" : "—")}
              </p>
              <p>
                <span className="font-medium">Lista pouco comuns: </span>
                {viewing.uncommonWordList?.name ?? (viewing.uncommonWordListId ? "Selecionada" : "—")}
              </p>
              {viewing.readingText?.questions?.length ? (
                <div>
                  <p className="font-medium">Perguntas</p>
                  <ul className="mt-1 space-y-1">
                    {viewing.readingText.questions.map((question, index) => (
                      <li key={question.id}>
                        {index + 1}. {question.statement}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {viewing.scope ? (
                <p>
                  <span className="font-medium">Escopo: </span>
                  {viewing.grade?.name || viewing.scope.grade?.name
                    ? `${viewing.grade?.name || viewing.scope.grade?.name} · `
                    : null}
                  {viewing.scope.schools.length
                    ? `${viewing.scope.schools.length} escola(s)`
                    : "sem escola"}
                  {" · "}
                  {viewing.scope.classes.length
                    ? `${viewing.scope.classes.map((item) => item.name).join(", ")}`
                    : "sem turma"}
                </p>
              ) : viewing.classIds?.length ? (
                <p>
                  <span className="font-medium">Turmas: </span>
                  {viewing.classIds.length}
                </p>
              ) : null}
              <div className="pt-2">
                <Button
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled={applyAction(viewing).disabled}
                  onClick={() => {
                    if (applyAction(viewing).disabled) return;
                    const evaluation = viewing;
                    setViewing(null);
                    router.push(applyHref(evaluation));
                  }}
                >
                  <Play className="h-3.5 w-3.5" />
                  {applyAction(viewing).label}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Excluir avaliação?"
        description={
          deleting
            ? `A avaliação "${deleting.title}" será removida. Esta ação não pode ser desfeita.`
            : undefined
        }
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={() => void handleDelete()}
      />
    </PageShell>
  );
}
