import { AvaliacaoAplicadaAlunosPage } from "@/components/avaliacoes/avaliacao-aplicada-alunos-page";

export default async function AvaliacaoAplicadaAlunosRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AvaliacaoAplicadaAlunosPage evaluationId={id} />;
}
