-- Cole e execute no SQL Editor do Supabase (Dashboard → SQL Editor)
-- Cria a tabela contexto_operacao e políticas RLS

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
