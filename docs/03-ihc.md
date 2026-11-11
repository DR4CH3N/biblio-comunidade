# 3. Interface e IHC

## 3.1 Telas
| Tela | Função | Rota |
|---|---|---|
| Painel | Indicadores e lista de atrasos | `#/painel` |
| Livros | Lista, busca, criar, editar, excluir | `#/livros` |
| Membros | Lista, criar, editar, excluir | `#/membros` |
| Empréstimos | Registrar saída, devolver, desfazer, filtrar (em aberto / atrasados / todos) | `#/emprestimos` |

## 3.2 Heurísticas de Nielsen aplicadas
| Heurística | Onde aparece |
|---|---|
| Visibilidade do estado do sistema | Avisos (toast) após cada ação; selo "Modo demo / PostgreSQL"; tags de situação (Disponível, Emprestado, Atrasado) |
| Correspondência com o mundo real | Vocabulário do domínio (livro, empréstimo, devolver) e datas em dd/mm/aaaa |
| Controle e liberdade do usuário | Cancelar em todos os formulários; "Desfazer" depois de devolver |
| Consistência e padrões | Mesmo padrão de lista + botão "Novo" + modal em todas as telas |
| Prevenção de erros | Lista de empréstimo só mostra livros disponíveis; confirmação antes de excluir; regras RN01-RN03 antes de gravar |
| Reconhecimento em vez de memorização | Seletores de livro e membro; busca instantânea |
| Ajuda a reconhecer e corrigir erros | Mensagem junto ao campo, dizendo o que fazer (ex.: "ISBN deve ter 10 ou 13 dígitos.") |
| Design minimalista | Quatro telas, ação principal destacada em azul |

## 3.3 Acessibilidade (WCAG, resumo)
- Todos os campos com `<label>` associado; erros com `role="alert"`.
- Foco visível (contorno de 3 px) e uso completo por teclado; `<dialog>` nativo devolve o foco ao fechar.
- Botões de editar/excluir com `aria-label` que cita o item.
- Estado nunca só por cor: toda tag tem texto.
- Alvos de toque de pelo menos 40 px.
