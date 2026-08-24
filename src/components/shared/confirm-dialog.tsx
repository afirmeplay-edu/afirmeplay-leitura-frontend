"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const ERROR_TOAST_ID = "confirm-dialog-error";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "default" | "destructive";
  icon?: LucideIcon;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  variant = "default",
  icon: Icon,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPending(false);
      setErrorMessage(null);
      toast.dismiss(ERROR_TOAST_ID);
    }
  }, [open]);

  function handleClose() {
    if (pending) return;
    setErrorMessage(null);
    toast.dismiss(ERROR_TOAST_ID);
    onOpenChange(false);
  }

  async function handleConfirm(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (pending) return;
    setErrorMessage(null);
    toast.dismiss(ERROR_TOAST_ID);
    setPending(true);
    try {
      await onConfirm();
    } catch (error) {
      const message = getApiErrorMessage(error, "Não foi possível concluir.");
      setErrorMessage(message);
      toast.error(message, { id: ERROR_TOAST_ID, duration: Infinity });
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (!next) {
          setPending(false);
          setErrorMessage(null);
          toast.dismiss(ERROR_TOAST_ID);
        }
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-primary" />}
            {title}
          </AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {errorMessage ? (
          <p
            role="alert"
            className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800"
          >
            {errorMessage}
          </p>
        ) : null}
        <AlertDialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={handleClose}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={(event) => void handleConfirm(event)}
            className={cn(variant === "destructive" && "bg-destructive text-destructive-foreground hover:opacity-90")}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
