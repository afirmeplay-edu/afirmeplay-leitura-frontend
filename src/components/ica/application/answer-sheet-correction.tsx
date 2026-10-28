"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { correctAnswerSheets } from "@/lib/api/afirme-reading/written-tests";
import type {
  AnswerSheetCorrectionIssue,
  AnswerSheetCorrectionQr,
  AnswerSheetCorrectionResult,
  AnswerSheetCorrectionStudent,
  AnswerSheetCrop,
} from "@/lib/api/afirme-reading/types";
import { normalizeApiError } from "@/lib/api/errors";
import { SectionCard } from "@/components/shared/section-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.gif,application/pdf,image/png,image/jpeg,image/webp,image/gif";
const SCAN_NAME = /\.(pdf|png|jpe?g|webp|gif)$/i;
const SCAN_TYPE = /^(application\/pdf|image\/(png|jpeg|webp|gif))$/i;

interface SelectedScan {
  key: string;
  file: File;
}

function isScanFile(file: File) {
  if (SCAN_TYPE.test(file.type)) return true;
  if (!file.type || file.type === "application/octet-stream") return SCAN_NAME.test(file.name);
  return false;
}

function fileSignature(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function byNumber<T extends { number: number }>(items: T[]) {
  return [...items].sort((a, b) => a.number - b.number);
}

function numbersLabel(items: Array<{ number: number }>) {
  return byNumber(items)
    .map((item) => item.number)
    .join(", ");
}

function cropTitle(crop: AnswerSheetCrop) {
  if (crop.number === 19) return "Bilhete";
  if (crop.number === 17 || crop.number === 18) return `Ditado ${crop.number}`;
  return `Questão ${crop.number}`;
}

function pageLabel(index: number) {
  return `página ${index + 1}`;
}

function qrTitle(qr: AnswerSheetCorrectionQr | null | undefined) {
  if (!qr) return undefined;
  const parts = [
    qr.student_id ? `Aluno ${qr.student_id}` : null,
    qr.written_test_id ? `Avaliação ${qr.written_test_id}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
}

function qrLine(qr: AnswerSheetCorrectionQr | null | undefined) {
  if (qr?.page == null) return null;
  return qr.page_count != null ? `QR: página ${qr.page} de ${qr.page_count}` : `QR: página ${qr.page}`;
}

export function AnswerSheetCorrection({
  writtenTestId,
  hasGeneratedCards,
  mapReady,
  onCorrected,
}: {
  writtenTestId: string;
  hasGeneratedCards: boolean;
  mapReady: boolean;
  onCorrected?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<SelectedScan[]>([]);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AnswerSheetCorrectionResult | null>(null);
  const ready = hasGeneratedCards && mapReady;

  function addFiles(list: FileList | null) {
    if (!list?.length || !ready || submitting) return;
    const incoming = Array.from(list);
    const rejected = incoming.filter((file) => !isScanFile(file));
    const accepted = incoming.filter(isScanFile);
    if (rejected.length) {
      toast.error(
        rejected.length === 1
          ? `${rejected[0].name} não é PDF nem imagem.`
          : `${rejected.length} arquivos não são PDF nem imagem.`
      );
    }
    if (!accepted.length) return;
    setSelected((current) => {
      const known = new Set(current.map((item) => fileSignature(item.file)));
      const next = accepted
        .filter((file) => !known.has(fileSignature(file)))
        .map((file) => ({ key: `${fileSignature(file)}:${crypto.randomUUID()}`, file }));
      return next.length ? [...current, ...next] : current;
    });
  }

  async function handleSubmit() {
    if (!ready || submitting || selected.length === 0) return;
    setSubmitting(true);
    setResult(null);
    try {
      const data = await correctAnswerSheets(
        writtenTestId,
        selected.map((item) => item.file)
      );
      setResult(data);
      setSelected([]);
      onCorrected?.();
      const savedCount = data.students.filter((student) => student.saved).length;
      const pendingCount =
        data.skipped.length + data.errors.length + data.students.filter((student) => !student.saved).length;
      if (savedCount > 0) {
        toast.success(
          pendingCount
            ? `Correção concluída: ${savedCount} aluno(s) salvos, ${pendingCount} com pendência.`
            : `Correção concluída: ${savedCount} aluno(s) salvos.`
        );
      } else {
        toast.error("Nenhuma folha foi salva. Veja o motivo na lista.");
      }
    } catch (error) {
      toast.error(normalizeApiError(error, "Não foi possível corrigir os cartões.").message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SectionCard
      title="Corrigir cartões"
      description="PDF ou fotos das folhas preenchidas. Cada página de um PDF é lida à parte. A resposta traz a letra de cada objetiva e se o ditado e o bilhete foram salvos."
      icon={Upload}
    >
      <div className="space-y-5">
        {!hasGeneratedCards ? (
          <Alert>
            <AlertDescription>Gere os cartões-resposta antes de enviar as folhas digitalizadas.</AlertDescription>
          </Alert>
        ) : !mapReady ? (
          <Alert>
            <AlertDescription>
              Gere os cartões-resposta de novo antes de corrigir. O mapa não tem o quadrado de cada questão.
            </AlertDescription>
          </Alert>
        ) : null}

        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (ready && !submitting) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            addFiles(event.dataTransfer.files);
          }}
          className={cn(
            "rounded-xl border border-dashed p-4 transition-colors",
            dragging && "border-brand-highlight bg-brand-highlight/5",
            !ready && "opacity-60"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            disabled={!ready || submitting}
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Arraste os scans ou escolha os arquivos. Várias folhas e alunos podem ir no mesmo envio.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={!ready || submitting}
              onClick={() => inputRef.current?.click()}
            >
              <FileText className="h-4 w-4" />
              Selecionar arquivos
            </Button>
          </div>

          {selected.length ? (
            <ul className="mt-4 space-y-2">
              {selected.map((item) => (
                <li key={item.key} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1 truncate" title={item.file.name}>
                    {item.file.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatBytes(item.file.size)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 px-0"
                    disabled={submitting}
                    onClick={() => setSelected((current) => current.filter((entry) => entry.key !== item.key))}
                    aria-label={`Remover ${item.file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">Nenhum arquivo selecionado.</p>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            A folha 1 traz as objetivas e os dois ditados. A folha 2 traz o bilhete. Reenviar a mesma folha substitui a
            leitura daquela página.
          </p>
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={!ready || submitting || selected.length === 0}
            onClick={() => void handleSubmit()}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {selected.length > 1 ? `Corrigir ${selected.length} arquivos` : "Corrigir"}
          </Button>
        </div>

        {result ? <CorrectionResult result={result} /> : null}
      </div>
    </SectionCard>
  );
}

function CorrectionResult({ result }: { result: AnswerSheetCorrectionResult }) {
  const savedCount = result.students.filter((student) => student.saved).length;
  const unsaved = result.students.filter((student) => !student.saved);
  return (
    <div className="space-y-4" aria-live="polite">
      <p className="text-sm">
        <span className="font-medium">{savedCount}</span> aluno(s) salvos neste envio
        <span className="text-muted-foreground">
          {" "}
          · {result.skipped.length} folha(s) ignorada(s) · {result.errors.length} com falha · {result.fileCount}{" "}
          arquivo(s)
        </span>
      </p>
      <p className="text-xs text-muted-foreground">O resultado gravado, com as notas, aparece logo abaixo.</p>

      {unsaved.length ? (
        <ul className="space-y-3">
          {unsaved.map((student, index) => (
            <CorrectionStudent key={`${student.studentPrefix ?? "aluno"}-${index}`} student={student} />
          ))}
        </ul>
      ) : null}

      <CorrectionIssues title="Folhas ignoradas" items={result.skipped} />
      <CorrectionIssues title="Falhas de leitura" items={result.errors} />
    </div>
  );
}

function CorrectionStudent({ student }: { student: AnswerSheetCorrectionStudent }) {
  const answers = byNumber(student.answers);
  const crops = byNumber(student.crops);
  const name = student.studentName?.trim() || "Aluno não identificado";

  return (
    <li className="rounded-xl border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{name}</p>
        <Badge variant={student.saved ? "success" : "warning"}>{student.saved ? "Salvo" : "Não salvo"}</Badge>
      </div>
      {!student.studentName && student.studentPrefix ? (
        <p className="mt-1 text-xs text-muted-foreground">Prefixo {student.studentPrefix}</p>
      ) : null}
      {student.reason ? <p className="mt-1 text-sm text-muted-foreground">{student.reason}</p> : null}

      {answers.length ? (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Objetivas com uma marca</p>
          <div className="flex flex-wrap gap-1.5">
            {answers.map((answer) => (
              <span
                key={`${answer.number}-${answer.questionId}`}
                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
              >
                <span className="text-muted-foreground tabular-nums">{answer.number}</span>
                <span className="font-semibold">{answer.letter}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {student.blank.length ? (
        <p className="mt-2 text-sm">
          <span className="text-muted-foreground">Em branco: </span>
          {numbersLabel(student.blank)}
        </p>
      ) : null}
      {student.invalid.length ? (
        <p className="mt-1 text-sm">
          <span className="text-muted-foreground">Mais de uma marca: </span>
          {numbersLabel(student.invalid)}
        </p>
      ) : null}

      {crops.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {crops.map((crop) => (
            <Badge key={`${crop.number}-${crop.questionId}`} variant={crop.saved ? "success" : "warning"}>
              {cropTitle(crop)}
              {crop.saved ? " salvo" : " — upload falhou"}
            </Badge>
          ))}
        </div>
      ) : null}

      {student.pages.length || student.missingPages.length ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {student.pages.length ? `Folhas gravadas: ${student.pages.join(", ")}` : "Nenhuma folha gravada"}
          {student.missingPages.length ? ` · Ainda falta: ${student.missingPages.join(", ")}` : ""}
        </p>
      ) : null}
    </li>
  );
}

function CorrectionIssues({ title, items }: { title: string; items: AnswerSheetCorrectionIssue[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{title}</p>
      <ul className="space-y-2">
        {items.map((issue, index) => {
          const qr = qrLine(issue.qr);
          return (
            <li
              key={`${issue.fileIndex}-${issue.pageIndex}-${index}`}
              className="rounded-lg border px-3 py-2 text-sm"
              title={qrTitle(issue.qr)}
            >
              <p>
                <span className="font-medium">{issue.filename || `Arquivo ${issue.fileIndex + 1}`}</span>
                <span className="text-muted-foreground"> · {pageLabel(issue.pageIndex)}</span>
              </p>
              <p className="text-muted-foreground">{issue.reason}</p>
              {qr ? <p className="text-xs text-muted-foreground">{qr}</p> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
