// CONTROLLER – orquestra validação (model), regras (model) e persistência (repositório).
// Não conhece o DOM. A view chama estes métodos e exibe o resultado { ok, mensagem, erros }.
import { validarLivro, validarMembro, normalizarIsbn } from '../model/validators.js';
import { podeEmprestar, podeDesfazerDevolucao, calcularDataPrevista, hojeISO, estaAberto, estaAtrasado } from '../model/rules.js';
import { RepoError } from '../model/errors.js';

const MSG_REPO = {
  UNICO: (e) => e.message,
  VINCULO: (e) => e.message,
  REDE: (e) => e.message,
  INVALIDO: (e) => e.message,
  NAO_ENCONTRADO: () => 'Registro não encontrado. Atualize a página e tente novamente.',
  DESCONHECIDO: (e) => `Erro inesperado: ${e.message}`,
};

export class BiblioController {
  constructor(repo, relogio = () => hojeISO()) {
    this.repo = repo;
    this.hoje = relogio;
    this.dados = { livros: [], membros: [], emprestimos: [] };
  }

  async carregar() {
    const [livros, membros, emprestimos] = await Promise.all([
      this.repo.listar('livros'), this.repo.listar('membros'), this.repo.listar('emprestimos'),
    ]);
    this.dados = { livros, membros, emprestimos };
    return this.dados;
  }

  // Executa uma ação de escrita, traduz RepoError em mensagem amigável e recarrega os dados.
  async #executar(acao, sucesso) {
    try {
      await acao();
      await this.carregar();
      return { ok: true, mensagem: sucesso };
    } catch (e) {
      if (e instanceof RepoError) {
        const campo = e.codigo === 'UNICO' && ['isbn', 'email'].includes(e.detalhe) ? { [e.detalhe]: e.message } : undefined;
        return { ok: false, mensagem: (MSG_REPO[e.codigo] ?? MSG_REPO.DESCONHECIDO)(e), erros: campo };
      }
      return { ok: false, mensagem: `Erro inesperado: ${e.message}` };
    }
  }

  // ---------- Livros ----------
  salvarLivro(form, id = null) {
    const v = validarLivro(form);
    if (!v.ok) return Promise.resolve({ ok: false, mensagem: 'Corrija os campos destacados.', erros: v.erros });
    const reg = {
      titulo: form.titulo.trim(), autor: form.autor.trim(),
      isbn: normalizarIsbn(form.isbn) || null,
      categoria: form.categoria?.trim() || null,
      ano: form.ano === '' || form.ano == null ? null : Number(form.ano),
    };
    return this.#executar(
      () => (id ? this.repo.atualizar('livros', id, reg) : this.repo.criar('livros', reg)),
      id ? 'Livro atualizado.' : 'Livro cadastrado.',
    );
  }

  excluirLivro(id) {
    return this.#executar(() => this.repo.remover('livros', id), 'Livro excluído.');
  }

  // ---------- Membros ----------
  salvarMembro(form, id = null) {
    const v = validarMembro(form);
    if (!v.ok) return Promise.resolve({ ok: false, mensagem: 'Corrija os campos destacados.', erros: v.erros });
    const reg = {
      nome: form.nome.trim(), email: form.email.trim().toLowerCase(),
      telefone: form.telefone?.replace(/\D/g, '') || null,
    };
    return this.#executar(
      () => (id ? this.repo.atualizar('membros', id, reg) : this.repo.criar('membros', reg)),
      id ? 'Membro atualizado.' : 'Membro cadastrado.',
    );
  }

  excluirMembro(id) {
    return this.#executar(() => this.repo.remover('membros', id), 'Membro excluído.');
  }

  // ---------- Empréstimos ----------
  emprestar(livroId, membroId) {
    const { livros, membros, emprestimos } = this.dados;
    const livro = livros.find((l) => l.id === Number(livroId));
    const membro = membros.find((m) => m.id === Number(membroId));
    const regra = podeEmprestar({ livro, membro, emprestimos }, this.hoje());
    if (!regra.ok) return Promise.resolve({ ok: false, mensagem: regra.motivo });
    const data = this.hoje();
    return this.#executar(
      () => this.repo.criar('emprestimos', {
        livro_id: livro.id, membro_id: membro.id,
        data_emprestimo: data, data_prevista: calcularDataPrevista(data), data_devolucao: null,
      }),
      `Empréstimo registrado. Devolução prevista para ${calcularDataPrevista(data).split('-').reverse().join('/')}.`,
    );
  }

  devolver(emprestimoId) {
    const e = this.dados.emprestimos.find((x) => x.id === emprestimoId);
    if (!e) return Promise.resolve({ ok: false, mensagem: 'Empréstimo não encontrado.' });
    if (!estaAberto(e)) return Promise.resolve({ ok: false, mensagem: 'Este livro já foi devolvido.' });
    return this.#executar(
      () => this.repo.atualizar('emprestimos', e.id, { data_devolucao: this.hoje() }),
      'Devolução registrada.',
    );
  }

  /** Desfazer devolução (ação reversível – princípio de IHC "recuperável"). */
  desfazerDevolucao(emprestimoId) {
    const { livros, membros, emprestimos } = this.dados;
    const emprestimo = emprestimos.find((x) => x.id === emprestimoId);
    const regra = podeDesfazerDevolucao({
      emprestimo, emprestimos,
      livro: livros.find((l) => l.id === emprestimo?.livro_id),
      membro: membros.find((m) => m.id === emprestimo?.membro_id),
    });
    if (!regra.ok) return Promise.resolve({ ok: false, mensagem: regra.motivo });
    return this.#executar(
      () => this.repo.atualizar('emprestimos', emprestimoId, { data_devolucao: null }),
      'Devolução desfeita.',
    );
  }

  // ---------- Consultas para o painel ----------
  resumo() {
    const { livros, membros, emprestimos } = this.dados;
    const hoje = this.hoje();
    const abertos = emprestimos.filter(estaAberto);
    return {
      totalLivros: livros.length,
      totalMembros: membros.length,
      emprestados: abertos.length,
      disponiveis: livros.length - abertos.length,
      atrasados: abertos.filter((e) => estaAtrasado(e, hoje)),
    };
  }
}
