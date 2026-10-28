"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Download,
  FileDown,
  Loader2,
  RefreshCw,
  ScanLine,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  applyWrittenTest,
  createAnswerSheets,
  downloadAnswerSheets,
  downloadWrittenTestPdf,
  getWrittenTest,
  listAnswerSheets,
  listWrittenTestClasses,
  listWrittenTestClassStudents,
  removeWrittenTestClass,
} from "@/lib/api/afirme-reading/written-tests";
import type {
  AnswerSheetRun,
  WrittenTestClassApplication,
  WrittenTestClassStudents,
  WrittenTestDetail,
} from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import { ROUTES } from "@/config/routes";
import {
  ANSWER_SHEET_STATUS_LABEL,
  BRAZIL_TIMEZONES,
  CLASS_STATUS_BADGE,
  CLASS_STATUS_LABEL,
  DEFAULT_TIMEZONE,
  defaultStartInput,
  formatLocalDateTime,
  formatUtcDateTime,
  isAnswerSheetRunning,
  toLocalIso,
} from "@/lib/ica/application";
import { ICA_BRAND } from "@/lib/ica/brand";
import { canCorrectAnswerSheets } from "@/lib/auth/roles";
import { canManageWrittenTest } from "@/lib/ica/written-tests";
import { useAuthStore } from "@/stores/auth-store";
import { AnswerSheetCorrection } from "@/components/ica/application/answer-sheet-correction";
import { AnswerSheetSavedResults } from "@/components/ica/application/answer-sheet-saved-results";
import { IcaCityScope } from "@/components/ica/ica-city-scope";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageShell } from "@/components/shared/page-shell";
import { SectionCard } from "@/components/shared/section-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const POLL_MS = 4000;
const ALL_CLASSES = "__todas__";

/** Só dá para (re)agendar turma não aplicada ou ainda agendada; depois do início o backend recusa. */
function canSchedule(item: WrittenTestClassApplication) {
  return !item.applied || item.status === "agendada";
}

function classLabel(item: Pick<WrittenTestClassApplication, "className" | "classId">) {
  return item.className || "Turma";
}

export function TestApplicationPage({ id }: { id: string }) {
  return (
    <IcaCityScope emptyMessage="Selecione o município para abrir a aplicação.">
      <TestApplication id={id} />
    </IcaCityScope>
  );
}

function TestApplication({ id }: { id: string }) {
  const user = useAuthStore((state) => state.user);
  const [detail, setDetail] = useState<WrittenTestDetail | null>(null);
  const [classes, setClasses] = useState<WrittenTestClassApplication[]>([]);
  const [runs, setRuns] = useState<AnswerSheetRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [selected, setSelected] = useState<string[]>([]);
  const [start, setStart] = useState(() => defaultStartInput(24));
  const [end, setEnd] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [applying, setApplying] = useState(false);

  const [sheetClass, setSheetClass] = useState<string>(ALL_CLASSES);
  const [generating, setGenerating] = useState(false);
  const [downloadingRun, setDownloadingRun] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [studentsOf, setStudentsOf] = useState<WrittenTestClassApplication | null>(null);
  const [students, setStudents] = useState<WrittenTestClassStudents | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [removing, setRemoving] = useState<WrittenTestClassApplication | null>(null);
  const [resultsToken, setResultsToken] = useState(0);

  const previousStatus = useRef<Map<string, AnswerSheetRun["status"]>>(new Map());

  const canManage = canManageWrittenTest(detail, user);
  const canCorrect = canCorrectAnswerSheets(user?.role);
  const published = detail?.status === "publicada";

  const reloadClasses = useCallback(async () => {
    const data = await listWrittenTestClasses(id);
    setClasses(data.classes ?? []);
    return data.classes ?? [];
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const [test, classData, runList] = await Promise.all([
          getWrittenTest(id),
          listWrittenTestClasses(id),
          listAnswerSheets(id).catch(() => [] as AnswerSheetRun[]),
        ]);
        if (cancelled) return;
        setDetail(test);
        setClasses(classData.classes ?? []);
        setRuns(runList);
        previousStatus.current = new Map(runList.map((run) => [run.id, run.status]));
        if (classData.classes?.[0]?.timezone) setTimezone(classData.classes[0].timezone);
      } catch (error) {
        if (cancelled) return;
        const normalized = normalizeApiError(error, "Não foi possível carregar a aplicação.");
        setLoadError(normalized.status === 404 ? "Avaliação não encontrada neste município." : normalized.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const running = runs.some((run) => isAnswerSheetRunning(run.status));
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(async () => {
      try {
        const next = await listAnswerSheets(id);
        for (const run of next) {
          const before = previousStatus.current.get(run.id);
          if (before && isAnswerSheetRunning(before) && !isAnswerSheetRunning(run.status)) {
            if (run.status === "concluido") toast.success("Cartões-resposta prontos para baixar.");
            else toast.error(run.errorMessage || "A geração dos cartões falhou.");
          }
        }
        previousStatus.current = new Map(next.map((run) => [run.id, run.status]));
        setRuns(next);
      } catch {
        setRuns((current) => [...current]);
      }
    }, POLL_MS);
    return () => window.clearTimeout(timer);
  }, [id, running, runs]);

  useEffect(() => {
    if (!studentsOf) {
      setStudents(null);
      return;
    }
    let cancelled = false;
    setLoadingStudents(true);
    listWrittenTestClassStudents(id, studentsOf.classId)
      .then((data) => !cancelled && setStudents(data))
      .catch((error) => {
        if (!cancelled) toast.error(normalizeApiError(error, "Não foi possível carregar os alunos.").message);
      })
      .finally(() => !cancelled && setLoadingStudents(false));
    return () => {
      cancelled = true;
    };
  }, [id, studentsOf]);

  const schedulable = useMemo(() => classes.filter(canSchedule), [classes]);
  const appliedClasses = useMemo(() => classes.filter((item) => item.applied), [classes]);
  const latestCompletedRun = useMemo(() => {
    return runs.reduce<AnswerSheetRun | null>((latest, run) => {
      if (run.status !== "concluido") return latest;
      if (!latest) return run;
      const latestAt = latest.finishedAt ?? latest.createdAt ?? "";
      const runAt = run.finishedAt ?? run.createdAt ?? "";
      return runAt > latestAt ? run : latest;
    }, null);
  }, [runs]);
  const allSelected = schedulable.length > 0 && schedulable.every((item) => selected.includes(item.classId));

  function toggle(classId: string, checked: boolean) {
    setSelected((current) => (checked ? Array.from(new Set([...current, classId])) : current.filter((item) => item !== classId)));
  }

  async function handleApply() {
    if (!selected.length) {
      toast.error("Selecione ao menos uma turma.");
      return;
    }
    if (!start) {
      toast.error("Informe a data e a hora de início.");
      return;
    }
    if (end && end <= start) {
      toast.error("O fim deve ser depois do início.");
      return;
    }
    setApplying(true);
    try {
      await applyWrittenTest(id, {
        classIds: selected,
        applicationStart: toLocalIso(start),
        applicationEnd: end ? toLocalIso(end) : null,
        timezone,
      });
      toast.success(selected.length === 1 ? "Aplicação agendada para a turma." : `Aplicação agendada para ${selected.length} turmas.`);
      setSelected([]);
      await reloadClasses();
    } catch (error) {
      toast.error(normalizeApiError(error, "Não foi possível aplicar a avaliação.").message);
    } finally {
      setApplying(false);
    }
  }

  async function handleRemove() {
    if (!removing) return;
    await removeWrittenTestClass(id, removing.classId);
    toast.success(`Aplicação retirada de ${classLabel(removing)}.`);
    setRemoving(null);
    await reloadClasses();
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const run = await createAnswerSheets(id, sheetClass === ALL_CLASSES ? null : sheetClass);
      previousStatus.current.set(run.id, run.status);
      setRuns((current) => [run, ...current.filter((item) => item.id !== run.id)]);
      toast.success("Geração dos cartões iniciada. A lista atualiza sozinha.");
    } catch (error) {
      const normalized = normalizeApiError(error, "Não foi possível gerar os cartões-resposta.");
      toast.error(normalized.message);
      if (normalized.status === 409) setRuns(await listAnswerSheets(id).catch(() => runs));
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownloadRun(run: AnswerSheetRun) {
    setDownloadingRun(run.id);
    try {
      await downloadAnswerSheets(id, run.id);
    } catch (error) {
      toast.error(normalizeApiError(error, "Não foi possível baixar os cartões.").message);
    } finally {
      setDownloadingRun(null);
    }
  }

  async function handlePdf() {
    setDownloadingPdf(true);
    try {
      await downloadWrittenTestPdf(id);
    } catch (error) {
      toast.error(normalizeApiError(error, "Não foi possível gerar a prova em PDF.").message);
    } finally {
      setDownloadingPdf(false);
    }
  }

  const backButton = (
    <Button variant="outline" asChild className="w-full sm:w-auto">
      <Link href={ROUTES.ica.avaliacoes.detalhe(id)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Avaliação
      </Link>
    </Button>
  );

  if (loading) {
    return (
      <PageShell>
        <Skeleton className="h-16 w-full max-w-xl rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </PageShell>
    );
  }

  if (loadError || !detail) {
    return (
      <PageShell>
        <PageHeader brand={ICA_BRAND} title="Aplicação" icon={ScanLine}>
          {backButton}
        </PageHeader>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">{loadError ?? "Avaliação não encontrada."}</p>
            <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        brand={ICA_BRAND}
        eyebrow="Aplicação e correção"
        title={detail.title}
        description={`${detail.appliedClassesCount} de ${detail.classIds.length} turmas com aplicação.`}
        icon={ScanLine}
      >
        {backButton}
        {published ? (
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => void handlePdf()} disabled={downloadingPdf}>
            {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Baixar prova (PDF)
          </Button>
        ) : null}
      </PageHeader>

      {!published ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Avaliação ainda não publicada</AlertTitle>
          <AlertDescription>
            Só avaliação publicada pode ser aplicada às turmas e gerar cartões-resposta.{" "}
            <Link href={ROUTES.ica.avaliacoes.detalhe(id)} className="font-medium underline">
              Abrir a avaliação
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      <SectionCard
        title="Turmas"
        description="Turmas do público da avaliação. Agende o início (e o fim, se quiser) no fuso do município."
        icon={Users}
      >
        {classes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">A avaliação não tem turmas no público.</p>
        ) : (
          <div className="space-y-5">
            <div className="-mx-1 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canManage && published ? (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allSelected}
                          disabled={schedulable.length === 0}
                          onCheckedChange={(value) =>
                            setSelected(value === true ? schedulable.map((item) => item.classId) : [])
                          }
                          aria-label="Selecionar todas as turmas que podem ser agendadas"
                        />
                      </TableHead>
                    ) : null}
                    <TableHead>Turma</TableHead>
                    <TableHead>Escola</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead className="text-right">Alunos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((item) => (
                    <TableRow key={item.classId}>
                      {canManage && published ? (
                        <TableCell>
                          <Checkbox
                            checked={selected.includes(item.classId)}
                            disabled={!canSchedule(item)}
                            onCheckedChange={(value) => toggle(item.classId, value === true)}
                            aria-label={`Selecionar ${classLabel(item)}`}
                          />
                        </TableCell>
                      ) : null}
                      <TableCell className="font-medium">
                        {classLabel(item)}
                        {item.grade?.name ? <span className="block text-xs text-muted-foreground">{item.grade.name}</span> : null}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate">{item.school?.name ?? "—"}</TableCell>
                      <TableCell>
                        {item.status ? (
                          <Badge variant={CLASS_STATUS_BADGE[item.status]}>{CLASS_STATUS_LABEL[item.status]}</Badge>
                        ) : (
                          <Badge variant="outline">Não aplicada</Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatLocalDateTime(item.applicationStart) ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatLocalDateTime(item.applicationEnd) ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.studentCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {item.applied ? (
                            <Button variant="ghost" size="sm" className="h-9" onClick={() => setStudentsOf(item)}>
                              <Users className="h-4 w-4" />
                              Alunos
                            </Button>
                          ) : null}
                          {canManage && item.applied && item.status === "agendada" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 text-red-700 hover:bg-red-50"
                              onClick={() => setRemoving(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Retirar
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {canManage && published ? (
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <CalendarClock className="h-4 w-4 text-brand-highlight" aria-hidden />
                  Agendar a aplicação
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="aplicacao-inicio">Início *</Label>
                    <Input id="aplicacao-inicio" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aplicacao-fim">Fim</Label>
                    <Input id="aplicacao-fim" type="datetime-local" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aplicacao-fuso">Fuso horário</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger id="aplicacao-fuso">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BRAZIL_TIMEZONES.some((item) => item.value === timezone) ? null : (
                          <SelectItem value={timezone}>{timezone}</SelectItem>
                        )}
                        {BRAZIL_TIMEZONES.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    {selected.length
                      ? `${selected.length} turma(s) selecionada(s). Turmas já agendadas recebem as novas datas.`
                      : "Marque as turmas na tabela. Turma cuja aplicação já começou não pode ser alterada."}
                  </p>
                  <Button onClick={() => void handleApply()} disabled={applying || selected.length === 0} className="w-full sm:w-auto">
                    {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                    Aplicar
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Cartões-resposta"
        description="Um PDF por aluno com QR Code, gerado em segundo plano para as turmas com aplicação."
        icon={Download}
      >
        <div className="space-y-5">
          {published ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full space-y-2 sm:max-w-xs">
                <Label htmlFor="cartoes-turma">Turmas</Label>
                <Select value={sheetClass} onValueChange={setSheetClass} disabled={appliedClasses.length === 0}>
                  <SelectTrigger id="cartoes-turma">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_CLASSES}>Todas as turmas com aplicação</SelectItem>
                    {appliedClasses.map((item) => (
                      <SelectItem key={item.classId} value={item.classId}>
                        {classLabel(item)}
                        {item.school?.name ? ` · ${item.school.name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => void handleGenerate()}
                disabled={generating || appliedClasses.length === 0}
                className="w-full sm:w-auto"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                Gerar cartões
              </Button>
            </div>
          ) : null}
          {published && appliedClasses.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aplique a avaliação a ao menos uma turma para gerar os cartões.</p>
          ) : null}

          {runs.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma geração de cartões ainda.</p>
          ) : (
            <ul className="space-y-2">
              {runs.map((run) => {
                const pct = run.totalStudents ? Math.round((run.generatedCount / run.totalStudents) * 100) : 0;
                return (
                  <li key={run.id} className="rounded-xl border p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          {run.allClasses ? "Todas as turmas" : run.className || "Turma"}
                          <Badge
                            variant={
                              run.status === "concluido" ? "success" : run.status === "erro" ? "destructive" : "info"
                            }
                          >
                            {ANSWER_SHEET_STATUS_LABEL[run.status]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {run.generatedCount}/{run.totalStudents} cartões
                          {formatUtcDateTime(run.createdAt) ? ` · pedida em ${formatUtcDateTime(run.createdAt)}` : ""}
                          {formatUtcDateTime(run.finishedAt) ? ` · concluída em ${formatUtcDateTime(run.finishedAt)}` : ""}
                        </p>
                        {run.status === "erro" && run.errorMessage ? (
                          <p className="text-xs text-red-700">{run.errorMessage}</p>
                        ) : null}
                      </div>
                      {run.zipAvailable ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 w-full sm:w-auto"
                          onClick={() => void handleDownloadRun(run)}
                          disabled={downloadingRun === run.id}
                        >
                          {downloadingRun === run.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                          Baixar ZIP
                        </Button>
                      ) : null}
                    </div>
                    {isAnswerSheetRunning(run.status) ? (
                      <Progress value={pct} className="mt-3" aria-label={`${pct}% dos cartões gerados`} />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SectionCard>

      {published && canCorrect ? (
        <div id="correcao" className="scroll-mt-24">
          <AnswerSheetCorrection
            writtenTestId={id}
            hasGeneratedCards={latestCompletedRun != null}
            mapReady={latestCompletedRun?.hasAnswerSheetMap === true}
            onCorrected={() => setResultsToken((token) => token + 1)}
          />
        </div>
      ) : null}

      {published ? <AnswerSheetSavedResults writtenTestId={id} reloadToken={resultsToken} /> : null}

      <Sheet open={studentsOf != null} onOpenChange={(open) => !open && setStudentsOf(null)}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="space-y-1 border-b p-6 pr-12 text-left">
            <SheetTitle>{studentsOf ? classLabel(studentsOf) : "Alunos"}</SheetTitle>
            <SheetDescription>
              {studentsOf?.school?.name ?? ""}
              {students ? ` · ${students.students.length} aluno(s)` : ""}
            </SheetDescription>
          </SheetHeader>
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-6">
            {loadingStudents ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : students && students.students.length ? (
              <ol className="space-y-1.5 text-sm">
                {students.students.map((student, index) => (
                  <li key={student.id} className="flex items-start gap-3 rounded-lg border px-3 py-2">
                    <span className="w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      {student.name}
                      {student.registration || student.subturma ? (
                        <span className="block text-xs text-muted-foreground">
                          {student.registration ? `Matrícula ${student.registration}` : ""}
                          {student.registration && student.subturma ? " · " : ""}
                          {student.subturma?.name ?? ""}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum aluno nesta turma.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={removing != null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Retirar a aplicação?"
        description={removing ? `${classLabel(removing)} deixa de ter a avaliação agendada.` : undefined}
        confirmLabel="Retirar"
        variant="destructive"
        icon={Trash2}
        onConfirm={handleRemove}
      />
    </PageShell>
  );
}
