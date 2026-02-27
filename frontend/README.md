# Divi Agent — Frontend (React + Vite)

Frontend da aplicação de triagem de chamados. Deploy-ready com Vite.

## Setup

```bash
cd frontend
cp .env.example .env
# Edite .env e preencha:
# VITE_SUPABASE_URL=https://seu-projeto.supabase.co
# VITE_SUPABASE_ANON_KEY=sua-anon-key
npm install
```

## Desenvolvimento

```bash
npm run dev
```

Abre em `http://localhost:5173`.

## Build para deploy

```bash
npm run build
```

A pasta `dist/` contém os arquivos estáticos. Você pode fazer deploy em:

- **Vercel**: conectar o repositório à pasta `frontend` e definir Root Directory = `frontend`; configurar as variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- **Netlify**: Build command = `npm run build`, Publish directory = `dist`, base = `frontend`; adicionar env vars.
- **Outros**: servir o conteúdo de `dist/` como site estático (SPA). Configure redirects para `index.html` em todas as rotas se o host exigir.

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase (ex: `https://xxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima (public) do Supabase |

Essas variáveis são injetadas em tempo de build. No painel do seu provedor de deploy, defina-as com os mesmos valores do `.env` local.
