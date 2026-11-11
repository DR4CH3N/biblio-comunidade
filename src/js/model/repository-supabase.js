// MODEL – repositório PostgreSQL via Supabase (PostgREST). Sem servidor próprio: BaaS = low-code.
// Mesma interface do LocalRepository: listar / criar / atualizar / remover.
import { RepoError } from './errors.js';

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
    if (corpo.code === '23505') throw new RepoError('UNICO', 'Registro duplicado.', corpo.details ?? corpo.message);
    if (corpo.code === '23503') throw new RepoError('VINCULO', 'Registro vinculado a outros dados.', corpo.details ?? corpo.message);
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
    await this.#req(`${tabela}?id=eq.${id}`, { method: 'DELETE' });
  }
}
