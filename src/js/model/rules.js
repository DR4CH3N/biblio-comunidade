// MODEL – regras de negócio do empréstimo (funções puras).
// Datas sempre como "AAAA-MM-DD" e calculadas em UTC para evitar bugs de fuso horário.

export const PRAZO_DIAS = 14;
export const MAX_EMPRESTIMOS_ABERTOS = 3;

const DIA_MS = 86_400_000;
const paraUtc = (iso) => Date.parse(`${iso}T00:00:00Z`);

export function hojeISO(agora = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${p(agora.getMonth() + 1)}-${p(agora.getDate())}`;
}

export function somarDias(iso, dias) {
  return new Date(paraUtc(iso) + dias * DIA_MS).toISOString().slice(0, 10);
}

export function calcularDataPrevista(dataEmprestimo, prazo = PRAZO_DIAS) {
  return somarDias(dataEmprestimo, prazo);
}

export const estaAberto = (e) => !e.data_devolucao;

export function diasDeAtraso(e, hoje = hojeISO()) {
  const fim = e.data_devolucao ?? hoje;
  const dif = Math.floor((paraUtc(fim) - paraUtc(e.data_prevista)) / DIA_MS);
  return dif > 0 ? dif : 0;
}

export const estaAtrasado = (e, hoje = hojeISO()) => estaAberto(e) && diasDeAtraso(e, hoje) > 0;

export function livroDisponivel(livroId, emprestimos) {
  return !emprestimos.some((e) => e.livro_id === livroId && estaAberto(e));
}

export function abertosDoMembro(membroId, emprestimos) {
  return emprestimos.filter((e) => e.membro_id === membroId && estaAberto(e));
}

/** Decide se um empréstimo pode ser criado. Devolve { ok, motivo? }. */
export function podeEmprestar({ livro, membro, emprestimos }, hoje = hojeISO()) {
  if (!livro) return { ok: false, motivo: 'Selecione um livro.' };
  if (!membro) return { ok: false, motivo: 'Selecione um membro.' };
  if (!livroDisponivel(livro.id, emprestimos)) {
    return { ok: false, motivo: `O livro "${livro.titulo}" já está emprestado.` };
  }
  const abertos = abertosDoMembro(membro.id, emprestimos);
  if (abertos.some((e) => estaAtrasado(e, hoje))) {
    return { ok: false, motivo: `${membro.nome} tem devolução em atraso e não pode pegar novos livros.` };
  }
  if (abertos.length >= MAX_EMPRESTIMOS_ABERTOS) {
    return { ok: false, motivo: `${membro.nome} já atingiu o limite de ${MAX_EMPRESTIMOS_ABERTOS} empréstimos abertos.` };
  }
  return { ok: true };
}

/**
 * Desfazer uma devolução reabre o empréstimo, então ele não pode violar RN01 nem RN02.
 * (RN03 não se aplica: não é um livro novo, é a correção de uma devolução registrada por engano.)
 */
export function podeDesfazerDevolucao({ emprestimo, livro, membro, emprestimos }) {
  if (!emprestimo) return { ok: false, motivo: 'Empréstimo não encontrado.' };
  if (estaAberto(emprestimo)) return { ok: false, motivo: 'Este empréstimo já está em aberto.' };
  const outros = emprestimos.filter((e) => e.id !== emprestimo.id);
  if (!livroDisponivel(emprestimo.livro_id, outros)) {
    return { ok: false, motivo: `Não é possível desfazer: o livro "${livro?.titulo ?? ''}" já foi emprestado de novo.` };
  }
  if (abertosDoMembro(emprestimo.membro_id, outros).length >= MAX_EMPRESTIMOS_ABERTOS) {
    return { ok: false, motivo: `Não é possível desfazer: ${membro?.nome ?? 'o membro'} já tem ${MAX_EMPRESTIMOS_ABERTOS} empréstimos abertos.` };
  }
  return { ok: true };
}
