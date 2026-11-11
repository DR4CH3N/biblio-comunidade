// MODEL – repositório em memória/localStorage (MODO DEMO, sem servidor).
// Reproduz as restrições do PostgreSQL (UNIQUE e FOREIGN KEY ... RESTRICT) para que
// o comportamento seja idêntico ao do repositório Supabase.
import { RepoError } from './errors.js';
import { normalizarIsbn } from './validators.js';

const CHAVE = 'biblio:dados:v1';
const TABELAS = ['livros', 'membros', 'emprestimos'];

export class LocalRepository {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.db = this.#ler();
  }

  #ler() {
    try {
      const bruto = this.storage?.getItem(CHAVE);
      if (bruto) return JSON.parse(bruto);
    } catch { /* storage indisponível ou corrompido: começa vazio */ }
    return { livros: [], membros: [], emprestimos: [], seq: { livros: 0, membros: 0, emprestimos: 0 } };
  }

  #gravar() {
    try { this.storage?.setItem(CHAVE, JSON.stringify(this.db)); } catch { /* modo privado */ }
  }

  #checar(tabela) {
    if (!TABELAS.includes(tabela)) throw new RepoError('DESCONHECIDO', `Tabela inválida: ${tabela}`);
  }

  #validarUnicos(tabela, obj, idAtual = null) {
    const outros = this.db[tabela].filter((r) => r.id !== idAtual);
    if (tabela === 'livros' && obj.isbn) {
      const isbn = normalizarIsbn(obj.isbn);
      if (outros.some((r) => r.isbn && normalizarIsbn(r.isbn) === isbn)) {
        throw new RepoError('UNICO', 'Já existe um livro com este ISBN.', 'isbn');
      }
    }
    if (tabela === 'membros' && outros.some((r) => r.email.toLowerCase() === obj.email.toLowerCase())) {
      throw new RepoError('UNICO', 'Já existe um membro com este e-mail.', 'email');
    }
    if (tabela === 'emprestimos' && !obj.data_devolucao
        && outros.some((r) => r.livro_id === obj.livro_id && !r.data_devolucao)) {
      throw new RepoError('UNICO', 'Este livro já está emprestado.', 'livro_id');
    }
  }

  async listar(tabela) {
    this.#checar(tabela);
    return structuredClone(this.db[tabela]);
  }

  async criar(tabela, obj) {
    this.#checar(tabela);
    if (tabela === 'emprestimos') {
      if (!this.db.livros.some((l) => l.id === obj.livro_id) || !this.db.membros.some((m) => m.id === obj.membro_id)) {
        throw new RepoError('VINCULO', 'Livro ou membro inexistente.');
      }
    }
    this.#validarUnicos(tabela, obj);
    const id = ++this.db.seq[tabela];
    const registro = { ...obj, id, criado_em: new Date().toISOString() };
    this.db[tabela].push(registro);
    this.#gravar();
    return structuredClone(registro);
  }

  async atualizar(tabela, id, campos) {
    this.#checar(tabela);
    const i = this.db[tabela].findIndex((r) => r.id === id);
    if (i < 0) throw new RepoError('NAO_ENCONTRADO', 'Registro não encontrado.');
    const novo = { ...this.db[tabela][i], ...campos, id };
    this.#validarUnicos(tabela, novo, id);
    this.db[tabela][i] = novo;
    this.#gravar();
    return structuredClone(novo);
  }

  async remover(tabela, id) {
    this.#checar(tabela);
    if (tabela === 'livros' && this.db.emprestimos.some((e) => e.livro_id === id)) {
      throw new RepoError('VINCULO', 'Este livro possui histórico de empréstimos e não pode ser excluído.');
    }
    if (tabela === 'membros' && this.db.emprestimos.some((e) => e.membro_id === id)) {
      throw new RepoError('VINCULO', 'Este membro possui histórico de empréstimos e não pode ser excluído.');
    }
    const antes = this.db[tabela].length;
    this.db[tabela] = this.db[tabela].filter((r) => r.id !== id);
    if (this.db[tabela].length === antes) throw new RepoError('NAO_ENCONTRADO', 'Registro não encontrado.');
    this.#gravar();
  }

  /** Apaga tudo e (opcionalmente) carrega dados de exemplo. */
  async reiniciar(exemplo = null) {
    this.db = { livros: [], membros: [], emprestimos: [], seq: { livros: 0, membros: 0, emprestimos: 0 } };
    if (exemplo) {
      for (const l of exemplo.livros) await this.criar('livros', l);
      for (const m of exemplo.membros) await this.criar('membros', m);
    }
    this.#gravar();
  }
}
