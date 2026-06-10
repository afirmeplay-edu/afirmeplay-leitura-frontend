import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
      <h1 className="text-6xl font-bold text-bluebrand-deep">404</h1>
      <p className="text-lg text-muted-foreground">Pagina nao encontrada.</p>
      <Button asChild className="bg-bluebrand-base hover:bg-bluebrand-deep">
        <Link href="/app">Voltar ao inicio</Link>
      </Button>
    </div>
  );
}
