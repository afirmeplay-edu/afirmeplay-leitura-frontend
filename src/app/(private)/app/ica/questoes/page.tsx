import { Suspense } from "react";
import { QuestionsListPage } from "@/components/ica/questions/questions-list-page";

export default function IcaQuestoesPage() {
  return (
    <Suspense>
      <QuestionsListPage />
    </Suspense>
  );
}
