"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Layers, RefreshCw, Search, Users } from "lucide-react";
import { toast } from "sonner";
import {
  listEvaluations,
  type ReadingEvaluation,
} from "@/lib/api/afirme-reading";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  getEvaluationKind,
  getEvaluationKindLabel,
} from "@/lib/afirme-reading/evaluation-contract";
import { AdminCityPicker } from "@/components/auth/admin-city-picker";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TYPE_BADGE_CLASS: Record<string, string> = {
  entrada: "border-blue-300 bg-blue-500/15 text-blue-700 dark:border-blue-700 dark:text-blue-300",
  formativa:
    "border-violet-300 bg-violet-500/15 text-violet-700 dark:border-violet-700 dark:text-violet-300",
  saida: "border-amber-300 bg-amber-500/15 text-amber-800 dark:border-amber-700 dark:text-amber-300",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

export function AvaliacoesAplicadasPage() {
  const router = useRouter();
  const [cityReady, setCityReady] = useState(false);
  const [cityKey, setCityKey] = useState("none");
  const [evaluations, setEvaluations] = useState<ReadingEvaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");

  const handleCityReadyChange = useCallback((ready: boolean, cityId: string | null) => {
    setCityReady(ready);
    setCityKey(cityId || "none");
    if (!ready) setEvaluations([]);
  }, []);

  const loadEvaluations = useCallback(async () => {
    if (!cityReady) return;
    setLoading(true);
    try {
      const items = await listEvaluations();
      setEvaluations(Array.isArray(items) ? items : []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível carregar as avaliações aplicadas."));
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
      const kind = getEvaluationKind(item);
      if (kindFilter !== "all" && kind !== kindFilter) return false;
      if (!term) return true;
      const haystack = `${item.title} ${item.description ?? ""} ${getEvaluationKindLabel(item)} ${item.createdBy?.name ?? ""}`.toLowerCase();
      return haystack.includes(term) || item.id.toLowerCase().includes(term);
    });
  }, [evaluations, search, kindFilter]);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        icon={Layers}
        title="Avaliações aplicadas"
        description="Consulte as provas de fluência já aplicadas no município e veja o que cada aluno errou em cada fase."
      />

      <AdminCityPicker onCityReadyChange={handleCityReadyChange} />

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
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="entrada">Avaliação de Entrada</SelectItem>
              <SelectItem value="formativa">Avaliação Formativa</SelectItem>
              <SelectItem value="saida">Avaliação de Saída</SelectItem>
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
                ? "Selecione o município para ver as avaliações aplicadas."
                : "Nenhuma avaliação encontrada neste município."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" role="list">
          {filtered.map((evaluation) => {
            const kind = getEvaluationKind(evaluation);
            return (
              <li key={evaluation.id}>
                <Card className="flex h-full flex-col overflow-hidden border-border/80 shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="space-y-3 pb-3">
                    <CardTitle className="line-clamp-2 text-base font-semibold leading-tight">
                      {evaluation.title}
                    </CardTitle>
                    {evaluation.description ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {evaluation.description}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn("text-xs", TYPE_BADGE_CLASS[kind ?? ""] ?? "")}
                      >
                        {getEvaluationKindLabel(evaluation)}
                      </Badge>
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
                    <div className="space-y-1 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                      <p>
                        <span className="font-medium text-foreground/80">Criador: </span>
                        {evaluation.createdBy?.name ?? "—"}
                      </p>
                      <p>
                        <span className="font-medium text-foreground/80">Criada em: </span>
                        {formatDate(evaluation.createdAt)}
                      </p>
                    </div>
                  </CardHeader>
                  <CardFooter className="mt-auto border-t bg-muted/20 pt-4">
                    <Button
                      type="button"
                      className="w-full gap-2"
                      onClick={() => router.push(`/app/avaliacoes/${evaluation.id}`)}
                    >
                      <Users className="h-4 w-4" />
                      Ver alunos aplicados
                      <Eye className="h-4 w-4 opacity-70" />
                    </Button>
                  </CardFooter>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
