# 5. Plano de testes e laudo de qualidade

## 5.1 Estratégia
| Nível | Ferramenta | O que cobre |
|---|---|---|
| Unidade | `node --test` (`tests/model.test.js`) | Validadores e regras de negócio RN01–RN03, datas e atraso |
| Integração | `node --test` (`tests/controller.test.js`) | Controller + repositório: CRUD, fluxo de empréstimo, integridade, tradução de erros do PostgreSQL |
| Sistema (interface) | Playwright (roteiro automatizado) + testes manuais com 5 colegas | Fluxos completos na tela, mensagens, responsividade |

Execução: `npm test` → **29 testes, 29 aprovados**.

## 5.2 Casos de teste de aceitação (manuais)
| ID | Passos | Resultado esperado | Req. |
|---|---|---|---|
| CT01 | Livros → Novo livro → salvar vazio | Mensagens "Informe o título" e "Informe o autor" junto aos campos | RF01 |
| CT02 | Cadastrar livro com ISBN já existente | Erro no campo ISBN; livro não é criado | RN05 |
| CT03 | Buscar "casmurro" | Só o livro correspondente aparece | RF01 |
| CT04 | Membros → cadastrar com e-mail já usado | Erro no campo e-mail | RN05 |
| CT05 | Empréstimos → Registrar sem escolher livro | "Selecione um livro." no campo | RF03 |
| CT06 | Emprestar livro disponível | Aviso com data prevista (hoje + 14 dias) | RF03 |
| CT07 | Tentar emprestar 4º livro ao mesmo membro | Bloqueio: limite de 3 | RN02 |
| CT08 | Devolver e clicar em Desfazer | Empréstimo volta a "em aberto" | RF04 |
| CT09 | Excluir livro que já foi emprestado | Bloqueio com mensagem sobre histórico | RN04 |
| CT10 | Recarregar a página | Dados continuam | RNF05 |
| CT11 | Abrir em celular (390 px) | Sem rolagem horizontal da página; botões clicáveis | RNF03 |

## 5.3 Laudo de qualidade – verificação interna (automática)
Executada pelo desenvolvedor antes do teste com colegas. **Não substitui** o teste com 5 pessoas.

| # | Achado | Evidência | Correção | Status |
|---|---|---|---|---|
| 1 | Avisos (toasts) se acumulavam na tela, chegando a 9 empilhados e cobrindo a coluna "Situação" e os botões da tabela | `img/tela-emprestimos.png` (antes) | Limite de 3 avisos visíveis | Corrigido |
| 2 | Erro de campo aparecia duas vezes: como aviso e junto do campo | Roteiro de teste, CT01/CT02/CT04 | Erros de campo só aparecem junto do campo | Corrigido |
| 3 | `aria-invalid="true"` permanecia no campo depois de corrigido (leitores de tela continuavam anunciando erro) | Revisão de código (`view/dom.js`) | Atributo removido ao revalidar | Corrigido |
| 4 | Após a primeira rodada, `npm test` falhava ao receber a pasta `tests/` como argumento (Node 22) | Saída do terminal | Script alterado para `tests/*.test.js` | Corrigido |

**Limitações conhecidas (não corrigidas, registradas):**
- Sem autenticação (RNF06).
- O `db/schema.sql` foi escrito para PostgreSQL mas **ainda não foi executado em um servidor Supabase real**; o repositório Supabase foi testado só com `fetch` simulado. Valide no passo 3 do guia.
- Modo demo guarda dados no navegador de cada usuário (não compartilha entre colegas). Para os testes com colegas, use o modo Supabase.

## 5.4 Testes com colegas (a preencher por você)
Use `docs/formulario-teste-colegas.md`.
