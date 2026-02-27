-- Permite que qualquer usuário autenticado veja todos os chamados (incluindo os criados via Slack, que têm user_id nulo).
-- Execute no SQL Editor do Supabase se o histórico não mostrar os chamados do Slack.

drop policy if exists "usuario ve seus chamados" on public.chamados;

create policy "usuario ve todos chamados"
on public.chamados for select
using (auth.uid() IS NOT NULL);
