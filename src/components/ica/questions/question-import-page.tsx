"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileInput, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { importQuestionsDocx } from "@/lib/api/afirme-reading/questions";
import type {
  BankQuestion,
  DictationMarks,
  ImportedDocxQuestion,
  QuestionDocxImportCommitResult,
  QuestionDocxImportPreview,
} from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import { ROUTES } from "@/config/routes";
import { canWriteIca } from "@/lib/auth/roles";
import { useQuestionCatalog } from "@/hooks/use-question-catalog";
import { hasDictationMarks, normalizeDictationMarks } from "@/lib/ica/dictation-marks";
import { extractImageSources } from "@/lib/ica/question-html";
import { toPreviewModel } from "@/lib/ica/questions";
import { RoleGuard } from "@/components/auth/role-guard";
import { IcaCityScope } from "@/components/ica/ica-city-scope";
import { DictationMarksEditor } from "@/components/ica/questions/dictation-marks-editor";
import { QuestionPreview } from "@/components/ica/questions/question-preview";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ICA_BRAND } from "@/lib/ica/brand";

const DOCX_ACCEPT = ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

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
  const { subjects, grades, loading: catalogLoading } = useQuestionCatalog();
  const [file, setFile] = useState<File | null>(null);
  const [gradeId, setGradeId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [preview, setPreview] = useState<QuestionDocxImportPreview | null>(null);
  const [marks, setMarks] = useState<Record<number, DictationMarks>>({});
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [result, setResult] = useState<QuestionDocxImportCommitResult | null>(null);

  const questions = useMemo(() => preview?.questions ?? [], [preview]);
  const importable = questions.filter((question) => question.valid);
  const missingCount = useMemo(
    () => importable.filter((question) => !hasDictationMarks(marks[question.index])).length,
    [importable, marks]
  );

  async function loadPreview() {
    if (!file) {
      toast.error("Selecione um arquivo DOCX.");
      return;
    }
    if (!gradeId || !subjectId) {
      toast.error("Selecione a série e a disciplina padrão.");
      return;
    }
    setBusy("preview");
    setResult(null);
    try {
      const data = await importQuestionsDocx(file, { gradeId, subjectId });
      if (!("questions" in data) || !Array.isArray(data.questions) || data.mode !== "preview") {
        throw new Error("O servidor não retornou a pré-visualização esperada.");
      }
      setPreview(data);
      setMarks(
        Object.fromEntries(data.questions.map((question) => [question.index, normalizeDictationMarks(question.dictationMarks)]))
      );
    } catch (error) {
      toast.error(normalizeApiError(error, "Não foi possível ler o DOCX.").message);
    } finally {
      setBusy(null);
    }
  }

  async function commit() {
    if (!file || !preview || !gradeId || !subjectId) return;
    if (!importable.length) {
      toast.error("Nenhuma questão válida para importar.");
      return;
    }
    setBusy("commit");
    try {
      const data = await importQuestionsDocx(file, {
        commit: true,
        gradeId,
        subjectId,
        indexes: importable.map((question) => question.index),
        questions: importable.map((question) => ({
          index: question.index,
          dictationMarks: marks[question.index] ?? normalizeDictationMarks(null),
        })),
      });
      if ("created" in data && data.mode === "commit") {
        setResult(data);
        toast.success(`${data.summary.created ?? data.created.length} questão(ões) importada(s).`);
      } else {
        throw new Error("O servidor não confirmou a importação.");
      }
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
        description="Envie um DOCX, confira as questões e ajuste o que o aplicador deverá ler."
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
          <CardTitle className="text-base">Arquivo DOCX</CardTitle>
          <CardDescription>Use [DITAR] ou a linha “Ditar:” no documento para trazer marcações automaticamente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Série padrão</Label>
              <Select value={gradeId} onValueChange={setGradeId} disabled={catalogLoading || busy != null}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Selecione a série" /></SelectTrigger>
                <SelectContent>
                  {grades.map((grade) => (
                    <SelectItem key={grade.id} value={grade.id}>{grade.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Disciplina padrão</Label>
              <Select value={subjectId} onValueChange={setSubjectId} disabled={catalogLoading || busy != null}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Selecione a disciplina" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept={DOCX_ACCEPT}
            disabled={busy != null}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setPreview(null);
              setResult(null);
            }}
            className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2"
          />
          <Button onClick={() => void loadPreview()} disabled={!file || busy != null}>
            {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Pré-visualizar
          </Button>
          </div>
        </CardContent>
      </Card>

      {preview && preview.summary.invalid > 0 ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{preview.summary.invalid} questão(ões) inválida(s)</AlertTitle>
          <AlertDescription>Elas não entram na importação. Corrija o DOCX ou os dados padrão e gere a prévia novamente.</AlertDescription>
        </Alert>
      ) : null}

      {preview ? (
        <div className="space-y-4">
          {missingCount ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{missingCount} questão(ões) sem marcação de megafone</AlertTitle>
              <AlertDescription>
                Isso não impede a importação. Marque as partes abaixo agora ou ajuste depois no montador da avaliação.
              </AlertDescription>
            </Alert>
          ) : null}

          {questions.map((question) => {
            const current = marks[question.index] ?? normalizeDictationMarks(question.dictationMarks);
            const model = previewModel(question, current);
            return (
              <Card key={question.index}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Questão {question.index}</CardTitle>
                  <CardDescription>
                    {question.valid ? "Válida. " : "Inválida. "}
                    {hasDictationMarks(current) ? "Com marcação de leitura." : "Sem marcação de leitura."}
                    {question.errors?.length ? ` ${question.errors.join(" ")}` : ""}
                  </CardDescription>
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

          <div className="flex justify-end">
            <Button onClick={() => void commit()} disabled={busy != null || importable.length === 0}>
              {busy === "commit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirmar importação
            </Button>
          </div>
        </div>
      ) : null}

      {result ? (
        <Alert className="border-emerald-300 bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <AlertTitle>Importação concluída</AlertTitle>
          <AlertDescription>
            {`${result.summary.created ?? result.created.length} questão(ões) adicionada(s) ao banco.`}{" "}
            <Link href={ROUTES.ica.questoes.root} className="font-medium underline">
              Ver banco de questões
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}
    </PageShell>
  );
}
