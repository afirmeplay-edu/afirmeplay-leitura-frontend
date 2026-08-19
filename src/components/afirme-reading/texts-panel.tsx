"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  createReadingQuestionsBulk,
  createReadingText,
  deleteReadingQuestion,
  deleteReadingText,
  getReadingText,
  listReadingTexts,
  updateReadingQuestion,
  updateReadingText,
  type DifficultyLevel,
  type Grade,
  type ReadingQuestion,
  type ReadingText,
} from "@/lib/api/afirme-reading";
import { listGrades } from "@/lib/api/grades";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TextQuestionEditor } from "@/components/afirme-reading/text-question-editor";
import {
  emptyQuestionDraft,
  filledQuestionDrafts,
  isSameQuestion,
  questionToDraft,
  toNestedQuestionPayload,
  toStandaloneQuestionPayload,
  toUpdateQuestionPayload,
  validateQuestionDrafts,
  type QuestionDraft,
} from "@/components/afirme-reading/text-question-draft";

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string }[] = [
  { value: "VERY_EASY", label: "Muito facil" },
  { value: "EASY", label: "Facil" },
  { value: "MEDIUM", label: "Medio" },
  { value: "HARD", label: "Dificil" },
  { value: "VERY_HARD", label: "Muito dificil" },
];

type CreateMode = "with-questions" | "text-only";

function difficultyLabel(level: DifficultyLevel) {
  return DIFFICULTY_OPTIONS.find((option) => option.value === level)?.label ?? level;
}

function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

function questionsCountLabel(count: number) {
  return count === 1 ? "1 pergunta" : `${count} perguntas`;
}

interface FormState {
  title: string;
  content: string;
  gradeId: string;
  difficultyLevel: DifficultyLevel;
  source: string;
  isCalibrated: boolean;
}

const EMPTY_FORM: FormState = {
  title: "",
  content: "",
  gradeId: "",
  difficultyLevel: "MEDIUM",
  source: "",
  isCalibrated: false,
};

export function TextsPanel() {
  const [texts, setTexts] = useState<ReadingText[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterGradeId, setFilterGradeId] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [createMode, setCreateMode] = useState<CreateMode>("with-questions");
  const [originalQuestions, setOriginalQuestions] = useState<ReadingQuestion[]>([]);
  const [draftQuestions, setDraftQuestions] = useState<QuestionDraft[]>([]);

  const loadGrades = useCallback(async () => {
    try {
      const data = await listGrades();
      setGrades(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Nao foi possivel carregar as series."));
    }
  }, []);

  const loadTexts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listReadingTexts({
        gradeId: filterGradeId === "all" ? undefined : filterGradeId,
        orderBy: "title",
      });
      setTexts(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Nao foi possivel carregar os textos."));
    } finally {
      setLoading(false);
    }
  }, [filterGradeId]);

  useEffect(() => {
    void loadGrades();
  }, [loadGrades]);

  useEffect(() => {
    void loadTexts();
  }, [loadTexts]);

  function resetQuestionState() {
    setCreateMode("with-questions");
    setOriginalQuestions([]);
    setDraftQuestions([]);
    setLoadingDetail(false);
  }

  function openCreate() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      gradeId: filterGradeId !== "all" ? filterGradeId : grades[0]?.id ?? "",
    });
    setCreateMode("with-questions");
    setOriginalQuestions([]);
    setDraftQuestions([emptyQuestionDraft()]);
    setFormOpen(true);
  }

  function applyTextToForm(text: ReadingText) {
    const questions = text.questions ?? [];
    setForm({
      title: text.title,
      content: text.content,
      gradeId: text.gradeId,
      difficultyLevel: text.difficultyLevel,
      source: text.source ?? "",
      isCalibrated: text.isCalibrated,
    });
    setOriginalQuestions(questions);
    setDraftQuestions(questions.map(questionToDraft));
  }

  async function openEdit(text: ReadingText) {
    setEditingId(text.id);
    applyTextToForm(text);
    setCreateMode("text-only");
    setFormOpen(true);
    setLoadingDetail(true);
    try {
      const full = await getReadingText(text.id);
      applyTextToForm(full);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Nao foi possivel carregar as perguntas do texto."));
    } finally {
      setLoadingDetail(false);
    }
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    resetQuestionState();
  }

  async function persistQuestionEdits(textId: string) {
    const existingDrafts = draftQuestions.filter((question): question is QuestionDraft & { id: string } =>
      Boolean(question.id)
    );
    const newDrafts = filledQuestionDrafts(draftQuestions.filter((question) => !question.id));
    const currentIds = new Set(existingDrafts.map((question) => question.id));
    const deletedIds = originalQuestions
      .filter((question) => !currentIds.has(question.id))
      .map((question) => question.id);
    const changedDrafts = existingDrafts.filter((draft) => {
      const original = originalQuestions.find((question) => question.id === draft.id);
      return original ? !isSameQuestion(draft, original) : true;
    });

    for (const draft of changedDrafts) {
      await updateReadingQuestion(textId, draft.id, toUpdateQuestionPayload(draft));
    }

    if (newDrafts.length > 0) {
      await createReadingQuestionsBulk(textId, newDrafts.map(toStandaloneQuestionPayload));
    }

    for (const questionId of deletedIds) {
      await deleteReadingQuestion(textId, questionId);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = form.title.trim();
    const content = form.content.trim();
    if (!title || !content) {
      toast.error("Preencha titulo e conteudo.");
      return;
    }
    if (!form.gradeId) {
      toast.error("Selecione a serie.");
      return;
    }

    const requireQuestions = !editingId && createMode === "with-questions";
    const questionsError = validateQuestionDrafts(draftQuestions, requireQuestions);
    if (questionsError) {
      toast.error(questionsError);
      return;
    }

    const textPayload = {
      title,
      content,
      gradeId: form.gradeId,
      difficultyLevel: form.difficultyLevel,
      source: form.source.trim() || null,
      isCalibrated: form.isCalibrated,
      targetSkills: [] as string[],
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateReadingText(editingId, textPayload);
        try {
          await persistQuestionEdits(editingId);
        } catch (error) {
          try {
            const full = await getReadingText(editingId);
            applyTextToForm(full);
          } catch {
            /* mantem o formulario atual */
          }
          toast.error(
            getApiErrorMessage(
              error,
              "O texto foi salvo, mas houve falha ao atualizar as perguntas. Verifique o gabarito ou se a exclusao tem resposta de aluno."
            )
          );
          return;
        }
        toast.success("Texto e perguntas atualizados com sucesso.");
      } else if (createMode === "with-questions") {
        await createReadingText({
          ...textPayload,
          questions: filledQuestionDrafts(draftQuestions).map(toNestedQuestionPayload),
        });
        toast.success("Texto criado com perguntas.");
      } else {
        await createReadingText(textPayload);
        toast.success("Texto criado com sucesso. Voce pode editar para cadastrar as perguntas.");
      }
      closeForm();
      await loadTexts();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          editingId
            ? "Falha ao atualizar o texto."
            : createMode === "with-questions"
              ? "Falha ao criar o texto com perguntas. Verifique o gabarito."
              : "Falha ao criar o texto."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(text: ReadingText) {
    if (!window.confirm(`Excluir o texto "${text.title}"?`)) return;
    setDeletingId(text.id);
    try {
      await deleteReadingText(text.id);
      toast.success("Texto excluido com sucesso.");
      if (editingId === text.id) closeForm();
      await loadTexts();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Falha ao excluir o texto."));
    } finally {
      setDeletingId(null);
    }
  }

  const submitLabel = editingId
    ? "Salvar"
    : createMode === "with-questions"
      ? "Criar texto e perguntas"
      : "Criar texto";

  const formBusy = saving || loadingDetail;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-bluebrand-deep">Textos e perguntas</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={filterGradeId} onValueChange={setFilterGradeId}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Filtrar serie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as series</SelectItem>
              {grades.map((grade) => (
                <SelectItem key={grade.id} value={grade.id}>
                  {grade.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} className="bg-bluebrand-deep text-white hover:opacity-95">
            <Plus className="h-4 w-4" />
            Novo texto
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando...
        </div>
      ) : texts.length === 0 ? (
        <p className="py-6 text-sm italic text-muted-foreground">Nenhum texto cadastrado.</p>
      ) : (
        <div className="space-y-3">
          {texts.map((text) => (
            <div
              key={text.id}
              className="rounded-lg border border-slate-200 p-4 transition hover:bg-slate-50"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-bluebrand-deep">{text.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {text.grade?.name ?? "Serie"} · {difficultyLabel(text.difficultyLevel)}
                    {text.isCalibrated ? " · Calibrado" : ""}
                    {text.source ? ` · Fonte: ${text.source}` : ""}
                    {Array.isArray(text.questions) ? ` · ${questionsCountLabel(text.questions.length)}` : ""}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-700">
                    {text.content.length > 200 ? `${text.content.slice(0, 200)}...` : text.content}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => void openEdit(text)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-red-700 hover:bg-red-50"
                    disabled={deletingId === text.id}
                    onClick={() => void handleDelete(text)}
                  >
                    {deletingId === text.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-bluebrand-deep">
                {editingId ? "Editar texto" : "Novo texto"}
              </h3>
              <Button type="button" variant="ghost" size="icon" onClick={closeForm} aria-label="Fechar">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingId ? (
                <fieldset className="space-y-2 rounded-lg border border-slate-200 p-4">
                  <legend className="px-1 text-sm font-medium text-bluebrand-deep">Como deseja cadastrar?</legend>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="create-mode"
                      className="mt-1 accent-bluebrand-deep"
                      checked={createMode === "with-questions"}
                      onChange={() => {
                        setCreateMode("with-questions");
                        if (draftQuestions.length === 0) setDraftQuestions([emptyQuestionDraft()]);
                      }}
                      disabled={formBusy}
                    />
                    <span>
                      <span className="font-medium">Criar texto com perguntas e alternativas</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Envia o texto e as questoes no mesmo cadastro.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="create-mode"
                      className="mt-1 accent-bluebrand-deep"
                      checked={createMode === "text-only"}
                      onChange={() => setCreateMode("text-only")}
                      disabled={formBusy}
                    />
                    <span>
                      <span className="font-medium">Criar so o texto</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Depois voce edita o texto para cadastrar as perguntas.
                      </span>
                    </span>
                  </label>
                </fieldset>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="texto-titulo">Titulo</Label>
                <Input
                  id="texto-titulo"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  disabled={formBusy}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Serie</Label>
                  <Select
                    value={form.gradeId || undefined}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, gradeId: value }))}
                    disabled={formBusy || grades.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a serie" />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((grade) => (
                        <SelectItem key={grade.id} value={grade.id}>
                          {grade.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dificuldade</Label>
                  <Select
                    value={form.difficultyLevel}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        difficultyLevel: value as DifficultyLevel,
                      }))
                    }
                    disabled={formBusy}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="texto-conteudo">Conteudo</Label>
                <Textarea
                  id="texto-conteudo"
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  className="min-h-[220px] leading-relaxed"
                  disabled={formBusy}
                />
                <p className="text-xs text-muted-foreground">{wordCount(form.content)} palavras</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="texto-fonte">Fonte</Label>
                <Input
                  id="texto-fonte"
                  value={form.source}
                  onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
                  placeholder="Opcional"
                  disabled={formBusy}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="texto-calibrado"
                  checked={form.isCalibrated}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, isCalibrated: checked === true }))
                  }
                  disabled={formBusy}
                />
                <Label htmlFor="texto-calibrado">Texto calibrado para fluencia</Label>
              </div>

              {editingId ? (
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <h4 className="text-sm font-semibold text-bluebrand-deep">Perguntas e alternativas</h4>
                    <p className="text-xs text-muted-foreground">
                      Edite as perguntas existentes, inclua novas ou remova. A exclusao e recusada se ja
                      houver resposta de aluno. Alterar o gabarito nao recalcula respostas antigas.
                    </p>
                  </div>
                  {loadingDetail ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando perguntas...
                    </div>
                  ) : (
                    <TextQuestionEditor
                      questions={draftQuestions}
                      disabled={formBusy}
                      addLabel="Adicionar pergunta"
                      onChange={setDraftQuestions}
                      onRemoveQuestion={(question) => {
                        if (!question.id) return true;
                        return window.confirm(
                          "Excluir esta pergunta? Se ja houver resposta de aluno, a exclusao sera recusada ao salvar."
                        );
                      }}
                    />
                  )}
                </div>
              ) : createMode === "with-questions" ? (
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <h4 className="text-sm font-semibold text-bluebrand-deep">Perguntas e alternativas</h4>
                    <p className="text-xs text-muted-foreground">
                      Cada pergunta precisa de enunciado, descritor, pelo menos duas alternativas e um
                      gabarito.
                    </p>
                  </div>
                  <TextQuestionEditor
                    questions={draftQuestions}
                    disabled={formBusy}
                    onChange={setDraftQuestions}
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Depois de criar o texto, abra a edicao para cadastrar perguntas e alternativas.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-bluebrand-deep text-white hover:opacity-95"
                  disabled={formBusy}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    submitLabel
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
