"use client";

import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FormPageProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  backHref: string;
  children: ReactNode;
  onSubmit?: (e: FormEvent) => void;
  brand?: string;
  submitLabel?: string;
  submitting?: boolean;
  submitDisabled?: boolean;
  hideSubmit?: boolean;
  /** Substitui os links de Voltar/Cancelar (ex.: confirmar alterações não salvas). */
  onCancel?: () => void;
  /** Coluna lateral no desktop (ex.: pré-visualização). */
  aside?: ReactNode;
  notice?: ReactNode;
  footerHint?: ReactNode;
  /** `true`: os filhos montam os próprios cards. */
  bare?: boolean;
  onFormKeyDown?: (event: KeyboardEvent<HTMLFormElement>) => void;
}

export function FormPage({
  title,
  description,
  icon,
  backHref,
  children,
  onSubmit,
  brand,
  submitLabel = "Salvar",
  submitting = false,
  submitDisabled = false,
  hideSubmit = false,
  onCancel,
  aside,
  notice,
  footerHint,
  bare = false,
  onFormKeyDown,
}: FormPageProps) {
  const backButton = onCancel ? (
    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onCancel}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Voltar
    </Button>
  ) : (
    <Button variant="outline" asChild className="w-full sm:w-auto">
      <Link href={backHref}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Link>
    </Button>
  );

  const cancelButton = onCancel ? (
    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onCancel} disabled={submitting}>
      Cancelar
    </Button>
  ) : (
    <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
      <Link href={backHref}>Cancelar</Link>
    </Button>
  );

  const actions = (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
      {cancelButton}
      {!hideSubmit ? (
        <Button type="submit" className="w-full sm:w-auto" disabled={submitting || submitDisabled}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitting ? "Salvando..." : submitLabel}
        </Button>
      ) : null}
      {footerHint ? <span className="text-xs text-muted-foreground sm:ml-2">{footerHint}</span> : null}
    </div>
  );

  const form = (
    <form onSubmit={onSubmit} onKeyDown={onFormKeyDown} className="min-w-0 space-y-6" noValidate>
      {bare ? (
        <>
          {children}
          {actions}
        </>
      ) : (
        <Card>
          <CardContent className="space-y-6 pt-4 sm:pt-6">
            {children}
            {actions}
          </CardContent>
        </Card>
      )}
    </form>
  );

  return (
    <div className="w-full min-w-0 space-y-4 pb-8 sm:space-y-6">
      <PageHeader title={title} description={description} icon={icon} brand={brand}>
        {backButton}
      </PageHeader>
      {notice}
      {aside ? (
        <div className={cn("grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] lg:items-start")}>
          {form}
          <aside className="min-w-0 lg:sticky lg:top-2">{aside}</aside>
        </div>
      ) : (
        form
      )}
    </div>
  );
}
