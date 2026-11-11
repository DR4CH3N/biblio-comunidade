// Ponto de entrada: escolhe o repositório (Supabase ou demo), liga controller e view, trata rotas.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { LocalRepository } from './model/repository-local.js';
import { SupabaseRepository } from './model/repository-supabase.js';
import { BiblioController } from './controller/biblio-controller.js';
import { criarTelas } from './view/telas.js';
import { toast, $ } from './view/dom.js';

const usaSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const repo = usaSupabase ? new SupabaseRepository({ url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY }) : new LocalRepository();
const ctl = new BiblioController(repo);

const selo = $('#modo');
selo.textContent = usaSupabase ? 'Banco: PostgreSQL (Supabase)' : 'Modo demo (dados só neste navegador)';
selo.classList.toggle('on', usaSupabase);

const ROTAS = ['painel', 'livros', 'membros', 'emprestimos'];
let telas;

function rotaAtual() {
  const r = location.hash.replace('#/', '');
  return ROTAS.includes(r) ? r : 'painel';
}

function desenhar() {
  const rota = rotaAtual();
  document.querySelectorAll('nav a').forEach((a) => {
    if (a.dataset.rota === rota) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.title = `BiblioComunidade – ${rota[0].toUpperCase()}${rota.slice(1)}`;
  telas[rota]($('#conteudo'));
}

async function iniciar() {
  telas = criarTelas(ctl, desenhar);
  try {
    await ctl.carregar();
  } catch (e) {
    $('#conteudo').innerHTML = `<div class="aviso" role="alert"><strong>Não foi possível carregar os dados.</strong><br>${e.message}<br>
      <button id="tentar" style="margin-top:8px">Tentar novamente</button></div>`;
    $('#tentar').onclick = () => location.reload();
    toast(e.message, 'erro');
    return;
  }
  window.addEventListener('hashchange', desenhar);
  desenhar();
}

iniciar();
