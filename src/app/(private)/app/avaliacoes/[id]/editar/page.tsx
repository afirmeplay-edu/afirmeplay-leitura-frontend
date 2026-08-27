import { redirect } from "next/navigation";

export default async function EditarAvaliacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/app/avaliacoes/${id}`);
}
