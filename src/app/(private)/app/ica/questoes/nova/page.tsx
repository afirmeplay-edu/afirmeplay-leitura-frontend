import { Suspense } from "react";
import { QuestionCreatePage } from "@/components/ica/questions/question-create-page";

export default function IcaNovaQuestaoPage() {
  return (
    <Suspense>
      <QuestionCreatePage />
    </Suspense>
  );
}
