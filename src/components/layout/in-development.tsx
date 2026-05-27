import { Construction } from "lucide-react";

export function InDevelopment({ title }: { title: string }) {
  return (
    <section className="min-h-[70vh] w-full rounded-2xl border bg-card p-8 text-center">
      <div className="mx-auto flex max-w-xl flex-col items-center justify-center gap-4 pt-20">
        <div className="rounded-full bg-blue-100 p-4 text-bluebrand-deep">
          <Construction className="h-9 w-9" />
        </div>
        <h1 className="text-2xl font-bold text-bluebrand-deep">{title}</h1>
        <p className="text-muted-foreground">Esta pagina esta em desenvolvimento.</p>
      </div>
    </section>
  );
}
