import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ----------------------
// Firebase
// ----------------------
const firebaseConfig = {
  apiKey: "AIzaSyCaKUfUO_5l1PLjuv_WHXmT95vIKg1PxqU",
  authDomain: "nossoacai-48ea8.firebaseapp.com",
  projectId: "nossoacai-48ea8",
  storageBucket: "nossoacai-48ea8.firebasestorage.app",
  messagingSenderId: "971990035491",
  appId: "1:971990035491:web:8c1a360bbac3ea0d851596"
};
const db = getFirestore(initializeApp(firebaseConfig));

// ----------------------
// Configuração da loja
// ----------------------
const LOJA = {
  nome: "Nosso Açaí",
  whatsapp: "5517991828457", // (17) 99182-8457
  taxaEntrega: 2.00          // padrão; o painel muda em Configurações (config/entrega.taxaEntrega)
};

// Formatos (o "id" é o campo "categoria" do produto). Produtos "Copo P/M/G" viram um item só, com os tamanhos.
const CATEGORIAS = [
  { id: "copos",   aba: "Copo",    titulo: "No copo",   descricao: "Cremes, adicionais e frutas",   ilu: "copo" },
  { id: "tigelas", aba: "Tigela",  titulo: "Na tigela", descricao: "A mesma montagem, na tigela",   ilu: "tigela" },
  { id: "garrafa", aba: "Garrafa", titulo: "Na garrafa", descricao: "300 ml com 1 creme à escolha", ilu: "garrafa" },
  { id: "marmita", aba: "Marmita", titulo: "Marmita",   descricao: "Para compartilhar",             ilu: "marmita" },
  { id: "bebidas", aba: "Bebidas", titulo: "Bebidas",   descricao: "Geladinhas",                    ilu: "lata" }
];
const ORDEM_TAM = ["PP", "P", "M", "G", "GG"];

// ----------------------
// Estado
// ----------------------
let produtos = [];
const grupos = new Map();
let carrinho = lerJSON("carrinho", []);
let tipoPedido = null;
let lojaAberta = true;

// ----------------------
// Helpers
// ----------------------
const $ = (id) => document.getElementById(id);
const brl = (v) => "R$ " + Number(v || 0).toFixed(2).replace(".", ",");
const curto = (v) => { const n = Number(v || 0); return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ","); };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function lerJSON(k, padrao) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? padrao; } catch { return padrao; } }
function gravarJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
const limiteDe = (p) => Number(p.limiteGratis) || 0;
const totalProdutos = () => carrinho.reduce((s, i) => s + Number(i.subtotal || 0), 0);
const taxaAtual = () => (tipoPedido === "entrega" ? LOJA.taxaEntrega : 0);
const mostrar = (id) => $(id).classList.remove("oculto");
const esconder = (id) => $(id).classList.add("oculto");

// Agrupa os complementos por grupo: ["Cremes: Pistache", "Adicionais: Paçoca, Ovomaltine"]
function descreverComplementos(item) {
  const porGrupo = new Map();
  (item.complementos || []).forEach((c) => {
    const k = c.grupo || "Extras";
    if (!porGrupo.has(k)) porGrupo.set(k, []);
    porGrupo.get(k).push(c.preco > 0 ? `${c.nome} (+${brl(c.preco)})` : c.nome);
  });
  return [...porGrupo].map(([g, lista]) => `${g}: ${lista.join(", ")}`);
}

// ----------------------
// Ilustrações
// ----------------------
let seqIlu = 0;
const ILU = {
  tigela(tam) {
    const id = "t" + ++seqIlu;
    return `<svg width="${tam}" height="${tam}" viewBox="0 0 200 200" aria-hidden="true"><defs>
      <radialGradient id="a${id}" cx="42%" cy="38%" r="70%"><stop offset="0" stop-color="#6a2a62"/><stop offset=".55" stop-color="#43123f"/><stop offset="1" stop-color="#260a24"/></radialGradient>
      <radialGradient id="b${id}" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#fffaf2"/><stop offset="1" stop-color="#e3d6c6"/></radialGradient></defs>
      <circle cx="100" cy="104" r="92" fill="#2b0d28" opacity=".12"/>
      <circle cx="100" cy="100" r="92" fill="url(#b${id})"/><circle cx="100" cy="100" r="80" fill="url(#a${id})"/>
      <path d="M40 92c14-10 26 6 40-2s24-14 38-4 24 4 40-6" fill="none" stroke="#fbf1e6" stroke-width="5" stroke-linecap="round" opacity=".9"/>
      <g fill="#f4e4b4"><circle cx="70" cy="62" r="13"/><circle cx="92" cy="54" r="12"/><circle cx="112" cy="50" r="12"/></g>
      <g fill="none" stroke="#e6cf8c" stroke-width="1.5"><circle cx="70" cy="62" r="9"/><circle cx="92" cy="54" r="8"/><circle cx="112" cy="50" r="8"/></g>
      <path d="M128 112c10-12 30-6 30 8 0 12-18 22-24 26-8-6-14-22-6-34z" fill="#d23c4e"/>
      <path d="M128 112c-2-6 4-10 8-6" fill="none" stroke="#5f9b3a" stroke-width="4" stroke-linecap="round"/>
      <path d="M58 118c8-12 28-10 28 4 0 12-16 20-22 23-8-6-12-17-6-27z" fill="#c9344a"/>
      <g fill="#f7d38a"><circle cx="138" cy="122" r="1.3"/><circle cx="146" cy="128" r="1.3"/><circle cx="140" cy="134" r="1.3"/><circle cx="66" cy="126" r="1.3"/><circle cx="74" cy="132" r="1.3"/></g>
      <circle cx="104" cy="140" r="15" fill="#86b84d"/><circle cx="104" cy="140" r="10.5" fill="#b9dc84"/><circle cx="104" cy="140" r="4" fill="#f1f6df"/>
      <g fill="#27310f"><circle cx="104" cy="131.5" r="1.1"/><circle cx="112" cy="137" r="1.1"/><circle cx="110" cy="146" r="1.1"/><circle cx="98" cy="146" r="1.1"/><circle cx="96" cy="136" r="1.1"/></g>
      <g fill="#b98446"><rect x="132" y="70" width="8" height="6" rx="3"/><rect x="136" y="86" width="8" height="5" rx="2.5"/><rect x="148" y="92" width="6" height="5" rx="2.5"/><rect x="128" y="80" width="6" height="5" rx="2.5"/></g>
    </svg>`;
  },
  copo(alt) {
    return `<svg height="${alt}" viewBox="0 0 90 130" aria-hidden="true">
      <path d="M14 30h62l-8 92H22z" fill="#3a1236"/><path d="M15.3 44h59.4l-1.4 16H16.7z" fill="#a8409a"/>
      <path d="M17.8 72h54.4l-1.1 13H18.9z" fill="#f2e3c0"/><path d="M19.8 96h50.4l-1 12H20.8z" fill="#6d2464"/>
      <circle cx="30" cy="26" r="9" fill="#d23c4e"/><circle cx="48" cy="22" r="10" fill="#f4e4b4"/><circle cx="63" cy="27" r="8" fill="#86b84d"/>
      <path d="M14 30h62l-8 92H22z" fill="none" stroke="#fff" stroke-opacity=".35"/></svg>`;
  },
  garrafa(alt) {
    return `<svg height="${alt}" viewBox="0 0 50 110" aria-hidden="true">
      <rect x="17" y="2" width="16" height="12" rx="3" fill="#a8409a"/>
      <path d="M15 16h20l6 14v68a8 8 0 0 1-8 8H17a8 8 0 0 1-8-8V30z" fill="#43123f"/>
      <rect x="9" y="50" width="32" height="26" fill="#f6efe6"/><text x="25" y="67" font-size="9" text-anchor="middle" fill="#2b0d28" font-family="serif">açaí</text>
      <path d="M13 30h4v60h-4z" fill="#fff" opacity=".18"/></svg>`;
  },
  marmita(alt) {
    return `<svg height="${alt}" viewBox="0 0 120 80" aria-hidden="true">
      <rect x="4" y="10" width="112" height="12" rx="6" fill="#a8409a"/>
      <path d="M10 24h100l-9 48a6 6 0 0 1-6 5H25a6 6 0 0 1-6-5z" fill="#43123f"/>
      <path d="M30 40h60" stroke="#f6efe6" stroke-width="3" stroke-linecap="round" opacity=".5"/>
      <text x="60" y="62" font-size="13" text-anchor="middle" fill="#f6efe6" font-family="serif">1 kg</text></svg>`;
  }
};
// Bebidas: lata ou garrafinha de água, na cor de cada sabor (desenho próprio, sem marca)
function iluBebida(nome, alt) {
  const n = String(nome || "").toLowerCase();
  if (/[áa]gua/.test(n)) {
    const gas = /com g[áa]s/.test(n);
    return `<svg height="${alt}" viewBox="0 0 50 110" aria-hidden="true">
      <rect x="18" y="2" width="14" height="10" rx="3" fill="${gas ? "#1f6fb2" : "#5fa8d3"}"/>
      <path d="M16 13h18l5 13v72a8 8 0 0 1-8 8H19a8 8 0 0 1-8-8V26z" fill="#d7ecf7"/>
      <path d="M11 44h28v30H11z" fill="${gas ? "#1f6fb2" : "#5fa8d3"}"/>
      <text x="25" y="63" font-size="8.5" font-weight="700" text-anchor="middle" fill="#fff" font-family="sans-serif">${gas ? "c/ gás" : "s/ gás"}</text>
      ${gas ? '<g fill="#fff" opacity=".9"><circle cx="18" cy="86" r="2"/><circle cx="28" cy="92" r="1.6"/><circle cx="31" cy="82" r="1.3"/><circle cx="21" cy="96" r="1.2"/></g>' : ""}
      <path d="M14 26h4v66h-4z" fill="#fff" opacity=".45"/></svg>`;
  }
  const [corpo, faixa] = /zero/.test(n) && /coca/.test(n) ? ["#1c1c1c", "#d7192b"]
    : /coca/.test(n) ? ["#d7192b", "#ffffff"]
    : /sprite/.test(n) ? ["#0b7a3b", "#f2d94e"]
    : /guaran/.test(n) ? ["#1d7f3a", "#d7192b"]
    : ["#a8409a", "#f6efe6"];
  return `<svg height="${alt}" viewBox="0 0 60 110" aria-hidden="true">
    <rect x="12" y="4" width="36" height="8" rx="3" fill="#c9c9cf"/>
    <path d="M10 12h40v86a6 6 0 0 1-6 6H16a6 6 0 0 1-6-6z" fill="${corpo}"/>
    <path d="M10 46c12 8 28-8 40 0v16c-12-8-28 8-40 0z" fill="${faixa}"/>
    <rect x="12" y="98" width="36" height="6" rx="3" fill="#c9c9cf"/>
    <path d="M15 16h4v78h-4z" fill="#fff" opacity=".25"/></svg>`;
}

const iluCategoria = (cat, tam) => {
  const f = ILU[cat?.ilu] || ILU.tigela;
  return cat?.ilu === "tigela" ? f(tam) : f(Math.round(tam * 0.92));
};

// ----------------------
// Famílias (produtos com tamanhos viram um item só)
// ----------------------
function montarFamilias() {
  const fams = [];
  const catsUsadas = [...CATEGORIAS, ...[...new Set(produtos.map((p) => p.categoria))]
    .filter((c) => !CATEGORIAS.some((x) => x.id === c)).map((c) => ({ id: c, aba: c, titulo: c, descricao: "", ilu: "tigela" }))];
  for (const cat of catsUsadas) {
    const mapa = new Map();
    produtos.filter((p) => p.categoria === cat.id).forEach((p) => {
      const m = String(p.nome).trim().match(/^(.*?)\s+(PP|P|M|G|GG)$/i);
      const chave = m ? m[1].toLowerCase() : "#" + p.id;
      if (!mapa.has(chave)) mapa.set(chave, { base: m ? m[1] : p.nome, membros: [] });
      mapa.get(chave).membros.push({ p, tam: m ? m[2].toUpperCase() : "" });
    });
    const lista = [...mapa.values()];
    lista.forEach((f) => {
      f.membros.sort((a, b) => ORDEM_TAM.indexOf(a.tam) - ORDEM_TAM.indexOf(b.tam));
      const comTam = f.membros.length > 1;
      const unica = lista.length === 1;
      fams.push({
        id: cat.id + ":" + f.base,
        cat,
        titulo: unica ? cat.titulo : comTam ? f.base : f.membros[0].p.nome,
        descricao: comTam ? (unica ? cat.descricao : f.membros[0].p.descricao || cat.descricao) : f.membros[0].p.descricao || cat.descricao,
        membros: f.membros,
        promocao: f.membros.some((m) => m.p.promocao),
        imagem: f.membros.find((m) => m.p.imagem)?.p.imagem || ""
      });
    });
  }
  return fams;
}

// ----------------------
// Lista
// ----------------------
let familias = [];

function renderLista() {
  familias = montarFamilias();
  const secoes = [];
  const promos = familias.filter((f) => f.promocao);
  if (promos.length) secoes.push({ id: "promocoes", aba: "Promoções", fams: promos });
  const porCat = new Map();
  familias.forEach((f) => { if (!porCat.has(f.cat.id)) porCat.set(f.cat.id, { id: f.cat.id, aba: f.cat.aba, fams: [] }); porCat.get(f.cat.id).fams.push(f); });
  secoes.push(...porCat.values());

  if (!secoes.length) {
    $("lista").innerHTML = '<p class="vazio">Nenhum produto disponível no momento.</p>';
    $("abas").innerHTML = "";
    return;
  }
  $("abas").innerHTML = secoes.map((s, i) => `<button class="aba ${i === 0 ? "on" : ""}" data-alvo="sec-${esc(s.id)}">${esc(s.aba)}</button>`).join("");
  $("lista").innerHTML = secoes.map((s) => `
    <section class="secao" id="sec-${esc(s.id)}">
      ${s.fams.length > 1 || s.id === "promocoes" ? `<h2>${esc(s.aba)}</h2>` : ""}
      ${s.fams.map((f) => cartao(f)).join("")}
    </section>`).join("");
}

function cartao(f) {
  const preco = f.membros.length > 1
    ? `<div class="tams">${f.membros.map((m) => `<span><b>${esc(m.tam)}</b>${curto(m.p.preco)}</span>`).join("")}</div>`
    : `<div class="tams"><span><b>${brl(f.membros[0].p.preco)}</b></span></div>`;
  return `
    <button class="item" data-fam="${esc(f.id)}">
      <div class="ilu">${f.imagem ? `<img src="${esc(f.imagem)}" alt="" loading="lazy">`
        : f.cat.ilu === "lata" ? iluBebida(f.titulo, 58) : iluCategoria(f.cat, 62)}</div>
      <div class="txt">
        ${f.promocao ? '<span class="promo">Promoção</span>' : ""}
        <h3>${esc(f.titulo)}</h3>
        <p>${esc(f.descricao)}</p>
        ${preco}
      </div>
      <span class="mais" aria-hidden="true">+</span>
    </button>`;
}

$("lista").addEventListener("click", (e) => {
  const b = e.target.closest("[data-fam]");
  if (!b) return;
  const f = familias.find((x) => x.id === b.dataset.fam);
  if (f) abrirMontagem(f);
});

$("abas").addEventListener("click", (e) => {
  const b = e.target.closest("[data-alvo]");
  if (!b) return;
  document.getElementById(b.dataset.alvo)?.scrollIntoView({ behavior: "smooth" });
  document.querySelectorAll(".aba").forEach((x) => x.classList.toggle("on", x === b));
});

// ----------------------
// Montagem do açaí
// ----------------------
let mont = null; // { fam, idx, sel: Map(grupoId -> Set(nomes)) }

function abrirMontagem(fam) {
  const semOpcoes = fam.membros.length === 1 && !(fam.membros[0].p.grupos || []).length;
  if (semOpcoes) {
    const p = fam.membros[0].p;
    return adicionarAoCarrinho({ nome: p.nome, precoBase: Number(p.preco) });
  }
  const faltando = fam.membros.some((m) => (m.p.grupos || []).some((k) => !grupos.has(k)));
  if (faltando) return avisar("Não foi possível carregar as opções deste produto. Tente novamente em instantes.");
  mont = { fam, idx: 0, sel: new Map(), obs: "" };
  renderMontagem();
  mostrar("telaMontagem");
  $("telaMontagem").scrollTop = 0;
  document.body.style.overflow = "hidden";
  history.pushState({ montagem: true }, "");
}

function fecharMontagem(peloVoltar = false) {
  esconder("telaMontagem");
  document.body.style.overflow = "";
  mont = null;
  if (!peloVoltar && history.state?.montagem) history.back();
}

const produtoAtual = () => mont.fam.membros[mont.idx].p;
const gruposDe = (p) => (p.grupos || []).map((k) => grupos.get(k)).filter(Boolean);
const marcados = (g) => mont.sel.get(g.id) || new Set();

function calcular() {
  const p = produtoAtual();
  const lim = limiteDe(p);
  const selecionados = [];
  let extras = 0, escolhidos = 0;
  gruposDe(p).forEach((g) => {
    const nomes = [...marcados(g)];
    g.itens.filter((it) => nomes.includes(it.nome)).forEach((it) => {
      const preco = Number(it.preco) || 0;
      selecionados.push({ nome: it.nome, preco, grupo: g.titulo });
      extras += preco;
    });
    if (g.contaLimite && lim) escolhidos += nomes.length;
    if (g.gratis && nomes.length > g.gratis) {
      const n = nomes.length - g.gratis, valor = n * (Number(g.precoExcedente) || 0);
      selecionados.push({ nome: `${n} adicional(is)`, preco: valor, grupo: g.titulo });
      extras += valor;
    }
  });
  const excedentes = lim ? Math.max(0, escolhidos - lim) : 0;
  if (excedentes) {
    const valor = excedentes * (Number(p.precoAdicional) || 0);
    selecionados.push({ nome: `${excedentes} além dos ${lim} inclusos`, preco: valor, grupo: "Itens extras" });
    extras += valor;
  }
  return { selecionados, extras, escolhidos, lim, total: Number(p.preco) + extras };
}

function regraGrupo(g, p) {
  if (g.contaLimite && limiteDe(p)) return { txt: "conta nos inclusos" };
  const max = Number(g.max) || 1, min = Number(g.min) || 0;
  const precos = [...new Set(g.itens.map((i) => Number(i.preco) || 0))];
  if (min > 0) return { txt: max === 1 ? "escolha 1 · obrigatório" : `escolha ${min} a ${max}`, obrig: true };
  if (precos.length === 1 && precos[0] > 0) return { txt: `+${brl(precos[0])} cada` };
  return { txt: max === 1 ? "opcional · até 1" : `opcional · até ${max}` };
}

function renderMontagem() {
  const { fam } = mont;
  const p = produtoAtual();
  const lim = limiteDe(p);
  const palco = fam.imagem ? `<img class="foto" src="${esc(fam.imagem)}" alt="">` : iluCategoria(fam.cat, 230);
  const seg = fam.membros.length > 1 ? `
    <div class="seg">${fam.membros.map((m, i) => `
      <button data-tam="${i}" class="${i === mont.idx ? "on" : ""}"><b>${esc(m.tam)}</b>
        <span>${brl(m.p.preco).replace(",00", "")}${limiteDe(m.p) ? ` · ${limiteDe(m.p)} itens` : ""}</span></button>`).join("")}
    </div>` : "";

  $("telaMontagem").innerHTML = `
    <div class="montagem">
      <div class="palco"><button class="voltar" data-sair aria-label="Voltar">←</button>${palco}</div>
      <div class="painel">
        <h2>${esc(fam.membros.length > 1 ? fam.titulo : p.nome)}</h2>
        <p class="sub">${esc(p.descricao || fam.descricao)}</p>
        ${seg}
        ${lim ? `<div class="prog" id="prog"><div class="anel" id="anel"><span id="anelTxt"></span></div><p id="progTxt"></p></div>` : ""}
        ${gruposDe(p).map((g) => {
          const r = regraGrupo(g, p);
          const radio = (Number(g.max) || 1) === 1 && !(g.contaLimite && lim);
          return `
          <div class="grupo" data-grupo="${esc(g.id)}">
            <h4>${esc(g.titulo)} <small class="${r.obrig ? "obrig" : ""}">${esc(r.txt)}</small></h4>
            <div class="linhas">${g.itens.map((it) => `
              <label class="ln"><span>${esc(it.nome)}</span>${Number(it.preco) > 0 ? `<em>+${brl(it.preco)}</em>` : ""}
                <input type="${radio ? "radio" : "checkbox"}" name="g_${esc(g.id)}" value="${esc(it.nome)}" ${marcados(g).has(it.nome) ? "checked" : ""}></label>`).join("")}
            </div>
          </div>`;
        }).join("")}
        <div class="obs"><label for="obsItem">Observação</label>
          <textarea class="campo" id="obsItem" rows="2" placeholder="Ex.: leite condensado por cima, sem granola…">${esc(mont.obs)}</textarea></div>
      </div>
      <div class="fixo-baixo"><button class="btn-pri" id="btnAdicionar"><span>Adicionar à sacola</span><span id="precoMont"></span></button></div>
    </div>`;
  atualizarMontagem();
}

function atualizarMontagem() {
  const { escolhidos, lim, total } = calcular();
  $("precoMont").textContent = brl(total);
  if (!lim) return;
  const pct = Math.min(100, (escolhidos / lim) * 100);
  const passou = escolhidos > lim;
  $("anel").style.background = `conic-gradient(${passou ? "#6f9a45" : "#a8409a"} 0 ${pct}%, #e7dacd ${pct}% 100%)`;
  $("anelTxt").textContent = `${escolhidos}/${lim}`;
  const p = produtoAtual();
  $("progTxt").innerHTML = escolhidos < lim
    ? `${lim - escolhidos === 1 ? "Falta 1 item incluso" : `Faltam ${lim - escolhidos} itens inclusos`}<small>Depois disso, ${brl(p.precoAdicional)} por item</small>`
    : escolhidos === lim
      ? `Todos os ${lim} inclusos escolhidos<small>Cada item a mais: ${brl(p.precoAdicional)}</small>`
      : `${escolhidos - lim} ${escolhidos - lim === 1 ? "item" : "itens"} a mais · +${brl((escolhidos - lim) * (Number(p.precoAdicional) || 0))}<small>${lim} inclusos no tamanho escolhido</small>`;
  $("prog").classList.toggle("passou", passou);
}

$("telaMontagem").addEventListener("click", (e) => {
  if (e.target === $("telaMontagem") || e.target.closest("[data-sair]")) return fecharMontagem();
  const t = e.target.closest("[data-tam]");
  if (t) {
    mont.obs = $("obsItem").value;
    mont.idx = Number(t.dataset.tam);
    const rolagem = $("telaMontagem").scrollTop;
    renderMontagem();
    $("telaMontagem").scrollTop = rolagem;
    return;
  }
  if (e.target.closest("#btnAdicionar")) confirmarMontagem();
});

$("telaMontagem").addEventListener("change", (e) => {
  const input = e.target;
  if (!input.name?.startsWith("g_")) return;
  const g = grupos.get(input.closest("[data-grupo]").dataset.grupo);
  const p = produtoAtual();
  const set = new Set(marcados(g));
  if (input.type === "radio") { set.clear(); set.add(input.value); }
  else if (input.checked) {
    const semMax = g.contaLimite && limiteDe(p);
    const max = Number(g.max) || 1;
    if (!semMax && set.size >= max) {
      input.checked = false;
      return avisar(`Em "${g.titulo}" você pode escolher até ${max} ${max === 1 ? "opção" : "opções"}.`);
    }
    set.add(input.value);
  } else set.delete(input.value);
  mont.sel.set(g.id, set);
  atualizarMontagem();
});

function confirmarMontagem() {
  const p = produtoAtual();
  for (const g of gruposDe(p)) {
    const min = Number(g.min) || 0;
    if (marcados(g).size < min) {
      document.querySelector(`[data-grupo="${CSS.escape(g.id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return avisar(min === 1 ? `Escolha uma opção em "${g.titulo}".` : `Escolha pelo menos ${min} opções em "${g.titulo}".`);
    }
  }
  const { selecionados, extras } = calcular();
  adicionarAoCarrinho({ nome: p.nome, precoBase: Number(p.preco), complementos: selecionados, extras, observacao: $("obsItem").value.trim() });
  fecharMontagem();
}

// ----------------------
// Sacola
// ----------------------
function adicionarAoCarrinho({ nome, precoBase, complementos = [], extras = 0, observacao = "" }) {
  const preco = Number(precoBase) + Number(extras);
  carrinho.push({ nome, precoBase, complementos, preco, quantidade: 1, subtotal: preco, observacao });
  atualizarCarrinho();
  toast(`${nome} na sacola`);
}

function linhaItem(item, i, removivel) {
  const det = [...descreverComplementos(item), item.observacao ? `Obs: ${item.observacao}` : ""].filter(Boolean);
  return `<div class="it"><div style="flex:1">
      <p class="nome">${esc(item.nome)}</p>
      ${det.length ? `<p class="det">${det.map(esc).join("<br>")}</p>` : ""}
      ${removivel ? `<button class="rem" data-rem="${i}">Remover</button>` : ""}
    </div><span class="val">${brl(item.subtotal)}</span></div>`;
}

function atualizarCarrinho() {
  const qtd = carrinho.reduce((s, i) => s + (i.quantidade || 1), 0);
  const total = totalProdutos();
  $("qtdTopo").textContent = qtd;
  $("qtdTopo").classList.toggle("oculto", !qtd);
  $("barraSacola").classList.toggle("oculto", !qtd);
  $("barraQtd").textContent = qtd === 1 ? "1 item" : `${qtd} itens`;
  $("barraTotal").textContent = brl(total);
  $("itensSacola").innerHTML = carrinho.length
    ? carrinho.map((it, i) => linhaItem(it, i, true)).join("")
    : '<p class="vazio">Sua sacola está vazia.</p>';
  $("totalSacola").textContent = brl(total);
  $("resProdutos").textContent = brl(total);
  $("resTaxa").textContent = brl(taxaAtual());
  $("resTotal").textContent = brl(total + taxaAtual());
  gravarJSON("carrinho", carrinho);
}

$("itensSacola").addEventListener("click", (e) => {
  const b = e.target.closest("[data-rem]");
  if (!b) return;
  carrinho.splice(Number(b.dataset.rem), 1);
  atualizarCarrinho();
  if (!carrinho.length) esconder("jSacola");
});

const abrirSacola = () => { atualizarCarrinho(); mostrar("jSacola"); };
$("btnSacolaTopo").addEventListener("click", abrirSacola);
$("barraSacola").addEventListener("click", abrirSacola);

// fechar/voltar nas janelas de baixo
document.querySelectorAll(".fundo").forEach((f) => f.addEventListener("click", (e) => {
  if (e.target === f || e.target.closest("[data-fechar]")) f.classList.add("oculto");
  const v = e.target.closest("[data-voltar]");
  if (v) { f.classList.add("oculto"); mostrar(v.dataset.voltar); }
}));

// ----------------------
// Fluxo do pedido
// ----------------------
$("btnAvancar").addEventListener("click", async () => {
  if (!carrinho.length) return avisar("Sua sacola está vazia!");
  try {
    const snap = await getDoc(doc(db, "config", "estadoPedidos"));
    lojaAberta = snap.exists() ? snap.data().recebendo !== false : true;
  } catch (err) { console.warn("Não foi possível verificar o status da loja:", err); }
  if (!lojaAberta) return avisar("A loja está fechada para pedidos no momento.");
  esconder("jSacola");
  mostrar("jReceber");
});

$("jReceber").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tipo]");
  if (!b) return;
  tipoPedido = b.dataset.tipo;
  const entrega = tipoPedido === "entrega";
  $("blocoEndereco").classList.toggle("oculto", !entrega);
  $("linhaTaxa").classList.toggle("oculto", !entrega);
  const salvo = lerJSON("cliente", {});
  if (!$("nomeCliente").value) $("nomeCliente").value = salvo.nome || "";
  if (!$("telCliente").value) $("telCliente").value = salvo.tel || "";
  if (!$("enderecoCliente").value) $("enderecoCliente").value = salvo.endereco || "";
  atualizarCarrinho();
  esconder("jReceber");
  mostrar("jDados");
});

$("formaPagamento").addEventListener("change", () => {
  const dinheiro = $("formaPagamento").value === "Dinheiro";
  $("blocoTroco").classList.toggle("oculto", !dinheiro);
  if (!dinheiro) { $("precisaTroco").checked = false; $("valorTroco").value = ""; esconder("valorTroco"); }
});
$("precisaTroco").addEventListener("change", () => $("valorTroco").classList.toggle("oculto", !$("precisaTroco").checked));

// ----------------------
// Acompanhamento do pedido ao vivo
// O cardápio cria "acompanhamento/{código aleatório}" (sem telefone/endereço) e guarda o código neste celular.
// O painel atualiza a etapa quando o operador clica "Recebido", "Saiu p/ entrega"/"Pronto", "Concluir" ou "Cancelar".
// ----------------------
let tempoEntregaTxt = "";
let acomp = lerJSON("acompanhamento", null);   // { token, criado }
let acompDados = null;
let pararAcomp = null;
const DOZE_HORAS = 12 * 60 * 60 * 1000;

const hora = (t) => (t?.toDate ? t.toDate() : null);
const hhmm = (d) => d ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
const somaMin = (d, m) => new Date(d.getTime() + m * 60000);

function previsaoEntrega(d) {
  const nums = String(d.tempoEntrega || "").match(/\d+/g);
  const base = hora(d.horarios?.enviado) || hora(d.criadoEm);
  if (!nums || !base) return "";
  const a = Number(nums[0]), b = Number(nums[1] || nums[0]);
  return a === b ? hhmm(somaMin(base, a)) : `${hhmm(somaMin(base, a))} – ${hhmm(somaMin(base, b))}`;
}

const ILU_MOTO = `<svg width="170" height="120" viewBox="0 0 170 120" aria-hidden="true">
  <path d="M8 104h154" stroke="#d9c6d3" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 10"/>
  <circle cx="42" cy="88" r="17" fill="#2b0d28"/><circle cx="42" cy="88" r="7" fill="#f6efe6"/>
  <circle cx="128" cy="88" r="17" fill="#2b0d28"/><circle cx="128" cy="88" r="7" fill="#f6efe6"/>
  <path d="M40 86l20-30h40l14 30z" fill="#a8409a"/><path d="M100 56l10-20h12" fill="none" stroke="#2b0d28" stroke-width="6" stroke-linecap="round"/>
  <rect x="54" y="30" width="38" height="30" rx="6" fill="#3a1236"/><path d="M62 40h22" stroke="#f6efe6" stroke-width="3" stroke-linecap="round"/>
  <circle cx="104" cy="22" r="10" fill="#f2d49b"/><path d="M96 20a10 10 0 0 1 18-4" fill="#2b0d28"/>
  <path d="M150 60h14M146 72h18M152 48h10" stroke="#a8409a" stroke-width="3" stroke-linecap="round" opacity=".45"/></svg>`;

function etapasDe(d) {
  const entrega = d.tipo === "entrega";
  return [
    { id: "enviado",    nome: "Pedido enviado",                               desc: "Aguardando a loja confirmar" },
    { id: "preparando", nome: "Preparando",                                   desc: "Montando o seu açaí" },
    { id: entrega ? "saiu" : "pronto", nome: entrega ? "Saiu para entrega" : "Pronto para retirar",
      desc: entrega ? "A caminho do seu endereço" : "Pode vir buscar no balcão" }
  ];
}

function textosDe(d) {
  const entrega = d.tipo === "entrega";
  return {
    enviado:    ["Pedido <i>enviado</i>", "Assim que a loja confirmar, esta tela muda sozinha. Se ainda não enviou a mensagem no WhatsApp, finalize por lá."],
    preparando: ["Seu açaí está sendo <i>preparado</i>", "A loja já recebeu e está montando tudo do jeitinho que você pediu."],
    saiu:       ["Saiu para <i>entrega!</i>", "O entregador já está a caminho. Deixe o celular por perto."],
    pronto:     ["Pronto para <i>retirar!</i>", "Seu pedido está esperando por você no balcão."],
    concluido:  [entrega ? "Pedido <i>entregue</i>" : "Pedido <i>retirado</i>", "Obrigado pela preferência! Bom apetite. 💜"],
    cancelado:  ["Pedido <i>cancelado</i>", "Se tiver alguma dúvida, fale com a loja pelo WhatsApp."]
  }[d.status] || ["Acompanhe seu <i>pedido</i>", ""];
}

function renderAcomp() {
  const d = acompDados;
  if (!d) return;
  const [titulo, sub] = textosDe(d);
  const etapas = etapasDe(d);
  const ordem = { enviado: 0, preparando: 1, saiu: 2, pronto: 2, concluido: 3 };
  const atual = ordem[d.status] ?? 0;
  const cancelado = d.status === "cancelado";
  const entrega = d.tipo === "entrega";
  const prev = entrega && ["enviado", "preparando"].includes(d.status) ? previsaoEntrega(d) : "";
  const chip = cancelado || d.status === "concluido" ? ""
    : prev ? `🛵 Previsão de entrega: <b>${prev}</b>`
    : d.status === "saiu" ? "🛵 A caminho · chega em breve"
    : d.status === "pronto" ? "🛍️ Pode vir buscar" : "";
  const palco = d.status === "saiu" ? ILU_MOTO : iluCategoria({ ilu: "tigela" }, 160);
  const troco = d.valorTroco ? ` · troco para ${brl(d.valorTroco)}` : "";

  $("telaAcomp").innerHTML = `
    <div class="montagem acomp ${cancelado ? "cancelado" : ""} ${d.status === "concluido" ? "fim" : ""}">
      <div class="acomp-topo"><img src="img/logo-192.png" alt=""><span>Nosso Açaí</span>
        <button class="fechar" data-sair-acomp aria-label="Fechar">✕</button></div>
      <div class="acomp-palco"><span class="onda b"></span><span class="onda"></span>${palco}</div>
      <p class="acomp-num">${d.num ? `Pedido #${d.num}` : "Seu pedido"}${hora(d.criadoEm) ? ` · ${hhmm(hora(d.criadoEm))}` : ""}</p>
      <h2 class="acomp-titulo">${titulo}</h2>
      <p class="acomp-sub">${esc(sub)}</p>
      ${chip ? `<div class="acomp-chip"><span>${chip}</span></div>` : ""}
      ${cancelado ? "" : `<div class="passos">${etapas.map((e, i) => {
        const cls = i < atual || (i === atual && d.status === "concluido") ? "ok" : i === atual ? "agora" : "fut";
        const h = hhmm(hora(d.horarios?.[e.id]));
        return `<div class="p ${cls}"><span class="bola">${cls === "ok" ? "✓" : ""}</span>
          <p class="t">${cls === "agora" ? `<b>${e.nome}</b>` : e.nome}${cls === "agora" ? `<small>${e.desc}</small>` : ""}</p>
          <span class="h">${h}</span></div>`;
      }).join("")}</div>`}
      <div class="acomp-resumo"><span>${esc(d.resumo || "")}<small>${esc(d.pagamento || "")}${troco}</small></span><b>${brl(d.total)}</b></div>
      <div class="acomp-acoes">
        <a class="btn-sec" href="https://wa.me/${LOJA.whatsapp}?text=${encodeURIComponent(`Olá! Sobre o meu pedido${d.num ? ` #${d.num}` : ""}…`)}" target="_blank" rel="noopener">💬 Falar com a loja</a>
        <button class="btn-pri centro" data-sair-acomp>Voltar ao cardápio</button>
      </div>
    </div>`;
  renderBarraAcomp();
}

function acompAtivo() {
  if (!acomp?.token) return false;
  if (Date.now() - (acomp.criado || 0) > DOZE_HORAS) return false;
  return true;
}

function renderBarraAcomp() {
  const d = acompDados;
  const mostrarBarra = acompAtivo() && d && !["concluido", "cancelado"].includes(d.status) && $("telaAcomp").classList.contains("oculto");
  $("barraAcomp").classList.toggle("oculto", !mostrarBarra);
  if (!mostrarBarra) return;
  const txt = { enviado: ["📨", "Pedido enviado", "Aguardando a loja confirmar"],
                preparando: ["🍇", "Seu açaí está sendo preparado", d.tipo === "entrega" && previsaoEntrega(d) ? `Previsão: ${previsaoEntrega(d)}` : "Toque para acompanhar"],
                saiu: ["🛵", "Seu pedido saiu para entrega", "Chega em breve"],
                pronto: ["🛍️", "Pronto para retirar", "Pode vir buscar no balcão"] }[d.status] || ["📦", "Acompanhe seu pedido", ""];
  $("barraAcomp").innerHTML = `<span class="ic">${txt[0]}</span>
    <span class="tx"><span class="ao-vivo"></span>${d.num ? `#${d.num} · ` : ""}${txt[1]}<small>${txt[2]}</small></span><span class="ver">Ver</span>`;
}

function escutarAcomp() {
  pararAcomp?.();
  pararAcomp = null;
  if (!acompAtivo()) { acompDados = null; renderBarraAcomp(); return; }
  pararAcomp = onSnapshot(doc(db, "acompanhamento", acomp.token), (snap) => {
    if (!snap.exists()) return;
    acompDados = snap.data();
    if (!$("telaAcomp").classList.contains("oculto")) renderAcomp(); else renderBarraAcomp();
  }, (e) => console.warn("Acompanhamento indisponível:", e));
}

function abrirAcomp() {
  if (!acompAtivo()) return;
  if (acompDados) renderAcomp();
  else $("telaAcomp").innerHTML = '<div class="montagem acomp"><p class="vazio" style="padding-top:120px">Carregando seu pedido…</p></div>';
  mostrar("telaAcomp");
  $("telaAcomp").scrollTop = 0;
  document.body.style.overflow = "hidden";
  renderBarraAcomp();
}

function fecharAcomp() {
  esconder("telaAcomp");
  document.body.style.overflow = "";
  renderBarraAcomp();
}

$("telaAcomp").addEventListener("click", (e) => { if (e.target.closest("[data-sair-acomp]")) fecharAcomp(); });
$("barraAcomp").addEventListener("click", abrirAcomp);

let pedidoPronto = null;

$("btnContinuar").addEventListener("click", () => {
  const nome = $("nomeCliente").value.trim();
  const tel = $("telCliente").value.trim();
  const endereco = $("enderecoCliente").value.trim();
  const pagamento = $("formaPagamento").value;
  const entrega = tipoPedido === "entrega";
  const valorFinal = totalProdutos() + taxaAtual();
  if (!nome) return avisar("Informe seu nome.");
  if (tel.replace(/\D/g, "").length < 10) return avisar("Informe um telefone válido com DDD.");
  if (entrega && !endereco) return avisar("Informe o endereço de entrega.");
  if (!pagamento) return avisar("Selecione a forma de pagamento.");
  let valorTroco = null;
  if ($("precisaTroco").checked) {
    valorTroco = parseFloat(String($("valorTroco").value).replace(",", "."));
    if (!(valorTroco > valorFinal)) return avisar(`O valor para troco deve ser maior que ${brl(valorFinal)}.`);
  }
  gravarJSON("cliente", { nome, tel, endereco });
  pedidoPronto = { tipo: tipoPedido, nome, tel, endereco: entrega ? endereco : "", pagamento, valorTroco,
                   taxa: taxaAtual(), totalProdutos: totalProdutos(), valorFinal, itens: carrinho.map((i) => ({ ...i })) };

  $("confDados").innerHTML = `
    <b>${esc(nome)}</b> · ${esc(tel)}<br>
    ${entrega ? `🛵 Entrega em ${esc(endereco)}` : "🏃 Retirada no balcão"}<br>
    💳 ${esc(pagamento)}${valorTroco ? ` · troco para ${brl(valorTroco)}` : ""}`;
  $("confItens").innerHTML = pedidoPronto.itens.map((it, i) => linhaItem(it, i, false)).join("");
  $("confResumo").innerHTML = `
    <p><span>Produtos</span><span>${brl(pedidoPronto.totalProdutos)}</span></p>
    ${entrega ? `<p><span>Entrega</span><span>${brl(pedidoPronto.taxa)}</span></p>` : ""}
    <p class="total"><span>Total</span><span>${brl(valorFinal)}</span></p>`;
  esconder("jDados");
  mostrar("jConfirmar");
});

function montarMensagemWhatsApp(p) {
  const entrega = p.tipo === "entrega";
  let m = `📦 *Novo Pedido* (${entrega ? "ENTREGA" : "RETIRADA"})\n\n`;
  m += `👤 Cliente: ${p.nome}\n📞 Tel: ${p.tel}`;
  if (entrega) m += `\n🏠 Endereço: ${p.endereco}`;
  m += `\n\n🛒 *Itens:*\n`;
  p.itens.forEach((item) => {
    m += `\n• *${item.nome}* — ${brl(item.subtotal)}`;
    descreverComplementos(item).forEach((l) => (m += `\n   ↳ ${l}`));
    if (item.observacao) m += `\n   ↳ Obs: ${item.observacao}`;
  });
  m += `\n\nProdutos: ${brl(p.totalProdutos)}`;
  if (entrega) m += `\n🚚 Entrega: ${brl(p.taxa)}`;
  m += `\n💰 *Total: ${brl(p.valorFinal)}*`;
  m += `\n💳 Pagamento: ${p.pagamento}`;
  if (p.valorTroco) m += `\n💵 Troco para ${brl(p.valorTroco)} (levar ${brl(p.valorTroco - p.valorFinal)})`;
  m += `\n\n🙏 Obrigado pela preferência!\n💜 *${LOJA.nome}*`;
  return m;
}

$("btnEnviar").addEventListener("click", async () => {
  const btn = $("btnEnviar");
  if (btn.disabled || !pedidoPronto) return;
  btn.disabled = true;
  // Abre a aba antes do "await": se abrir depois, o navegador do celular bloqueia o pop-up
  const janela = window.open("", "_blank");
  const d = pedidoPronto;
  try {
    // acompanhamento ao vivo: se falhar (ex.: regras ainda sem "acompanhamento"), o pedido segue normalmente
    let token = null;
    try {
      const ref = doc(collection(db, "acompanhamento"));
      await setDoc(ref, {
        status: "enviado", tipo: d.tipo, total: d.valorFinal, pagamento: d.pagamento, valorTroco: d.valorTroco || null,
        resumo: d.itens.map((i) => i.nome).join(" + "), tempoEntrega: tempoEntregaTxt,
        criadoEm: serverTimestamp(), horarios: { enviado: serverTimestamp() }
      });
      token = ref.id;
    } catch (e) { console.warn("Acompanhamento indisponível:", e); }
    await addDoc(collection(db, "orders"), {
      ...(token && { acompanhamento: token }),
      items: d.itens,
      totalProdutos: d.totalProdutos.toFixed(2),
      taxaEntrega: d.taxa,
      totalFinal: d.valorFinal.toFixed(2),
      precisaTroco: !!d.valorTroco,
      valorTroco: d.valorTroco,
      status: "pendente",
      createdAt: serverTimestamp(),
      formaPagamento: d.pagamento,
      nomeCliente: d.nome,
      telefoneCliente: d.tel,
      enderecoCliente: d.endereco,
      tipo: d.tipo
    });
    const url = `https://wa.me/${LOJA.whatsapp}?text=${encodeURIComponent(montarMensagemWhatsApp(d))}`;
    if (janela) janela.location.href = url; else window.location.href = url;
    carrinho = [];
    pedidoPronto = null;
    $("formaPagamento").value = "";
    $("formaPagamento").dispatchEvent(new Event("change"));
    atualizarCarrinho();
    esconder("jConfirmar");
    if (token) {
      acomp = { token, criado: Date.now() };
      gravarJSON("acompanhamento", acomp);
      acompDados = null;
      escutarAcomp();
      abrirAcomp();
    } else mostrar("jSucesso");
  } catch (err) {
    console.error(err);
    janela?.close();
    avisar("Erro ao enviar o pedido. Tente novamente.");
  } finally {
    btn.disabled = false;
  }
});

// ----------------------
// Avisos
// ----------------------
function avisar(msg) { $("textoAviso").textContent = msg; mostrar("jAviso"); }
$("btnAvisoOk").addEventListener("click", () => esconder("jAviso"));
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = `✓ ${msg}`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

// ----------------------
// Firebase ao vivo
// ----------------------
onSnapshot(collection(db, "produtos"), (snap) => {
  produtos = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.status === "ativo")
    .sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999) || String(a.nome).localeCompare(String(b.nome), "pt-BR"));
  renderLista();
}, (e) => { console.error("Erro ao carregar produtos:", e); $("lista").innerHTML = '<p class="vazio">Não foi possível carregar o cardápio.</p>'; });

onSnapshot(collection(db, "gruposOpcoes"), (snap) => {
  grupos.clear();
  // itens marcados como esgotados no painel não aparecem para o cliente
  snap.forEach((d) => { const g = d.data(); grupos.set(d.id, { id: d.id, ...g, itens: (g.itens || []).filter((i) => !i.esgotado) }); });
  renderLista();
}, (e) => console.error("Erro ao carregar opções:", e));

onSnapshot(doc(db, "config", "estadoPedidos"), (snap) => {
  lojaAberta = snap.exists() ? snap.data().recebendo !== false : true;
  $("avisoFechado").classList.toggle("oculto", lojaAberta);
  $("pontoAberto").classList.toggle("off", !lojaAberta);
  $("textoAberto").textContent = lojaAberta ? "Aberto agora" : "Fechado agora";
});

onSnapshot(doc(db, "config", "entrega"), (snap) => {
  const d = snap.exists() ? snap.data() : {};
  const taxa = Number(d.taxaEntrega);
  if (d.taxaEntrega !== undefined && d.taxaEntrega !== "" && Number.isFinite(taxa) && taxa >= 0) LOJA.taxaEntrega = taxa;
  $("textoTaxa").textContent = LOJA.taxaEntrega ? brl(LOJA.taxaEntrega) : "grátis";
  $("taxaReceber").textContent = LOJA.taxaEntrega ? `taxa ${brl(LOJA.taxaEntrega)}` : "grátis";
  const tempo = String(d.tempoEntrega || "").trim();
  tempoEntregaTxt = tempo;
  $("textoTempo").textContent = tempo;
  $("blocoTempo").classList.toggle("oculto", !tempo);
  atualizarCarrinho();
}, (e) => console.error("Erro ao carregar dados de entrega:", e));

// ----------------------
// PWA
// ----------------------
let pedidoInstalacao;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); pedidoInstalacao = e; mostrar("btnInstalar"); });
$("btnInstalar").addEventListener("click", async () => {
  if (!pedidoInstalacao) return;
  pedidoInstalacao.prompt();
  await pedidoInstalacao.userChoice;
  pedidoInstalacao = null;
  esconder("btnInstalar");
});
window.addEventListener("appinstalled", () => esconder("btnInstalar"));

// Botão "voltar" do celular fecha a montagem em vez de sair do cardápio
window.addEventListener("popstate", () => { if (mont) fecharMontagem(true); });

atualizarCarrinho();
escutarAcomp();
