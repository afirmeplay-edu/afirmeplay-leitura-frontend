"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRelatorioFluencia } from "@/lib/relatorios-fluencia/store";
import { EDICAO_LABEL, type EdicaoCode } from "@/lib/relatorios-fluencia/types";
import { Eraser } from "lucide-react";

const TODOS = "__todos__";

function val(v: string) {
  return v || TODOS;
}

function fromVal(v: string) {
  return v === TODOS ? "" : v;
}

export function RelatorioFiltros() {
  const { filtros, setFiltros, limparFiltros, catalog } = useRelatorioFluencia();

  const municipios = catalog.municipios.filter((m) => !filtros.redeId || m.redeId === filtros.redeId);
  const escolas = catalog.escolas.filter((e) => !filtros.municipioId || e.municipioId === filtros.municipioId);
  const turmas = catalog.turmas.filter((t) => {
    if (filtros.escolaId && t.escolaId !== filtros.escolaId) return false;
    if (filtros.serieId && t.serieId !== filtros.serieId) return false;
    return true;
  });
  const turnos = Array.from(new Set(catalog.turmas.map((t) => t.turno)));

  return (
    <div className="print:hidden space-y-4 rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Filtros</p>
        <Button type="button" variant="outline" size="sm" onClick={limparFiltros}>
          <Eraser className="mr-2 h-4 w-4" />
          Limpar
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <Field label="Ano">
          <Select value={String(filtros.ano)} onValueChange={(v) => setFiltros({ ano: Number(v) })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {catalog.anos.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Edição">
          <Select value={filtros.edicao} onValueChange={(v) => setFiltros({ edicao: v as EdicaoCode })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(EDICAO_LABEL) as EdicaoCode[]).map((e) => (
                <SelectItem key={e} value={e}>
                  {EDICAO_LABEL[e]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Rede">
          <Select value={val(filtros.redeId)} onValueChange={(v) => setFiltros({ redeId: fromVal(v) })}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {catalog.redes.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Município">
          <Select value={val(filtros.municipioId)} onValueChange={(v) => setFiltros({ municipioId: fromVal(v) })}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {municipios.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Escola">
          <Select value={val(filtros.escolaId)} onValueChange={(v) => setFiltros({ escolaId: fromVal(v) })}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {escolas.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Série">
          <Select value={val(filtros.serieId)} onValueChange={(v) => setFiltros({ serieId: fromVal(v) })}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {catalog.series.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Turma">
          <Select value={val(filtros.turmaId)} onValueChange={(v) => setFiltros({ turmaId: fromVal(v) })}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {turmas.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Turno">
          <Select value={val(filtros.turno)} onValueChange={(v) => setFiltros({ turno: fromVal(v) })}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {turnos.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
