"use client";

import { cn } from "@/lib/utils";
import { ICA_LEVELS } from "@/lib/colors/reading-levels";

interface LeiturometroProps {
  currentLevel: number;
  score?: number;
}

export function Leiturometro({ currentLevel, score }: LeiturometroProps) {
  const current = ICA_LEVELS[currentLevel - 1];

  return (
    <div className="space-y-4">
      <div className="flex h-8 overflow-hidden rounded-full">
        {ICA_LEVELS.map((l) => (
          <div
            key={l.level}
            className={cn(
              "flex-1 transition-opacity",
              l.bgClass,
              l.level <= currentLevel ? "opacity-100" : "opacity-30"
            )}
            title={`${l.level}. ${l.label}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {ICA_LEVELS.map((l) => (
          <span
            key={l.level}
            className={cn(
              "text-center text-xs leading-tight text-muted-foreground sm:text-sm",
              l.level === currentLevel && "font-bold text-bluebrand-deep"
            )}
          >
            <span className="block">{l.level}</span>
            <span className="mt-0.5 block break-words font-normal">{l.label}</span>
          </span>
        ))}
      </div>
      <p className="text-center text-base font-semibold text-bluebrand-deep sm:text-lg">
        Nível ICA: {currentLevel} — {current?.label}
        {score !== undefined && ` · Pontuação: ${score}`}
      </p>
    </div>
  );
}
