import { WordListFormPage } from "@/components/cadastros/word-list-form-page";

export default async function EditarListaPoucoComunsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WordListFormPage kind="POUCO_COMUNS" id={id} />;
}
