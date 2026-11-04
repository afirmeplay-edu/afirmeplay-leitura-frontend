"use client";

import { useEffect, useState } from "react";
import type { BankQuestion } from "@/lib/api/afirme-reading/types";
import { formatSkillLabel, listSkills } from "@/lib/api/question-catalog";
import { formatIcaSkillDisplay, looksLikeUuid } from "@/lib/ica/skill-display";

/** A questão traz só o UUID da habilidade; o rótulo vem do catálogo da disciplina (ou da série). */
export function useSkillLabel(question: Pick<BankQuestion, "skills" | "subject" | "grade"> | null) {
  const skillId = question?.skills?.[0] ?? null;
  const subjectId = question?.subject?.id;
  const gradeId = question?.grade?.id;
  const [label, setLabel] = useState<string | null>(() => fallbackSkillLabel(skillId));

  useEffect(() => {
    const fallback = fallbackSkillLabel(skillId);
    setLabel(fallback);
    if (!skillId || (!subjectId && !gradeId)) return;

    let cancelled = false;
    listSkills({ subjectId, gradeId: subjectId ? undefined : gradeId })
      .then((skills) => {
        if (cancelled) return;
        const match = skills.find((skill) => skill.id === skillId);
        if (match) {
          setLabel(formatSkillLabel(match));
          return;
        }
        setLabel(fallback ?? "Habilidade não catalogada");
      })
      .catch(() => {
        if (!cancelled) setLabel(fallback ?? "Habilidade não catalogada");
      });
    return () => {
      cancelled = true;
    };
  }, [gradeId, skillId, subjectId]);

  return label;
}

function fallbackSkillLabel(skillId: string | null): string | null {
  if (!skillId) return null;
  const display = formatIcaSkillDisplay(skillId, skillId);
  if (display?.uncatalogued || looksLikeUuid(skillId)) {
    return "Habilidade não catalogada";
  }
  return skillId;
}
