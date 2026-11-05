"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Search, SearchX, X } from "lucide-react";
import { formatSkillCode, formatSkillLabel, type CatalogSkill } from "@/lib/api/question-catalog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchesSkill(skill: CatalogSkill, query: string) {
  if (!query) return true;
  const haystack = normalizeSearch(`${skill.code} ${skill.description}`);
  return query.split(/\s+/).every((token) => haystack.includes(token));
}

export function SkillPickerField({
  id,
  skills,
  value,
  onChange,
  disabled,
  loading,
  lockedReason,
  emptyMessage = "Nenhuma habilidade cadastrada para esse recorte.",
  className,
  triggerClassName,
}: {
  id?: string;
  skills: CatalogSkill[];
  value: string;
  onChange: (skillId: string) => void;
  disabled?: boolean;
  loading?: boolean;
  /** Quando preenchido, o botão fica desabilitado e mostra este texto. */
  lockedReason?: string | null;
  emptyMessage?: string;
  className?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const selected = useMemo(
    () => (value ? skills.find((skill) => skill.id === value) ?? null : null),
    [skills, value]
  );

  const filtered = useMemo(() => {
    const query = normalizeSearch(search);
    return skills.filter((skill) => matchesSkill(skill, query));
  }, [search, skills]);

  const locked = Boolean(lockedReason);
  const canOpen = !disabled && !loading && !locked;

  function pick(skillId: string) {
    onChange(skillId);
    setOpen(false);
  }

  const triggerLabel = locked
    ? lockedReason
    : loading
      ? "Carregando habilidades..."
      : selected
        ? formatSkillLabel(selected)
        : "Buscar habilidade do catálogo";

  return (
    <div className={className}>
      <button
        id={id}
        type="button"
        disabled={!canOpen}
        onClick={() => setOpen(true)}
        title={selected ? formatSkillLabel(selected) : undefined}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm",
          "focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          triggerClassName
        )}
      >
        <span className={cn("min-w-0 truncate", !selected && !locked && !loading && "text-muted-foreground")}>
          {selected ? (
            <>
              <span className="font-mono tabular-nums">{formatSkillCode(selected)}</span>
              {selected.description ? (
                <span className="text-muted-foreground"> — {selected.description}</span>
              ) : null}
            </>
          ) : (
            triggerLabel
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[min(80vh,640px)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="space-y-1 border-b px-6 pb-4 pt-6 pr-12 text-left">
            <DialogTitle>Selecionar habilidade</DialogTitle>
            <DialogDescription>Busque pelo código BNCC ou por trecho da descrição.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 border-b px-6 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                className="pl-9"
                placeholder="Ex.: EF05LP01 ou identificar a função social..."
                aria-label="Buscar habilidade por código ou descrição"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                autoFocus
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {filtered.length === skills.length
                  ? `${skills.length} habilidade${skills.length === 1 ? "" : "s"}`
                  : `${filtered.length} de ${skills.length}`}
              </span>
              {value ? (
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => pick("")}>
                  <X className="h-3.5 w-3.5" />
                  Remover habilidade
                </Button>
              ) : null}
            </div>
          </div>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-2" role="listbox" aria-label="Habilidades">
            {skills.length === 0 ? (
              <EmptyState icon={SearchX} message={emptyMessage} />
            ) : filtered.length === 0 ? (
              <EmptyState icon={SearchX} message="Nenhuma habilidade corresponde à busca." />
            ) : (
              <ul className="space-y-1">
                {filtered.map((skill) => {
                  const active = skill.id === value;
                  return (
                    <li key={skill.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        title={formatSkillLabel(skill)}
                        onClick={() => pick(skill.id)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          active && "bg-accent"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                            active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                          )}
                          aria-hidden
                        >
                          {active ? <Check className="h-3 w-3" /> : null}
                        </span>
                        <span className="min-w-0 space-y-0.5">
                          <span className="block font-mono text-sm tabular-nums">{formatSkillCode(skill)}</span>
                          {skill.description ? (
                            <span className="block text-xs text-muted-foreground">{skill.description}</span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: typeof SearchX; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center text-sm text-muted-foreground">
      <Icon className="h-8 w-8 opacity-50" aria-hidden />
      <p>{message}</p>
    </div>
  );
}
