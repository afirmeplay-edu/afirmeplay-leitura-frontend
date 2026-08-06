"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { FullscreenLayout } from "@/components/layout/fullscreen-layout";
import { Leiturometro } from "@/components/fluencia/leiturometro";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getMockStudentById, getMockTextById, getMockWordLists } from "@/lib/mock";

const STEPS = ["Capa", "Microfone", "Q1 Palavras", "Q2 Pouco comuns", "Q3 Texto", "Compreensao", "Relatorio"];

export function CaedAplicador() {
  const router = useRouter();
  const params = useSearchParams();
  const student = getMockStudentById(params.get("aluno") ?? "");
  const text = getMockTextById(params.get("texto") ?? "");
  const wordLists = getMockWordLists();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [confirmExit, setConfirmExit] = useState(false);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const mockIcaLevel = 4;
  const mockScore = 285;

  return (
    <FullscreenLayout
      title="Avaliacao de Fluencia"
      subtitle={student ? `${student.name} · ${text?.title ?? ""}` : "Carregando..."}
      backHref="/app/avaliacao-fluencia"
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
        <div className="-mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 snap-x sm:flex-wrap sm:overflow-visible">
          {STEPS.map((s, i) => (
            <Badge
              key={s}
              variant={i === step ? "default" : i < step ? "info" : "outline"}
              className="shrink-0 snap-start"
            >
              <span className="sm:hidden">{i + 1}</span>
              <span className="hidden sm:inline">{i + 1}. {s}</span>
            </Badge>
          ))}
        </div>

        <Card>
          <CardContent className="space-y-6 pt-6">
            {step === 0 && (
              <>
                <h2 className="text-xl font-semibold text-bluebrand-deep">Preparacao da avaliacao</h2>
                <p className="text-muted-foreground">
                  Esta avaliacao mede fluencia leitora em tres etapas: lista de palavras, palavras pouco comuns e leitura de texto narrativo com compreensao.
                </p>
                <Button onClick={next}>Continuar</Button>
              </>
            )}
            {step === 1 && (
              <>
                <h2 className="text-xl font-semibold">Teste de microfone</h2>
                <p className="text-muted-foreground">Simulacao: microfone detectado e funcionando.</p>
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">[Gravacao simulada]</div>
                <Button onClick={next} >Iniciar Q1</Button>
              </>
            )}
            {step === 2 && (
              <>
                <h2 className="text-xl font-semibold">Q1 — Lista de palavras (60s)</h2>
                <div className="flex flex-wrap gap-2">
                  {wordLists[0]?.items.slice(0, 12).map((w) => (
                    <span key={w} className="rounded bg-blue-50 px-2 py-1 text-sm">{w}</span>
                  ))}
                  <span className="text-sm text-muted-foreground">... e mais {48} palavras</span>
                </div>
                <p className="text-sm text-muted-foreground">Timer: 60s (mock)</p>
                <Button onClick={next} >Concluir Q1</Button>
              </>
            )}
            {step === 3 && (
              <>
                <h2 className="text-xl font-semibold">Q2 — Palavras pouco comuns (60s)</h2>
                <div className="flex flex-wrap gap-2">
                  {wordLists[1]?.items.slice(0, 10).map((w) => (
                    <span key={w} className="rounded bg-amber-50 px-2 py-1 text-sm">{w}</span>
                  ))}
                </div>
                <Button onClick={next} >Concluir Q2</Button>
              </>
            )}
            {step === 4 && (
              <>
                <h2 className="text-xl font-semibold">Q3 — Texto narrativo</h2>
                <p className="leading-relaxed">{text?.content}</p>
                <Button onClick={next} >Concluir leitura</Button>
              </>
            )}
            {step === 5 && text && (
              <>
                <h2 className="text-xl font-semibold">Compreensao leitora</h2>
                {text.questions.map((q) => (
                  <div key={q.id} className="space-y-2">
                    <p className="font-medium">{q.text}</p>
                    <p className="text-xs text-muted-foreground">{q.descriptor}</p>
                    <div className="space-y-1">
                      {q.options.map((opt, i) => (
                        <label key={opt} className="flex cursor-pointer items-center gap-2 rounded border p-2 hover:bg-muted/50">
                          <input
                            type="radio"
                            name={q.id}
                            checked={answers[q.id] === i}
                            onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <Button onClick={next} >Ver resultado</Button>
              </>
            )}
            {step === 6 && (
              <>
                <h2 className="text-xl font-semibold">Relatorio — Leiturometro</h2>
                <Leiturometro currentLevel={mockIcaLevel} score={mockScore} />
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard label="PLCM" value={82} icon={AlertTriangle} />
                  <StatCard label="Precisao" value="91%" icon={AlertTriangle} />
                  <StatCard label="Compreensao" value="3/3" icon={AlertTriangle} />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <Button className="w-full sm:w-auto">Salvar avaliacao (mock)</Button>
                  <Button variant="outline" className="w-full sm:w-auto" onClick={() => router.push("/app/relatorios?aba=ica")}>
                    Ver relatorios
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog
        open={confirmExit}
        onOpenChange={setConfirmExit}
        title="Sair da avaliacao?"
        description="O progresso atual sera perdido nesta sessao demonstrativa."
        confirmLabel="Sair"
        variant="destructive"
        icon={AlertTriangle}
        onConfirm={() => router.push("/app/avaliacao-fluencia")}
      />
    </FullscreenLayout>
  );
}
