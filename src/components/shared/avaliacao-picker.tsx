"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, FileText, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface AvaliacaoPickerOption {
  id: string;
  titulo: string;
  tags?: string[];
  serieIds?: string[];
  status?: string | null;
}

export interface AvaliacaoPickerSerie {
  id: string;
  nome: string;
}

const ALL_SERIES = "__all_series__";

interface AvaliacaoPickerProps {
  label?: string;
  value: string;
  options: AvaliacaoPickerOption[];
  series?: AvaliacaoPickerSerie[];
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  /** Permite limpar a seleção (ex.: “Todas” nos filtros do hub). */
  allowClear?: boolean;
  clearLabel?: string;
  estadoLabel?: string | null;
  municipioLabel?: string | null;
  className?: string;
}

export function AvaliacaoPicker({
  label = "Avaliação",
  value,
  options,
  series = [],
  onChange,
  disabled,
  placeholder = "Selecione a avaliação",
  emptyMessage = "Nenhuma avaliação disponível",
  allowClear = false,
  clearLabel = "Todas",
  estadoLabel,
  municipioLabel,
  className,
}: AvaliacaoPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [serieFilter, setSerieFilter] = useState(ALL_SERIES);

  const selected = options.find((item) => item.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return options.filter((item) => {
      if (serieFilter !== ALL_SERIES) {
        if (!item.serieIds?.length || !item.serieIds.includes(serieFilter)) return false;
      }
      if (!q) return true;
      const haystack = [item.titulo, item.status, ...(item.tags ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [options, search, serieFilter]);

  const scopeParts = [
    estadoLabel ? `Estado: ${estadoLabel}` : null,
    municipioLabel ? `Município: ${municipioLabel}` : null,
  ].filter(Boolean);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setSearch("");
      setSerieFilter(ALL_SERIES);
    }
  }

  function selectOption(id: string) {
    onChange(id);
    handleOpenChange(false);
  }

  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      {label ? <Label className="text-xs text-muted-foreground">{label}</Label> : null}
      <button
        type="button"
        disabled={disabled || (!options.length && !allowClear)}
        onClick={() => handleOpenChange(true)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm shadow-sm",
          "hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <span className={cn("min-w-0 truncate", !selected && !value && "text-muted-foreground")}>
          {selected?.titulo ?? (allowClear && !value ? clearLabel : null) ?? placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[90vh] w-[min(96vw,56rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:rounded-xl">
          <DialogHeader className="space-y-3 border-b px-5 py-4 text-left sm:text-left">
            <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
              <div className="min-w-0 space-y-1">
                <DialogTitle>Selecionar avaliação</DialogTitle>
                {scopeParts.length ? (
                  <DialogDescription>{scopeParts.join(" · ")}</DialogDescription>
                ) : (
                  <DialogDescription>Busque e escolha a avaliação do recorte.</DialogDescription>
                )}
              </div>
              <Badge variant="secondary" className="shrink-0">
                {options.length} {options.length === 1 ? "avaliação" : "avaliações"}
              </Badge>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nome..."
                  className="h-10 pl-9"
                  autoFocus
                />
              </div>
              {series.length ? (
                <Select value={serieFilter} onValueChange={setSerieFilter}>
                  <SelectTrigger className="h-10 w-full sm:w-52">
                    <SelectValue placeholder="Todas as séries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_SERIES}>Todas as séries</SelectItem>
                    {series.map((serie) => (
                      <SelectItem key={serie.id} value={serie.id}>
                        {serie.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {allowClear ? (
              <button
                type="button"
                onClick={() => selectOption("")}
                className={cn(
                  "mb-3 flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                  !value
                    ? "border-brand-highlight bg-brand-highlight/10"
                    : "border-border hover:border-brand-highlight/40 hover:bg-muted/40"
                )}
              >
                <span className="font-medium">{clearLabel}</span>
                {!value ? <Check className="h-4 w-4 text-brand-highlight" /> : null}
              </button>
            ) : null}

            {!options.length ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
            ) : !filtered.length ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhuma avaliação com essa busca.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((item) => {
                  const active = item.id === value;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectOption(item.id)}
                      className={cn(
                        "relative flex min-h-[5.5rem] flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors",
                        active
                          ? "border-brand-highlight bg-brand-highlight/10 shadow-sm"
                          : "border-border bg-card hover:border-brand-highlight/40 hover:bg-muted/30"
                      )}
                    >
                      {active ? (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-highlight text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      ) : null}
                      <span className="flex items-start gap-2 pr-6">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand-highlight" />
                        <span className="min-w-0 font-medium leading-snug">{item.titulo}</span>
                      </span>
                      {item.tags?.length ? (
                        <span className="flex flex-wrap gap-1.5 pl-6">
                          {item.tags.map((tag) => (
                            <Badge key={`${item.id}-${tag}`} variant="outline" className="font-normal">
                              {tag}
                            </Badge>
                          ))}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="flex-row items-center justify-between gap-3 border-t px-5 py-3 sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "opção disponível" : "opções disponíveis"}
            </p>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
