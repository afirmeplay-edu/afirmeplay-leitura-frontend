import type { FaqItem, SystemUser } from "./types";

export const MOCK_USERS: SystemUser[] = [
  { id: "usr-1", name: "Admin Sistema", email: "admin@afirmeplay.com", role: "admin", active: true },
  { id: "usr-2", name: "Prof. Maria Silva", email: "maria@escola.com", role: "professor", active: true },
  { id: "usr-3", name: "Dir. João Santos", email: "joao@escola.com", role: "diretor", active: true },
  { id: "usr-4", name: "Coord. Ana Costa", email: "ana.coord@escola.com", role: "coordenador", active: true },
  { id: "usr-5", name: "Prof. Carlos Lima", email: "carlos@escola.com", role: "professor", active: false },
];

export const MOCK_FAQ: FaqItem[] = [
  { id: "faq-1", question: "Como iniciar uma avaliação de fluência?", answer: "Acesse Avaliação de Fluência, selecione escola, turma, aluno e texto, depois clique em Iniciar Avaliação." },
  { id: "faq-2", question: "O que é o ICA?", answer: "O Índice Criança Alfabetizada (ICA) classifica o desempenho do estudante em seis níveis, com base em listas de palavras, pseudopalavras e leitura de texto narrativo." },
  { id: "faq-3", question: "Como cadastrar um novo texto?", answer: "Vá em Textos > Novo Texto e preencha título, ano, dificuldade, conteúdo e perguntas de compreensão." },
  { id: "faq-4", question: "Como exportar relatórios?", answer: "Na página de Relatórios, aplique os filtros desejados e use o botão Exportar (funcionalidade em desenvolvimento)." },
  { id: "faq-5", question: "Como recuperar minha senha?", answer: "Na tela de login, clique em Esqueci minha senha e siga as instruções enviadas por e-mail." },
];

export function getMockUsers() {
  return MOCK_USERS;
}

export function getMockUserById(id: string) {
  return MOCK_USERS.find((u) => u.id === id);
}

export function getMockFaq() {
  return MOCK_FAQ;
}
