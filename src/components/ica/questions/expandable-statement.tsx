"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** Enunciado compacto com largura fixa; expande no hover ou no clique (texto quebra linha). */
export function ExpandableStatement({
  text,
  widthClassName = "w-[14rem]",
}: {
  text: string;
  widthClassName?: string;
}) {
  const [pinned, setPinned] = useState(false);

  return (
    <button
      type="button"
      title={text}
      aria-expanded={pinned}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setPinned((current) => !current);
      }}
      className={cn(
        "group block max-w-full text-left text-sm leading-snug text-foreground",
        widthClassName,
        pinned ? "whitespace-normal break-words" : "line-clamp-2 break-words hover:line-clamp-none"
      )}
    >
      <span className={cn(pinned && "whitespace-normal break-words")}>{text}</span>
    </button>
  );
}
