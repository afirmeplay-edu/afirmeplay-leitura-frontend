"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Gauge, Info, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  createFluencySession,
  listReadingTexts,
  listWordLists,
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
import { AdminCityPicker } from "@/components/auth/admin-city-picker";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parsePracticeActivityTab } from "@/components/fluencia/practice-tabs";

function pickPreferredList(lists: WordList[]) {
  return (
    lists.find((list) => list.isDefault && list.active) ??
    lists.find((list) => list.active) ??
    lists[0] ??
    null
  );
}

interface FluenciaSelecaoProps {
  variant?: "oficial" | "praticar";
}

export function FluenciaSelecao({ variant = "oficial" }: FluenciaSelecaoProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPractice = variant === "praticar";
  const [cityReady, setCityReady] = useState(false);
  const [cityKey, setCityKey] = useState("none");

  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [texts, setTexts] = useState<ReadingText[]>([]);
  const [wordsList, setWordsList] = useState<WordList | null>(null);
  const [uncommonList, setUncommonList] = useState<WordList | null>(null);

  const [schoolId, setSchoolId] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [textId, setTextId] = useState("");

  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingTexts, setLoadingTexts] = useState(false);
  const [creating, setCreating] = useState(false);

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
  const practiceTab = parsePracticeActivityTab(searchParams.get("aba"));
  const hideNarrativeText =
    isPractice && (practiceTab === "palavras" || practiceTab === "pouco-comuns");
  const textForSession = hideNarrativeText ? (texts[0] ?? null) : selectedText;

  const handleCityReadyChange = useCallback((ready: boolean, cityId: string | null) => {
    setCityReady(ready);
    setCityKey(cityId || "none");
    if (!ready) {
      setSchools([]);
      setClasses([]);
      setStudents([]);
      setTexts([]);
      setWordsList(null);
      setUncommonList(null);
      setSchoolId("");
      setClassId("");
      setStudentId("");
      setTextId("");
    }
  }, []);

  const loadBase = useCallback(async () => {
    setLoadingSchools(true);
    setLoadingTexts(true);
    try {
      const [schoolData, textData, palavras, poucoComuns] = await Promise.all([
        listSchools(),
        listReadingTexts({ orderBy: "title" }),
        listWordLists({ kind: "PALAVRAS", active: true }),
        listWordLists({ kind: "POUCO_COMUNS", active: true }),
      ]);
      setSchools(schoolData);
      setTexts(textData);
      setWordsList(pickPreferredList(palavras));
      setUncommonList(pickPreferredList(poucoComuns));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível carregar escolas/textos/listas."));
      setSchools([]);
      setTexts([]);
      setWordsList(null);
      setUncommonList(null);
    } finally {
      setLoadingSchools(false);
      setLoadingTexts(false);
    }
  }, []);

  useEffect(() => {
    if (!cityReady) return;
    setSchoolId("");
    setClassId("");
    setStudentId("");
    setTextId("");
    setClasses([]);
    setStudents([]);
    void loadBase();
  }, [cityReady, cityKey, loadBase]);

  useEffect(() => {
    if (!schoolId || !cityReady) {
      setClasses([]);
      setClassId("");
      setStudents([]);
      setStudentId("");
      return;
    }

    let cancelled = false;
    async function load() {
      setLoadingClasses(true);
      setClassId("");
      setStudentId("");
      setStudents([]);
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
  }, [schoolId, cityReady]);

  useEffect(() => {
    if (!classId || !cityReady) {
      setStudents([]);
      setStudentId("");
      return;
    }

    let cancelled = false;
    async function load() {
      setLoadingStudents(true);
      setStudentId("");
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

  const canStart = Boolean(
    cityReady &&
      schoolId &&
      classId &&
      studentId &&
      (hideNarrativeText ? texts.length > 0 : textId) &&
      !creating
  );

  async function handleStart() {
    if (!selectedSchool || !selectedClass || !selectedStudent) {
      toast.error("Selecione escola, turma e estudante.");
      return;
    }
    if (!textForSession) {
      toast.error(
        hideNarrativeText
          ? "Não há texto cadastrado para criar a sessão. Cadastre um texto em Configurar."
          : "Selecione o texto narrativo."
      );
      return;
    }

    setCreating(true);
    try {
      const session = await createFluencySession({
        studentId: selectedStudent.id,
        classId: selectedClass.id,
        schoolId: selectedSchool.id,
        readingTextId: textForSession.id,
        wordsWordListId: wordsList?.id ?? null,
        uncommonWordListId: uncommonList?.id ?? null,
        caderno: "A",
      });

      const aba = practiceTab ?? "palavras";
      const params = new URLSearchParams({
        sessionId: session.id,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        classId: selectedClass.id,
        className: selectedClass.name,
        schoolId: selectedSchool.id,
        schoolName: selectedSchool.name,
        readingTextId: textForSession.id,
        textTitle: textForSession.title,
        wordsWordListId: session.wordsWordListId ?? wordsList?.id ?? "",
        uncommonWordListId: session.uncommonWordListId ?? uncommonList?.id ?? "",
        caderno: session.caderno || "A",
      });

      if (isPractice) {
        params.set("aba", aba);
        router.push(`/app/avaliacao-leitura-guiada?${params.toString()}`);
      } else {
        router.push(`/app/avaliacao-fluencia/aplicar?${params.toString()}`);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível criar a sessão de fluência."));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Compromisso Criança Alfabetizada · ICA"
        title={isPractice ? "Praticar Avaliação de Fluência" : "Avaliação de Fluência Leitora"}
        description={
          isPractice
            ? hideNarrativeText
              ? "Escolha o estudante para iniciar a prática da lista de palavras."
              : "Escolha o estudante e o texto para praticar a leitura do texto narrativo."
            : "Aplicação individual para o 2º ano, com gravação de áudio e marcação manual pelo professor."
        }
        icon={Gauge}
      />

      <Alert className="border-l-4 border-l-bluebrand-base">
        <Info className="h-4 w-4 text-bluebrand-base" />
        <AlertDescription className="space-y-2 text-sm">
          <p className="font-medium">{isPractice ? "Sobre esta prática" : "Sobre esta avaliação"}</p>
          <p>
            {isPractice
              ? "Pratique lista de palavras conhecidas, palavras pouco conhecidas e texto narrativo. O professor ouve o áudio e marca manualmente."
              : "Avaliação individual do 2º ano do Ensino Fundamental. São 3 questões: lista de palavras, lista de palavras pouco comuns e leitura de texto narrativo com perguntas de compreensão. O professor ouve a gravação e classifica cada palavra."}
          </p>
          <p>
            {isPractice
              ? "Tempo: 60 segundos para cada lista de palavras."
              : "Tempo: 60 segundos para cada lista. Ao final, é gerado o Leiturômetro com a classificação ICA."}
          </p>
        </AlertDescription>
      </Alert>

      <AdminCityPicker onCityReadyChange={handleCityReadyChange} />

      <Card>
        <CardContent className="grid gap-6 pt-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Escola</Label>
            <Select
              value={schoolId || undefined}
              onValueChange={setSchoolId}
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
              onValueChange={setClassId}
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

          {hideNarrativeText ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {practiceTab === "palavras" && wordsList
                  ? `Lista: ${wordsList.name}.`
                  : null}
                {practiceTab === "pouco-comuns" && uncommonList
                  ? `Lista: ${uncommonList.name}.`
                  : null}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Texto narrativo (Questão 3)</Label>
              <Select
                value={textId || undefined}
                onValueChange={setTextId}
                disabled={!cityReady || loadingTexts}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={loadingTexts ? "Carregando textos..." : "Selecione o texto"}
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
              <p className="text-xs text-muted-foreground">
                Você pode cadastrar novos textos em Configurar.
                {wordsList ? ` Lista Q1: ${wordsList.name}.` : null}
                {uncommonList ? ` Lista Q2: ${uncommonList.name}.` : null}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStudent && selectedClass && selectedSchool ? (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <span className="font-medium">Aluno selecionado: </span>
          {selectedStudent.name} — {selectedClass.name} — {selectedSchool.name}
          {!hideNarrativeText && selectedText ? ` · Texto: ${selectedText.title}` : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href="/app/configuracao-avaliacao">Configurar listas, textos e perguntas</Link>
        </Button>
        {isPractice ? (
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/app/revisao-leitura-guiada">Revisão e áudio</Link>
          </Button>
        ) : null}
        <Button variant="ghost" asChild className="w-full sm:w-auto">
          <Link href="/app">← Início</Link>
        </Button>
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto"
          disabled={!canStart}
          onClick={() => void handleStart()}
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Criando sessão...
            </>
          ) : isPractice ? (
            "Iniciar prática →"
          ) : (
            "Iniciar Avaliação de Fluência →"
          )}
        </Button>
      </div>
    </div>
  );
}
