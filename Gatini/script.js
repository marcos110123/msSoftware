import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  doc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ----------------------
// Firebase
// ----------------------
const firebaseConfig = {
  apiKey: "AIzaSyA9O4ZCqA-QPwJfa8k0FgI0ajAMDvrz23I",
  authDomain: "gatini-cac69.firebaseapp.com",
  projectId: "gatini-cac69",
  storageBucket: "gatini-cac69.firebasestorage.app",
  messagingSenderId: "28506251109",
  appId: "1:28506251109:web:1f1edcd7db439d577fcb8c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ----------------------
// Configuração da loja
// ----------------------
const LOJA = {
  nome: "Gatini Flor & Sabor",
  whatsapp: "5517996169592", // (17) 99616-9592
  taxaEntrega: 2.00          // CONFIRMAR com o cliente
};

// Ordem e nomes das categorias. O "id" é o valor do campo "categoria" no produto.
// Botões de categoria sem produtos ativos ficam ocultos automaticamente.
const CATEGORIAS = [
  { id: "promocoes",    nome: "Promoções",          emoji: "⭐" },
  { id: "lanches",      nome: "Lanches Naturais",   emoji: "🥪" },
  { id: "saladas",      nome: "Saladas",            emoji: "🥗" },
  { id: "sucos",        nome: "Sucos Tradicionais", emoji: "🍊" },
  { id: "nutricionais", nome: "Sucos Nutricionais", emoji: "🥬" },
  { id: "smoothies",    nome: "Smoothies",          emoji: "🍓" },
  { id: "mangamix",     nome: "Manga Mix",          emoji: "🥭" }
];

// ----------------------
// Estado
// ----------------------
let carrinho = carregarCarrinhoSalvo();
let tipoPedidoSelecionado = null;
let secaoAtiva = null;
let produtosAtuais = [];
const gruposOpcoes = new Map();

// ----------------------
// Helpers
// ----------------------
const $ = (id) => document.getElementById(id);
const brl = (v) => "R$ " + Number(v || 0).toFixed(2).replace(".", ",");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function carregarCarrinhoSalvo() {
  try {
    const c = JSON.parse(localStorage.getItem("carrinho") || "[]");
    return Array.isArray(c) ? c : [];
  } catch {
    return [];
  }
}
function salvarCarrinho() {
  try { localStorage.setItem("carrinho", JSON.stringify(carrinho)); } catch {}
}
const totalProdutos = () => carrinho.reduce((s, i) => s + Number(i.subtotal || 0), 0);
const taxaAtual = () => (tipoPedidoSelecionado === "entrega" ? LOJA.taxaEntrega : 0);

// Agrupa os complementos por grupo: ["Tamanho: G 500ml (+R$ 3,00)", "Pão: Pão sírio (+R$ 2,00)"]
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
// Estrutura (navegação + seções)
// ----------------------
function montarEstrutura() {
  const nav = $("navCategorias");
  const main = $("secoes");

  CATEGORIAS.forEach((cat) => {
    const btn = document.createElement("button");
    btn.dataset.categoria = cat.id;
    btn.className =
      "cat-btn group hidden flex flex-col items-center justify-center gap-2 rounded-2xl bg-white text-brand-800 " +
      "border border-brand-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition px-3 py-4 font-bold";
    btn.innerHTML = `<span class="cat-emoji grid place-items-center w-14 h-14 rounded-full bg-brand-50 text-3xl transition">${cat.emoji}</span>
                     <span class="text-sm text-center leading-tight">${esc(cat.nome)}</span>`;
    btn.addEventListener("click", () => mostrarSecao(cat.id));
    nav.appendChild(btn);

    const sec = document.createElement("section");
    sec.id = cat.id;
    sec.dataset.emoji = cat.emoji;
    sec.className = "section-produto hidden pt-6 pb-4 px-4 scroll-mt-20";
    sec.innerHTML = `
      <div class="max-w-6xl mx-auto">
        <div class="flex items-center gap-3 mb-5">
          <span class="text-3xl">${cat.emoji}</span>
          <h2 class="font-display font-extrabold text-3xl text-brand-800">${esc(cat.nome)}</h2>
          <span class="flex-1 h-px bg-brand-200 ml-2"></span>
        </div>
        <div class="produtos-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"></div>
      </div>`;
    main.appendChild(sec);
  });
}

function mostrarSecao(id) {
  const alvo = $(id);
  if (!alvo) return;

  if (secaoAtiva === id) {
    alvo.classList.add("hidden");
    secaoAtiva = null;
  } else {
    document.querySelectorAll(".section-produto").forEach((s) => s.classList.add("hidden"));
    alvo.classList.remove("hidden");
    alvo.scrollIntoView({ behavior: "smooth" });
    secaoAtiva = id;
  }
  document.querySelectorAll(".cat-btn").forEach((b) => {
    const ativo = b.dataset.categoria === secaoAtiva;
    b.classList.toggle("bg-brand-700", ativo);
    b.classList.toggle("text-white", ativo);
    b.classList.toggle("border-brand-700", ativo);
    b.classList.toggle("bg-white", !ativo);
    b.classList.toggle("text-brand-800", !ativo);
    b.querySelector(".cat-emoji").classList.toggle("bg-white/20", ativo);
    b.querySelector(".cat-emoji").classList.toggle("bg-brand-50", !ativo);
  });
}

// ----------------------
// Produtos
// ----------------------
function temPrecoVariavel(p) {
  return (p.grupos || []).some((k) => {
    const g = gruposOpcoes.get(k);
    return g && Number(g.min) >= 1 && (g.itens || []).some((i) => Number(i.preco) > 0);
  });
}

function criarCard(p, emoji) {
  const temOpcoes = (p.grupos || []).length > 0;
  const card = document.createElement("div");
  card.className =
    "bg-white rounded-3xl shadow-sm hover:shadow-lg transition overflow-hidden flex flex-col border border-brand-100";
  const capa = p.imagem
    ? `<img src="${esc(p.imagem)}" alt="${esc(p.nome)}" class="w-full h-full object-cover" loading="lazy" decoding="async">`
    : `<div class="w-full h-full grid place-items-center bg-gradient-to-br from-brand-50 to-brand-100 text-6xl">${emoji || "🌿"}</div>`;
  card.innerHTML = `
    <div class="relative ${p.imagem ? "aspect-[4/3]" : "h-28"}">
      ${capa}
      ${p.promocao ? '<span class="absolute top-3 left-3 bg-coral-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-full shadow">⭐ Promoção</span>' : ""}
    </div>
    <div class="p-4 flex flex-col flex-1">
      <h3 class="text-lg font-extrabold text-brand-800 leading-snug">${esc(p.nome)}</h3>
      <p class="text-gray-500 text-sm mt-1">${esc(p.descricao || "")}</p>
      <div class="mt-auto pt-4 flex items-center justify-between gap-3">
        <p class="leading-tight">
          ${temPrecoVariavel(p) ? '<span class="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide">a partir de</span>' : ""}
          <span class="text-xl font-extrabold text-coral-600">${brl(p.preco)}</span>
        </p>
        <button class="btn-add bg-brand-700 text-white px-4 py-2.5 rounded-full hover:bg-brand-800 font-bold shadow-sm transition text-sm whitespace-nowrap">
          ${temOpcoes ? "Escolher" : "+ Adicionar"}
        </button>
      </div>
    </div>`;

  card.querySelector(".btn-add").addEventListener("click", () => {
    if (temOpcoes) abrirModalOpcoes(p);
    else adicionarAoCarrinho({ nome: p.nome, precoBase: Number(p.preco) });
  });
  return card;
}

function renderizarProdutos() {
  document.querySelectorAll(".produtos-grid").forEach((g) => (g.innerHTML = ""));
  const contagem = {};

  produtosAtuais.forEach((p) => {
    const destinos = [p.categoria];
    if (p.promocao) destinos.push("promocoes");

    destinos.forEach((catId) => {
      const grid = $(catId)?.querySelector(".produtos-grid");
      if (!grid) return;
      grid.appendChild(criarCard(p, $(p.categoria)?.dataset.emoji));
      contagem[catId] = (contagem[catId] || 0) + 1;
    });
  });

  document.querySelectorAll(".cat-btn").forEach((b) =>
    b.classList.toggle("hidden", !contagem[b.dataset.categoria]));
}

onSnapshot(collection(db, "produtos"), (snap) => {
  produtosAtuais = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.status === "ativo")
    .sort((a, b) =>
      (a.ordem ?? 999) - (b.ordem ?? 999) ||
      String(a.nome).localeCompare(String(b.nome), "pt-BR"));
  renderizarProdutos();
}, (e) => console.error("Erro ao carregar produtos:", e));

onSnapshot(collection(db, "gruposOpcoes"), (snap) => {
  gruposOpcoes.clear();
  snap.forEach((d) => {
    const g = d.data();
    // itens marcados como esgotados no painel não aparecem para o cliente
    gruposOpcoes.set(d.id, { id: d.id, ...g, itens: (g.itens || []).filter((i) => !i.esgotado) });
  });
  renderizarProdutos();
}, (e) => console.error("Erro ao carregar opções:", e));

// ----------------------
// Modal de opções (tamanho, pão, base, temperos...)
// ----------------------
function regraGrupo(g) {
  const max = Number(g.max) || 1;
  const min = Number(g.min) || 0;
  let t = max === 1 ? "Escolha 1" : min > 0 ? `Escolha de ${min} a ${max}` : `Até ${max}`;
  if (g.gratis) t = `${g.gratis} inclusos · +${brl(g.precoExcedente)} cada adicional`;
  return t + (min > 0 ? " · obrigatório" : "");
}

function abrirModalOpcoes(p) {
  const chaves = p.grupos || [];
  const grupos = chaves.map((k) => gruposOpcoes.get(k)).filter(Boolean);
  if (grupos.length !== chaves.length) {
    mostrarAlerta("Não foi possível carregar as opções deste produto. Tente novamente em instantes.");
    return;
  }

  $("modalOpcoes")?.remove();
  const modal = document.createElement("div");
  modal.id = "modalOpcoes";
  modal.className = "fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50";
  modal.innerHTML = `
    <div class="bg-white w-full sm:max-w-lg sm:w-11/12 max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
      <div class="bg-brand-700 text-white px-6 py-4 flex items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold">${esc(p.nome)}</h2>
          <p class="text-sm text-brand-100">${esc(p.descricao || "")}</p>
        </div>
        <button data-fechar class="text-3xl leading-none text-brand-100 hover:text-white">&times;</button>
      </div>
      <div class="overflow-y-auto px-6 py-4 space-y-6">
        <div id="gruposContainer" class="space-y-6"></div>
        <div>
          <label for="obsProduto" class="block text-sm font-medium text-gray-700 mb-1">📝 Observação</label>
          <textarea id="obsProduto" rows="2" placeholder="Ex: sem gelo, molho à parte..."
            class="w-full p-2 border border-gray-300 rounded-xl resize-none focus:ring focus:ring-brand-200"></textarea>
        </div>
      </div>
      <div class="px-6 py-4 border-t flex gap-3">
        <button data-fechar class="w-1/3 bg-gray-200 hover:bg-gray-300 py-3 rounded-xl font-semibold">Cancelar</button>
        <button id="btnConfirmarOpcoes" class="flex-1 bg-brand-700 hover:bg-brand-800 text-white py-3 rounded-xl font-semibold">
          Adicionar · <span id="precoOpcoes"></span>
        </button>
      </div>
    </div>`;

  const container = modal.querySelector("#gruposContainer");
  grupos.forEach((g) => {
    const tipo = (Number(g.max) || 1) === 1 ? "radio" : "checkbox";
    const obrigatorio = Number(g.min) > 0;
    const bloco = document.createElement("fieldset");
    bloco.dataset.grupo = g.id;
    bloco.innerHTML = `
      <legend class="w-full flex justify-between items-baseline gap-2 mb-2">
        <span class="font-bold text-brand-800">${esc(g.titulo)}</span>
        <span class="text-xs ${obrigatorio ? "text-coral-600 font-semibold" : "text-gray-500"}">${esc(regraGrupo(g))}</span>
      </legend>
      <div class="space-y-2">
        ${(g.itens || []).map((item) => `
          <label class="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-brand-50
                        has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 transition">
            <input type="${tipo}" name="g_${esc(g.id)}" value="${esc(item.nome)}"
                   data-preco="${Number(item.preco) || 0}" class="opcaoItem accent-brand-700 w-5 h-5">
            <span class="flex-1">${esc(item.nome)}</span>
            ${Number(item.preco) > 0 ? `<span class="text-sm text-gray-500">+${brl(item.preco)}</span>` : ""}
          </label>`).join("")}
      </div>`;
    container.appendChild(bloco);
  });

  const marcadosDo = (g) => [...modal.querySelectorAll(`fieldset[data-grupo="${g.id}"] .opcaoItem:checked`)];

  function coletar() {
    const selecionados = [];
    let extras = 0;
    grupos.forEach((g) => {
      const marcados = marcadosDo(g);
      marcados.forEach((i) => {
        const preco = Number(i.dataset.preco) || 0;
        selecionados.push({ nome: i.value, preco, grupo: g.titulo });
        extras += preco;
      });
      if (g.gratis && marcados.length > g.gratis) {
        const n = marcados.length - g.gratis;
        const valor = n * (Number(g.precoExcedente) || 0);
        selecionados.push({ nome: `${n} adicional(is)`, preco: valor, grupo: g.titulo });
        extras += valor;
      }
    });
    return { selecionados, extras };
  }

  const atualizarPreco = () => {
    modal.querySelector("#precoOpcoes").textContent = brl(Number(p.preco) + coletar().extras);
  };

  modal.addEventListener("change", (e) => {
    const input = e.target;
    if (!input.classList?.contains("opcaoItem")) return;
    const g = grupos.find((x) => x.id === input.closest("fieldset").dataset.grupo);
    const max = Number(g?.max) || 1;
    if (input.type === "checkbox" && input.checked && marcadosDo(g).length > max) {
      input.checked = false;
      mostrarAlerta(`Em "${g.titulo}" você pode escolher até ${max} opções.`);
    }
    atualizarPreco();
  });

  modal.querySelector("#btnConfirmarOpcoes").addEventListener("click", () => {
    for (const g of grupos) {
      const min = Number(g.min) || 0;
      if (marcadosDo(g).length < min) {
        mostrarAlerta(min === 1
          ? `Escolha uma opção em "${g.titulo}".`
          : `Escolha pelo menos ${min} opções em "${g.titulo}".`);
        modal.querySelector(`fieldset[data-grupo="${g.id}"]`)
          .scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
    const { selecionados, extras } = coletar();
    adicionarAoCarrinho({
      nome: p.nome,
      precoBase: Number(p.preco),
      complementos: selecionados,
      extras,
      observacao: modal.querySelector("#obsProduto").value.trim()
    });
    modal.remove();
  });

  modal.querySelectorAll("[data-fechar]").forEach((b) => b.addEventListener("click", () => modal.remove()));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });

  document.body.appendChild(modal);
  atualizarPreco();
}

// ----------------------
// Carrinho
// ----------------------
function adicionarAoCarrinho({ nome, precoBase, complementos = [], extras = 0, observacao = "" }) {
  const preco = Number(precoBase) + Number(extras);
  carrinho.push({ nome, precoBase, complementos, preco, quantidade: 1, subtotal: preco, observacao });
  atualizarCarrinho();
  exibirNotificacao(nome);
}

function removerDoCarrinho(index) {
  carrinho.splice(index, 1);
  atualizarCarrinho();
}

function atualizarCarrinho() {
  const lista = $("carrinho-itens");
  const badge = $("badgeCarrinho");
  lista.innerHTML = "";

  if (carrinho.length === 0) {
    lista.innerHTML = '<p class="text-gray-500 text-center py-4">Nenhum item no carrinho.</p>';
    badge.classList.add("hidden");
  } else {
    carrinho.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "flex justify-between items-start gap-3 py-3 border-b border-brand-200/60 last:border-0";
      div.innerHTML = `
        <div class="flex-1 text-sm">
          <p class="font-semibold text-brand-800">${esc(item.nome)} <span class="text-gray-500 font-normal">· ${brl(item.subtotal)}</span></p>
          ${descreverComplementos(item).map((l) => `<p class="text-gray-500 text-xs">${esc(l)}</p>`).join("")}
          ${item.observacao ? `<p class="text-gray-500 text-xs">Obs: ${esc(item.observacao)}</p>` : ""}
        </div>
        <button class="text-coral-600 hover:text-coral-500 text-sm font-semibold">Remover</button>`;
      div.querySelector("button").addEventListener("click", () => removerDoCarrinho(index));
      lista.appendChild(div);
    });
    badge.textContent = carrinho.reduce((s, i) => s + i.quantidade, 0);
    badge.classList.remove("hidden");
  }

  const total = totalProdutos();
  $("barraCarrinho").classList.toggle("hidden", carrinho.length === 0);
  $("barraQtd").textContent = badge.textContent;
  $("barraTotal").textContent = brl(total);
  $("total").textContent = brl(total);
  $("resumoProdutos").textContent = brl(total);
  $("resumoTaxa").textContent = brl(taxaAtual());
  $("totalComEntregaPreview").textContent = brl(total + taxaAtual());
  salvarCarrinho();
}

function abrirCarrinho() { $("modalCarrinho").classList.remove("hidden"); }
function fecharCarrinho() { $("modalCarrinho").classList.add("hidden"); }

// ----------------------
// Fluxo do pedido
// ----------------------
$("orderForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    const snap = await getDoc(doc(db, "config", "estadoPedidos"));
    const recebendo = snap.exists() ? snap.data().recebendo !== false : true;
    if (!recebendo) {
      mostrarAlerta("A loja está fechada para pedidos no momento.");
      return;
    }
  } catch (err) {
    console.warn("Não foi possível verificar o status da loja:", err);
  }

  if (carrinho.length === 0) {
    mostrarAlerta("Seu carrinho está vazio!");
    return;
  }
  $("modalTipoPedido").classList.remove("hidden");
});

function selecionarTipoPedido(tipo) {
  tipoPedidoSelecionado = tipo;
  $("modalTipoPedido").classList.add("hidden");

  const entrega = tipo === "entrega";
  $("campoEndereco").classList.toggle("hidden", !entrega);
  $("linhaTaxaPreview").classList.toggle("hidden", !entrega);

  // Preenche com os dados do último pedido deste aparelho
  try {
    const salvo = JSON.parse(localStorage.getItem("cliente") || "{}");
    if (!$("nomeCliente").value) $("nomeCliente").value = salvo.nome || "";
    if (!$("telCliente").value) $("telCliente").value = salvo.tel || "";
    if (!$("enderecoCliente").value) $("enderecoCliente").value = salvo.endereco || "";
  } catch {}

  atualizarCarrinho();
  $("modalDadosEntrega").classList.remove("hidden");
}

function fecharModalEntrega() { $("modalDadosEntrega").classList.add("hidden"); }
function fecharModalTipoPedido() { $("modalTipoPedido").classList.add("hidden"); }

// Troco só aparece para pagamento em dinheiro
$("formaPagamento").addEventListener("change", () => {
  const dinheiro = $("formaPagamento").value === "Dinheiro";
  $("blocoTroco").classList.toggle("hidden", !dinheiro);
  if (!dinheiro) {
    $("precisaTroco").checked = false;
    $("valorTroco").value = "";
    $("valorTroco").classList.add("hidden");
  }
});
$("precisaTroco").addEventListener("change", () => {
  $("valorTroco").classList.toggle("hidden", !$("precisaTroco").checked);
});

function confirmarDadosEntrega() {
  const nome = $("nomeCliente").value.trim();
  const tel = $("telCliente").value.trim();
  const endereco = $("enderecoCliente").value.trim();
  const pagamento = $("formaPagamento").value;
  const entrega = tipoPedidoSelecionado === "entrega";
  const valorFinal = totalProdutos() + taxaAtual();

  if (!nome) return mostrarAlerta("Informe seu nome.");
  if (tel.replace(/\D/g, "").length < 10) return mostrarAlerta("Informe um telefone válido com DDD.");
  if (entrega && !endereco) return mostrarAlerta("Informe o endereço de entrega.");
  if (!pagamento) return mostrarAlerta("Selecione a forma de pagamento.");
  if ($("precisaTroco").checked) {
    const troco = parseFloat($("valorTroco").value);
    if (!(troco > valorFinal)) return mostrarAlerta(`O valor para troco deve ser maior que ${brl(valorFinal)}.`);
  }

  try { localStorage.setItem("cliente", JSON.stringify({ nome, tel, endereco })); } catch {}

  $("confNomeCliente").textContent = nome;
  $("confTelefoneCliente").textContent = tel;
  $("confEnderecoCliente").textContent = endereco;
  $("confPagamento").textContent = pagamento;
  $("linhaEndereco").style.display = entrega ? "block" : "none";

  const ul = $("listaItensConfirmacao");
  ul.innerHTML = "";
  carrinho.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <p class="font-semibold">${esc(item.nome)} · ${brl(item.subtotal)}</p>
      ${descreverComplementos(item).map((l) => `<p class="text-xs text-gray-500">${esc(l)}</p>`).join("")}
      ${item.observacao ? `<p class="text-xs text-gray-500">Obs: ${esc(item.observacao)}</p>` : ""}`;
    ul.appendChild(li);
  });

  $("valorTotalConfirmacao").textContent =
    `Total: ${brl(valorFinal)}` + (entrega ? ` (inclui entrega de ${brl(LOJA.taxaEntrega)})` : "");

  $("modalDadosEntrega").classList.add("hidden");
  $("modalConfirmacao").classList.remove("hidden");
}

$("btnCancelarConfirmacao").addEventListener("click", () => {
  $("modalConfirmacao").classList.add("hidden");
  $("modalDadosEntrega").classList.remove("hidden");
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
  m += `\n\n🙏 Obrigado pela preferência!\n🌿 *${LOJA.nome}*`;
  return m;
}

$("btnConfirmarPedido").addEventListener("click", async () => {
  const btn = $("btnConfirmarPedido");
  btn.disabled = true;

  // Abre a aba antes do "await": se abrir depois, o navegador do celular bloqueia o pop-up
  const janela = window.open("", "_blank");

  const tipo = tipoPedidoSelecionado;
  const pagamento = $("formaPagamento").value;
  const precisaTroco = $("precisaTroco").checked;
  const valorTroco = precisaTroco ? parseFloat($("valorTroco").value) || null : null;
  const taxa = taxaAtual();
  const tp = totalProdutos();
  const valorFinal = tp + taxa;
  const dados = {
    tipo,
    nome: $("confNomeCliente").textContent,
    tel: $("confTelefoneCliente").textContent,
    endereco: tipo === "entrega" ? $("confEnderecoCliente").textContent : "",
    pagamento, valorTroco, taxa, totalProdutos: tp, valorFinal,
    itens: carrinho.map((i) => ({ ...i }))
  };

  try {
    await addDoc(collection(db, "orders"), {
      items: dados.itens,
      totalProdutos: tp.toFixed(2),
      taxaEntrega: taxa,
      totalFinal: valorFinal.toFixed(2),
      precisaTroco,
      valorTroco,
      status: "pendente",
      createdAt: serverTimestamp(),
      formaPagamento: pagamento,
      nomeCliente: dados.nome,
      telefoneCliente: dados.tel,
      enderecoCliente: dados.endereco,
      tipo
    });

    const url = `https://wa.me/${LOJA.whatsapp}?text=${encodeURIComponent(montarMensagemWhatsApp(dados))}`;
    if (janela) janela.location.href = url;
    else window.location.href = url;

    carrinho = [];
    atualizarCarrinho();
    fecharCarrinho();
    $("formaPagamento").value = "";
    $("formaPagamento").dispatchEvent(new Event("change"));
    $("modalConfirmacao").classList.add("hidden");
    $("modalSucessoPedido").classList.remove("hidden");
  } catch (err) {
    console.error(err);
    janela?.close();
    mostrarAlerta("Erro ao enviar o pedido. Tente novamente.");
  } finally {
    btn.disabled = false;
  }
});

function fecharModalSucesso() { $("modalSucessoPedido").classList.add("hidden"); }

// ----------------------
// Loja aberta/fechada
// ----------------------
onSnapshot(doc(db, "config", "estadoPedidos"), (snap) => {
  const recebendo = snap.exists() ? snap.data().recebendo !== false : true;
  $("aviso-fechado").classList.toggle("hidden", recebendo);
});

// ----------------------
// Notificação e alertas
// ----------------------
function exibirNotificacao(nome) {
  const n = document.createElement("div");
  n.className =
    "fixed top-20 left-1/2 -translate-x-1/2 bg-brand-800 text-white px-5 py-3 rounded-full shadow-xl z-50 " +
    "font-bold text-sm max-w-[90vw] text-center";
  n.textContent = `✅ ${nome} adicionado ao carrinho!`;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 2500);
}

function mostrarAlerta(msg) {
  $("mensagemAlerta").textContent = msg;
  $("modalAlerta").classList.remove("hidden");
}
function fecharModalAlerta() { $("modalAlerta").classList.add("hidden"); }

// ----------------------
// PWA
// ----------------------
let deferredPrompt;
const installButton = $("install-button");
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installButton.classList.remove("hidden");
});
installButton.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installButton.classList.add("hidden");
});
window.addEventListener("appinstalled", () => installButton.classList.add("hidden"));

// ----------------------
// Funções usadas pelo HTML
// ----------------------
Object.assign(window, {
  abrirCarrinho,
  fecharCarrinho,
  mostrarSecao,
  selecionarTipoPedido,
  fecharModalEntrega,
  fecharModalTipoPedido,
  confirmarEntrega: confirmarDadosEntrega,
  fecharModalSucesso,
  fecharModalAlerta
});

// ----------------------
// Início
// ----------------------
montarEstrutura();
atualizarCarrinho();
