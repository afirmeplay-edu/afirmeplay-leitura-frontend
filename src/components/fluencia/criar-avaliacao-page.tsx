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
  listReadingTextsByGradeIds,
  listWordLists,
  updateEvaluation,
  type EvaluationKind,
  type ReadingQuestion,
  type ReadingText,
  type WordList,
} from "@/lib/api/afirme-reading";
import { listGrades } from "@/lib/api/grades";
import {
  listClassesBySchool,
  listSchools,
  type School,
  type SchoolClass,
} from "@/lib/api/students";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getKnownWordListId } from "@/lib/afirme-reading/evaluation-contract";
import { classMatchesAnyGrade } from "@/lib/fluencia/class-label";
import { EDICAO_LABEL, EDICOES_ORDEM } from "@/lib/relatorios-fluencia/types";
import { cn } from "@/lib/utils";
import { AdminCityPicker } from "@/components/auth/admin-city-picker";
import { PageHeader } from "@/components/layout/page-header";
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
import type { Grade } from "@/lib/api/afirme-reading/types";

function defaultTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
  } catch {
    return "America/Sao_Paulo";
  }
}

const SELECT_EMPTY = "__empty__";

function listOptionLabel(list: WordList) {
  const grade = list.grade?.name ? ` — ${list.grade.name}` : "";
  const fallback = list.isDefault ? " (padrão)" : "";
  return `${list.name}${grade}${fallback}`;
}

function selectValue(value: string) {
  return value || SELECT_EMPTY;
}

export function CriarAvaliacaoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("id");
  const [cityReady, setCityReady] = useState(false);
  const [cityKey, setCityKey] = useState("none");

  const [title, setTitle] = useState("");
  const [evaluationKind, setEvaluationKind] = useState<EvaluationKind | "">("");

  const [grades, setGrades] = useState<Grade[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [knownLists, setKnownLists] = useState<WordList[]>([]);
  const [uncommonLists, setUncommonLists] = useState<WordList[]>([]);
  const [texts, setTexts] = useState<ReadingText[]>([]);
  const [questions, setQuestions] = useState<ReadingQuestion[]>([]);

  const [gradeIds, setGradeIds] = useState<string[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [classIds, setClassIds] = useState<string[]>([]);
  const [knownWordListId, setKnownWordListId] = useState("");
  const [uncommonWordListId, setUncommonWordListId] = useState("");
  const [textId, setTextId] = useState("");

  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedGrades = useMemo(
    () => grades.filter((item) => gradeIds.includes(item.id)),
    [grades, gradeIds]
  );
  const selectedSchool = useMemo(
    () => schools.find((item) => item.id === schoolId) ?? null,
    [schools, schoolId]
  );
  const selectedText = useMemo(
    () => texts.find((item) => item.id === textId) ?? null,
    [texts, textId]
  );
  const selectedKnownList = useMemo(
    () => knownLists.find((item) => item.id === knownWordListId) ?? null,
    [knownLists, knownWordListId]
  );
  const selectedUncommonList = useMemo(
    () => uncommonLists.find((item) => item.id === uncommonWordListId) ?? null,
    [uncommonLists, uncommonWordListId]
  );
  const visibleClasses = useMemo(
    () => classes.filter((item) => classMatchesAnyGrade(item, selectedGrades)),
    [classes, selectedGrades]
  );
  const selectedClassNames = useMemo(
    () =>
      visibleClasses
        .filter((item) => classIds.includes(item.id))
        .map((item) => item.name),
    [visibleClasses, classIds]
  );

  const handleCityReadyChange = useCallback((ready: boolean, cityId: string | null) => {
    setCityReady(ready);
    setCityKey(cityId || "none");
    if (!ready) {
      setSchools([]);
      setClasses([]);
      setGrades([]);
      setKnownLists([]);
      setUncommonLists([]);
      setTexts([]);
      setQuestions([]);
      setSchoolId("");
      setGradeIds([]);
      setClassIds([]);
      setKnownWordListId("");
      setUncommonWordListId("");
      setTextId("");
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    setLoadingSchools(true);
    setLoadingCatalog(true);
    try {
      const [schoolResult, gradeResult] = await Promise.allSettled([
        listSchools(),
        listGrades(),
      ]);

      const schoolData = schoolResult.status === "fulfilled" ? schoolResult.value : [];
      const gradeData = gradeResult.status === "fulfilled" ? gradeResult.value : [];

      if (schoolResult.status === "rejected") {
        toast.error(getApiErrorMessage(schoolResult.reason, "Não foi possível carregar as escolas."));
      }
      if (gradeResult.status === "rejected") {
        toast.error(getApiErrorMessage(gradeResult.reason, "Não foi possível carregar as séries."));
      }

      setSchools(schoolData);
      setGrades(Array.isArray(gradeData) ? gradeData : []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível carregar escolas e séries."));
      setSchools([]);
      setGrades([]);
    } finally {
      setLoadingSchools(false);
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    if (!cityReady || cityKey === "none") return;
    setSchoolId("");
    setGradeIds([]);
    setClassIds([]);
    setKnownWordListId("");
    setUncommonWordListId("");
    setTextId("");
    setClasses([]);
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
        if (knownId) setKnownWordListId(knownId);
        if (evaluation.uncommonWordListId) setUncommonWordListId(evaluation.uncommonWordListId);
        const nextGrades = [
          ...new Set(
            [
              ...(evaluation.gradeIds ?? []),
              evaluation.gradeId,
              evaluation.scope?.grade?.id,
              ...(evaluation.grades?.map((item) => item.id) ?? []),
              ...(evaluation.scope?.classes.map((item) => item.gradeId) ?? []),
            ].filter((id): id is string => Boolean(id))
          ),
        ];
        const nextSchool = evaluation.schoolIds?.[0] ?? evaluation.scope?.schools[0]?.id ?? "";
        const nextClasses =
          evaluation.classIds?.length
            ? evaluation.classIds
            : (evaluation.scope?.classes.map((item) => item.id) ?? []);
        if (nextGrades.length) setGradeIds(nextGrades);
        if (nextSchool) setSchoolId(nextSchool);
        if (nextClasses.length) setClassIds(nextClasses);
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
        setGradeIds([]);
        setClassIds([]);
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

  const gradeIdsKey = gradeIds.join(",");

  useEffect(() => {
    if (!cityReady) return;
    if (!gradeIds.length) {
      setTexts([]);
      setTextId("");
      setQuestions([]);
      setKnownLists([]);
      setUncommonLists([]);
      setKnownWordListId("");
      setUncommonWordListId("");
      setLoadingMaterials(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoadingMaterials(true);
      try {
        const [textResult, knownResult, uncommonResult] = await Promise.allSettled([
          listReadingTextsByGradeIds(gradeIds),
          listWordLists({ kind: "PALAVRAS", active: true, gradeIds }),
          listWordLists({ kind: "POUCO_COMUNS", active: true, gradeIds }),
        ]);
        if (cancelled) return;

        const textData = textResult.status === "fulfilled" ? textResult.value : [];
        const palavras = knownResult.status === "fulfilled" ? knownResult.value : [];
        const poucoComuns = uncommonResult.status === "fulfilled" ? uncommonResult.value : [];

        if (textResult.status === "rejected") {
          toast.error(getApiErrorMessage(textResult.reason, "Não foi possível carregar os textos da série."));
        }
        if (knownResult.status === "rejected" || uncommonResult.status === "rejected") {
          toast.error("Não foi possível carregar as listas de palavras da série.");
        }

        setTexts(textData);
        setTextId((current) => (current && textData.some((item) => item.id === current) ? current : ""));
        setKnownLists(palavras);
        setUncommonLists(poucoComuns);
        setKnownWordListId((current) =>
          current && palavras.some((item) => item.id === current) ? current : ""
        );
        setUncommonWordListId((current) =>
          current && poucoComuns.some((item) => item.id === current) ? current : ""
        );
      } catch (error) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, "Não foi possível carregar textos e listas da série."));
          setTexts([]);
          setTextId("");
          setKnownLists([]);
          setUncommonLists([]);
          setKnownWordListId("");
          setUncommonWordListId("");
        }
      } finally {
        if (!cancelled) setLoadingMaterials(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [cityReady, cityKey, gradeIdsKey, gradeIds]);

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
      schoolId &&
      gradeIds.length > 0 &&
      classIds.length > 0 &&
      knownWordListId &&
      uncommonWordListId &&
      textId &&
      !saving
  );

  function toggleId(list: string[], id: string, checked: boolean) {
    return checked ? [...list, id] : list.filter((item) => item !== id);
  }

  function toggleGrade(id: string, checked: boolean) {
    setGradeIds((current) => {
      const next = toggleId(current, id, checked);
      const remaining = grades.filter((grade) => next.includes(grade.id));
      setClassIds((selected) =>
        selected.filter((classId) => {
          const item = classes.find((entry) => entry.id === classId);
          return item ? classMatchesAnyGrade(item, remaining) : false;
        })
      );
      return next;
    });
  }

  function toggleClass(id: string, checked: boolean) {
    setClassIds((current) => toggleId(current, id, checked));
  }

  function setAllVisibleClasses(checked: boolean) {
    setClassIds(checked ? visibleClasses.map((item) => item.id) : []);
  }

  function setAllGrades(checked: boolean) {
    if (!checked) {
      setGradeIds([]);
      setClassIds([]);
      return;
    }
    setGradeIds(grades.map((item) => item.id));
  }

  async function handleSave() {
    if (
      !evaluationKind ||
      !textId ||
      !schoolId ||
      !gradeIds.length ||
      !classIds.length ||
      !knownWordListId ||
      !uncommonWordListId
    ) {
      toast.error("Preencha nome, tipo, escola, ao menos uma série, ao menos uma turma, as duas listas e o texto.");
      return;
    }

    const payload = {
      title: title.trim(),
      evaluationKind,
      readingTextId: textId,
      knownWordListId,
      wordsWordListId: knownWordListId,
      uncommonWordListId,
      gradeIds,
      gradeId: gradeIds[0],
      schoolIds: [schoolId],
      classIds,
      timezone: defaultTimezone(),
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
        description="Instrumento de fluência leitora: escola, séries, turmas, texto e as duas listas de palavras."
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
              value={selectValue(evaluationKind)}
              onValueChange={(value) => {
                if (value === SELECT_EMPTY) return;
                setEvaluationKind(value as EvaluationKind);
              }}
              disabled={!cityReady}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_EMPTY} disabled className="hidden">
                  Selecione o tipo
                </SelectItem>
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
              value={selectValue(schoolId)}
              onValueChange={(value) => {
                if (value === SELECT_EMPTY) return;
                setSchoolId(value);
                setGradeIds([]);
                setClassIds([]);
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
                <SelectItem value={SELECT_EMPTY} disabled className="hidden">
                  Selecione a escola
                </SelectItem>
                {schools.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Séries</Label>
              {schoolId && grades.length > 0 ? (
                <button
                  type="button"
                  className="text-xs text-primary underline-offset-2 hover:underline"
                  onClick={() => setAllGrades(gradeIds.length !== grades.length)}
                >
                  {gradeIds.length === grades.length ? "Limpar" : "Selecionar todas"}
                </button>
              ) : null}
            </div>
            <div className="max-h-48 overflow-auto rounded-md border bg-muted/20 px-2 py-2">
              {!schoolId ? (
                <p className="px-1 text-sm text-muted-foreground">
                  Selecione a escola para listar as séries.
                </p>
              ) : loadingCatalog ? (
                <p className="px-1 text-sm text-muted-foreground">Carregando séries...</p>
              ) : grades.length === 0 ? (
                <p className="px-1 text-sm text-muted-foreground">Nenhuma série cadastrada.</p>
              ) : (
                <ul className="grid gap-1 sm:grid-cols-2">
                  {grades.map((grade) => {
                    const checked = gradeIds.includes(grade.id);
                    return (
                      <li key={grade.id}>
                        <label
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                            checked ? "bg-primary/10 text-foreground" : "hover:bg-muted/60"
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => toggleGrade(grade.id, value === true)}
                          />
                          <span>{grade.name}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Selecione uma ou mais séries.</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Turmas</Label>
              {visibleClasses.length > 0 ? (
                <button
                  type="button"
                  className="text-xs text-primary underline-offset-2 hover:underline"
                  onClick={() =>
                    setAllVisibleClasses(classIds.length !== visibleClasses.length)
                  }
                >
                  {classIds.length === visibleClasses.length
                    ? "Limpar"
                    : "Selecionar todas"}
                </button>
              ) : null}
            </div>
            <div className="max-h-56 overflow-auto rounded-md border bg-muted/20 px-2 py-2">
              {!schoolId || gradeIds.length === 0 ? (
                <p className="px-1 text-sm text-muted-foreground">
                  Selecione a escola e ao menos uma série para listar as turmas.
                </p>
              ) : loadingClasses ? (
                <p className="px-1 text-sm text-muted-foreground">Carregando turmas...</p>
              ) : visibleClasses.length === 0 ? (
                <p className="px-1 text-sm text-muted-foreground">
                  Nenhuma turma destas séries nesta escola.
                </p>
              ) : (
                <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleClasses.map((item) => {
                    const checked = classIds.includes(item.id);
                    return (
                      <li key={item.id}>
                        <label
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                            checked ? "bg-primary/10 text-foreground" : "hover:bg-muted/60"
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => toggleClass(item.id, value === true)}
                          />
                          <span>{item.name}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              A avaliação é criada para uma ou mais turmas. O aluno é escolhido na hora de aplicar.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Lista de palavras conhecidas</Label>
            <Select
              value={selectValue(knownWordListId)}
              onValueChange={(value) => {
                if (value === SELECT_EMPTY) return;
                setKnownWordListId(value);
              }}
              disabled={!cityReady || loadingMaterials || gradeIds.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    gradeIds.length === 0
                      ? "Selecione a série primeiro"
                      : loadingMaterials
                        ? "Carregando..."
                        : "Selecione a lista de conhecidas"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_EMPTY} disabled className="hidden">
                  Selecione a lista de conhecidas
                </SelectItem>
                {knownLists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {listOptionLabel(list)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Lista de palavras pouco comuns</Label>
            <Select
              value={selectValue(uncommonWordListId)}
              onValueChange={(value) => {
                if (value === SELECT_EMPTY) return;
                setUncommonWordListId(value);
              }}
              disabled={!cityReady || loadingMaterials || gradeIds.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    gradeIds.length === 0
                      ? "Selecione a série primeiro"
                      : loadingMaterials
                        ? "Carregando..."
                        : "Selecione a lista de pouco comuns"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_EMPTY} disabled className="hidden">
                  Selecione a lista de pouco comuns
                </SelectItem>
                {uncommonLists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {listOptionLabel(list)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Textos e perguntas</Label>
            <Select
              value={selectValue(textId)}
              onValueChange={(value) => {
                if (value === SELECT_EMPTY) return;
                setTextId(value);
              }}
              disabled={!cityReady || loadingMaterials || gradeIds.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    gradeIds.length === 0
                      ? "Selecione a série primeiro"
                      : loadingMaterials
                        ? "Carregando textos da série..."
                        : "Selecione o texto"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_EMPTY} disabled className="hidden">
                  Selecione o texto
                </SelectItem>
                {texts.map((text) => (
                  <SelectItem key={text.id} value={text.id}>
                    {text.title}
                    {text.grade?.name ? ` — ${text.grade.name}` : ""}
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
                {gradeIds.length === 0
                  ? "Selecione a série para listar os textos daquela série."
                  : "A avaliação inclui texto narrativo, compreensão e as duas listas de palavras."}
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
          {selectedGrades.length ? `${selectedGrades.map((item) => item.name).join(", ")} · ` : null}
          {selectedText ? `Texto: ${selectedText.title}` : "Selecione o texto"}
          {selectedKnownList ? ` · Q1 ${selectedKnownList.name}` : null}
          {selectedUncommonList ? ` · Q2 ${selectedUncommonList.name}` : null}
          {selectedSchool && selectedClassNames.length
            ? ` · ${selectedSchool.name} — ${selectedClassNames.join(", ")}`
            : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href="/app/cadastros">Cadastrar listas, textos e perguntas</Link>
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
