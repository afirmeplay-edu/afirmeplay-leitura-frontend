import { cn } from "@/lib/utils";
import {
  getPerfilLeitorStyle,
  PERFIL_LEITOR_LABEL,
  type PerfilLeitorCode,
} from "@/lib/colors/reading-levels";

export function PerfilLeitorBadge({
  code,
  className,
}: {
  code?: PerfilLeitorCode | string | null;
  className?: string;
}) {
  if (!code) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  const style = getPerfilLeitorStyle(code);
  const label = PERFIL_LEITOR_LABEL[code as PerfilLeitorCode] ?? String(code);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-none",
        className
      )}
      style={{ backgroundColor: style.hex, color: style.fgHex, borderColor: style.hex }}
    >
      {label}
    </span>
  );
}
