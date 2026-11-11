// VIEW – utilitários de DOM compartilhados (toast, modal, escape, formatação).
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtData = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
export const $ = (sel, raiz = document) => raiz.querySelector(sel);

export function toast(mensagem, tipo = 'ok', { desfazer } = {}) {
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.innerHTML = `<span>${esc(mensagem)}</span>`;
  if (desfazer) {
    const b = document.createElement('button');
    b.textContent = 'Desfazer';
    b.onclick = () => { desfazer(); el.remove(); };
    el.append(b);
  }
  const area = $('#toasts');
  area.append(el);
  while (area.children.length > 3) area.firstElementChild.remove(); // evita empilhar avisos sobre a tabela
  setTimeout(() => el.remove(), desfazer ? 8000 : 4500);
}

/** Mostra erros de validação junto de cada campo do formulário. */
export function mostrarErros(form, erros = {}) {
  form.querySelectorAll('.campo').forEach((c) => {
    c.classList.remove('invalido');
    c.querySelector('.erro')?.remove();
    c.querySelector('[aria-invalid]')?.removeAttribute('aria-invalid');
  });
  for (const [campo, msg] of Object.entries(erros)) {
    const input = form.elements[campo];
    const wrap = input?.closest('.campo');
    if (!wrap) continue;
    wrap.classList.add('invalido');
    input.setAttribute('aria-invalid', 'true');
    const p = document.createElement('div');
    p.className = 'erro';
    p.setAttribute('role', 'alert');
    p.textContent = msg;
    wrap.append(p);
  }
  form.querySelector('.invalido input, .invalido select')?.focus();
}

const modal = () => $('#modal');

/** Abre o modal com HTML de formulário. onSubmit recebe (dados, form) e devolve {ok, erros?} */
export function abrirFormulario({ titulo, campos, valores = {}, textoOk = 'Salvar', onSubmit }) {
  const form = $('#modal-form');
  form.innerHTML = `<h3>${esc(titulo)}</h3>${campos.map((c) => campoHtml(c, valores[c.nome])).join('')}
    <div class="rodape-modal"><button type="button" value="cancelar" id="m-cancelar">Cancelar</button>
    <button type="submit" class="pri">${esc(textoOk)}</button></div>`;
  $('#m-cancelar').onclick = () => modal().close();
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const dados = Object.fromEntries(new FormData(form).entries());
    const r = await onSubmit(dados);
    if (r.ok) modal().close();
    else mostrarErros(form, r.erros);
  };
  modal().showModal();
  form.querySelector('input,select')?.focus();
}

function campoHtml(c, valor = '') {
  const id = `f-${c.nome}`;
  const dica = c.dica ? `<div class="dica">${esc(c.dica)}</div>` : '';
  if (c.tipo === 'select') {
    const ops = c.opcoes.map((o) => `<option value="${esc(o.valor)}"${String(o.valor) === String(valor) ? ' selected' : ''}>${esc(o.rotulo)}</option>`).join('');
    return `<div class="campo"><label for="${id}">${esc(c.rotulo)}</label><select id="${id}" name="${c.nome}"><option value="">Selecione…</option>${ops}</select>${dica}</div>`;
  }
  return `<div class="campo"><label for="${id}">${esc(c.rotulo)}${c.obrigatorio ? ' *' : ''}</label>
    <input id="${id}" name="${c.nome}" type="${c.tipo ?? 'text'}" value="${esc(valor)}" autocomplete="off"${c.placeholder ? ` placeholder="${esc(c.placeholder)}"` : ''}>${dica}</div>`;
}

/** Confirmação antes de ação destrutiva (princípio: interface controlada pelo usuário). */
export function confirmar({ titulo, texto, textoOk = 'Confirmar', onOk }) {
  const form = $('#modal-form');
  form.innerHTML = `<h3>${esc(titulo)}</h3><p>${esc(texto)}</p>
    <div class="rodape-modal"><button type="button" id="m-cancelar">Cancelar</button>
    <button type="submit" class="pri perigo-pri" style="background:var(--err);border-color:var(--err)">${esc(textoOk)}</button></div>`;
  $('#m-cancelar').onclick = () => modal().close();
  form.onsubmit = async (ev) => { ev.preventDefault(); modal().close(); await onOk(); };
  modal().showModal();
}
