import { Badge } from "@/components/ui/badge";
import { ProficiencyLevelBadge } from "@/components/shared/proficiency-level-badge";
import { cn } from "@/lib/utils";
import { getDifficultyTagClass, getIcaLevelTagClass } from "@/utils/tag-styles";
import { getProficiencyLevelStyle } from "@/lib/colors/proficiency-levels";

type StatusType = "ativo" | "inativo" | "calibrado" | "pendente" | "fluencia" | "ica" | "guiada" | "padrao";

const STATUS_MAP: Record<StatusType, { label: string; variant: "success" | "secondary" | "warning" | "info" | "outline" | "default" }> = {
  ativo: { label: "Ativo", variant: "success" },
  inativo: { label: "Inativo", variant: "secondary" },
  calibrado: { label: "Calibrado", variant: "info" },
  pendente: { label: "Pendente", variant: "warning" },
  fluencia: { label: "Fluência", variant: "info" },
  ica: { label: "ICA", variant: "default" },
  guiada: { label: "Leitura guiada", variant: "outline" },
  padrao: { label: "Padrão", variant: "success" },
};

export function StatusBadge({ status, label }: { status: StatusType; label?: string }) {
  const config = STATUS_MAP[status];
  return <Badge variant={config.variant}>{label ?? config.label}</Badge>;
}

export function IcaLevelBadge({ level }: { level?: string | number | null }) {
  return <span className={cn(getIcaLevelTagClass(level))}>ICA {level ?? "-"}</span>;
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  if (getProficiencyLevelStyle(difficulty)) {
    return <ProficiencyLevelBadge level={difficulty} />;
  }
  return <span className={getDifficultyTagClass(difficulty)}>{difficulty}</span>;
}

const ICA_STATUS_CLASS: Record<string, string> = {
  Alfabetizado:
    "inline-flex items-center rounded-full border border-emerald-700/20 bg-emerald-600 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white",
  "Não alfabetizado":
    "inline-flex items-center rounded-full border border-rose-700/20 bg-rose-600 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white",
  "Não avaliado":
    "inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600",
};

export function IcaSituacaoBadge({ status }: { status?: string | null }) {
  const label = status?.trim();
  if (!label) return <span className="text-sm text-muted-foreground">—</span>;
  return <span className={cn(ICA_STATUS_CLASS[label] ?? "text-sm text-foreground")}>{label}</span>;
}
