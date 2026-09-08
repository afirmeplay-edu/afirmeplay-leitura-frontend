"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Search, Users } from "lucide-react";
import { toast } from "sonner";
import {
  getEvaluation,
  getEvaluationApplicants,
  type EvaluationApplicantClass,
  type EvaluationApplicantStudent,
  type EvaluationApplicants,
  type ReadingEvaluation,
} from "@/lib/api/afirme-reading";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/api/errors";
import { getEvaluationKindLabel } from "@/lib/afirme-reading/evaluation-contract";
import { AdminCityPicker } from "@/components/auth/admin-city-picker";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/shared/page-shell";

function formatDateTime(value: string | null | undefined) {
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

function appliedStudentsOf(classInfo: EvaluationApplicantClass) {
  return classInfo.students.filter((student) => student.canView);
}

export function AvaliacaoAplicadaAlunosPage({ evaluationId }: { evaluationId: string }) {
  const router = useRouter();
  const [cityReady, setCityReady] = useState(false);
  const [cityKey, setCityKey] = useState("none");
  const [evaluation, setEvaluation] = useState<ReadingEvaluation | null>(null);
  const [applicants, setApplicants] = useState<EvaluationApplicants | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [notFound, setNotFound] = useState(false);

  const handleCityReadyChange = useCallback((ready: boolean, cityId: string | null) => {
    setCityReady(ready);
    setCityKey(cityId || "none");
    if (!ready) {
      setEvaluation(null);
      setApplicants(null);
    }
  }, []);

  const load = useCallback(async () => {
    if (!cityReady || !evaluationId) return;
    setLoading(true);
    setNotFound(false);
    try {
      const [detail, applicantData] = await Promise.all([
        getEvaluation(evaluationId),
        getEvaluationApplicants(evaluationId),
      ]);
      setEvaluation(detail);
      setApplicants(applicantData);
    } catch (error) {
      if (getApiErrorStatus(error) === 404) {
        setNotFound(true);
        setEvaluation(null);
        setApplicants(null);
        return;
      }
      toast.error(getApiErrorMessage(error, "Não foi possível carregar os alunos aplicados."));
    } finally {
      setLoading(false);
    }
  }, [cityReady, evaluationId]);

  useEffect(() => {
    if (!cityReady || cityKey === "none") return;
    void load();
  }, [cityReady, cityKey, load]);

  const classes = useMemo(() => {
    const term = search.trim().toLowerCase();
    const source = applicants?.classes ?? [];
    return source
      .map((classInfo) => ({
        ...classInfo,
        students: appliedStudentsOf(classInfo).filter((student) => {
          if (!term) return true;
          return student.name.toLowerCase().includes(term);
        }),
      }))
      .filter((classInfo) => classInfo.students.length > 0);
  }, [applicants, search]);

  const totalApplied = useMemo(
    () => (applicants?.classes ?? []).reduce((sum, classInfo) => sum + appliedStudentsOf(classInfo).length, 0),
    [applicants]
  );

  function openStudent(student: EvaluationApplicantStudent) {
    router.push(`/app/avaliacoes/${evaluationId}/aluno/${student.id}`);
  }

  return (
    <PageShell>
      <PageHeader
        icon={Users}
        title={evaluation?.title ?? "Alunos aplicados"}
        description={
          evaluation
            ? `${getEvaluationKindLabel(evaluation)} · provas finalizadas neste município.`
            : "Alunos com prova de fluência já aplicada."
        }
      >
        <Button variant="outline" asChild>
          <Link href="/app/avaliacoes">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </PageHeader>

      <AdminCityPicker onCityReadyChange={handleCityReadyChange} />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar aluno..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9"
          disabled={!cityReady}
        />
      </div>

      {loading ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ) : notFound ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Avaliação não encontrada neste município.
          </CardContent>
        </Card>
      ) : classes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {!cityReady
              ? "Selecione o município para ver os alunos."
              : totalApplied === 0
                ? "Nenhum aluno com prova finalizada nesta avaliação."
                : "Nenhum aluno encontrado com o filtro atual."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            {totalApplied} {totalApplied === 1 ? "prova aplicada" : "provas aplicadas"}
            {applicants?.grade?.name ? ` · ${applicants.grade.name}` : ""}
          </p>
          {classes.map((classInfo) => (
            <section key={classInfo.id} className="space-y-2">
              <h2 className="text-sm font-medium">
                {classInfo.name}
                {classInfo.schoolName ? ` · ${classInfo.schoolName}` : ""}
              </h2>
              <ul className="divide-y rounded-md border bg-card">
                {classInfo.students.map((student) => (
                  <li
                    key={student.id}
                    className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Finalizada em {formatDateTime(student.application?.submittedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Finalizada
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => openStudent(student)}>
                        <Eye className="h-4 w-4" />
                        Ver prova
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
