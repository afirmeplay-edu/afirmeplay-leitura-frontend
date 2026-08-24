"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, PlusCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  createEvaluation,
  getEvaluation,
  getReadingText,
  listReadingTexts,
  listWordLists,
  updateEvaluation,
  type EvaluationKind,
  type ReadingQuestion,
  type ReadingText,
  type WordList,
} from "@/lib/api/afirme-reading";
import {
  listClassesBySchool,
  listSchools,
  listStudentsByClass,
  type School,
  type SchoolClass,
  type Student,
} from "@/lib/api/students";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getKnownWordListId } from "@/lib/afirme-reading/evaluation-contract";
import { EDICAO_LABEL, EDICOES_ORDEM } from "@/lib/relatorios-fluencia/types";
import { AdminCityPicker } from "@/components/auth/admin-city-picker";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type WordListKindOption = "conhecidas" | "pouco-comuns";

function pickPreferredList(lists: WordList[]) {
  return (
    lists.find((list) => list.isDefault && list.active) ??
    lists.find((list) => list.active) ??
    lists[0] ??
    null
  );
}

export function CriarAvaliacaoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("id");
  const [cityReady, setCityReady] = useState(false);
  const [cityKey, setCityKey] = useState("none");

  const [title, setTitle] = useState("");
  const [evaluationKind, setEvaluationKind] = useState<EvaluationKind | "">("");

  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [knownLists, setKnownLists] = useState<WordList[]>([]);
  const [uncommonLists, setUncommonLists] = useState<WordList[]>([]);
  const [texts, setTexts] = useState<ReadingText[]>([]);
  const [questions, setQuestions] = useState<ReadingQuestion[]>([]);

  const [schoolId, setSchoolId] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [wordListKind, setWordListKind] = useState<WordListKindOption | "">("");
  const [wordListId, setWordListId] = useState("");
  const [textId, setTextId] = useState("");

  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedSchool = useMemo(
    () => schools.find((item) => item.id === schoolId) ?? null,
    [schools, schoolId]
  );
  const selectedClass = useMemo(
    () => classes.find((item) => item.id === classId) ?? null,
    [classes, classId]
  );
  const selectedStudent = useMemo(
    () => students.find((item) => item.id === studentId) ?? null,
    [students, studentId]
  );
  const selectedText = useMemo(
    () => texts.find((item) => item.id === textId) ?? null,
    [texts, textId]
  );
  const wordListKindLabel =
    wordListKind === "conhecidas"
      ? "Lista de Palavras Conhecidas"
      : wordListKind === "pouco-comuns"
        ? "Lista de Palavras pouco Comuns"
        : null;

  const handleCityReadyChange = useCallback((ready: boolean, cityId: string | null) => {
    setCityReady(ready);
    setCityKey(cityId || "none");
    if (!ready) {
      setSchools([]);
      setClasses([]);
      setStudents([]);
      setKnownLists([]);
      setUncommonLists([]);
      setTexts([]);
      setQuestions([]);
      setSchoolId("");
      setClassId("");
      setStudentId("");
      setWordListKind("");
      setWordListId("");
      setTextId("");
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    setLoadingSchools(true);
    setLoadingCatalog(true);
    try {
      const [schoolResult, knownResult, uncommonResult, textResult] = await Promise.allSettled([
        listSchools(),
        listWordLists({ kind: "PALAVRAS", active: true }),
        listWordLists({ kind: "POUCO_COMUNS", active: true }),
        listReadingTexts({ orderBy: "title" }),
      ]);

      const schoolData = schoolResult.status === "fulfilled" ? schoolResult.value : [];
      const palavras = knownResult.status === "fulfilled" ? knownResult.value : [];
      const poucoComuns = uncommonResult.status === "fulfilled" ? uncommonResult.value : [];
      const textData = textResult.status === "fulfilled" ? textResult.value : [];

      if (schoolResult.status === "rejected") {
        toast.error(getApiErrorMessage(schoolResult.reason, "Não foi possível carregar as escolas."));
      }
      if (knownResult.status === "rejected" || uncommonResult.status === "rejected") {
        toast.error("Não foi possível carregar as listas de palavras.");
      }
      if (textResult.status === "rejected") {
        toast.error(getApiErrorMessage(textResult.reason, "Não foi possível carregar os textos."));
      }

      setSchools(schoolData);
      setKnownLists(palavras);
      setUncommonLists(poucoComuns);
      setTexts(textData);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível carregar escolas, listas e textos."));
      setSchools([]);
      setKnownLists([]);
      setUncommonLists([]);
      setTexts([]);
    } finally {
      setLoadingSchools(false);
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    if (!cityReady || cityKey === "none") return;
    setSchoolId("");
    setClassId("");
    setStudentId("");
    setWordListKind("");
    setWordListId("");
    setTextId("");
    setClasses([]);
    setStudents([]);
    setQuestions([]);
    void loadCatalog();
  }, [cityReady, cityKey, loadCatalog]);

  useEffect(() => {
    if (!editingId || !cityReady || loadingCatalog) return;
    const evaluationId = editingId;
    let cancelled = false;
    async function load() {
      try {
        const evaluation = await getEvaluation(evaluationId);
        if (cancelled) return;
        setTitle(evaluation.title);
        const kind = evaluation.evaluationKind;
        if (kind) setEvaluationKind(kind);
        setTextId(evaluation.readingTextId);
        const knownId = getKnownWordListId(evaluation);
        if (knownId) {
          setWordListKind("conhecidas");
          setWordListId(knownId);
        } else if (evaluation.uncommonWordListId) {
          setWordListKind("pouco-comuns");
          setWordListId(evaluation.uncommonWordListId);
        }
        const nextSchool = evaluation.schoolIds?.[0] ?? evaluation.scope?.schools[0]?.id ?? "";
        const nextClass = evaluation.classIds?.[0] ?? evaluation.scope?.classes[0]?.id ?? "";
        const nextStudent = evaluation.studentIds?.[0] ?? evaluation.scope?.students[0]?.id ?? "";
        if (nextSchool) setSchoolId(nextSchool);
        if (nextClass) setClassId(nextClass);
        if (nextStudent) setStudentId(nextStudent);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Não foi possível carregar a avaliação para edição."));
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [editingId, cityReady, loadingCatalog]);

  useEffect(() => {
    if (!schoolId || !cityReady) {
      setClasses([]);
      if (!editingId) {
        setClassId("");
        setStudents([]);
        setStudentId("");
      }
      return;
    }

    let cancelled = false;
    async function load() {
      setLoadingClasses(true);
      try {
        const data = await listClassesBySchool(schoolId);
        if (!cancelled) setClasses(data);
      } catch (error) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, "Não foi possível carregar as turmas."));
          setClasses([]);
        }
      } finally {
        if (!cancelled) setLoadingClasses(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [schoolId, cityReady, editingId]);

  useEffect(() => {
    if (!classId || !cityReady) {
      setStudents([]);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoadingStudents(true);
      try {
        const data = await listStudentsByClass(classId);
        if (!cancelled) setStudents(data);
      } catch (error) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, "Não foi possível carregar os alunos."));
          setStudents([]);
        }
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [classId, cityReady]);

  useEffect(() => {
    if (!textId || !cityReady) {
      setQuestions([]);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoadingQuestions(true);
      try {
        const text = await getReadingText(textId);
        if (!cancelled) setQuestions(text.questions ?? []);
      } catch (error) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, "Não foi possível carregar as perguntas do texto."));
          setQuestions([]);
        }
      } finally {
        if (!cancelled) setLoadingQuestions(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [textId, cityReady]);

  const canSave = Boolean(
    cityReady &&
      title.trim() &&
      evaluationKind &&
      wordListKind &&
      wordListId &&
      textId &&
      !saving
  );

  async function handleSave() {
    if (!evaluationKind || !textId || !wordListKind || !wordListId) {
      toast.error("Preencha nome, tipo, a lista de palavras e o texto.");
      return;
    }

    const payload = {
      title: title.trim(),
      evaluationKind,
      readingTextId: textId,
      ...(wordListKind === "conhecidas"
        ? { wordsWordListId: wordListId, knownWordListId: wordListId }
        : { uncommonWordListId: wordListId }),
      schoolIds: selectedSchool ? [selectedSchool.id] : [],
      classIds: selectedClass ? [selectedClass.id] : [],
      studentIds: selectedStudent ? [selectedStudent.id] : [],
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateEvaluation(editingId, payload);
        toast.success("Avaliação atualizada com sucesso.");
      } else {
        await createEvaluation(payload);
        toast.success("Avaliação criada com sucesso.");
      }
      router.push("/app/avaliacao-fluencia/listar");
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          editingId ? "Não foi possível atualizar a avaliação." : "Não foi possível criar a avaliação."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        icon={PlusCircle}
        title={editingId ? "Editar Avaliação" : "Criar Avaliação"}
        description="Instrumento de fluência leitora: tipo, texto e lista de palavras."
      />

      <AdminCityPicker onCityReadyChange={handleCityReadyChange} />

      <Card>
        <CardContent className="grid gap-6 pt-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="nome-avaliacao">Nome da avaliação</Label>
            <Input
              id="nome-avaliacao"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Entrada 2º ano — 2026"
              disabled={!cityReady}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={evaluationKind || undefined}
              onValueChange={(value) => setEvaluationKind(value as EvaluationKind)}
              disabled={!cityReady}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {EDICOES_ORDEM.map((code) => (
                  <SelectItem key={code} value={code}>
                    {EDICAO_LABEL[code]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Escola</Label>
            <Select
              value={schoolId || undefined}
              onValueChange={(value) => {
                setSchoolId(value);
                setClassId("");
                setStudentId("");
              }}
              disabled={!cityReady || loadingSchools}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !cityReady
                      ? "Selecione o município primeiro"
                      : loadingSchools
                        ? "Carregando..."
                        : "Selecione a escola"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {schools.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Turma</Label>
            <Select
              value={classId || undefined}
              onValueChange={(value) => {
                setClassId(value);
                setStudentId("");
              }}
              disabled={!schoolId || loadingClasses}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !schoolId
                      ? "Selecione a escola primeiro"
                      : loadingClasses
                        ? "Carregando..."
                        : "Selecione a turma"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {classes.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Estudante</Label>
            <Select
              value={studentId || undefined}
              onValueChange={setStudentId}
              disabled={!classId || loadingStudents}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !classId
                      ? "Selecione a turma primeiro"
                      : loadingStudents
                        ? "Carregando..."
                        : "Selecione o estudante"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Lista de Palavras</Label>
            <Select
              value={wordListKind || undefined}
              onValueChange={(value) => {
                const nextKind = value as WordListKindOption;
                setWordListKind(nextKind);
                const lists = nextKind === "conhecidas" ? knownLists : uncommonLists;
                setWordListId(pickPreferredList(lists)?.id ?? "");
              }}
              disabled={!cityReady || loadingCatalog}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingCatalog ? "Carregando..." : "Selecione o tipo de lista"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conhecidas">Lista de Palavras Conhecidas</SelectItem>
                <SelectItem value="pouco-comuns">Lista de Palavras pouco Comuns</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Textos e perguntas</Label>
            <Select
              value={textId || undefined}
              onValueChange={setTextId}
              disabled={!cityReady || loadingCatalog}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingCatalog ? "Carregando textos..." : "Selecione o texto"}
                />
              </SelectTrigger>
              <SelectContent>
                {texts.map((text) => (
                  <SelectItem key={text.id} value={text.id}>
                    {text.title}
                    {text.source ? ` — ${text.source}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {textId ? (
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                {loadingQuestions ? (
                  <p className="text-muted-foreground">Carregando perguntas...</p>
                ) : questions.length === 0 ? (
                  <p className="text-muted-foreground">
                    Este texto ainda não tem perguntas cadastradas. Você pode incluí-las em Configurar
                    avaliação.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {questions.map((question, index) => (
                      <li key={question.id}>
                        <span className="font-medium">{index + 1}.</span> {question.statement}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                A avaliação inclui texto narrativo, compreensão e a lista de palavras escolhida.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {title.trim() || evaluationKind || selectedText ? (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <span className="font-medium">Instrumento: </span>
          {title.trim() ? `${title.trim()} · ` : null}
          {evaluationKind ? `${EDICAO_LABEL[evaluationKind]} · ` : null}
          {selectedText ? `Texto: ${selectedText.title}` : "Selecione o texto"}
          {wordListKindLabel ? ` · ${wordListKindLabel}` : null}
          {selectedStudent && selectedClass && selectedSchool
            ? ` · ${selectedStudent.name} — ${selectedClass.name} — ${selectedSchool.name}`
            : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href="/app/configuracao-avaliacao">Configurar listas, textos e perguntas</Link>
        </Button>
        <Button variant="ghost" asChild className="w-full sm:w-auto">
          <Link href="/app/avaliacao-fluencia/listar">← Listar Avaliação</Link>
        </Button>
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto"
          disabled={!canSave}
          onClick={() => void handleSave()}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {editingId ? "Salvando..." : "Criando avaliação..."}
            </>
          ) : editingId ? (
            "Salvar alterações"
          ) : (
            "Criar Avaliação"
          )}
        </Button>
      </div>
    </div>
  );
}
