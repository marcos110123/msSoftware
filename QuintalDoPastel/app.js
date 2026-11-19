// =====================================================================
// Cardápio Quintal do Pastel 1.3.5 — visual do vídeo de abordagem (telas premium)
// Firestore: produtos, opcoesLanche (grupo "extras"), config/estadoPedidos, config/entrega, config/pix,
//            orders (pedido), acompanhamento (status ao vivo, sem telefone/endereço)
// =====================================================================
import { initializeApp, getFirestore, collection, doc, setDoc, onSnapshot, serverTimestamp, query, where } from "./fb.js";
import { firebaseConfig, LOJA } from "./config.js";
import { CATEGORIAS } from "./dados.js";

const db = getFirestore(initializeApp(firebaseConfig));
const $ = (id) => document.getElementById(id);
const brl = (v) => "R$ " + Number(v || 0).toFixed(2).replace(".", ",");
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sem = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const CAT = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]));

// ---------------- modo mesa (QR code colado na mesa: .../QuintalDoPastel/?mesa=5) ----------------
// Regras (19/11, para nunca misturar mesa e delivery):
//  - a mesa vem SÓ do link do QR (?mesa=N); link sem ?mesa = delivery, sempre, em qualquer aba;
//  - a mesa e a sacola dela ficam só nesta aba (sessionStorage); a sacola do delivery fica no celular (localStorage);
//  - aba do QR reaberta depois de 4 h pergunta "Você ainda está na Mesa N?".
const QUATRO_H = 4 * 3600 * 1000;
const ss = {
  get: (k, pad) => { try { return JSON.parse(sessionStorage.getItem(k)) ?? pad; } catch { return pad; } },
  set: (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del: (...ks) => { try { ks.forEach((k) => sessionStorage.removeItem(k)); } catch {} },
};
let mesaConfirmar = false;
const MESA = (() => {
  const q = new URLSearchParams(location.search).get("mesa");
  const valida = q && /^\d{1,3}$/.test(q) && +q >= 1 && +q <= (LOJA.totalMesas || 99);
  if (!valida) { ss.del("quintal-mesa", "quintal-mesa-pedidos", "quintal-sacola-mesa"); return null; }
  const m = String(+q), s = ss.get("quintal-mesa", null);
  if (s?.m === m) {
    if (Date.now() - s.t > QUATRO_H) mesaConfirmar = true; // mesma aba, horas depois: pergunta antes
  } else {
    // mesa nova nesta aba: começa do zero (sem pedidos/sacola de outra mesa)
    ss.del("quintal-mesa-pedidos", "quintal-sacola-mesa");
    ss.set("quintal-mesa", { m, t: Date.now() });
  }
  return m;
})();

const ls = {
  get: (k, pad) => { try { return JSON.parse(localStorage.getItem(k)) ?? pad; } catch { return pad; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
// sacola separada: delivery no celular, mesa só nesta aba
const lerSacola = () => (MESA ? ss.get("quintal-sacola-mesa", []) : ls.get("quintal-sacola", []));
const gravarSacola = (v) => (MESA ? ss.set("quintal-sacola-mesa", v) : ls.set("quintal-sacola", v));

// ---------------- estado ----------------
let PRODUTOS = {};          // id → produto
let EXTRAS = [];            // adicionais ativos
let recebendo = true, entregaPausada = false;
let taxaEntrega = LOJA.taxaPadrao, tempoEntrega = LOJA.tempoPadrao, chavePix = LOJA.pixPadrao, favorecidoPix = "";
let sacola = lerSacola();   // [{chave, id, nome, base, complementos, observacao, preco, quantidade}]
let tipo = MESA ? "mesa" : null, pagamento = null;

// ---------------- topo / rodapé ----------------
if (MESA) {
  document.body.classList.add("modo-mesa");
  $("faixaMesa").innerHTML = `<div class="mesa-num"><small>MESA</small><b>${MESA}</b></div>
    <div class="mesa-txt"><strong>Pedido direto da mesa</strong>
      <div class="mesa-dicas" id="mesaDicas"></div></div>`;
  document.querySelector("#telaSacola .cab-tela h2").innerHTML = `Sua sacola<i class="mesa-chip">Mesa ${MESA}</i>`;
  if (mesaConfirmar) {
    const fundo = document.createElement("div");
    fundo.className = "mesa-pergunta";
    fundo.innerHTML = `<div class="mesa-caixa"><div class="mesa-num"><small>MESA</small><b>${MESA}</b></div>
      <h3>Você ainda está na Mesa ${MESA}?</h3><p>Este link é da mesa do Quintal. Se você está em outro lugar, peça pelo delivery.</p>
      <button class="btn-grad" data-sim>Sim, estou na mesa</button><button class="btn-linha" data-nao>Não, quero delivery</button></div>`;
    document.body.appendChild(fundo);
    document.body.classList.add("travado");
    fundo.querySelector("[data-sim]").onclick = () => {
      ss.set("quintal-mesa", { m: MESA, t: Date.now() });
      ss.del("quintal-mesa-pedidos", "quintal-sacola-mesa"); sacola = []; salvarSacola();
      fundo.remove(); document.body.classList.remove("travado");
    };
    fundo.querySelector("[data-nao]").onclick = () => {
      ss.del("quintal-mesa", "quintal-mesa-pedidos", "quintal-sacola-mesa");
      location.replace(location.pathname); // mesmo cardápio, sem ?mesa = delivery
    };
  }
  $("faixaMesa").classList.remove("hidden");
  $("cNome").placeholder = "Seu nome (opcional)";
  $("rotuloDados").textContent = "QUEM ESTÁ PEDINDO?";
}
$("lojaNome").textContent = LOJA.nome;
$("lojaSub").textContent = LOJA.subtitulo;
const linkWhats = (txt) => `https://wa.me/${LOJA.whats}${txt ? "?text=" + encodeURIComponent(txt) : ""}`;
$("btnWhatsTopo").href = linkWhats();
$("btnInsta").href = `https://instagram.com/${LOJA.instagram}`;
$("rodapeEnd").textContent = LOJA.endereco;
$("rodapeWhats").href = linkWhats();
$("rodapeWhats").textContent = "WhatsApp";
$("rodapeInsta").href = `https://instagram.com/${LOJA.instagram}`;
$("rodapeInsta").textContent = "@" + LOJA.instagram;

// tema claro/escuro: botão no topo, salvo neste celular
const SOL = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const LUA = '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
function mostrarBotaoTema() {
  const escuro = document.documentElement.dataset.tema === "escuro";
  $("btnTema").innerHTML = escuro ? SOL : LUA;
  $("btnTema").title = escuro ? "Usar tema claro" : "Usar tema escuro";
}
$("btnTema").onclick = () => {
  const novo = document.documentElement.dataset.tema === "escuro" ? "claro" : "escuro";
  document.documentElement.dataset.tema = novo;
  try { localStorage.setItem("quintal-tema", novo); } catch {}
  mostrarBotaoTema();
};
mostrarBotaoTema();

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove("on"), 2400);
}

// ---------------- Firestore ----------------
onSnapshot(collection(db, "produtos"), (snap) => {
  PRODUTOS = {};
  snap.forEach((d) => { PRODUTOS[d.id] = { id: d.id, ...d.data() }; });
  desenharCardapio();
}, (e) => { console.error(e); $("secoes").innerHTML = `<p class="carregando">Não foi possível carregar o cardápio. Verifique a internet.</p>`; });

onSnapshot(query(collection(db, "opcoesLanche"), where("grupo", "==", "extras")), (snap) => {
  EXTRAS = [];
  snap.forEach((d) => { const x = d.data(); if (x.status !== "esgotado" && x.status !== "inativo") EXTRAS.push({ id: d.id, ...x }); });
  EXTRAS.sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99) || a.nome.localeCompare(b.nome));
});

onSnapshot(doc(db, "config", "estadoPedidos"), (s) => {
  const d = s.exists() ? s.data() : {};
  recebendo = d.recebendo !== false;
  entregaPausada = d.entregaPausada === true;
  const st = $("statusLoja");
  st.innerHTML = recebendo ? "<i></i> Aberto agora" : "<i></i> Fechado agora";
  st.classList.toggle("fechada", !recebendo);
  $("avisoFechado").classList.toggle("hidden", recebendo);
  $("avisoEntrega").classList.toggle("hidden", !entregaPausada || !recebendo);
  if (entregaPausada && tipo === "entrega") tipo = null;
  desenharCheckout();
});

onSnapshot(doc(db, "config", "entrega"), (s) => {
  const d = s.exists() ? s.data() : {};
  if (d.tempoEntrega) tempoEntrega = d.tempoEntrega;
  const t = Number(d.taxaEntrega ?? d.taxa);
  if (!Number.isNaN(t) && (d.taxaEntrega != null || d.taxa != null)) taxaEntrega = t;
  $("statTempo").textContent = tempoEntrega;
  $("statTaxa").textContent = taxaEntrega ? brl(taxaEntrega) : "Grátis";
  $("endTempo").textContent = "🛵 " + tempoEntrega;
  desenharCheckout();
});

onSnapshot(doc(db, "config", "pix"), (s) => {
  const d = s.exists() ? s.data() : {};
  chavePix = d.chave || LOJA.pixPadrao;
  favorecidoPix = d.favorecido || d.nome || "";
  desenharCheckout();
});

// ---------------- cardápio ----------------
// produto sem foto própria mostra a logo da casa (pedido do usuário, 19/11)
const fotoDe = (p) => p.imagem || "";
// sem foto: selo da marca (logo sobre o degradê), nunca um emoji solto
const tile = (p, cls = "item-foto") => fotoDe(p)
  ? `<img class="${cls}" src="${esc(fotoDe(p))}" alt="" loading="lazy">`
  : `<div class="${cls} sem-foto"><img src="img/logo.webp" alt="" loading="lazy"></div>`;
// nome curto dentro da própria seção de pastéis ("Carne com Queijo" em vez de "Pastel de Carne com Queijo")
const nomeLista = (p) => (/^pasteis-(grandes|pequenos|doces)$/.test(p.categoria) ? p.nome.replace(" (pequeno)", "") : p.nome);
const visivel = (p) => p.status === "ativo" || p.status === "esgotado";
const ordenar = (a, b) => (a.ordem ?? 999) - (b.ordem ?? 999) || a.nome.localeCompare(b.nome);

function desenharCardapio() {
  const termo = sem($("busca").value.trim());
  const todos = Object.values(PRODUTOS).filter(visivel);
  const filtra = (p) => !termo || sem(p.nome + " " + p.descricao + " " + (CAT[p.categoria]?.nome || "")).includes(termo);

  // destaque da casa (X-Gaúcho)
  const top = PRODUTOS[LOJA.destaqueId];
  $("destaqueCasa").innerHTML = top && visivel(top) && !termo ? `
    <button class="dest-grande" data-prod="${top.id}">
      <div class="dest-foto">${tile(top, "")}<span class="selo">🔥 DESTAQUE DA CASA</span>${top.selo ? `<span class="selo dir">${esc(top.selo)}</span>` : ""}
        <div class="dest-nome">${esc(top.nome)}</div></div>
      <div class="dest-corpo"><p>${esc(top.descricao)}</p>
        <div class="dest-pe"><b>${brl(top.preco)}</b><span class="btn-grad">Quero esse +<i class="brilho"></i></span></div></div>
    </button>` : "";

  // carrossel dos mais pedidos (com foto primeiro)
  const dest = todos.filter((p) => p.maisVendido && p.status === "ativo" && p.id !== LOJA.destaqueId)
    .sort((a, b) => (!!b.imagem - !!a.imagem) || ordenar(a, b)).slice(0, 10);
  $("blocoDestaques").classList.toggle("hidden", !dest.length || !!termo);
  $("carrossel").innerHTML = dest.map((p, i) => `
    <button class="mini" data-prod="${p.id}" style="animation-delay:${0.05 * i}s">
      <div class="mini-foto">${tile(p, "")}${i === 0 ? `<span class="selo">MAIS PEDIDO</span>` : p.selo ? `<span class="selo">${esc(p.selo)}</span>` : ""}</div>
      <div class="mini-corpo"><strong>${esc(nomeVitrine(p))}</strong><div class="mini-pe"><b>${brl(p.preco)}</b><span class="mais">+</span></div></div>
    </button>`).join("");

  // seções
  let html = "", alguma = false;
  for (const c of CATEGORIAS) {
    const itens = todos.filter((p) => p.categoria === c.id && filtra(p)).sort(ordenar);
    if (!itens.length) continue;
    alguma = true;
    html += `<section class="secao" id="sec-${c.id}">
      <div class="secao-cab"><h3><span>${c.icone}</span>${esc(c.nome)}</h3><small>${itens.length} ${itens.length > 1 ? "opções" : "opção"}</small></div>
      <div class="lista">${itens.map((p) => `
        <button class="item ${p.status === "esgotado" ? "esgotado" : ""} com-foto" data-prod="${p.id}">
          <div class="item-txt"><strong>${esc(nomeLista(p))}${p.maisVendido ? ` <em class="tag">🔥 Mais pedido</em>` : ""}</strong>${p.descricao ? `<p>${esc(p.descricao)}</p>` : ""}<b>${brl(p.preco)}</b></div>
          ${tile(p)}
          <span class="mais" aria-hidden="true">+</span>
        </button>`).join("")}</div></section>`;
  }
  $("secoes").innerHTML = html;
  $("nadaBusca").classList.toggle("hidden", alguma || !termo);
  if (!Object.keys(PRODUTOS).length) $("secoes").innerHTML = `<p class="carregando">Cardápio em montagem. Volte já já! 🥟</p>`;

  // chips
  const cats = CATEGORIAS.filter((c) => todos.some((p) => p.categoria === c.id));
  $("chips").innerHTML = cats.map((c) => `<button class="chip" data-cat="${c.id}">${c.icone} ${esc(c.nome)}</button>`).join("");
  marcarChip();
}

// nome mostrado no cardápio: pastéis da lista ganham "Pastel de …"
function nomeVitrine(p) {
  if (p.categoria === "pasteis-grandes" || p.categoria === "pasteis-pequenos" || p.categoria === "pasteis-doces") {
    return /^pastel/i.test(p.nome) ? p.nome : "Pastel de " + p.nome.replace(" (pequeno)", "");
  }
  return p.nome;
}

$("busca").addEventListener("input", () => {
  desenharCardapio();
  if ($("busca").value) $("grudado").scrollIntoView({ behavior: "smooth" });
});

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-prod]");
  if (b) {
    const p = PRODUTOS[b.dataset.prod];
    if (p && CAT[p.categoria]?.direto && !p.escolha?.opcoes?.length) return adicionarDireto(p, b);
    return abrirProduto(b.dataset.prod);
  }
  const c = e.target.closest("[data-cat]");
  if (c) {
    const s = $("sec-" + c.dataset.cat);
    if (s) window.scrollTo({ top: s.getBoundingClientRect().top + scrollY - $("grudado").offsetHeight - 6, behavior: "smooth" });
  }
  const f = e.target.closest("[data-fechar]");
  if (f) fecharTela(f.dataset.fechar);
});

// chip da seção visível
function marcarChip() {
  const alt = $("grudado").offsetHeight + 20;
  let atual = null;
  document.querySelectorAll(".secao").forEach((s) => { if (s.getBoundingClientRect().top <= alt) atual = s.id.slice(4); });
  document.querySelectorAll(".chip").forEach((ch) => {
    const on = ch.dataset.cat === atual;
    if (on && !ch.classList.contains("on")) ch.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    ch.classList.toggle("on", on);
  });
}
// botão "voltar ao topo"
$("btnTopo").onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
const mostrarBtnTopo = () => $("btnTopo").classList.toggle("on", scrollY > 700);
const marcarBarras = () => document.body.classList.toggle("com-barra", !$("barraSacola").classList.contains("hidden"));
let rolando = false;
addEventListener("scroll", () => { if (!rolando) { rolando = true; requestAnimationFrame(() => { marcarChip(); mostrarBtnTopo(); rolando = false; }); } }, { passive: true });

// ---------------- telas cheias (com botão voltar do celular) ----------------
const abertas = [];
function abrirTela(id) {
  $(id).classList.add("aberta");
  $(id).setAttribute("aria-hidden", "false");
  document.body.classList.add("travado");
  if (!abertas.includes(id)) { abertas.push(id); history.pushState({ tela: id }, ""); }
}
function fecharTela(id, doHistorico = false) {
  $(id).classList.remove("aberta");
  $(id).setAttribute("aria-hidden", "true");
  const i = abertas.indexOf(id);
  if (i >= 0) { abertas.splice(i, 1); if (!doHistorico) history.back(); }
  if (!abertas.length) document.body.classList.remove("travado");
}
addEventListener("popstate", () => { const id = abertas[abertas.length - 1]; if (id) fecharTela(id, true); });

// ---------------- produto ----------------
let prod = null, escolha = null, marcados = new Set(), qtd = 1;

function abrirProduto(id) {
  const p = PRODUTOS[id];
  if (!p) return;
  if (p.status === "esgotado") return toast("Esse item está esgotado no momento 😕");
  prod = p; escolha = null; marcados = new Set(); qtd = 1;
  const img = $("prodImg");
  const foto = p.imagem; // sem foto própria: logo da casa (logo-cheia)
  img.src = foto || "img/logo.webp";
  img.classList.toggle("logo-cheia", !foto);
  $("prodNome").textContent = nomeVitrine(p);
  $("prodPreco").textContent = brl(p.preco);
  $("prodDesc").textContent = p.descricao || CAT[p.categoria]?.nome || "";
  $("prodObs").value = "";
  desenharGrupos();
  $("prodRolagem").scrollTop = 0;
  abrirTela("telaProduto");
}

function desenharGrupos() {
  let h = "";
  if (prod.escolha?.opcoes?.length) {
    h += `<div class="grupo"><div class="grupo-cab"><div><strong>${esc(prod.escolha.titulo || "Escolha")}</strong><small>Escolha 1 opção</small></div>
      <span class="etiqueta ${escolha ? "ok" : ""}">${escolha ? "✓ PRONTO" : "OBRIGATÓRIO"}</span></div>
      <div class="opcoes">${prod.escolha.opcoes.map((o) => `<button class="opcao ${escolha === o ? "on" : ""}" data-escolha="${esc(o)}"><i class="marca"></i><span>${esc(o)}</span></button>`).join("")}</div></div>`;
  }
  if (CAT[prod.categoria]?.adicionais && EXTRAS.length) {
    h += `<div class="grupo"><div class="grupo-cab"><div><strong>Turbine seu pedido</strong><small>Adicionais opcionais</small></div><span class="etiqueta">${marcados.size ? marcados.size + " ✓" : "OPCIONAL"}</span></div>
      <div class="opcoes">${EXTRAS.map((x) => `<button class="opcao caixa ${marcados.has(x.id) ? "on" : ""}" data-extra="${x.id}"><i class="marca"></i><span>${esc(x.nome)}</span><em>+ ${brl(x.valor)}</em></button>`).join("")}</div></div>`;
  }
  $("prodGrupos").innerHTML = h;
  atualizarBotaoAdd();
}

$("prodGrupos").addEventListener("click", (e) => {
  const o = e.target.closest("[data-escolha]");
  if (o) { escolha = o.dataset.escolha; desenharGrupos(); return; }
  const x = e.target.closest("[data-extra]");
  if (x) { marcados.has(x.dataset.extra) ? marcados.delete(x.dataset.extra) : marcados.add(x.dataset.extra); desenharGrupos(); }
});

const extrasMarcados = () => EXTRAS.filter((x) => marcados.has(x.id));
const precoUnit = () => Number(prod.preco || 0) + extrasMarcados().reduce((s, x) => s + Number(x.valor || 0), 0);
const falta = () => prod.escolha?.opcoes?.length && !escolha;

function atualizarBotaoAdd() {
  $("prodQtd").textContent = qtd;
  const b = $("btnAdd");
  b.classList.remove("feito");
  b.classList.toggle("bloq", !!falta());
  $("btnAddTxt").textContent = falta() ? (prod.escolha.titulo || "Escolha uma opção") : `Adicionar · ${brl(precoUnit() * qtd)}`;
}
$("prodMenos").onclick = () => { if (qtd > 1) { qtd--; atualizarBotaoAdd(); } };
$("prodMais").onclick = () => { if (qtd < 50) { qtd++; atualizarBotaoAdd(); } };

$("btnAdd").onclick = () => {
  if (falta()) {
    toast((prod.escolha.titulo || "Escolha uma opção") + " 👆");
    $("prodGrupos").querySelector(".grupo")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  const complementos = [
    ...(escolha ? [{ grupo: prod.escolha.titulo || "Escolha", nome: escolha, preco: 0 }] : []),
    ...extrasMarcados().map((x) => ({ grupo: "Adicionais", nome: x.nome, preco: Number(x.valor || 0) })),
  ];
  const observacao = $("prodObs").value.trim();
  const base = nomeVitrine(prod);
  const item = {
    id: prod.id, base, complementos, observacao, preco: Number(precoUnit().toFixed(2)), quantidade: qtd,
    foto: fotoDe(prod), icone: CAT[prod.categoria]?.icone || "🍽️",
  };
  item.chave = JSON.stringify([item.id, complementos.map((c) => c.nome), observacao]);
  const igual = sacola.find((i) => i.chave === item.chave);
  if (igual) igual.quantidade += qtd; else sacola.push(item);
  salvarSacola();
  $("btnAdd").classList.add("feito");
  $("btnAddTxt").textContent = "✓ Adicionado!";
  setTimeout(() => fecharTela("telaProduto"), 450);
  const bs = $("barraSacola"); bs.classList.remove("pula"); void bs.offsetWidth; bs.classList.add("pula");
};

// bebidas, sucos, pastéis doces, panquecas e porções: um toque e já vai 1 para a sacola
function adicionarDireto(p, botao) {
  if (p.status === "esgotado") return toast("Esse item está esgotado no momento 😕");
  const base = nomeVitrine(p);
  const chave = JSON.stringify([p.id, [], ""]);
  const igual = sacola.find((i) => i.chave === chave);
  if (igual) igual.quantidade += 1;
  else sacola.push({ id: p.id, base, complementos: [], observacao: "", preco: Number(Number(p.preco || 0).toFixed(2)), quantidade: 1, foto: fotoDe(p), icone: CAT[p.categoria]?.icone || "🍽️", chave });
  salvarSacola();
  const n = (igual?.quantidade) || 1;
  toast(`✓ ${base}${n > 1 ? ` (${n} na sacola)` : " na sacola"}`);
  const mais = botao.querySelector(".mais");
  if (mais) { mais.classList.add("ok"); mais.textContent = "✓"; setTimeout(() => { mais.classList.remove("ok"); mais.textContent = "+"; }, 900); }
  const bs = $("barraSacola"); bs.classList.remove("pula"); void bs.offsetWidth; bs.classList.add("pula");
}

// nome gravado no pedido (o painel e a comanda leem "nome"): "Hot Dog Tradicional (Frango) + (Bacon) - Obs: sem cebola"
function nomePedido(i) {
  const esc1 = i.complementos.filter((c) => c.grupo !== "Adicionais").map((c) => c.nome);
  const ad = i.complementos.filter((c) => c.grupo === "Adicionais").map((c) => c.nome);
  // um parêntese só (a comanda do painel lista cada parte numa linha): "Hot Dog Tradicional (Frango, + Bacon) - Obs: sem cebola"
  const partes = [...esc1, ...ad.map((n) => "+ " + n)];
  return i.base + (partes.length ? ` (${partes.join(", ")})` : "") + (i.observacao ? ` - Obs: ${i.observacao}` : "");
}

// ---------------- sacola ----------------
function salvarSacola() { gravarSacola(sacola); desenharSacola(); if (MESA) atualizarBotoesMesa(); marcarBarras(); }
const qtdSacola = () => sacola.reduce((s, i) => s + i.quantidade, 0);
const subtotal = () => Number(sacola.reduce((s, i) => s + i.preco * i.quantidade, 0).toFixed(2));
const taxaAtual = () => (tipo === "entrega" ? Number(taxaEntrega || 0) : 0);

function desenharSacola() {
  const n = qtdSacola();
  $("barraSacola").classList.toggle("hidden", !n);
  $("bsQtd").textContent = n;
  $("bsTotal").textContent = brl(subtotal());
  $("sacolaBadge").textContent = n;
  $("listaSacola").innerHTML = n ? sacola.map((i, k) => `
    <div class="linha-sacola">
      ${i.foto ? `<img class="item-foto" src="${esc(i.foto)}" alt="">` : `<div class="item-foto sem-foto"><img src="img/logo.webp" alt=""></div>`}
      <div class="ls-txt"><strong><i>${i.quantidade}x</i> ${esc(i.base)}</strong>
        ${i.complementos.length ? `<small>${esc(i.complementos.map((c) => c.nome + (c.preco ? " +" + brl(c.preco) : "")).join(" · "))}</small>` : ""}
        ${i.observacao ? `<small>Obs.: ${esc(i.observacao)}</small>` : ""}<b>${brl(i.preco * i.quantidade)}</b></div>
      <div class="qtd-mini"><button data-menos="${k}" aria-label="Menos">${i.quantidade > 1 ? "−" : "🗑"}</button><b>${i.quantidade}</b><button data-mais="${k}" aria-label="Mais">+</button></div>
    </div>`).join("") : `<p class="vazio">Sua sacola está vazia 🥟</p>`;
  desenharCheckout();
}
$("listaSacola").addEventListener("click", (e) => {
  const m = e.target.closest("[data-menos]"), p = e.target.closest("[data-mais]");
  if (m) { const i = sacola[+m.dataset.menos]; if (--i.quantidade < 1) sacola.splice(+m.dataset.menos, 1); salvarSacola(); }
  if (p) { sacola[+p.dataset.mais].quantidade++; salvarSacola(); }
});
$("barraSacola").onclick = () => { desenharSacola(); abrirTela("telaSacola"); };

// dados do cliente guardados no celular
const cli = ls.get("quintal-cliente", {});
[["cNome", "nome"], ["cTel", "tel"], ["cRua", "rua"], ["cNum", "numero"], ["cBairro", "bairro"], ["cRef", "ref"]].forEach(([id, k]) => {
  $(id).value = cli[k] || "";
  $(id).addEventListener("input", () => { cli[k] = $(id).value; ls.set("quintal-cliente", cli); $(id).classList.remove("erro"); });
});
$("cTel").addEventListener("input", () => {
  const d = $("cTel").value.replace(/\D/g, "").slice(0, 11);
  $("cTel").value = d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
});

$("tipoPedido").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tipo]");
  if (!b || b.disabled) return;
  tipo = b.dataset.tipo; desenharCheckout();
});
$("pagamento").addEventListener("click", (e) => {
  const b = e.target.closest("[data-pag]");
  if (!b) return;
  pagamento = b.dataset.pag; desenharCheckout();
});
$("precisaTroco").onchange = () => desenharCheckout();

function desenharCheckout() {
  document.querySelectorAll("#tipoPedido button").forEach((b) => {
    b.classList.toggle("on", b.dataset.tipo === tipo);
    b.disabled = b.dataset.tipo === "entrega" && entregaPausada;
  });
  $("semEntregaNota").classList.toggle("hidden", !entregaPausada);
  $("blocoEndereco").classList.toggle("hidden", tipo !== "entrega");
  document.querySelectorAll("#pagamento button").forEach((b) => b.classList.toggle("on", b.dataset.pag === pagamento));
  $("blocoTroco").classList.toggle("hidden", pagamento !== "Dinheiro");
  $("valorTroco").classList.toggle("hidden", !$("precisaTroco").checked);
  const px = $("blocoPix");
  px.classList.toggle("hidden", pagamento !== "PIX");
  if (pagamento === "PIX") {
    px.innerHTML = chavePix
      ? `<div class="rotulo">CHAVE PIX${favorecidoPix ? " · " + esc(favorecidoPix) : ""}</div><div class="chave">${esc(chavePix)}</div>
         <button type="button" id="copiarPix">Copiar chave PIX</button>
         <div class="pix-obs">Pague ${brl(subtotal() + taxaAtual())} e envie o comprovante no WhatsApp da loja para confirmar o pedido.</div>`
      : `<div class="pix-obs">A chave PIX aparece aqui assim que a loja cadastrar. Você também pode pagar o PIX na entrega/retirada.</div>`;
    const cp = $("copiarPix");
    if (cp) cp.onclick = () => copiar(chavePix);
  }
  $("rSub").textContent = brl(subtotal());
  $("linhaTaxa").classList.toggle("hidden", tipo !== "entrega");
  $("rTaxa").textContent = taxaAtual() ? brl(taxaAtual()) : "Grátis";
  $("rTotal").textContent = brl(subtotal() + taxaAtual());
  $("btnPedidoTxt").textContent = enviando ? "Enviando…" : MESA ? `Enviar para a cozinha · ${brl(subtotal())}` : `Fazer pedido · ${brl(subtotal() + taxaAtual())}`;
}

async function copiar(t) {
  try { await navigator.clipboard.writeText(t); }
  catch { const a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); document.execCommand("copy"); a.remove(); }
  toast("Chave PIX copiada ✓");
}

// ---------------- enviar pedido ----------------
let enviando = false, idPendente = null, tokenPendente = null, tentativas = 0;

function validar() {
  if (!sacola.length) return "Sua sacola está vazia.";
  if (!recebendo) return "A loja está fechada agora. Os pedidos voltam quando abrirmos 🙂";
  if (MESA) return "";
  if (!tipo) return "Escolha: entrega ou retirada.";
  if (tipo === "entrega" && entregaPausada) return "As entregas estão pausadas. Escolha retirar no balcão.";
  const req = [["cNome", 2, "Digite seu nome."], ["cTel", 14, "Digite seu WhatsApp com DDD."]];
  if (tipo === "entrega") req.push(["cRua", 3, "Digite a rua."], ["cNum", 1, "Digite o número (ou S/N)."], ["cBairro", 2, "Digite o bairro."]);
  for (const [id, min, msg] of req) {
    if ($(id).value.trim().length < min) { $(id).classList.add("erro"); $(id).focus(); return msg; }
  }
  if (!pagamento) return "Escolha a forma de pagamento.";
  if (pagamento === "Dinheiro" && $("precisaTroco").checked) {
    const v = parseFloat($("valorTroco").value.replace(",", "."));
    if (!(v > subtotal() + taxaAtual())) return "O troco precisa ser maior que o total.";
  }
  return "";
}

$("btnPedido").onclick = async () => {
  if (enviando) return;
  const erro = validar();
  if (erro) return toast(erro);
  const sub = subtotal(), taxa = taxaAtual(), totalFinal = Number((sub + taxa).toFixed(2));
  const precisaTroco = pagamento === "Dinheiro" && $("precisaTroco").checked;
  const valorTroco = precisaTroco ? parseFloat($("valorTroco").value.replace(",", ".")) : null;
  const endereco = tipo === "entrega"
    ? `${$("cRua").value.trim()}, ${$("cNum").value.trim()} - ${$("cBairro").value.trim()}${$("cRef").value.trim() ? " (" + $("cRef").value.trim() + ")" : ""}` : "";
  const itens = sacola.map((i) => ({
    nome: nomePedido(i), preco: i.preco, quantidade: i.quantidade, subtotal: Number((i.preco * i.quantidade).toFixed(2)),
    observacao: i.observacao || "", complementos: i.complementos, produtoId: i.id, produto: i.base,
  }));

  enviando = true; $("btnPedido").disabled = true; desenharCheckout();
  if (MESA) {
    // pedido de mesa: sem entrega, pagamento e acompanhamento — o painel fecha a conta da mesa
    try {
      if (!idPendente) { idPendente = doc(collection(db, "orders")).id; tentativas = 0; }
      tentativas++;
      const nome = $("cNome").value.trim();
      await setDoc(doc(db, "orders", idPendente), {
        mesa: MESA, items: itens, total: sub, totalProdutos: sub.toFixed(2), totalFinal: sub.toFixed(2),
        ...(nome && { nomeCliente: nome, cliente: nome }),
        status: "pendente", createdAt: serverTimestamp(), origem: "cardapio-mesa",
      });
      concluirMesa(itens, sub);
    } catch (e) {
      console.error(e);
      if (tentativas > 1 && e?.code === "permission-denied") concluirMesa(itens, sub);
      else toast("Não foi possível enviar. Confira a internet e toque de novo (não duplica).");
    } finally {
      enviando = false; $("btnPedido").disabled = false; desenharCheckout();
    }
    return;
  }
  try {
    if (!idPendente) { idPendente = doc(collection(db, "orders")).id; tokenPendente = doc(collection(db, "acompanhamento")).id; tentativas = 0; }
    tentativas++;
    // acompanhamento ao vivo (se falhar, o pedido segue normalmente)
    let token = tokenPendente;
    try {
      await setDoc(doc(db, "acompanhamento", token), {
        status: "enviado", tipo, total: totalFinal, subtotal: sub, taxaEntrega: taxa, pagamento,
        valorTroco: precisaTroco ? valorTroco : null, resumo: resumo(itens), tempoEntrega,
        criadoEm: serverTimestamp(), horarios: { enviado: serverTimestamp() },
      });
    } catch (e) { if (tentativas === 1) { console.warn("Acompanhamento indisponível:", e); token = null; } }

    await setDoc(doc(db, "orders", idPendente), {
      ...(token && { acompanhamento: token }),
      tipo, tipoPedido: tipo,
      cliente: $("cNome").value.trim(), nomeCliente: $("cNome").value.trim(),
      telefone: $("cTel").value.trim(), telefoneCliente: $("cTel").value.trim(),
      endereco, enderecoCliente: endereco, regiao: tipo === "entrega" ? $("cBairro").value.trim() : "",
      formaPagamento: pagamento, taxaEntrega: taxa, precisaTroco, valorTroco,
      items: itens, totalProdutos: sub.toFixed(2), totalFinal: totalFinal.toFixed(2),
      status: "pendente", createdAt: serverTimestamp(), origem: "cardapio-delivery",
    });
    concluirEnvio(token, itens, { sub, taxa, totalFinal, valorTroco, endereco });
  } catch (e) {
    console.error(e);
    if (tentativas > 1 && e?.code === "permission-denied") concluirEnvio(tokenPendente, itens, { sub, taxa, totalFinal, valorTroco, endereco });
    else toast("Não foi possível enviar. Confira a internet e toque de novo (não duplica).");
  } finally {
    enviando = false; $("btnPedido").disabled = false; desenharCheckout();
  }
};

// pedidos feitos nesta mesa por este celular (só na sessão; o garçom/caixa fecha a conta no painel)
function concluirMesa(itens, sub) {
  let lista = [];
  lista = ss.get("quintal-mesa-pedidos", []);
  lista.push({ hora: Date.now(), resumo: resumo(itens), total: sub, itens: itens.map((i) => ({ q: i.quantidade, nome: i.nome, v: i.subtotal })) });
  ss.set("quintal-mesa-pedidos", lista);
  idPendente = null; tentativas = 0;
  sacola = []; salvarSacola();
  fecharTela("telaSacola");
  atualizarBotoesMesa();
  setTimeout(() => { desenharMesa(lista, true); abrirTela("telaAcomp"); confete(); }, 380);
}
// tela com tudo o que já foi pedido nesta mesa (por este celular)
function desenharMesa(lista, acabouDeEnviar = false) {
  const total = lista.reduce((s, p) => s + p.total, 0);
  const hora = (t) => new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  $("acompCorpo").innerHTML = `
    ${acabouDeEnviar
      ? `<div class="ac-topo"><div class="ac-ilu"><span class="pula">👨‍🍳</span></div><h3>Pedido enviado!</h3><p>Já foi para a cozinha. É só aguardar na Mesa ${MESA} 😉</p></div>`
      : `<div class="ac-topo"><h3>Pedidos da Mesa ${MESA}</h3><p>Tudo o que foi pedido por este celular.</p></div>`}
    <div class="card mesa-lista"><div class="rotulo">PEDIDOS DESTA MESA (NESTE CELULAR)</div>
      ${lista.map((p, k) => `<div><span><small>Pedido ${k + 1} · ${hora(p.hora)}</small>${p.itens
        ? p.itens.map((i) => `${i.q}x ${esc(i.nome)}`).join("<br>") : esc(p.resumo)}</span><b>${brl(p.total)}</b></div>`).join("")}
      <div class="resumo"><hr><div class="total"><span>Total até agora</span><b>${brl(total)}</b></div></div></div>
    <p class="pix-obs" style="color:var(--suave);text-align:center">O pagamento é feito no caixa quando fechar a conta da mesa.</p>
    <button class="btn-linha" data-fechar="telaAcomp" style="border-style:solid">Pedir mais alguma coisa</button>
    <div style="height:30px"></div>`;
}

// dicas da faixa da mesa: antes do 1º pedido "Direto na cozinha"; depois vira o botão "Meus pedidos (N)"
function atualizarBotoesMesa() {
  if (!MESA) return;
  const n = ss.get("quintal-mesa-pedidos", []).length;
  $("mesaDicas").innerHTML = (n ? "" : "<span>👨‍🍳 Direto na cozinha</span>") + "<span>💳 Paga no caixa</span>"
    + (n ? `<button type="button" class="mesa-ver" id="btnMeusPedidos">🧾 Meus pedidos (${n})</button>` : "");
  const b = $("btnMeusPedidos");
  if (b) b.onclick = () => { desenharMesa(ss.get("quintal-mesa-pedidos", [])); abrirTela("telaAcomp"); };
}

function resumo(itens) {
  const n = itens.slice(0, 3).map((i) => `${i.quantidade}x ${i.nome}`).join(" · ");
  return itens.length > 3 ? `${n} · +${itens.length - 3} itens` : n;
}

function mensagemPedidoWhats(p) {
  const r = brl, ent = p.tipo === "entrega", LINHA = "─────────────";
  const l = [`Olá, *${LOJA.nome}*! 👋`, "Acabei de fazer um pedido pelo cardápio digital:", "",
    `*${ent ? "🛵 PEDIDO PARA ENTREGA" : "🛍️ PEDIDO PARA RETIRADA"}*`, LINHA];
  p.itens.forEach((i) => {
    l.push(`*${i.quantidade}x ${i.produto}*  ·  ${r(i.subtotal)}`);
    const g = new Map();
    i.complementos.forEach((c) => { if (!g.has(c.grupo)) g.set(c.grupo, []); g.get(c.grupo).push(c.preco > 0 ? `${c.nome} (+${r(c.preco)})` : c.nome); });
    g.forEach((lista, k) => l.push(`      _${k}: ${lista.join(", ")}_`));
    if (i.observacao) l.push(`      _Obs.: ${i.observacao}_`);
  });
  l.push(LINHA);
  if (ent) l.push(`Subtotal: ${r(p.sub)}`, `Entrega: ${r(p.taxa)}`);
  l.push(`*Total: ${r(p.totalFinal)}*`, "", `💳 *Pagamento:* ${p.pagamento}`);
  if (p.valorTroco) l.push(`      _Troco para ${r(p.valorTroco)} (levar ${r(p.valorTroco - p.totalFinal)})_`);
  if (/pix/i.test(p.pagamento)) l.push("      _Envio o comprovante do PIX em seguida._");
  l.push("", `👤 *${p.nome}*`, `📞 ${p.tel}`);
  if (ent && p.endereco) l.push(`📍 ${p.endereco}`);
  l.push("", `Obrigado! ${LOJA.coracao}`);
  return l.join("\n");
}

function concluirEnvio(token, itens, v) {
  const msg = mensagemPedidoWhats({ tipo, itens, pagamento, nome: $("cNome").value.trim(), tel: $("cTel").value.trim(), ...v });
  const a = { token: token || "local-" + idPendente, criado: Date.now(), whats: linkWhats(msg), tipo, pagamento, total: v.totalFinal, semAcomp: !token };
  acomps = [a, ...acomps.filter((x) => x.token !== a.token)].slice(0, 10);
  ls.set("quintal-acomps", acomps);
  idPendente = null; tokenPendente = null; tentativas = 0;
  sacola = []; salvarSacola();
  $("valorTroco").value = ""; $("precisaTroco").checked = false;
  fecharTela("telaSacola");
  setTimeout(() => { atual = a.token; escutarAcomps(); abrirTela("telaAcomp"); desenharAcomp(); confete(); }, 380);
}

// ---------------- acompanhamento ao vivo ----------------
const DOZE_H = 12 * 3600 * 1000;
let acomps = ls.get("quintal-acomps", []).filter((a) => Date.now() - a.criado < DOZE_H);
let atual = acomps[0]?.token || null;
const dadosAcomp = {}, ouvintes = {};

function escutarAcomps() {
  acomps.forEach((a) => {
    if (ouvintes[a.token] || a.semAcomp) return;
    let anterior = null;
    ouvintes[a.token] = onSnapshot(doc(db, "acompanhamento", a.token), (s) => {
      if (!s.exists()) return;
      const d = s.data();
      if (anterior && anterior !== "saiu" && d.status === "saiu") avisarSaiu();
      anterior = d.status;
      dadosAcomp[a.token] = d;
      desenharBarraAcomp();
      if (a.token === atual && $("telaAcomp").classList.contains("aberta")) desenharAcomp();
    }, () => {});
  });
  desenharBarraAcomp();
}

const ETQ = {
  enviado: "Pedido enviado", preparando: "Em preparo", saiu: "Saiu para entrega", pronto: "Pronto para retirar",
  concluido: "Pedido entregue", cancelado: "Pedido cancelado",
};
function desenharBarraAcomp() {
  const ativos = acomps.filter((a) => !["concluido", "cancelado"].includes(dadosAcomp[a.token]?.status));
  const b = $("barraAcomp");
  b.classList.toggle("hidden", !ativos.length);
  if (!ativos.length) return;
  const d = dadosAcomp[ativos[0].token];
  b.innerHTML = `🛵 ${ativos.length > 1 ? ativos.length + " pedidos em andamento" : "Acompanhar pedido"}<em>${d ? ETQ[d.status] || "" : "Enviado"} ›</em>`;
}
$("barraAcomp").onclick = () => { atual = acomps.find((a) => !["concluido", "cancelado"].includes(dadosAcomp[a.token]?.status))?.token || atual; abrirTela("telaAcomp"); desenharAcomp(); };

const hhmm = (t) => (t?.toDate ? t.toDate() : t ? new Date(t) : null)?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) || "";

function desenharAcomp() {
  const a = acomps.find((x) => x.token === atual) || acomps[0];
  if (!a) return;
  const d = dadosAcomp[a.token] || { status: "enviado", tipo: a.tipo, pagamento: a.pagamento, total: a.total, horarios: {} };
  const st = d.status || "enviado", ent = (d.tipo || a.tipo) === "entrega";
  const passos = ["enviado", "preparando", ent ? "saiu" : "pronto", "concluido"];
  const idx = passos.indexOf(st);
  const ilu = st === "saiu" ? `<span class="moto">🛵</span>` : st === "concluido" ? `<span class="pula">🧡</span>` : st === "cancelado" ? "😕"
    : st === "pronto" ? `<span class="pula">🛍️</span>` : st === "preparando" ? `<span class="pula">👨‍🍳</span>` : `<span class="pula">📨</span>`;
  const sub = {
    enviado: "A loja já recebeu e vai confirmar em instantes.", preparando: "Seu pedido está sendo preparado com carinho.",
    saiu: "O entregador está a caminho. Fique de olho!", pronto: "Pode vir buscar no balcão 😉",
    concluido: ent ? "Bom apetite! Obrigado pela preferência." : "Retirado. Bom apetite!", cancelado: "Fale com a loja pelo WhatsApp se tiver dúvida.",
  }[st];
  const h = d.horarios || {};
  const seletor = acomps.length > 1 ? `<div class="seletor-acomp">${acomps.map((x) => `<button data-acomp="${x.token}" class="${x.token === a.token ? "on" : ""}">Pedido ${new Date(x.criado).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</button>`).join("")}</div>` : "";
  const pix = /pix/i.test(d.pagamento || a.pagamento || "") && chavePix && !["concluido", "cancelado"].includes(st)
    ? `<div class="card pix"><div class="rotulo">💠 PAGUE COM PIX · ${brl(d.total ?? a.total)}</div><div class="chave">${esc(chavePix)}</div>${favorecidoPix ? `<div class="pix-obs" style="color:var(--suave)">${esc(favorecidoPix)}</div>` : ""}<button data-copiar="1">Copiar chave PIX</button></div>` : "";
  $("acompCorpo").innerHTML = `${seletor}
    <div class="ac-topo"><div class="ac-ilu">${ilu}</div>${st === "saiu" ? `<div class="estrada"></div>` : ""}
      <h3>${ETQ[st] || "Pedido enviado"}</h3><p>${sub}</p></div>
    ${st !== "cancelado" ? `<div class="card"><ul class="etapas">${passos.map((p, i) => `<li class="${i < idx || st === "concluido" ? "feita" : i === idx ? "atual" : ""}"><i>${i < idx || st === "concluido" ? "✓" : i + 1}</i>${ETQ[p]}<small>${hhmm(h[p])}</small></li>`).join("")}</ul></div>` : ""}
    ${d.resumo ? `<div class="card"><div class="rotulo">SEU PEDIDO</div><div style="font-size:14px;line-height:1.45">${esc(d.resumo)}</div>
      <div class="resumo">${d.taxaEntrega ? `<div><span>Produtos</span><span>${brl(d.subtotal)}</span></div><div><span>Taxa de entrega</span><span>${brl(d.taxaEntrega)}</span></div>` : ""}
      <hr><div class="total"><span>Total</span><b>${brl(d.total)}</b></div></div></div>` : ""}
    ${pix}
    <a class="btn-linha" href="${a.whats}" target="_blank" rel="noopener" id="btnZap">${a.enviouWhats ? "💬 Falar com a loja" : "💬 Enviar pedido no WhatsApp<small>Opcional — a loja já recebeu</small>"}</a>
    <button class="btn-linha" data-fechar="telaAcomp" style="border-style:solid">Voltar ao cardápio</button>
    <div style="height:30px"></div>`;
  $("btnZap").onclick = () => { a.enviouWhats = true; ls.set("quintal-acomps", acomps); setTimeout(desenharAcomp, 300); };
}
$("acompCorpo").addEventListener("click", (e) => {
  const s = e.target.closest("[data-acomp]");
  if (s) { atual = s.dataset.acomp; desenharAcomp(); }
  if (e.target.closest("[data-copiar]")) copiar(chavePix);
});

function confete() {
  const cores = ["#e8311f", "#ffc72c", "#36d27a", "#fff7ea"];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement("i");
    c.className = "confete";
    c.style.cssText = `left:${Math.random() * 100}vw;background:${cores[i % 4]};animation-delay:${Math.random() * 0.6}s;border-radius:${i % 3 ? 2 : 7}px`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3400);
  }
}
function avisarSaiu() {
  const vai = () => { confete(); try { navigator.vibrate?.([200, 100, 200]); } catch {} toast("🛵 Seu pedido saiu para entrega!"); };
  if (document.visibilityState === "visible") vai();
  else document.addEventListener("visibilitychange", function f() { if (document.visibilityState === "visible") { document.removeEventListener("visibilitychange", f); vai(); } });
}

// ---------------- início ----------------
desenharSacola();
if (!MESA) escutarAcomps(); else atualizarBotoesMesa();
marcarBarras();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
