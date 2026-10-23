import { redirect } from "next/navigation";
import { ROUTES } from "@/config/routes";

export default async function EditarAvaliacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(ROUTES.leitura.avaliacoes.detalhe(id));
}
