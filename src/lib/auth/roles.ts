export type UserRole = "admin" | "tecadm" | "professor" | "coordenador" | "diretor" | "aplicador";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  tecadm: "Técnico administrativo",
  professor: "Professor",
  coordenador: "Coordenador",
  diretor: "Diretor",
  aplicador: "Aplicador",
};

/** Quem cria/edita no ICA (contrato `/afirme-reading/questions`). `aplicador` só visualiza. */
export const ICA_WRITE_ROLES: UserRole[] = ["admin", "tecadm", "professor", "coordenador", "diretor"];

export function normalizeRole(role: string | null | undefined) {
  return (role ?? "").trim().toLowerCase();
}

export function canWriteIca(role: string | null | undefined) {
  return ICA_WRITE_ROLES.includes(normalizeRole(role) as UserRole);
}

/** POST /written-tests/{id}/answer-sheet-corrections. O aplicador corrige, mas não edita o banco. */
export const ANSWER_SHEET_CORRECTION_ROLES: UserRole[] = [
  "admin",
  "tecadm",
  "professor",
  "coordenador",
  "diretor",
  "aplicador",
];

export function canCorrectAnswerSheets(role: string | null | undefined) {
  return ANSWER_SHEET_CORRECTION_ROLES.includes(normalizeRole(role) as UserRole);
}

export function getRoleLabel(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  return ROLE_LABELS[normalized as UserRole] ?? (role?.trim() || "Usuário");
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
