"use client";

import { useEffect, useState } from "react";
import type { BankQuestion } from "@/lib/api/afirme-reading/types";
import { formatSkillLabel, listSkills } from "@/lib/api/question-catalog";

/** A questão traz só o UUID da habilidade; o rótulo vem do catálogo da disciplina (ou da série). */
export function useSkillLabel(question: Pick<BankQuestion, "skills" | "subject" | "grade"> | null) {
  const skillId = question?.skills?.[0] ?? null;
  const subjectId = question?.subject?.id;
  const gradeId = question?.grade?.id;
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(null);
    if (!skillId || (!subjectId && !gradeId)) return;
    let cancelled = false;
    listSkills({ subjectId, gradeId: subjectId ? undefined : gradeId })
      .then((skills) => {
        if (cancelled) return;
        const match = skills.find((skill) => skill.id === skillId);
        setLabel(match ? formatSkillLabel(match) : null);
      })
      .catch(() => {
        if (!cancelled) setLabel(null);
      });
    return () => {
      cancelled = true;
    };
  }, [gradeId, skillId, subjectId]);

  return label;
}
