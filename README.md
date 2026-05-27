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
| Configuracao avaliacao | `/app/configuracao-avaliacao` | Em desenvolvimento |

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
| `NEXT_PUBLIC_APP_BASE_DOMAIN` | Dominio base para subdominios de municipio | `localhost:3000` |
| `NEXT_PUBLIC_DEBUG_MODE` | Logs extras no client | `false` |

### Opcionais (server-side)

| Variavel | Descricao |
|----------|-----------|
| `API_DISCOVERY_REMOTE_URL` | API da VPS central para discovery de municipios. Padrao: `https://prod-api.afirmeplay.com.br` |
| `CITIES_DATABASE_URL` | Postgres da VPS central para listar `public.city` (recomendado para ver todos os municipios) |
| `CITIES_DISCOVERY_REGISTRATION` | Usuario admin para fallback via `GET /city/` |
| `CITIES_DISCOVERY_PASSWORD` | Senha do usuario acima (somente server-side) |

> **Seguranca:** nunca coloque senhas, tokens ou URLs de banco com credenciais em variaveis `NEXT_PUBLIC_*`. Essas variaveis ficam expostas no navegador.

Credenciais de banco, Redis, MinIO, JWT e integracoes externas pertencem ao `.env` do **backend**, nao deste repositorio.

## Fluxo de login

1. O usuario escolhe o municipio no dropdown.
2. O frontend redireciona para `http://<slug>.<NEXT_PUBLIC_APP_BASE_DOMAIN>/login`.
3. A autenticacao usa `POST /login/` via proxy `/api`, com tenant resolvido pelo subdominio (ou `Origin` em dev).

Exemplo de acesso em desenvolvimento:

```text
http://limoeirodeanadia.localhost:3000/login
```

Navegadores modernos resolvem `*.localhost` automaticamente.

## Listagem de municipios

A rota interna `GET /api/discovery/cities` busca municipios nesta ordem:

1. Tabela `public.city` no Postgres (`CITIES_DATABASE_URL`)
2. `GET /city/` na VPS central ou no backend local (se `CITIES_DISCOVERY_*` estiver configurado)
3. Catalogo mobile `/mobile/v1/available-cities` na VPS central (fallback)

A entrada meta `afirme` (VPS central) e excluida da lista, pois nao e um subdominio de login valido.

## Estrutura do projeto

```text
src/
  app/
    (public)/login/              # Tela de login
    (private)/app/               # Area autenticada
    api/discovery/cities/        # API interna de municipios
    layout.tsx, page.tsx, globals.css
  components/
    auth/                          # AuthGuard, login, redirects
    layout/                        # Sidebar, placeholders
    providers/                     # Providers globais
    ui/                            # Componentes shadcn
  config/navigation.ts             # Menu da sidebar
  lib/
    api/                           # Cliente HTTP
    city-domain.ts                 # Helpers de subdominio
    server/cities-discovery.ts     # Discovery server-side
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

- Confirme que o backend local esta rodando.
- Configure `CITIES_DATABASE_URL` apontando para o Postgres da VPS central, **ou**
- Configure `CITIES_DISCOVERY_REGISTRATION` / `CITIES_DISCOVERY_PASSWORD` com um usuario admin valido.

### Erro de login / CORS

Acesse sempre pelo subdominio do municipio (`<slug>.localhost:3000`), nao apenas `localhost:3000`.

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
