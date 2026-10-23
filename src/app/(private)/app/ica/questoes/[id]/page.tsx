import { QuestionDetailPage } from "@/components/ica/questions/question-detail-page";

export default async function IcaQuestaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuestionDetailPage id={id} />;
}
