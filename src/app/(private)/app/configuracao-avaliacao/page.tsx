import { redirect } from "next/navigation";
import { CADASTROS_PATHS } from "@/lib/cadastros/config";

export default function ConfiguracaoAvaliacaoRedirectPage() {
  redirect(CADASTROS_PATHS.root);
}
