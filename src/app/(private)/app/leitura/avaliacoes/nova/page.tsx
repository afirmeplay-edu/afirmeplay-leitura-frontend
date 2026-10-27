import { redirect } from "next/navigation";
import { ROUTES } from "@/config/routes";

export default function NovaAvaliacaoPage() {
  redirect(ROUTES.leitura.avaliacoes.root);
}
