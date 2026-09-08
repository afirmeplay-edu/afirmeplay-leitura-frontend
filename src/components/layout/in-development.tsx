import { Construction } from "lucide-react";

export function InDevelopment({ title }: { title: string }) {
  return (
    <section className="surface-panel min-h-[70vh] w-full p-8 text-center">
      <div className="mx-auto flex max-w-xl flex-col items-center justify-center gap-4 pt-20">
        <div className="rounded-full bg-gradient-to-br from-brand-hero-from to-brand-hero-to p-4 text-white">
          <Construction className="h-9 w-9" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-muted-foreground">Esta página está em desenvolvimento.</p>
      </div>
    </section>
  );
}
