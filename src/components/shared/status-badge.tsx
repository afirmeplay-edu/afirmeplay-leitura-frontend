import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getDifficultyTagClass, getIcaLevelTagClass } from "@/utils/tag-styles";

type StatusType = "ativo" | "inativo" | "calibrado" | "pendente" | "fluencia" | "ica" | "guiada" | "padrao";

const STATUS_MAP: Record<StatusType, { label: string; variant: "success" | "secondary" | "warning" | "info" | "outline" | "default" }> = {
  ativo: { label: "Ativo", variant: "success" },
  inativo: { label: "Inativo", variant: "secondary" },
  calibrado: { label: "Calibrado", variant: "info" },
  pendente: { label: "Pendente", variant: "warning" },
  fluencia: { label: "Fluencia", variant: "info" },
  ica: { label: "ICA", variant: "default" },
  guiada: { label: "Leitura guiada", variant: "outline" },
  padrao: { label: "Padrao", variant: "success" },
};

export function StatusBadge({ status, label }: { status: StatusType; label?: string }) {
  const config = STATUS_MAP[status];
  return <Badge variant={config.variant}>{label ?? config.label}</Badge>;
}

export function IcaLevelBadge({ level }: { level?: string | number | null }) {
  return <span className={cn(getIcaLevelTagClass(level))}>ICA {level ?? "-"}</span>;
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return <span className={getDifficultyTagClass(difficulty)}>{difficulty}</span>;
}
