import { AvaliacaoFormPage } from "@/components/avaliacoes/avaliacoes-pages";

export default async function EditarAvaliacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AvaliacaoFormPage id={id} />;
}
