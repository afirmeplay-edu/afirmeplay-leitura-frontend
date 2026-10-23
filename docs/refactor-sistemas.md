# Diário — Reorganização em dois sistemas (Leitura | ICA)

Escopo: somente `afirmeplay-leitura-frontend/`. Backend, Afirme Play e mobile são só referência (leitura).

Branch de trabalho: `lucas` (working tree limpo no início).

---

## Fase 0 — Reconhecimento (sem alteração de código)

### Linha de base (antes de qualquer mudança)

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | 0 erros |
| `npm run lint` | 0 erros, 10 warnings pré-existentes (imports não usados, `<img>`, deps de hooks) |
| `npm run build` | OK, 32 páginas |

Os 10 warnings de lint são legado e **não** serão corrigidos nesta refatoração (fora de escopo). Qualquer warning novo é regressão.

### Dependências (`package.json`)

| Pacote pedido no prompt | Situação |
|---|---|
| `framer-motion` / `motion` | **Ausente** |
| `cmdk` | **Ausente** |
| `react-hook-form` | **Ausente** |
| `zod` | **Ausente** |
| DOMPurify ou equivalente | **Ausente** (nenhum sanitizer; nenhum `dangerouslySetInnerHTML` no projeto) |
| `tailwindcss-animate` | Presente (`^1.0.7`) |
| `@radix-ui/react-collapsible` | **Ausente** |
| `@radix-ui/react-accordion` | Presente (`components/ui/accordion.tsx`) |
| `@radix-ui/react-dropdown-menu` | Presente |
| Sheet | Presente (usa `@radix-ui/react-dialog`) |
| `@radix-ui/react-tooltip` | Presente |
| `@radix-ui/react-popover` | **Ausente** (o prompt pede popover para o picker de município) |

Também presentes: `axios`, `zustand`, `sonner`, `recharts`, `lucide-react`, `xlsx`, `pptxgenjs`, `pg`.

### Tokens e animação (`tailwind.config.ts`, `src/app/globals.css`)

- `--primary: 217 91% 50%` (azul). O `Button` default foi sobrescrito para o gradiente institucional.
- Institucional: `--brand-hero-from: 274 54% 41%` (`#7030A0`) → `--brand-hero-to: 330 72% 55%` (`#E53E7F`).
- `bluebrand.{deep,base,light}` = azul do login/aplicador.
- Keyframes: `fade-in` e `slide-in-right` (definidos, **nunca usados**), `sidebar-slide-in`, `accordion-down/up`.
- Nenhuma regra `prefers-reduced-motion` no projeto.
- Sem ThemeProvider; `darkMode: ["class"]` sem toggle.

### Navegação (`src/config/navigation.ts`, `src/constants/sidebarThemes.ts`)

- Um único `NAV_CATEGORIES` (Principal / Avaliacoes / Relatorios) + `DASHBOARD_FEATURE_CARDS`.
- Helpers: `getAllNavLinks`, `canAccessByRoles`, `filterNavCategoriesByRole`, `isNavLinkActive`, `APP_NAV_ITEMS` (legado).
- Único item com `roles`: filho "Lista de palavras conhecidas" → `["admin"]`.
- `isNavLinkActive`: `/app` é exato; demais por prefixo; filhos com `?` usam `exactPath`.
- `sidebarThemes.ts`: um tema (`panel`), `getSidebarThemeStyles()` sempre devolve `panelLight` com CSS vars `--sidebar-*` (roxo fixo em hex).

### Rotas e layouts

- `src/config/routes.ts`: **não existe**.
- `/app/leitura/...`: **não existe**. Todas as rotas da Leitura estão direto em `/app/...`.
- `next.config.ts`: só `rewrites` (`/api/:path*` → backend). **Nenhum `redirects()`**.
- Layouts: `src/app/layout.tsx` (root) e `src/app/(private)/app/layout.tsx` (`AuthGuard` + `PrivateShell`). Sem middleware.
- 31 páginas em `src/app/(private)/app` + públicas `/`, `/login`, `/recuperar-senha`.

### Layout e auth

- `PrivateShell` (`components/layout/private-shell.tsx`): header **só mobile** (h-14), sidebar sticky/drawer, `main max-w-7xl`.
- `Sidebar` (`components/layout/sidebar.tsx`): lê `NAV_CATEGORIES` direto (não por prop); card do usuário (→ `/app/perfil`) no topo; "Sair" no rodapé; `sidebar_collapsed` no localStorage; accordion **manual** (`useState`), sem animação de altura; tooltips só no modo recolhido; `ROLE_LABELS` sem `tecadm`.
- `FullscreenLayout`: `fixed inset-0 z-[80]` quando não `embedded` — cobre header e sidebar.
- `AuthGuard`, `RoleGuard`, `AdminCityPicker`, `HomeRedirect`, `LoginForm` ficam em `components/auth/` (não em `components/layout/`).
- `AdminCityPicker` é renderizado **dentro das páginas** (dashboard, cadastros, fluência, relatórios…) e expõe `onCityReadyChange` que as páginas usam para saber quando carregar dados.

### Store e roles (`src/stores/auth-store.ts`, `src/lib/auth/jwt.ts`)

- `User.role: string` (sem união tipada).
- Helpers: `isAdminRole`, `isPrivilegedStaffRole` (admin|tecadm), `roleUsesJwtCity` (todos menos admin).
- **`aplicador` não existe como role no frontend.** As ocorrências são o texto `[APLICADOR]` nas instruções e o componente `CaedAplicador`.

### Shared (`src/components/shared/*`, `components/layout/in-development.tsx`)

- `PageShell`: `space-y-6`.
- `FormPage`: botão "Salvar" fixo, **sem** `disabled`/loading e sem slot de ações.
- `DataListPage`: busca **só no cliente** sobre `items`; sem paginação, sem filtros, sem skeleton.
- `SectionCard`, `StatCard` (variantes default/metric/featured, `loading`).
- `InDevelopment`: existe, não é usado.

### API (`src/lib/api/*`)

- `api` (Axios, `baseURL /api`): interceptor adiciona `Authorization: Bearer` e `X-City-ID`/`X-City-Slug`; 401 → logout + `/login`.
- `afirmeReadingApi`: prefixo `/afirme-reading` e reaplica headers de cidade. Tem `get/post/postForm/patch/delete` — **não tem `put`**.
- `errors.ts`: `getApiErrorMessage` procura `error | message | detail | title`. **Não cobre** `erro`, `mensagem`, `msg` (formatos dos decorators do backend).
- `texts.ts` é o padrão a imitar: funções finas, tipos de `types.ts`, envelope tolerante (`data|items|results`).
- Catálogos consumidos hoje: só `GET /grades` e `GET /education_stages` (`lib/api/grades.ts`).

### Editor de perguntas atual (`text-form-page.tsx` + `text-question-editor.tsx` + `text-question-draft.ts`)

- Estado local + `useCallback`/`useEffect`, `toast` + `getApiErrorMessage`, botão com `Loader2`.
- Alternativas: `MIN = 2`, `MAX = 5`, gabarito por `<input type="radio">` nativo, sem letras, só texto.
- Validação no cliente antes do submit; edição faz diff (changed/new/deleted).

### Cores de nível (`src/lib/colors/reading-levels.ts`)

Fonte da verdade ICA 1–6 = PL1–LF (`#E45D1C` → `#2EA248`). **Não será alterado.**

### Paths `/app/...` hardcoded (inventário completo)

| Arquivo | Paths |
|---|---|
| `src/config/navigation.ts` | todos os itens do menu + `DASHBOARD_FEATURE_CARDS` + regra `/app` em `isNavLinkActive` |
| `src/lib/cadastros/config.ts` | `CADASTROS_PATHS` (root, conhecidas, poucoComuns, textos) — consumido por word-lists-index, word-list-form-page, texts-index, text-form-page, text-question-draft, `cadastros/page.tsx`, `configuracao-avaliacao/page.tsx` |
| `src/lib/fluencia/aplicar-href.ts` | `/app/avaliacao-leitura-guiada`, `/app/avaliacao-fluencia/aplicar` |
| `src/components/fluencia/caed-aplicador.tsx` | `/app/avaliacao-leitura-guiada`, `/app/avaliacao-fluencia?evaluationId=`, `/app/avaliacao-fluencia`, `/app/relatorios?aba=ica` |
| `src/components/fluencia/fluencia-selecao.tsx` | `/app/cadastros`, `/app/revisao-leitura-guiada`, `/app/avaliacao-fluencia/listar`, `/app` |
| `src/components/fluencia/criar-avaliacao-page.tsx` | `/app/avaliacao-fluencia/listar`, `/app/cadastros/palavras-conhecidas`, `/app/cadastros/palavras-pouco-comuns`, `/app/cadastros/textos`, `/app/cadastros` |
| `src/components/fluencia/listar-avaliacao-page.tsx` | `/app/avaliacao-fluencia?…`, `/app/avaliacao-fluencia/criar`, `/app/avaliacao-fluencia/criar?id=` |
| `src/components/dashboard/dashboard-home.tsx` | mapa `SHORTCUT_ICONS` por href |
| `src/components/dashboard/dashboard-hero.tsx` | `/app/avaliacao-fluencia/criar`, `/app/relatorios-fluencia` |
| `src/components/avaliacoes/avaliacoes-aplicadas-page.tsx` | `/app/avaliacao-fluencia`, `/app/avaliacoes/:id` |
| `src/components/avaliacoes/avaliacao-aplicada-alunos-page.tsx` | `/app/avaliacoes/:id/aluno/:studentId`, `/app/avaliacoes` |
| `src/components/avaliacoes/aplicacao-visualizacao-page.tsx` | `/app/avaliacoes/:id` |
| `src/components/relatorios/relatorios-hub.tsx` | `/app/relatorios?aba=` |
| `src/components/leitura-guiada/selecao-leitura.tsx` | `/app/avaliacao-leitura-guiada/demo`, `/app/avaliacao-leitura-guiada/sessao?…` |
| `src/components/leitura-guiada/demo-selecao.tsx` | `/app/avaliacao-leitura-guiada/sessao?…`, `/app/avaliacao-leitura-guiada` |
| `src/components/leitura-guiada/wizard-sessao.tsx` | `/app/avaliacao-leitura-guiada` |
| `src/components/layout/sidebar.tsx` | `/app/perfil` |
| `src/components/auth/login-form.tsx` | `/app` (×2) |
| `src/components/auth/home-redirect.tsx` | `/app` |
| `src/components/auth/role-guard.tsx` | default `fallbackHref="/app"` |
| `src/app/not-found.tsx` | `/app` |
| `src/app/(private)/app/avaliacoes/nova/page.tsx` | `redirect("/app/avaliacoes")` |
| `src/app/(private)/app/avaliacoes/[id]/editar/page.tsx` | `redirect("/app/avaliacoes/:id")` |

Não há testes automatizados no projeto (nenhum arquivo de teste encontrado).

### Contrato de questões (backend, somente leitura)

Fonte: `afirmeplay_backend/app/afirme_ler/CONTRATO_QUESTOES.md` e `routes/questions_routes.py` (branch não mergida).

- `POST /afirme-reading/questions`, `GET /afirme-reading/questions`, `GET /afirme-reading/questions/:id`, `PUT /afirme-reading/questions/:id`.
- Listagem: envelope `{ data: Question[], pagination: { page, per_page, total, pages, has_next, has_prev, next_num, prev_num } }`.
- Escrita: admin, tecadm, professor, coordenador, diretor. Leitura: + `aplicador`.

### Verificações de backend feitas por leitura (sem alterar nada)

1. **Imagem de questão** — `GET /questions/<id>/images/<imageId>` (`app/routes/question_routes.py`, blueprint `url_prefix='/questions'`) **não tem `@jwt_required`**: é pública. Como `<img>` com `src="/questions/..."` relativo cairia no próprio Next (404), basta reescrever no frontend para `/api/questions/...`, que o rewrite já encaminha ao backend. **Não precisa** de blob/object URL.
2. **Catálogos** existentes no backend compartilhado (usados pelo Afirme Play, não pelo Afirme Ler):
   - `GET /subjects` → `[{ id, name }]` (sem auth)
   - `GET /skills/subject/:subjectId` e `GET /skills/grade/:gradeId` → `[{ id, code, description, subject_id, grade_ids, grade_id }]` (sem auth)
   - `GET /grades` e `GET /education_stages` (já consumidos)

### Divergências em relação ao prompt

| # | Prompt diz | Código real | Encaminhamento |
|---|---|---|---|
| D1 | Verificar `src/config/routes.ts` e rotas `/app/leitura/...` | Não existem; nem redirects | **Perguntar** antes de migrar (exigido pela Etapa 1) |
| D2 | `AuthGuard`, `RoleGuard`, `AdminCityPicker` em `components/layout/*` | Estão em `components/auth/*` | Seguir o código |
| D3 | Confirmar `aplicador` | Não existe no frontend | Adicionar ao tipo de role (Etapa 2) |
| D4 | Popover para o picker no header | `@radix-ui/react-popover` ausente | Usar `DropdownMenu` ou `Dialog` existentes (sem nova dep) |
| D5 | Accordion com Radix Collapsible/Accordion | Collapsible ausente; Accordion presente; sidebar usa toggle manual | Usar `Accordion` existente |
| D6 | Framer Motion "só se instalado" | Ausente | Usar CSS/`tailwindcss-animate`; não adicionar |
| D7 | Atalho `Ctrl/Cmd+K` se `cmdk` existir | Ausente | Não implementar paleta nesta rodada; `Alt+1/Alt+2` é trivial e pode ser feito |
| D8 | Sanitizar HTML com DOMPurify "ou equivalente já presente" | Nenhum sanitizer | **Perguntar**: adicionar `dompurify` pinado |
| D9 | Editor deve imitar `text-question-editor` | Editor atual: 2–5 alternativas, rádio nativo, só texto | Imitar estrutura/estilo, mas com 2–8, letras A–H, texto ou imagem |
| D10 | Usar `DataListPage` e `FormPage` | `DataListPage` só filtra no cliente; `FormPage` não tem loading/disabled | Estender com props opcionais retrocompatíveis, ou compor com `PageHeader` + `Card` |
| D11 | "Não inventar" catálogo de disciplinas/habilidades | Endpoints existem no backend (Play) | **Perguntar** se pode consumi-los |
| D12 | Acento ICA sugerido `#0F766E → #0EA5E9` | Texto branco sobre `#0EA5E9` ≈ 2,8:1 (reprova AA) | Usar `#0F766E → #0369A1` (≥ 5,4:1 nos dois extremos) |
| D13 | `afirmeReadingApi` com `PUT` | Cliente não tem `put` | Adicionar método `put` no wrapper (só frontend) |
| D14 | `errors.ts` cobre formatos | Não lê `erro`, `mensagem`, `msg` | Criar normalizador único (Etapa 5) |
| D15 | `difficulty` com 4 valores | Formatter do Play devolve `"Médio"` como default | Exibir valor desconhecido como texto, sem quebrar |

### Pendências de backend (não serão simuladas)

- P1: API de avaliações ICA (salvar construtor) — inexistente.
- P2: Tipos de questão aberta e produção textual — inexistentes no banco do Afirme Ler.
- P3: Aplicação e correção (cartão-resposta) e Resultados do ICA — inexistentes.
- P4: Branch das rotas `/afirme-reading/questions` ainda não mergida; até lá as telas do banco recebem 404.
- P5: Imagem de questão é pública e não filtra escopo/município — observação de segurança para o backend, sem ação no frontend.

### Decisões do usuário após a Fase 0

- Separar contextos em `/app/leitura/**` e `/app/ica/**` sem alterar o backend. Mudanças de backend que se mostrarem estritamente necessárias vão para a lista "Pendências de backend".
- Consumir os catálogos existentes (`/subjects`, `/skills/...`).
- Adicionar `dompurify` com versão pinada.

---

## Etapa 1 — Header global e migração de rotas

### Tabela de rotas antigas → novas

Redirects em `next.config.ts` (`redirects()`, `permanent: true` → **308**). `:path*` aceita zero ou mais segmentos e o Next preserva a query string.

| Antiga | Nova |
|---|---|
| `/app` (dashboard) | `/app` agora redireciona (client) para `/app/{last_system}`; dashboard em `/app/leitura` |
| `/app/avaliacao-fluencia/:path*` | `/app/leitura/avaliacao-fluencia/:path*` |
| `/app/avaliacao-leitura-guiada/:path*` | `/app/leitura/avaliacao-leitura-guiada/:path*` |
| `/app/avaliacoes/:path*` | `/app/leitura/avaliacoes/:path*` |
| `/app/cadastros/:path*` | `/app/leitura/cadastros/:path*` |
| `/app/configuracao-avaliacao/:path*` | `/app/leitura/configuracao-avaliacao/:path*` |
| `/app/relatorios/:path*` | `/app/leitura/relatorios/:path*` |
| `/app/relatorios-fluencia/:path*` | `/app/leitura/relatorios-fluencia/:path*` |
| `/app/revisao-leitura-guiada/:path*` | `/app/leitura/revisao-leitura-guiada/:path*` |
| `/app/perfil` | inalterada (rota neutra) |
| — | `/app/ica` (novo; placeholder `InDevelopment` até a Etapa 4) |

Verificado com `next start` + `curl`: todas as antigas → 308 para a nova com sub-caminho e query preservados (ex.: `/app/avaliacao-fluencia/aplicar?sessionId=abc&view=1`); `/app/perfil`, `/app/leitura`, `/app/ica` → 200; `/app/relatorios/...` não captura `/app/relatorios-fluencia`.

### Decisões

- **308 permanente**: navegadores fazem cache. Se um dia a migração for desfeita, os usuários precisarão limpar o cache.
- **`src/config/routes.ts`** é a fonte única de paths (`ROUTES`, `SYSTEM_HOME`, `SYSTEM_LABEL`, `getSystemFromPathname`, `readLastSystem`/`writeLastSystem`). `CADASTROS_PATHS` virou alias de `ROUTES.leitura.cadastros`.
- `next.config.ts` mantém a lista de segmentos legados inline (não importa `routes.ts` para não depender de alias `@/` na config).
- **`last_system`**: `localStorage`, gravado por `useActiveSystem` sempre que a URL está dentro de um sistema; lido em rotas neutras, em `/app`, no login e no `HomeRedirect`. Não é store.
- Login e `HomeRedirect` vão direto para a home do último sistema (sem o salto por `/app`).
- `isNavLinkActive`: casamento **exato** para `/app`, `/app/leitura` e `/app/ica` (senão "Início" ficaria ativo em toda a Leitura).
- **Identidade por sistema**: `data-system` no `PrivateShell`; variáveis `--system-from/--system-to/--system-soft/--system-text` registradas com `@property` para a cor transicionar em 200 ms; `--system-gradient` derivada.
- **ICA**: `#0F766E → #0369A1` (ver D12). Texto branco: 5,47:1 e 5,93:1.
- **`prefers-reduced-motion`**: regra global em `globals.css` zera duração de animações/transições (inclui spinners e o pulso "Gravando", que ficam estáticos).
- **AppHeader** (`components/layout/app-header.tsx`): logo → home do sistema ativo; `SystemSwitcher` (`role="tablist"`, setas/Home/End, `Alt+1`/`Alt+2`, indicador deslizante por `transform`); município (só admin) em `Dialog` com o `AdminCityPicker` existente; Configurações → `/app/perfil`; menu do usuário (`DropdownMenu`) com nome, papel, "Meu perfil" e "Sair".
- O `AdminCityPicker` **continua** dentro das páginas (elas dependem de `onCityReadyChange`). O do header é uma segunda instância que escreve no mesmo store; a página reage via `selectedCityId`.
- Sidebar: saíram logo, card do usuário e "Sair"; ficou o botão de recolher (agora com `aria-expanded`) e o copyright. O logo existe só no header.
- **Mobile**: o prompt adia o header mobile, mas remover "Sair" da sidebar deixaria o mobile sem logout. O mesmo `AppHeader` funciona no mobile: hambúrguer abre o drawer existente (agora abaixo do header), seletor compacto só com ícones, avatar com o menu. Polimento mobile continua pendente.
- `roles.ts` (`src/lib/auth/roles.ts`): `UserRole` inclui `aplicador` e `tecadm`; `ROLE_LABELS`, `getRoleLabel`, `getInitials` saíram da sidebar.
- O logo do header usa `next/image` (como no login) para não criar warning `no-img-element`.

### Relatório da Etapa 1

- **Mudou**: 27 páginas movidas com `git mv` para `src/app/(private)/app/leitura/`; `/app` virou `SystemRedirect`; redirects 308; `routes.ts`; todos os paths hardcoded trocados; `AppHeader` + `SystemSwitcher` + `useActiveSystem`; sidebar sem card/sair.
- **Verificado**: `tsc` 0 erros; build OK (34 páginas); lint 0 erros e 7 warnings (eram 10 — sumiram os 3 de `<img>`); grep sem nenhum `/app/<segmento-antigo>` fora de `routes.ts`; redirects por `curl`; navegação real no navegador (redirect legado → header → troca para ICA → menu do usuário); filho `?aba=texto` destacado (o `exactPath` continua funcionando); `FullscreenLayout` (`z-[80]`, `fixed inset-0`) continua cobrindo header (`z-[60]`) e sidebar — o motor do aplicador não foi tocado.
- **Observação**: o `tsc` acusou erros só em `.next/types` antigos (gerados pelo build anterior com os paths velhos); somem após um novo `next build`.
- **Pendente**: as 4 pastas vazias antigas (`avaliacao-fluencia`, `avaliacao-leitura-guiada`, `avaliacoes`, `cadastros`) não puderam ser removidas pela ferramenta (bloqueio de permissão). Git não as rastreia e o Next as ignora; podem ser apagadas à mão. `useScrollToTop` rola `window`, mas quem rola é o `<main>` (comportamento legado, inalterado).

---

### Inconsistências de legado (registrar, não corrigir)

- "Revisão e áudio" lista `/guided-sessions`; a prática atual grava `/fluency-sessions`.
- Botão "Ver relatórios" do Leiturômetro (`caed-aplicador.tsx`) vai para o hub mock (`/app/leitura/relatorios?aba=ica`). Só o path foi atualizado; o destino mock foi mantido (o prompt só pede mudar o botão do hero).
- `/app/relatorios` é 100% mock.
- `/app/avaliacao-leitura-guiada/demo` e `/sessao` são mocks ainda roteados.
- `GuidedSessionFlow` / `GuidedSelectionForm` sem rota.
