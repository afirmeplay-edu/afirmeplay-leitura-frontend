"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, Gauge, Info, Loader2, Play } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  createFluencySession,
  getEvaluation,
  getEvaluationApplicants,
  getFluencySession,
  listEvaluations,
  listReadingTexts,
  listWordLists,
  type EvaluationApplicantClass,
  type EvaluationApplicantStudent,
  type EvaluationApplicants,
  type FluencySession,
  type ReadingEvaluation,
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
import { getApiErrorBody, getApiErrorMessage, getApiErrorStatus } from "@/lib/api/errors";
import {
  canApplyEvaluation,
  getEvaluationKindLabel,
  getKnownWordListId,
} from "@/lib/afirme-reading/evaluation-contract";
import { fluencyAplicarHref } from "@/lib/fluencia/aplicar-href";
import { useAuthStore } from "@/stores/auth-store";
import { AdminCityPicker } from "@/components/auth/admin-city-picker";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

function asEvaluationList(data: unknown): ReadingEvaluation[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const record = data as { items?: unknown; data?: unknown };
    if (Array.isArray(record.items)) return record.items as ReadingEvaluation[];
    if (Array.isArray(record.data)) return record.data as ReadingEvaluation[];
  }
  return [];
}

function applicationStatusLabel(student: EvaluationApplicantStudent) {
  const status = student.application?.status;
  if (!status) return "Não iniciado";
  if (status === "em_andamento") return "Em andamento";
  if (status === "finalizada") return "Finalizada";
  if (status === "ausente") return "Ausente";
  return status;
}

interface FluenciaSelecaoProps {
  variant?: "oficial" | "praticar";
}

export function FluenciaSelecao({ variant = "oficial" }: FluenciaSelecaoProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const isPractice = variant === "praticar";
  const [cityReady, setCityReady] = useState(false);
  const [cityKey, setCityKey] = useState("none");

  const [evaluations, setEvaluations] = useState<ReadingEvaluation[]>([]);
  const [evaluationDetail, setEvaluationDetail] = useState<ReadingEvaluation | null>(null);
  const [applicants, setApplicants] = useState<EvaluationApplicants | null>(null);
  const [evaluationId, setEvaluationId] = useState("");
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
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actingStudentId, setActingStudentId] = useState<string | null>(null);

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
  const presetEvaluationId = searchParams.get("evaluationId") ?? "";
  const presetSchoolId = searchParams.get("schoolId") ?? "";
  const presetClassId = searchParams.get("classId") ?? "";
  const presetTextId = searchParams.get("readingTextId") ?? "";
  const presetWordsListId = searchParams.get("wordsWordListId") ?? "";
  const presetUncommonListId = searchParams.get("uncommonWordListId") ?? "";
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
      setEvaluations([]);
      setEvaluationDetail(null);
      setApplicants(null);
      setWordsList(null);
      setUncommonList(null);
      setSchoolId("");
      setClassId("");
      setStudentId("");
      setTextId("");
      setEvaluationId("");
    }
  }, []);

  const loadBase = useCallback(async () => {
    setLoadingSchools(true);
    try {
      const [schoolResult, evaluationResult] = await Promise.allSettled([
        listSchools(),
        isPractice ? Promise.resolve([] as ReadingEvaluation[]) : listEvaluations(),
      ]);

      const schoolData = schoolResult.status === "fulfilled" ? schoolResult.value : [];
      const evaluationData =
        evaluationResult.status === "fulfilled" ? asEvaluationList(evaluationResult.value) : [];

      if (schoolResult.status === "rejected") {
        toast.error(getApiErrorMessage(schoolResult.reason, "Não foi possível carregar as escolas."));
      }
      if (!isPractice && evaluationResult.status === "rejected") {
        toast.error(
          getApiErrorMessage(evaluationResult.reason, "Não foi possível carregar as avaliações.")
        );
      }

      setSchools(schoolData);
      const listed = evaluationData.filter((item) => canApplyEvaluation(item, user?.id));
      const visibleEvaluations = listed.length ? listed : evaluationData;
      setEvaluations(visibleEvaluations);
      if (presetSchoolId && schoolData.some((school) => school.id === presetSchoolId)) {
        setSchoolId(presetSchoolId);
      }
      if (presetEvaluationId) {
        const preset =
          visibleEvaluations.find((item) => item.id === presetEvaluationId) ??
          evaluationData.find((item) => item.id === presetEvaluationId);
        if (preset) {
          setEvaluations((current) =>
            current.some((item) => item.id === preset.id) ? current : [preset, ...current]
          );
          setEvaluationId(preset.id);
        } else {
          try {
            const detail = await getEvaluation(presetEvaluationId);
            setEvaluations((current) =>
              current.some((item) => item.id === detail.id) ? current : [detail, ...current]
            );
            setEvaluationId(detail.id);
          } catch {
            setEvaluationId(presetEvaluationId);
          }
        }
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível carregar escolas e avaliações."));
      setSchools([]);
      setEvaluations([]);
    } finally {
      setLoadingSchools(false);
    }
  }, [isPractice, presetEvaluationId, presetSchoolId, user?.id]);

  useEffect(() => {
    if (!cityReady || cityKey === "none") return;
    setSchoolId("");
    setClassId("");
    setStudentId("");
    setTextId("");
    setClasses([]);
    setStudents([]);
    void loadBase();
  }, [cityReady, cityKey, loadBase]);

  useEffect(() => {
    if (isPractice || !evaluationId || !cityReady) {
      if (!evaluationId) {
        setEvaluationDetail(null);
        setApplicants(null);
      }
      return;
    }
    let cancelled = false;
    async function load() {
      setLoadingApplicants(true);
      try {
        const [detail, applicantData] = await Promise.all([
          getEvaluation(evaluationId),
          getEvaluationApplicants(evaluationId),
        ]);
        if (cancelled) return;
        if (!canApplyEvaluation(detail, user?.id)) {
          toast.error("Você só pode aplicar avaliações que você mesmo criou.");
          setEvaluationDetail(null);
          setApplicants(null);
          setEvaluationId("");
          return;
        }
        setEvaluationDetail(detail);
        setApplicants(applicantData);
        if (detail.readingTextId) setTextId(detail.readingTextId);
        if (detail.knownWordList) setWordsList(detail.knownWordList);
        if (detail.uncommonWordList) setUncommonList(detail.uncommonWordList);
      } catch (error) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, "Não foi possível carregar os alunos da avaliação."));
          setEvaluationDetail(null);
          setApplicants(null);
        }
      } finally {
        if (!cancelled) setLoadingApplicants(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [cityReady, evaluationId, isPractice, user?.id]);

  useEffect(() => {
    if (!isPractice || !schoolId || !cityReady) {
      if (!isPractice) return;
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
        if (!cancelled) {
          setClasses(data);
          if (presetClassId && data.some((item) => item.id === presetClassId)) {
            setClassId(presetClassId);
          }
        }
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
  }, [schoolId, cityReady, presetClassId, isPractice]);

  useEffect(() => {
    if (!isPractice || !classId || !cityReady) {
      if (!isPractice) return;
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
  }, [classId, cityReady, isPractice]);

  useEffect(() => {
    if (!isPractice || !cityReady) return;
    if (!classId) {
      setTexts([]);
      setTextId("");
      setWordsList(null);
      setUncommonList(null);
      setLoadingTexts(false);
      return;
    }

    const gradeId = selectedClass?.gradeId || undefined;
    let cancelled = false;
    async function load() {
      setLoadingTexts(true);
      try {
        const [textResult, palavrasResult, poucoResult] = await Promise.allSettled([
          listReadingTexts({ orderBy: "title", gradeId }),
          listWordLists({ kind: "PALAVRAS", active: true, gradeId }),
          listWordLists({ kind: "POUCO_COMUNS", active: true, gradeId }),
        ]);
        if (cancelled) return;

        const textData = textResult.status === "fulfilled" ? textResult.value : [];
        const palavras = palavrasResult.status === "fulfilled" ? palavrasResult.value : [];
        const poucoComuns = poucoResult.status === "fulfilled" ? poucoResult.value : [];

        if (textResult.status === "rejected") {
          toast.error(getApiErrorMessage(textResult.reason, "Não foi possível carregar os textos da série."));
        }
        if (palavrasResult.status === "rejected" || poucoResult.status === "rejected") {
          toast.error("Não foi possível carregar as listas de palavras da série.");
        }

        setTexts(textData);
        setTextId((current) => {
          if (presetTextId && textData.some((text) => text.id === presetTextId)) return presetTextId;
          return current && textData.some((text) => text.id === current) ? current : "";
        });
        setWordsList(
          presetWordsListId
            ? (palavras.find((list) => list.id === presetWordsListId) ?? pickPreferredList(palavras))
            : pickPreferredList(palavras)
        );
        setUncommonList(
          presetUncommonListId
            ? (poucoComuns.find((list) => list.id === presetUncommonListId) ??
              pickPreferredList(poucoComuns))
            : pickPreferredList(poucoComuns)
        );
      } catch (error) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, "Não foi possível carregar textos e listas da série."));
          setTexts([]);
          setTextId("");
          setWordsList(null);
          setUncommonList(null);
        }
      } finally {
        if (!cancelled) setLoadingTexts(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    isPractice,
    cityReady,
    classId,
    selectedClass?.gradeId,
    presetTextId,
    presetWordsListId,
    presetUncommonListId,
  ]);

  const canStartPractice = Boolean(
    cityReady &&
      schoolId &&
      classId &&
      studentId &&
      (hideNarrativeText ? texts.length > 0 : textId) &&
      !creating
  );

  function goToAplicar(opts: {
    session: FluencySession;
    studentId: string;
    studentName: string;
    classInfo?: EvaluationApplicantClass | null;
    view?: boolean;
  }) {
    const knownListId =
      (evaluationDetail ? getKnownWordListId(evaluationDetail) : null) ||
      opts.session.knownWordListId ||
      opts.session.wordsWordListId ||
      wordsList?.id ||
      "";
    router.push(
      fluencyAplicarHref({
        sessionId: opts.session.id,
        evaluationId: isPractice ? undefined : evaluationId,
        studentId: opts.studentId,
        studentName: opts.studentName,
        classId: opts.classInfo?.id ?? opts.session.classId ?? classId ?? "",
        className: opts.classInfo?.name ?? selectedClass?.name ?? "",
        schoolId: opts.classInfo?.schoolId ?? opts.session.schoolId ?? schoolId ?? "",
        schoolName: opts.classInfo?.schoolName ?? selectedSchool?.name ?? "",
        readingTextId:
          opts.session.readingTextId || evaluationDetail?.readingTextId || textId,
        textTitle: evaluationDetail?.readingText?.title || selectedText?.title || "",
        wordsWordListId: knownListId,
        uncommonWordListId:
          opts.session.uncommonWordListId ||
          evaluationDetail?.uncommonWordListId ||
          uncommonList?.id ||
          "",
        caderno: opts.session.caderno || "A",
        view: opts.view,
        practice: isPractice,
        aba: isPractice ? (practiceTab ?? "palavras") : undefined,
      })
    );
  }

  async function handleOfficialAction(
    student: EvaluationApplicantStudent,
    classInfo: EvaluationApplicantClass,
    action: "start" | "continue" | "view"
  ) {
    setActingStudentId(student.id);
    setCreating(true);
    try {
      if (action === "start") {
        const session = await createFluencySession({
          evaluationId,
          studentId: student.id,
        });
        goToAplicar({
          session,
          studentId: student.id,
          studentName: student.name,
          classInfo,
        });
        return;
      }

      const sessionId = student.application?.sessionId;
      if (!sessionId) {
        toast.error("Esta aplicação ainda não tem sessão.");
        return;
      }
      const session = await getFluencySession(sessionId);
      goToAplicar({
        session,
        studentId: student.id,
        studentName: student.name,
        classInfo,
        view: action === "view",
      });
    } catch (error) {
      const status = getApiErrorStatus(error);
      const body = getApiErrorBody(error);
      if (action === "start" && status === 409 && body?.sessionId) {
        toast.error(body.error || "Este aluno já possui aplicação finalizada nesta avaliação.");
        try {
          const session = await getFluencySession(body.sessionId);
          goToAplicar({
            session,
            studentId: student.id,
            studentName: student.name,
            classInfo,
            view: true,
          });
        } catch {
          /* já avisou o 409 */
        }
        return;
      }
      toast.error(
        getApiErrorMessage(
          error,
          action === "start"
            ? "Não foi possível iniciar a sessão de fluência."
            : "Não foi possível abrir a sessão de fluência."
        )
      );
    } finally {
      setActingStudentId(null);
      setCreating(false);
    }
  }

  async function handleStartPractice() {
    if (!selectedStudent) {
      toast.error("Selecione o estudante.");
      return;
    }
    if (!selectedSchool || !selectedClass) {
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
      goToAplicar({
        session,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
      });
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
            : "A avaliação já tem escola, série e turmas. Aqui você escolhe o aluno e inicia, continua ou vê a aplicação."
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
              : "Avaliação individual. São 3 questões: lista de palavras, lista de palavras pouco comuns e leitura de texto narrativo com perguntas de compreensão. O professor ouve a gravação e classifica cada palavra."}
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
          {!isPractice ? (
            <div className="space-y-2 md:col-span-2">
              <Label>Avaliação</Label>
              <Select
                value={evaluationId || undefined}
                onValueChange={setEvaluationId}
                disabled={!cityReady || loadingTexts}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingTexts
                        ? "Carregando avaliações..."
                        : evaluations.length
                          ? "Selecione a avaliação"
                          : "Crie uma avaliação primeiro"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {evaluations.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title} — {getEvaluationKindLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {evaluationDetail?.readingText?.title ? (
                <p className="text-xs text-muted-foreground">
                  Texto e listas vêm da avaliação: {evaluationDetail.readingText.title}
                  {evaluationDetail.knownWordList ? ` · Q1 ${evaluationDetail.knownWordList.name}` : ""}
                  {evaluationDetail.uncommonWordList
                    ? ` · Q2 ${evaluationDetail.uncommonWordList.name}`
                    : ""}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Texto e listas vêm da avaliação selecionada. O aluno entra só na hora de aplicar.
                </p>
              )}
            </div>
          ) : null}

          {isPractice ? (
            <>
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
            </>
          ) : null}

          {hideNarrativeText ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {practiceTab === "palavras" && wordsList ? `Lista: ${wordsList.name}.` : null}
                {practiceTab === "pouco-comuns" && uncommonList
                  ? `Lista: ${uncommonList.name}.`
                  : null}
              </p>
            </div>
          ) : isPractice ? (
            <div className="space-y-2">
              <Label>Texto narrativo (Questão 3)</Label>
              <Select
                value={textId || undefined}
                onValueChange={setTextId}
                disabled={!cityReady || !classId || loadingTexts}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !classId
                        ? "Selecione a turma primeiro"
                        : loadingTexts
                          ? "Carregando textos da série..."
                          : "Selecione o texto"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {texts.map((text) => (
                    <SelectItem key={text.id} value={text.id}>
                      {text.title}
                      {text.grade?.name ? ` — ${text.grade.name}` : ""}
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
          ) : null}
        </CardContent>
      </Card>

      {!isPractice && evaluationId ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div>
              <h2 className="text-base font-semibold">Alunos da avaliação</h2>
              <p className="text-sm text-muted-foreground">
                {applicants?.grade?.name ? `${applicants.grade.name} · ` : null}
                Iniciar cria a sessão; Continuar retoma em andamento; Ver abre o relatório
                finalizado.
              </p>
            </div>
            {loadingApplicants ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando alunos...
              </p>
            ) : !applicants?.classes.length ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma turma/aluno no escopo desta avaliação.
              </p>
            ) : (
              <div className="space-y-5">
                {applicants.classes.map((classInfo) => (
                  <section key={classInfo.id} className="space-y-2">
                    <h3 className="text-sm font-medium">
                      {classInfo.name}
                      {classInfo.schoolName ? ` · ${classInfo.schoolName}` : ""}
                    </h3>
                    <ul className="divide-y rounded-md border">
                      {classInfo.students.map((student) => {
                        const busy = actingStudentId === student.id;
                        return (
                          <li
                            key={student.id}
                            className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium">{student.name}</p>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {applicationStatusLabel(student)}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {student.canStart ? (
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                  disabled={creating}
                                  onClick={() =>
                                    void handleOfficialAction(student, classInfo, "start")
                                  }
                                >
                                  {busy ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                  Iniciar
                                </Button>
                              ) : null}
                              {student.canContinue ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={creating}
                                  onClick={() =>
                                    void handleOfficialAction(student, classInfo, "continue")
                                  }
                                >
                                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                  Continuar
                                </Button>
                              ) : null}
                              {student.canView ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={creating}
                                  onClick={() =>
                                    void handleOfficialAction(student, classInfo, "view")
                                  }
                                >
                                  {busy ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                  Ver
                                </Button>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {isPractice && selectedStudent && selectedClass && selectedSchool ? (
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
        ) : (
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/app/avaliacao-fluencia/listar">Listar avaliações</Link>
          </Button>
        )}
        <Button variant="ghost" asChild className="w-full sm:w-auto">
          <Link href="/app">← Início</Link>
        </Button>
        {isPractice ? (
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto"
            disabled={!canStartPractice}
            onClick={() => void handleStartPractice()}
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Criando sessão...
              </>
            ) : (
              "Iniciar prática →"
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
