"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRelatorioFluencia } from "@/lib/relatorios-fluencia/store";
import { avaliacoesDoFiltro, EDICAO_LABEL, type EdicaoCode } from "@/lib/relatorios-fluencia/types";
import { Eraser } from "lucide-react";

const TODOS = "__todos__";

function val(v: string) {
  return v || TODOS;
}

function fromVal(v: string) {
  return v === TODOS ? "" : v;
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    rascunho: "Rascunho",
    agendada: "Agendada",
    em_andamento: "Em andamento",
    concluida: "Concluída",
  };
  return map[status] ?? status;
}

export function RelatorioFiltros() {
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
    new Set(turmas.map((t) => t.turno).filter((t): t is string => Boolean(t)))
  );
  const edicoes = (
    catalog.edicoes.length
      ? catalog.edicoes
      : (Object.keys(EDICAO_LABEL) as EdicaoCode[]).map((id) => ({ id, label: EDICAO_LABEL[id] }))
  ).filter((e) => e.id);
  const redes = catalog.redes.filter((r) => r.id);

  return (
    <div className="print:hidden space-y-4 rounded-xl border bg-white p-4">
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
            value={filtros.ano ? String(filtros.ano) : undefined}
            onValueChange={(v) => setFiltros({ ano: Number(v) })}
            disabled={catalogLoading || catalog.anos.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Ano" />
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
              {edicoes.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Avaliação">
          <Select
            value={filtros.avaliacaoId || undefined}
            onValueChange={(v) => setFiltros({ avaliacaoId: v })}
            disabled={catalogLoading || avaliacoes.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  avaliacoes.length === 0 ? "Nenhuma avaliação neste recorte" : "Selecione a avaliação"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {avaliacoes.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.titulo}
                  {a.status ? ` · ${statusLabel(a.status)}` : ""}
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
              {redes.map((r) => (
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
          <Select
            value={val(filtros.escolaId)}
            onValueChange={(v) => setFiltros({ escolaId: fromVal(v) })}
            disabled={!filtros.avaliacaoId}
          >
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
          <Select
            value={val(filtros.serieId)}
            onValueChange={(v) => setFiltros({ serieId: fromVal(v) })}
            disabled={!filtros.avaliacaoId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
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
            disabled={!filtros.avaliacaoId}
          >
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
