"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface DataListColumn<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  hideOnMobile?: boolean;
}

interface DataListPageProps<T extends { id: string }> {
  title: string;
  description: string;
  icon: LucideIcon;
  items: T[];
  columns: DataListColumn<T>[];
  createHref?: string;
  createLabel?: string;
  searchPlaceholder?: string;
  searchFilter: (item: T, query: string) => boolean;
  rowHref?: (item: T) => string;
  actions?: (item: T) => ReactNode;
}

export function DataListPage<T extends { id: string }>({
  title,
  description,
  icon,
  items,
  columns,
  createHref,
  createLabel = "Novo",
  searchPlaceholder = "Buscar...",
  searchFilter,
  rowHref,
  actions,
}: DataListPageProps<T>) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => items.filter((item) => searchFilter(item, query.toLowerCase())),
    [items, query, searchFilter]
  );

  const primaryCol = columns[0];
  const mobileCols = columns.filter((c) => !c.hideOnMobile);

  return (
    <PageShell>
      <PageHeader title={title} description={description} icon={icon}>
        {createHref && (
          <Button asChild className="w-full sm:w-auto">
            <Link href={createHref}>
              <Plus className="mr-2 h-4 w-4" />
              {createLabel}
            </Link>
          </Button>
        )}
      </PageHeader>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="relative mb-4 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="space-y-2">
                  {primaryCol && (
                    <div>
                      {rowHref ? (
                        <Link
                          href={rowHref(item)}
                          className="text-base font-semibold text-bluebrand-base hover:underline"
                        >
                          {primaryCol.render(item)}
                        </Link>
                      ) : (
                        <p className="text-base font-semibold">{primaryCol.render(item)}</p>
                      )}
                    </div>
                  )}
                  {mobileCols.slice(1).map((col) => (
                    <div key={col.key} className="flex items-start justify-between gap-3 text-sm">
                      <span className="shrink-0 text-muted-foreground">{col.header}</span>
                      <span className="min-w-0 text-right">{col.render(item)}</span>
                    </div>
                  ))}
                </div>
                {actions && (
                  <div className="mt-3 flex flex-wrap gap-3 border-t pt-3">{actions(item)}</div>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum registro encontrado.</p>
            )}
          </div>

          {/* Desktop: table */}
          <div className="-mx-1 hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col.key} className="whitespace-nowrap">
                      {col.header}
                    </TableHead>
                  ))}
                  {actions && <TableHead className="text-right">Acoes</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    {columns.map((col) => (
                      <TableCell key={col.key} className="max-w-[200px] truncate">
                        {rowHref && col.key === primaryCol?.key ? (
                          <Link href={rowHref(item)} className="font-medium text-bluebrand-base hover:underline">
                            {col.render(item)}
                          </Link>
                        ) : (
                          col.render(item)
                        )}
                      </TableCell>
                    ))}
                    {actions && <TableCell className="text-right whitespace-nowrap">{actions(item)}</TableCell>}
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length + (actions ? 1 : 0)}
                      className="text-center text-muted-foreground"
                    >
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
