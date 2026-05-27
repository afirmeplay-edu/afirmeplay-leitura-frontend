import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { APP_NAV_ITEMS } from "@/config/navigation";

export default function AppHomePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] p-8 text-white">
        <h1 className="text-3xl font-bold">Bem-vindo ao Sistema de Leitura Afirme Play</h1>
        <p className="mt-2 text-blue-100">
          Base inicial criada. As funcionalidades serao implementadas passo a passo.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {APP_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md">
              <Icon className="h-6 w-6 text-bluebrand-deep" />
              <h2 className="mt-3 text-lg font-semibold text-bluebrand-deep">{item.label}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-700">
                Acessar <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
