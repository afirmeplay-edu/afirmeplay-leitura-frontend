import { AvaliacaoDetailPage } from "@/components/avaliacoes/avaliacoes-pages";

export default async function AvaliacaoDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AvaliacaoDetailPage id={id} />;
}
