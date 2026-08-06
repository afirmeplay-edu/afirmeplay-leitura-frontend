"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface FormPageProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  backHref: string;
  children: ReactNode;
  onSubmit?: (e: FormEvent) => void;
}

export function FormPage({ title, description, icon, backHref, children, onSubmit }: FormPageProps) {
  return (
    <div className="w-full min-w-0 space-y-4 pb-8 sm:space-y-6">
      <PageHeader title={title} description={description} icon={icon}>
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </PageHeader>
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <form onSubmit={onSubmit} className="space-y-6">
            {children}
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
                <Link href={backHref}>Cancelar</Link>
              </Button>
              <Button type="submit" className="w-full sm:w-auto">
                Salvar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
