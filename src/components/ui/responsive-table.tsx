"use client";

import type { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface ResponsiveTableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
}

interface ResponsiveTableProps<T extends { id: string }> {
  columns: ResponsiveTableColumn<T>[];
  data: T[];
  className?: string;
}

export function ResponsiveTable<T extends { id: string }>({ columns, data, className }: ResponsiveTableProps<T>) {
  const primary = columns[0];

  return (
    <div className={cn("min-w-0", className)}>
      <div className="space-y-3 md:hidden">
        {data.map((item) => (
          <div key={item.id} className="rounded-lg border p-3 text-sm">
            {primary && (
              <p className="mb-2 font-semibold text-bluebrand-deep">{primary.render(item)}</p>
            )}
            {columns.slice(1).map((col) => (
              <div key={col.key} className="flex justify-between gap-2 py-0.5">
                <span className="text-muted-foreground">{col.header}</span>
                <span className="text-right">{col.render(item)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className="whitespace-nowrap">
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                {columns.map((col) => (
                  <TableCell key={col.key}>{col.render(item)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
