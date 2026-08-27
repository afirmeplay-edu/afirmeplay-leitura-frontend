import { AplicacaoVisualizacaoPage } from "@/components/avaliacoes/aplicacao-visualizacao-page";

export default async function AplicacaoVisualizacaoRoute({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  const { id, studentId } = await params;
  return <AplicacaoVisualizacaoPage evaluationId={id} studentId={studentId} />;
}
