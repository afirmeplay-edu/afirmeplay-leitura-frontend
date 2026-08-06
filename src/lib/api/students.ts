import { api } from "@/lib/api/client";

export interface School {
  id: string;
  name: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  year?: number | null;
  className?: string | null;
  schoolId?: string | null;
}

export interface Student {
  id: string;
  name: string;
  classId?: string | null;
  registration?: string | null;
  registrationNumber?: string | null;
}

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["data", "students", "schools", "classes", "items", "results"]) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

function normalizeClass(raw: Record<string, unknown>): SchoolClass {
  const year = typeof raw.year === "number" ? raw.year : null;
  const className =
    (typeof raw.className === "string" && raw.className) ||
    (typeof raw.name === "string" && raw.name) ||
    "";
  const label =
    year != null && className
      ? `${year}º Ano ${className}`
      : className || (typeof raw.name === "string" ? raw.name : "Turma");

  return {
    id: String(raw.id),
    name: label,
    year,
    className: typeof raw.className === "string" ? raw.className : null,
    schoolId: raw.schoolId != null ? String(raw.schoolId) : null,
  };
}

function normalizeStudent(raw: Record<string, unknown>): Student {
  return {
    id: String(raw.id),
    name: String(raw.name ?? raw.fullName ?? "Aluno"),
    classId: raw.classId != null ? String(raw.classId) : null,
    registration:
      typeof raw.registration === "string"
        ? raw.registration
        : typeof raw.registrationNumber === "string"
          ? raw.registrationNumber
          : null,
    registrationNumber:
      typeof raw.registrationNumber === "string" ? raw.registrationNumber : null,
  };
}

export async function listSchools() {
  try {
    const { data } = await api.get("/schools");
    return unwrapList<Record<string, unknown>>(data).map((item) => ({
      id: String(item.id),
      name: String(item.name ?? "Escola"),
    }));
  } catch {
    const { data } = await api.get("/school/");
    return unwrapList<Record<string, unknown>>(data).map((item) => ({
      id: String(item.id),
      name: String(item.name ?? "Escola"),
    }));
  }
}

export async function listClassesBySchool(schoolId: string) {
  try {
    const { data } = await api.get("/classes", { params: { schoolId } });
    return unwrapList<Record<string, unknown>>(data).map(normalizeClass);
  } catch {
    const { data } = await api.get(`/schools/${schoolId}/classes`);
    return unwrapList<Record<string, unknown>>(data).map(normalizeClass);
  }
}

export async function listStudentsByClass(classId: string) {
  const { data } = await api.get(`/students/classes/${classId}`);
  return unwrapList<Record<string, unknown>>(data).map(normalizeStudent);
}

export async function listStudentsBySchool(schoolId: string) {
  const { data } = await api.get(`/students/school/${schoolId}`);
  return unwrapList<Record<string, unknown>>(data).map(normalizeStudent);
}
