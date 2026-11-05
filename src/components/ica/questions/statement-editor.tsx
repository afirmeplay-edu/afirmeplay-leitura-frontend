"use client";

import { useEffect, useRef } from "react";
import { ImagePlus } from "lucide-react";
import { QUESTION_IMAGE_ACCEPT, QuestionImageError, readQuestionImage } from "@/lib/ica/image-file";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface StatementEditorProps {
  id: string;
  value: string;
  onChange: (html: string) => void;
  placeholder: string;
  disabled?: boolean;
  invalid?: boolean;
  maxImages: number;
  onImageError: (message: string) => void;
}

/** Enunciado editável: a imagem entra no cursor, como no editor do Afirme Play. */
export function StatementEditor({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  invalid,
  maxImages,
  onImageError,
}: StatementEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rangeRef = useRef<Range | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    if (editor.innerHTML !== value) editor.innerHTML = value;
  }, [value]);

  function rememberRange() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    if (!editor.contains(selection.anchorNode)) return;
    rangeRef.current = selection.getRangeAt(0).cloneRange();
  }

  function emit() {
    onChange(editorRef.current?.innerHTML ?? "");
  }

  function placeImage(src: string) {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.querySelectorAll("img").length >= maxImages) {
      onImageError(`O enunciado aceita até ${maxImages} imagens.`);
      return;
    }
    const image = document.createElement("img");
    image.src = src;
    image.alt = "Imagem do enunciado";
    editor.focus();
    const selection = window.getSelection();
    const range = rangeRef.current;
    if (selection && range && editor.contains(range.startContainer)) {
      selection.removeAllRanges();
      selection.addRange(range);
      range.deleteContents();
      range.insertNode(image);
      range.setStartAfter(image);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      rangeRef.current = range.cloneRange();
    } else {
      editor.appendChild(image);
    }
    emit();
  }

  async function insertFile(file: File | undefined) {
    if (!file) return;
    try {
      placeImage(await readQuestionImage(file));
    } catch (error) {
      onImageError(error instanceof QuestionImageError ? error.message : "Não foi possível anexar a imagem.");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <input
          ref={fileRef}
          type="file"
          accept={QUESTION_IMAGE_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            void insertFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          disabled={disabled}
          onMouseDown={(event) => {
            event.preventDefault();
            rememberRange();
          }}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" />
          Inserir imagem
        </Button>
      </div>
      <div
        id={id}
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        aria-invalid={invalid || undefined}
        aria-placeholder={placeholder}
        contentEditable={disabled ? "false" : "true"}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onKeyUp={rememberRange}
        onMouseUp={rememberRange}
        onPaste={(event) => {
          const file = Array.from(event.clipboardData.files).find((item) => item.type.startsWith("image/"));
          if (!file) return;
          event.preventDefault();
          rememberRange();
          void insertFile(file);
        }}
        className={cn(
          "statement-editor question-html min-h-[140px] w-full rounded-md border bg-background px-3 py-2 text-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          disabled && "cursor-not-allowed opacity-60",
          invalid && "border-red-500"
        )}
      />
      <p className="text-xs text-muted-foreground">
        A imagem entra onde estiver o cursor. PNG, JPG, GIF ou WEBP até 1 MB (até {maxImages}).
      </p>
    </div>
  );
}
