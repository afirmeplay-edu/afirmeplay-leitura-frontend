"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateBankQuestion } from "@/lib/api/afirme-reading/questions";
import type { BankQuestion } from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import { formatSkillCode, listSkills, type CatalogSkill } from "@/lib/api/question-catalog";
import { formatIcaSkillDisplay, looksLikeUuid } from "@/lib/ica/skill-display";
import { SkillPickerField } from "@/components/ica/questions/skill-picker-field";

const skillsCache = new Map<string, Promise<CatalogSkill[]>>();

function loadSkills(subjectId?: string | null, gradeId?: string | null) {
  const key = `${subjectId ?? ""}:${gradeId ?? ""}`;
  const hit = skillsCache.get(key);
  if (hit) return hit;
  const promise = listSkills({
    subjectId: subjectId || undefined,
    gradeId: subjectId ? undefined : gradeId || undefined,
  }).catch((error) => {
    skillsCache.delete(key);
    throw error;
  });
  skillsCache.set(key, promise);
  return promise;
}

function displaySkillCode(skillId: string | null, skills: CatalogSkill[]) {
  if (!skillId) return "—";
  const match = skills.find((skill) => skill.id === skillId);
  if (match) return formatSkillCode(match);
  const fallback = formatIcaSkillDisplay(skillId, skillId);
  if (fallback?.uncatalogued || looksLikeUuid(skillId)) return "N/C";
  return skillId;
}

export function QuestionSkillCell({
  question,
  editable,
  onUpdated,
}: {
  question: BankQuestion;
  editable: boolean;
  onUpdated?: (question: BankQuestion) => void;
}) {
  const skillId = question.skills?.[0] ?? "";
  const subjectId = question.subject?.id ?? null;
  const gradeId = question.grade?.id ?? null;
  const [skills, setSkills] = useState<CatalogSkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState(skillId);

  useEffect(() => {
    setValue(skillId);
  }, [skillId]);

  useEffect(() => {
    if (!subjectId && !gradeId) {
      setSkills([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadSkills(subjectId, gradeId)
      .then((list) => {
        if (!cancelled) setSkills(list);
      })
      .catch(() => {
        if (!cancelled) setSkills([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gradeId, subjectId]);

  const options = useMemo(() => {
    if (!value || skills.some((skill) => skill.id === value)) return skills;
    return [
      {
        id: value,
        code: "",
        description: "Habilidade não catalogada",
        subjectId: null,
        gradeIds: [],
      },
      ...skills,
    ];
  }, [skills, value]);

  const selected = options.find((skill) => skill.id === value) ?? null;
  const selectedTitle = selected
    ? `${formatSkillCode(selected)}${selected.description ? ` — ${selected.description}` : ""}`
    : undefined;

  async function saveSkill(nextId: string) {
    if (nextId === value) return;
    const previous = value;
    setValue(nextId);
    setSaving(true);
    try {
      const updated = await updateBankQuestion(question.id, { skills: nextId || null });
      onUpdated?.(updated);
      toast.success(nextId ? "Habilidade atualizada." : "Habilidade removida.");
    } catch (error) {
      setValue(previous);
      toast.error(normalizeApiError(error, "Não foi possível atualizar a habilidade.").message);
    } finally {
      setSaving(false);
    }
  }

  if (!editable) {
    const code = loading ? "…" : displaySkillCode(value || null, skills);
    return (
      <span className="font-mono text-xs tabular-nums" title={selectedTitle ?? code}>
        {code}
      </span>
    );
  }

  if (!subjectId && !gradeId) {
    return <span className="text-xs text-muted-foreground">Sem série</span>;
  }

  return (
    <div className="w-[9.5rem]" onClick={(event) => event.stopPropagation()} title={selectedTitle}>
      <SkillPickerField
        skills={options}
        value={value}
        onChange={(next) => void saveSkill(next)}
        disabled={saving}
        loading={loading}
        triggerClassName="h-9 px-2 font-mono text-xs"
      />
      {saving ? (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Salvando…
        </p>
      ) : null}
    </div>
  );
}
