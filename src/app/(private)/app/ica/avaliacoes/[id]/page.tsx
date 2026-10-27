import { AssessmentBuilderPage } from "@/components/ica/assessments/assessment-builder-page";

export default async function IcaAvaliacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssessmentBuilderPage id={id} />;
}
