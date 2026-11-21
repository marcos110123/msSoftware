// =====================================================================
// Cardápio Quintal do Pastel 1.4.3 — visual do vídeo de abordagem (telas premium)
// Firestore: produtos, opcoesLanche (grupo "extras"), config/estadoPedidos, config/entrega, config/pix,
//            orders (pedido), acompanhamento (status ao vivo, sem telefone/endereço)
// 1.4.0 (20/11): finalização em etapas + taxa POR REGIÃO (config/entrega.bairros, editada no painel;
//               sem nada salvo vale LOJA.bairrosPadrao) + acompanhamento novo (topo da marca, previsão em horário)
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
let extrasCarregados = false;
let recebendo = true, entregaPausada = false;
let taxaEntrega = LOJA.taxaPadrao, tempoEntrega = LOJA.tempoPadrao, chavePix = LOJA.pixPadrao, favorecidoPix = "";
let sacola = lerSacola();   // [{chave, id, nome, base, complementos, observacao, preco, quantidade}]
let tipo = MESA ? "mesa" : null, pagamento = null;
// regiões de entrega com a taxa de cada uma (Firebase config/entrega.bairros; sem nada salvo, LOJA.bairrosPadrao)
const ordenarBairros = (l) => l.slice().sort((a, b) => a.taxa - b.taxa || a.nome.localeCompare(b.nome, "pt-BR"));
let BAIRROS = ordenarBairros(LOJA.bairrosPadrao || []);
let bairro = null, verTodosBairros = false;
let troco = null, trocoOutro = "";   // troco: null (não respondeu) | "nao" | número | "outro" (digita o valor)

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
  $("lblNome").textContent = "Seu nome (opcional)";
  $("rotuloDados").textContent = "Quem está pedindo?";
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
  conferirSacola();
}, (e) => { console.error(e); $("secoes").innerHTML = `<p class="carregando">Não foi possível carregar o cardápio. Verifique a internet.</p>`; });

onSnapshot(query(collection(db, "opcoesLanche"), where("grupo", "==", "extras")), (snap) => {
  EXTRAS = [];
  snap.forEach((d) => { const x = d.data(); if (x.status !== "esgotado" && x.status !== "inativo") EXTRAS.push({ id: d.id, ...x }); });
  EXTRAS.sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99) || a.nome.localeCompare(b.nome));
  extrasCarregados = true;
  conferirSacola();
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
  const lista = (Array.isArray(d.bairros) ? d.bairros : [])
    .map((b) => ({ nome: String(b?.nome || "").trim(), taxa: Number(b?.taxa) }))
    .filter((b) => b.nome && Number.isFinite(b.taxa) && b.taxa >= 0);
  BAIRROS = ordenarBairros(lista.length ? lista : LOJA.bairrosPadrao || []);
  if (bairro && !BAIRROS.some((b) => b.nome === bairro)) bairro = null;
  $("statTempo").textContent = tempoEntrega;
  $("statTaxa").textContent = textoTaxaMin();
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
  const filtra = (p) => !termo || sem(nomeVitrine(p) + " " + p.nome + " " + (p.descricao || "") + " " + (CAT[p.categoria]?.nome || "")).includes(termo);

  // destaque da casa (X-Gaúcho) — some quando esgotado/pausado (pedido do usuário 21/11)
  const top = PRODUTOS[LOJA.destaqueId];
  $("destaqueCasa").innerHTML = top && top.status === "ativo" && !termo ? `
    <button class="dest-grande" data-prod="${esc(top.id)}">
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
    <button class="mini" data-prod="${esc(p.id)}" style="animation-delay:${0.05 * i}s">
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
        <button class="item ${p.status === "esgotado" ? "esgotado" : ""} com-foto" data-prod="${esc(p.id)}">
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
      <div class="opcoes">${EXTRAS.map((x) => `<button class="opcao caixa ${marcados.has(x.id) ? "on" : ""}" data-extra="${esc(x.id)}"><i class="marca"></i><span>${esc(x.nome)}</span><em>+ ${brl(x.valor)}</em></button>`).join("")}</div></div>`;
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
// A sacola fica guardada no celular: ao abrir o cardápio ela é conferida com o que está no ar agora
// (item tirado/esgotado sai da sacola; preço mudado no painel é atualizado), para o pedido nunca ir com preço velho.
function conferirSacola() {
  if (!sacola.length || !Object.keys(PRODUTOS).length) return;
  let removidos = 0, mudou = 0;
  sacola = sacola.filter((i) => {
    const p = PRODUTOS[i.id];
    if (!p || p.status !== "ativo") { removidos++; return false; }
    const comps = i.complementos.map((c) => {
      if (c.grupo !== "Adicionais" || !extrasCarregados) return c;
      const x = EXTRAS.find((e) => e.nome === c.nome);
      return x ? { ...c, preco: Number(x.valor || 0) } : null; // adicional que saiu do cardápio
    });
    if (comps.some((c) => c === null)) { removidos++; return false; }
    const novo = Number((Number(p.preco || 0) + comps.reduce((s, c) => s + Number(c.preco || 0), 0)).toFixed(2));
    if (novo !== i.preco) { i.preco = novo; mudou++; }
    i.complementos = comps;
    return true;
  });
  if (!removidos && !mudou) return;
  salvarSacola();
  toast(removidos ? `Sua sacola foi atualizada: ${removidos} ${removidos > 1 ? "itens indisponíveis saíram" : "item indisponível saiu"}`
    : "Atualizamos os preços da sua sacola");
}
function salvarSacola() { gravarSacola(sacola); desenharSacola(); if (MESA) atualizarBotoesMesa(); marcarBarras(); }
const qtdSacola = () => sacola.reduce((s, i) => s + i.quantidade, 0);
const subtotal = () => Number(sacola.reduce((s, i) => s + i.preco * i.quantidade, 0).toFixed(2));
// taxa da região escolhida (sem regiões cadastradas, vale a taxa única antiga)
const taxaAtual = () => {
  if (tipo !== "entrega") return 0;
  if (!BAIRROS.length) return Number(taxaEntrega || 0);
  return Number(BAIRROS.find((b) => b.nome === bairro)?.taxa || 0);
};
const taxaMin = () => (BAIRROS.length ? Math.min(...BAIRROS.map((b) => b.taxa)) : Number(taxaEntrega || 0));
const textoTaxaMin = () => (taxaMin() ? (BAIRROS.length > 1 && new Set(BAIRROS.map((b) => b.taxa)).size > 1 ? "a partir de " : "") + brl(taxaMin()) : "Grátis");

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

// dados do cliente guardados no celular (quem já pediu vê "endereço de sempre" e só confirma)
const cli = ls.get("quintal-cliente", {});
const formatarTel = (v) => {
  const d = String(v || "").replace(/\D/g, "").slice(0, 11);
  return d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
};
if (cli.tel) cli.tel = formatarTel(cli.tel);
[["cNome", "nome"], ["cTel", "tel"], ["cRua", "rua"], ["cNum", "numero"], ["cRef", "ref"]].forEach(([id, k]) => {
  $(id).value = cli[k] || "";
  $(id).addEventListener("input", () => {
    if (id === "cTel") $(id).value = formatarTel($(id).value);
    cli[k] = $(id).value; ls.set("quintal-cliente", cli);
    $(id).closest(".campo")?.classList.remove("erro");
    atualizarEtapas();
  });
});
if (cli.regiao) bairro = cli.regiao; // conferido quando as regiões chegam do Firebase
const telOk = () => $("cTel").value.replace(/\D/g, "").length >= 10;
const endOk = () => !!bairro && BAIRROS.some((b) => b.nome === bairro) && $("cRua").value.trim().length >= 3 && $("cNum").value.trim().length >= 1;
const dadosOk = () => $("cNome").value.trim().length >= 2 && telOk();
// começa no "salvo" quando o celular já tem tudo; "Alterar" abre os campos
let editarEnd = !(cli.rua && cli.numero && cli.regiao), editarDados = !(cli.nome && String(cli.tel || "").replace(/\D/g, "").length >= 10);

$("tipoPedido").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tipo]");
  if (!b || b.disabled) return;
  tipo = b.dataset.tipo; desenharCheckout();
});
$("bairros").addEventListener("click", (e) => {
  const b = e.target.closest("[data-bairro]");
  if (!b) return;
  bairro = b.dataset.bairro; cli.regiao = bairro; ls.set("quintal-cliente", cli);
  $("bairros").classList.remove("erro");
  desenharCheckout();
});
$("maisBairros").onclick = () => { verTodosBairros = true; desenharCheckout(); };
$("endSalvo").addEventListener("click", (e) => { if (e.target.closest("[data-alterar]")) { editarEnd = true; desenharCheckout(); $("cRua").focus(); } });
$("dadosSalvo").addEventListener("click", (e) => { if (e.target.closest("[data-alterar]")) { editarDados = true; desenharCheckout(); $("cNome").focus(); } });
$("pagamento").addEventListener("click", (e) => {
  const b = e.target.closest("[data-pag]");
  if (!b) return;
  if (pagamento !== b.dataset.pag) { pagamento = b.dataset.pag; troco = null; }
  desenharCheckout();
});
$("pagDet").addEventListener("click", (e) => {
  const t = e.target.closest("[data-troco]");
  if (t) {
    const v = t.dataset.troco;
    troco = v === "nao" || v === "outro" ? v : Number(v);
    desenharCheckout();
    if (v === "outro") $("valorTroco")?.focus();
  }
  if (e.target.closest("#copiarPix")) copiar(chavePix);
});
$("pagDet").addEventListener("input", (e) => {
  if (e.target.id !== "valorTroco") return;
  trocoOutro = e.target.value; e.target.classList.remove("erro");
  mostrarTroco(); atualizarEtapas();
});
const valorOutro = () => parseFloat(String(trocoOutro).replace(/\./g, "").replace(",", ".")) || 0;
const valorTrocoFinal = () => (typeof troco === "number" ? troco : troco === "outro" ? valorOutro() : null);
const totalAtual = () => Number((subtotal() + taxaAtual()).toFixed(2));
function mostrarTroco() {
  const el = $("trocoTxt"); if (!el) return;
  const v = valorTrocoFinal(), tot = totalAtual();
  el.textContent = v > tot ? `Troco para ${brl(v)} → ${tipo === "retirada" ? "você recebe" : "o entregador leva"} ${brl(v - tot)}`
    : troco === "outro" && trocoOutro ? "O valor precisa ser maior que o total" : "";
  el.classList.toggle("ruim", !(v > tot));
}

// o que falta para fechar o pedido (mesma ordem da tela)
function faltando() {
  if (!sacola.length) return { msg: "Sua sacola está vazia" };
  if (MESA) return null;
  if (!tipo) return { msg: "Escolha entrega ou retirada", passo: "modo" };
  if (tipo === "entrega" && entregaPausada) return { msg: "Entregas pausadas — escolha retirar", passo: "modo" };
  if (tipo === "entrega") {
    if (!bairro || !BAIRROS.some((b) => b.nome === bairro)) return { msg: "Falta: escolher a sua região", passo: "end", foco: "bairros" };
    if ($("cRua").value.trim().length < 3) return { msg: "Falta: o nome da rua", passo: "end", foco: "cRua" };
    if (!$("cNum").value.trim()) return { msg: "Falta: o número da casa (ou S/N)", passo: "end", foco: "cNum" };
  }
  if ($("cNome").value.trim().length < 2) return { msg: "Falta: o seu nome", passo: "dados", foco: "cNome" };
  if (!telOk()) return { msg: "Falta: o seu WhatsApp com DDD", passo: "dados", foco: "cTel" };
  if (!pagamento) return { msg: "Falta: a forma de pagamento", passo: "pag" };
  if (pagamento === "Dinheiro") {
    if (troco === null) return { msg: "Falta: dizer se precisa de troco", passo: "pag" };
    if (troco !== "nao" && !(valorTrocoFinal() > totalAtual())) return { msg: "O troco precisa ser maior que o total", passo: "pag", foco: "valorTroco" };
  }
  return null;
}

// barra de etapas + "Falta: ..." + total no botão (leve: roda a cada tecla)
function atualizarEtapas() {
  const f = faltando(), ordem = ["modo", "end", "dados", "pag"];
  const at = f?.passo ? ordem.indexOf(f.passo) : f ? 0 : 4;
  const nomes = [tipo === "retirada" ? "Retirada" : tipo === "entrega" ? "Entrega" : "Como receber", tipo === "retirada" ? "Local" : "Endereço", "Seus dados", "Pagamento"];
  $("passos").innerHTML = nomes.map((n, i) => `<div class="${i < at ? "ok" : ""}"><i><b></b></i><span>${i < at ? "✓ " : ""}${n}</span></div>`).join("");
  document.querySelectorAll("#telaSacola [data-passo]").forEach((el) => {
    const i = ordem.indexOf(el.dataset.passo), ok = i < at;
    el.classList.toggle("ok", ok);
    const n = el.querySelector(".n"); if (n) n.textContent = ok ? "✓" : i + 1;
  });
  $("falta").textContent = !MESA && f && sacola.length ? f.msg : "";
  $("btnPedido").classList.toggle("bloq", !!f && !MESA);
  $("btnPedidoTxt").textContent = enviando ? "Enviando…" : MESA ? "Enviar para a cozinha" : "Fazer pedido";
  $("btnPedidoTot").textContent = brl(MESA ? subtotal() : totalAtual());
}

let pagChave = "";
function desenharPagamento() {
  document.querySelectorAll("#pagamento [data-pag]").forEach((b) => b.classList.toggle("on", b.dataset.pag === pagamento));
  const tot = totalAtual(), onde = tipo === "retirada" ? "retirada" : "entrega";
  const chave = [pagamento, troco, tot, chavePix, favorecidoPix, onde].join("|");
  if (chave === pagChave) return mostrarTroco();
  pagChave = chave;
  let h = "";
  if (pagamento === "PIX") {
    h = chavePix
      ? `<div class="det pixbox"><div class="rot">Chave PIX${favorecidoPix ? " · " + esc(favorecidoPix) : ""}</div><code>${esc(chavePix)}</code>
          <button type="button" id="copiarPix">Copiar chave PIX</button>
          <p>Pague ${brl(tot)} e envie o comprovante no WhatsApp da loja. Pode pagar depois de fazer o pedido.</p></div>`
      : `<div class="det"><p>A chave PIX aparece aqui assim que a loja cadastrar. Você também pode pagar o PIX na ${onde}.</p></div>`;
  } else if (pagamento === "Cartão") {
    h = `<div class="det"><p>💳 ${onde === "retirada" ? "Pague no caixa" : "O entregador leva a maquininha"}: crédito ou débito.</p></div>`;
  } else if (pagamento === "Dinheiro") {
    const n1 = Math.ceil((tot + 0.01) / 50) * 50;
    const ops = [["nao", "Não preciso"], [n1, "R$ " + n1], [n1 + 50, "R$ " + (n1 + 50)], ["outro", "Outro valor"]];
    if (typeof troco === "number" && troco !== n1 && troco !== n1 + 50) troco = null; // total mudou: escolhe de novo
    h = `<div class="det"><p>Precisa de troco?</p>
      <div class="trocos">${ops.map(([v, l]) => `<button type="button" class="${String(troco) === String(v) ? "on" : ""}" data-troco="${v}">${l}</button>`).join("")}</div>
      ${troco === "outro" ? `<div class="campo"><label for="valorTroco">Troco para quanto?</label><input id="valorTroco" inputmode="decimal" value="${esc(trocoOutro)}"></div>` : ""}
      <div class="troco-txt" id="trocoTxt"></div></div>`;
  }
  $("pagDet").innerHTML = h;
  mostrarTroco();
}

function desenharCheckout() {
  const ent = tipo === "entrega";
  document.querySelectorAll("#tipoPedido [data-tipo]").forEach((b) => {
    b.classList.toggle("on", b.dataset.tipo === tipo);
    b.disabled = b.dataset.tipo === "entrega" && entregaPausada;
  });
  $("modoEntTxt").innerHTML = `${esc(tempoEntrega)}<br>taxa ${textoTaxaMin().replace("Grátis", "grátis")}`;
  $("semEntregaNota").classList.toggle("hidden", !entregaPausada);
  $("blocoEndereco").classList.toggle("hidden", !ent);
  $("blocoRetirada").classList.toggle("hidden", tipo !== "retirada");
  $("retEnd").textContent = LOJA.endereco;
  $("pagOnde").textContent = tipo === "retirada" ? "na retirada" : "na entrega";

  // endereço: "de sempre" (salvo) ou formulário com as regiões
  const tx = taxaAtual();
  $("endTaxa").textContent = ent && bairro && BAIRROS.some((b) => b.nome === bairro) ? "entrega " + (tx ? brl(tx) : "grátis") : "";
  const salvo = ent && !editarEnd && endOk();
  $("endSalvo").innerHTML = salvo ? `<div class="rot">Entregar no endereço de sempre?</div>
    <div class="salvo"><span class="pino">📍</span><div><strong>${esc($("cRua").value.trim())}, ${esc($("cNum").value.trim())}</strong>
      <small>${esc(bairro)}${$("cRef").value.trim() ? " · " + esc($("cRef").value.trim()) : ""} · entrega ${tx ? brl(tx) : "grátis"}</small></div>
      <button type="button" data-alterar>Alterar</button></div>` : "";
  $("endForm").classList.toggle("hidden", salvo);
  if (!salvo) {
    const i = BAIRROS.findIndex((b) => b.nome === bairro);
    const todos = verTodosBairros || BAIRROS.length <= 8 || i >= 6;
    $("bairros").innerHTML = (todos ? BAIRROS : BAIRROS.slice(0, 6)).map((b) =>
      `<button type="button" class="bairro ${b.nome === bairro ? "on" : ""}" data-bairro="${esc(b.nome)}"><span>${esc(b.nome)}</span><small>${b.taxa ? brl(b.taxa) : "grátis"}</small></button>`).join("");
    $("maisBairros").classList.toggle("hidden", todos);
    $("maisBairros").textContent = `Ver todas as regiões (${BAIRROS.length}) ▾`;
  }

  // dados: salvos (nome + WhatsApp) ou campos
  const dSalvo = !MESA && !editarDados && dadosOk();
  $("dadosSalvo").innerHTML = dSalvo ? `<div class="salvo neutro"><span class="pino">👤</span><div><strong>${esc($("cNome").value.trim())}</strong>
    <small>${esc($("cTel").value.trim())}</small></div><button type="button" data-alterar>Alterar</button></div>` : "";
  $("dadosForm").classList.toggle("hidden", dSalvo);

  desenharPagamento();
  $("rSub").textContent = brl(subtotal());
  $("linhaTaxa").classList.toggle("hidden", !ent);
  $("rTaxaRot").textContent = "Entrega" + (bairro && BAIRROS.some((b) => b.nome === bairro) ? " · " + bairro : "");
  $("rTaxa").textContent = bairro || !BAIRROS.length ? (tx ? brl(tx) : "Grátis") : "escolha a região";
  $("rTotal").textContent = brl(MESA ? subtotal() : totalAtual());
  atualizarEtapas();
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
  const f = faltando();
  if (!f) return "";
  // abre o que estava "salvo" se for ali o problema, marca o campo e rola até ele
  if (f.passo === "end" && editarEnd === false) { editarEnd = true; desenharCheckout(); }
  if (f.passo === "dados" && editarDados === false) { editarDados = true; desenharCheckout(); }
  const alvo = f.foco && $(f.foco);
  if (alvo) {
    (alvo.closest(".campo") || alvo).classList.add("erro");
    alvo.scrollIntoView({ behavior: "smooth", block: "center" });
    if (alvo.tagName === "INPUT") setTimeout(() => alvo.focus({ preventScroll: true }), 250);
  } else document.querySelector(`#telaSacola [data-passo="${f.passo}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return f.msg.replace(/^Falta: /, "Falta ");
}

$("btnPedido").onclick = async () => {
  if (enviando) return;
  const erro = validar();
  if (erro) return toast(erro);
  const sub = subtotal(), taxa = taxaAtual(), totalFinal = Number((sub + taxa).toFixed(2));
  const precisaTroco = pagamento === "Dinheiro" && troco !== "nao" && valorTrocoFinal() > totalFinal;
  const valorTroco = precisaTroco ? valorTrocoFinal() : null;
  const endereco = tipo === "entrega"
    ? `${$("cRua").value.trim()}, ${$("cNum").value.trim()} - ${bairro}${$("cRef").value.trim() ? " (" + $("cRef").value.trim() + ")" : ""}` : "";
  const itens = sacola.map((i) => ({
    nome: nomePedido(i), preco: i.preco, quantidade: i.quantidade, subtotal: Number((i.preco * i.quantidade).toFixed(2)),
    observacao: i.observacao || "", complementos: i.complementos, produtoId: i.id, produto: i.base,
  }));

  enviando = true; $("btnPedido").disabled = true; atualizarEtapas();
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
        // 1.4.2: já nasce "Em preparo" (a dona não tem tempo de confirmar cada pedido no painel)
        status: "preparando", tipo, total: totalFinal, subtotal: sub, taxaEntrega: taxa, pagamento,
        valorTroco: precisaTroco ? valorTroco : null, resumo: resumo(itens), tempoEntrega,
        criadoEm: serverTimestamp(), horarios: { enviado: serverTimestamp(), preparando: serverTimestamp() },
      });
    } catch (e) { if (tentativas === 1) { console.warn("Acompanhamento indisponível:", e); token = null; } }

    await setDoc(doc(db, "orders", idPendente), {
      ...(token && { acompanhamento: token }),
      tipo, tipoPedido: tipo,
      cliente: $("cNome").value.trim(), nomeCliente: $("cNome").value.trim(),
      telefone: $("cTel").value.trim(), telefoneCliente: $("cTel").value.trim(),
      endereco, enderecoCliente: endereco, regiao: tipo === "entrega" ? bairro : "",
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
  $("acompCorpo").innerHTML = `<div class="cab-tela"><button class="bolinha-s" data-fechar="telaAcomp" aria-label="Voltar">‹</button><h2>Mesa ${MESA}</h2><span></span></div><div class="pad">
    ${acabouDeEnviar
      ? `<div class="ac-topo"><div class="ac-ilu"><span class="pula">👨‍🍳</span></div><h3>Pedido enviado!</h3><p>Já foi para a cozinha. É só aguardar na Mesa ${MESA} 😉</p></div>`
      : `<div class="ac-topo"><h3>Pedidos da Mesa ${MESA}</h3><p>Tudo o que foi pedido por este celular.</p></div>`}
    <div class="card mesa-lista"><div class="rotulo">PEDIDOS DESTA MESA (NESTE CELULAR)</div>
      ${lista.map((p, k) => `<div><span><small>Pedido ${k + 1} · ${hora(p.hora)}</small>${p.itens
        ? p.itens.map((i) => `${i.q}x ${esc(i.nome)}`).join("<br>") : esc(p.resumo)}</span><b>${brl(p.total)}</b></div>`).join("")}
      <div class="resumo"><hr><div class="total"><span>Total até agora</span><b>${brl(total)}</b></div></div></div>
    <p class="pix-obs" style="color:var(--suave);text-align:center">O pagamento é feito no caixa quando fechar a conta da mesa.</p>
    <button class="btn-linha" data-fechar="telaAcomp" style="border-style:solid">Pedir mais alguma coisa</button>
    <div style="height:30px"></div></div>`;
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
  // o que a tela de acompanhamento mostra fica só neste celular (o Firebase guarda só a etapa)
  const a = {
    token: token || "local-" + idPendente, criado: Date.now(), whats: linkWhats(msg), tipo, pagamento, total: v.totalFinal, semAcomp: !token,
    sub: v.sub, taxa: v.taxa, regiao: tipo === "entrega" ? bairro : "", endereco: v.endereco, troco: v.valorTroco, tempo: tempoEntrega,
    itens: itens.map((i) => ({ q: i.quantidade, nome: i.nome, v: i.subtotal })),
  };
  acomps = [a, ...acomps.filter((x) => x.token !== a.token)].slice(0, 10);
  ls.set("quintal-acomps", acomps);
  idPendente = null; tokenPendente = null; tentativas = 0;
  troco = null; trocoOutro = ""; pagChave = "";
  editarEnd = false; editarDados = false; // da próxima vez já aparece "endereço de sempre"
  sacola = []; salvarSacola();
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
  b.innerHTML = `🛵 ${ativos.length > 1 ? ativos.length + " pedidos em andamento" : "Acompanhar pedido"}<em>${d ? ETQ[d.status] || "" : "Em preparo"} ›</em>`;
}
$("barraAcomp").onclick = () => { atual = acomps.find((a) => !["concluido", "cancelado"].includes(dadosAcomp[a.token]?.status))?.token || atual; abrirTela("telaAcomp"); desenharAcomp(); };

const paraData = (t) => (t?.toDate ? t.toDate() : t ? new Date(t) : null);
const hm = (t) => paraData(t)?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) || "";
const hhmm = hm;
// "40–60 min" → [40, 60]; "50 minutos" → [50, 50]
function faixaTempo(t) {
  const n = String(t || "").match(/\d+/g)?.map(Number) || [];
  return n.length ? [n[0], n[1] ?? n[0]] : null;
}

function desenharAcomp() {
  const a = acomps.find((x) => x.token === atual) || acomps[0];
  if (!a) return;
  const d = dadosAcomp[a.token] || { status: "preparando", tipo: a.tipo, pagamento: a.pagamento, total: a.total, horarios: {} };
  const ent = (d.tipo || a.tipo) === "entrega";
  let st = d.status || "enviado";
  if (!ent && st === "saiu") st = "pronto";
  const passos = ["enviado", "preparando", ent ? "saiu" : "pronto", "concluido"];
  const idx = passos.indexOf(st), fim = st === "concluido", cancel = st === "cancelado";
  const ilu = st === "saiu" ? `<span class="moto">🛵</span>` : fim ? `<span class="pula">🧡</span>` : cancel ? "😕"
    : st === "pronto" ? `<span class="pula">🛍️</span>` : st === "preparando" ? `<span class="pula">👨‍🍳</span>` : `<span class="pula">📨</span>`;
  const sub = {
    enviado: "A loja já recebeu e vai confirmar em instantes.", preparando: "Seu pedido está sendo feito agora, fresquinho.",
    saiu: "O entregador está a caminho. Fique de olho!", pronto: "Pode vir buscar no balcão 😉",
    concluido: ent ? "Bom apetite! Obrigado pela preferência." : "Retirado. Bom apetite!", cancelado: "Fale com a loja pelo WhatsApp se tiver dúvida.",
  }[st];
  const desc = { enviado: "Aguardando a loja confirmar", preparando: "Na cozinha", saiu: "Com o entregador", pronto: "Esperando você no balcão" };
  const h = d.horarios || {};
  const criado = paraData(d.criadoEm)?.getTime() || a.criado;
  const fx = faixaTempo(d.tempoEntrega || a.tempo);
  let prev = "";
  if (fim) prev = `<small>${ent ? "ENTREGUE ÀS" : "RETIRADO ÀS"}</small><strong>${hm(h.concluido) || "✓"}</strong>`;
  else if (!cancel && ent && fx) prev = `<small>PREVISÃO DE CHEGADA</small><strong>${hm(criado + fx[0] * 60000)}${fx[1] !== fx[0] ? " – " + hm(criado + fx[1] * 60000) : ""}</strong>`;
  else if (st === "pronto") prev = `<small>PRONTO PARA RETIRAR</small><strong>Pode vir ✓</strong>`;

  const seletor = acomps.length > 1 ? `<div class="ac-seletor">${acomps.map((x) => `<button data-acomp="${x.token}" class="${x.token === a.token ? "on" : ""}">Pedido ${hm(x.criado)}</button>`).join("")}</div>` : "";
  const total = d.total ?? a.total, taxa = d.taxaEntrega ?? a.taxa ?? 0, subt = d.subtotal ?? a.sub ?? total - taxa;
  const pag = d.pagamento || a.pagamento || "";
  const ehPix = /pix/i.test(pag);
  const icoPag = ehPix ? "💠" : /cart/i.test(pag) ? "💳" : "💵";
  const trocoV = d.valorTroco ?? a.troco;
  const itens = a.itens?.length
    ? a.itens.map((i) => `<div><span><i>${i.q}x</i> ${esc(i.nome)}</span><span>${brl(i.v)}</span></div>`).join("")
    : d.resumo ? `<div><span>${esc(d.resumo)}</span></div>` : "";
  const mapa = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(LOJA.nome + ", " + LOJA.endereco);

  $("acompCorpo").innerHTML = `
    <div class="ac-heroi ${fim ? "ok" : cancel ? "cancel" : ""}">
      <div class="ac-top"><button class="ac-voltar" data-fechar="telaAcomp" aria-label="Voltar">‹</button>
        <span>Pedido das ${hm(a.criado)}</span><b>${ent ? "🛵 Entrega" : "🛍️ Retirada"}</b></div>
      ${seletor}
      <div class="ac-ilu">${ilu}</div>${st === "saiu" ? `<div class="estrada"></div>` : ""}
      <h3>${ETQ[st] || "Pedido enviado"}</h3><p>${sub}</p>
      ${prev ? `<div class="ac-prev"><div>${prev}</div></div>` : ""}
      ${cancel ? "" : `<div class="ac-barra">${passos.map((p, i) => `<i class="${i < idx || fim ? "f" : i === idx ? "a" : ""}"></i>`).join("")}</div>`}
    </div>
    <div class="ac-corpo">
      ${cancel ? "" : `<div class="bloco"><ul class="ac-etapas">${passos.map((p, i) => {
        const f = i < idx || fim, at = i === idx && !fim;
        return `<li class="${f ? "f" : at ? "a" : ""}"><span class="bol">${f ? "✓" : i + 1}</span><div class="tx"><strong>${ETQ[p]}</strong>${at && desc[p] ? `<small>${desc[p]}</small>` : ""}</div><time>${f || at ? hm(h[p]) : ""}</time></li>`;
      }).join("")}</ul></div>`}
      <div class="bloco">${ent
        ? `<div class="ac-info"><span class="pino">📍</span><div><strong>Entregar em</strong><small>${esc(a.endereco || "Endereço informado no pedido")}</small></div></div>`
        : `<div class="ac-info"><span class="pino">🏪</span><div><strong>Retirar em</strong><small>${esc(LOJA.nome)}<br>${esc(LOJA.endereco)}</small><a href="${mapa}" target="_blank" rel="noopener">Abrir no mapa ›</a></div></div>`}</div>
      <div class="bloco"><div class="bt"><strong>Seu pedido</strong>${a.itens?.length ? `<em>${a.itens.reduce((s, i) => s + i.q, 0)} itens</em>` : ""}</div>
        <div class="ac-itens">${itens}</div>
        <div class="tot"><span>Subtotal</span><span>${brl(subt)}</span></div>
        ${ent ? `<div class="tot"><span>Entrega${a.regiao ? " · " + esc(a.regiao) : ""}</span><span>${taxa ? brl(taxa) : "Grátis"}</span></div>` : ""}
        <div class="tot grande"><span>Total</span><b>${brl(total)}</b></div>
        ${pag ? `<div class="ac-pag"><span>${icoPag} ${esc(pag)}${trocoV ? ` · troco p/ ${brl(trocoV)}` : ""}</span><span class="selo-pag">${ent ? "Pagar na entrega" : "Pagar na retirada"}</span></div>` : ""}
      </div>
      ${ehPix && chavePix && !fim && !cancel ? `<div class="bloco pix"><div class="rotulo">💠 PAGUE COM PIX · ${brl(total)}</div><div class="chave">${esc(chavePix)}</div>${favorecidoPix ? `<div class="pix-obs" style="color:var(--suave)">${esc(favorecidoPix)}</div>` : ""}<button data-copiar="1">Copiar chave PIX</button><div class="pix-obs">Envie o comprovante no WhatsApp da loja.</div></div>` : ""}
      <div class="ac-btns"><a class="btn-z verde" href="${a.whats}" target="_blank" rel="noopener" id="btnZap">💬 ${a.enviouWhats ? "Falar com a loja" : "Mandar no WhatsApp"}</a>
        <button class="btn-z linha" data-fechar="telaAcomp">Voltar ao cardápio</button></div>
      <p class="ac-ajuda">${a.enviouWhats ? "" : "O WhatsApp é opcional: a loja já recebeu seu pedido. "}Esta tela atualiza sozinha.</p>
    </div>`;
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
