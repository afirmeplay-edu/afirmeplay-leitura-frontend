import { AutoSessionDetailPage } from "@/components/leitura-guiada/automatica/auto-session-detail-page";

export default async function LeituraAutomaticaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AutoSessionDetailPage sessionId={id} />;
}
