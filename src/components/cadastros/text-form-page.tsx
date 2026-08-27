"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  createReadingQuestionsBulk,
  createReadingText,
  deleteReadingQuestion,
  getReadingText,
  updateReadingQuestion,
  updateReadingText,
  type DifficultyLevel,
  type Grade,
  type ReadingQuestion,
} from "@/lib/api/afirme-reading";
import { listGrades } from "@/lib/api/grades";
import { getApiErrorMessage } from "@/lib/api/errors";
import { CADASTROS_PATHS } from "@/lib/cadastros/config";
import { CadastrosShell } from "@/components/cadastros/cadastros-shell";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string }[] = [
  { value: "VERY_EASY", label: "Muito fácil" },
  { value: "EASY", label: "Fácil" },
  { value: "MEDIUM", label: "Médio" },
  { value: "HARD", label: "Difícil" },
  { value: "VERY_HARD", label: "Muito difícil" },
];

type CreateMode = "with-questions" | "text-only";

function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
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

interface TextFormPageProps {
  id?: string;
}

export function TextFormPage({ id }: TextFormPageProps) {
  const router = useRouter();
  const editing = Boolean(id);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [createMode, setCreateMode] = useState<CreateMode>("with-questions");
  const [originalQuestions, setOriginalQuestions] = useState<ReadingQuestion[]>([]);
  const [draftQuestions, setDraftQuestions] = useState<QuestionDraft[]>([emptyQuestionDraft()]);
  const [loading, setLoading] = useState(editing);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadGrades = useCallback(async () => {
    try {
      const data = await listGrades();
      setGrades(data);
      setForm((prev) => (prev.gradeId || !data[0] ? prev : { ...prev, gradeId: data[0].id }));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível carregar as séries."));
    }
  }, []);

  const applyTextToForm = useCallback((text: { title: string; content: string; gradeId: string; difficultyLevel: DifficultyLevel; source: string | null; isCalibrated: boolean; questions?: ReadingQuestion[] }) => {
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
    setDraftQuestions(questions.length ? questions.map(questionToDraft) : []);
  }, []);

  const loadText = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadingDetail(true);
    try {
      const full = await getReadingText(id);
      applyTextToForm(full);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível carregar o texto."));
      router.replace(CADASTROS_PATHS.textos);
    } finally {
      setLoading(false);
      setLoadingDetail(false);
    }
  }, [applyTextToForm, id, router]);

  useEffect(() => {
    void loadGrades();
  }, [loadGrades]);

  useEffect(() => {
    void loadText();
  }, [loadText]);

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
      toast.error("Preencha título e conteúdo.");
      return;
    }
    if (!form.gradeId) {
      toast.error("Selecione a série.");
      return;
    }

    const requireQuestions = !editing && createMode === "with-questions";
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
      if (id) {
        await updateReadingText(id, textPayload);
        try {
          await persistQuestionEdits(id);
        } catch (error) {
          try {
            const full = await getReadingText(id);
            applyTextToForm(full);
          } catch {
            /* mantém o formulário atual */
          }
          toast.error(
            getApiErrorMessage(
              error,
              "O texto foi salvo, mas houve falha ao atualizar as perguntas. Verifique o gabarito ou se a exclusão tem resposta de aluno."
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
        toast.success("Texto criado com sucesso. Você pode editar para cadastrar as perguntas.");
      }
      router.push(CADASTROS_PATHS.textos);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          id
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

  const submitLabel = editing
    ? "Salvar"
    : createMode === "with-questions"
      ? "Criar texto e perguntas"
      : "Criar texto";

  const formBusy = saving || loadingDetail;
  const showQuestions = editing || createMode === "with-questions";

  return (
    <CadastrosShell
      title={editing ? "Editar texto e perguntas" : "Novo texto e perguntas"}
      description="Perguntas só existem vinculadas a um texto. Você pode criar só o texto agora e incluir perguntas depois."
      icon={BookOpen}
      actions={
        <Button variant="outline" asChild>
          <Link href={CADASTROS_PATHS.textos}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      }
    >
      {loading ? (
        <div className="flex items-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando texto...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editing ? (
            <Card>
              <CardContent className="space-y-3 pt-4 sm:pt-6">
                <p className="text-sm font-medium">Como deseja cadastrar?</p>
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
                      Envia o texto e as questões no mesmo cadastro.
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
                    <span className="font-medium">Criar só o texto</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Depois você edita o texto para cadastrar as perguntas.
                    </span>
                  </span>
                </label>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="space-y-4 pt-4 sm:pt-6">
              <h2 className="text-base font-semibold">Dados do texto</h2>

              <div className="space-y-2">
                <Label htmlFor="texto-titulo">Título</Label>
                <Input
                  id="texto-titulo"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  disabled={formBusy}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Série</Label>
                  <Select
                    value={form.gradeId || undefined}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, gradeId: value }))}
                    disabled={formBusy || grades.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a série" />
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
                <div className="flex items-end justify-between gap-3">
                  <Label htmlFor="texto-conteudo">Conteúdo</Label>
                  <span className="text-xs text-muted-foreground">{wordCount(form.content)} palavras</span>
                </div>
                <Textarea
                  id="texto-conteudo"
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  className="min-h-[220px] leading-relaxed"
                  disabled={formBusy}
                />
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
                <Label htmlFor="texto-calibrado">Texto calibrado para fluência</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 pt-4 sm:pt-6">
              <div>
                <h2 className="text-base font-semibold">Perguntas e alternativas</h2>
                <p className="text-xs text-muted-foreground">
                  {editing
                    ? "Edite as perguntas existentes, inclua novas ou remova. A exclusão é recusada se já houver resposta de aluno."
                    : showQuestions
                      ? "Cada pergunta precisa de enunciado, descritor, pelo menos duas alternativas e um gabarito."
                      : "Depois de criar o texto, abra a edição para cadastrar perguntas e alternativas."}
                </p>
              </div>

              {loadingDetail ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando perguntas...
                </div>
              ) : showQuestions ? (
                <TextQuestionEditor
                  questions={draftQuestions}
                  disabled={formBusy}
                  addLabel="Adicionar pergunta"
                  onChange={setDraftQuestions}
                  onRemoveQuestion={(question) => {
                    if (!question.id) return true;
                    return window.confirm(
                      "Excluir esta pergunta? Se já houver resposta de aluno, a exclusão será recusada ao salvar."
                    );
                  }}
                />
              ) : null}
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" asChild disabled={saving}>
              <Link href={CADASTROS_PATHS.textos}>Cancelar</Link>
            </Button>
            <Button type="submit" disabled={formBusy}>
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
      )}
    </CadastrosShell>
  );
}
