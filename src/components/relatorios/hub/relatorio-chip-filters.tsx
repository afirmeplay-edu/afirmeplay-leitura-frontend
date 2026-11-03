"use client";

import { Eraser } from "lucide-react";
import { ChipFilter } from "@/components/shared/chip-filter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRelatorioFluencia } from "@/lib/relatorios-fluencia/store";
import { avaliacoesDoFiltro, EDICAO_LABEL, type EdicaoCode, type TurnoCode } from "@/lib/relatorios-fluencia/types";

const TODOS = "__todos__";

function val(v: string) {
  return v || TODOS;
}

function fromVal(v: string) {
  return v === TODOS ? "" : v;
}

export function RelatorioChipFilters() {
  const { filtros, setFiltros, limparFiltros, catalog, catalogLoading } = useRelatorioFluencia();

  const avaliacoes = avaliacoesDoFiltro(catalog, filtros.ano, filtros.edicao);
  const avaliacaoSel = avaliacoes.find((a) => a.id === filtros.avaliacaoId) ?? null;

  const municipios = catalog.municipios.filter(
    (m) => m.id && (!filtros.redeId || m.redeId === filtros.redeId)
  );
  const escolas = catalog.escolas.filter((e) => {
    if (!e.id) return false;
    if (avaliacaoSel?.escolaIds?.length && !avaliacaoSel.escolaIds.includes(e.id)) return false;
    if (filtros.municipioId && e.municipioId !== filtros.municipioId) return false;
    return true;
  });
  const series = catalog.series.filter((s) => {
    if (!s.id) return false;
    if (avaliacaoSel?.serieIds?.length && !avaliacaoSel.serieIds.includes(s.id)) return false;
    return true;
  });
  const turmas = catalog.turmas.filter((t) => {
    if (!t.id) return false;
    if (avaliacaoSel?.turmaIds?.length && !avaliacaoSel.turmaIds.includes(t.id)) return false;
    if (filtros.escolaId && t.escolaId !== filtros.escolaId) return false;
    if (filtros.serieId && t.serieId !== filtros.serieId) return false;
    return true;
  });
  const turnos = Array.from(
    new Set(turmas.map((t) => t.turno).filter((t): t is TurnoCode => Boolean(t)))
  );
  const edicoes = (
    catalog.edicoes.length
      ? catalog.edicoes
      : (Object.keys(EDICAO_LABEL) as EdicaoCode[]).map((id) => ({ id, label: EDICAO_LABEL[id] }))
  ).filter((e) => e.id);
  const anos = catalog.anos.length ? catalog.anos : [new Date().getFullYear()];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Filtros</p>
        <Button type="button" variant="outline" size="sm" onClick={limparFiltros} disabled={catalogLoading}>
          <Eraser className="mr-2 h-4 w-4" />
          Limpar
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Ano">
          <Select
            value={String(filtros.ano)}
            onValueChange={(v) => setFiltros({ ano: Number(v), avaliacaoId: "", turmaId: "" })}
            disabled={catalogLoading}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anos.map((ano) => (
                <SelectItem key={ano} value={String(ano)}>
                  {ano}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Avaliação">
          <Select
            value={val(filtros.avaliacaoId)}
            onValueChange={(v) => setFiltros({ avaliacaoId: fromVal(v), turmaId: "" })}
            disabled={catalogLoading}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas</SelectItem>
              {avaliacoes.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Município">
          <Select
            value={val(filtros.municipioId)}
            onValueChange={(v) => setFiltros({ municipioId: fromVal(v), escolaId: "", turmaId: "" })}
            disabled={catalogLoading}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
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
          <Select
            value={val(filtros.escolaId)}
            onValueChange={(v) => setFiltros({ escolaId: fromVal(v), turmaId: "" })}
            disabled={catalogLoading}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas</SelectItem>
              {escolas.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Série">
          <Select
            value={val(filtros.serieId)}
            onValueChange={(v) => setFiltros({ serieId: fromVal(v), turmaId: "" })}
            disabled={catalogLoading}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas</SelectItem>
              {series.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Turma">
          <Select
            value={val(filtros.turmaId)}
            onValueChange={(v) => setFiltros({ turmaId: fromVal(v) })}
            disabled={catalogLoading}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas</SelectItem>
              {turmas.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="space-y-3">
        <ChipFilter
          label="Edição"
          value={filtros.edicao}
          onChange={(value) =>
            setFiltros({ edicao: value as EdicaoCode, avaliacaoId: "", turmaId: "" })
          }
          allValue="__none__"
          options={edicoes.map((e) => ({
            value: e.id,
            label: e.label || EDICAO_LABEL[e.id as EdicaoCode] || e.id,
          }))}
        />
        {turnos.length ? (
          <ChipFilter
            label="Turno"
            value={val(filtros.turno)}
            onChange={(value) => setFiltros({ turno: fromVal(value), turmaId: "" })}
            allValue={TODOS}
            options={[
              { value: TODOS, label: "Todos" },
              ...turnos.map((t) => ({ value: t, label: t })),
            ]}
          />
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
