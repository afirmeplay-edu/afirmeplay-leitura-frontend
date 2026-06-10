import type { Student } from "./types";

export const MOCK_STUDENTS: Student[] = [
  { id: "alu-1", schoolId: "esc-1", classId: "tur-1", name: "Ana Beatriz Santos", email: "ana@escola.com", birthDate: "2016-03-12", gender: "F" },
  { id: "alu-2", schoolId: "esc-1", classId: "tur-1", name: "Bruno Costa Lima", birthDate: "2016-07-22", gender: "M" },
  { id: "alu-3", schoolId: "esc-1", classId: "tur-1", name: "Carla Mendes", birthDate: "2016-01-05", gender: "F" },
  { id: "alu-4", schoolId: "esc-1", classId: "tur-2", name: "Daniel Oliveira", birthDate: "2016-11-18", gender: "M" },
  { id: "alu-5", schoolId: "esc-1", classId: "tur-2", name: "Eduarda Ferreira", birthDate: "2016-09-30", gender: "F" },
  { id: "alu-6", schoolId: "esc-2", classId: "tur-3", name: "Felipe Alves", birthDate: "2015-04-14", gender: "M" },
  { id: "alu-7", schoolId: "esc-2", classId: "tur-3", name: "Gabriela Rocha", birthDate: "2015-08-02", gender: "F" },
  { id: "alu-8", schoolId: "esc-2", classId: "tur-4", name: "Henrique Souza", birthDate: "2014-12-20", gender: "M" },
  { id: "alu-9", schoolId: "esc-2", classId: "tur-4", name: "Isabela Martins", birthDate: "2014-06-11", gender: "F" },
  { id: "alu-10", schoolId: "esc-3", classId: "tur-5", name: "João Pedro", birthDate: "2017-02-28", gender: "M" },
  { id: "alu-11", schoolId: "esc-3", classId: "tur-5", name: "Larissa Nunes", birthDate: "2017-05-15", gender: "F" },
  { id: "alu-12", schoolId: "esc-3", classId: "tur-6", name: "Miguel Barbosa", birthDate: "2016-10-03", gender: "M" },
  { id: "alu-13", schoolId: "esc-1", classId: "tur-1", name: "Natália Dias", birthDate: "2016-04-09", gender: "F" },
  { id: "alu-14", schoolId: "esc-1", classId: "tur-2", name: "Otávio Campos", birthDate: "2016-12-01", gender: "M" },
  { id: "alu-15", schoolId: "esc-2", classId: "tur-3", name: "Paula Vieira", birthDate: "2015-03-25", gender: "F" },
  { id: "alu-16", schoolId: "esc-2", classId: "tur-4", name: "Rafael Gomes", birthDate: "2014-07-07", gender: "M" },
  { id: "alu-17", schoolId: "esc-3", classId: "tur-5", name: "Sofia Araújo", birthDate: "2017-01-19", gender: "F" },
  { id: "alu-18", schoolId: "esc-3", classId: "tur-6", name: "Thiago Pinto", birthDate: "2016-08-16", gender: "M" },
  { id: "alu-19", schoolId: "esc-1", classId: "tur-1", name: "Valentina Cruz", birthDate: "2016-06-27", gender: "F" },
  { id: "alu-20", schoolId: "esc-2", classId: "tur-4", name: "William Teixeira", birthDate: "2014-11-04", gender: "M" },
];

export function getMockStudents(filters?: { schoolId?: string; classId?: string }) {
  let result = MOCK_STUDENTS;
  if (filters?.schoolId) result = result.filter((s) => s.schoolId === filters.schoolId);
  if (filters?.classId) result = result.filter((s) => s.classId === filters.classId);
  return result;
}

export function getMockStudentById(id: string) {
  return MOCK_STUDENTS.find((s) => s.id === id);
}
