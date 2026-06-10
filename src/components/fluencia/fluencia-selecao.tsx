"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Gauge, Info } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMockSchools, getMockClasses, getMockStudents, getMockTexts } from "@/lib/mock";

export function FluenciaSelecao() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [textId, setTextId] = useState("");

  const schools = getMockSchools();
  const classes = useMemo(() => getMockClasses(schoolId || undefined), [schoolId]);
  const students = useMemo(
    () => getMockStudents({ schoolId: schoolId || undefined, classId: classId || undefined }),
    [schoolId, classId]
  );
  const texts = getMockTexts();
  const selectedStudent = students.find((s) => s.id === studentId);

  const canStart = schoolId && classId && studentId && textId;

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Compromisso Crianca Alfabetizada · ICA"
        title="Avaliacao de Fluencia Leitora"
        description="Selecione escola, turma, estudante e texto narrativo para iniciar a aplicacao."
        icon={Gauge}
      />

      <Alert className="border-l-4 border-l-bluebrand-base">
        <Info className="h-4 w-4 text-bluebrand-base" />
        <AlertDescription>
          Cada lista tem 60 segundos. Apos Q1 e Q2 ha transicao de 3 segundos. O resultado e classificado pelo Leiturometro (ICA).
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="grid gap-6 pt-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Escola</Label>
              <Select value={schoolId} onValueChange={(v) => { setSchoolId(v); setClassId(""); setStudentId(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione a escola" /></SelectTrigger>
                <SelectContent>
                  {schools.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Turma</Label>
              <Select value={classId} onValueChange={(v) => { setClassId(v); setStudentId(""); }} disabled={!schoolId}>
                <SelectTrigger><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estudante</Label>
              <Select value={studentId} onValueChange={setStudentId} disabled={!classId}>
                <SelectTrigger><SelectValue placeholder="Selecione o estudante" /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Texto narrativo (Q3)</Label>
              <Select value={textId} onValueChange={setTextId}>
                <SelectTrigger><SelectValue placeholder="Selecione o texto" /></SelectTrigger>
                <SelectContent>
                  {texts.map((t) => <SelectItem key={t.id} value={t.id}>{t.title} ({t.grade}º ano)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedStudent && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">Resumo do aluno</p>
                <p className="text-sm text-muted-foreground">{selectedStudent.name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
        <Button
          className="w-full sm:w-auto"
          disabled={!canStart}
          onClick={() =>
            router.push(
              `/app/avaliacao-fluencia/aplicar?aluno=${studentId}&texto=${textId}&escola=${schoolId}&turma=${classId}`
            )
          }
        >
          Iniciar Avaliacao de Fluencia
        </Button>
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href="/app/configuracao-avaliacao">Configurar</Link>
        </Button>
        <Button variant="ghost" asChild className="w-full sm:w-auto">
          <Link href="/app">Inicio</Link>
        </Button>
      </div>
    </div>
  );
}
