"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Eye, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteGuidedAutoSession, listGuidedAutoSessions } from "@/lib/api/afirme-reading/guided-auto-sessions";
import type { GuidedAutoSession, GuidedAutoStatus } from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import { ROUTES } from "@/config/routes";
import { GUIDED_AUTO_STATUS_BADGE, GUIDED_AUTO_STATUS_LABEL } from "@/lib/fluencia/guided-auto";
import { formatDateTimeIso, formatDecimal, formatPct } from "@/lib/relatorios-fluencia/format";
import { AdminCityPicker } from "@/components/auth/admin-city-picker";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageShell } from "@/components/shared/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ALL = "__all__";
const STATUSES = Object.keys(GUIDED_AUTO_STATUS_LABEL) as GuidedAutoStatus[];

export function AutoSessionsListPage() {
  const [cityReady, setCityReady] = useState(false);
  const [cityKey, setCityKey] = useState("none");
  const [status, setStatus] = useState<GuidedAutoStatus | "">("");
  const [items, setItems] = useState<GuidedAutoSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [deleting, setDeleting] = useState<GuidedAutoSession | null>(null);

  const handleCityReadyChange = useCallback((ready: boolean, cityId: string | null) => {
    setCityReady(ready);
    setCityKey(cityId || "none");
    if (!ready) setItems([]);
  }, []);

  useEffect(() => {
    if (!cityReady || cityKey === "none") return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listGuidedAutoSessions({ status: status || undefined, limit: 100 })
      .then((data) => !cancelled && setItems(data))
      .catch((err) => {
        if (cancelled) return;
        setItems([]);
        setError(normalizeApiError(err, "Não foi possível carregar as leituras automáticas.").message);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [cityReady, cityKey, status, reloadKey]);

  async function handleDelete() {
    if (!deleting) return;
    await deleteGuidedAutoSession(deleting.id);
    toast.success("Leitura automática excluída.");
    setItems((list) => list.filter((item) => item.id !== deleting.id));
    setDeleting(null);
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Praticar"
        title="Leitura automática"
        description="O aluno lê em voz alta e o servidor corrige: transcrição, precisão, PLCM e alinhamento palavra a palavra."
        icon={Bot}
      >
        <Button asChild className="w-full sm:w-auto">
          <Link href={ROUTES.leitura.automatica.nova}>
            <Plus className="h-4 w-4" />
            Nova leitura
          </Link>
        </Button>
      </PageHeader>

      <AdminCityPicker onCityReadyChange={handleCityReadyChange} />

      {!cityReady || cityKey === "none" ? (
        <p className="surface-panel border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Selecione o município para carregar as leituras.
        </p>
      ) : (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="max-w-xs space-y-1.5">
              <Label htmlFor="auto-status" className="text-xs text-muted-foreground">
                Status
              </Label>
              <Select value={status || ALL} onValueChange={(value) => setStatus(value === ALL ? "" : (value as GuidedAutoStatus))}>
                <SelectTrigger id="auto-status" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {STATUSES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {GUIDED_AUTO_STATUS_LABEL[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
                  <RefreshCw className="h-4 w-4" />
                  Tentar novamente
                </Button>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <p className="text-sm text-muted-foreground">Nenhuma leitura automática ainda.</p>
                <Button asChild>
                  <Link href={ROUTES.leitura.automatica.nova}>Começar uma leitura</Link>
                </Button>
              </div>
            ) : (
              <div className="-mx-1 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estudante</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">PLCM</TableHead>
                      <TableHead className="text-right">Precisão</TableHead>
                      <TableHead>Criada em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">{session.studentName || "Aluno"}</TableCell>
                        <TableCell>
                          <Badge variant={GUIDED_AUTO_STATUS_BADGE[session.status]}>{GUIDED_AUTO_STATUS_LABEL[session.status]}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatDecimal(session.calculatedPlcm)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatPct(session.calculatedAccuracy)}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTimeIso(session.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-9" asChild>
                              <Link href={ROUTES.leitura.automatica.detalhe(session.id)}>
                                <Eye className="h-4 w-4" />
                                Abrir
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 text-red-700 hover:bg-red-50"
                              onClick={() => setDeleting(session)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Excluir
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Excluir esta leitura?"
        description="A sessão, os áudios e o resultado serão removidos."
        confirmLabel="Excluir"
        variant="destructive"
        icon={Trash2}
        onConfirm={handleDelete}
      />
    </PageShell>
  );
}
