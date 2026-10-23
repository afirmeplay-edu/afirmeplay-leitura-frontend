export type UserRole = "admin" | "tecadm" | "professor" | "coordenador" | "diretor" | "aplicador";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  tecadm: "Técnico administrativo",
  professor: "Professor",
  coordenador: "Coordenador",
  diretor: "Diretor",
  aplicador: "Aplicador",
};

export function normalizeRole(role: string | null | undefined) {
  return (role ?? "").trim().toLowerCase();
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
