import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LocalRepository } from '../src/js/model/repository-local.js';
import { SupabaseRepository } from '../src/js/model/repository-supabase.js';
import { BiblioController } from '../src/js/controller/biblio-controller.js';
import { RepoError } from '../src/js/model/errors.js';

const memStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
async function novo(hoje = '2026-06-01') {
  const ctl = new BiblioController(new LocalRepository(memStorage()), () => hoje);
  await ctl.carregar();
  return ctl;
}
const livroOk = (n = 1) => ({ titulo: `Livro ${n}`, autor: 'Autor', isbn: '', categoria: '', ano: '' });
const membroOk = (n = 1) => ({ nome: `Pessoa ${n}`, email: `p${n}@x.com`, telefone: '' });

test('CRUD de livro: criar, editar, excluir', async () => {
  const ctl = await novo();
  assert.equal((await ctl.salvarLivro(livroOk())).ok, true);
  assert.equal(ctl.dados.livros.length, 1);
  const id = ctl.dados.livros[0].id;
  assert.equal((await ctl.salvarLivro({ ...livroOk(), titulo: 'Editado' }, id)).ok, true);
  assert.equal(ctl.dados.livros[0].titulo, 'Editado');
  assert.equal((await ctl.excluirLivro(id)).ok, true);
  assert.equal(ctl.dados.livros.length, 0);
});

test('livro inválido não chega ao repositório e devolve erros por campo', async () => {
  const ctl = await novo();
  const r = await ctl.salvarLivro({ titulo: '', autor: '' });
  assert.equal(r.ok, false);
  assert.ok(r.erros.titulo);
  assert.equal(ctl.dados.livros.length, 0);
});

test('ISBN duplicado é recusado com erro no campo isbn', async () => {
  const ctl = await novo();
  await ctl.salvarLivro({ ...livroOk(1), isbn: '9788535911664' });
  const r = await ctl.salvarLivro({ ...livroOk(2), isbn: '978-85-359-1166-4' });
  assert.equal(r.ok, false);
  assert.ok(r.erros.isbn);
});

test('e-mail duplicado (sem diferenciar maiúsculas) é recusado', async () => {
  const ctl = await novo();
  await ctl.salvarMembro(membroOk(1));
  const r = await ctl.salvarMembro({ ...membroOk(2), email: 'P1@X.com' });
  assert.equal(r.ok, false);
  assert.ok(r.erros.email);
});

test('fluxo completo: emprestar, bloquear duplicidade, devolver, desfazer', async () => {
  const ctl = await novo();
  await ctl.salvarLivro(livroOk()); await ctl.salvarMembro(membroOk(1)); await ctl.salvarMembro(membroOk(2));
  const [l] = ctl.dados.livros; const [m1, m2] = ctl.dados.membros;

  const a = await ctl.emprestar(l.id, m1.id);
  assert.equal(a.ok, true);
  assert.match(a.mensagem, /15\/06\/2026/);
  assert.equal(ctl.dados.emprestimos[0].data_prevista, '2026-06-15');

  const b = await ctl.emprestar(l.id, m2.id);
  assert.equal(b.ok, false);
  assert.match(b.mensagem, /já está emprestado/);

  const d = await ctl.devolver(ctl.dados.emprestimos[0].id);
  assert.equal(d.ok, true);
  assert.equal(ctl.resumo().emprestados, 0);
  assert.equal((await ctl.devolver(ctl.dados.emprestimos[0].id)).ok, false); // já devolvido

  await ctl.desfazerDevolucao(ctl.dados.emprestimos[0].id);
  assert.equal(ctl.resumo().emprestados, 1);
});

test('integridade referencial: não exclui livro/membro com histórico', async () => {
  const ctl = await novo();
  await ctl.salvarLivro(livroOk()); await ctl.salvarMembro(membroOk());
  await ctl.emprestar(ctl.dados.livros[0].id, ctl.dados.membros[0].id);
  const r1 = await ctl.excluirLivro(ctl.dados.livros[0].id);
  const r2 = await ctl.excluirMembro(ctl.dados.membros[0].id);
  assert.equal(r1.ok, false); assert.match(r1.mensagem, /histórico/);
  assert.equal(r2.ok, false);
  assert.equal(ctl.dados.livros.length, 1);
});

test('limite de 3 empréstimos abertos aplicado pelo controller', async () => {
  const ctl = await novo();
  for (let i = 1; i <= 4; i++) await ctl.salvarLivro(livroOk(i));
  await ctl.salvarMembro(membroOk());
  const m = ctl.dados.membros[0];
  for (let i = 0; i < 3; i++) assert.equal((await ctl.emprestar(ctl.dados.livros[i].id, m.id)).ok, true);
  const r = await ctl.emprestar(ctl.dados.livros[3].id, m.id);
  assert.equal(r.ok, false);
  assert.match(r.mensagem, /limite/);
});

test('resumo lista atrasados quando o relógio avança', async () => {
  const dia = { v: '2026-06-01' };
  const ctl = new BiblioController(new LocalRepository(memStorage()), () => dia.v);
  await ctl.carregar();
  await ctl.salvarLivro(livroOk()); await ctl.salvarMembro(membroOk());
  await ctl.emprestar(ctl.dados.livros[0].id, ctl.dados.membros[0].id);
  assert.equal(ctl.resumo().atrasados.length, 0);
  dia.v = '2026-06-20';
  assert.equal(ctl.resumo().atrasados.length, 1);
});

test('LocalRepository impede dois empréstimos abertos do mesmo livro (UNIQUE parcial)', async () => {
  const repo = new LocalRepository(memStorage());
  const l = await repo.criar('livros', { titulo: 'a', autor: 'b' });
  const m = await repo.criar('membros', { nome: 'Ana', email: 'a@a.com' });
  const emp = { livro_id: l.id, membro_id: m.id, data_emprestimo: '2026-06-01', data_prevista: '2026-06-15', data_devolucao: null };
  await repo.criar('emprestimos', emp);
  await assert.rejects(repo.criar('emprestimos', emp), (e) => e instanceof RepoError && e.codigo === 'UNICO');
});

test('persistência: novo repositório lê o que o anterior gravou', async () => {
  const st = memStorage();
  await new LocalRepository(st).criar('livros', { titulo: 'a', autor: 'b' });
  assert.equal((await new LocalRepository(st).listar('livros')).length, 1);
});

// ---------- SupabaseRepository com fetch simulado ----------
const resp = (status, corpo) => ({ ok: status < 300, status, text: async () => (corpo ? JSON.stringify(corpo) : ''), json: async () => corpo });

test('Supabase: monta URL, cabeçalhos e corpo corretos', async () => {
  const chamadas = [];
  const repo = new SupabaseRepository({ url: 'https://x.supabase.co/', anonKey: 'K' }, async (u, o) => { chamadas.push([u, o]); return resp(201, [{ id: 7, titulo: 'a' }]); });
  const r = await repo.criar('livros', { titulo: 'a' });
  assert.equal(r.id, 7);
  assert.equal(chamadas[0][0], 'https://x.supabase.co/rest/v1/livros');
  assert.equal(chamadas[0][1].headers.apikey, 'K');
  assert.equal(chamadas[0][1].headers.Prefer, 'return=representation');
});

test('Supabase: traduz SQLSTATE 23505 e 23503 e falha de rede', async () => {
  const mk = (fn) => new SupabaseRepository({ url: 'https://x.co', anonKey: 'K' }, fn);
  await assert.rejects(mk(async () => resp(409, { code: '23505', message: 'dup' })).criar('livros', {}), (e) => e.codigo === 'UNICO');
  await assert.rejects(mk(async () => resp(409, { code: '23503', message: 'fk' })).remover('livros', 1), (e) => e.codigo === 'VINCULO');
  await assert.rejects(mk(async () => { throw new TypeError('offline'); }).listar('livros'), (e) => e.codigo === 'REDE');
});

test('Supabase: ISBN e e-mail duplicados viram erro no campo, como no modo demo', async () => {
  const dup = (indice, chave) => async () => resp(409, {
    code: '23505', message: `duplicate key value violates unique constraint "${indice}"`, details: `Key (${chave})=(x) already exists.`,
  });
  const ctlIsbn = new BiblioController(new SupabaseRepository({ url: 'https://x.co', anonKey: 'K' }, dup('ux_livros_isbn', 'isbn')));
  const r1 = await ctlIsbn.salvarLivro({ ...livroOk(), isbn: '9788535911664' });
  assert.equal(r1.erros?.isbn, 'Já existe um livro com este ISBN.');
  const ctlEmail = new BiblioController(new SupabaseRepository({ url: 'https://x.co', anonKey: 'K' }, dup('ux_membros_email', 'lower(email::text)')));
  const r2 = await ctlEmail.salvarMembro(membroOk());
  assert.equal(r2.erros?.email, 'Já existe um membro com este e-mail.');
});

test('Supabase: excluir livro ou membro com histórico explica o motivo (RN04)', async () => {
  const fk = (tabela) => async () => resp(409, {
    code: '23503', message: `update or delete on table "${tabela}" violates foreign key constraint "emprestimos_${tabela.slice(0, -1)}_id_fkey" on table "emprestimos"`,
  });
  const ctlL = new BiblioController(new SupabaseRepository({ url: 'https://x.co', anonKey: 'K' }, fk('livros')));
  assert.equal((await ctlL.excluirLivro(1)).mensagem, 'Este livro possui histórico de empréstimos e não pode ser excluído.');
  const ctlM = new BiblioController(new SupabaseRepository({ url: 'https://x.co', anonKey: 'K' }, fk('membros')));
  assert.equal((await ctlM.excluirMembro(1)).mensagem, 'Este membro possui histórico de empréstimos e não pode ser excluído.');
});

test('Supabase: atualizar registro inexistente (resposta vazia) vira NAO_ENCONTRADO', async () => {
  const repo = new SupabaseRepository({ url: 'https://x.co', anonKey: 'K' }, async () => resp(200, []));
  await assert.rejects(repo.atualizar('livros', 99, {}), (e) => e.codigo === 'NAO_ENCONTRADO');
});

test('desfazer devolução não cria dois empréstimos abertos do mesmo livro', async () => {
  const ctl = await novo();
  await ctl.salvarLivro(livroOk()); await ctl.salvarMembro(membroOk(1)); await ctl.salvarMembro(membroOk(2));
  const [l] = ctl.dados.livros; const [m1, m2] = ctl.dados.membros;
  await ctl.emprestar(l.id, m1.id);
  const primeiro = ctl.dados.emprestimos[0].id;
  await ctl.devolver(primeiro);
  await ctl.emprestar(l.id, m2.id);
  const r = await ctl.desfazerDevolucao(primeiro);
  assert.equal(r.ok, false);
  assert.match(r.mensagem, /já foi emprestado de novo/);
  assert.equal(ctl.resumo().emprestados, 1);
});
