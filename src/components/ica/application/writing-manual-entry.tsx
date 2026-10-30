"use client";

import { useEffect, useState } from "react";
import { Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";
import {
  createManualWriting,
  listWrittenTestClasses,
  listWrittenTestClassStudents,
} from "@/lib/api/afirme-reading/written-tests";
import type {
  ManualWritingCriteria,
  WrittenTestClassApplication,
  WrittenTestStudent,
} from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import { WRITING_CRITERIA } from "@/lib/ica/writing";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const SCORES = ["0", "1", "2"] as const;

type CriterionDraft = Record<keyof ManualWritingCriteria, string>;

function emptyCriteria(): CriterionDraft {
  return {
    adequacao: "",
    tipologia: "",
    usoPagina: "",
    ortografia: "",
    pontuacao: "",
    coesao: "",
    segmentacao: "",
  };
}

function scoreValue(raw: string) {
  if (raw !== "0" && raw !== "1" && raw !== "2") return null;
  return Number(raw);
}

export function WritingManualEntry({
  writtenTestId,
  onSaved,
}: {
  writtenTestId: string;
  onSaved: () => void;
}) {
  const [classes, setClasses] = useState<WrittenTestClassApplication[]>([]);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<WrittenTestStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [word17, setWord17] = useState("");
  const [word18, setWord18] = useState("");
  const [points17, setPoints17] = useState("");
  const [points18, setPoints18] = useState("");
  const [why17, setWhy17] = useState("");
  const [why18, setWhy18] = useState("");
  const [production, setProduction] = useState("");
  const [criteria, setCriteria] = useState<CriterionDraft>(emptyCriteria);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listWrittenTestClasses(writtenTestId)
      .then((response) => {
        if (!cancelled) setClasses(response.classes.filter((item) => item.applied));
      })
      .catch((error) => {
        if (!cancelled) setClassesError(normalizeApiError(error, "Não foi possível carregar as turmas.").message);
      });
    return () => {
      cancelled = true;
    };
  }, [writtenTestId]);

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      return;
    }
    let cancelled = false;
    setLoadingStudents(true);
    listWrittenTestClassStudents(writtenTestId, classId)
      .then((response) => {
        if (!cancelled) setStudents(response.students);
      })
      .catch((error) => {
        if (cancelled) return;
        setStudents([]);
        toast.error(normalizeApiError(error, "Não foi possível carregar os alunos.").message);
      })
      .finally(() => {
        if (!cancelled) setLoadingStudents(false);
      });
    return () => {
      cancelled = true;
    };
  }, [writtenTestId, classId]);

  function setCriterion(key: keyof ManualWritingCriteria, value: string) {
    setCriteria((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (saving) return;
    const first = scoreValue(points17);
    const second = scoreValue(points18);
    const criteriaPayload: ManualWritingCriteria = {
      adequacao: scoreValue(criteria.adequacao) ?? -1,
      tipologia: scoreValue(criteria.tipologia) ?? -1,
      usoPagina: scoreValue(criteria.usoPagina) ?? -1,
      ortografia: scoreValue(criteria.ortografia) ?? -1,
      pontuacao: scoreValue(criteria.pontuacao) ?? -1,
      coesao: scoreValue(criteria.coesao) ?? -1,
      segmentacao: scoreValue(criteria.segmentacao) ?? -1,
    };
    const missingCriterion = Object.values(criteriaPayload).some((score) => score < 0);
    if (!studentId || first == null || second == null || missingCriterion) {
      toast.error("Escolha o aluno e informe a nota de 0 a 2 das duas palavras e dos sete critérios.");
      return;
    }

    setSaving(true);
    try {
      await createManualWriting(writtenTestId, {
        studentId,
        words: [
          { number: 17, transcription: word17.trim(), points: first, justification: why17.trim() },
          { number: 18, transcription: word18.trim(), points: second, justification: why18.trim() },
        ],
        production: {
          transcription: production.trim(),
          criteria: criteriaPayload,
        },
      });
      toast.success("Nota lançada. O resultado já está publicado.");
      setWord17("");
      setWord18("");
      setPoints17("");
      setPoints18("");
      setWhy17("");
      setWhy18("");
      setProduction("");
      setCriteria(emptyCriteria());
      onSaved();
    } catch (error) {
      toast.error(normalizeApiError(error, "Não foi possível lançar a nota.").message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title="Lançar nota na mão"
      description="Para o aluno sem cartão. As duas palavras e os sete critérios são obrigatórios, cada um de 0 a 2. A nota já sai publicada."
      icon={PenLine}
    >
      {classesError ? <p className="text-sm text-muted-foreground">{classesError}</p> : null}
      {!classesError && classes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aplique a avaliação a uma turma para escolher o aluno.</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="manual-turma">Turma</Label>
          <Select
            value={classId}
            onValueChange={(value) => {
              setClassId(value);
              setStudentId("");
            }}
            disabled={saving || classes.length === 0}
          >
            <SelectTrigger id="manual-turma">
              <SelectValue placeholder="Selecione a turma" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((item) => (
                <SelectItem key={item.classId} value={item.classId}>
                  {item.className ?? "Turma"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="manual-aluno">Aluno</Label>
          <Select
            value={studentId}
            onValueChange={setStudentId}
            disabled={saving || !classId || loadingStudents}
          >
            <SelectTrigger id="manual-aluno">
              <SelectValue placeholder={loadingStudents ? "Carregando..." : "Selecione o aluno"} />
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
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WordFields
          number={17}
          transcription={word17}
          points={points17}
          justification={why17}
          disabled={saving}
          onTranscription={setWord17}
          onPoints={setPoints17}
          onJustification={setWhy17}
        />
        <WordFields
          number={18}
          transcription={word18}
          points={points18}
          justification={why18}
          disabled={saving}
          onTranscription={setWord18}
          onPoints={setPoints18}
          onJustification={setWhy18}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="manual-bilhete">Bilhete</Label>
        <Textarea
          id="manual-bilhete"
          value={production}
          onChange={(event) => setProduction(event.target.value)}
          placeholder={"MAMAE\nAMANHA"}
          className="min-h-[96px]"
          disabled={saving}
        />
        <p className="text-xs text-muted-foreground">A quebra de linha faz parte do texto. Vazio conta como em branco.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {WRITING_CRITERIA.map((criterion) => (
          <ScoreField
            key={criterion.postKey}
            id={`manual-${criterion.postKey}`}
            label={criterion.label}
            value={criteria[criterion.postKey]}
            disabled={saving}
            onChange={(value) => setCriterion(criterion.postKey, value)}
          />
        ))}
      </div>

      <Button type="button" onClick={() => void submit()} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Publicar nota manual
      </Button>
    </SectionCard>
  );
}

function WordFields({
  number,
  transcription,
  points,
  justification,
  disabled,
  onTranscription,
  onPoints,
  onJustification,
}: {
  number: number;
  transcription: string;
  points: string;
  justification: string;
  disabled: boolean;
  onTranscription: (value: string) => void;
  onPoints: (value: string) => void;
  onJustification: (value: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <p className="text-sm font-medium">Ditado {number}</p>
      <div className="space-y-2">
        <Label htmlFor={`manual-palavra-${number}`}>Transcrição</Label>
        <Input
          id={`manual-palavra-${number}`}
          value={transcription}
          onChange={(event) => onTranscription(event.target.value)}
          disabled={disabled}
        />
      </div>
      <ScoreField
        id={`manual-nota-${number}`}
        label="Nota"
        value={points}
        disabled={disabled}
        onChange={onPoints}
      />
      <div className="space-y-2">
        <Label htmlFor={`manual-justificativa-${number}`}>Justificativa</Label>
        <Input
          id={`manual-justificativa-${number}`}
          value={justification}
          onChange={(event) => onJustification(event.target.value)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function ScoreField({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="0 a 2" />
        </SelectTrigger>
        <SelectContent>
          {SCORES.map((score) => (
            <SelectItem key={score} value={score}>
              {score}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
