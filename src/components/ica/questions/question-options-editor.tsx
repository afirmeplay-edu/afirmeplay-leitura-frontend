"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { QUESTION_IMAGE_ACCEPT, QuestionImageError, readQuestionImage } from "@/lib/ica/image-file";
import { MAX_QUESTION_OPTIONS, MIN_QUESTION_OPTIONS, optionLetter } from "@/lib/ica/questions";
import { cn } from "@/lib/utils";
import { emptyOption, optionImageSrc, type OptionDraft } from "@/components/ica/questions/question-draft";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const EXIT_MS = 150;

interface QuestionOptionsEditorProps {
  options: OptionDraft[];
  onChange: (options: OptionDraft[]) => void;
  disabled?: boolean;
  optionErrors?: Record<number, string>;
  groupError?: string | null;
}

export function QuestionOptionsEditor({
  options,
  onChange,
  disabled,
  optionErrors = {},
  groupError,
}: QuestionOptionsEditorProps) {
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const [entering, setEntering] = useState<Set<string>>(new Set());
  const radioRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const fileInputs = useRef<Map<string, HTMLInputElement>>(new Map());
  const latestOptions = useRef(options);
  latestOptions.current = options;

  function update(key: string, patch: Partial<OptionDraft>) {
    onChange(options.map((option) => (option.key === key ? { ...option, ...patch } : option)));
  }

  function markCorrect(key: string) {
    onChange(options.map((option) => ({ ...option, isCorrect: option.key === key })));
  }

  function addOption() {
    if (options.length >= MAX_QUESTION_OPTIONS) return;
    const option = emptyOption();
    setEntering((prev) => new Set(prev).add(option.key));
    onChange([...options, option]);
    window.setTimeout(() => {
      setEntering((prev) => {
        const next = new Set(prev);
        next.delete(option.key);
        return next;
      });
    }, 250);
  }

  function removeOption(key: string) {
    if (options.length <= MIN_QUESTION_OPTIONS || leaving.has(key)) return;
    setLeaving((prev) => new Set(prev).add(key));
    window.setTimeout(() => {
      setLeaving((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      onChange(latestOptions.current.filter((option) => option.key !== key));
    }, EXIT_MS);
  }

  async function attachImage(key: string, file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await readQuestionImage(file);
      update(key, { image: dataUrl });
    } catch (error) {
      toast.error(error instanceof QuestionImageError ? error.message : "Não foi possível anexar a imagem.");
    }
  }

  function onRadioKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const delta = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = options[(index + delta + options.length) % options.length];
    if (!next) return;
    markCorrect(next.key);
    radioRefs.current.get(next.key)?.focus();
  }

  const checkedIndex = options.findIndex((option) => option.isCorrect);

  return (
    <div className="space-y-3">
      <p id="alternativas-ajuda" className="text-xs text-muted-foreground">
        Clique na letra para marcar a alternativa correta (gabarito). De {MIN_QUESTION_OPTIONS} a {MAX_QUESTION_OPTIONS}{" "}
        alternativas, cada uma com texto ou imagem.
      </p>

      <ul role="radiogroup" aria-label="Alternativa correta" aria-describedby="alternativas-ajuda" className="space-y-2">
        {options.map((option, index) => {
          const letter = optionLetter(index);
          const imageSrc = optionImageSrc(option.image);
          const error = optionErrors[index];
          const isLeaving = leaving.has(option.key);
          const tabbable = checkedIndex === -1 ? index === 0 : option.isCorrect;

          return (
            <li
              key={option.key}
              className={cn(
                "rounded-xl border p-3 transition-colors duration-200",
                option.isCorrect ? "border-emerald-300 bg-emerald-50/60" : "border-border bg-background",
                error && "border-red-300",
                entering.has(option.key) && "animate-in fade-in-0 slide-in-from-top-1 duration-200",
                isLeaving && "pointer-events-none animate-out fade-out-0 slide-out-to-top-1 fill-mode-forwards duration-150"
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  ref={(node) => {
                    if (node) radioRefs.current.set(option.key, node);
                    else radioRefs.current.delete(option.key);
                  }}
                  type="button"
                  role="radio"
                  aria-checked={option.isCorrect}
                  aria-label={`Alternativa ${letter}${option.isCorrect ? " (correta)" : ""}`}
                  tabIndex={tabbable ? 0 : -1}
                  disabled={disabled}
                  onClick={() => markCorrect(option.key)}
                  onKeyDown={(event) => onRadioKeyDown(event, index)}
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    option.isCorrect
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-muted-foreground/30 bg-background text-muted-foreground hover:border-brand-highlight hover:text-brand-highlight"
                  )}
                >
                  {letter}
                </button>

                <div className="min-w-0 flex-1 space-y-2">
                  <Textarea
                    value={option.text}
                    onChange={(event) => update(option.key, { text: event.target.value })}
                    placeholder={`Texto da alternativa ${letter}`}
                    aria-label={`Texto da alternativa ${letter}`}
                    aria-invalid={Boolean(error)}
                    rows={1}
                    className="min-h-10 resize-y"
                    disabled={disabled}
                  />
                  {imageSrc ? (
                    <div className="relative inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element -- data-URL local ou imagem do backend via /api */}
                      <img
                        src={imageSrc}
                        alt={`Imagem da alternativa ${letter}`}
                        className="max-h-32 rounded-lg border object-contain"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-background"
                        onClick={() => update(option.key, { image: null })}
                        disabled={disabled}
                        aria-label={`Remover imagem da alternativa ${letter}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : null}
                  {error ? (
                    <p className="text-xs font-medium text-red-700" role="alert">
                      {error}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                  <input
                    ref={(node) => {
                      if (node) fileInputs.current.set(option.key, node);
                      else fileInputs.current.delete(option.key);
                    }}
                    type="file"
                    accept={QUESTION_IMAGE_ACCEPT}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                    onChange={(event) => {
                      void attachImage(option.key, event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    disabled={disabled}
                    onClick={() => fileInputs.current.get(option.key)?.click()}
                    aria-label={imageSrc ? `Trocar imagem da alternativa ${letter}` : `Anexar imagem à alternativa ${letter}`}
                    title="Imagem (PNG, JPG, GIF ou WEBP, até 1 MB)"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-red-700 hover:bg-red-50"
                    disabled={disabled || options.length <= MIN_QUESTION_OPTIONS}
                    onClick={() => removeOption(option.key)}
                    aria-label={`Remover alternativa ${letter}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {groupError ? (
        <p className="text-xs font-medium text-red-700" role="alert">
          {groupError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={addOption}
          disabled={disabled || options.length >= MAX_QUESTION_OPTIONS}
        >
          <Plus className="h-4 w-4" />
          Adicionar alternativa
        </Button>
        <span className="text-xs text-muted-foreground">
          {options.length}/{MAX_QUESTION_OPTIONS} alternativas
        </span>
      </div>
    </div>
  );
}
