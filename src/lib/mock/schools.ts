import type { School } from "./types";

export const MOCK_SCHOOLS: School[] = [
  { id: "esc-1", name: "EMEF Prof. Maria Silva", city: "Campina Grande", inep: "25000001", active: true },
  { id: "esc-2", name: "EMEF Dom Pedro II", city: "Campina Grande", inep: "25000002", active: true },
  { id: "esc-3", name: "EMEF José da Penha", city: "Patos", inep: "25000003", active: true },
];

export function getMockSchools() {
  return MOCK_SCHOOLS;
}

export function getMockSchoolById(id: string) {
  return MOCK_SCHOOLS.find((s) => s.id === id);
}
