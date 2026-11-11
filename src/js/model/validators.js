// MODEL – validações de domínio (funções puras, sem DOM e sem rede).
// Cada função devolve { ok: boolean, erros: { campo: "mensagem" } }.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function resultado(erros) {
  return { ok: Object.keys(erros).length === 0, erros };
}

export function normalizarIsbn(isbn) {
  return String(isbn ?? '').replace(/[\s-]/g, '');
}

export function validarLivro(d, anoAtual = new Date().getFullYear()) {
  const erros = {};
  if (!String(d.titulo ?? '').trim()) erros.titulo = 'Informe o título do livro.';
  else if (d.titulo.trim().length > 150) erros.titulo = 'O título deve ter no máximo 150 caracteres.';

  if (!String(d.autor ?? '').trim()) erros.autor = 'Informe o autor.';

  const isbn = normalizarIsbn(d.isbn);
  if (isbn && !/^(\d{10}|\d{13})$/.test(isbn)) erros.isbn = 'ISBN deve ter 10 ou 13 dígitos.';

  if (d.ano !== '' && d.ano != null) {
    const ano = Number(d.ano);
    if (!Number.isInteger(ano) || ano < 1400 || ano > anoAtual) {
      erros.ano = `Ano deve ser um número entre 1400 e ${anoAtual}.`;
    }
  }
  return resultado(erros);
}

export function validarMembro(d) {
  const erros = {};
  const nome = String(d.nome ?? '').trim();
  if (!nome) erros.nome = 'Informe o nome completo.';
  else if (nome.length < 3) erros.nome = 'O nome deve ter pelo menos 3 caracteres.';

  const email = String(d.email ?? '').trim();
  if (!email) erros.email = 'Informe o e-mail.';
  else if (!EMAIL_RE.test(email)) erros.email = 'E-mail inválido (exemplo: nome@dominio.com).';

  const tel = String(d.telefone ?? '').replace(/\D/g, '');
  if (tel && (tel.length < 10 || tel.length > 11)) erros.telefone = 'Telefone deve ter DDD + 8 ou 9 dígitos.';
  return resultado(erros);
}
