"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMockSchools, getMockClasses, getMockStudents, getMockTexts } from "@/lib/mock";

export function SelecaoLeitura() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [textId, setTextId] = useState("");

  const classes = useMemo(() => getMockClasses(schoolId || undefined), [schoolId]);
  const students = useMemo(
    () => getMockStudents({ schoolId: schoolId || undefined, classId: classId || undefined }),
    [schoolId, classId]
  );
  const selectedText = getMockTexts().find((t) => t.id === textId);
  const canStart = schoolId && classId && studentId && textId;

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Nova Avaliacao de Leitura"
        description="Selecione escola, turma, aluno e texto para iniciar a leitura guiada."
        icon={BookOpen}
      >
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href="/app/avaliacao-leitura-guiada/demo">Modo demonstracao</Link>
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>Escola</Label>
              <Select value={schoolId} onValueChange={(v) => { setSchoolId(v); setClassId(""); setStudentId(""); }}>
                <SelectTrigger><SelectValue placeholder="Escola" /></SelectTrigger>
                <SelectContent>
                  {getMockSchools().map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Turma</Label>
              <Select value={classId} onValueChange={(v) => { setClassId(v); setStudentId(""); }} disabled={!schoolId}>
                <SelectTrigger><SelectValue placeholder="Turma" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Aluno</Label>
              <Select value={studentId} onValueChange={setStudentId} disabled={!classId}>
                <SelectTrigger><SelectValue placeholder="Aluno" /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>Texto</Label>
              <Select value={textId} onValueChange={setTextId}>
                <SelectTrigger><SelectValue placeholder="Texto" /></SelectTrigger>
                <SelectContent>
                  {getMockTexts().map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedText && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">{selectedText.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{selectedText.grade}º ano · {selectedText.difficulty}</p>
                <p className="mt-2 line-clamp-4 text-sm">{selectedText.content}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Button
        className="w-full sm:w-auto"
        disabled={!canStart}
        onClick={() => router.push(`/app/avaliacao-leitura-guiada/sessao?aluno=${studentId}&texto=${textId}`)}
      >
        Iniciar Avaliacao de Leitura
      </Button>
    </div>
  );
}
