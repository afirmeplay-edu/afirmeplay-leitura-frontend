import { TestApplicationPage } from "@/components/ica/application/test-application-page";

export default async function IcaAvaliacaoAplicacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TestApplicationPage id={id} />;
}
