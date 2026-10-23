"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  ClipboardCheck,
  Lock,
  PenLine,
  Plus,
  Repeat2,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { BankQuestion } from "@/lib/api/afirme-reading/types";
import { ROUTES } from "@/config/routes";
import { canWriteIca } from "@/lib/auth/roles";
import {
  CLOSED_SLOTS,
  OPEN_SLOTS,
  PRODUCTION_SLOTS,
  TOTAL_SLOTS,
  clearAssessmentDraft,
  countFilledClosed,
  emptyAssessmentDraft,
  isDraftEmpty,
  readAssessmentDraft,
  toSlotItem,
  writeAssessmentDraft,
  type AssessmentDraft,
  type ClosedSlotItem,
} from "@/lib/ica/assessment-draft";
import { ICA_BRAND } from "@/lib/ica/brand";
import { formatQuestionValue } from "@/lib/ica/questions";
import { useFlipList } from "@/hooks/use-flip-list";
import { useQuestionCatalog } from "@/hooks/use-question-catalog";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { RoleGuard } from "@/components/auth/role-guard";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { OriginBadge } from "@/components/ica/questions/question-badges";
import { QuestionPickerDialog } from "@/components/ica/assessments/question-picker-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const NONE = "__none__";
const SAVE_HINT = "Salvamento disponível quando a API de avaliações estiver pronta";

const SLOT_STYLE = {
  closed: {
    badge: "bg-brand-highlight text-white",
    border: "border-brand-highlight/25",
    label: "Múltipla escolha",
  },
  open: {
    badge: "bg-amber-500 text-white",
    border: "border-amber-300",
    label: "Aberta",
  },
  production: {
    badge: "bg-rose-600 text-white",
    border: "border-rose-300",
    label: "Produção textual",
  },
} as const;

type PickerTarget = { mode: "add" } | { mode: "replace"; index: number } | null;

function formatTime(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function SlotNumber({ number, kind }: { number: number; kind: keyof typeof SLOT_STYLE }) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
        SLOT_STYLE[kind].badge
      )}
      aria-hidden
    >
      {number}
    </span>
  );
}

function LockedSlot({ number, kind, message }: { number: number; kind: "open" | "production"; message: string }) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl border border-dashed bg-muted/30 p-3 text-sm",
        SLOT_STYLE[kind].border
      )}
      aria-label={`Posição ${number}: ${SLOT_STYLE[kind].label} — ${message}`}
    >
      <SlotNumber number={number} kind={kind} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{SLOT_STYLE[kind].label}</p>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
      <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </li>
  );
}

function AssessmentBuilder() {
  const cityId = useAuthStore((state) => state.selectedCityId);
  const { subjects, grades } = useQuestionCatalog();
  const [draft, setDraft] = useState<AssessmentDraft>(emptyAssessmentDraft);
  const [loadedCity, setLoadedCity] = useState<string | null | undefined>(undefined);
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const highlightTimer = useRef<number | null>(null);

  useEffect(() => {
    setDraft(readAssessmentDraft(cityId) ?? emptyAssessmentDraft());
    setLoadedCity(cityId);
  }, [cityId]);

  useEffect(() => {
    if (loadedCity !== cityId) return;
    const timer = window.setTimeout(() => {
      if (isDraftEmpty(draft)) clearAssessmentDraft(cityId);
      else writeAssessmentDraft(cityId, draft);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [cityId, draft, loadedCity]);

  useEffect(
    () => () => {
      if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    },
    []
  );

  const filled = countFilledClosed(draft);
  const openFilled: number = 0;
  const productionFilled: number = 0;
  const closedComplete = filled === CLOSED_SLOTS;
  const ready = closedComplete && openFilled === OPEN_SLOTS && productionFilled === PRODUCTION_SLOTS;
  const progress = Math.round(((filled + openFilled + productionFilled) / TOTAL_SLOTS) * 100);
  const selectedIds = useMemo(
    () => new Set(draft.closed.filter((slot): slot is ClosedSlotItem => slot !== null).map((slot) => slot.questionId)),
    [draft.closed]
  );
  const totalValue = draft.closed.reduce((sum, slot) => sum + (slot?.value ?? 0), 0);

  const slotKeys = draft.closed.map((slot, index) => slot?.questionId ?? `vazio-${index}`);
  const registerFlip = useFlipList(slotKeys.join("|"));

  function touch(next: AssessmentDraft): AssessmentDraft {
    return { ...next, updatedAt: new Date().toISOString() };
  }

  function flash(key: string) {
    setHighlight(key);
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlight(null), 900);
  }

  function setSlot(index: number, item: ClosedSlotItem | null) {
    setDraft((prev) => {
      const closed = [...prev.closed];
      closed[index] = item;
      return touch({ ...prev, closed });
    });
  }

  function handlePick(question: BankQuestion) {
    if (!picker) return;
    if (selectedIds.has(question.id)) {
      toast.error("Essa questão já está na avaliação.");
      return;
    }
    const item = toSlotItem(question);
    if (picker.mode === "replace") {
      setSlot(picker.index, item);
      toast.success(`Questão ${picker.index + 1} trocada.`);
    } else {
      const index = draft.closed.findIndex((slot) => slot === null);
      if (index < 0) {
        toast.error("As 16 posições de múltipla escolha já estão preenchidas.");
        return;
      }
      setSlot(index, item);
      toast.success(`Questão adicionada na posição ${index + 1}.`);
      const remaining = draft.closed.filter((slot) => slot === null).length - 1;
      if (remaining > 0) {
        flash(question.id);
        return;
      }
    }
    flash(question.id);
    setPicker(null);
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= CLOSED_SLOTS) return;
    setDraft((prev) => {
      const closed = [...prev.closed];
      [closed[index], closed[target]] = [closed[target], closed[index]];
      return touch({ ...prev, closed });
    });
    const moved = draft.closed[index];
    if (moved) flash(moved.questionId);
  }

  function resetDraft() {
    clearAssessmentDraft(cityId);
    setDraft(emptyAssessmentDraft());
    setConfirmReset(false);
    toast.success("Rascunho descartado.");
  }

  const savedAt = formatTime(draft.updatedAt);
  const firstEmpty = draft.closed.findIndex((slot) => slot === null);

  return (
    <TooltipProvider delayDuration={200}>
      <PageShell>
        <PageHeader
          brand={ICA_BRAND}
          title="Nova avaliação"
          description="Monte a prova com 20 itens. A montagem fica salva como rascunho neste navegador."
          icon={ClipboardCheck}
        >
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href={ROUTES.ica.avaliacoes.root}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setConfirmReset(true)}
            disabled={isDraftEmpty(draft)}
          >
            <RotateCcw className="h-4 w-4" />
            Descartar rascunho
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="inline-flex w-full sm:w-auto" aria-label={SAVE_HINT}>
                <Button className="w-full sm:w-auto" disabled>
                  <Save className="h-4 w-4" />
                  Salvar
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{SAVE_HINT}</TooltipContent>
          </Tooltip>
        </PageHeader>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Dados da avaliação</CardTitle>
                <CardDescription>Campos provisórios até a API de avaliações existir.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-3">
                  <Label htmlFor="avaliacao-nome">Nome</Label>
                  <Input
                    id="avaliacao-nome"
                    value={draft.name}
                    onChange={(event) => setDraft((prev) => touch({ ...prev, name: event.target.value }))}
                    placeholder="Ex.: ICA 2º ano — 1º semestre"
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="avaliacao-serie">Série</Label>
                  <Select
                    value={draft.gradeId || NONE}
                    onValueChange={(value) => setDraft((prev) => touch({ ...prev, gradeId: value === NONE ? "" : value }))}
                  >
                    <SelectTrigger id="avaliacao-serie">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Não informar</SelectItem>
                      {grades.map((grade) => (
                        <SelectItem key={grade.id} value={grade.id}>
                          {grade.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="avaliacao-disciplina">Disciplina</Label>
                  <Select
                    value={draft.subjectId || NONE}
                    onValueChange={(value) =>
                      setDraft((prev) => touch({ ...prev, subjectId: value === NONE ? "" : value }))
                    }
                  >
                    <SelectTrigger id="avaliacao-disciplina">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Não informar</SelectItem>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-base">Múltipla escolha · posições 1 a {CLOSED_SLOTS}</CardTitle>
                  <CardDescription>Do banco de questões. Reordene com as setas.</CardDescription>
                </div>
                <Button onClick={() => setPicker({ mode: "add" })} disabled={firstEmpty < 0} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  Adicionar questão
                </Button>
              </CardHeader>
              <CardContent>
                <ol className="relative space-y-2" aria-label="Questões de múltipla escolha">
                  {draft.closed.map((slot, index) => {
                    const number = index + 1;
                    const key = slotKeys[index];
                    if (!slot) {
                      return (
                        <li key={key} ref={registerFlip(key)}>
                          <button
                            type="button"
                            onClick={() => setPicker({ mode: "replace", index })}
                            className={cn(
                              "flex min-h-14 w-full items-center gap-3 rounded-xl border border-dashed p-3 text-left text-sm text-muted-foreground transition-colors duration-200",
                              "hover:border-brand-highlight/50 hover:bg-brand-highlight/5",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            )}
                            aria-label={`Posição ${number}: vazia. Escolher questão`}
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-brand-highlight/40 text-sm font-bold text-brand-highlight">
                              {number}
                            </span>
                            Escolher questão
                          </button>
                        </li>
                      );
                    }
                    return (
                      <li
                        key={key}
                        ref={registerFlip(key)}
                        className={cn(
                          "rounded-xl border bg-background p-3 transition-shadow duration-300",
                          SLOT_STYLE.closed.border,
                          highlight === slot.questionId && "shadow-[0_0_0_3px_rgb(var(--brand-highlight)/0.25)]"
                        )}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <SlotNumber number={number} kind="closed" />
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="line-clamp-2 text-sm font-medium" title={slot.text}>
                                {slot.text}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                <OriginBadge origin={slot.origin} />
                                {slot.subjectName ? <span>{slot.subjectName}</span> : null}
                                {slot.gradeName ? <span>· {slot.gradeName}</span> : null}
                                {slot.difficulty ? <span>· {slot.difficulty}</span> : null}
                                {slot.correctLetter ? <span>· Gabarito {slot.correctLetter}</span> : null}
                                <span>· {formatQuestionValue(slot.value)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-1 self-end sm:self-start">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10"
                              onClick={() => move(index, -1)}
                              disabled={index === 0}
                              aria-label={`Mover questão ${number} para cima`}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10"
                              onClick={() => move(index, 1)}
                              disabled={index === CLOSED_SLOTS - 1}
                              aria-label={`Mover questão ${number} para baixo`}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10"
                              onClick={() => setPicker({ mode: "replace", index })}
                              aria-label={`Trocar questão ${number}`}
                              title="Trocar"
                            >
                              <Repeat2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 text-red-700 hover:bg-red-50"
                              onClick={() => setSlot(index, null)}
                              aria-label={`Remover questão ${number}`}
                              title="Remover"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Abertas e produção textual · posições 17 a 20</CardTitle>
                <CardDescription>O banco do Afirme Ler ainda só tem múltipla escolha.</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2" aria-label="Questões abertas e produção textual">
                  {Array.from({ length: OPEN_SLOTS }, (_, index) => (
                    <LockedSlot
                      key={`aberta-${index}`}
                      number={CLOSED_SLOTS + index + 1}
                      kind="open"
                      message="Aguardando suporte a questões abertas"
                    />
                  ))}
                  {Array.from({ length: PRODUCTION_SLOTS }, (_, index) => (
                    <LockedSlot
                      key={`producao-${index}`}
                      number={CLOSED_SLOTS + OPEN_SLOTS + index + 1}
                      kind="production"
                      message="Aguardando suporte a produção textual"
                    />
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          <Card className="lg:sticky lg:top-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {ready || closedComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
                ) : (
                  <PenLine className="h-5 w-5 text-brand-highlight" aria-hidden />
                )}
                {ready ? "Avaliação pronta" : closedComplete ? "Múltipla escolha completa" : "Em montagem"}
              </CardTitle>
              <CardDescription aria-live="polite">
                {filled}/{CLOSED_SLOTS} fechadas · {openFilled}/{OPEN_SLOTS} abertas · {productionFilled}/{PRODUCTION_SLOTS}{" "}
                produção
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Progress value={progress} aria-label={`${filled} de ${TOTAL_SLOTS} itens preenchidos`} />
                <p className="text-xs text-muted-foreground">
                  {filled} de {TOTAL_SLOTS} itens · {formatQuestionValue(totalValue)} nas fechadas
                </p>
              </div>
              <ul className="space-y-2 text-sm">
                {(
                  [
                    ["closed", `${filled}/${CLOSED_SLOTS}`],
                    ["open", `${openFilled}/${OPEN_SLOTS}`],
                    ["production", `${productionFilled}/${PRODUCTION_SLOTS}`],
                  ] as const
                ).map(([kind, count]) => (
                  <li key={kind} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full", SLOT_STYLE[kind].badge)} aria-hidden />
                      {SLOT_STYLE[kind].label}
                    </span>
                    <span className="font-medium tabular-nums">{count}</span>
                  </li>
                ))}
              </ul>
              {closedComplete && !ready ? (
                <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                  Faltam as 3 abertas e a produção textual, que dependem de suporte no banco de questões.
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {savedAt ? `Rascunho salvo neste navegador às ${savedAt}.` : "O rascunho é salvo automaticamente neste navegador."}
              </p>
            </CardContent>
          </Card>
        </div>
      </PageShell>

      <QuestionPickerDialog
        open={picker !== null}
        onOpenChange={(open) => !open && setPicker(null)}
        title={
          picker?.mode === "replace"
            ? draft.closed[picker.index]
              ? `Trocar a questão ${picker.index + 1}`
              : `Escolher a questão ${picker.index + 1}`
            : "Adicionar questões"
        }
        selectedIds={selectedIds}
        onPick={handlePick}
        subjects={subjects}
        grades={grades}
        initialFilters={{ subjectId: draft.subjectId, gradeId: draft.gradeId }}
      />

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Descartar o rascunho?"
        description="As questões escolhidas e os dados da avaliação serão apagados deste navegador."
        confirmLabel="Descartar"
        variant="destructive"
        onConfirm={resetDraft}
      />
    </TooltipProvider>
  );
}

export function AssessmentBuilderPage() {
  return (
    <RoleGuard allow={canWriteIca} fallbackHref={ROUTES.ica.avaliacoes.root}>
      <AssessmentBuilder />
    </RoleGuard>
  );
}
