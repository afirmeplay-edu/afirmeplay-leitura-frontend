"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { EducationStage, Grade } from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import {
  listQuestionEducationStages,
  listQuestionGrades,
  listSubjects,
  type CatalogSubject,
} from "@/lib/api/question-catalog";
import { useAuthStore } from "@/stores/auth-store";

export interface QuestionCatalogState {
  subjects: CatalogSubject[];
  grades: Grade[];
  stages: EducationStage[];
  loading: boolean;
}

/** Recarrega ao trocar de município (séries podem ser por tenant). */
export function useQuestionCatalog(options: { withStages?: boolean } = {}): QuestionCatalogState {
  const { withStages = false } = options;
  const cityId = useAuthStore((state) => state.selectedCityId);
  const [state, setState] = useState<QuestionCatalogState>({
    subjects: [],
    grades: [],
    stages: [],
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));

    async function load() {
      const [subjects, grades, stages] = await Promise.allSettled([
        listSubjects(),
        listQuestionGrades(),
        withStages ? listQuestionEducationStages() : Promise.resolve([] as EducationStage[]),
      ]);
      if (cancelled) return;

      const failure = [subjects, grades, stages].find((result) => result.status === "rejected");
      if (failure && failure.status === "rejected") {
        toast.error(normalizeApiError(failure.reason, "Não foi possível carregar disciplinas e séries.").message, {
          id: "ica-catalog-error",
        });
      }

      setState({
        subjects: subjects.status === "fulfilled" ? subjects.value : [],
        grades: grades.status === "fulfilled" && Array.isArray(grades.value) ? grades.value : [],
        stages: stages.status === "fulfilled" && Array.isArray(stages.value) ? stages.value : [],
        loading: false,
      });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [cityId, withStages]);

  return state;
}
