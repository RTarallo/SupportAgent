-- Execute no SQL Editor do Supabase. Colunas para integração Slack.

alter table public.chamados
add column if not exists slack_user_id text,
add column if not exists slack_ts text,
add column if not exists slack_channel text,
add column if not exists verdict_final text,
add column if not exists resolvido_em timestamptz;
