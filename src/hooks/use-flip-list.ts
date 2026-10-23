"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

/**
 * Anima reordenação (FLIP): compara `offsetTop` antes/depois de cada render em que `orderKey` muda.
 * Usa `offsetTop` (relativo ao container) para não confundir rolagem com movimento.
 */
export function useFlipList(orderKey: string, durationMs = 200) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const positions = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    nodes.current.forEach((node, key) => {
      const next = node.offsetTop;
      const previous = positions.current.get(key);
      if (previous !== undefined && previous !== next && !reduceMotion && typeof node.animate === "function") {
        node.animate(
          [{ transform: `translateY(${previous - next}px)` }, { transform: "translateY(0)" }],
          { duration: durationMs, easing: "cubic-bezier(0.2, 0, 0, 1)" }
        );
      }
      positions.current.set(key, next);
    });
  }, [orderKey, durationMs]);

  const callbacks = useRef(new Map<string, (node: HTMLElement | null) => void>());

  return useCallback((key: string) => {
    let callback = callbacks.current.get(key);
    if (!callback) {
      callback = (node: HTMLElement | null) => {
        if (node) {
          nodes.current.set(key, node);
        } else {
          nodes.current.delete(key);
          positions.current.delete(key);
          callbacks.current.delete(key);
        }
      };
      callbacks.current.set(key, callback);
    }
    return callback;
  }, []);
}
