"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listReadingTexts, type ReadingText } from "@/lib/api/afirme-reading";
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface GuidedSelection {
  school: School;
  schoolClass: SchoolClass;
  student: Student;
  text: ReadingText;
}

interface GuidedSelectionFormProps {
  onStart: (selection: GuidedSelection) => void;
}

export function GuidedSelectionForm({ onStart }: GuidedSelectionFormProps) {
  const [cityReady, setCityReady] = useState(false);
  const [cityKey, setCityKey] = useState("none");

  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [texts, setTexts] = useState<ReadingText[]>([]);

  const [schoolId, setSchoolId] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [textId, setTextId] = useState("");

  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingTexts, setLoadingTexts] = useState(false);

  const handleCityReadyChange = useCallback((ready: boolean, cityId: string | null) => {
    setCityReady(ready);
    setCityKey(cityId || "none");
    if (!ready) {
      setSchools([]);
      setClasses([]);
      setStudents([]);
      setTexts([]);
      setSchoolId("");
      setClassId("");
      setStudentId("");
      setTextId("");
    }
  }, []);

  const loadSchools = useCallback(async () => {
    setLoadingSchools(true);
    try {
      const data = await listSchools();
      setSchools(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Nao foi possivel carregar as escolas."));
      setSchools([]);
    } finally {
      setLoadingSchools(false);
    }
  }, []);

  const loadTexts = useCallback(async () => {
    setLoadingTexts(true);
    try {
      const data = await listReadingTexts({ orderBy: "title" });
      setTexts(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Nao foi possivel carregar os textos."));
      setTexts([]);
    } finally {
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
    void loadSchools();
    void loadTexts();
  }, [cityReady, cityKey, loadSchools, loadTexts]);

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
          toast.error(getApiErrorMessage(error, "Nao foi possivel carregar as turmas."));
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
          toast.error(getApiErrorMessage(error, "Nao foi possivel carregar os alunos."));
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

  function handleStart() {
    const school = schools.find((item) => item.id === schoolId);
    const schoolClass = classes.find((item) => item.id === classId);
    const student = students.find((item) => item.id === studentId);
    const text = texts.find((item) => item.id === textId);

    if (!school || !schoolClass || !student || !text) {
      toast.error("Selecione escola, turma, aluno e texto.");
      return;
    }

    onStart({ school, schoolClass, student, text });
  }

  const ready = Boolean(cityReady && schoolId && classId && studentId && textId);
  const selectsDisabled = !cityReady;

  return (
    <div className="space-y-6 rounded-xl border bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-bluebrand-deep">Selecionar aluno e texto</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fluxo livre: escolha o estudante e o texto para iniciar a leitura guiada.
        </p>
      </div>

      <AdminCityPicker onCityReadyChange={handleCityReadyChange} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Escola</Label>
          <Select
            value={schoolId || undefined}
            onValueChange={setSchoolId}
            disabled={selectsDisabled || loadingSchools}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  !cityReady
                    ? "Selecione o municipio primeiro"
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
            disabled={selectsDisabled || !schoolId || loadingClasses}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  !cityReady
                    ? "Selecione o municipio primeiro"
                    : !schoolId
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
          <Label>Aluno</Label>
          <Select
            value={studentId || undefined}
            onValueChange={setStudentId}
            disabled={selectsDisabled || !classId || loadingStudents}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  !cityReady
                    ? "Selecione o municipio primeiro"
                    : !classId
                      ? "Selecione a turma primeiro"
                      : loadingStudents
                        ? "Carregando..."
                        : "Selecione o aluno"
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
          <Label>Texto</Label>
          <Select
            value={textId || undefined}
            onValueChange={setTextId}
            disabled={selectsDisabled || loadingTexts}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  !cityReady
                    ? "Selecione o municipio primeiro"
                    : loadingTexts
                      ? "Carregando..."
                      : "Selecione o texto"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {texts.map((text) => (
                <SelectItem key={text.id} value={text.id}>
                  {text.title}
                  {text.grade?.name ? ` (${text.grade.name})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleStart}
          disabled={!ready}
          className="bg-bluebrand-deep text-white hover:opacity-95"
        >
          {loadingSchools || loadingTexts ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </>
          ) : (
            "Iniciar leitura guiada"
          )}
        </Button>
      </div>
    </div>
  );
}
