"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  ClipboardCheck,
  FileDown,
  FilePlus2,
  Loader2,
  Lock,
  PenLine,
  Plus,
  Repeat2,
  RotateCcw,
  Save,
  ScanLine,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createWrittenTest,
  deleteWrittenTest,
  downloadWrittenTestPdf,
  getWrittenTest,
  publishWrittenTest,
  setWrittenTestQuestions,
  updateWrittenTest,
} from "@/lib/api/afirme-reading/written-tests";
import type { BankQuestion, BankQuestionType, WrittenTestDetail } from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import { listClassesBySchool, listSchools, type School, type SchoolClass } from "@/lib/api/students";
import { ROUTES } from "@/config/routes";
import { canWriteIca } from "@/lib/auth/roles";
import {
  SLOT_COUNTS,
  SLOT_LAYOUT,
  TOTAL_SLOTS,
  clearAssessmentDraft,
  countAllFilled,
  countFilled,
  draftFromDetail,
  emptyAssessmentDraft,
  hasMissingQuestions,
  imageDictationWithoutDescription,
  isDraftEmpty,
  metaFingerprint,
  questionsFingerprint,
  readAssessmentDraft,
  selectedQuestionIds,
  slotPosition,
  toQuestionRefs,
  toSlotItem,
  totalScore,
  writeAssessmentDraft,
  type AssessmentDraft,
  type SlotItem,
} from "@/lib/ica/assessment-draft";
import { ICA_BRAND } from "@/lib/ica/brand";
import { QUESTION_TYPE_LABEL, formatQuestionValue } from "@/lib/ica/questions";
import { canManageWrittenTest, formatDateTime, WRITTEN_TEST_STATUS_LABEL } from "@/lib/ica/written-tests";
import { classMatchesAnyGrade } from "@/lib/fluencia/class-label";
import { useFlipList } from "@/hooks/use-flip-list";
import { useQuestionCatalog } from "@/hooks/use-question-catalog";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { RoleGuard } from "@/components/auth/role-guard";
import { IcaCityScope } from "@/components/ica/ica-city-scope";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { OriginBadge } from "@/components/ica/questions/question-badges";
import { QuestionPickerDialog } from "@/components/ica/assessments/question-picker-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const SLOT_STYLE: Record<BankQuestionType, { badge: string; border: string }> = {
  multipleChoice: { badge: "bg-brand-highlight text-white", border: "border-brand-highlight/25" },
  dictation: { badge: "bg-amber-500 text-white", border: "border-amber-300" },
  text_production: { badge: "bg-rose-600 text-white", border: "border-rose-300" },
};

type PickerTarget = { type: BankQuestionType; index: number | null } | null;
type Busy = "save" | "publish" | "delete" | "pdf" | null;

function SlotNumber({ number, type }: { number: number; type: BankQuestionType }) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
        SLOT_STYLE[type].badge
      )}
      aria-hidden
    >
      {number}
    </span>
  );
}

/** O backend exige ao menos uma série, uma escola e uma turma (e turma das escolas/séries escolhidas). */
function scopeError(draft: AssessmentDraft) {
  if (!draft.title.trim()) return "Informe o título da avaliação.";
  if (draft.gradeIds.length === 0) return "Selecione ao menos uma série.";
  if (draft.schoolIds.length === 0) return "Selecione ao menos uma escola.";
  if (draft.classIds.length === 0) return "Selecione ao menos uma turma.";
  return null;
}

function AssessmentBuilder({ id }: { id?: string }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const cityId = useAuthStore((state) => state.selectedCityId);
  const { subjects, grades } = useQuestionCatalog();
  const isNew = !id;

  const [draft, setDraft] = useState<AssessmentDraft>(emptyAssessmentDraft);
  const [overflow, setOverflow] = useState<SlotItem[]>([]);
  const [detail, setDetail] = useState<WrittenTestDetail | null>(null);
  const [saved, setSaved] = useState<{ meta: string; questions: string } | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedCity, setLoadedCity] = useState<string | null | undefined>(undefined);
  const [schools, setSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [classesBySchool, setClassesBySchool] = useState<Record<string, SchoolClass[]>>({});
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [confirm, setConfirm] = useState<"reset" | "publish" | "delete" | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const highlightTimer = useRef<number | null>(null);

  const published = detail?.status === "publicada";
  const canManage = canManageWrittenTest(detail, user);
  const readOnly = published || !canManage;

  const applyDetail = useCallback((data: WrittenTestDetail) => {
    const { draft: next, overflow: extra } = draftFromDetail(data);
    setDetail(data);
    setDraft(next);
    setOverflow(extra);
    setSaved({ meta: metaFingerprint(next), questions: questionsFingerprint(next, extra) });
  }, []);

  // Avaliação existente: o servidor é a fonte.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getWrittenTest(id)
      .then((data) => !cancelled && applyDetail(data))
      .catch((error) => {
        if (cancelled) return;
        const normalized = normalizeApiError(error, "Não foi possível abrir a avaliação.");
        setLoadError(normalized.status === 404 ? "Avaliação não encontrada neste município." : normalized.message);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, applyDetail]);

  // Avaliação nova: rascunho local por município até o primeiro "Salvar".
  useEffect(() => {
    if (id) return;
    setDraft(readAssessmentDraft(cityId) ?? emptyAssessmentDraft());
    setOverflow([]);
    setLoadedCity(cityId);
  }, [id, cityId]);

  useEffect(() => {
    if (id || loadedCity !== cityId) return;
    const timer = window.setTimeout(() => {
      if (isDraftEmpty(draft)) clearAssessmentDraft(cityId);
      else writeAssessmentDraft(cityId, draft);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [id, cityId, draft, loadedCity]);

  useEffect(() => {
    let cancelled = false;
    setLoadingSchools(true);
    listSchools()
      .then((data) => !cancelled && setSchools([...data].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))))
      .catch((error) => {
        if (!cancelled) toast.error(normalizeApiError(error, "Não foi possível carregar as escolas.").message);
      })
      .finally(() => !cancelled && setLoadingSchools(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const schoolKey = draft.schoolIds.join("|");
  useEffect(() => {
    const missing = draft.schoolIds.filter((schoolId) => !(schoolId in classesBySchool));
    if (missing.length === 0) return;
    let cancelled = false;
    void Promise.all(
      missing.map(async (schoolId) => {
        try {
          return [schoolId, await listClassesBySchool(schoolId)] as const;
        } catch {
          return null;
        }
      })
    ).then((entries) => {
      if (cancelled) return;
      const loaded = entries.filter((entry): entry is readonly [string, SchoolClass[]] => entry != null);
      if (loaded.length) setClassesBySchool((current) => ({ ...current, ...Object.fromEntries(loaded) }));
    });
    return () => {
      cancelled = true;
    };
    // `classesBySchool` fora das deps: só busca escolas ainda não carregadas (escola com falha tenta de novo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolKey]);

  useEffect(
    () => () => {
      if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    },
    []
  );

  const metaChanged = saved != null && metaFingerprint(draft) !== saved.meta;
  const questionsChanged = saved != null && questionsFingerprint(draft, overflow) !== saved.questions;
  const dirty = !isNew && (metaChanged || questionsChanged);
  useUnsavedChangesWarning(dirty && !readOnly && busy !== "delete");

  const selectedGrades = useMemo(() => grades.filter((grade) => draft.gradeIds.includes(grade.id)), [grades, draft.gradeIds]);
  const visibleClasses = useMemo(
    () =>
      draft.schoolIds.flatMap((schoolId) =>
        (classesBySchool[schoolId] ?? [])
          // Turma já salva continua visível mesmo sem série reconhecível no cadastro.
          .filter((klass) => classMatchesAnyGrade(klass, selectedGrades) || draft.classIds.includes(klass.id))
          .map((klass) => ({ ...klass, schoolId }))
      ),
    [draft.schoolIds, draft.classIds, classesBySchool, selectedGrades]
  );

  const filled = countAllFilled(draft);
  const complete = filled === TOTAL_SLOTS;
  const missingQuestions = hasMissingQuestions(draft);
  const imageDescriptionMissing = imageDictationWithoutDescription(draft);
  const selectedIds = useMemo(() => {
    const ids = selectedQuestionIds(draft);
    overflow.forEach((item) => ids.add(item.questionId));
    return ids;
  }, [draft, overflow]);
  const score = totalScore(draft) + overflow.reduce((sum, item) => sum + item.value, 0);

  const mcKeys = draft.slots.multipleChoice.map((slot, index) => slot?.questionId ?? `vazio-${index}`);
  const registerFlip = useFlipList(mcKeys.join("|"));

  function touch(next: AssessmentDraft): AssessmentDraft {
    return { ...next, updatedAt: new Date().toISOString() };
  }

  function flash(key: string) {
    setHighlight(key);
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlight(null), 900);
  }

  function setSlot(type: BankQuestionType, index: number, item: SlotItem | null) {
    setDraft((prev) => {
      const group = [...prev.slots[type]];
      group[index] = item;
      return touch({ ...prev, slots: { ...prev.slots, [type]: group } });
    });
  }

  function toggleId(field: "gradeIds" | "schoolIds" | "classIds", value: string, checked: boolean) {
    setDraft((prev) => {
      const next = {
        ...prev,
        [field]: checked ? Array.from(new Set([...prev[field], value])) : prev[field].filter((item) => item !== value),
      };
      // Desmarcar série ou escola tira as turmas que saíram do escopo (o backend recusaria).
      if (!checked && field !== "classIds") {
        const remainingGrades = grades.filter((grade) => next.gradeIds.includes(grade.id));
        const allowed = new Set(
          next.schoolIds.flatMap((schoolId) =>
            (classesBySchool[schoolId] ?? [])
              .filter((klass) => classMatchesAnyGrade(klass, remainingGrades))
              .map((klass) => klass.id)
          )
        );
        // Turma de escola ainda não carregada não dá para julgar: fica.
        const known = new Set(Object.values(classesBySchool).flat().map((klass) => klass.id));
        const hasUnloaded = next.schoolIds.some((schoolId) => !(schoolId in classesBySchool));
        next.classIds = next.classIds.filter((classId) => allowed.has(classId) || (hasUnloaded && !known.has(classId)));
      }
      return touch(next);
    });
  }

  function handlePick(question: BankQuestion) {
    if (!picker) return;
    if (selectedIds.has(question.id)) {
      toast.error("Essa questão já está na avaliação.");
      return;
    }
    const item = toSlotItem(question);
    if (item.type !== picker.type) {
      toast.error(`Esta posição aceita só ${QUESTION_TYPE_LABEL[picker.type].toLowerCase()}.`);
      return;
    }
    const group = draft.slots[picker.type];
    const index = picker.index ?? group.findIndex((slot) => slot === null);
    if (index < 0) {
      toast.error(`As posições de ${QUESTION_TYPE_LABEL[picker.type].toLowerCase()} já estão preenchidas.`);
      return;
    }
    const replacing = picker.index != null && group[picker.index] != null;
    setSlot(picker.type, index, item);
    flash(question.id);
    toast.success(
      replacing
        ? `Questão ${slotPosition(picker.type, index)} trocada.`
        : `Questão adicionada na posição ${slotPosition(picker.type, index)}.`
    );
    const remaining = group.filter((slot, i) => slot === null && i !== index).length;
    if (picker.index != null || remaining === 0) setPicker(null);
  }

  function move(type: BankQuestionType, index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= SLOT_COUNTS[type]) return;
    setDraft((prev) => {
      const group = [...prev.slots[type]];
      [group[index], group[target]] = [group[target], group[index]];
      return touch({ ...prev, slots: { ...prev.slots, [type]: group } });
    });
    const moved = draft.slots[type][index];
    if (moved) flash(moved.questionId);
  }

  async function handleSave() {
    const error = scopeError(draft);
    if (error) {
      toast.error(error);
      return;
    }
    const meta = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      gradeIds: draft.gradeIds,
      schoolIds: draft.schoolIds,
      classIds: draft.classIds,
    };
    setBusy("save");
    try {
      if (isNew) {
        const created = await createWrittenTest({ ...meta, questions: toQuestionRefs(draft) });
        clearAssessmentDraft(cityId);
        toast.success("Avaliação salva como rascunho.");
        router.replace(ROUTES.ica.avaliacoes.detalhe(created.id));
        return;
      }
      let latest: WrittenTestDetail | null = null;
      if (metaChanged) {
        latest = await updateWrittenTest(id as string, meta);
        // Se o PUT das questões falhar a seguir, os dados já salvos não podem continuar marcados como pendentes.
        const savedMeta = metaFingerprint(draft);
        setDetail(latest);
        setSaved((current) => (current ? { ...current, meta: savedMeta } : current));
      }
      if (questionsChanged) latest = await setWrittenTestQuestions(id as string, toQuestionRefs(draft, overflow));
      if (latest) applyDetail(latest);
      toast.success(latest ? "Alterações salvas." : "Nada para salvar.");
    } catch (err) {
      toast.error(normalizeApiError(err, "Não foi possível salvar a avaliação.").message);
    } finally {
      setBusy(null);
    }
  }

  /** Erros sobem para o `ConfirmDialog`, que mostra a mensagem do backend sem fechar. */
  async function handlePublish() {
    if (!id) return;
    setBusy("publish");
    try {
      applyDetail(await publishWrittenTest(id));
      setConfirm(null);
      toast.success("Avaliação publicada. A prova em PDF já pode ser baixada.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!id) return;
    setBusy("delete");
    try {
      await deleteWrittenTest(id);
      setConfirm(null);
      toast.success("Avaliação excluída.");
      router.push(ROUTES.ica.avaliacoes.root);
    } catch (err) {
      setBusy(null);
      throw err;
    }
  }

  async function handlePdf() {
    if (!id) return;
    setBusy("pdf");
    try {
      await downloadWrittenTestPdf(id);
    } catch (err) {
      toast.error(normalizeApiError(err, "Não foi possível gerar a prova em PDF.").message);
    } finally {
      setBusy(null);
    }
  }

  function resetDraft() {
    clearAssessmentDraft(cityId);
    setDraft(emptyAssessmentDraft());
    setConfirm(null);
    toast.success("Rascunho descartado.");
  }

  if (loading) {
    return (
      <PageShell>
        <Skeleton className="h-16 w-full max-w-xl rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-[520px] rounded-2xl" />
          <Skeleton className="h-[260px] rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  if (loadError) {
    return (
      <PageShell>
        <PageHeader brand={ICA_BRAND} title="Avaliação" icon={ClipboardCheck}>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href={ROUTES.ica.avaliacoes.root}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </PageHeader>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">{loadError}</CardContent>
        </Card>
      </PageShell>
    );
  }

  const canPublish =
    !isNew && !readOnly && !dirty && complete && overflow.length === 0 && !missingQuestions && !imageDescriptionMissing;
  const publishHint = isNew
    ? "Salve a avaliação antes de publicar."
    : dirty
      ? "Salve as alterações antes de publicar."
      : missingQuestions
        ? "Troque as questões excluídas do banco."
        : overflow.length
          ? "Há questões fora da composição 16 + 3 + 1."
          : imageDescriptionMissing
            ? "Gere a descrição da figura antes de publicar."
            : !complete
              ? `Faltam ${TOTAL_SLOTS - filled} questões.`
              : null;
  const progress = Math.round((filled / TOTAL_SLOTS) * 100);

  return (
    <PageShell>
      <PageHeader
        brand={ICA_BRAND}
        eyebrow={detail ? WRITTEN_TEST_STATUS_LABEL[detail.status] : "Nova avaliação"}
        title={isNew ? "Nova avaliação" : draft.title || "Avaliação"}
        description={
          isNew
            ? "Monte a prova com 19 itens. Até o primeiro salvamento, a montagem fica como rascunho neste navegador."
            : published
              ? `Publicada${formatDateTime(detail?.publishedAt) ? ` em ${formatDateTime(detail?.publishedAt)}` : ""}.`
              : "Rascunho salvo no servidor. Publique quando as 19 questões estiverem prontas."
        }
        icon={ClipboardCheck}
      >
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href={ROUTES.ica.avaliacoes.root}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        {isNew ? (
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setConfirm("reset")}
            disabled={isDraftEmpty(draft) || busy !== null}
          >
            <RotateCcw className="h-4 w-4" />
            Descartar rascunho
          </Button>
        ) : null}
        {!isNew && !published && canManage ? (
          <Button
            variant="outline"
            className="w-full text-red-700 hover:bg-red-50 sm:w-auto"
            onClick={() => setConfirm("delete")}
            disabled={busy !== null}
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        ) : null}
        {!readOnly ? (
          <Button
            variant={isNew || dirty ? "default" : "outline"}
            className="w-full sm:w-auto"
            onClick={() => void handleSave()}
            disabled={busy !== null || (!isNew && !dirty)}
          >
            {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>
        ) : null}
        {!isNew && !readOnly ? (
          <Button
            className="w-full sm:w-auto"
            onClick={() => setConfirm("publish")}
            disabled={!canPublish || busy !== null}
            title={publishHint ?? undefined}
          >
            <Send className="h-4 w-4" />
            Publicar
          </Button>
        ) : null}
        {published ? (
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => void handlePdf()} disabled={busy !== null}>
            {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Baixar prova (PDF)
          </Button>
        ) : null}
        {published && id ? (
          <Button asChild className="w-full sm:w-auto">
            <Link href={ROUTES.ica.avaliacoes.aplicacao(id)}>
              <ScanLine className="h-4 w-4" />
              Aplicação e cartões
            </Link>
          </Button>
        ) : null}
      </PageHeader>

      {readOnly && detail ? (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>{published ? "Avaliação publicada" : "Somente leitura"}</AlertTitle>
          <AlertDescription>
            {published
              ? "Dados e questões não podem mais ser alterados. Use \"Aplicação e cartões\" para aplicar às turmas e gerar os cartões-resposta."
              : "Só quem criou, o administrador e a equipe técnica podem alterar esta avaliação."}
          </AlertDescription>
        </Alert>
      ) : null}

      {overflow.length ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Questões fora da composição</AlertTitle>
          <AlertDescription>
            {overflow.length} questão(ões) não cabem em 16 de múltipla escolha, 2 de ditado e 1 bilhete. Elas
            continuam salvas no fim da prova; remova-as para poder publicar.
            {!readOnly ? (
              <Button variant="link" className="h-auto px-1 py-0" onClick={() => setOverflow([])}>
                Remover as excedentes
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dados da avaliação</CardTitle>
              <CardDescription>Título e público: séries, escolas e turmas que vão fazer a prova.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="avaliacao-titulo">Título *</Label>
                  <Input
                    id="avaliacao-titulo"
                    value={draft.title}
                    maxLength={255}
                    onChange={(event) => setDraft((prev) => touch({ ...prev, title: event.target.value }))}
                    placeholder="Ex.: ICA 2º ano — 1º semestre"
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avaliacao-descricao">Descrição</Label>
                  <Textarea
                    id="avaliacao-descricao"
                    value={draft.description}
                    onChange={(event) => setDraft((prev) => touch({ ...prev, description: event.target.value }))}
                    placeholder="Opcional"
                    className="min-h-[70px]"
                    disabled={readOnly}
                  />
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Séries *</legend>
                {grades.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma série disponível no município.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-3">
                    {grades.map((grade) => (
                      <label key={grade.id} className="flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                        <Checkbox
                          checked={draft.gradeIds.includes(grade.id)}
                          onCheckedChange={(value) => toggleId("gradeIds", grade.id, value === true)}
                          disabled={readOnly}
                        />
                        {grade.name}
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Escolas *</legend>
                {loadingSchools ? (
                  <Skeleton className="h-10 w-full" />
                ) : schools.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma escola disponível para o seu perfil.</p>
                ) : (
                  <div className="custom-scrollbar grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
                    {schools.map((school) => (
                      <label key={school.id} className="flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                        <Checkbox
                          checked={draft.schoolIds.includes(school.id)}
                          onCheckedChange={(value) => toggleId("schoolIds", school.id, value === true)}
                          disabled={readOnly}
                        />
                        <span className="min-w-0 truncate">{school.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Turmas *</legend>
                {draft.schoolIds.length === 0 || draft.gradeIds.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Escolha as séries e as escolas para ver as turmas.</p>
                ) : visibleClasses.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma turma dessas séries nas escolas escolhidas.</p>
                ) : (
                  <div className="custom-scrollbar grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
                    {visibleClasses.map((klass) => (
                      <label key={klass.id} className="flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                        <Checkbox
                          checked={draft.classIds.includes(klass.id)}
                          onCheckedChange={(value) => toggleId("classIds", klass.id, value === true)}
                          disabled={readOnly}
                        />
                        <span className="min-w-0 truncate">
                          {klass.name}
                          <span className="text-muted-foreground">
                            {" "}
                            · {schools.find((school) => school.id === klass.schoolId)?.name ?? "Escola"}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
            </CardContent>
          </Card>

          {SLOT_LAYOUT.map(({ type, count }) => {
            const group = draft.slots[type];
            const first = slotPosition(type, 0);
            const last = slotPosition(type, count - 1);
            const groupFilled = countFilled(draft, type);
            return (
              <Card key={type}>
                <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {QUESTION_TYPE_LABEL[type]} · {count === 1 ? `posição ${first}` : `posições ${first} a ${last}`}
                    </CardTitle>
                    <CardDescription>
                      {groupFilled}/{count} preenchidas.
                      {type === "multipleChoice" ? " Reordene com as setas." : ""}
                    </CardDescription>
                  </div>
                  {!readOnly ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button variant="outline" asChild className="w-full sm:w-auto">
                        <Link href={`${ROUTES.ica.questoes.nova}?tipo=${type}`}>
                          <FilePlus2 className="h-4 w-4" />
                          Nova questão
                        </Link>
                      </Button>
                      <Button
                        onClick={() => setPicker({ type, index: null })}
                        disabled={groupFilled >= count}
                        className="w-full sm:w-auto"
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar
                      </Button>
                    </div>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <ol className="relative space-y-2" aria-label={`Questões de ${QUESTION_TYPE_LABEL[type].toLowerCase()}`}>
                    {group.map((slot, index) => {
                      const number = slotPosition(type, index);
                      const key = slot?.questionId ?? `vazio-${type}-${index}`;
                      const flipRef = type === "multipleChoice" ? registerFlip(mcKeys[index]) : undefined;
                      if (!slot) {
                        return (
                          <li key={key} ref={flipRef}>
                            <button
                              type="button"
                              onClick={() => setPicker({ type, index })}
                              disabled={readOnly}
                              className={cn(
                                "flex min-h-14 w-full items-center gap-3 rounded-xl border border-dashed p-3 text-left text-sm text-muted-foreground transition-colors duration-200",
                                "enabled:hover:border-brand-highlight/50 enabled:hover:bg-brand-highlight/5 disabled:cursor-not-allowed",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              )}
                              aria-label={`Posição ${number}: vazia. Escolher questão`}
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-brand-highlight/40 text-sm font-bold text-brand-highlight">
                                {number}
                              </span>
                              {readOnly ? "Vazia" : "Escolher questão"}
                            </button>
                          </li>
                        );
                      }
                      return (
                        <li
                          key={key}
                          ref={flipRef}
                          className={cn(
                            "rounded-xl border bg-background p-3 transition-shadow duration-300",
                            slot.missing ? "border-red-300 bg-red-50/60" : SLOT_STYLE[type].border,
                            highlight === slot.questionId && "shadow-[0_0_0_3px_rgb(var(--brand-highlight)/0.25)]"
                          )}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <SlotNumber number={number} type={type} />
                              <div className="min-w-0 flex-1 space-y-1">
                                <p className="line-clamp-2 text-sm font-medium" title={slot.text}>
                                  {slot.text}
                                </p>
                                {!slot.missing ? (
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                    <OriginBadge origin={slot.origin} />
                                    {slot.subjectName ? <span>{slot.subjectName}</span> : null}
                                    {slot.gradeName ? <span>· {slot.gradeName}</span> : null}
                                    {slot.difficulty ? <span>· {slot.difficulty}</span> : null}
                                    {slot.answer ? (
                                      <span
                                        className={
                                          slot.stimulus === "image" && !slot.imageDescription?.trim()
                                            ? "font-medium text-amber-800"
                                            : undefined
                                        }
                                      >
                                        · {slot.answer}
                                      </span>
                                    ) : null}
                                    <span>· {formatQuestionValue(slot.value)}</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            {!readOnly ? (
                              <div className="flex shrink-0 flex-wrap gap-1 self-end sm:self-start">
                                {type === "multipleChoice" || count > 1 ? (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-10 w-10"
                                      onClick={() => move(type, index, -1)}
                                      disabled={index === 0}
                                      aria-label={`Mover questão ${number} para cima`}
                                    >
                                      <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-10 w-10"
                                      onClick={() => move(type, index, 1)}
                                      disabled={index === count - 1}
                                      aria-label={`Mover questão ${number} para baixo`}
                                    >
                                      <ArrowDown className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : null}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10"
                                  onClick={() => setPicker({ type, index })}
                                  aria-label={`Trocar questão ${number}`}
                                  title="Trocar"
                                >
                                  <Repeat2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 text-red-700 hover:bg-red-50"
                                  onClick={() => setSlot(type, index, null)}
                                  aria-label={`Remover questão ${number}`}
                                  title="Remover"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="lg:sticky lg:top-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {complete ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
              ) : (
                <PenLine className="h-5 w-5 text-brand-highlight" aria-hidden />
              )}
              {published ? "Publicada" : complete ? "Pronta para publicar" : "Em montagem"}
            </CardTitle>
            <CardDescription aria-live="polite">
              {filled} de {TOTAL_SLOTS} itens · {formatQuestionValue(score)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} aria-label={`${filled} de ${TOTAL_SLOTS} itens preenchidos`} />
            <ul className="space-y-2 text-sm">
              {SLOT_LAYOUT.map(({ type, count }) => (
                <li key={type} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", SLOT_STYLE[type].badge)} aria-hidden />
                    {QUESTION_TYPE_LABEL[type]}
                  </span>
                  <span className="font-medium tabular-nums">
                    {countFilled(draft, type)}/{count}
                  </span>
                </li>
              ))}
            </ul>
            {detail ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={published ? "success" : "outline"}>{WRITTEN_TEST_STATUS_LABEL[detail.status]}</Badge>
                {detail.createdBy?.name ? <span>Criada por {detail.createdBy.name}</span> : null}
              </div>
            ) : null}
            {dirty && !readOnly ? (
              <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Há alterações não salvas.</p>
            ) : null}
            {!readOnly && publishHint && !isNew ? (
              <p className="text-xs text-muted-foreground">{publishHint}</p>
            ) : null}
            {isNew ? (
              <p className="text-xs text-muted-foreground">
                O rascunho fica neste navegador até você salvar. Para salvar, informe o título, as séries, as escolas e
                as turmas.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {picker ? (
        <QuestionPickerDialog
          open
          onOpenChange={(open) => !open && setPicker(null)}
          type={picker.type}
          title={
            picker.index != null
              ? draft.slots[picker.type][picker.index]
                ? `Trocar a questão ${slotPosition(picker.type, picker.index)}`
                : `Escolher a questão ${slotPosition(picker.type, picker.index)}`
              : `Adicionar ${QUESTION_TYPE_LABEL[picker.type].toLowerCase()}`
          }
          selectedIds={selectedIds}
          onPick={handlePick}
          subjects={subjects}
          grades={grades}
          initialFilters={{ gradeId: draft.gradeIds.length === 1 ? draft.gradeIds[0] : "" }}
        />
      ) : null}

      <ConfirmDialog
        open={confirm === "reset"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Descartar o rascunho?"
        description="As questões escolhidas e os dados da avaliação serão apagados deste navegador."
        confirmLabel="Descartar"
        variant="destructive"
        onConfirm={resetDraft}
      />
      <ConfirmDialog
        open={confirm === "publish"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Publicar a avaliação?"
        description="Depois de publicada, dados e questões não podem mais ser alterados. A prova em PDF e a aplicação às turmas ficam disponíveis."
        confirmLabel="Publicar"
        icon={Send}
        onConfirm={handlePublish}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Excluir a avaliação?"
        description="O rascunho será removido do servidor. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="destructive"
        icon={Trash2}
        onConfirm={handleDelete}
      />
    </PageShell>
  );
}

export function AssessmentBuilderPage({ id }: { id?: string }) {
  if (id) {
    return (
      <IcaCityScope emptyMessage="Selecione o município para abrir a avaliação.">
        <AssessmentBuilder id={id} />
      </IcaCityScope>
    );
  }
  return (
    <RoleGuard allow={canWriteIca} fallbackHref={ROUTES.ica.avaliacoes.root}>
      <IcaCityScope emptyMessage="Selecione o município para montar a avaliação.">
        <AssessmentBuilder />
      </IcaCityScope>
    </RoleGuard>
  );
}
