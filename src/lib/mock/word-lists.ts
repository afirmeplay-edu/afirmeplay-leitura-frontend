import type { WordList } from "./types";

const PALAVRAS_60 = [
  "casa", "bola", "gato", "mesa", "livro", "porta", "água", "sol", "lua", "flor",
  "pato", "rato", "fogo", "vento", "chuva", "neve", "praia", "monte", "rio", "mar",
  "pão", "leite", "fruta", "carne", "peixe", "ovo", "sopa", "arroz", "feijão", "sal",
  "mão", "pé", "olho", "nariz", "boca", "orelha", "braço", "perna", "cabeça", "corpo",
  "azul", "verde", "vermelho", "amarelo", "preto", "branco", "rosa", "roxo", "cinza", "laranja",
  "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez",
];

const POUCO_COMUNS_40 = [
  "abacaxi", "bicicleta", "cachorro", "dinossauro", "elefante", "formiga", "girafa", "hipopótamo",
  "igreja", "janela", "kilo", "lápis", "macaco", "navio", "ônibus", "pássaro",
  "queijo", "relógio", "sapato", "tigre", "urso", "vassoura", "xícara", "zebra",
  "abelha", "borboleta", "cavalo", "dente", "escola", "fada", "guitarra", "helicóptero",
  "ilha", "jardim", "kiwi", "leão", "mochila", "nuvem", "ovelha", "piano",
];

export const MOCK_WORD_LISTS: WordList[] = [
  {
    id: "wl-1",
    name: "Lista Padrão Q1 - 3º Ano",
    type: "PALAVRAS",
    items: PALAVRAS_60,
    isDefault: true,
    active: true,
  },
  {
    id: "wl-2",
    name: "Lista Padrão Q2 - Pouco Comuns",
    type: "POUCO_COMUNS",
    items: POUCO_COMUNS_40,
    isDefault: true,
    active: true,
  },
  {
    id: "wl-3",
    name: "Lista Customizada - Escola 1",
    type: "PALAVRAS",
    items: PALAVRAS_60.slice(0, 40),
    isDefault: false,
    active: true,
  },
];

export function getMockWordLists() {
  return MOCK_WORD_LISTS;
}
