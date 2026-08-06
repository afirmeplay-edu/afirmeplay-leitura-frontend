"use client";

import { cn } from "@/lib/utils";

const LEVELS = [
  { level: 1, label: "Pre-alfabetico", color: "bg-red-500" },
  { level: 2, label: "Alfabetico", color: "bg-orange-500" },
  { level: 3, label: "Silabico-alf.", color: "bg-yellow-500" },
  { level: 4, label: "Silabico", color: "bg-lime-500" },
  { level: 5, label: "Silabico c/ valor", color: "bg-emerald-500" },
  { level: 6, label: "Alfabetico pleno", color: "bg-blue-500" },
];

interface LeiturometroProps {
  currentLevel: number;
  score?: number;
}

export function Leiturometro({ currentLevel, score }: LeiturometroProps) {
  return (
    <div className="space-y-4">
      <div className="flex h-8 overflow-hidden rounded-full">
        {LEVELS.map((l) => (
          <div
            key={l.level}
            className={cn("flex-1 transition-opacity", l.color, l.level <= currentLevel ? "opacity-100" : "opacity-30")}
            title={l.label}
          />
        ))}
      </div>
      <div className="flex justify-between gap-0.5 text-[10px] text-muted-foreground sm:text-xs">
        {LEVELS.map((l) => (
          <span key={l.level} className={cn("text-center", l.level === currentLevel && "font-bold text-bluebrand-deep")}>
            {l.level}
          </span>
        ))}
      </div>
      <p className="text-center text-base font-semibold text-bluebrand-deep sm:text-lg">
        Nivel ICA: {currentLevel} — {LEVELS[currentLevel - 1]?.label}
        {score !== undefined && ` · Pontuacao: ${score}`}
      </p>
    </div>
  );
}
