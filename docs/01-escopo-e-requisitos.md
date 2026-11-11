# 1. Escopo e requisitos – BiblioComunidade

> Base de documentação (Situação 1). Adapte ao texto e aos diagramas já entregues no PIT I.

## 1.1 Problema e objetivo
Bibliotecas comunitárias (de bairro, escola, igreja) costumam controlar empréstimos em caderno ou planilha. Isso gera livros "perdidos", cobrança manual de atrasos e nenhuma visão do acervo.
**Objetivo:** oferecer um sistema web simples para cadastrar livros e membros, registrar empréstimos/devoluções e destacar atrasos.

## 1.2 Escolha low-code e justificativa
| Camada | Solução | Por que facilita a manutenção |
|---|---|---|
| Banco + API | Supabase (PostgreSQL + PostgREST) | A API REST é gerada automaticamente a partir das tabelas; não há back-end próprio para atualizar ou hospedar |
| Front-end | HTML/CSS/JS puro (sem framework nem build) | Nenhuma dependência para atualizar; qualquer pessoa edita um arquivo e publica |
| Hospedagem | GitHub Pages (via GitHub Actions) | Gratuita; cada `git push` roda os testes e publica |
| Testes | `node --test` (nativo do Node) | Zero dependências |

## 1.3 Escopo
**Dentro:** CRUD de livros e membros; empréstimo, devolução e desfazer devolução; painel com indicadores e atrasos; busca de livros.
**Fora (versão atual):** login/perfis de acesso, multas, reservas, múltiplos exemplares por título, envio automático de e-mails.

## 1.4 Requisitos funcionais
| ID | Requisito | Prioridade |
|---|---|---|
| RF01 | Cadastrar, editar, listar, buscar e excluir livros | Alta |
| RF02 | Cadastrar, editar, listar e excluir membros | Alta |
| RF03 | Registrar empréstimo (prazo padrão de 14 dias) | Alta |
| RF04 | Registrar devolução e permitir desfazê-la | Alta |
| RF05 | Identificar empréstimos em atraso e exibir dias de atraso | Alta |
| RF06 | Painel com total de livros, disponíveis, emprestados, atrasados e membros | Média |

## 1.5 Regras de negócio
- **RN01** Um livro só pode ter um empréstimo em aberto.
- **RN02** Cada membro pode ter no máximo 3 empréstimos em aberto.
- **RN03** Membro com devolução em atraso não pode fazer novo empréstimo.
- **RN04** Livro ou membro com histórico de empréstimos não pode ser excluído (preserva o histórico).
- **RN05** ISBN (quando informado) e e-mail são únicos.

## 1.6 Requisitos não funcionais
| ID | Requisito | Como é atendido |
|---|---|---|
| RNF01 | Usabilidade | Mensagens de erro junto ao campo, confirmação antes de excluir, desfazer devolução |
| RNF02 | Acessibilidade | Rótulos em todos os campos, foco visível, navegação por teclado, `aria-live` nos avisos, link "Ir para o conteúdo" |
| RNF03 | Responsividade | CSS fluido, tabelas com rolagem horizontal em telas pequenas |
| RNF04 | Manutenibilidade | MVC, sem build, testes automatizados |
| RNF05 | Integridade | Restrições no banco (PK, FK, UNIQUE, CHECK) além das validações na tela |
| RNF06 | Segurança (limitação) | Sem login: qualquer pessoa com o link altera os dados. Aceito no escopo; evolução: Supabase Auth |

## 1.7 Estrutura do repositório
```
biblio-comunidade/
├── .github/     workflow que testa e publica no GitHub Pages
├── docs/        documentação (esta pasta)
├── db/          schema.sql (projeto físico) e seed.sql
├── src/         aplicação (index.html, css/, js/ em MVC)
├── tests/       testes automatizados
└── README.md
```
