import { Suspense } from "react";
import { IcaProficiencyImportPage } from "@/components/ica/results/ica-proficiency-import-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <IcaProficiencyImportPage />
    </Suspense>
  );
}
