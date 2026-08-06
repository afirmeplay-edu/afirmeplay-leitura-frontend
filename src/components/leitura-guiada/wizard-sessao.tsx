"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { FullscreenLayout } from "@/components/layout/fullscreen-layout";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getMockStudentById, getMockTextById } from "@/lib/mock";
import { cn } from "@/lib/utils";

const STEPS = ["Leitura", "Avaliacao", "Compreensao", "Resultados"];

export function WizardSessao() {
  const router = useRouter();
  const params = useSearchParams();
  const student = getMockStudentById(params.get("aluno") ?? "");
  const text = getMockTextById(params.get("texto") ?? "");
  const [step, setStep] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [prosody, setProsody] = useState(3);
  const [, setAnswers] = useState<Record<string, number>>({});

  const words = text?.content.split(/\s+/) ?? [];
  const plcm = Math.max(40, 100 - errors.length * 5);
  const accuracy = Math.round(((words.length - errors.length) / words.length) * 100);

  return (
    <FullscreenLayout
      title="Leitura Guiada"
      subtitle={student ? `${student.name}` : ""}
      backHref="/app/avaliacao-leitura-guiada"
      onClose={() => setConfirmExit(true)}
    >
      <div className="mx-auto w-full min-w-0 max-w-3xl space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Etapa {step + 1} de {STEPS.length}</span>
            <span>{STEPS[step]}</span>
          </div>
          <Progress value={((step + 1) / STEPS.length) * 100} />
        </div>
        <div className="flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <Badge key={s} variant={i === step ? "default" : i < step ? "info" : "outline"}>
              {i + 1}. {s}
            </Badge>
          ))}
        </div>

        <Card>
          <CardContent className="space-y-6 pt-6">
            {step === 0 && text && (
              <>
                <h2 className="text-xl font-semibold">Etapa 1 — Leitura</h2>
                <p className="text-sm text-muted-foreground">Instrucoes: leia o texto em voz alta. Cronometro simulado: 2:30</p>
                <div className="rounded-lg border p-6 leading-relaxed">
                  {words.map((w, i) => (
                    <span key={i} className={cn("mr-1", i === 3 && "rounded bg-yellow-200 px-0.5")}>{w}</span>
                  ))}
                </div>
                <Button onClick={() => setStep(1)}>Avancar para avaliacao</Button>
              </>
            )}
            {step === 1 && text && (
              <>
                <h2 className="text-xl font-semibold">Etapa 2 — Avaliacao de erros</h2>
                <p className="text-sm text-muted-foreground">Clique nas palavras com erro de leitura:</p>
                <div className="flex flex-wrap gap-1">
                  {words.slice(0, 20).map((w, i) => (
                    <button
                      key={`${w}-${i}`}
                      type="button"
                      className={cn(
                        "rounded px-1 text-sm",
                        errors.includes(w) ? "bg-red-200 line-through" : "hover:bg-muted"
                      )}
                      onClick={() =>
                        setErrors((e) => (e.includes(w) ? e.filter((x) => x !== w) : [...e, w]))
                      }
                    >
                      {w}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label>Prosodia (1-5)</Label>
                  <input type="range" min={1} max={5} value={prosody} onChange={(e) => setProsody(Number(e.target.value))} className="w-full" />
                  <p className="text-sm">Nota: {prosody}</p>
                </div>
                <Button onClick={() => setStep(2)}>Avancar</Button>
              </>
            )}
            {step === 2 && text && (
              <>
                <h2 className="text-xl font-semibold">Etapa 3 — Compreensao</h2>
                {text.questions.map((q) => (
                  <div key={q.id} className="space-y-2">
                    <p className="font-medium">{q.text}</p>
                    <p className="text-xs text-muted-foreground">{q.descriptor}</p>
                    {q.options.map((opt, i) => (
                      <label key={opt} className="flex items-center gap-2 rounded border p-2">
                        <input type="radio" name={q.id} onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))} />
                        {opt}
                      </label>
                    ))}
                  </div>
                ))}
                <Button onClick={() => setStep(3)}>Ver resultados</Button>
              </>
            )}
            {step === 3 && (
              <>
                <h2 className="text-xl font-semibold">Etapa 4 — Resultados</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard label="PLCM" value={plcm} icon={AlertTriangle} />
                  <StatCard label="Precisao" value={`${accuracy}%`} icon={AlertTriangle} />
                  <StatCard label="Prosodia" value={`${prosody}/5`} icon={AlertTriangle} />
                </div>
                <Button className="w-full sm:w-auto">Salvar avaliacao (mock)</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog
        open={confirmExit}
        onOpenChange={setConfirmExit}
        title="Sair da sessao?"
        description="O progresso atual sera perdido nesta sessao demonstrativa."
        confirmLabel="Sair"
        variant="destructive"
        icon={AlertTriangle}
        onConfirm={() => router.push("/app/avaliacao-leitura-guiada")}
      />
    </FullscreenLayout>
  );
}
