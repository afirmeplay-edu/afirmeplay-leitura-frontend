import type { WrittenTestStatus, WrittenTestSummary } from "@/lib/api/afirme-reading/types";
import { isPrivilegedStaffRole } from "@/lib/auth/jwt";
import { canWriteIca } from "@/lib/auth/roles";

export const WRITTEN_TEST_STATUS_LABEL: Record<WrittenTestStatus, string> = {
  rascunho: "Rascunho",
  publicada: "Publicada",
};

/**
 * Espelha `assert_can_manage` (written_test_service.py): quem criou, admin e tecadm. Avaliação nova (`null`):
 * qualquer perfil de escrita.
 */
export function canManageWrittenTest(
  test: Pick<WrittenTestSummary, "createdBy"> | null,
  user: { id?: string | null; role?: string | null } | null | undefined
) {
  if (!canWriteIca(user?.role)) return false;
  if (!test) return true;
  if (isPrivilegedStaffRole(user?.role)) return true;
  return Boolean(user?.id && test.createdBy?.id === user.id);
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
