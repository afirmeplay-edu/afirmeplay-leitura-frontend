"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check } from "lucide-react";
import { formatSkillCode, formatSkillLabel, type CatalogSkill } from "@/lib/api/question-catalog";
import { cn } from "@/lib/utils";

/**
 * No trigger aparece só o código (ItemText).
 * No dropdown, a descrição fica ao lado para facilitar a escolha.
 */
export function SkillSelectItem({
  skill,
  className,
}: {
  skill: CatalogSkill;
  className?: string;
}) {
  const code = formatSkillCode(skill);
  const full = formatSkillLabel(skill);
  const showDescription = Boolean(skill.description?.trim() && skill.description.trim() !== code);

  return (
    <SelectPrimitive.Item
      value={skill.id}
      textValue={full}
      title={full}
      className={cn(
        "relative flex w-full cursor-default select-none items-start rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
        "focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
    >
      <span className="absolute left-2 top-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <div className="min-w-0 space-y-0.5">
        <SelectPrimitive.ItemText>{code}</SelectPrimitive.ItemText>
        {showDescription ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">{skill.description}</p>
        ) : null}
      </div>
    </SelectPrimitive.Item>
  );
}
