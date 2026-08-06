"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  createWordList,
  deleteWordList,
  listWordLists,
  updateWordList,
  type WordList,
  type WordListKind,
} from "@/lib/api/afirme-reading";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function parseItems(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function kindLabel(kind: WordListKind) {
  return kind === "PALAVRAS" ? "Palavras (Q1)" : "Pouco comuns (Q2)";
}

interface FormState {
  name: string;
  kind: WordListKind;
  itemsText: string;
  description: string;
  isDefault: boolean;
  active: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  kind: "PALAVRAS",
  itemsText: "",
  description: "",
  isDefault: false,
  active: true,
};

export function WordListsPanel() {
  const [lists, setLists] = useState<WordList[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listWordLists();
      setLists(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Nao foi possivel carregar as listas."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(list: WordList) {
    setEditingId(list.id);
    setForm({
      name: list.name,
      kind: list.kind,
      itemsText: list.items.join("\n"),
      description: list.description ?? "",
      isDefault: list.isDefault,
      active: list.active,
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error("Informe o nome da lista.");
      return;
    }
    const items = parseItems(form.itemsText);
    if (items.length === 0) {
      toast.error("Adicione ao menos uma palavra.");
      return;
    }

    const payload = {
      name,
      kind: form.kind,
      items,
      description: form.description.trim() || null,
      isDefault: form.isDefault,
      active: form.active,
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateWordList(editingId, payload);
        toast.success("Lista atualizada com sucesso.");
      } else {
        await createWordList(payload);
        toast.success("Lista criada com sucesso.");
      }
      closeForm();
      await loadLists();
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, editingId ? "Falha ao atualizar a lista." : "Falha ao criar a lista.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(list: WordList) {
    if (!window.confirm(`Excluir a lista "${list.name}"?`)) return;
    setDeletingId(list.id);
    try {
      await deleteWordList(list.id);
      toast.success("Lista excluida com sucesso.");
      if (editingId === list.id) closeForm();
      await loadLists();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Falha ao excluir a lista."));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-bluebrand-deep">Listas de palavras</h2>
        <Button onClick={openCreate} className="bg-bluebrand-deep text-white hover:opacity-95">
          <Plus className="h-4 w-4" />
          Nova lista
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando...
        </div>
      ) : lists.length === 0 ? (
        <p className="py-6 text-sm italic text-muted-foreground">Nenhuma lista cadastrada.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="border-b p-3 font-medium">Nome</th>
                <th className="border-b p-3 font-medium">Tipo</th>
                <th className="border-b p-3 text-center font-medium">Itens</th>
                <th className="border-b p-3 text-center font-medium">Padrao</th>
                <th className="border-b p-3 text-center font-medium">Ativa</th>
                <th className="border-b p-3 text-center font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {lists.map((list) => (
                <tr key={list.id} className="hover:bg-slate-50">
                  <td className="border-b p-3 font-medium text-bluebrand-deep">{list.name}</td>
                  <td className="border-b p-3">{kindLabel(list.kind)}</td>
                  <td className="border-b p-3 text-center">{list.items.length}</td>
                  <td className="border-b p-3 text-center">{list.isDefault ? "★" : ""}</td>
                  <td className="border-b p-3 text-center">{list.active ? "✓" : "—"}</td>
                  <td className="border-b p-3">
                    <div className="flex justify-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => openEdit(list)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-red-700 hover:bg-red-50"
                        disabled={deletingId === list.id}
                        onClick={() => void handleDelete(list)}
                      >
                        {deletingId === list.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-bluebrand-deep">
                {editingId ? "Editar lista" : "Nova lista"}
              </h3>
              <Button type="button" variant="ghost" size="icon" onClick={closeForm} aria-label="Fechar">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lista-nome">Nome</Label>
                <Input
                  id="lista-nome"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Lista de palavras complementar"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={form.kind}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, kind: value as WordListKind }))
                  }
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PALAVRAS">
                      Palavras comuns (Q1) — 60 itens recomendados
                    </SelectItem>
                    <SelectItem value="POUCO_COMUNS">
                      Palavras pouco comuns / Pseudopalavras (Q2) — 40 itens recomendados
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lista-desc">Descricao</Label>
                <Input
                  id="lista-desc"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Descricao opcional"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lista-items">
                  Palavras (uma por linha, ou separadas por virgula/ponto e virgula)
                </Label>
                <Textarea
                  id="lista-items"
                  value={form.itemsText}
                  onChange={(e) => setForm((prev) => ({ ...prev, itemsText: e.target.value }))}
                  className="min-h-[180px] font-mono text-sm"
                  placeholder={"NEVE\nLATA\nPIPOCA\n..."}
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  {parseItems(form.itemsText).length} palavras
                </p>
              </div>

              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="lista-default"
                    checked={form.isDefault}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, isDefault: checked === true }))
                    }
                    disabled={saving}
                  />
                  <Label htmlFor="lista-default">Marcar como padrao para o tipo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="lista-ativa"
                    checked={form.active}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, active: checked === true }))
                    }
                    disabled={saving}
                  />
                  <Label htmlFor="lista-ativa">Lista ativa</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-bluebrand-deep text-white hover:opacity-95"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : editingId ? (
                    "Salvar alteracoes"
                  ) : (
                    "Criar lista"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
