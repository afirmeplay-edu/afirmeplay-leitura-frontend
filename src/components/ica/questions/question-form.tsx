"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, ImagePlus, Info, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { createBankQuestion, updateBankQuestion } from "@/lib/api/afirme-reading/questions";
import type { BankQuestion } from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import { formatSkillLabel, listSkills, type CatalogSkill } from "@/lib/api/question-catalog";
import { ROUTES } from "@/config/routes";
import { ICA_BRAND } from "@/lib/ica/brand";
import { QUESTION_IMAGE_ACCEPT, QuestionImageError, readQuestionImage } from "@/lib/ica/image-file";
import { buildQuestionHtml, resolveQuestionAssetUrl } from "@/lib/ica/question-html";
import { QUESTION_DIFFICULTIES, optionLetter, type QuestionPreviewModel } from "@/lib/ica/questions";
import { useQuestionCatalog } from "@/hooks/use-question-catalog";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes";
import {
  buildCreatePayload,
  buildUpdatePayload,
  draftFromQuestion,
  emptyQuestionDraft,
  hasRichFormatting,
  isDraftDirty,
  optionImageSrc,
  validateQuestionDraft,
  type QuestionDraft,
  type QuestionField,
} from "@/components/ica/questions/question-draft";
import { QuestionOptionsEditor } from "@/components/ica/questions/question-options-editor";
import { QuestionPreview } from "@/components/ica/questions/question-preview";
import { OriginBadge, ScopeBadge } from "@/components/ica/questions/question-badges";
import { FormPage } from "@/components/shared/form-page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const NONE = "__none__";
const MAX_STATEMENT_IMAGES = 3;

type FieldErrors = Partial<Record<QuestionField, string>>;

interface QuestionFormProps {
  mode: "create" | "edit";
  question?: BankQuestion;
  onSaved?: (question: BankQuestion) => void;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs font-medium text-red-700" role="alert">
      {message}
    </p>
  );
}

export function QuestionForm({ mode, question, onSaved }: QuestionFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);
  const statementFileRef = useRef<HTMLInputElement>(null);
  const { subjects, grades, stages, loading: catalogLoading } = useQuestionCatalog({ withStages: true });

  const [initial, setInitial] = useState<QuestionDraft>(() =>
    question ? draftFromQuestion(question) : emptyQuestionDraft()
  );
  const [draft, setDraft] = useState<QuestionDraft>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [skills, setSkills] = useState<CatalogSkill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);

  const dirty = !leaving && isDraftDirty(initial, draft);
  useUnsavedChangesWarning(dirty);

  useEffect(() => {
    if (!draft.subjectId && !draft.gradeId) {
      setSkills([]);
      return;
    }
    let cancelled = false;
    setSkillsLoading(true);
    listSkills({ subjectId: draft.subjectId || undefined, gradeId: draft.gradeId || undefined })
      .then((list) => {
        if (!cancelled) setSkills(list);
      })
      .catch((error) => {
        if (cancelled) return;
        setSkills([]);
        toast.error(normalizeApiError(error, "Não foi possível carregar as habilidades.").message, {
          id: "ica-skills-error",
        });
      })
      .finally(() => {
        if (!cancelled) setSkillsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.subjectId, draft.gradeId]);

  const patch = useCallback((changes: Partial<QuestionDraft>, clear: QuestionField[] = []) => {
    setDraft((prev) => ({ ...prev, ...changes }));
    if (clear.length) {
      setErrors((prev) => {
        const next = { ...prev };
        clear.forEach((field) => delete next[field]);
        return next;
      });
    }
  }, []);

  async function addStatementImage(file: File | undefined) {
    if (!file) return;
    if (draft.statementImages.length >= MAX_STATEMENT_IMAGES) {
      toast.error(`O enunciado aceita até ${MAX_STATEMENT_IMAGES} imagens.`);
      return;
    }
    try {
      const dataUrl = await readQuestionImage(file);
      patch({ statementImages: [...draft.statementImages, dataUrl] });
    } catch (error) {
      toast.error(error instanceof QuestionImageError ? error.message : "Não foi possível anexar a imagem.");
    }
  }

  function focusField(field: QuestionField) {
    const root = formRef.current;
    if (!root) return;
    const target =
      root.querySelector<HTMLElement>(`[data-field="${field}"] :is(input, textarea, button[role="combobox"], button[role="radio"])`) ??
      root.querySelector<HTMLElement>(`[data-field="${field}"]`);
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    target?.focus({ preventScroll: true });
  }

  async function submit() {
    if (saving) return;
    const validation = validateQuestionDraft(draft);
    if (validation.length) {
      const next: FieldErrors = {};
      validation.forEach((error) => {
        if (!next[error.field]) next[error.field] = error.message;
      });
      setErrors(next);
      toast.error(validation[0].message);
      focusField(validation[0].field.startsWith("option-") ? "options" : validation[0].field);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      if (mode === "create") {
        await createBankQuestion(buildCreatePayload(draft));
        toast.success("Questão criada.");
        setLeaving(true);
        router.push(ROUTES.ica.questoes.root);
        return;
      }

      if (!question) return;
      const payload = buildUpdatePayload(initial, draft);
      if (Object.keys(payload).length === 0) {
        toast.info("Nenhuma alteração para salvar.");
        return;
      }
      const saved = await updateBankQuestion(question.id, payload);
      const next = draftFromQuestion(saved);
      setInitial(next);
      setDraft(next);
      onSaved?.(saved);
      toast.success("Questão atualizada.");
    } catch (error) {
      toast.error(normalizeApiError(error, "Não foi possível salvar a questão.").message);
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void submit();
    }
  }

  function handleCancel() {
    if (dirty && !window.confirm("Há alterações não salvas. Deseja sair mesmo assim?")) return;
    setLeaving(true);
    router.push(ROUTES.ica.questoes.root);
  }

  const skillOptions = useMemo(() => {
    if (!draft.skillId || skills.some((skill) => skill.id === draft.skillId)) return skills;
    return [{ id: draft.skillId, code: "", description: "Habilidade atual", subjectId: null, gradeIds: [] }, ...skills];
  }, [draft.skillId, skills]);

  const preview: QuestionPreviewModel = useMemo(() => {
    const skill = skillOptions.find((item) => item.id === draft.skillId);
    const value = Number(draft.value.replace(",", "."));
    return {
      text: draft.text,
      formattedText: buildQuestionHtml(draft.text, draft.statementImages),
      secondStatement: draft.secondStatement,
      formattedSolution: draft.solution.trim() ? buildQuestionHtml(draft.solution) : "",
      options: draft.options.map((option, index) => ({
        key: option.key,
        letter: optionLetter(index),
        text: option.text,
        imageSrc: optionImageSrc(option.image),
        isCorrect: option.isCorrect,
      })),
      value: Number.isFinite(value) ? value : null,
      difficulty: draft.difficulty || null,
      subjectName: subjects.find((subject) => subject.id === draft.subjectId)?.name ?? null,
      gradeName: grades.find((grade) => grade.id === draft.gradeId)?.name ?? null,
      skillLabel: skill ? formatSkillLabel(skill) : null,
    };
  }, [draft, grades, skillOptions, subjects]);

  const optionErrors = useMemo(() => {
    const map: Record<number, string> = {};
    Object.entries(errors).forEach(([field, message]) => {
      const match = /^option-(\d+)$/.exec(field);
      if (match && message) map[Number(match[1])] = message;
    });
    return map;
  }, [errors]);

  const isCreate = mode === "create";
  const busy = saving;

  return (
    <div ref={formRef}>
      <FormPage
        brand={ICA_BRAND}
        title={isCreate ? "Nova questão" : "Editar questão"}
        description="Múltipla escolha para prova em papel com cartão-resposta. O gabarito é calculado pela letra marcada."
        icon={isCreate ? FilePlus2 : Pencil}
        backHref={ROUTES.ica.questoes.root}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
        onFormKeyDown={handleKeyDown}
        submitLabel={isCreate ? "Criar questão" : "Salvar alterações"}
        submitting={saving}
        submitDisabled={!isCreate && !dirty}
        footerHint="Ctrl + Enter para salvar"
        bare
        notice={
          question ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <OriginBadge origin={question.origin} />
              <ScopeBadge scope={question.scopeType} />
              {question.createdBy?.name ? <span>Criada por {question.createdBy.name}</span> : null}
              {question.version ? <span>· Versão {question.version}</span> : null}
            </div>
          ) : null
        }
        aside={
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pré-visualização</CardTitle>
              <CardDescription>Como a questão aparece, com o gabarito destacado.</CardDescription>
            </CardHeader>
            <CardContent>
              <QuestionPreview question={preview} />
            </CardContent>
          </Card>
        }
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Enunciado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {question && hasRichFormatting(question.formattedText) ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Este enunciado tem formatação (negrito, tabelas…) que o editor não reproduz. Se você alterar o texto ou
                  as imagens, ele será salvo como texto simples com as imagens.
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2" data-field="text">
              <Label htmlFor="questao-enunciado">Enunciado *</Label>
              <Textarea
                id="questao-enunciado"
                value={draft.text}
                onChange={(event) => patch({ text: event.target.value }, ["text"])}
                placeholder="Ex.: Qual palavra começa com a mesma letra de BOLA?"
                className="min-h-[110px]"
                aria-invalid={Boolean(errors.text)}
                disabled={busy}
              />
              <FieldError message={errors.text} />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Imagens do enunciado</Label>
                <input
                  ref={statementFileRef}
                  type="file"
                  accept={QUESTION_IMAGE_ACCEPT}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={(event) => {
                    void addStatementImage(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  disabled={busy || draft.statementImages.length >= MAX_STATEMENT_IMAGES}
                  onClick={() => statementFileRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4" />
                  Anexar imagem
                </Button>
              </div>
              {draft.statementImages.length ? (
                <ul className="flex flex-wrap gap-3">
                  {draft.statementImages.map((src, index) => {
                    const resolved = resolveQuestionAssetUrl(src);
                    return (
                      <li key={`${index}-${src.slice(0, 32)}`} className="relative animate-in fade-in-0 zoom-in-95 duration-200">
                        {resolved ? (
                          // eslint-disable-next-line @next/next/no-img-element -- data-URL local ou imagem do backend via /api
                          <img src={resolved} alt={`Imagem ${index + 1} do enunciado`} className="h-24 rounded-lg border object-contain" />
                        ) : null}
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-background"
                          onClick={() =>
                            patch({ statementImages: draft.statementImages.filter((_, current) => current !== index) })
                          }
                          disabled={busy}
                          aria-label={`Remover imagem ${index + 1} do enunciado`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Opcional. PNG, JPG, GIF ou WEBP até 1 MB (até {MAX_STATEMENT_IMAGES}).
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="questao-apoio">Texto de apoio</Label>
              <Textarea
                id="questao-apoio"
                value={draft.secondStatement}
                onChange={(event) => patch({ secondStatement: event.target.value })}
                placeholder="Opcional (ex.: trecho para leitura antes da pergunta)"
                className="min-h-[70px]"
                disabled={busy}
              />
            </div>
          </CardContent>
        </Card>

        <Card data-field="options">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Alternativas *</CardTitle>
          </CardHeader>
          <CardContent>
            <QuestionOptionsEditor
              options={draft.options}
              onChange={(options) => {
                setDraft((prev) => ({ ...prev, options }));
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.options;
                  Object.keys(next)
                    .filter((key) => key.startsWith("option-"))
                    .forEach((key) => delete next[key as QuestionField]);
                  return next;
                });
              }}
              disabled={busy}
              optionErrors={optionErrors}
              groupError={errors.options}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Classificação</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2" data-field="subjectId">
              <Label htmlFor="questao-disciplina">Disciplina *</Label>
              <Select
                value={draft.subjectId || undefined}
                onValueChange={(value) => patch({ subjectId: value, skillId: "" }, ["subjectId"])}
                disabled={busy || catalogLoading}
              >
                <SelectTrigger id="questao-disciplina" aria-invalid={Boolean(errors.subjectId)}>
                  <SelectValue placeholder={catalogLoading ? "Carregando..." : "Selecione a disciplina"} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.subjectId} />
            </div>

            <div className="space-y-2" data-field="gradeId">
              <Label htmlFor="questao-serie">Série *</Label>
              <Select
                value={draft.gradeId || undefined}
                onValueChange={(value) => patch({ gradeId: value }, ["gradeId"])}
                disabled={busy || catalogLoading}
              >
                <SelectTrigger id="questao-serie" aria-invalid={Boolean(errors.gradeId)}>
                  <SelectValue placeholder={catalogLoading ? "Carregando..." : "Selecione a série"} />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((grade) => (
                    <SelectItem key={grade.id} value={grade.id}>
                      {grade.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.gradeId} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="questao-etapa">Etapa de ensino</Label>
              <Select
                value={draft.educationStageId || NONE}
                onValueChange={(value) => patch({ educationStageId: value === NONE ? "" : value })}
                disabled={busy || catalogLoading}
              >
                <SelectTrigger id="questao-etapa">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Não informar</SelectItem>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="questao-dificuldade">Dificuldade</Label>
              <Select
                value={draft.difficulty || NONE}
                onValueChange={(value) => patch({ difficulty: value === NONE ? "" : value })}
                disabled={busy}
              >
                <SelectTrigger id="questao-dificuldade">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Não informar</SelectItem>
                  {QUESTION_DIFFICULTIES.map((difficulty) => (
                    <SelectItem key={difficulty} value={difficulty}>
                      {difficulty}
                    </SelectItem>
                  ))}
                  {draft.difficulty && !(QUESTION_DIFFICULTIES as string[]).includes(draft.difficulty) ? (
                    <SelectItem value={draft.difficulty}>{draft.difficulty} (valor atual)</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="questao-habilidade">Habilidade</Label>
              <Select
                value={draft.skillId || NONE}
                onValueChange={(value) => patch({ skillId: value === NONE ? "" : value })}
                disabled={busy || skillsLoading || (!draft.subjectId && !draft.gradeId)}
              >
                <SelectTrigger id="questao-habilidade">
                  <SelectValue
                    placeholder={
                      !draft.subjectId && !draft.gradeId
                        ? "Escolha a disciplina ou a série primeiro"
                        : skillsLoading
                          ? "Carregando habilidades..."
                          : "Opcional"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-w-[min(90vw,640px)]">
                  <SelectItem value={NONE}>Sem habilidade</SelectItem>
                  {skillOptions.map((skill) => (
                    <SelectItem key={skill.id} value={skill.id}>
                      {formatSkillLabel(skill)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!skillsLoading && (draft.subjectId || draft.gradeId) && skills.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma habilidade cadastrada para esse recorte.</p>
              ) : null}
            </div>

            <div className="space-y-2" data-field="value">
              <Label htmlFor="questao-valor">Valor (pontos) *</Label>
              <Input
                id="questao-valor"
                inputMode="decimal"
                value={draft.value}
                onChange={(event) => patch({ value: event.target.value }, ["value"])}
                aria-invalid={Boolean(errors.value)}
                disabled={busy}
              />
              <FieldError message={errors.value} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="questao-topicos">Tópicos</Label>
              <Input
                id="questao-topicos"
                value={draft.topics}
                onChange={(event) => patch({ topics: event.target.value })}
                placeholder="Separe por vírgula"
                disabled={busy}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resolução comentada</CardTitle>
            <CardDescription>Opcional. Aparece para o professor, não para o aluno.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="questao-resolucao"
              aria-label="Resolução comentada"
              value={draft.solution}
              onChange={(event) => patch({ solution: event.target.value })}
              className="min-h-[90px]"
              disabled={busy}
            />
          </CardContent>
        </Card>
      </FormPage>
    </div>
  );
}
