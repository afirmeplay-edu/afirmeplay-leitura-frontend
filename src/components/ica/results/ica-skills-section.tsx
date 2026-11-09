"use client";

import { AlertTriangle } from "lucide-react";
import type { IcaSkill, IcaSkillMap } from "@/lib/api/afirme-reading/ica-results";
import {
  classifyHabilidadePercentual,
  HABILIDADE_PERCENT_INTERVALOS,
  PROFICIENCY_LEVELS,
} from "@/lib/colors/proficiency-levels";
import { formatIcaSkillDisplay } from "@/lib/ica/skill-display";
import { SectionCard } from "@/components/shared/section-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function SkillCard({ skill }: { skill: IcaSkill }) {
  const display = formatIcaSkillDisplay(skill.skill_code, skill.skill_label);
  const faixa = classifyHabilidadePercentual(skill.performance_percentage);
  const pct =
    typeof skill.performance_percentage === "number" && Number.isFinite(skill.performance_percentage)
      ? Math.max(0, Math.min(100, skill.performance_percentage))
      : null;

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4",
        faixa?.softClass.bg,
        faixa?.softClass.border
      )}
    >
      <div className="space-y-1">
        <p className={cn("text-xs font-semibold uppercase tracking-wide", faixa?.softClass.text)}>
          {display?.code ?? skill.skill_code}
        </p>
        <h3 className="text-sm font-medium leading-snug text-foreground">
          {display?.uncatalogued
            ? display.label
            : display?.label && display.label !== display.code
              ? display.label
              : skill.skill_label || "Habilidade"}
        </h3>
        {display?.uncatalogued ? (
          <p className="text-xs text-muted-foreground">Identificador não encontrado no catálogo BNCC.</p>
        ) : null}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Desempenho</p>
          <p className={cn("text-2xl font-semibold tabular-nums", faixa?.softClass.text)}>
            {formatPercent(skill.performance_percentage)}
          </p>
        </div>
        {faixa ? (
          <span className={cn("rounded-md px-2 py-1 text-xs font-medium", faixa.tagClass)}>
            {HABILIDADE_PERCENT_INTERVALOS[faixa.key]} · {faixa.label}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Sem tentativas válidas</span>
        )}
      </div>

      {pct != null ? (
        <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div
            className={cn("h-full rounded-full transition-all", faixa?.softClass.bar ?? "bg-muted-foreground")}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Peso relativo: {formatPercent(skill.relative_weight_percentage)}</span>
        <span>
          Itens: {skill.items.length ? skill.items.join(", ") : "—"}
        </span>
      </div>
    </article>
  );
}

export function IcaSkillsSection({
  skillMap,
  loading,
  error,
}: {
  skillMap: IcaSkillMap | null;
  loading?: boolean;
  error?: string | null;
}) {
  const skills = skillMap?.skills ?? [];

  return (
    <SectionCard
      title="Desempenho por habilidade"
      description="Percentual de acertos por habilidade."
    >
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Não foi possível carregar as habilidades</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!loading && !error && skills.length === 0 ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Nenhuma habilidade vinculada</AlertTitle>
          <AlertDescription>
            As questões desta avaliação não têm habilidade do catálogo BNCC. Vincule uma habilidade no banco de
            questões do ICA para ver o desempenho por habilidade neste painel.
          </AlertDescription>
        </Alert>
      ) : null}

      {!loading && !error && skills.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PROFICIENCY_LEVELS.map((level) => (
              <span key={level.key} className={cn("rounded-md px-2 py-1 text-xs font-medium", level.tagClass)}>
                {HABILIDADE_PERCENT_INTERVALOS[level.key]} {level.label}
              </span>
            ))}
          </div>
          {skillMap && skillMap.valid_attempts === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ainda não há correções finalizadas neste recorte — os percentuais aparecem após a correção.
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {skills.map((skill) => (
              <SkillCard key={`${skill.skill_code}-${skill.skill_label}`} skill={skill} />
            ))}
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}
