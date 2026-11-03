"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export interface ChipFilterOption {
  value: string;
  label: string;
}

interface ChipFilterProps {
  label: string;
  value: string;
  options: ChipFilterOption[];
  onChange: (value: string) => void;
  allValue?: string;
  className?: string;
}

export function ChipFilter({
  label,
  value,
  options,
  onChange,
  allValue = "all",
  className,
}: ChipFilterProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const allSelected = value === allValue;

  function moveFocus(index: number, direction: -1 | 1) {
    if (!options.length) return;
    const target = (index + direction + options.length) % options.length;
    refs.current[target]?.focus();
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}:</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((option, index) => {
          const selected = value === option.value;
          const includedByAll = allSelected && option.value !== allValue;
          return (
            <button
              key={option.value}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected || (!options.some((item) => item.value === value) && index === 0) ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  event.preventDefault();
                  moveFocus(index, 1);
                } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  event.preventDefault();
                  moveFocus(index, -1);
                } else if (event.key === " " || event.key === "Enter") {
                  event.preventDefault();
                  onChange(option.value);
                }
              }}
              className={cn(
                "min-h-9 rounded-md border px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--system-text)] focus-visible:ring-offset-2",
                selected
                  ? "border-transparent text-white shadow-sm"
                  : "border-border bg-muted/70 text-foreground hover:bg-muted",
                includedByAll && "border-dashed border-[var(--system-text)]"
              )}
              style={selected ? { background: "var(--system-gradient)" } : undefined}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
