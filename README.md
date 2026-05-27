# afirmeplay-leitura-frontend

Base inicial em Next.js para o sistema de leitura da Afirme Play.

## Estrutura do projeto

```text
src/
  app/                         # Rotas Next.js (App Router)
    (public)/login/            # Tela de login
    (private)/app/             # Area autenticada (/app/*)
    api/discovery/cities/      # API interna (lista de municipios)
    layout.tsx
    page.tsx
    globals.css
  components/
    auth/                      # AuthGuard, redirects
    layout/                    # Sidebar, placeholders
    providers/                 # Providers globais
    ui/                        # Componentes base (shadcn)
  config/                      # Constantes (menu, rotas)
  lib/
    api/                       # Cliente HTTP e servicos de API
    city-domain.ts             # Helpers de subdominio
    utils.ts
  stores/                      # Estado global (Zustand)
public/                        # Assets estaticos
```

## Requisitos

- Node.js 20+
- Backend do `afirmeplay_backend` rodando

## Configuracao

1. Copie `.env.example` para `.env` (ou use o `.env` ja alinhado ao `afirmeplay-frontend`).
2. Ajuste os valores se necessario.

### Frontend (Next.js)

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_APP_BASE_DOMAIN=localhost:3000
NEXT_PUBLIC_DEBUG_MODE=false
API_DISCOVERY_REMOTE_URL=https://prod-api.afirmeplay.com.br
```

### Backend / banco (mesmo padrao do afirmeplay-frontend)

O frontend **nao** acessa o banco diretamente. Para ter acesso a **todas as tabelas/schemas** (multitenant), o `afirmeplay_backend` precisa usar o mesmo `.env`, principalmente:

```bash
DATABASE_URL=postgresql://...@...:15432/afirmeplay_dev
APP_ENV=development
JWT_SECRET_KEY=...
```

Copie o bloco `Backend` do `.env` deste projeto para o `.env` em `afirmeplay_backend/` antes de rodar:

```bash
cd ../afirmeplay_backend
python run.py
```

## Desenvolvimento

Instale as dependencias:

```bash
npm install
```

Execute:

```bash
npm run dev
```

Para respeitar o fluxo de subdominio no login, acesse pela URL:

```bash
http://<slug>.localhost:3000/login
```

Exemplo: `http://limoeirodeanadia.localhost:3000/login`

### Municipios

A lista de municipios e carregada por `/api/discovery/cities` a partir da **VPS central** (`prod-api.afirmeplay.com.br`):

1. Consulta `public.city` no banco da VPS (via `CITIES_DATABASE_URL`, ou `DEST_DATABASE_URL` / `DATABASE_URL`)
2. Se o banco nao estiver acessivel, tenta `GET /city/` com credenciais admin opcionais (`CITIES_DISCOVERY_REGISTRATION` + `CITIES_DISCOVERY_PASSWORD`) na VPS central e, em seguida, no backend local
3. Fallback: catálogo mobile (`/mobile/v1/available-cities`), excluindo a entrada meta `afirme`

Para ver todos os municipios da VPS central, configure no `.env` a URL real do Postgres de producao:

```bash
CITIES_DATABASE_URL=postgresql://usuario:senha@host:5432/afirmeplay_prod
```

### Login

O login em si exige o backend local rodando (`python run.py` na porta 5000), pois a autenticacao usa subdominio + `POST /login/`.

Se aparecer `ChunkLoadError` ou `layout.css 404`, pare o servidor, limpe o cache e suba de novo:

```bash
rm -rf .next
npm run dev
```

## Build

```bash
npm run build
npm run start
```
