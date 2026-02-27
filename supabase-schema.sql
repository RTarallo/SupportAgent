-- Execute no SQL Editor do Supabase (Dashboard → SQL Editor)

create table if not exists chamados (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references auth.users(id),
  ticket_id text not null,
  texto_original text,
  cliente text,
  canal text,
  modulo text,
  tentativas text,
  contexto_operacao text,
  verdict text,
  prioridade text,
  resumo text,
  diagnostico text,
  confianca integer,
  categoria text,
  ambiente text,
  recorrencia text,
  responsabilidade text,
  bandeira_adquirente text,
  codigo_erro text,
  impacto_financeiro text,
  passos jsonb,
  tags jsonb,
  mensagem_n3 text,
  mensagem_slack text
);

-- Adicionar user_id se a tabela já existir sem a coluna
alter table chamados add column if not exists user_id uuid references auth.users(id);

-- Colunas para integração Slack
alter table public.chamados
add column if not exists slack_user_id text,
add column if not exists slack_ts text,
add column if not exists slack_channel text,
add column if not exists verdict_final text,
add column if not exists resolvido_em timestamptz;

-- Post mortem ao concluir
alter table public.chamados
add column if not exists post_mortem text,
add column if not exists post_mortem_autor text,
add column if not exists post_mortem_em timestamptz;

-- Remove policies antigas se existirem
drop policy if exists "Permitir insert anon" on chamados;
drop policy if exists "Permitir select anon" on chamados;
drop policy if exists "anon pode inserir" on chamados;
drop policy if exists "anon pode ler" on chamados;
drop policy if exists "usuario ve seus chamados" on chamados;
drop policy if exists "usuario insere como ele mesmo" on chamados;

-- Ativa RLS
alter table chamados enable row level security;

-- Usuário autenticado vê todos os chamados (inclui os criados pelo Slack, que têm user_id nulo)
create policy "usuario ve todos chamados"
on chamados for select
using (auth.uid() IS NOT NULL);

-- Usuário só insere como ele mesmo
create policy "usuario insere como ele mesmo"
on chamados for insert
with check (auth.uid() = user_id);

-- Tabela de contexto da operação (um registro por usuário)
create table if not exists public.contexto_operacao (
  user_id uuid primary key references auth.users(id) on delete cascade,
  body text,
  updated_at timestamptz default now()
);

alter table public.contexto_operacao enable row level security;

drop policy if exists "usuario ve proprio contexto" on public.contexto_operacao;
drop policy if exists "usuario insere proprio contexto" on public.contexto_operacao;
drop policy if exists "usuario atualiza proprio contexto" on public.contexto_operacao;

create policy "usuario ve proprio contexto"
on public.contexto_operacao for select
using (auth.uid() = user_id);

create policy "usuario insere proprio contexto"
on public.contexto_operacao for insert
with check (auth.uid() = user_id);

create policy "usuario atualiza proprio contexto"
on public.contexto_operacao for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
