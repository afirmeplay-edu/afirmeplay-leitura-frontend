import type { ClassGroup } from "./types";

export const MOCK_CLASSES: ClassGroup[] = [
  { id: "tur-1", schoolId: "esc-1", name: "3º Ano A", grade: "3", shift: "Matutino", studentCount: 28 },
  { id: "tur-2", schoolId: "esc-1", name: "3º Ano B", grade: "3", shift: "Vespertino", studentCount: 25 },
  { id: "tur-3", schoolId: "esc-2", name: "4º Ano A", grade: "4", shift: "Matutino", studentCount: 30 },
  { id: "tur-4", schoolId: "esc-2", name: "5º Ano A", grade: "5", shift: "Matutino", studentCount: 27 },
  { id: "tur-5", schoolId: "esc-3", name: "2º Ano A", grade: "2", shift: "Matutino", studentCount: 22 },
  { id: "tur-6", schoolId: "esc-3", name: "3º Ano A", grade: "3", shift: "Vespertino", studentCount: 24 },
];

export function getMockClasses(schoolId?: string) {
  if (!schoolId) return MOCK_CLASSES;
  return MOCK_CLASSES.filter((c) => c.schoolId === schoolId);
}

export function getMockClassById(id: string) {
  return MOCK_CLASSES.find((c) => c.id === id);
}
