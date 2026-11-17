# Afirme Play — Leitura (frontend)

Interface web do **Sistema de Leitura Afirme Play**, construida com Next.js 15 (App Router), TypeScript, Tailwind CSS e shadcn/ui.

Integra-se ao repositorio `afirmeplay_backend` para autenticacao e dados.

## Funcionalidades atuais

| Area | Rota | Status |
|------|------|--------|
| Login com selecao de municipio | `/login` | Ativo |
| Boas-vindas | `/app` | Ativo |
| Avaliacao fluencia | `/app/avaliacao-fluencia` | Em desenvolvimento |
| Avaliacao leitura guiada | `/app/avaliacao-leitura-guiada` | Em desenvolvimento |
| Listas de palavras | `/app/configuracao-avaliacao` | Ativo |

## Requisitos

- **Node.js** 20 ou superior
- **npm** 10+
- **afirmeplay_backend** rodando localmente (porta 5000 por padrao)

## Inicio rapido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variaveis de ambiente
cp .env.example .env
# Edite .env com os valores do seu ambiente (nao commite o arquivo .env)

# 3. Subir o backend (em outro terminal)
cd ../afirmeplay_backend
python run.py

# 4. Subir o frontend
npm run dev
```

A aplicacao ficara disponivel em [http://localhost:3000](http://localhost:3000).

## Variaveis de ambiente

O arquivo `.env` **nao deve ser versionado** (ja esta no `.gitignore`). Use `.env.example` como referencia.

### Obrigatorias para desenvolvimento local

| Variavel | Descricao | Exemplo |
|----------|-----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | URL base do backend (proxy `/api` no Next) | `http://localhost:5000` |
| `NEXT_PUBLIC_DEBUG_MODE` | Logs extras no client | `false` |

> **Seguranca:** nunca coloque senhas, tokens ou URLs de banco com credenciais em variaveis `NEXT_PUBLIC_*`. Essas variaveis ficam expostas no navegador.

Credenciais de banco, Redis, MinIO, JWT e integracoes externas pertencem ao `.env` do **backend**, nao deste repositorio.

## Fluxo de login

1. O usuario escolhe o municipio no dropdown (mesmo dominio).
2. O slug (e o id) sao salvos em `localStorage` — nao ha redirect por subdominio.
3. A autenticacao usa `POST /login/` via proxy `/api`, com `citySlug` / `X-City-Slug`.
4. Rotas do Afirme Ler enviam `Authorization: Bearer` e `X-City-Slug` / `X-City-ID` a partir do contexto salvo.

Exemplo de acesso em desenvolvimento:

```text
http://localhost:3000/login
```

## Listagem de municipios

O login consome a rota publica do backend (sem JWT):

```text
GET /afirme-reading/discovery/cities
```

No browser isso passa pelo proxy do Next (`/api` → `NEXT_PUBLIC_API_BASE_URL`). A lista vem de `public.city` filtrada pela feature `afirme_reading`.

## Estrutura do projeto

```text
src/
  app/
    (public)/login/              # Tela de login
    (private)/app/               # Area autenticada
    api/login/                     # Proxy de login
    layout.tsx, page.tsx, globals.css
  components/
    auth/                          # AuthGuard, login, redirects
    layout/                        # Sidebar, placeholders
    providers/                     # Providers globais
    ui/                            # Componentes shadcn
  config/navigation.ts             # Menu da sidebar
  lib/
    api/                           # Cliente HTTP (inclui discovery de municipios)
    city-domain.ts                 # Helpers de municipio (slug/id no client)
    env.ts                         # Variaveis de servidor
  stores/auth-store.ts             # Estado de autenticacao (Zustand)
public/                            # Logos e assets estaticos
```

## Scripts disponiveis

| Comando | Descricao |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de producao |
| `npm run start` | Servidor apos o build |
| `npm run lint` | ESLint |

## Solucao de problemas

### `ChunkLoadError`, `layout.css 404` ou `main-app.js 404`

Cache do Next corrompido (comum apos rodar `build` com `dev` ativo):

```bash
# Pare o dev server antes
rm -rf .next
npm run dev
```

Depois, faca hard refresh no navegador (`Ctrl+Shift+R`).

### Municipios nao aparecem ou lista incompleta

- Confirme que o backend esta rodando em `NEXT_PUBLIC_API_BASE_URL`.
- Teste `GET /afirme-reading/discovery/cities` diretamente na API (sem Authorization).
- Reinicie a API apos publicar a rota de discovery do Afirme Reading.

### Erro de login / CORS

Confirme o backend em `NEXT_PUBLIC_API_BASE_URL` e acesse pelo mesmo dominio (`localhost:3000`). O municipio e enviado via `selected_slug` / `X-City-Slug`, nao por subdominio.

### Backend indisponivel

Verifique se o `afirmeplay_backend` esta ativo na porta definida em `NEXT_PUBLIC_API_BASE_URL`.

## Build de producao

```bash
npm run build
npm run start
```

Defina as variaveis `NEXT_PUBLIC_*` no ambiente de deploy antes do build.

## Licenca

Projeto interno Afirme Play.
