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
  schoolId?: string | null;
  registration?: string | null;
  registrationNumber?: string | null;
  email?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  schoolName?: string | null;
  className?: string | null;
  gradeName?: string | null;
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function normalizeStudent(raw: Record<string, unknown>): Student {
  const school = asRecord(raw.school);
  const classObj = asRecord(raw.class);
  const grade = asRecord(raw.grade);
  const user = asRecord(raw.user);
  const year = typeof classObj?.year === "number" ? classObj.year : null;
  const classLetter = pickString(classObj?.className, classObj?.name);
  const composedClass =
    year != null && classLetter ? `${year}º Ano ${classLetter}` : classLetter;

  return {
    id: String(raw.id),
    name: String(raw.name ?? raw.fullName ?? user?.name ?? "Aluno"),
    classId: raw.classId != null ? String(raw.classId) : raw.class_id != null ? String(raw.class_id) : null,
    schoolId: raw.schoolId != null ? String(raw.schoolId) : raw.school_id != null ? String(raw.school_id) : null,
    registration:
      pickString(raw.registration, raw.registrationNumber, user?.registration),
    registrationNumber: pickString(raw.registrationNumber, raw.registration),
    email: pickString(raw.email, user?.email),
    birthDate: pickString(raw.birthDate, raw.birth_date),
    gender: pickString(raw.gender),
    schoolName: pickString(raw.schoolName, school?.name),
    className: pickString(raw.className, composedClass),
    gradeName: pickString(raw.gradeName, grade?.name),
  };
}

export async function getStudent(id: string): Promise<Student | null> {
  try {
    const { data } = await api.get(`/students/${id}`);
    if (!data || typeof data !== "object") return null;
    return normalizeStudent(data as Record<string, unknown>);
  } catch {
    return null;
  }
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
