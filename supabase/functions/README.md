# Edge Functions

## triar-chamado

Chama a OpenAI no backend. O front nunca envia a API key; ela fica só no Supabase.

### Secrets

No **Dashboard** do projeto: **Edge Functions** → **Secrets**.

- **OPENAI_API_KEY** — chave da OpenAI (ex.: `sk-proj-...`)
- **INTERNAL_CALL_SECRET** — (opcional) string secreta para chamadas internas; quando definido, a função aceita `X-Internal-Key: <valor>` em vez de JWT (usado pela função `slack-chamado`)

### Deploy

Na raiz do projeto (onde está o `supabase`):

```bash
npx supabase login
npx supabase link --project-ref zmuojqhvdyjcbbtdqbhg
npx supabase functions deploy triar-chamado
```

O front já envia `Authorization: Bearer <session.access_token>`. Por padrão o Supabase valida o JWT; só usuários logados conseguem chamar a função.

Para definir o secret via CLI:

```bash
npx supabase secrets set OPENAI_API_KEY=sk-proj-sua-chave-aqui
```

### URL

`https://zmuojqhvdyjcbbtdqbhg.supabase.co/functions/v1/triar-chamado`

O front já usa `SUPABASE_URL` + `/functions/v1/triar-chamado`.

---

## slack-chamado

Integração Slack: `/chamado`, modal, triagem e botões Resolver N2 / Escalar N3. Ver **supabase/functions/slack-chamado/README.md** para secrets, deploy e URL.
