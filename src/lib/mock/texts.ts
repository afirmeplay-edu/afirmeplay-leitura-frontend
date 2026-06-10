import type { ReadingText } from "./types";

export const MOCK_TEXTS: ReadingText[] = [
  {
    id: "txt-1",
    title: "O Gato e o Rato",
    grade: "3",
    difficulty: "facil",
    content:
      "Era uma vez um gato muito esperto que vivia em uma casa grande. Todos os dias ele observava o rato que saía do buraco para procurar comida. Um dia, o gato decidiu fazer um plano para pegar o rato, mas o rato era mais inteligente do que parecia.",
    source: "Acervo municipal",
    calibrated: true,
    questions: [
      {
        id: "q1",
        text: "Onde o gato vivia?",
        descriptor: "D1 - Localizar informações explícitas",
        options: ["Em uma casa grande", "Na floresta", "No parque", "Na escola"],
        correctIndex: 0,
      },
      {
        id: "q2",
        text: "Por que o gato observava o rato?",
        descriptor: "D4 - Inferir informações implícitas",
        options: ["Para brincar", "Para pegar o rato", "Para dormir", "Para comer junto"],
        correctIndex: 1,
      },
      {
        id: "q3",
        text: "Qual é o tema principal do texto?",
        descriptor: "D7 - Identificar o tema",
        options: ["Amizade", "Esperteza e astúcia", "Viagem", "Escola"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "txt-2",
    title: "A Viagem de Pedro",
    grade: "4",
    difficulty: "medio",
    content:
      "Pedro sonhava em conhecer o mar. Nunca tinha saído da cidade onde nasceu. Quando ganhou uma passagem de ônibus da tia, ficou muito feliz. No dia da viagem, acordou cedo e preparou sua mochila com cuidado.",
    calibrated: true,
    questions: [
      {
        id: "q1",
        text: "O que Pedro sonhava conhecer?",
        descriptor: "D1 - Localizar informações explícitas",
        options: ["A montanha", "O mar", "A floresta", "O deserto"],
        correctIndex: 1,
      },
      {
        id: "q2",
        text: "Quem deu a passagem para Pedro?",
        descriptor: "D1 - Localizar informações explícitas",
        options: ["Seu pai", "Sua mãe", "Sua tia", "Seu professor"],
        correctIndex: 2,
      },
      {
        id: "q3",
        text: "O que o texto sugere sobre os sentimentos de Pedro?",
        descriptor: "D4 - Inferir informações implícitas",
        options: ["Tristeza", "Medo", "Alegria e expectativa", "Raiva"],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "txt-3",
    title: "As Estações do Ano",
    grade: "5",
    difficulty: "medio",
    content:
      "As estações do ano marcam as mudanças climáticas ao longo dos meses. No verão, os dias são mais quentes. No inverno, a temperatura cai e algumas regiões recebem neve. A primavera traz flores e o outono colorido as folhas das árvores.",
    calibrated: false,
    questions: [
      {
        id: "q1",
        text: "Qual estação traz flores?",
        descriptor: "D1 - Localizar informações explícitas",
        options: ["Verão", "Inverno", "Primavera", "Outono"],
        correctIndex: 2,
      },
      {
        id: "q2",
        text: "O que acontece no inverno em algumas regiões?",
        descriptor: "D1 - Localizar informações explícitas",
        options: ["Chove muito", "Recebem neve", "Faz muito calor", "Não há mudanças"],
        correctIndex: 1,
      },
      {
        id: "q3",
        text: "Qual é o assunto central do texto?",
        descriptor: "D7 - Identificar o tema",
        options: ["Animais", "Estações do ano", "Esportes", "Cidade"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "txt-4",
    title: "A Festa na Escola",
    grade: "3",
    difficulty: "facil",
    content:
      "A escola preparou uma festa junina muito animada. As crianças dançaram quadrilha e comeram pipoca e pé de moleque. Os pais ajudaram a decorar o pátio com bandeirinhas coloridas.",
    calibrated: true,
    questions: [
      {
        id: "q1",
        text: "Que tipo de festa foi realizada?",
        descriptor: "D1 - Localizar informações explícitas",
        options: ["Festa junina", "Festa de aniversário", "Festa de Natal", "Festa de carnaval"],
        correctIndex: 0,
      },
      {
        id: "q2",
        text: "Quem ajudou a decorar o pátio?",
        descriptor: "D1 - Localizar informações explícitas",
        options: ["Os professores", "Os pais", "Os diretores", "Os vizinhos"],
        correctIndex: 1,
      },
      {
        id: "q3",
        text: "O que as crianças fizeram na festa?",
        descriptor: "D3 - Identificar informações explícitas",
        options: ["Dormiram", "Dançaram quadrilha", "Estudaram", "Viajaram"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "txt-5",
    title: "O Planeta Terra",
    grade: "5",
    difficulty: "dificil",
    content:
      "A Terra é o terceiro planeta do Sistema Solar e o único conhecido que abriga vida. Possui água líquida em abundância e uma atmosfera que protege os seres vivos da radiação solar. Cientistas estudam formas de preservar o meio ambiente para as futuras gerações.",
    calibrated: true,
    questions: [
      {
        id: "q1",
        text: "Qual a posição da Terra no Sistema Solar?",
        descriptor: "D1 - Localizar informações explícitas",
        options: ["Primeiro planeta", "Segundo planeta", "Terceiro planeta", "Quarto planeta"],
        correctIndex: 2,
      },
      {
        id: "q2",
        text: "Por que a atmosfera é importante?",
        descriptor: "D4 - Inferir informações implícitas",
        options: ["Para esquentar o solo", "Para proteger da radiação solar", "Para criar vento", "Para formar montanhas"],
        correctIndex: 1,
      },
      {
        id: "q3",
        text: "Qual mensagem o texto transmite?",
        descriptor: "D7 - Identificar o tema",
        options: ["Explorar outros planetas", "Preservar o meio ambiente", "Construir cidades", "Estudar o espaço"],
        correctIndex: 1,
      },
    ],
  },
];

export function getMockTexts() {
  return MOCK_TEXTS;
}

export function getMockTextById(id: string) {
  return MOCK_TEXTS.find((t) => t.id === id);
}
