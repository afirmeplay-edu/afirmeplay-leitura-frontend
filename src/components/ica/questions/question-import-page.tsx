"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileInput,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  buildQuestionImportCountsParam,
  downloadQuestionsImportTemplate,
  importQuestionsDocx,
} from "@/lib/api/afirme-reading/questions";
import type {
  BankQuestion,
  DictationMarks,
  ImportedDocxQuestion,
  QuestionDocxImportPreview,
} from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import { ROUTES } from "@/config/routes";
import { canWriteIca } from "@/lib/auth/roles";
import { useQuestionCatalog } from "@/hooks/use-question-catalog";
import { hasDictationMarks, normalizeDictationMarks } from "@/lib/ica/dictation-marks";
import { extractImageSources } from "@/lib/ica/question-html";
import { toPreviewModel } from "@/lib/ica/questions";
import { ICA_BRAND } from "@/lib/ica/brand";
import { cn } from "@/lib/utils";
import { RoleGuard } from "@/components/auth/role-guard";
import { IcaCityScope } from "@/components/ica/ica-city-scope";
import { DictationMarksEditor } from "@/components/ica/questions/dictation-marks-editor";
import { QuestionPreview } from "@/components/ica/questions/question-preview";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DOCX_ACCEPT = ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DEFAULT_COUNT = 10;
const MAX_COUNT = 100;

function isDocxFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".docx") || file.type === DOCX_MIME;
}

function previewModel(question: ImportedDocxQuestion, current: DictationMarks) {
  const payload = question.payload ?? {};
  return toPreviewModel({
    id: String(question.index),
    text: payload.text ?? "",
    formattedText: payload.formattedText,
    type: payload.type,
    title: payload.title,
    secondStatement: payload.secondStatement,
    dictatedWord: payload.dictatedWord,
    formattedSolution: payload.formattedSolution,
    options: payload.options,
    value: payload.value,
    difficulty: payload.difficulty,
    dictationMarks: current,
  } as BankQuestion);
}

const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const TECH_ID_LABEL_RE = /\b(SubjectId|GradeId|subjectId|gradeId|subject_id|grade_id)\s*[:=]?\s*/gi;

/** Remove UUIDs/rótulos técnicos de mensagens mostradas ao usuário. */
function humanizeImportError(message: string): string {
  let text = message
    .replace(UUID_RE, "")
    .replace(TECH_ID_LABEL_RE, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
  if (!text || /^[=:\-–—.,;]+$/.test(text)) {
    return "Revise o enunciado, as alternativas ou os dados da questão.";
  }
  return text;
}

function summarizeErrors(errors?: string[] | null) {
  if (!errors?.length) return "";
  return ` ${humanizeImportError(errors[0])}`;
}

export function QuestionImportPage() {
  return (
    <RoleGuard allow={canWriteIca} fallbackHref={ROUTES.ica.questoes.root}>
      <IcaCityScope emptyMessage="Selecione o município para importar questões.">
        <QuestionImport />
      </IcaCityScope>
    </RoleGuard>
  );
}

function QuestionImport() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { subjects, grades, loading: catalogLoading } = useQuestionCatalog();

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [gradeId, setGradeId] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [countsBySubject, setCountsBySubject] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState<QuestionDocxImportPreview | null>(null);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [marks, setMarks] = useState<Record<number, DictationMarks>>({});
  const [busy, setBusy] = useState<"template" | "preview" | "commit" | null>(null);

  const questions = useMemo(() => preview?.questions ?? [], [preview]);
  const selectedSubjects = useMemo(() => {
    const byId = new Map(subjects.map((subject) => [subject.id, subject]));
    return selectedSubjectIds
      .map((id) => byId.get(id))
      .filter((subject): subject is (typeof subjects)[number] => Boolean(subject));
  }, [subjects, selectedSubjectIds]);

  const totalQuestionCount = useMemo(
    () =>
      selectedSubjectIds.reduce((sum, id) => {
        const qty = countsBySubject[id];
        return sum + (Number.isInteger(qty) && qty > 0 ? qty : 0);
      }, 0),
    [selectedSubjectIds, countsBySubject]
  );

  const countsValid = useMemo(() => {
    if (selectedSubjectIds.length === 0) return false;
    return selectedSubjectIds.every((id) => {
      const qty = countsBySubject[id];
      return Number.isInteger(qty) && qty >= 1;
    });
  }, [selectedSubjectIds, countsBySubject]);

  const countsWithinLimit = totalQuestionCount <= MAX_COUNT;
  const formReady = Boolean(gradeId && selectedSubjectIds.length > 0);
  const templateReady = formReady && countsValid && countsWithinLimit;

  const selectedValidCount = useMemo(() => {
    if (!preview) return 0;
    return preview.questions.filter((question) => question.valid && selectedIndexes.has(question.index)).length;
  }, [preview, selectedIndexes]);

  const missingCount = useMemo(() => {
    if (!preview) return 0;
    return preview.questions.filter(
      (question) =>
        question.valid &&
        selectedIndexes.has(question.index) &&
        !hasDictationMarks(marks[question.index])
    ).length;
  }, [preview, selectedIndexes, marks]);

  const resetPreview = useCallback(() => {
    setPreview(null);
    setSelectedIndexes(new Set());
    setMarks({});
  }, []);

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds((prev) => {
      if (prev.includes(id)) {
        setCountsBySubject((counts) => {
          const next = { ...counts };
          delete next[id];
          return next;
        });
        return prev.filter((item) => item !== id);
      }
      setCountsBySubject((counts) => ({
        ...counts,
        [id]: counts[id] ?? DEFAULT_COUNT,
      }));
      return [...prev, id];
    });
    resetPreview();
  };

  const setSubjectCount = (id: string, raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    setCountsBySubject((prev) => ({
      ...prev,
      [id]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const handleFileSelect = (next: File | null) => {
    if (!next) return;
    if (!isDocxFile(next)) {
      toast.error("Selecione um arquivo .docx");
      return;
    }
    setFile(next);
    resetPreview();
  };

  async function handleDownloadTemplate() {
    if (!templateReady) return;
    const counts = buildQuestionImportCountsParam(selectedSubjectIds, countsBySubject);
    if (!counts) {
      toast.error("Informe uma quantidade válida por disciplina.");
      return;
    }
    setBusy("template");
    try {
      await downloadQuestionsImportTemplate({
        gradeId,
        subjectIds: selectedSubjectIds,
        counts,
      });
      toast.success("Modelo baixado. Preencha os blocos amarelos; os exemplos não são importados.");
    } catch (error) {
      toast.error(normalizeApiError(error, "Não foi possível baixar o modelo.").message);
    } finally {
      setBusy(null);
    }
  }

  async function loadPreview() {
    if (!file || !formReady) {
      toast.error("Selecione série, disciplina(s) e o arquivo preenchido.");
      return;
    }
    setBusy("preview");
    try {
      const data = await importQuestionsDocx(file, {
        gradeId,
        subjectIds: selectedSubjectIds,
      });
      if (!("questions" in data) || !Array.isArray(data.questions) || data.mode !== "preview") {
        throw new Error("Não foi possível gerar a pré-visualização.");
      }
      setPreview(data);
      setSelectedIndexes(new Set(data.questions.filter((question) => question.valid).map((question) => question.index)));
      setMarks(
        Object.fromEntries(
          data.questions.map((question) => [question.index, normalizeDictationMarks(question.dictationMarks)])
        )
      );
      if ((data.summary?.total ?? 0) === 0) {
        toast.error("O arquivo não contém questões reconhecíveis.");
      } else {
        toast.success(`${data.summary.valid} válida(s), ${data.summary.invalid} inválida(s).`);
      }
    } catch (error) {
      resetPreview();
      toast.error(normalizeApiError(error, "Não foi possível ler o arquivo.").message);
    } finally {
      setBusy(null);
    }
  }

  function toggleIndex(index: number, valid: boolean) {
    if (!valid) return;
    setSelectedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function commit() {
    if (!file || !preview || !formReady) return;
    if (selectedValidCount === 0) {
      toast.error("Marque ao menos uma questão válida para importar.");
      return;
    }
    const indexes = Array.from(selectedIndexes)
      .filter((index) => preview.questions.some((question) => question.index === index && question.valid))
      .sort((a, b) => a - b);

    setBusy("commit");
    try {
      const data = await importQuestionsDocx(file, {
        commit: true,
        gradeId,
        subjectIds: selectedSubjectIds,
        indexes,
        questions: indexes.map((index) => ({
          index,
          dictationMarks: marks[index] ?? normalizeDictationMarks(null),
        })),
      });
      if (!("created" in data) || data.mode !== "commit") {
        throw new Error("Não foi possível confirmar a importação.");
      }
      const created = data.summary.created ?? data.created.length;
      const failed = data.summary.failed ?? data.failed.length;
      if (created > 0) {
        toast.success(
          failed > 0
            ? `${created} importada(s), ${failed} falha(s).`
            : `${created} questão(ões) importada(s).`
        );
        router.push(ROUTES.ica.questoes.root);
        return;
      }
      toast.error(
        failed > 0
          ? `Todas as selecionadas falharam (${failed}).`
          : "Nenhuma questão foi importada. Revise o arquivo."
      );
    } catch (error) {
      toast.error(normalizeApiError(error, "Não foi possível confirmar a importação.").message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <PageShell>
      <PageHeader
        brand={ICA_BRAND}
        eyebrow="Banco de questões"
        title="Importar questões"
        description="Selecione série e disciplinas, baixe o modelo, confira o preview e importe só o que marcar."
        icon={FileInput}
      >
        <Button variant="outline" asChild>
          <Link href={ROUTES.ica.questoes.root}>
            <ArrowLeft className="h-4 w-4" />
            Banco de questões
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Contexto da importação</CardTitle>
          <CardDescription>
            A série é obrigatória. Informe a quantidade de questões por disciplina (máximo {MAX_COUNT} no total).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Série *</Label>
            <Select
              value={gradeId || undefined}
              onValueChange={(value) => {
                setGradeId(value);
                resetPreview();
              }}
              disabled={catalogLoading || busy != null}
            >
              <SelectTrigger className="h-10 max-w-md">
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
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Disciplinas *</Label>
            <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
              {catalogLoading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : (
                subjects.map((subject) => {
                  const checked = selectedSubjectIds.includes(subject.id);
                  return (
                    <label key={subject.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        disabled={busy != null}
                        onCheckedChange={() => toggleSubject(subject.id)}
                      />
                      {subject.name}
                    </label>
                  );
                })
              )}
            </div>
            {selectedSubjectIds.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {selectedSubjectIds.length} disciplina(s) selecionada(s)
              </p>
            ) : null}
          </div>

          {selectedSubjects.length > 0 ? (
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">Qtd. questões por disciplina *</Label>
              <div className="space-y-2 rounded-lg border p-3">
                {selectedSubjects.map((subject) => (
                  <div key={subject.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <span className="min-w-0 flex-1 truncate text-sm">{subject.name}</span>
                    <Input
                      type="number"
                      min={1}
                      max={MAX_COUNT}
                      step={1}
                      className="h-10 w-28"
                      disabled={busy != null}
                      value={countsBySubject[subject.id] ?? DEFAULT_COUNT}
                      onChange={(event) => setSubjectCount(subject.id, event.target.value)}
                      aria-label={`Quantidade de questões de ${subject.name}`}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Total: {totalQuestionCount} questão(ões)</p>
              {!countsWithinLimit ? (
                <p className="text-sm text-destructive">
                  O total de questões não pode passar de {MAX_COUNT}.
                </p>
              ) : null}
              {!countsValid && selectedSubjectIds.length > 0 ? (
                <p className="text-sm text-destructive">
                  Informe uma quantidade inteira ≥ 1 para cada disciplina.
                </p>
              ) : null}
            </div>
          ) : null}

          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Não apague as linhas === QUESTÃO === e === FIM ===.</li>
            <li>Os exemplos usam === EXEMPLO === e não entram na importação.</li>
            <li>Na múltipla escolha, marque [CORRETA] ou informe só a letra em Solução.</li>
            <li>Use Tipo: ditado ou produção escrita quando precisar desses formatos.</li>
          </ul>

          <Button onClick={() => void handleDownloadTemplate()} disabled={!templateReady || busy != null}>
            {busy === "template" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Baixar modelo
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Enviar o arquivo</CardTitle>
          <CardDescription>
            Envie o modelo preenchido. A série e as disciplinas acima valem como padrão e whitelist.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={cn(
              "rounded-lg border-2 border-dashed p-8 text-center transition-colors",
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              !formReady && "pointer-events-none opacity-60"
            )}
            onDragEnter={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setDragActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setDragActive(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setDragActive(false);
              const dropped = event.dataTransfer.files?.[0];
              if (dropped) handleFileSelect(dropped);
            }}
          >
            <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="mb-1 text-sm font-medium">Arraste o .docx aqui ou escolha um arquivo</p>
            <p className="mb-4 text-xs text-muted-foreground">Apenas arquivos Word (.docx)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept={DOCX_ACCEPT}
              className="hidden"
              disabled={busy != null}
              onChange={(event) => handleFileSelect(event.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!formReady || busy != null}
              onClick={() => fileInputRef.current?.click()}
            >
              Selecionar arquivo
            </Button>
            {file ? (
              <p className="mt-3 text-sm">
                Arquivo: <span className="font-medium">{file.name}</span>
              </p>
            ) : null}
          </div>

          <Button onClick={() => void loadPreview()} disabled={!file || !formReady || busy != null}>
            {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Pré-visualizar
          </Button>
        </CardContent>
      </Card>

      {preview && preview.summary.invalid > 0 ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{preview.summary.invalid} questão(ões) com problema</AlertTitle>
          <AlertDescription>
            Elas não entram na seleção. Corrija o arquivo e gere a prévia novamente.
          </AlertDescription>
        </Alert>
      ) : null}

      {preview ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">3. Preview e seleção</CardTitle>
              <CardDescription>
                Marque as questões válidas e, se quiser, ajuste o que o aplicador deve ler em voz alta.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy != null}
                onClick={() =>
                  setSelectedIndexes(
                    new Set(questions.filter((question) => question.valid).map((question) => question.index))
                  )
                }
              >
                Marcar válidas
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy != null}
                onClick={() => setSelectedIndexes(new Set())}
              >
                Limpar
              </Button>
            </CardContent>
          </Card>

          {missingCount ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{missingCount} selecionada(s) sem marcação de leitura</AlertTitle>
              <AlertDescription>
                Isso não impede a importação. Você pode ajustar agora ou depois na avaliação.
              </AlertDescription>
            </Alert>
          ) : null}

          {questions.map((question) => {
            const current = marks[question.index] ?? normalizeDictationMarks(question.dictationMarks);
            const model = previewModel(question, current);
            const checked = selectedIndexes.has(question.index);
            return (
              <Card key={question.index} className={cn(!question.valid && "opacity-80")}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      className="mt-1"
                      checked={checked}
                      disabled={!question.valid || busy != null}
                      onCheckedChange={() => toggleIndex(question.index, question.valid)}
                      aria-label={`Selecionar questão ${question.index}`}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <CardTitle className="text-base">Questão {question.index}</CardTitle>
                      <CardDescription>
                        {question.valid
                          ? checked
                            ? "Selecionada para importar."
                            : "Válida — desmarcada."
                          : "Com problema."}
                        {hasDictationMarks(current) ? " Com marcação de leitura." : " Sem marcação de leitura."}
                        {summarizeErrors(question.errors)}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
                  <QuestionPreview question={model} showMeta={false} />
                  <div className="rounded-xl border border-dashed bg-amber-50/40 p-3">
                    <DictationMarksEditor
                      value={current}
                      onChange={(value) => setMarks((items) => ({ ...items, [question.index]: value }))}
                      imageCount={extractImageSources(question.payload?.formattedText).length}
                      optionCount={model.options.length}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedValidCount} questão(ões) válida(s) selecionada(s) para importar
            </p>
            <Button onClick={() => void commit()} disabled={busy != null || selectedValidCount === 0}>
              {busy === "commit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Importar selecionadas
            </Button>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
