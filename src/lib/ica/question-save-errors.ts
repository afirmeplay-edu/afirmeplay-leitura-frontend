import { normalizeApiError, type NormalizedApiError } from "@/lib/api/errors";

/** Traduz mensagens técnicas do backend / status em copy de tela do formulário ICA. */
const QUESTION_SAVE_COPY: Array<{ test: (message: string, status: number | null) => boolean; message: string }> = [
  {
    test: (message) => /migraç|desatualizado|dictation_marks|writing_stimulus|writing_reference/i.test(message),
    message: "Não foi possível salvar. Tente de novo ou fale com o suporte.",
  },
  {
    test: (message) => /plano insuficiente|não tem acesso a esta funcionalidade|afirme_reading/i.test(message),
    message: "Este município não tem o Afirme Educacional (leitura) liberado.",
  },
  {
    test: (message) => /contexto de município|identificar o município/i.test(message),
    message: "Selecione o município antes de salvar a questão.",
  },
  {
    test: (message) => /perfil não pode cadastrar|não tem permissão para editar|somente leitura/i.test(message),
    message: "Seu perfil não pode cadastrar ou editar questões.",
  },
  {
    test: (message) => /produção escrita.*alternativas|ditado.*alternativas|não tem alternativas/i.test(message),
    message: "Produção escrita e ditado não aceitam alternativas. Remova-as ou troque o tipo.",
  },
  {
    test: (message) => /tipo de questão inválido/i.test(message),
    message: "Tipo de questão inválido. Use múltipla escolha, ditado ou produção escrita.",
  },
  {
    test: (message) => /dictatedWord|única palavra, sem espaços/i.test(message),
    message: "A palavra ditada deve ser uma única palavra, sem espaços.",
  },
  {
    test: (message) => /disciplina \(subjectId\)|Disciplina \(subjectId\)/i.test(message),
    message: "Selecione uma disciplina válida.",
  },
  {
    test: (message) => /série \(grade\)|grade deve ser|grade_id deve ser/i.test(message),
    message: "Selecione uma série válida.",
  },
  {
    test: (message) => /educationStageId|Etapa de ensino \(educationStageId\)/i.test(message),
    message: "Selecione um curso válido.",
  },
  {
    test: (message) => /minio|upload question image|pipeline de imagens/i.test(message),
    message: "Não foi possível salvar as imagens da questão. Verifique o arquivo e tente novamente.",
  },
  {
    test: (message, status) => status === 404 && /questão não encontrada/i.test(message),
    message: "A questão foi salva, mas não apareceu na listagem. Atualize a página.",
  },
  {
    test: (message, status) =>
      status === 500 && /erro interno ao processar/i.test(message),
    message: "Não foi possível salvar a questão no servidor. Tente de novo; se continuar, avise o suporte.",
  },
];

/** Normaliza o erro do create/update de questão para toast amigável. */
export function normalizeQuestionSaveError(error: unknown): NormalizedApiError {
  const normalized = normalizeApiError(error, "Não foi possível salvar a questão.");
  // Mensagens já em linguagem de tela (backend atual) passam direto.
  const mapped = QUESTION_SAVE_COPY.find((rule) => rule.test(normalized.message, normalized.status));
  if (!mapped) return normalized;
  return { ...normalized, message: mapped.message };
}
