import { TextFormPage } from "@/components/cadastros/text-form-page";

export default async function EditarTextoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TextFormPage id={id} />;
}
