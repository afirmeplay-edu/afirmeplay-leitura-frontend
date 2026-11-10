"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileDown,
  FileInput,
  FilePlus2,
  Loader2,
  Lock,
  Plus,
  Repeat2,
  RotateCcw,
  Save,
  ScanLine,
  Search,
  Send,
  Trash2,
  X,
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
import { extractImageSources } from "@/lib/ica/question-html";
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
import { DifficultyBadge } from "@/components/shared/status-badge";
import { DictationMarksEditor } from "@/components/ica/questions/dictation-marks-editor";
import { QuestionPreview } from "@/components/ica/questions/question-preview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

type WizardStep = 1 | 2;
type PickerTarget = { type: BankQuestionType; index: number | null } | null;
type Busy = "save" | "publish" | "delete" | "pdf-student" | "pdf-applicator" | null;

type ConfigCheckpoint = {
  id: "basic" | "grades" | "schools" | "classes";
  label: string;
  done: boolean;
};

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
  if (draft.title.trim().length < 3) return "Informe um título com pelo menos 3 caracteres.";
  if (draft.gradeIds.length === 0) return "Selecione ao menos uma série.";
  if (draft.schoolIds.length === 0) return "Selecione ao menos uma escola.";
  if (draft.classIds.length === 0) return "Selecione ao menos uma turma.";
  return null;
}

function configCheckpoints(draft: AssessmentDraft): ConfigCheckpoint[] {
  return [
    { id: "basic", label: "Básico", done: draft.title.trim().length >= 3 },
    { id: "grades", label: "Séries", done: draft.gradeIds.length > 0 },
    { id: "schools", label: "Escolas", done: draft.schoolIds.length > 0 },
    { id: "classes", label: "Turmas", done: draft.classIds.length > 0 },
  ];
}

function ConfigProgressCard({ checkpoints }: { checkpoints: ConfigCheckpoint[] }) {
  const doneCount = checkpoints.filter((item) => item.done).length;
  return (
    <div className="rounded-2xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 p-4 text-white shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {checkpoints.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                item.done ? "bg-emerald-400 text-emerald-950" : "bg-white/25 text-white"
              )}
              title={item.label}
              aria-label={`${item.label}: ${item.done ? "concluído" : "pendente"}`}
            >
              {item.done ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
            </div>
          ))}
        </div>
        <p className="text-sm font-medium text-white/95">
          {doneCount} de {checkpoints.length} concluídas
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/80">
        {checkpoints.map((item) => (
          <span key={item.id} className={item.done ? "text-emerald-100" : undefined}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function AssessmentBuilder({ id }: { id?: string }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const cityId = useAuthStore((state) => state.selectedCityId);
  const { subjects, grades } = useQuestionCatalog();
  const isNew = !id;

  const [step, setStep] = useState<WizardStep>(1);
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
  const [schoolQuery, setSchoolQuery] = useState("");
  const [classQuery, setClassQuery] = useState("");
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [previewSlot, setPreviewSlot] = useState<SlotItem | null>(null);
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

  useEffect(() => {
    if (id) return;
    setDraft(readAssessmentDraft(cityId) ?? emptyAssessmentDraft());
    setOverflow([]);
    setLoadedCity(cityId);
    setStep(1);
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
          .filter((klass) => classMatchesAnyGrade(klass, selectedGrades) || draft.classIds.includes(klass.id))
          .map((klass) => ({ ...klass, schoolId }))
      ),
    [draft.schoolIds, draft.classIds, classesBySchool, selectedGrades]
  );

  const filteredSchools = useMemo(() => {
    const query = schoolQuery.trim().toLowerCase();
    if (!query) return schools;
    return schools.filter((school) => school.name.toLowerCase().includes(query));
  }, [schools, schoolQuery]);

  const filteredClasses = useMemo(() => {
    const query = classQuery.trim().toLowerCase();
    if (!query) return visibleClasses;
    return visibleClasses.filter((klass) => {
      const schoolName = schools.find((school) => school.id === klass.schoolId)?.name ?? "";
      return klass.name.toLowerCase().includes(query) || schoolName.toLowerCase().includes(query);
    });
  }, [visibleClasses, classQuery, schools]);

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
  const checkpoints = useMemo(() => configCheckpoints(draft), [draft]);
  const selectedSchools = useMemo(
    () => schools.filter((school) => draft.schoolIds.includes(school.id)),
    [schools, draft.schoolIds]
  );

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

  function setSlotDictation(type: BankQuestionType, index: number, dictationMarksOverride: SlotItem["dictationMarksOverride"]) {
    setDraft((prev) => {
      const group = [...prev.slots[type]];
      const item = group[index];
      if (item) {
        group[index] = {
          ...item,
          dictationMarksOverride,
        };
      }
      return touch({ ...prev, slots: { ...prev.slots, [type]: group } });
    });
  }

  function toggleId(field: "gradeIds" | "schoolIds" | "classIds", value: string, checked: boolean) {
    setDraft((prev) => {
      const next = {
        ...prev,
        [field]: checked ? Array.from(new Set([...prev[field], value])) : prev[field].filter((item) => item !== value),
      };
      if (!checked && field !== "classIds") {
        const remainingGrades = grades.filter((grade) => next.gradeIds.includes(grade.id));
        const allowed = new Set(
          next.schoolIds.flatMap((schoolId) =>
            (classesBySchool[schoolId] ?? [])
              .filter((klass) => classMatchesAnyGrade(klass, remainingGrades))
              .map((klass) => klass.id)
          )
        );
        const known = new Set(Object.values(classesBySchool).flat().map((klass) => klass.id));
        const hasUnloaded = next.schoolIds.some((schoolId) => !(schoolId in classesBySchool));
        next.classIds = next.classIds.filter((classId) => allowed.has(classId) || (hasUnloaded && !known.has(classId)));
      }
      return touch(next);
    });
  }

  function setIds(field: "schoolIds" | "classIds", ids: string[]) {
    setDraft((prev) => {
      const next = { ...prev, [field]: Array.from(new Set(ids)) };
      if (field === "schoolIds") {
        const remainingGrades = grades.filter((grade) => next.gradeIds.includes(grade.id));
        const allowed = new Set(
          next.schoolIds.flatMap((schoolId) =>
            (classesBySchool[schoolId] ?? [])
              .filter((klass) => classMatchesAnyGrade(klass, remainingGrades))
              .map((klass) => klass.id)
          )
        );
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
      setStep(1);
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
        const savedMeta = metaFingerprint(draft);
        setDetail(latest);
        setSaved((current) => (current ? { ...current, meta: savedMeta } : current));
      }
      if (questionsChanged) latest = await setWrittenTestQuestions(id as string, toQuestionRefs(draft, overflow));
      if (!metaChanged && !questionsChanged) {
        toast.success("Avaliação salva.");
        return;
      }
      if (latest) applyDetail(latest);
      toast.success("Avaliação salva.");
    } catch (err) {
      const normalized = normalizeApiError(err, "Não foi possível salvar a avaliação.");
      const message = /plano insuficiente|não tem acesso/i.test(normalized.message)
        ? "Este município não tem o Afirme Educacional (leitura) liberado."
        : /identificar o município|contexto de município/i.test(normalized.message)
          ? "Selecione o município antes de salvar a avaliação."
          : /erro interno|não foi possível concluir no servidor/i.test(normalized.message)
            ? "Não foi possível salvar a avaliação no servidor. Tente de novo; se continuar, avise o suporte."
            : normalized.message;
      toast.error(message);
    } finally {
      setBusy(null);
    }
  }

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

  async function handlePdf(mode: "student" | "applicator") {
    if (!id) return;
    setBusy(mode === "student" ? "pdf-student" : "pdf-applicator");
    try {
      await downloadWrittenTestPdf(id, mode);
    } catch (err) {
      toast.error(normalizeApiError(err, "Não foi possível gerar a prova em PDF.").message);
    } finally {
      setBusy(null);
    }
  }

  function resetDraft() {
    clearAssessmentDraft(cityId);
    setDraft(emptyAssessmentDraft());
    setStep(1);
    setConfirm(null);
    toast.success("Rascunho descartado.");
  }

  function goNext() {
    const error = scopeError(draft);
    if (error) {
      toast.error(error);
      return;
    }
    setStep(2);
  }

  function handleCancel() {
    if (isNew && !isDraftEmpty(draft)) {
      if (!window.confirm("Há dados no rascunho. Deseja sair mesmo assim?")) return;
    } else if (dirty) {
      if (!window.confirm("Há alterações não salvas. Deseja sair mesmo assim?")) return;
    }
    router.push(ROUTES.ica.avaliacoes.root);
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
  const allFilteredSchoolsSelected =
    filteredSchools.length > 0 && filteredSchools.every((school) => draft.schoolIds.includes(school.id));
  const allFilteredClassesSelected =
    filteredClasses.length > 0 && filteredClasses.every((klass) => draft.classIds.includes(klass.id));
  const classesReady = draft.schoolIds.length > 0 && draft.gradeIds.length > 0;

  return (
    <div className="flex min-h-full flex-col">
      <PageShell className="flex-1 pb-4">
        <PageHeader
          brand={ICA_BRAND}
          eyebrow={detail ? WRITTEN_TEST_STATUS_LABEL[detail.status] : "Nova avaliação"}
          title={
            step === 1
              ? isNew
                ? "Configurar avaliação"
                : "Dados da avaliação"
              : "Questões da Avaliação"
          }
          description={
            step === 1
              ? isNew
                ? "Passo 1 de 2 · Defina título, séries, escolas e turmas."
                : published
                  ? `Publicada${formatDateTime(detail?.publishedAt) ? ` em ${formatDateTime(detail?.publishedAt)}` : ""}.`
                  : "Passo 1 de 2 · Título e público da prova."
              : `${filled} de ${TOTAL_SLOTS} questões selecionadas · ${formatQuestionValue(score)}`
          }
          icon={ClipboardCheck}
        >
          {!isNew ? (
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href={ROUTES.ica.avaliacoes.root}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Lista
              </Link>
            </Button>
          ) : null}
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
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => void handlePdf("student")} disabled={busy !== null}>
              {busy === "pdf-student" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              Prova do aluno
            </Button>
          ) : null}
          {published ? (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => void handlePdf("applicator")}
              disabled={busy !== null}
            >
              {busy === "pdf-applicator" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              Prova do aplicador
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

        {published ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Prova do aplicador</AlertTitle>
            <AlertDescription>
              Use &quot;Prova do aluno&quot; para o caderno limpo e &quot;Prova do aplicador&quot; para o PDF com as
              marcações de leitura em voz alta.
            </AlertDescription>
          </Alert>
        ) : null}

        {readOnly && detail ? (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>{published ? "Avaliação publicada" : "Não editável"}</AlertTitle>
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

        {step === 1 ? (
          <div className="space-y-6">
            <ConfigProgressCard checkpoints={checkpoints} />

            <Card>
              <CardContent className="space-y-6 pt-6">
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
                    rows={3}
                    className="min-h-[84px]"
                    disabled={readOnly}
                  />
                </div>

                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium">Séries *</legend>
                  {grades.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma série disponível no município.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {grades.map((grade) => {
                        const selected = draft.gradeIds.includes(grade.id);
                        return (
                          <button
                            key={grade.id}
                            type="button"
                            disabled={readOnly}
                            onClick={() => toggleId("gradeIds", grade.id, !selected)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-sm transition-colors",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              selected
                                ? "border-brand-highlight bg-brand-highlight/10 font-medium text-brand-highlight ring-2 ring-brand-highlight/30"
                                : "bg-muted/40 text-muted-foreground hover:bg-muted",
                              readOnly && "cursor-not-allowed opacity-70"
                            )}
                          >
                            {grade.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </fieldset>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>Escolas *</Label>
                    {!readOnly && filteredSchools.length > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (allFilteredSchoolsSelected) {
                            const remove = new Set(filteredSchools.map((school) => school.id));
                            setIds(
                              "schoolIds",
                              draft.schoolIds.filter((idValue) => !remove.has(idValue))
                            );
                          } else {
                            setIds("schoolIds", [
                              ...draft.schoolIds,
                              ...filteredSchools.map((school) => school.id),
                            ]);
                          }
                        }}
                      >
                        {allFilteredSchoolsSelected ? "Limpar seleção" : "Selecionar todas"}
                      </Button>
                    ) : null}
                  </div>

                  {loadingSchools ? (
                    <Skeleton className="h-40 w-full" />
                  ) : schools.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma escola disponível para o seu perfil.</p>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={schoolQuery}
                          onChange={(event) => setSchoolQuery(event.target.value)}
                          placeholder="Buscar escola"
                          className="pl-9"
                          disabled={readOnly}
                        />
                      </div>
                      <div className="custom-scrollbar max-h-56 space-y-1 overflow-y-auto rounded-xl border p-2">
                        {filteredSchools.length === 0 ? (
                          <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nenhuma escola encontrada.</p>
                        ) : (
                          filteredSchools.map((school) => {
                            const checked = draft.schoolIds.includes(school.id);
                            return (
                              <label
                                key={school.id}
                                className={cn(
                                  "flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                  checked ? "bg-brand-highlight/5" : "hover:bg-muted/50"
                                )}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(value) => toggleId("schoolIds", school.id, value === true)}
                                  disabled={readOnly}
                                />
                                <span className="min-w-0 truncate">{school.name}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                      {selectedSchools.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedSchools.map((school) => (
                            <Badge key={school.id} variant="secondary" className="gap-1 pr-1">
                              <span className="max-w-[220px] truncate">{school.name}</span>
                              {!readOnly ? (
                                <button
                                  type="button"
                                  className="rounded-full p-0.5 hover:bg-muted"
                                  onClick={() => toggleId("schoolIds", school.id, false)}
                                  aria-label={`Remover ${school.name}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              ) : null}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Label>Turmas *</Label>
                      {draft.classIds.length > 0 ? (
                        <Badge variant="outline">{draft.classIds.length} selecionada(s)</Badge>
                      ) : null}
                    </div>
                    {!readOnly && classesReady && filteredClasses.length > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (allFilteredClassesSelected) {
                            const remove = new Set(filteredClasses.map((klass) => klass.id));
                            setIds(
                              "classIds",
                              draft.classIds.filter((idValue) => !remove.has(idValue))
                            );
                          } else {
                            setIds("classIds", [...draft.classIds, ...filteredClasses.map((klass) => klass.id)]);
                          }
                        }}
                      >
                        {allFilteredClassesSelected ? "Limpar seleção" : "Selecionar todas"}
                      </Button>
                    ) : null}
                  </div>

                  {!classesReady ? (
                    <p className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                      {!draft.gradeIds.length && !draft.schoolIds.length
                        ? "Selecione série e escola para ver as turmas."
                        : !draft.gradeIds.length
                          ? "Selecione ao menos uma série para ver as turmas."
                          : "Selecione ao menos uma escola para ver as turmas."}
                    </p>
                  ) : visibleClasses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma turma dessas séries nas escolas escolhidas.</p>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={classQuery}
                          onChange={(event) => setClassQuery(event.target.value)}
                          placeholder="Buscar turma ou escola"
                          className="pl-9"
                          disabled={readOnly}
                        />
                      </div>
                      <div className="custom-scrollbar grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">
                        {filteredClasses.length === 0 ? (
                          <p className="col-span-full px-2 py-6 text-center text-sm text-muted-foreground">
                            Nenhuma turma encontrada.
                          </p>
                        ) : (
                          filteredClasses.map((klass) => {
                            const checked = draft.classIds.includes(klass.id);
                            const schoolName =
                              schools.find((school) => school.id === klass.schoolId)?.name ?? "Escola";
                            return (
                              <button
                                key={klass.id}
                                type="button"
                                disabled={readOnly}
                                onClick={() => toggleId("classIds", klass.id, !checked)}
                                className={cn(
                                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                  checked
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-border bg-background hover:bg-muted/40",
                                  readOnly && "cursor-not-allowed opacity-70"
                                )}
                              >
                                <span
                                  className={cn(
                                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                                    checked ? "border-blue-600 bg-blue-600 text-white" : "border-muted-foreground/40"
                                  )}
                                  aria-hidden
                                >
                                  {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-semibold leading-tight">{klass.name}</span>
                                  <span className="mt-0.5 block text-xs text-muted-foreground">{schoolName}</span>
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div className="min-w-0 space-y-6">
              <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Monte a prova com 19 itens</p>
                  <p className="text-sm text-muted-foreground">
                    Use o banco para preencher cada posição. Nova questão e importação do Word continuam disponíveis.
                  </p>
                </div>
                {!readOnly ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {isNew ? (
                      <Button variant="outline" asChild className="w-full sm:w-auto">
                        <Link href={ROUTES.ica.questoes.importar}>
                          <FileInput className="h-4 w-4" />
                          Importar do Word
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {SLOT_LAYOUT.map(({ type, count }) => {
                const group = draft.slots[type];
                const first = slotPosition(type, 0);
                const last = slotPosition(type, count - 1);
                const groupFilled = countFilled(draft, type);
                return (
                  <Card key={type}>
                    <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <BookOpen className="h-4 w-4 text-brand-highlight" />
                          {QUESTION_TYPE_LABEL[type]}
                          <Badge variant="outline">
                            {groupFilled}/{count}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {count === 1 ? `Posição ${first}` : `Posições ${first} a ${last}`}
                          {type === "multipleChoice" ? " · Reordene com as setas." : ""}
                        </CardDescription>
                      </div>
                      {!readOnly ? (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button variant="outline" asChild className="w-full sm:w-auto">
                            <Link href={`${ROUTES.ica.questoes.nova}?tipo=${type}`}>
                              <FilePlus2 className="h-4 w-4" />
                              Nova Questão
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setPicker({ type, index: null })}
                            disabled={groupFilled >= count}
                            className="w-full sm:w-auto"
                          >
                            <Plus className="h-4 w-4" />
                            Banco de Questões
                          </Button>
                        </div>
                      ) : null}
                    </CardHeader>
                    <CardContent>
                      {groupFilled === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center">
                          <BookOpen className="h-8 w-8 text-muted-foreground/60" />
                          <p className="text-sm text-muted-foreground">Nenhuma questão adicionada</p>
                          {!readOnly ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPicker({ type, index: null })}
                              disabled={groupFilled >= count}
                            >
                              Adicionar do banco
                            </Button>
                          ) : null}
                        </div>
                      ) : (
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
                                  "rounded-xl border bg-muted/30 p-3 transition-shadow duration-300",
                                  slot.missing ? "border-red-300 bg-red-50/60" : "border-border",
                                  highlight === slot.questionId && "shadow-[0_0_0_3px_rgb(var(--brand-highlight)/0.25)]"
                                )}
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                                  <div className="flex min-w-0 flex-1 items-start gap-3">
                                    <SlotNumber number={number} type={type} />
                                    <div className="min-w-0 flex-1 space-y-1">
                                      {slot.title ? (
                                        <p className="text-sm font-semibold leading-tight">{slot.title}</p>
                                      ) : null}
                                      <p
                                        className={cn(
                                          "line-clamp-2 text-sm",
                                          slot.title ? "text-muted-foreground" : "font-medium"
                                        )}
                                        title={slot.text}
                                      >
                                        {slot.text}
                                      </p>
                                      {!slot.missing ? (
                                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                          <OriginBadge origin={slot.origin} />
                                          {slot.subjectName ? (
                                            <Badge variant="secondary" className="font-normal">
                                              {slot.subjectName}
                                            </Badge>
                                          ) : null}
                                          {slot.gradeName ? (
                                            <Badge variant="secondary" className="font-normal">
                                              {slot.gradeName}
                                            </Badge>
                                          ) : null}
                                          {slot.difficulty ? <DifficultyBadge difficulty={slot.difficulty} /> : null}
                                          <Badge variant="outline" className="font-normal">
                                            {QUESTION_TYPE_LABEL[type]}
                                          </Badge>
                                          <Badge variant="outline" className="font-normal">
                                            {formatQuestionValue(slot.value)}
                                          </Badge>
                                        </div>
                                      ) : null}
                                      {!slot.missing && slot.preview ? (
                                        <details className="mt-3 rounded-lg border border-dashed bg-background p-3">
                                          <summary className="cursor-pointer text-xs font-semibold text-brand-highlight">
                                            Ajustar leitura em voz alta
                                          </summary>
                                          <div className="mt-3 space-y-3">
                                            {!readOnly ? (
                                              <div className="rounded-lg border bg-background p-3">
                                                <DictationMarksEditor
                                                  value={slot.dictationMarksOverride ?? slot.preview.dictationMarks}
                                                  onChange={(marks) => setSlotDictation(type, index, marks)}
                                                  imageCount={extractImageSources(slot.preview.formattedText).length}
                                                  optionCount={slot.preview.options.length}
                                                  compact
                                                />
                                                <p className="mt-2 text-[11px] text-muted-foreground">
                                                  {slot.dictationMarksOverride
                                                    ? "Ajustado nesta avaliação."
                                                    : "Herdado da questão. Ao alterar, será salvo como ajuste desta avaliação."}
                                                </p>
                                                {slot.dictationMarksOverride ? (
                                                  <Button
                                                    type="button"
                                                    variant="link"
                                                    size="sm"
                                                    className="mt-1 h-auto px-0 py-0 text-xs"
                                                    onClick={() => setSlotDictation(type, index, undefined)}
                                                  >
                                                    Usar marcação original da questão
                                                  </Button>
                                                ) : null}
                                              </div>
                                            ) : null}
                                          </div>
                                        </details>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 flex-wrap gap-1 self-end sm:self-start">
                                    {slot.preview ? (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10"
                                        onClick={() => setPreviewSlot(slot)}
                                        aria-label={`Ver questão ${number}`}
                                        title="Ver"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    ) : null}
                                    {!readOnly ? (
                                      <>
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
                                      </>
                                    ) : null}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ol>
                      )}
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
                    <BookOpen className="h-5 w-5 text-brand-highlight" aria-hidden />
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
                    O rascunho fica neste navegador até você criar a avaliação. Em seguida ela fica salva como rascunho
                    no servidor.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}

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

        <Dialog open={Boolean(previewSlot)} onOpenChange={(open) => !open && setPreviewSlot(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{previewSlot?.title || "Visualizar questão"}</DialogTitle>
              <DialogDescription>Leitura da questão selecionada na avaliação.</DialogDescription>
            </DialogHeader>
            {previewSlot?.preview ? (
              <QuestionPreview
                question={{
                  ...previewSlot.preview,
                  dictationMarks: previewSlot.dictationMarksOverride ?? previewSlot.preview.dictationMarks,
                }}
                className="rounded-xl border bg-muted/20 p-4"
              />
            ) : null}
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={confirm === "reset"}
          onOpenChange={(open) => !open && setConfirm(null)}
          title="Descartar o rascunho?"
          description="As questões escolhidas e os dados da avaliação serão apagados."
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
          description="Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          variant="destructive"
          icon={Trash2}
          onConfirm={handleDelete}
        />
      </PageShell>

      <footer className="sticky bottom-0 z-30 -mx-4 mt-auto border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-6 md:px-6">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {step === 1 ? (
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleCancel} disabled={busy !== null}>
                Cancelar
              </Button>
            ) : (
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setStep(1)} disabled={busy !== null}>
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {step === 1 ? (
              <Button type="button" className="w-full sm:w-auto" onClick={goNext} disabled={busy !== null}>
                Próximo
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : !readOnly ? (
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={() => void handleSave()}
                disabled={busy !== null}
              >
                {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : isNew ? <ClipboardCheck className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {busy === "save" ? "Salvando…" : isNew ? "Criar Avaliação" : "Salvar"}
              </Button>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
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
