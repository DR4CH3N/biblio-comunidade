// MODEL – repositório PostgreSQL via Supabase (PostgREST). Sem servidor próprio: BaaS = low-code.
// Mesma interface do LocalRepository: listar / criar / atualizar / remover.
import { RepoError } from './errors.js';

// Índices únicos do db/schema.sql -> mesma mensagem e campo que o LocalRepository usa.
// O PostgreSQL cita o nome do índice na mensagem: 'duplicate key value violates unique constraint "ux_livros_isbn"'.
const UNICOS = {
  ux_livros_isbn: ['Já existe um livro com este ISBN.', 'isbn'],
  ux_membros_email: ['Já existe um membro com este e-mail.', 'email'],
  ux_emprestimo_livro_aberto: ['Este livro já está emprestado.', 'livro_id'],
};
// Excluir com empréstimos viola a FK (on delete restrict, RN04): mesma mensagem do LocalRepository.
const COM_HISTORICO = {
  livros: 'Este livro possui histórico de empréstimos e não pode ser excluído.',
  membros: 'Este membro possui histórico de empréstimos e não pode ser excluído.',
};

export class SupabaseRepository {
  constructor({ url, anonKey }, fetchFn = globalThis.fetch.bind(globalThis)) {
    this.base = `${url.replace(/\/$/, '')}/rest/v1`;
    this.fetch = fetchFn;
    this.headers = {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    };
  }

  async #req(caminho, opcoes = {}) {
    let resp;
    try {
      resp = await this.fetch(`${this.base}/${caminho}`, { ...opcoes, headers: { ...this.headers, ...opcoes.headers } });
    } catch (e) {
      throw new RepoError('REDE', 'Não foi possível conectar ao servidor. Verifique sua internet.', String(e));
    }
    if (resp.ok) {
      const texto = await resp.text();
      return texto ? JSON.parse(texto) : null;
    }
    let corpo = {};
    try { corpo = await resp.json(); } catch { /* sem corpo */ }
    // Códigos SQLSTATE do PostgreSQL: 23505 = unique_violation, 23503 = foreign_key_violation
    if (corpo.code === '23505') {
      const texto = `${corpo.message ?? ''} ${corpo.details ?? ''}`;
      const [mensagem, campo] = Object.entries(UNICOS).find(([indice]) => texto.includes(indice))?.[1]
        ?? ['Já existe um registro com estes dados.', corpo.details ?? corpo.message];
      throw new RepoError('UNICO', mensagem, campo);
    }
    if (corpo.code === '23503') throw new RepoError('VINCULO', 'Livro ou membro inexistente.', corpo.details ?? corpo.message);
    // 22001 = string_data_right_truncation: rede de segurança caso algum limite do schema escape da validação
    if (corpo.code === '22001') throw new RepoError('INVALIDO', 'Algum campo passou do tamanho permitido. Encurte o texto e tente de novo.', corpo.message);
    if (resp.status === 404) throw new RepoError('NAO_ENCONTRADO', 'Registro não encontrado.');
    throw new RepoError('DESCONHECIDO', corpo.message ?? `Erro ${resp.status} no servidor.`, corpo);
  }

  listar(tabela) {
    return this.#req(`${tabela}?select=*&order=id.asc`);
  }

  async criar(tabela, obj) {
    const r = await this.#req(tabela, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(obj) });
    return r[0];
  }

  async atualizar(tabela, id, campos) {
    const r = await this.#req(`${tabela}?id=eq.${id}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(campos) });
    if (!r?.length) throw new RepoError('NAO_ENCONTRADO', 'Registro não encontrado.');
    return r[0];
  }

  async remover(tabela, id) {
    try {
      await this.#req(`${tabela}?id=eq.${id}`, { method: 'DELETE' });
    } catch (e) {
      if (e.codigo === 'VINCULO' && COM_HISTORICO[tabela]) throw new RepoError('VINCULO', COM_HISTORICO[tabela], e.detalhe);
      throw e;
    }
  }
}
