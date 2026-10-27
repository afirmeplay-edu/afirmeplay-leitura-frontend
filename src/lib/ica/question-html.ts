import DOMPurify from "dompurify";

/**
 * `GET /questions/<id>/images/<imageId>` (rota do Play) é pública no backend, então basta
 * apontar para `/api/...` — o rewrite do Next encaminha ao backend. `<img>` não envia Bearer.
 */
export function resolveQuestionAssetUrl(src: string | null | undefined): string | null {
  const value = src?.trim();
  if (!value) return null;
  if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(value)) return value;
  if (value.startsWith("/api/questions/")) return value;
  if (value.startsWith("/questions/")) return `/api${value}`;
  if (/^https:\/\//i.test(value)) return value;
  return null;
}

let hooksInstalled = false;

function installHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "IMG") {
      const resolved = resolveQuestionAssetUrl(node.getAttribute("src"));
      if (!resolved) {
        node.remove();
        return;
      }
      node.setAttribute("src", resolved);
      node.setAttribute("loading", "lazy");
      if (!node.getAttribute("alt")) node.setAttribute("alt", "Imagem da questão");
    }
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
}

/** `null` quando não há HTML ou não há DOM (SSR) — quem chama mostra o texto simples. */
export function sanitizeQuestionHtml(html: string | null | undefined): string | null {
  if (!html?.trim()) return null;
  if (typeof window === "undefined" || !DOMPurify.isSupported) return null;
  installHooks();
  const clean = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select", "iframe", "object", "embed"],
    FORBID_ATTR: ["style"],
    ALLOW_DATA_ATTR: false,
  });
  return clean.trim() ? clean : null;
}

export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** `src` originais (sem o prefixo `/api`) das imagens do HTML, para preservá-las ao reescrever o enunciado. */
export function extractImageSources(html: string | null | undefined): string[] {
  if (!html || typeof window === "undefined") return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.querySelectorAll("img"))
    .map((img) => img.getAttribute("src") ?? "")
    .filter((src) => Boolean(resolveQuestionAssetUrl(src)));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** HTML simples: um `<p>` por linha + imagens (data-URL nova ou `/questions/...` já salva). */
export function buildQuestionHtml(text: string, imageSources: string[] = [], altText = "Imagem da questão") {
  const paragraphs = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`);
  const images = imageSources.map((src) => `<p><img src="${escapeHtml(src)}" alt="${escapeHtml(altText)}" /></p>`);
  return [...paragraphs, ...images].join("");
}
