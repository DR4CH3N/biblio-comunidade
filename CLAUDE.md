# Contexto para o Claude Code

Projeto **BiblioComunidade** — atividade PIT II (Engenharia de Software). Responda em português do Brasil.

## O que é
Sistema web para controle de empréstimos de uma biblioteca comunitária: livros, membros e empréstimos.
Abordagem **low-code**: front-end estático, sem framework e sem etapa de build; o back-end é o Supabase
(PostgreSQL + API REST gerada automaticamente pelo PostgREST). A escolha foi feita para facilitar a manutenção.

## Estrutura
```
.github/workflows/pages.yml   testa e publica src/ no GitHub Pages
db/schema.sql                 projeto físico (PostgreSQL); db/seed.sql = dados de exemplo
docs/                         escopo, UML, IHC, banco, plano de testes, roteiro do vídeo
src/js/model/                 validators.js, rules.js, repository-local.js, repository-supabase.js, errors.js
src/js/view/                  telas.js, dom.js
src/js/controller/            biblio-controller.js
src/js/config.js              credenciais do Supabase (vazio = modo demo)
tests/                        testes com node:test
```

## Arquitetura (MVC) — regra ao editar
- **Model**: funções puras de validação e regra de negócio, mais os repositórios. Nunca toca no DOM.
- **View**: desenha a tela e captura eventos. Nunca aplica regra de negócio.
- **Controller**: orquestra. Não conhece o DOM. Devolve sempre `{ ok, mensagem, erros? }`.
- Os dois repositórios (`LocalRepository` e `SupabaseRepository`) têm a **mesma interface**:
  `listar / criar / atualizar / remover`. Ao mudar um, mude o outro.

## Regras de negócio (não altere sem pedir)
- RN01 Um livro só pode ter um empréstimo em aberto.
- RN02 Máximo de 3 empréstimos em aberto por membro.
- RN03 Membro com atraso não pega novo livro.
- RN04 Livro ou membro com histórico não pode ser excluído.
- RN05 ISBN (quando informado) e e-mail são únicos.
- Prazo padrão: 14 dias.
As regras valem **em dois lugares**: no `model/rules.js` e nas restrições do `db/schema.sql`. Mantenha os dois iguais.

## Comandos
- `npm test` — 29 testes, sem dependências externas. Rode sempre antes de commitar.
- `npx serve src` — servidor local. Não abra `index.html` com duplo clique (módulos JS exigem http).

## Convenções
- Código, comentários, mensagens de erro e commits em português.
- Datas sempre `AAAA-MM-DD`, calculadas em UTC (evita bug de fuso).
- Mensagem de erro diz o que fazer: "ISBN deve ter 10 ou 13 dígitos.", não "valor inválido".
- Nada de dependências novas sem necessidade clara; o valor do projeto está em não ter o que manter.

## Limitação conhecida
Não há login. A chave `anon` do Supabase é pública por desenho e as políticas de RLS estão abertas.
Isso está registrado como RNF06 em `docs/01-escopo-e-requisitos.md`. Não "conserte" sem combinar.
