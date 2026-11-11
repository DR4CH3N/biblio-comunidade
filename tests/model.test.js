import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarLivro, validarMembro, normalizarIsbn } from '../src/js/model/validators.js';
import { calcularDataPrevista, somarDias, diasDeAtraso, estaAtrasado, podeEmprestar, hojeISO } from '../src/js/model/rules.js';

// ---------- Validadores ----------
test('RF01 livro válido passa', () => {
  assert.equal(validarLivro({ titulo: 'Dom Casmurro', autor: 'Machado', isbn: '978-85-359-1166-4', ano: '1899' }).ok, true);
});
test('RF01 livro sem título e autor falha com mensagens', () => {
  const r = validarLivro({ titulo: '  ', autor: '' });
  assert.equal(r.ok, false);
  assert.ok(r.erros.titulo && r.erros.autor);
});
test('RF01 ISBN com tamanho errado é rejeitado; vazio é aceito', () => {
  assert.ok(validarLivro({ titulo: 'a', autor: 'b', isbn: '123' }).erros.isbn);
  assert.equal(validarLivro({ titulo: 'a', autor: 'b', isbn: '' }).ok, true);
});
test('RF01 ano fora do intervalo ou não inteiro é rejeitado', () => {
  assert.ok(validarLivro({ titulo: 'a', autor: 'b', ano: '1200' }).erros.ano);
  assert.ok(validarLivro({ titulo: 'a', autor: 'b', ano: '2999' }, 2026).erros.ano);
  assert.ok(validarLivro({ titulo: 'a', autor: 'b', ano: '19.5' }).erros.ano);
});
test('RF01 título maior que 150 caracteres é rejeitado', () => {
  assert.ok(validarLivro({ titulo: 'x'.repeat(151), autor: 'b' }).erros.titulo);
});
test('normalizarIsbn remove hífens e espaços', () => {
  assert.equal(normalizarIsbn('978-85 359-1166-4'), '9788535911664');
});
test('RF02 membro válido passa; e-mail inválido falha', () => {
  assert.equal(validarMembro({ nome: 'Ana Souza', email: 'ana@x.com', telefone: '(11) 98888-7777' }).ok, true);
  assert.ok(validarMembro({ nome: 'Ana Souza', email: 'ana@x' }).erros.email);
  assert.ok(validarMembro({ nome: 'An', email: 'a@b.com' }).erros.nome);
  assert.ok(validarMembro({ nome: 'Ana', email: 'a@b.com', telefone: '123' }).erros.telefone);
});

// ---------- Regras de empréstimo ----------
test('RF03 prazo padrão de 14 dias, inclusive na virada de mês/ano', () => {
  assert.equal(calcularDataPrevista('2026-01-10'), '2026-01-24');
  assert.equal(calcularDataPrevista('2026-12-25'), '2027-01-08');
  assert.equal(somarDias('2024-02-20', 14), '2024-03-05'); // ano bissexto
});
test('RF05 atraso: 0 no prazo, conta dias depois, congela na devolução', () => {
  const e = { data_prevista: '2026-03-10', data_devolucao: null };
  assert.equal(diasDeAtraso(e, '2026-03-10'), 0);
  assert.equal(estaAtrasado(e, '2026-03-10'), false);
  assert.equal(diasDeAtraso(e, '2026-03-15'), 5);
  assert.equal(estaAtrasado(e, '2026-03-15'), true);
  assert.equal(diasDeAtraso({ ...e, data_devolucao: '2026-03-12' }, '2026-04-30'), 2);
  assert.equal(estaAtrasado({ ...e, data_devolucao: '2026-03-12' }, '2026-04-30'), false);
});
test('hojeISO usa data local no formato AAAA-MM-DD', () => {
  assert.equal(hojeISO(new Date(2026, 10, 9)), '2026-11-09');
});

const livro = { id: 1, titulo: 'L1' };
const membro = { id: 1, nome: 'Ana' };
const hoje = '2026-06-01';

test('RF03 empréstimo permitido quando livro livre e membro regular', () => {
  assert.equal(podeEmprestar({ livro, membro, emprestimos: [] }, hoje).ok, true);
});
test('RN01 livro já emprestado é bloqueado', () => {
  const r = podeEmprestar({ livro, membro, emprestimos: [{ livro_id: 1, membro_id: 2, data_prevista: '2026-06-10', data_devolucao: null }] }, hoje);
  assert.equal(r.ok, false);
  assert.match(r.motivo, /já está emprestado/);
});
test('RN01 livro devolvido volta a ficar disponível', () => {
  const r = podeEmprestar({ livro, membro, emprestimos: [{ livro_id: 1, membro_id: 2, data_prevista: '2026-05-01', data_devolucao: '2026-05-02' }] }, hoje);
  assert.equal(r.ok, true);
});
test('RN02 limite de 3 empréstimos abertos por membro', () => {
  const abertos = [2, 3, 4].map((id) => ({ livro_id: id, membro_id: 1, data_prevista: '2026-06-20', data_devolucao: null }));
  const r = podeEmprestar({ livro, membro, emprestimos: abertos }, hoje);
  assert.equal(r.ok, false);
  assert.match(r.motivo, /limite de 3/);
});
test('RN03 membro com atraso não pode pegar novo livro', () => {
  const atraso = [{ livro_id: 9, membro_id: 1, data_prevista: '2026-05-20', data_devolucao: null }];
  const r = podeEmprestar({ livro, membro, emprestimos: atraso }, hoje);
  assert.equal(r.ok, false);
  assert.match(r.motivo, /atraso/);
});
test('entradas ausentes devolvem motivo claro', () => {
  assert.match(podeEmprestar({ livro: null, membro, emprestimos: [] }).motivo, /livro/i);
  assert.match(podeEmprestar({ livro, membro: null, emprestimos: [] }).motivo, /membro/i);
});
