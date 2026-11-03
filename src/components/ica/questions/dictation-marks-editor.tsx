"use client";

import { Megaphone } from "lucide-react";
import type { DictationMarks } from "@/lib/api/afirme-reading/types";
import { normalizeDictationMarks } from "@/lib/ica/dictation-marks";
import { optionLetter } from "@/lib/ica/questions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function DictationMarkButton({
  active,
  label,
  disabled,
  onClick,
  withLabel = false,
}: {
  active: boolean;
  label: string;
  disabled?: boolean;
  onClick: () => void;
  withLabel?: boolean;
}) {
  const spoken = label.toLowerCase();
  return (
    <Button
      type="button"
      variant="outline"
      size={withLabel ? "sm" : "icon"}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        withLabel ? "h-8 gap-1.5 text-xs" : "h-9 w-9 shrink-0",
        active && "border-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-100"
      )}
      title={active ? `Não ler ${spoken} em voz alta` : `Ler ${spoken} em voz alta`}
      aria-label={active ? `Não ler ${spoken} em voz alta` : `Ler ${spoken} em voz alta`}
    >
      <Megaphone className={withLabel ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
      {withLabel ? label : null}
    </Button>
  );
}

interface DictationMarksEditorProps {
  value: DictationMarks | null | undefined;
  onChange: (value: DictationMarks) => void;
  imageCount?: number;
  optionCount?: number;
  disabled?: boolean;
  compact?: boolean;
}

export function DictationMarksEditor({
  value,
  onChange,
  imageCount = 0,
  optionCount = 0,
  disabled,
  compact,
}: DictationMarksEditorProps) {
  const marks = normalizeDictationMarks(value);

  function toggleBoolean(field: "title" | "statement" | "support") {
    onChange({ ...marks, [field]: !marks[field] });
  }

  function toggleImage(index: number) {
    onChange({
      ...marks,
      images: marks.images.includes(index) ? marks.images.filter((item) => item !== index) : [...marks.images, index].sort(),
    });
  }

  function toggleOption(letter: string) {
    onChange({
      ...marks,
      options: marks.options.includes(letter)
        ? marks.options.filter((item) => item !== letter)
        : [...marks.options, letter].sort(),
    });
  }

  const toggle = (active: boolean, label: string, onClick: () => void) => (
    <DictationMarkButton key={label} active={active} label={label} disabled={disabled} onClick={onClick} withLabel />
  );

  return (
    <div className={cn("space-y-2", compact && "space-y-1.5")}>
      {!compact ? (
        <p className="text-xs text-muted-foreground">Marque o que o aplicador deve ler em voz alta.</p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {toggle(marks.title, "Título", () => toggleBoolean("title"))}
        {toggle(marks.statement, "Enunciado", () => toggleBoolean("statement"))}
        {toggle(marks.support, "Apoio", () => toggleBoolean("support"))}
        {Array.from({ length: imageCount }, (_, index) =>
          toggle(marks.images.includes(index), `Imagem ${index + 1}`, () => toggleImage(index))
        )}
        {Array.from({ length: optionCount }, (_, index) => {
          const letter = optionLetter(index);
          return toggle(marks.options.includes(letter), `Alternativa ${letter}`, () => toggleOption(letter));
        })}
      </div>
    </div>
  );
}
