// VIEW – desenha as telas a partir dos dados do controller e dispara ações nele.
import { esc, fmtData, toast, abrirFormulario, confirmar, $ } from './dom.js';
import { estaAberto, estaAtrasado, diasDeAtraso, livroDisponivel } from '../model/rules.js';
import { EXEMPLO } from '../model/exemplo.js';

const resposta = (r, extra = {}) => {
  if (r.ok) toast(r.mensagem, 'ok', extra);
  else if (!r.erros) toast(r.mensagem, 'erro'); // erros de campo já aparecem junto do campo
  return r;
};

export function criarTelas(ctl, redesenhar) {
  const livros = () => ctl.dados.livros;
  const membros = () => ctl.dados.membros;
  const emprestimos = () => ctl.dados.emprestimos;
  const hoje = () => ctl.hoje();

  const cabecalho = (titulo, sub, botao = '') => `<div class="barra"><div class="esp"><h2>${titulo}</h2><p class="sub" style="margin:0">${sub}</p></div>${botao}</div>`;
  const vazio = (msg) => `<div class="vazio">${msg}</div>`;

  // ---------- PAINEL ----------
  function painel(main) {
    const r = ctl.resumo();
    const linhas = r.atrasados.map((e) => {
      const l = livros().find((x) => x.id === e.livro_id); const m = membros().find((x) => x.id === e.membro_id);
      return `<tr><td>${esc(l?.titulo)}</td><td>${esc(m?.nome)}</td><td>${fmtData(e.data_prevista)}</td><td><span class="tag late">${diasDeAtraso(e, hoje())} dia(s) de atraso</span></td></tr>`;
    }).join('');
    const demoVazio = r.totalLivros === 0 && typeof ctl.repo.reiniciar === 'function';
    main.innerHTML = `${cabecalho('Painel', 'Visão geral do acervo e das devoluções.', demoVazio ? '<button id="exemplo">Carregar dados de exemplo</button>' : '')}
      <div class="cards">
        <div class="card"><div class="num">${r.totalLivros}</div><div class="rot">Livros no acervo</div></div>
        <div class="card"><div class="num">${r.disponiveis}</div><div class="rot">Disponíveis</div></div>
        <div class="card"><div class="num">${r.emprestados}</div><div class="rot">Emprestados</div></div>
        <div class="card ${r.atrasados.length ? 'alerta' : ''}"><div class="num">${r.atrasados.length}</div><div class="rot">Em atraso</div></div>
        <div class="card"><div class="num">${r.totalMembros}</div><div class="rot">Membros</div></div>
      </div>
      <h2 style="font-size:1.1rem">Devoluções em atraso</h2>
      <div class="tabela-wrap">${r.atrasados.length
        ? `<table><thead><tr><th>Livro</th><th>Membro</th><th>Previsto</th><th>Situação</th></tr></thead><tbody>${linhas}</tbody></table>`
        : vazio('Nenhuma devolução em atraso. 🎉')}</div>`;
    if (demoVazio) {
      $('#exemplo').onclick = async () => {
        await ctl.repo.reiniciar(EXEMPLO); await ctl.carregar();
        toast('Dados de exemplo carregados.'); redesenhar();
      };
    }
  }

  // ---------- LIVROS ----------
  const camposLivro = [
    { nome: 'titulo', rotulo: 'Título', obrigatorio: true },
    { nome: 'autor', rotulo: 'Autor', obrigatorio: true },
    { nome: 'isbn', rotulo: 'ISBN', dica: '10 ou 13 dígitos (opcional)' },
    { nome: 'categoria', rotulo: 'Categoria', placeholder: 'Ex.: Romance' },
    { nome: 'ano', rotulo: 'Ano de publicação', tipo: 'number' },
  ];
  function formLivro(livro = null) {
    abrirFormulario({
      titulo: livro ? 'Editar livro' : 'Novo livro', campos: camposLivro, valores: livro ?? {},
      onSubmit: async (d) => { const r = await ctl.salvarLivro(d, livro?.id); resposta(r); if (r.ok) redesenhar(); return r; },
    });
  }

  let filtroLivros = '';
  function telaLivros(main) {
    const q = filtroLivros.toLowerCase();
    const lista = livros().filter((l) => `${l.titulo} ${l.autor} ${l.categoria ?? ''} ${l.isbn ?? ''}`.toLowerCase().includes(q));
    const linhas = lista.map((l) => `<tr>
      <td><strong>${esc(l.titulo)}</strong><br><small>${esc(l.autor)}</small></td>
      <td>${esc(l.categoria ?? '—')}</td><td>${esc(l.ano ?? '—')}</td>
      <td>${livroDisponivel(l.id, emprestimos()) ? '<span class="tag ok">Disponível</span>' : '<span class="tag out">Emprestado</span>'}</td>
      <td class="acoes"><button class="link" data-ed="${l.id}" aria-label="Editar ${esc(l.titulo)}">Editar</button>
      <button class="link" data-ex="${l.id}" aria-label="Excluir ${esc(l.titulo)}">Excluir</button></td></tr>`).join('');
    main.innerHTML = `${cabecalho('Livros', `${livros().length} título(s) no acervo.`, '<button class="pri" id="novo">+ Novo livro</button>')}
      <div class="barra"><input type="search" id="busca" placeholder="Buscar por título, autor, categoria ou ISBN" aria-label="Buscar livros" value="${esc(filtroLivros)}"></div>
      <div class="tabela-wrap">${lista.length
        ? `<table><thead><tr><th>Livro</th><th>Categoria</th><th>Ano</th><th>Situação</th><th></th></tr></thead><tbody>${linhas}</tbody></table>`
        : vazio(livros().length ? 'Nenhum livro encontrado para esta busca.' : 'Nenhum livro cadastrado ainda. Clique em “Novo livro”.')}</div>`;
    $('#novo').onclick = () => formLivro();
    const busca = $('#busca');
    busca.oninput = () => { filtroLivros = busca.value; const pos = busca.selectionStart; telaLivros(main); const b = $('#busca'); b.focus(); b.setSelectionRange(pos, pos); };
    main.querySelectorAll('[data-ed]').forEach((b) => (b.onclick = () => formLivro(livros().find((l) => l.id === Number(b.dataset.ed)))));
    main.querySelectorAll('[data-ex]').forEach((b) => (b.onclick = () => {
      const l = livros().find((x) => x.id === Number(b.dataset.ex));
      confirmar({ titulo: 'Excluir livro?', texto: `“${l.titulo}” será removido do acervo. Esta ação não pode ser desfeita.`, textoOk: 'Excluir',
        onOk: async () => { resposta(await ctl.excluirLivro(l.id)); redesenhar(); } });
    }));
  }

  // ---------- MEMBROS ----------
  const camposMembro = [
    { nome: 'nome', rotulo: 'Nome completo', obrigatorio: true },
    { nome: 'email', rotulo: 'E-mail', tipo: 'email', obrigatorio: true },
    { nome: 'telefone', rotulo: 'Telefone', tipo: 'tel', dica: 'Com DDD (opcional)' },
  ];
  function formMembro(m = null) {
    abrirFormulario({
      titulo: m ? 'Editar membro' : 'Novo membro', campos: camposMembro, valores: m ?? {},
      onSubmit: async (d) => { const r = await ctl.salvarMembro(d, m?.id); resposta(r); if (r.ok) redesenhar(); return r; },
    });
  }
  function telaMembros(main) {
    const linhas = membros().map((m) => {
      const n = emprestimos().filter((e) => e.membro_id === m.id && estaAberto(e)).length;
      return `<tr><td><strong>${esc(m.nome)}</strong></td><td>${esc(m.email)}</td><td>${esc(m.telefone ?? '—')}</td><td>${n} aberto(s)</td>
        <td class="acoes"><button class="link" data-ed="${m.id}" aria-label="Editar ${esc(m.nome)}">Editar</button>
        <button class="link" data-ex="${m.id}" aria-label="Excluir ${esc(m.nome)}">Excluir</button></td></tr>`;
    }).join('');
    main.innerHTML = `${cabecalho('Membros', `${membros().length} pessoa(s) cadastrada(s).`, '<button class="pri" id="novo">+ Novo membro</button>')}
      <div class="tabela-wrap">${membros().length
        ? `<table><thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Empréstimos</th><th></th></tr></thead><tbody>${linhas}</tbody></table>`
        : vazio('Nenhum membro cadastrado ainda. Clique em “Novo membro”.')}</div>`;
    $('#novo').onclick = () => formMembro();
    main.querySelectorAll('[data-ed]').forEach((b) => (b.onclick = () => formMembro(membros().find((m) => m.id === Number(b.dataset.ed)))));
    main.querySelectorAll('[data-ex]').forEach((b) => (b.onclick = () => {
      const m = membros().find((x) => x.id === Number(b.dataset.ex));
      confirmar({ titulo: 'Excluir membro?', texto: `${m.nome} será removido(a). Esta ação não pode ser desfeita.`, textoOk: 'Excluir',
        onOk: async () => { resposta(await ctl.excluirMembro(m.id)); redesenhar(); } });
    }));
  }

  // ---------- EMPRÉSTIMOS ----------
  let filtroEmp = 'abertos';
  function formEmprestimo() {
    const disp = livros().filter((l) => livroDisponivel(l.id, emprestimos()));
    abrirFormulario({
      titulo: 'Novo empréstimo', textoOk: 'Registrar',
      campos: [
        { nome: 'livro_id', rotulo: 'Livro (somente disponíveis)', tipo: 'select', opcoes: disp.map((l) => ({ valor: l.id, rotulo: `${l.titulo} — ${l.autor}` })) },
        { nome: 'membro_id', rotulo: 'Membro', tipo: 'select', opcoes: membros().map((m) => ({ valor: m.id, rotulo: m.nome })) },
      ],
      onSubmit: async (d) => {
        const r = await ctl.emprestar(d.livro_id, d.membro_id);
        if (!r.ok && !d.livro_id) r.erros = { livro_id: r.mensagem };
        else if (!r.ok && !d.membro_id) r.erros = { membro_id: r.mensagem };
        resposta(r);
        if (r.ok) redesenhar();
        return r;
      },
    });
  }
  function telaEmprestimos(main) {
    const lista = emprestimos().filter((e) => (filtroEmp === 'abertos' ? estaAberto(e) : filtroEmp === 'atrasados' ? estaAtrasado(e, hoje()) : true))
      .sort((a, b) => b.id - a.id);
    const linhas = lista.map((e) => {
      const l = livros().find((x) => x.id === e.livro_id); const m = membros().find((x) => x.id === e.membro_id);
      const tag = !estaAberto(e) ? `<span class="tag done">Devolvido em ${fmtData(e.data_devolucao)}</span>`
        : estaAtrasado(e, hoje()) ? `<span class="tag late">Atrasado ${diasDeAtraso(e, hoje())} dia(s)</span>` : '<span class="tag out">No prazo</span>';
      return `<tr><td><strong>${esc(l?.titulo)}</strong></td><td>${esc(m?.nome)}</td><td>${fmtData(e.data_emprestimo)}</td><td>${fmtData(e.data_prevista)}</td><td>${tag}</td>
        <td class="acoes">${estaAberto(e) ? `<button data-dev="${e.id}">Devolver</button>` : `<button class="link" data-und="${e.id}">Desfazer</button>`}</td></tr>`;
    }).join('');
    main.innerHTML = `${cabecalho('Empréstimos', 'Registre saídas e devoluções. Prazo padrão: 14 dias; limite de 3 livros por pessoa.', '<button class="pri" id="novo">+ Novo empréstimo</button>')}
      <div class="barra"><label for="filtro" style="margin:0">Mostrar:</label>
        <select id="filtro" style="width:auto"><option value="abertos">Em aberto</option><option value="atrasados">Atrasados</option><option value="todos">Todos</option></select></div>
      <div class="tabela-wrap">${lista.length
        ? `<table><thead><tr><th>Livro</th><th>Membro</th><th>Saída</th><th>Previsto</th><th>Situação</th><th></th></tr></thead><tbody>${linhas}</tbody></table>`
        : vazio('Nenhum empréstimo nesta visão.')}</div>`;
    $('#filtro').value = filtroEmp;
    $('#filtro').onchange = (ev) => { filtroEmp = ev.target.value; telaEmprestimos(main); };
    $('#novo').onclick = () => formEmprestimo();
    main.querySelectorAll('[data-dev]').forEach((b) => (b.onclick = async () => {
      const id = Number(b.dataset.dev);
      const r = await ctl.devolver(id);
      resposta(r, { desfazer: async () => { resposta(await ctl.desfazerDevolucao(id)); redesenhar(); } });
      redesenhar();
    }));
    main.querySelectorAll('[data-und]').forEach((b) => (b.onclick = async () => {
      resposta(await ctl.desfazerDevolucao(Number(b.dataset.und)));
      redesenhar();
    }));
  }

  return { painel, livros: telaLivros, membros: telaMembros, emprestimos: telaEmprestimos };
}
