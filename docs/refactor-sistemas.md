# Diário — Reorganização em dois sistemas (Leitura | ICA)

Escopo: somente `afirmeplay-leitura-frontend/`. Backend, Afirme Play e mobile são só referência (leitura).

Branch de trabalho: `lucas` (working tree limpo no início).

---

## Fase 0 — Reconhecimento (sem alteração de código)

### Linha de base (antes de qualquer mudança)

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | 0 erros |
| `npm run lint` | 0 erros, 12 warnings pré-existentes (imports não usados, `<img>`, deps de hooks) |
| `npm run build` | OK, 32 páginas |

(Correção: a primeira leitura contou 10 warnings a partir de saída truncada; a lista completa tem 12, incluindo `_markings` em `caed-aplicador.tsx` e a dependência `user?.role` em `fluencia-selecao.tsx`.)

Os 12 warnings de lint são legado e **não** serão corrigidos nesta refatoração (fora de escopo). Qualquer warning novo é regressão.

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
- **Verificado**: `tsc` 0 erros; build OK (34 páginas); lint 0 erros e 9 warnings (eram 12 — sumiram os 3 de `<img>`); grep sem nenhum `/app/<segmento-antigo>` fora de `routes.ts`; redirects por `curl`; navegação real no navegador (redirect legado → header → troca para ICA → menu do usuário); filho `?aba=texto` destacado (o `exactPath` continua funcionando); `FullscreenLayout` (`z-[80]`, `fixed inset-0`) continua cobrindo header (`z-[60]`) e sidebar — o motor do aplicador não foi tocado.
- **Observação**: o `tsc` acusou erros só em `.next/types` antigos (gerados pelo build anterior com os paths velhos); somem após um novo `next build`.
- **Pendente**: as 4 pastas vazias antigas (`avaliacao-fluencia`, `avaliacao-leitura-guiada`, `avaliacoes`, `cadastros`) não puderam ser removidas pela ferramenta (bloqueio de permissão). Git não as rastreia e o Next as ignora; podem ser apagadas à mão. `useScrollToTop` rola `window`, mas quem rola é o `<main>` (comportamento legado, inalterado).

---

## Etapa 2 — Dois mapas de navegação e sidebar por sistema

### Decisões

- `navigation.ts` exporta `NAV_LEITURA`, `NAV_ICA`, `getNavForSystem`, `getSystemFromPathname` (re-export de `routes.ts`), `filterNavCategoriesByRole`, `canAccessByRoles`, `isNavLinkActive` e `DASHBOARD_SHORTCUTS: Record<AppSystem, …>` (cada atalho carrega o próprio ícone; o mapa `SHORTCUT_ICONS` do dashboard saiu).
- Removidos por não terem consumidores: `NAV_CATEGORIES`, `DASHBOARD_FEATURE_CARDS`, `getAllNavLinks`, `APP_NAV_ITEMS`/`AppNavItem`, `SidebarThemeId`, vars `--sidebar-user-card-*` e `--sidebar-button-*`.
- `NavLink` ganhou `disabled` e `badge` (usados na Etapa 4 para "Em breve").
- O `PrivateShell` filtra por papel e passa `categories` + `system` à `Sidebar` (um componente só).
- `sidebarThemes.ts` agora referencia `--system-*` (`color-mix` para hover/borda/anel). A Leitura fica visualmente igual: borda ≈ `#EEE6F3` (antes `#ece8f2`).
- Accordion: Radix `Accordion` (`type="multiple"`, controlado) com `animate-accordion-down/up` (200 ms). Pai com filhos continua sem navegar. Grupos com rota ativa abrem sozinhos (inclusive ao navegar).
- Sidebar recolhida: tooltip em todos os itens; grupos abrem um `DropdownMenu` à direita com os filhos (substitui o popover pedido, já que `@radix-ui/react-popover` não está instalado).
- Troca de sistema: `<nav key={system}>` com `animate-in fade-in-0 slide-in-from-left-2 duration-200`; cores transicionam pelas variáveis registradas.
- `aria-current="page"` nos links ativos; `aria-label` nos itens recolhidos (o ícone é `aria-hidden`); alvos ≥ 40 px (`min-h-10`).
- `useActiveSystem` lê `last_system` já no primeiro render (seguro porque o shell só monta no cliente, depois do `AuthGuard`) — evita o flash Leitura→ICA em `/app/perfil`.
- **Role `aplicador`**: incluído em `UserRole`/`ROLE_LABELS`; `ICA_WRITE_ROLES` + `canWriteIca()` em `roles.ts` (sem `aplicador`, como no contrato). Na Leitura nada muda para o aplicador (o frontend não restringe papéis além de "palavras conhecidas" e o prompt proíbe mexer em domínio).

### Relatório da Etapa 2

- **Verificado**: `tsc` 0; build OK; lint 9 warnings legados (nenhum novo). No navegador: grupo ativo abre sozinho; `aria-current` no item ativo; troca para ICA mostra só "Início" em teal e nenhum item da Leitura; sidebar recolhida com submenu em dropdown; `sidebar_collapsed` persistido.
- **Corrigido durante a revisão**: item recolhido sem nome acessível; item ativo recolhido sem cantos arredondados.
- **Pendente**: nada desta etapa.

---

## Etapa 3 — Nomenclatura (só rótulos)

### Termos renomeados

| Onde | Antes | Depois |
|---|---|---|
| Menu · categoria | Avaliacoes / Relatorios | Avaliações / Relatórios |
| Menu · Início | Inicio | Início |
| Menu · grupo | Avaliação de Fluência — "Leiturometro e ICA" | **Avaliar** — "Leiturômetro" |
| Menu · filhos de Avaliar | Criar Avaliação · Listar Avaliação | Criar avaliação · Avaliações criadas · **Aplicar** (novo filho → seleção oficial, `exact`) |
| Menu · grupo | Praticar Avaliação de Fluência | **Praticar** |
| Menu · filhos de Praticar | Revisão e áudio · Praticar palavras conhecidas · Praticar palavras pouco conhecidas · Praticar texto | Palavras conhecidas · Palavras pouco comuns · Texto · Revisão e áudio |
| Menu · filhos de Cadastros | Lista de palavras conhecidas · Lista de palavras pouco comuns · Criar textos e perguntas | Palavras conhecidas (só admin) · Palavras pouco comuns · Textos e perguntas |
| Menu · Resultados | "Resultados de fluencia" (item) + "Avaliacoes aplicadas" (item) + "Relatorios" (hub mock) | Grupo **Resultados**: Resultados de fluência · Avaliações aplicadas. Hub mock fora do menu |
| Dashboard · atalhos | Aplicar avaliacao · Leitura guiada / Roteiro de mediação · Avaliacoes aplicadas · Relatorios | Aplicar avaliação · **Praticar leitura** / "Palavras e texto, sem registro oficial" · Avaliações aplicadas · Relatórios |
| Título da prática (`fluencia-selecao`, `caed-aplicador`) | Praticar Avaliação de Fluência | Praticar leitura |
| Textos da prática (`practice-tabs`, `caed-aplicador`, `fluencia-selecao`) | palavras pouco conhecidas | palavras pouco comuns |

### Decisões

- Estrutura do menu mantida em accordion (grupos com filhos), dentro das categorias que já existiam.
- `NavChildLink.exact`: "Aplicar" aponta para o mesmo path do pai (`/app/leitura/avaliacao-fluencia`); sem `exact` ficaria ativo também em Criar/Listar.
- Botão "Ver relatórios" do hero **já** apontava para o relatório real (`relatorios-fluencia`) antes da refatoração — divergência com o prompt, nada a mudar além do path novo.
- Hub mock `/app/leitura/relatorios` saiu do menu; a rota continua e o botão "Ver relatórios" do Leiturômetro ainda leva a ele (legado).
- Tooltip "Nível de leitura (PL1–LF), escala ICA da fluência" no primeiro chip do hero (focável por teclado); `aria-label` com o mesmo texto na lista. Cores, valores e labels de `reading-levels.ts` intocados (`git diff` vazio desde o baseline).
- Mantidos de propósito: "Leitura guiada" em `status-badge.tsx` e no toast de `guided-session-flow.tsx` (referem-se ao domínio legado `guided-sessions`, não ao menu); eyebrow "Compromisso Criança Alfabetizada · ICA" na seleção de fluência (é o ICA da fluência, preservado); título "Relatorio de fluencia" dentro do hub mock (fora do menu, fora de escopo).

### Relatório da Etapa 3

- **Verificado**: build e `tsc` limpos; lint sem warnings novos; grep sem os termos antigos em rótulos de menu/dashboard/prática.
- **Sinalizar ao usuário**: "Revisão e áudio" lista `guided-sessions` (legado), enquanto a prática grava `fluency-sessions` — comportamento **não** alterado.

---

## Etapa 4 — Esqueleto do sistema ICA

### Rotas novas (todas com `page.tsx` fino)

| Rota | Conteúdo nesta etapa |
|---|---|
| `/app/ica` | `IcaHome`: cabeçalho ICA, 3 atalhos (Questões, Avaliações, Aplicação e correção "Em breve"), "Primeiros passos" com CTA (CTA de criação só para quem escreve) |
| `/app/ica/questoes` | `InDevelopment` (Etapa 5) |
| `/app/ica/questoes/nova` | `InDevelopment` (Etapa 5) |
| `/app/ica/questoes/[id]` | `InDevelopment` (Etapa 5) |
| `/app/ica/avaliacoes` | `InDevelopment` |
| `/app/ica/avaliacoes/nova` | `InDevelopment` (Etapa 5: construtor) |

### Menu ICA

Principal: Início · Conteúdo: **Banco de questões** (Criar questão, Listar questões) e **Avaliações** (Criar avaliação, Listar avaliações) · Acompanhamento: **Aplicação e correção** e **Resultados** — `disabled` + `badge: "Em breve"`, sem rota (href com `#` só como chave), não clicáveis, com tooltip e `aria-disabled`.

"Criar questão" e "Criar avaliação" têm `roles: ICA_WRITE_ROLES` → o `aplicador` não os vê.

### Decisões

- **Identidade ICA nos componentes compartilhados sem tocar neles**: `[data-system="ica"]` redefine `--brand-hero-from/to` (HSL) e `--brand-highlight` (RGB). `brand-highlight` no Tailwind passou de hex fixo para `rgb(var(--brand-highlight) / <alpha-value>)` (aceita `/10`). Fora do shell (login, 404) valem os valores de `:root` = roxo atual.
- `PageHeader` ganhou `brand?` (padrão "Afirme Ler · Painel institucional"); o ICA usa "Sistema ICA · Índice Criança Alfabetizada". O título "Sistema ICA — Índice Criança Alfabetizada" aparece só no módulo novo (`src/lib/ica/brand.ts`).
- `StatCard` (variante `metric`): fundo do ícone de `bg-violet-500/10` para `bg-brand-highlight/10` — na Leitura a diferença é imperceptível (roxo #7030A0 a 10% em vez de violeta #8B5CF6 a 10%) e no ICA passa a seguir o teal.
- `ShortcutTile`: props `disabled` e `badge` (o `badge` já existia na interface e não era renderizado).
- Na troca de sistema, as cores dos componentes que usam `--brand-hero-*` mudam na hora (triplas HSL não interpolam); as do header/sidebar transicionam em 200 ms.

### Relatório da Etapa 4

- **Verificado**: build (38 páginas) e `tsc` limpos; lint sem novos warnings; no navegador: home ICA em teal com "Em breve" desabilitado; Leitura continua roxa com o menu novo.
- **Observado**: toast "Internal Server Error" ao abrir telas com `AdminCityPicker` no ambiente local — vem do catálogo de municípios sem backend; não é regressão.

---

## Etapa 5 — Banco de questões e construtor de avaliação

### Entregáveis

| Peça | Arquivo |
|---|---|
| Cliente HTTP (`listBankQuestions`, `getBankQuestion`, `createBankQuestion`, `updateBankQuestion`) | `src/lib/api/afirme-reading/questions.ts` |
| Tipos `BankQuestion*`, `CreateBankQuestionPayload`, `UpdateBankQuestionPayload` (aceita `null` para limpar) | `src/lib/api/afirme-reading/types.ts` |
| `afirmeReadingApi.put` | `src/lib/api/afirme-reading/client.ts` |
| Normalizador de erro único (`normalizeApiError`) + chaves `erro`/`mensagem`/`msg` no `getApiErrorMessage` | `src/lib/api/errors.ts` |
| Catálogos (disciplinas, habilidades, séries, etapas) | `src/lib/api/question-catalog.ts` |
| HTML seguro (DOMPurify) + URL de imagem + montagem do HTML simples | `src/lib/ica/question-html.ts`, `src/components/ica/question-html.tsx` |
| Imagem → data-URL com validação (PNG/JPG/GIF/WEBP, ≤ 1 MB) | `src/lib/ica/image-file.ts` |
| Regras/rótulos (letras A–H, dificuldades, origem, escopo, somente leitura) | `src/lib/ica/questions.ts` |
| Listagem | `src/components/ica/questions/questions-list-page.tsx` (+ `question-filters`, `question-badges`, `question-preview`, `question-preview-sheet`) |
| Formulário criar/editar | `question-form.tsx`, `question-options-editor.tsx`, `question-draft.ts`, `question-create-page.tsx`, `question-detail-page.tsx` |
| Construtor | `src/components/ica/assessments/assessment-builder-page.tsx`, `question-picker-dialog.tsx`, `src/lib/ica/assessment-draft.ts` |
| Lista de avaliações (vazia + rascunho local) | `src/components/ica/assessments/assessments-list-page.tsx` |
| Hooks | `use-debounced-value`, `use-question-catalog`, `use-skill-label`, `use-unsaved-changes`, `use-flip-list` |
| Guarda de navegação (alterações não salvas) | `src/lib/navigation-guard.ts` (consultada pelo seletor de sistema e pelo "Sair") |

### Decisões

- **`dompurify@3.4.17`** (versão exata). Sem `window` (SSR) o DOMPurify não expõe `sanitize`; nesse caso `QuestionHtml` mostra o texto simples. Tags/atributos perigosos (`style`, `iframe`, `form`…) são removidos; `<img>` só fica com `src` resolvível; links abrem em nova aba com `rel="noopener noreferrer"`.
- **Imagens**: `GET /questions/<id>/images/<imageId>` é **pública** no backend (`question_routes.py`, sem `@jwt_required`). O front reescreve `src="/questions/..."` para `/api/questions/...`, que o rewrite já cobre. **Não** foi preciso blob/object URL nem cache.
- **Catálogos** (autorizado pelo usuário): `GET /subjects` (`[{id,name}]`), `GET /skills/subject/:id` e `GET /skills/grade/:id` (`[{id,code,description,subject_id,grade_ids}]`), `GET /grades`, `GET /education_stages`. Disciplinas e habilidades ficam em cache de memória (tabelas globais); séries recarregam ao trocar de município.
- **Listagem**: sempre `type=multipleChoice` (também no banco, não só no construtor — questões de outros tipos do Play não servem ao ICA); `per_page=20`; filtros e página na query string com os mesmos nomes da API (`q`, `subject_id`, `grade_id`, `difficulty`, `origin`, `page`); busca com debounce de 350 ms; recarrega ao trocar de município; skeleton, estado vazio com CTA (limpar filtros / criar questão), estado de erro com "Tentar novamente"; selos de origem ("Afirme Play · somente leitura") e escopo; `Sheet` de pré-visualização com gabarito destacado, habilidade e valor.
- **`DataListPage`/`FormPage`/`Sheet`/`Select`** não tinham consumidores (DataList/Form/Sheet) ou tinham bug de camada (Select): foram estendidos com props opcionais retrocompatíveis. `Sheet` e `SelectContent` subiram de `z-50` para acima dos diálogos (`z-[1000]+`) — antes um `Select` dentro de `Dialog` (ex.: o picker de município do header) abria **atrás** do diálogo.
- **Formulário**: enunciado em texto simples + até 3 imagens (o `formattedText` é montado como `<p>` por linha + `<img>`); sem editor rico (nenhuma lib instalada). Se a questão já tinha formatação rica, um aviso explica que ela vira texto simples **só se** o enunciado for alterado — se não for, o PUT não envia `text`/`formattedText` e o HTML original fica intacto.
- Alternativas: 4 por padrão, 2–8, letra clicável com semântica de rádio (`role="radiogroup"`, setas trocam), texto e/ou imagem, adicionar/remover com animação de 150–200 ms, letras recalculadas pela posição, nenhuma marcada por padrão (evita gabarito acidental).
- Validação no cliente espelha o contrato (enunciado, disciplina, série, 2–8 alternativas, texto ou imagem em cada, exatamente uma correta, valor > 0); erros inline + toast + foco no primeiro campo.
- Edição: PUT só com campos alterados; `options` vai inteiro se qualquer alternativa mudar; campos opcionais limpos vão como `null`. `solution` nunca é enviado.
- Somente leitura previsível: origem `afirme_play` ou papel sem escrita (`aplicador`) → tela de visualização, botão "Editar" desabilitado com tooltip. O escopo fino (quem criou) fica com o backend; o 403 aparece em toast.
- Aviso de alterações não salvas: `beforeunload`, clique em links internos (captura) e navegação programática via `confirmNavigation()`. `Ctrl/Cmd + Enter` salva.
- **Construtor**: 16 fechadas (teal) · 3 abertas (âmbar) · 1 produção textual (rosa), com número e rótulo de tipo; contador ao vivo + barra de progresso; seletor em `Dialog` (busca, filtros, pré-visualização inline, "Adicionar", duplicatas bloqueadas, pré-filtra pela série/disciplina da avaliação); trocar/remover; reordenar com setas acessíveis e animação FLIP (Web Animations API, respeita `prefers-reduced-motion`); abertas/produção bloqueadas "Aguardando suporte…"; "Salvar" desabilitado com tooltip; rascunho no `localStorage` por município (`ica_assessment_draft:<cityId>`), com "Descartar rascunho".
- Estado "pronta" só com os 20 itens; como abertas/produção não existem, a tela mostra "Múltipla escolha completa" quando as 16 estão preenchidas.

### Relatório da Etapa 5

- **Verificado**: `tsc` 0; build OK (38 páginas); lint sem warnings novos; grep limpo. No navegador (sem backend), a listagem mostra o estado de erro com "Tentar novamente".
- **Não verificado no navegador**: fluxo com dados reais (listar/criar/editar/pré-visualizar e construtor). Uma simulação de API no navegador foi bloqueada pela revisão automática de ferramentas; fica no checklist manual.
- `npm install` reportou 16 vulnerabilidades em dependências **pré-existentes** (não tratadas aqui).

---

## Verificação final

| Item | Resultado |
|---|---|
| `tsc --noEmit` | 0 erros |
| `next build` (inclui lint) | OK, 38 páginas; 9 warnings, todos legados (eram 12) |
| Arquivos fora do frontend do Afirme Ler | `git status` limpo em `afirmeplay_backend` e `afirmeplay-frontend` |
| `reading-levels.ts` | sem diff desde o baseline |
| `CaedAplicador` | só paths de links e 2 rótulos de texto alterados; motor intocado |
| Rotas antigas | 308 verificados por `curl` |

### Checklist manual (para o usuário)

1. Login → trocar Leitura/ICA várias vezes (clique, setas no seletor, `Alt+1`/`Alt+2`).
2. Deep-link em rota antiga (ex.: `/app/cadastros/textos`) → redireciona.
3. Papéis professor, diretor, coordenador, admin, tecadm, **aplicador** (não vê "Criar questão"/"Criar avaliação"; tela de questão em somente leitura).
4. Sidebar recolhida (tooltips, submenu em dropdown) e expandida (grupo ativo aberto).
5. Admin: trocar município no header → listas recarregam; rascunho do construtor é por município.
6. `prefers-reduced-motion` ativo → sem animações.
7. Aplicador da Leitura em tela cheia (`/app/leitura/avaliacao-fluencia/aplicar`) sem header/sidebar; gravação e upload de áudio.
8. Criar, listar, editar e pré-visualizar questão (com imagem no enunciado e em alternativa); editar questão do Play → bloqueado.
9. Construtor: preencher as 16 fechadas, reordenar, trocar, remover, recarregar a página (rascunho volta).

---

## Pendências de backend (consolidadas — nada foi alterado no backend)

| # | Pendência | Impacto no front |
|---|---|---|
| P1 | API de avaliações do ICA | "Salvar" do construtor desabilitado; lista de avaliações vazia |
| P2 | Tipos de questão aberta e produção textual | Slots 17–20 bloqueados |
| P3 | Aplicação e correção (cartão-resposta) e Resultados | Itens "Em breve" no menu |
| P4 | Merge da branch de `/afirme-reading/questions` | Telas do banco recebem 404 até lá |
| P5 | Rota de imagem `/questions/<id>/images/<id>` é pública e não filtra escopo/município | Observação de segurança |
| P6 | Confirmar como o PUT trata `difficulty: null`, `skills: null` e imagens já salvas reenviadas como objeto/`src="/questions/..."` | Limpar campos opcionais e editar enunciado com imagem existente |
| P7 | Rotas próprias do Afirme Ler para disciplinas/habilidades (hoje usa as do Play) | Só troca a implementação de `question-catalog.ts` |
| P8 | Limite de tamanho de imagem no backend | Front limita a 1 MB por imagem (decisão provisória) |

---

## Revisão pós-entrega (município no ICA + backend)

### Bloco de município no ICA

- **Causa**: as telas da Leitura renderizam o `AdminCityPicker` no corpo da página (ele retorna `null` para não-admin); as do ICA só tinham o picker no diálogo do header.
- **Correção**: `src/components/ica/ica-city-scope.tsx` (mesmo padrão do `CadastrosShell`): picker no topo + conteúdo só depois do município pronto, remontando ao trocar. Usado em banco de questões, criar/editar questão, avaliações e construtor; na home do ICA só o picker.
- Importa no backend: `apply_visibility_filter` usa o município do contexto (`X-City-ID` do admin) para mostrar questões `CITY`.

### Backend revisado (branch `markindev`, sem alterações)

| Ponto | Conclusão |
|---|---|
| Criar/editar/listar questões | Implementação bate com o contrato; front já alinhado |
| PUT com `difficulty`/`skills`/`educationStageId` = `null` | Limpa o campo (P6 resolvida) |
| Imagens já salvas | `src="/questions/..."` no enunciado e `image` (objeto) na alternativa são preservados (P6 resolvida) |
| Regra de edição (`user_can_modify`) | GLOBAL só admin; CITY só admin/tecadm do município; PRIVATE só admin e o dono → **front passou a prever** (antes só bloqueava Play/aplicador) |
| `isCorrect` na resposta | O formatter (`normalize_alternatives_with_correct`) também marca alternativa cujo texto seja igual ao gabarito → **front passou a usar a letra de `correct_answer`** |
| `/skills/subject/:id` e `/skills/grade/:id` | Respondem **404** quando vazio → **front passou a tratar como lista vazia** (antes mostrava erro) |
| Tipos aberta/produção | O banco tem tipos discursivos (`essay`, `aberta`, `open`…, `DISCURSIVE_TYPES`), mas a rota do Afirme Ler aceita só múltipla escolha (P2 continua) |
| Avaliação ICA | Não existe rota em `/afirme-reading`; `POST /test` do Play recusa questões do Afirme Ler (P1 continua) |
| Aplicação/correção | O Play tem cartão-resposta (`answer_sheet_routes`, `answer_sheet_import`) e prova subjetiva (`subjective_tests`), nenhum ligado ao Afirme Ler (P3 continua) |

---

### Inconsistências de legado (registrar, não corrigir)

- "Revisão e áudio" lista `/guided-sessions`; a prática atual grava `/fluency-sessions`.
- Botão "Ver relatórios" do Leiturômetro (`caed-aplicador.tsx`) apontava para `/app/leitura/relatorios?aba=ica`. O parâmetro era do hub mock; a rodada seguinte levou o botão ao painel real.
- `/app/relatorios` é 100% mock.
- `/app/avaliacao-leitura-guiada/demo` e `/sessao` são mocks ainda roteados.
- `GuidedSessionFlow` / `GuidedSelectionForm` sem rota.

---

## Rodada de continuidade (já no commit local `05c5b72`)

O backend `markindev` passou a expor o que as pendências P1, P2 e P3 pediam. O front da branch `lucas` consome essas rotas. Nesta sessão não houve commit, push nem troca de branch, e o backend não foi alterado.

### O que o front passou a fazer

- Banco de questões com `multipleChoice`, `dictation` e `text_production` (formulário, lista, prévia e seletor).
- Avaliação escrita em `/written-tests`: rascunho, composição 16 múltipla escolha + 3 ditados + 1 produção, publicação (o servidor exige 20 questões), PDF e exclusão.
- Aplicação por turma, alunos, retirada antes do início e cartões-resposta (geração, consulta e ZIP).
- Acompanhamento do ICA com contagens reais de banco, rascunhos, publicações e situação das turmas. Sem nota de aluno.
- Painel de resultados da Leitura em `/app/leitura/relatorios`, no lugar do hub mock, com os dados de `/resultados`.
- Leitura automática (`/guided-auto-sessions`) e marcação de ausente na fluência.
- Ajustes de revisão: renovação do token, gravador sem segunda partida, exclusão de perguntas do texto antes do patch, limpeza de turno no relatório e perfil do aluno zerado ao recarregar.
- Acentos em textos visíveis, remoção do ícone `/AFIRME-PLAY-ico.png` (404), `outputFileTracingRoot` e duração do sheet.

O botão "Ver relatórios" do Leiturômetro ia para `?aba=ica`, parâmetro do hub mock. Agora abre o painel real de resultados.

### O que continua fora do front

| Pendência | Motivo |
|---|---|
| Resultados do ICA (desempenho do aluno) | Não há correção de cartão nem agregação de nota em `/resultados`. O item do menu segue "Em breve". |
| Tabelas da prova escrita no município | Dependem de `provision_afirme_ler_written_tests.py --execute` no schema da cidade (tarefa de backend; não foi executada). |
| Transcrição da leitura automática e geração dos cartões | Dependem do worker (STT/Celery) no servidor. |

Páginas de demonstração e configuração ainda importam `src/lib/mock`. Essas rotas de legado continuam de propósito.

### Verificação

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit -p .` | 0 erros |
| `npx eslint src` | 0 erros, 8 warnings legados (imports e deps de hooks já existentes; antes eram 9) |
| Tela | Não exercitada aqui; a conferência visual fica com quem usa o sistema. |

---

## Acompanhamento, barra lateral e marca (sem commit)

### Erro de hidratação

O `StatCard` colocava o `Skeleton` (uma `div`) dentro de um `p` enquanto carregava. O valor passou a ser uma `div` nas três variantes. O mesmo erro saía do Acompanhamento, do painel de resultados, das avaliações aplicadas e da lista de avaliações de fluência.

### Números do Acompanhamento

Conferido com `written_test_service.py`, `written_test_answer_sheet_service.py` e `question_bank_service.py`.

- O card de turmas conta cada turma uma vez. O gráfico "Aplicações por situação" continua contando o par avaliação × turma.
- Os cartões usam, por turma, a geração concluída mais recente que a cobre. Se uma geração antiga ainda cobre outras turmas, entra só a parte proporcional aos alunos.
- Falha ao consultar turmas ou cartões de uma avaliação aparece no aviso, em vez de sumir na soma.
- O aviso deixa claro que o recorte segue as avaliações criadas mais recentemente (`created_at`), e que a lista do servidor traz no máximo 100.
- A aplicação de avaliações publicadas avisa quando há mais de 100. O painel de resultados da Leitura já dizia que a prática automática usa as últimas 100 sessões; o texto bate com o `limit` da rota.

### Marca e menu

- Barra aberta: o botão mostra "Recolher menu" ao lado da seta. Recolhida, só a seta.
- Logo `Afirme-edu-logo.png` no cabeçalho e no login. Título da página, rodapé, marca padrão das telas da Leitura, painel, dica do seletor, capas do PowerPoint e o rótulo da origem `afirme_ler` passam a "Afirme Educacional".
- Os nomes Leitura e ICA, o caminho `/afirme-reading`, o valor `afirme_ler` e o domínio `@afirmeplay.com.br` ficam como estão. "Afirme Play" continua nomeando o outro produto.

### Verificação

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit -p .` | 0 erros |
| `npx eslint src` | 0 erros, 4 warnings legados (`_markings`, `wordMsLeft`, duas deps de hooks) |
| Tela | Não exercitada aqui. |

---

## Remoção do mock de login e blindagem da sessão (sem commit)

### Diagnóstico

- O `mock-dev-token`, o nome `Usuário usuário` e o 422 `Not enough segments` em `/api/city` vinham do mesmo ponto: `MOCK_AUTH=true` acionava o ramo mock de `src/app/api/login/route.ts` e `src/app/api/persist-user/route.ts`.
- Esse mock era legado do commit inicial (`44c45a1`) e não parte da arquitetura real. A lógica correta já existia no mesmo arquivo: proxy para o backend em `/login/` e `/persist-user/`.
- O backend atual foi conferido em `login.py`, `persistUser_routes.py`, `city_routes.py` e `tenant_middleware.py`: o JWT real traz `sub`, `city_id`, `tenant_id`, `role` e `exp`. Nenhuma mudança de backend foi necessária.
- `/api/city` é protegido e estava recebendo `Authorization: Bearer mock-dev-token`; como o token não é JWT, o Flask devolvia 422 antes de executar a rota.

### Correções no front

- `login/route.ts` e `persist-user/route.ts` ficaram sem ramo mock e sempre fazem proxy para o backend.
- O proxy de login agora repassa `X-City-ID` além de `X-City-Slug`; o proxy de `persist-user` repassa os dois.
- `src/lib/mock/auth.ts`, `serverEnv.mockAuth` e `MOCK_AUTH=true` do `.env.example` foram removidos.
- `isJwtShape` rejeita tokens sem formato JWT. O store limpa automaticamente sessões antigas com token inválido na hidratação e no `persist-user`.
- O interceptor de API trata 422 de decodificação JWT (`Not enough segments` etc.) como sessão inválida e redireciona ao login.
- `listCatalogCities` só tenta `/city/` como fallback quando o erro é de rota; 401/422 agora sobem corretamente.

### PDF, cartões e relatórios

- O PDF da prova já existe no backend: `GET /afirme-reading/written-tests/:id/pdf`, via `WrittenTestPdfService.generate_pdf`.
- Os cartões-resposta também existem, mas como fluxo separado: `POST/GET /written-tests/:id/answer-sheets` e download ZIP. A geração depende do worker.
- No front, `downloadWrittenTestPdf` e `downloadAnswerSheets` já são usados no construtor/detalhe da avaliação e na tela de aplicação.
- Não foi alterado o fluxo de PDF/cartões porque a liderança descartou mexer nessa implementação nesta rodada.
- Resultados da Leitura e relatórios de fluência já usam `/resultados`. Resultados do ICA continuam bloqueados: falta correção/agregação de cartão no backend.

### Verificação

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit -p .` | 0 erros |
| `npx eslint src` | 0 erros, 4 warnings legados |
| `ReadLints` nos arquivos alterados | 0 erros |
| Busca por `MOCK_AUTH`, `mock-dev-token`, `lib/mock/auth` fora de `docs/` | sem resultados |
| Tela | Não exercitada aqui. |
