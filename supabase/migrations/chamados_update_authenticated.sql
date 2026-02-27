-- Permite que qualquer usuário autenticado marque chamados como resolvido (verdict_final / resolvido_em).
-- Execute no SQL Editor do Supabase.

drop policy if exists "usuario atualiza seus chamados" on public.chamados;

create policy "usuario atualiza chamados"
on public.chamados for update
using (auth.uid() IS NOT NULL);
