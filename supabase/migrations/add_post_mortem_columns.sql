-- Colunas para post mortem ao concluir chamado
alter table public.chamados
  add column if not exists post_mortem text,
  add column if not exists post_mortem_autor text,
  add column if not exists post_mortem_em timestamptz;
