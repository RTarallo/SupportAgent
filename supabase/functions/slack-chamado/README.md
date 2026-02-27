# Edge Function: slack-chamado

Integração com Slack: slash command `/chamado`, modal de novo chamado, triagem via Edge Function existente e botões Resolver N2 / Escalar N3 na DM.

## Secrets no Supabase

No **Dashboard** → **Edge Functions** → **Secrets** (ou **Project Settings** → **Edge Functions**), configure:

| Nome | Descrição |
|------|-----------|
| `SLACK_BOT_TOKEN` | Token do Bot (começa com `xoxb-`) |
| `SLACK_SIGNING_SECRET` | Signing Secret do app (em **Basic Information** → **App Credentials**) |
| `INTERNAL_CALL_SECRET` | String secreta compartilhada para chamar `triar-chamado` internamente |
| `OPENAI_API_KEY` | (já em `triar-chamado`) |
| `SUPABASE_URL` | (já preenchido pelo Supabase na função) |
| `SUPABASE_SERVICE_ROLE_KEY` | (já preenchido pelo Supabase na função) |

Na função **triar-chamado** também é necessário ter o secret **`INTERNAL_CALL_SECRET`** com o **mesmo valor** usado em `slack-chamado`, para aceitar chamadas internas com header `X-Internal-Key`.

## Deploy

Na raiz do projeto (onde está a pasta `supabase`):

```bash
npx supabase login
npx supabase link --project-ref zmuojqhvdyjcbbtdqbhg
npx supabase functions deploy slack-chamado
```

Para definir os secrets via CLI:

```bash
npx supabase secrets set SLACK_BOT_TOKEN=xoxb-...
npx supabase secrets set SLACK_SIGNING_SECRET=...
npx supabase secrets set INTERNAL_CALL_SECRET=uma-string-secreta-forte
```

## URL da Edge Function

Após o deploy:

```
https://zmuojqhvdyjcbbtdqbhg.supabase.co/functions/v1/slack-chamado
```

Use esta URL no painel do Slack:

- **Slash Commands** → Request URL
- **Interactivity & Shortcuts** → Request URL (se o Slack pedir uma única URL para interatividade)

## Colunas na tabela `chamados`

Execute o SQL em `supabase/migrations/add_slack_columns_chamados.sql` no SQL Editor do Supabase para adicionar:

- `slack_user_id`, `slack_ts`, `slack_channel`, `verdict_final`, `resolvido_em`
