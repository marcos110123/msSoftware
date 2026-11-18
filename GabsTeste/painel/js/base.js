// Base do painel: Firebase, login, menu do topo, avisos, janelas e utilitários.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, LOJA, PAGINAS } from "./config.js?v=1.0.1";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ----------------------------------------------------------------------
// Utilitários
// ----------------------------------------------------------------------
export const $ = (id) => document.getElementById(id);
export const num = (v) => Number(v) || 0;
export const reais = (v) => "R$ " + num(v).toFixed(2).replace(".", ",");
export const reaisPonto = (v) => "R$ " + num(v).toFixed(2); // formato usado nas comandas antigas
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// "2026-09-25" no fuso do computador (toISOString usa UTC e erra depois das 21h)
export function dataISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Intervalo do "dia de trabalho": 00:00 até 05:59 do dia seguinte
export function janelaDoDia(inicioISO = dataISO(), fimISO = inicioISO) {
  const inicio = new Date(`${inicioISO}T00:00:00`);
  const fim = new Date(`${fimISO}T00:00:00`);
  fim.setHours(LOJA.horaFimDoDia, 59, 59, 999);
  return { inicio, fim };
}

// Dia de trabalho: até as 05:59 ainda conta como o dia anterior
export function diaDeTrabalho() {
  const d = new Date();
  if (d.getHours() < 6) d.setDate(d.getDate() - 1);
  return dataISO(d);
}

export const dataHora = (ts) => ts?.toDate?.().toLocaleString("pt-BR") || "";

// ----------------------------------------------------------------------
// Avisos e janelas
// ----------------------------------------------------------------------
export function avisar(msg, tipo = "") {
  const el = document.createElement("div");
  el.className = `aviso-flutuante ${tipo}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/**
 * Abre uma janela (modal). Retorna { el, fechar }.
 * corpo/rodape: HTML. Elementos com [data-fechar] fecham a janela.
 */
export function abrirJanela({ titulo = "", corpo = "", rodape = "", larga = false, aoFechar } = {}) {
  const fundo = document.createElement("div");
  fundo.className = "janela-fundo";
  fundo.innerHTML = `
    <div class="janela ${larga ? "janela-larga" : ""}" role="dialog" aria-modal="true">
      <div class="janela-cab"><h2>${titulo}</h2><button class="fechar-x" data-fechar aria-label="Fechar">×</button></div>
      <div class="janela-corpo">${corpo}</div>
      ${rodape ? `<div class="janela-rodape">${rodape}</div>` : ""}
    </div>`;
  const fechar = () => {
    fundo.remove();
    document.removeEventListener("keydown", tecla);
    aoFechar?.();
  };
  const tecla = (e) => { if (e.key === "Escape") fechar(); };
  fundo.addEventListener("click", (e) => {
    if (e.target === fundo || e.target.closest("[data-fechar]")) fechar();
  });
  document.addEventListener("keydown", tecla);
  document.body.appendChild(fundo);
  fundo.querySelector("input, select, textarea")?.focus();
  return { el: fundo, fechar };
}

/** Confirmação: resolve true/false. */
export function confirmar(mensagem, { titulo = "Confirmar", ok = "Confirmar", perigo = false } = {}) {
  return new Promise((resolve) => {
    let resposta = false;
    const j = abrirJanela({
      titulo,
      corpo: `<p style="color:var(--texto-2)">${esc(mensagem)}</p>`,
      rodape: `<button class="btn" data-fechar>Voltar</button>
               <button class="btn ${perigo ? "btn-perigo" : "btn-primario"}" data-ok>${esc(ok)}</button>`,
      aoFechar: () => resolve(resposta)
    });
    j.el.querySelector("[data-ok]").addEventListener("click", () => { resposta = true; j.fechar(); });
    j.el.querySelector("[data-ok]").focus();
  });
}

/** Aviso que precisa de "Ok" (substitui o alert). */
export function alerta(mensagem, titulo = "Atenção") {
  return new Promise((resolve) => {
    const j = abrirJanela({
      titulo,
      corpo: `<p style="color:var(--texto-2); white-space:pre-line">${esc(mensagem)}</p>`,
      rodape: `<button class="btn btn-primario" data-fechar>Ok</button>`,
      aoFechar: resolve
    });
    j.el.querySelector(".janela-rodape .btn").focus();
  });
}

// ----------------------------------------------------------------------
// Menu + login
// ----------------------------------------------------------------------
function htmlTopo(pagina) {
  // As telas abrem DENTRO da janela de Pedidos (admin.html), que nunca é trocada e continua
  // imprimindo os pedidos novos. Em qualquer outra tela, o menu leva para admin.html#tela.
  const links = PAGINAS.map((p) => `
    <a href="${p.id === "pedidos" ? "admin.html" : "admin.html#" + p.id}" data-tela="${p.id}" class="${p.id === pagina ? "ativo" : ""}">
      <span>${p.icone}</span>${p.nome}
    </a>`).join("");
  // Links externos de cardápio (definidos no config.js): um fica no menu;
  // vários viram um botão "Cardápios ▾" ao lado do relógio, para não apertar o menu
  const listaCardapios = LOJA.cardapios || (LOJA.cardapioUrl ? [{ nome: "Cardápio", url: LOJA.cardapioUrl }] : []);
  const linkCardapio = (c) => `<a href="${c.url}" target="_blank" rel="noopener"><span>🌐</span>${c.nome}</a>`;
  const cardapios = listaCardapios.length === 1 ? linkCardapio(listaCardapios[0]) : "";
  const cardapiosSuspensos = listaCardapios.length > 1
    ? `<details class="menu-cardapios"><summary>🌐 Cardápios</summary><div>${listaCardapios.map(linkCardapio).join("")}</div></details>`
    : "";
  return `
    <header class="topo oculto" id="topo">
      <a class="topo-marca" href="admin.html" data-tela="pedidos" title="Ir para Pedidos">
        <img src="${LOJA.logo}" alt="${LOJA.nome}">
        <span class="nome-marca"><b>${LOJA.nome}</b><small>${LOJA.subtitulo} · Painel</small></span>
      </a>
      <span class="topo-divisor"></span>
      <nav class="menu">${links}${cardapios}</nav>
      <div class="topo-usuario">
        ${cardapiosSuspensos}
        <div class="topo-relogio"><b id="relogioHora"></b><span id="relogioData"></span></div>
        <span class="topo-avatar" id="usuarioAvatar" title=""></span>
        <button class="btn btn-sair" id="btnSair">Sair</button>
      </div>
    </header>`;
}

// Tela aberta dentro da janela de Pedidos (ver iniciarTelas)
const EMBUTIDA = (() => { try { return window.self !== window.top; } catch { return true; } })();

/**
 * Só na tela de Pedidos: mostra as outras telas num quadro abaixo do menu, por cima dos pedidos.
 * A tela aberta fica no endereço (#mesas, #relatorios...), então F5 volta para ela.
 */
function iniciarTelas() {
  const quadro = document.createElement("iframe");
  quadro.id = "telaEmbutida"; quadro.className = "tela-embutida oculto"; quadro.title = "Tela do painel";
  document.body.appendChild(quadro);
  const tituloPedidos = document.title;
  let rolagem = 0;
  quadro.addEventListener("load", () => {
    try { if (!quadro.classList.contains("oculto")) document.title = quadro.contentDocument.title || tituloPedidos; } catch {}
  });
  const ajustar = () => { const h = $("topo").offsetHeight; quadro.style.top = h + "px"; quadro.style.height = `calc(100% - ${h}px)`; };
  window.addEventListener("resize", ajustar);

  const mostrar = () => {
    const p = PAGINAS.find((x) => x.id === location.hash.slice(1) && x.id !== "pedidos");
    const ativa = p ? p.id : "pedidos";
    const jaAberta = document.documentElement.classList.contains("com-tela-embutida");
    if (p && !jaAberta) rolagem = window.scrollY;   // guarda onde a lista de pedidos estava
    document.querySelectorAll(".topo .menu a").forEach((a) => a.classList.toggle("ativo", a.dataset.tela === ativa));
    document.documentElement.classList.toggle("com-tela-embutida", !!p);
    if (!p) {
      // voltou para Pedidos: descarrega a outra tela (ela para de consultar o banco)
      if (quadro.dataset.tela) { delete quadro.dataset.tela; quadro.src = "about:blank"; }
      quadro.classList.add("oculto");
      document.title = tituloPedidos;
      if (jaAberta) window.scrollTo(0, rolagem);
      return;
    }
    ajustar();
    if (quadro.dataset.tela !== p.id) { quadro.dataset.tela = p.id; quadro.src = p.href; }
    quadro.classList.remove("oculto");
  };

  document.addEventListener("click", (e) => {
    const a = e.target.closest ? e.target.closest(".topo a[data-tela]") : null;
    if (!a) return;
    e.preventDefault();
    if (a.dataset.tela === "pedidos") {
      if (location.hash) { history.replaceState(null, "", location.pathname + location.search); mostrar(); }
    } else if (location.hash.slice(1) === a.dataset.tela) {
      quadro.contentWindow.location.reload();   // clicou na tela que já está aberta: recarrega
    } else {
      location.hash = a.dataset.tela;
    }
  });
  window.addEventListener("hashchange", mostrar);
  mostrar();
}

// Volta para a tela de Pedidos: dentro do quadro, só fecha a tela (Pedidos já está aberto por trás)
function voltarParaPedidos() {
  if (EMBUTIDA) window.parent.location.hash = "pedidos";
  else location.href = "admin.html";
}

function htmlLogin(pagina) {
  const p = PAGINAS.find((x) => x.id === pagina);
  return `
    <div class="login-fundo oculto" id="telaLogin">
      <div class="card login">
        <img src="${LOJA.logo}" alt="${LOJA.nome}">
        <h1>Painel ${LOJA.nome}</h1>
        <p class="pagina-sub">${p ? p.icone + " " + p.nome : ""}</p>
        <form id="formLogin">
          <div class="grupo-campo"><label class="rotulo" for="loginEmail">E-mail</label>
            <input class="campo" id="loginEmail" type="email" autocomplete="username" required></div>
          <div class="grupo-campo"><label class="rotulo" for="loginSenha">Senha</label>
            <input class="campo" id="loginSenha" type="password" autocomplete="current-password" required></div>
          <p class="erro" id="loginErro"></p>
          <button class="btn btn-primario btn-g btn-bloco">Entrar</button>
        </form>
      </div>
    </div>`;
}

/**
 * Monta topo + login. O conteúdo da página (#conteudo) só aparece logado,
 * e aoEntrar(user) roda uma única vez após o login.
 */
export function iniciarPagina(pagina, aoEntrar) {
  if (EMBUTIDA && pagina === "pedidos") { voltarParaPedidos(); return; }   // Pedidos nunca roda dentro do quadro
  if (pagina === "pedidos") window.name = "painel-pedidos";
  document.body.insertAdjacentHTML("afterbegin", htmlTopo(pagina) + htmlLogin(pagina));
  if (EMBUTIDA) {
    // esta tela está dentro da janela de Pedidos: o menu é o de fora
    document.documentElement.classList.add("embutida");
    document.addEventListener("click", (e) => {
      const a = e.target.closest ? e.target.closest('a[target^="painel-"]') : null;
      if (!a) return;
      e.preventDefault();
      window.parent.location.hash = a.target.slice(7);
    });
  }
  // fecha a lista "Cardápios ▾" ao clicar fora dela
  document.addEventListener("click", (e) => {
    const lista = document.querySelector(".menu-cardapios");
    if (lista?.open && !lista.contains(e.target)) lista.open = false;
  });
  let iniciado = false;

  onAuthStateChanged(auth, (user) => {
    $("telaLogin").classList.toggle("oculto", !!user);
    $("topo").classList.toggle("oculto", !user);
    $("conteudo").classList.toggle("oculto", !user);
    if (!user) return;
    $("usuarioAvatar").textContent = (user.email || "?").charAt(0);
    $("usuarioAvatar").title = user.email || "";
    if (!iniciado) {
      iniciado = true;
      if (pagina === "pedidos" && !EMBUTIDA) iniciarTelas();
      aoEntrar(user);
    }
  });

  $("formLogin").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("loginErro").textContent = "";
    try {
      await signInWithEmailAndPassword(auth, $("loginEmail").value.trim(), $("loginSenha").value);
    } catch {
      $("loginErro").textContent = "Email ou senha inválidos!";
    }
  });

  // relógio do topo
  const relogio = () => {
    const agora = new Date();
    $("relogioHora").textContent = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    $("relogioData").textContent = agora.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
  };
  relogio();
  setInterval(relogio, 15000);

  $("btnSair").addEventListener("click", async () => {
    if (await confirmar("Deseja sair do painel?", { ok: "Sair", perigo: true })) {
      await signOut(auth);
      location.reload();
    }
  });
}

// ----------------------------------------------------------------------
// Senha extra para páginas restritas (Relatórios, Vendas)
// ----------------------------------------------------------------------
/**
 * Esconde a página e pede a senha. Resolve true com a senha certa.
 * Senha errada avisa e deixa tentar de novo; "Voltar" leva para Pedidos.
 */
export function exigirSenha(senhaCerta, nomePagina = "esta página") {
  const conteudo = $("conteudo");
  conteudo?.classList.add("oculto");
  return new Promise((resolve) => {
    let liberado = false;
    const j = abrirJanela({
      titulo: "🔒 Acesso restrito",
      corpo: `<p style="color:var(--texto-2); margin-bottom:12px">Digite a senha para abrir ${esc(nomePagina)}.</p>
        <input class="campo" id="senhaPagina" type="text" inputmode="numeric" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="Senha"
          style="font-size:20px; text-align:center; letter-spacing:.2em; -webkit-text-security: disc">
        <p id="erroSenhaPagina" class="oculto" style="color:var(--perigo); font-weight:600; margin-top:8px">❌ Senha incorreta!</p>`,
      rodape: `<button class="btn" data-voltar>Voltar para Pedidos</button>
               <button class="btn btn-primario" data-entrar>Entrar</button>`,
      // saiu sem a senha (tecla Esc): volta para Pedidos em vez de deixar a página em branco
      aoFechar: () => { if (!liberado) voltarParaPedidos(); }
    });
    // sem senha, fechar a janela não libera a página
    j.el.addEventListener("click", (e) => { if (e.target === j.el) e.stopImmediatePropagation(); }, true);
    j.el.querySelector("[data-fechar]")?.remove();
    const campo = j.el.querySelector("#senhaPagina");
    const entrar = () => {
      if (campo.value === senhaCerta) {
        liberado = true;
        j.fechar();
        conteudo?.classList.remove("oculto");
        resolve(true);
        return;
      }
      j.el.querySelector("#erroSenhaPagina").classList.remove("oculto");
      campo.value = "";
      campo.focus();
    };
    j.el.querySelector("[data-entrar]").addEventListener("click", entrar);
    campo.addEventListener("keydown", (e) => { if (e.key === "Enter") entrar(); });
    j.el.querySelector("[data-voltar]").addEventListener("click", voltarParaPedidos);
    campo.focus();
  });
}
