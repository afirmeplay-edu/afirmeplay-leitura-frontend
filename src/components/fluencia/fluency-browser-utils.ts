/** Helpers de áudio/STT para fluência CAED-like (browser-only). */

export function normalizeSpeechToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Dobra fonética leve p/ erros típicos do ASR em pt-BR
 * (cenita↔senita, casa↔kasa, etc.).
 */
export function phoneticFold(value: string) {
  let s = normalizeSpeechToken(value);
  if (!s) return "";

  s = s.replace(/ss/g, "s");
  s = s.replace(/rr/g, "r");
  s = s.replace(/lh/g, "li");
  s = s.replace(/nh/g, "ni");
  s = s.replace(/ch/g, "x");
  s = s.replace(/qu/g, "k");
  s = s.replace(/gu([aeiou])/g, "g$1");
  // ce/ci → se/si (cenita → senita)
  s = s.replace(/c([eiy])/g, "s$1");
  // ca/co/cu → ka/ko/ku
  s = s.replace(/c/g, "k");
  s = s.replace(/ç/g, "s");
  s = s.replace(/z/g, "s");
  s = s.replace(/x/g, "s");
  s = s.replace(/y/g, "i");
  s = s.replace(/w/g, "v");
  // colapsa letras repetidas (ss já tratado; kk etc.)
  s = s.replace(/(.)\1+/g, "$1");
  return s;
}

export function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const prev = new Array<number>(cols);
  const curr = new Array<number>(cols);

  for (let j = 0; j < cols; j += 1) prev[j] = j;

  for (let i = 1; i < rows; i += 1) {
    curr[0] = i;
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j < cols; j += 1) prev[j] = curr[j];
  }
  return prev[b.length];
}

export type WordMatchKind = "exact" | "phonetic" | "fuzzy" | "none";

export interface WordMatchResult {
  matched: boolean;
  kind: WordMatchKind;
  token: string | null;
  distance: number | null;
}

function maxAllowedDistance(len: number) {
  if (len <= 3) return 1;
  if (len <= 6) return 1;
  if (len <= 10) return 2;
  return 3;
}

/** Compara uma hipótese (token) com a palavra esperada do cursor. */
export function scoreTokenAgainstExpected(expected: string, heard: string): WordMatchResult {
  const a = normalizeSpeechToken(expected);
  const b = normalizeSpeechToken(heard);
  if (!a || !b) {
    return { matched: false, kind: "none", token: heard || null, distance: null };
  }

  if (a === b) {
    return { matched: true, kind: "exact", token: heard, distance: 0 };
  }

  // Parcial comum no interim (pipoc / pipoca)
  if (a.length >= 3 && b.length >= 3) {
    if (a.startsWith(b) || b.startsWith(a)) {
      return { matched: true, kind: "fuzzy", token: heard, distance: Math.abs(a.length - b.length) };
    }
  }

  const pa = phoneticFold(expected);
  const pb = phoneticFold(heard);
  if (pa && pb && pa === pb) {
    return { matched: true, kind: "phonetic", token: heard, distance: 0 };
  }

  const distNorm = levenshtein(a, b);
  const distPhon = pa && pb ? levenshtein(pa, pb) : distNorm;
  const dist = Math.min(distNorm, distPhon);
  const allowed = maxAllowedDistance(Math.max(a.length, b.length));

  if (dist <= allowed) {
    return { matched: true, kind: "fuzzy", token: heard, distance: dist };
  }

  // Similaridade relativa (cenita/senita = 1/6 ≈ ok)
  const maxLen = Math.max(a.length, b.length);
  if (maxLen >= 4 && dist / maxLen <= 0.34) {
    return { matched: true, kind: "fuzzy", token: heard, distance: dist };
  }

  return { matched: false, kind: "none", token: heard, distance: dist };
}

/**
 * Testa a hipótese completa (frase) e cada token contra a palavra esperada.
 * Usar só a palavra do cursor — não “adivinhar” palavras futuras.
 */
export function hypothesisMatchesExpected(
  expected: string,
  hypothesis: string
): WordMatchResult {
  const direct = scoreTokenAgainstExpected(expected, hypothesis);
  if (direct.matched) return direct;

  const tokens = hypothesis.split(/\s+/).filter(Boolean);
  let best: WordMatchResult = {
    matched: false,
    kind: "none",
    token: null,
    distance: null,
  };

  for (const token of tokens) {
    const result = scoreTokenAgainstExpected(expected, token);
    if (result.matched) return result;
    if (
      result.distance != null &&
      (best.distance == null || result.distance < best.distance)
    ) {
      best = result;
    }
  }
  return best;
}

export function computeRms(analyser: AnalyserNode, buffer: Uint8Array<ArrayBuffer>) {
  analyser.getByteTimeDomainData(buffer);
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    const normalized = (buffer[i] - 128) / 128;
    sum += normalized * normalized;
  }
  return Math.sqrt(sum / buffer.length);
}

/** Limiar de voz a partir do piso de ruído amostrado no início. */
export function voiceThresholdFromNoiseFloor(noiseFloor: number) {
  return Math.min(0.14, Math.max(0.035, noiseFloor * 2.8 + 0.02));
}

export function pickRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") return undefined;
  const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];
  return preferred.find((type) => MediaRecorder.isTypeSupported(type));
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence?: number;
}

export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Quebra texto narrativo em linhas/frases para a tabela do Q3. */
export function splitNarrativeLines(content: string): string[] {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  if (normalized.includes("\n")) {
    return normalized
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  const bySentence = normalized
    .split(/(?<=[.!?…])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (bySentence.length > 1) return bySentence;

  const words = normalized.split(/\s+/).filter(Boolean);
  const chunkSize = 12;
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    lines.push(words.slice(i, i + chunkSize).join(" "));
  }
  return lines;
}

export function countWords(content: string) {
  return content.split(/\s+/).filter(Boolean).length;
}

export interface NarrativeToken {
  index: number;
  /** Forma exibida (pode incluir pontuação colada). */
  display: string;
  /** Forma usada no match STT. */
  word: string;
  lineIndex: number;
}

/** Tokeniza o texto em palavras alinhadas às linhas do splitNarrativeLines. */
export function tokenizeNarrative(content: string): {
  lines: string[];
  tokens: NarrativeToken[];
} {
  const lines = splitNarrativeLines(content);
  const tokens: NarrativeToken[] = [];
  let index = 0;

  lines.forEach((line, lineIndex) => {
    const parts = line.split(/\s+/).filter(Boolean);
    for (const part of parts) {
      const word = normalizeSpeechToken(part);
      if (!word) continue;
      tokens.push({
        index,
        display: part,
        word,
        lineIndex,
      });
      index += 1;
    }
  });

  return { lines, tokens };
}
