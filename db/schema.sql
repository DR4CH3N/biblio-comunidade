-- BiblioComunidade – projeto físico (PostgreSQL / Supabase)
-- Execute no Supabase: SQL Editor > New query > cole tudo > Run.

create table if not exists membros (
  id         bigint generated always as identity primary key,
  nome       varchar(120) not null check (char_length(trim(nome)) >= 3),
  email      varchar(150) not null,
  telefone   varchar(11),
  criado_em  timestamptz  not null default now()
);
-- e-mail único sem diferenciar maiúsculas/minúsculas
create unique index if not exists ux_membros_email on membros (lower(email));

create table if not exists livros (
  id         bigint generated always as identity primary key,
  titulo     varchar(150) not null check (char_length(trim(titulo)) > 0),
  autor      varchar(120) not null check (char_length(trim(autor)) > 0),
  isbn       varchar(13)  check (isbn ~ '^([0-9]{10}|[0-9]{13})$'),
  categoria  varchar(60),
  ano        smallint     check (ano between 1400 and 2100),
  criado_em  timestamptz  not null default now()
);
-- ISBN único quando informado (vários livros podem ficar sem ISBN)
create unique index if not exists ux_livros_isbn on livros (isbn) where isbn is not null;

create table if not exists emprestimos (
  id              bigint generated always as identity primary key,
  livro_id        bigint not null references livros(id)  on delete restrict,
  membro_id       bigint not null references membros(id) on delete restrict,
  data_emprestimo date   not null default current_date,
  data_prevista   date   not null,
  data_devolucao  date,
  criado_em       timestamptz not null default now(),
  check (data_prevista >= data_emprestimo),
  check (data_devolucao is null or data_devolucao >= data_emprestimo)
);
-- RN01: um livro só pode ter UM empréstimo em aberto
create unique index if not exists ux_emprestimo_livro_aberto on emprestimos (livro_id) where data_devolucao is null;
create index if not exists ix_emprestimos_membro on emprestimos (membro_id);

-- Visão de apoio: empréstimos em atraso
create or replace view vw_emprestimos_atrasados as
select e.id, l.titulo, m.nome as membro, e.data_prevista,
       (current_date - e.data_prevista) as dias_atraso
from emprestimos e
join livros l  on l.id = e.livro_id
join membros m on m.id = e.membro_id
where e.data_devolucao is null and e.data_prevista < current_date;

-- Acesso pelo front-end (chave anon). ATENÇÃO: sem login, qualquer pessoa com o link altera os dados.
-- Limitação aceita no escopo da disciplina; em produção, use Supabase Auth e políticas por usuário.
alter table membros     enable row level security;
alter table livros      enable row level security;
alter table emprestimos enable row level security;
create policy "acesso_anon_membros"     on membros     for all to anon using (true) with check (true);
create policy "acesso_anon_livros"      on livros      for all to anon using (true) with check (true);
create policy "acesso_anon_emprestimos" on emprestimos for all to anon using (true) with check (true);
