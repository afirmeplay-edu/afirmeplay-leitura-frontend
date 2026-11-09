"use client";

import type { BankQuestionOrigin, BankQuestionType, Grade } from "@/lib/api/afirme-reading/types";
import type { CatalogSubject } from "@/lib/api/question-catalog";
import { cn } from "@/lib/utils";
import {
  ICA_QUESTION_TYPES,
  QUESTION_DIFFICULTIES,
  QUESTION_ORIGIN_LABEL,
  QUESTION_TYPE_LABEL,
} from "@/lib/ica/questions";
import { getProficiencyLevelStyle } from "@/lib/colors/proficiency-levels";
import { ChipFilter } from "@/components/shared/chip-filter";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "__all__";

export interface QuestionFilterValue {
  type: BankQuestionType | "";
  subjectId: string;
  gradeId: string;
  difficulty: string;
  origin: BankQuestionOrigin | "";
}

export const EMPTY_QUESTION_FILTERS: QuestionFilterValue = {
  type: "",
  subjectId: "",
  gradeId: "",
  difficulty: "",
  origin: "",
};

export function hasActiveQuestionFilters(value: QuestionFilterValue) {
  return Boolean(value.type || value.subjectId || value.gradeId || value.difficulty || value.origin);
}

interface QuestionFiltersProps {
  value: QuestionFilterValue;
  onChange: (patch: Partial<QuestionFilterValue>) => void;
  subjects: CatalogSubject[];
  grades: Grade[];
  disabled?: boolean;
  idPrefix?: string;
  /** Mostra o filtro de tipo (o seletor do construtor já fixa o tipo da posição). */
  withType?: boolean;
}

export function QuestionFilters({
  value,
  onChange,
  subjects,
  grades,
  disabled,
  idPrefix = "filtro",
  withType = false,
}: QuestionFiltersProps) {
  const selectFields: {
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
  ];

  return (
    <div className={cn("space-y-3", disabled && "pointer-events-none opacity-60")}>
      {withType ? (
        <ChipFilter
          label="Tipo"
          value={value.type || ALL}
          allValue={ALL}
          onChange={(next) => onChange({ type: next === ALL ? "" : (next as BankQuestionType) })}
          options={[
            { value: ALL, label: "Todos" },
            ...ICA_QUESTION_TYPES.map((type) => ({ value: type, label: QUESTION_TYPE_LABEL[type] })),
          ]}
        />
      ) : null}

      <ChipFilter
        label="Dificuldade"
        value={value.difficulty || ALL}
        allValue={ALL}
        onChange={(next) => onChange({ difficulty: next === ALL ? "" : next })}
        options={[
          { value: ALL, label: "Todas" },
          ...QUESTION_DIFFICULTIES.map((difficulty) => {
            const style = getProficiencyLevelStyle(difficulty);
            return {
              value: difficulty,
              label: difficulty,
              accentColor: style?.hex,
              accentTextColor: style?.fgHex,
            };
          }),
        ]}
      />

      <ChipFilter
        label="Origem"
        value={value.origin || ALL}
        allValue={ALL}
        onChange={(next) => onChange({ origin: next === ALL ? "" : (next as BankQuestionOrigin) })}
        options={[
          { value: ALL, label: "Todas" },
          ...(Object.keys(QUESTION_ORIGIN_LABEL) as BankQuestionOrigin[]).map((origin) => ({
            value: origin,
            label: origin === "afirme_ler" ? "Educacional" : "Não editáveis",
          })),
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {selectFields.map((field) => {
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
    </div>
  );
}
