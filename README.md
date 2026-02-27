# SupportAgent

Triagem de chamados N1 com Supabase e Slack.

## Frontend (React + Vite) — deploy

O frontend para deploy está em **`frontend/`** (React + Vite).

```bash
cd frontend
cp .env.example .env
# Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env
npm install
npm run build
```

A pasta `frontend/dist/` pode ser publicada em Vercel, Netlify ou qualquer host de estáticos. Veja `frontend/README.md` para detalhes.

O `index.html` na raiz continua sendo a versão monolítica (uma única página) para uso local sem build.
