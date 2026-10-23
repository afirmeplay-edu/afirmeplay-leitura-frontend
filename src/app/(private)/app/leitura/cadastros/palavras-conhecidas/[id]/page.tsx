import { WordListFormPage } from "@/components/cadastros/word-list-form-page";

export default async function EditarListaConhecidasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WordListFormPage kind="PALAVRAS_CONHECIDAS" id={id} />;
}
