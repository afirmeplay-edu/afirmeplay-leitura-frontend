"use client";

import type { BankQuestionOrigin, Grade } from "@/lib/api/afirme-reading/types";
import type { CatalogSubject } from "@/lib/api/question-catalog";
import { QUESTION_DIFFICULTIES, QUESTION_ORIGIN_LABEL } from "@/lib/ica/questions";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "__all__";

export interface QuestionFilterValue {
  subjectId: string;
  gradeId: string;
  difficulty: string;
  origin: BankQuestionOrigin | "";
}

export const EMPTY_QUESTION_FILTERS: QuestionFilterValue = {
  subjectId: "",
  gradeId: "",
  difficulty: "",
  origin: "",
};

export function hasActiveQuestionFilters(value: QuestionFilterValue) {
  return Boolean(value.subjectId || value.gradeId || value.difficulty || value.origin);
}

interface QuestionFiltersProps {
  value: QuestionFilterValue;
  onChange: (patch: Partial<QuestionFilterValue>) => void;
  subjects: CatalogSubject[];
  grades: Grade[];
  disabled?: boolean;
  idPrefix?: string;
}

export function QuestionFilters({
  value,
  onChange,
  subjects,
  grades,
  disabled,
  idPrefix = "filtro",
}: QuestionFiltersProps) {
  const fields: {
    id: string;
    label: string;
    current: string;
    allLabel: string;
    options: { value: string; label: string }[];
    apply: (next: string) => Partial<QuestionFilterValue>;
  }[] = [
    {
      id: "disciplina",
      label: "Disciplina",
      current: value.subjectId,
      allLabel: "Todas as disciplinas",
      options: subjects.map((subject) => ({ value: subject.id, label: subject.name })),
      apply: (next) => ({ subjectId: next }),
    },
    {
      id: "serie",
      label: "Série",
      current: value.gradeId,
      allLabel: "Todas as séries",
      options: grades.map((grade) => ({ value: grade.id, label: grade.name })),
      apply: (next) => ({ gradeId: next }),
    },
    {
      id: "dificuldade",
      label: "Dificuldade",
      current: value.difficulty,
      allLabel: "Todas",
      options: QUESTION_DIFFICULTIES.map((difficulty) => ({ value: difficulty, label: difficulty })),
      apply: (next) => ({ difficulty: next }),
    },
    {
      id: "origem",
      label: "Origem",
      current: value.origin,
      allLabel: "Todas as origens",
      options: (Object.keys(QUESTION_ORIGIN_LABEL) as BankQuestionOrigin[]).map((origin) => ({
        value: origin,
        label: QUESTION_ORIGIN_LABEL[origin],
      })),
      apply: (next) => ({ origin: next as BankQuestionOrigin | "" }),
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {fields.map((field) => {
        const htmlId = `${idPrefix}-${field.id}`;
        return (
          <div key={field.id} className="min-w-0 space-y-1.5">
            <Label htmlFor={htmlId} className="text-xs text-muted-foreground">
              {field.label}
            </Label>
            <Select
              value={field.current || ALL}
              onValueChange={(next) => onChange(field.apply(next === ALL ? "" : next))}
              disabled={disabled}
            >
              <SelectTrigger id={htmlId} className="h-10">
                <SelectValue placeholder={field.allLabel} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{field.allLabel}</SelectItem>
                {field.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}
