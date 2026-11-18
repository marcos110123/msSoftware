import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  setDoc,
  getDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ----------------------
// Firebase Config
// ----------------------
const firebaseConfig = {
  apiKey: "AIzaSyCP2R5O1Fzm28U68jKCfJ0Mmt7r0boIIeA",
  authDomain: "gabs-teste.firebaseapp.com",
  projectId: "gabs-teste",
  storageBucket: "gabs-teste.firebasestorage.app",
  messagingSenderId: "80535000481",
  appId: "1:80535000481:web:b5081046e102f4c12127e0",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ----------------------
// Variáveis globais
// ----------------------
let carrinho = [];
let total = 0;
let secaoAtiva = null;
let tipoPedidoSelecionado = null;

// Entregas pausadas pelo painel (config/estadoPedidos.entregaPausada): o cardápio aceita só retirada
let entregaPausada = false;
const AVISO_SEM_ENTREGA = "As entregas estão pausadas no momento. Você pode pedir para retirar no balcão.";
function atualizarEntregaPausada(snap, recebendo = true) {
  entregaPausada = snap.exists() && snap.data().entregaPausada === true;
  const aviso = document.getElementById("aviso-entrega");
  if (aviso) aviso.classList.toggle("hidden", !entregaPausada || !recebendo);
  const btn = document.getElementById("btnTipoEntrega");
  if (btn) {
    btn.disabled = entregaPausada;
    btn.classList.toggle("opacity-40", entregaPausada);
    btn.classList.toggle("cursor-not-allowed", entregaPausada);
  }
  const nota = document.getElementById("avisoSemEntrega");
  if (nota) nota.classList.toggle("hidden", !entregaPausada);
}

const taxaEntregaFixa = 2.0;
const fmtR = (v) => "R$ " + Number(v || 0).toFixed(2).replace(".", ",");

function arredondar99(valor) {
  return Number((Math.ceil(valor) - 0.01).toFixed(2));
}

// ----------------------
// Carregar produtos
// ----------------------
function carregarProdutosDoFirestore() {
  const ref = collection(db, "produtos");
  const q = query(ref, orderBy("nome", "asc")); // ordena pelo campo "nome"

  onSnapshot(q, (snapshot) => {
    document
      .querySelectorAll(".produtos-grid")
      .forEach((grid) => (grid.innerHTML = ""));
    PRODUTOS = {};

    snapshot.forEach((docSnap) => {
      const produto = docSnap.data();
      if (produto.status !== "ativo") return;
      PRODUTOS[docSnap.id] = produto;

      const secao = document.getElementById(produto.categoria);
      if (!secao) return;

      const container = secao.querySelector(".produtos-grid");
      if (!container) return;

      const card = document.createElement("div");

      const precoOriginal = Number(produto.preco || 0);

      const precoPromocional = produto.promocao
        ? precoOriginal * 0.8
        : precoOriginal;

      card.className = "menu-item bg-gray-800 rounded-lg shadow-lg p-4";

      // esfihas: quantidade direto no card (+ e −), sem abrir janela
      const ehQtd = produto.categoria === "entradas" && !(produto["preco P"] && produto["preco G"]);

      card.innerHTML = `
  <img src="${produto.imagem || ""}" 
       alt="${produto.nome}" 
       class="w-full h-48 object-cover rounded-md shadow-lg" 
       loading="lazy" 
       decoding="async">

  <h3 class="text-xl font-semibold mt-4 text-white">
    ${produto.nome}
  </h3>

  <p class="text-gray-300">
    ${produto.descricao || ""}
  </p>
${
  produto.categoria?.startsWith("pizzas") ||
  (produto.categoria === "entradas" && produto["preco P"] && produto["preco G"])
    ? `
      <div class="mt-2 text-sm">

        <div class="flex gap-3 items-center flex-wrap">

 ${
   produto.promocao
     ? `
      <span class="bg-red-600/20 text-red-400 px-2 py-1 rounded-lg font-semibold">
        P: R$ ${Number(produto["preco P"] || 0)
          .toFixed(2)
          .replace(".", ",")}
      </span>

      <span class="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg font-semibold line-through">
        G: R$ ${Number(produto["preco G"] || 0)
          .toFixed(2)
          .replace(".", ",")}
      </span>

      <span class="bg-green-600/20 text-green-400 px-2 py-1 rounded-lg font-semibold">
       G Promo: R$ ${arredondar99(Number(produto["preco G"] || 0) * 0.8)
         .toFixed(2)
         .replace(".", ",")}
      </span>

      <span class="bg-red-600 text-white text-xs px-2 py-1 rounded">
        -20%
      </span>
    `
     : `
      <span class="bg-red-600/20 text-red-400 px-2 py-1 rounded-lg font-semibold">
        Broto: R$ ${Number(produto["preco P"] || 0)
          .toFixed(2)
          .replace(".", ",")}
      </span>

      <span class="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg font-semibold">
        Grande: R$ ${Number(produto["preco G"] || 0)
          .toFixed(2)
          .replace(".", ",")}
      </span>
    `
 }

        </div>

      </div>
    `
    : `
     ${
       produto.promocao && produto.categoria === "pizzas-salgadas"
         ? `
      <div class="mt-2">
        <p class="text-gray-400 line-through text-sm">
          R$ ${precoOriginal.toFixed(2).replace(".", ",")}
        </p>

        <p class="text-green-400 font-bold text-xl">
          R$ ${precoPromocional.toFixed(2).replace(".", ",")}
        </p>

        <span class="bg-red-600 text-white text-xs px-2 py-1 rounded">
          -20%
        </span>
      </div>
    `
         : `
      <p class="text-red-500 font-bold mt-2">
        R$ ${precoOriginal.toFixed(2).replace(".", ",")}
      </p>
    `
     }
    `
}
${ehQtd ? htmlQtd(produto.nome, precoPromocional) : ""}
  <button
${ehQtd ? "hidden" : ""}
onclick='${
        produto.categoria === "entradas" &&
        produto["preco P"] &&
        produto["preco G"]
          ? `abrirModalEntrada(${JSON.stringify(produto).replace(
              /'/g,
              "&apos;",
            )})`
          : produto.categoria?.startsWith("pizzas")
            ? `abrirModalPizza(${JSON.stringify(produto).replace(
                /'/g,
                "&apos;",
              )})`
            : `adicionarAoCarrinho("${produto.nome}", ${precoPromocional}, "")`
      }'

    class="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">

    Adicionar ao Carrinho

  </button>
`;

      container.appendChild(card);
      // Se for marcado como mais vendido, também mostra na seção "mais-vendidas"
      // Se estiver em promoção, também mostra na seção promoções
      if (produto.promocao) {
        const promocoesSecao = document.getElementById("promocoes");

        if (promocoesSecao) {
          const promocoesContainer =
            promocoesSecao.querySelector(".produtos-grid");

          if (promocoesContainer) {
            const clone = card.cloneNode(true);
            promocoesContainer.appendChild(clone);
          }
        }
      }
    });

    

 const btnPromocao = document.getElementById("btn-promocao");
const gridPromocoes = document.querySelector("#promocoes .produtos-grid");

btnPromocao.classList.toggle(
  "hidden",
  gridPromocoes.children.length === 0
);

const btnCombos = document.getElementById("btn-combos");
const gridCombos = document.querySelector("#combos .produtos-grid");

btnCombos.classList.toggle(
  "hidden",
  gridCombos.children.length === 0
);

    montarMaisPedidos();
    atualizarQtdsNosCards();
  });
}

// ----------------------
// Mais pedidos (carrossel da tela inicial) — nomes exatamente como no cadastro de produtos
// ----------------------
let PRODUTOS = {};
const MAIS_PEDIDOS = [
  "Gab's",
  "Esfiha de carne",
  "Calzone de Contra Filé",
  "Calabresa",
  "Chocolate preto",
  "Esfiha de frango com catupiry",
  "Calzone de Frango com Catupiry",
  "Frango com catupiry",
];
const escAttr = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function precoVitrine(p) {
  if (p["preco P"] && p["preco G"]) return "a partir de " + fmtR(Math.min(p["preco P"], p["preco G"]));
  return fmtR(p.promocao ? Number(p.preco || 0) * 0.8 : p.preco);
}

function montarMaisPedidos() {
  const caixa = document.getElementById("maisPedidos");
  const trilho = document.getElementById("mpTrilho");
  if (!caixa || !trilho) return;
  const ids = Object.keys(PRODUTOS);
  const lista = MAIS_PEDIDOS
    .map((nome) => ids.find((id) => PRODUTOS[id].nome === nome))
    .filter(Boolean);
  trilho.innerHTML = lista.map((id) => {
    const p = PRODUTOS[id];
    return `<button type="button" class="mp-card" onclick="comprarProduto('${escAttr(id)}')">
      <img src="${escAttr(p.imagem)}" alt="${escAttr(p.nome)}" loading="lazy">
      <span class="mp-txt">
        <span class="mp-nome">${escAttr(p.categoria?.startsWith("pizzas") ? "Pizza " + p.nome : p.nome)}</span>
        <span class="mp-preco mp-add">${precoVitrine(p)}</span>
      </span>
    </button>`;
  }).join("");
  caixa.classList.toggle("hidden", lista.length === 0);
}

window.comprarProduto = function (id) {
  const p = PRODUTOS[id];
  if (!p) return;
  if (p.categoria?.startsWith("pizzas")) return abrirModalPizza(p);
  if (p.categoria === "entradas" && p["preco P"] && p["preco G"]) return abrirModalEntrada(p);
  adicionarAoCarrinho(p.nome, p.promocao ? Number(p.preco || 0) * 0.8 : Number(p.preco || 0), "");
};

// ----------------------
// Quantidade no card (esfihas)
// ----------------------
function htmlQtd(nome, preco) {
  return `<div class="qtd-box mt-4" data-qtd-nome="${escAttr(nome)}" data-preco="${Number(preco)}">
    <button type="button" class="qtd-btn" aria-label="Tirar um" onclick="alterarQtd(this,-1)">−</button>
    <span class="qtd-num">0</span>
    <button type="button" class="qtd-btn mais" aria-label="Adicionar um" onclick="alterarQtd(this,1)">+</button>
  </div>`;
}

window.alterarQtd = function (btn, delta) {
  const box = btn.closest(".qtd-box");
  const nome = box.dataset.qtdNome;
  const preco = Number(box.dataset.preco);
  if (delta > 0) return adicionarAoCarrinho(nome, preco, "", true);
  const i = carrinho.findIndex((it) => it.nome === nome && it.observacao === "");
  if (i < 0) return;
  const it = carrinho[i];
  it.quantidade -= 1;
  it.subtotal = Number((it.subtotal - it.preco).toFixed(2));
  if (it.quantidade <= 0) carrinho.splice(i, 1);
  atualizarCarrinho();
};

function atualizarQtdsNosCards() {
  document.querySelectorAll(".qtd-box").forEach((box) => {
    const it = carrinho.find((x) => x.nome === box.dataset.qtdNome && x.observacao === "");
    const n = it ? it.quantidade : 0;
    box.querySelector(".qtd-num").textContent = n;
    box.classList.toggle("ativo", n > 0);
  });
}

carregarProdutosDoFirestore();

// ----------------------
// Seções
// ----------------------
function mostrarSecao(id) {
  const secoes = document.querySelectorAll(".section-produto");
  if (secaoAtiva === id) {
    document.getElementById(id).style.display = "none";
    secaoAtiva = null;
    return;
  }
  secoes.forEach((secao) => (secao.style.display = "none"));
  const secaoSelecionada = document.getElementById(id);
  if (secaoSelecionada) {
    secaoSelecionada.style.display = "block";
    secaoSelecionada.scrollIntoView({ behavior: "smooth" });
    secaoAtiva = id;
  }
}

// ----------------------
// Carrinho
// ----------------------
function adicionarAoCarrinho(nome, preco, observacao = "", silencioso = false) {
  const itemExistente = carrinho.find(
    (item) => item.nome === nome && item.observacao === observacao,
  );

  if (itemExistente) {
    itemExistente.quantidade += 1;
    itemExistente.subtotal += preco;
  } else {
    carrinho.push({ nome, preco, quantidade: 1, subtotal: preco, observacao });
  }

  total += preco;
  atualizarCarrinho();
  if (!silencioso) exibirNotificacao(nome);
}

function removerDoCarrinho(index) {
  const item = carrinho[index];
  total -= item.subtotal;
  carrinho.splice(index, 1);
  atualizarCarrinho();
}

function atualizarCarrinho() {
  const carrinhoItens = document.getElementById("carrinho-itens");
  const badge = document.getElementById("badgeCarrinho");

  badge.textContent = "0";
  badge.classList.add("hidden");
  carrinhoItens.innerHTML = "";

  if (carrinho.length === 0) {
    carrinhoItens.innerHTML =
      '<p class="text-gray-300">Nenhum item no carrinho.</p>';
  } else {
    carrinho.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "flex justify-between items-center py-2 border-b";
      div.innerHTML = `
  <div class="flex-1">
    <span>${item.quantidade}x ${item.nome}</span> - 
    <span>${fmtR(item.subtotal)}</span>
    ${item.observacao ? `<br><small class="text-gray-400">Obs: ${item.observacao}</small>` : ""}
  </div>
  <button class="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700" 
    onclick="removerDoCarrinho(${index})">Remover</button>
`;

      carrinhoItens.appendChild(div);
    });

    const totalItens = carrinho.reduce((sum, item) => sum + item.quantidade, 0);
    badge.textContent = totalItens;
    badge.classList.remove("hidden");
  }

  total = carrinho.reduce((sum, item) => sum + item.subtotal, 0);
  const taxaEntrega = tipoPedidoSelecionado === "entrega" ? taxaEntregaFixa : 0;

  document.getElementById("total").textContent = total.toFixed(2).replace(".", ",");
  document.getElementById("totalComEntregaPreview").textContent = (
    total + taxaEntrega
  )
    .toFixed(2)
    .replace(".", ",");
  const linhaTaxa = document.getElementById("linhaTaxaEntrega");
  if (linhaTaxa) linhaTaxa.textContent = taxaEntrega > 0 ? `Produtos ${fmtR(total)} + entrega ${fmtR(taxaEntrega)}` : "";

  atualizarQtdsNosCards();
  try { localStorage.setItem("carrinho", JSON.stringify(carrinho)); } catch {}
}

function abrirCarrinho() {
  document.getElementById("modalCarrinho").classList.remove("hidden");
}
function fecharCarrinho() {
  document.getElementById("modalCarrinho").classList.add("hidden");
}

// ----------------------
// Fluxo de Pedido
// ----------------------
document
  .getElementById("orderForm")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    const estadoRef = doc(db, "config", "estadoPedidos");
    const snap = await getDoc(estadoRef);
    const recebendo = snap.exists() ? snap.data().recebendo : true;
    atualizarEntregaPausada(snap);

    if (!recebendo) {
      mostrarAlerta("⚠️ O sistema está temporariamente fechado para pedidos.");
      return;
    }

    if (carrinho.length === 0) {
      mostrarAlerta("Seu carrinho está vazio!");
      return;
    }

    document.getElementById("modalTipoPedido").classList.remove("hidden");
  });

window.selecionarTipoPedido = function (tipo) {
  if (tipo === "entrega" && entregaPausada) return mostrarAlerta(AVISO_SEM_ENTREGA);
  tipoPedidoSelecionado = tipo;

  if (tipo === "retirada") {
    const campoBairro = document.getElementById("bairroEntrega");
    if (campoBairro) campoBairro.value = "";

    const campoTaxa = document.getElementById("taxaEntregaValor");
    if (campoTaxa) campoTaxa.textContent = "0.00";

    localStorage.removeItem("cliente_endereco");
    localStorage.removeItem("cliente_bairro");
    localStorage.removeItem("cliente_regiao");
    localStorage.removeItem("forma_pagamento");

    const selectPagamento = document.getElementById("formaPagamento");
    if (selectPagamento) {
      selectPagamento.value = "";
    }
    atualizarBlocoPix();
  }

  document.getElementById("modalTipoPedido")?.classList.add("hidden");

  const campoEndereco = document.getElementById("campoEndereco");
  const blocoEntrega = document.getElementById("blocoEntrega");

  if (tipo === "retirada") {
    campoEndereco?.classList.add("hidden");
    blocoEntrega?.classList.add("hidden");
  } else {
    campoEndereco?.classList.remove("hidden");
    blocoEntrega?.classList.remove("hidden");
  }

  atualizarCarrinho();

  document.getElementById("modalDadosEntrega")?.classList.remove("hidden");
};

window.fecharModalTipoPedido = function () {
  document.getElementById("modalTipoPedido").classList.add("hidden");
};

window.fecharModalEntrega = function () {
  document.getElementById("modalDadosEntrega").classList.add("hidden");
};

// ----------------------
// Confirmação do Pedido
// ----------------------
window.confirmarDadosEntrega = function () {
  const nome = document.getElementById("nomeCliente").value.trim();
  const tel = document.getElementById("telCliente").value.trim();
  const endereco = document.getElementById("enderecoCliente").value.trim();
  const formaPagamento = document.getElementById("formaPagamento").value;

  if (
    !nome ||
    !tel ||
    (tipoPedidoSelecionado === "entrega" && (!endereco || !formaPagamento))
  ) {
    mostrarAlerta("Preencha todos os dados obrigatórios.");
    return;
  }

  // Preenche confirmação
  document.getElementById("confNomeCliente").textContent = nome;
  document.getElementById("confTelefoneCliente").textContent = tel;
  document.getElementById("confEnderecoCliente").textContent = endereco;
  document.getElementById("linhaEndereco").style.display =
    tipoPedidoSelecionado === "entrega" ? "block" : "none";

  const listaItens = document.getElementById("listaItensConfirmacao");
  listaItens.innerHTML = "";
  carrinho.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.quantidade}x ${item.nome} - ${fmtR(item.subtotal)}`;
    if (item.observacao) {
      li.innerHTML += `<br><small>Obs: ${item.observacao}</small>`;
    }
    listaItens.appendChild(li);
  });

  const taxa = tipoPedidoSelecionado === "entrega" ? taxaEntregaFixa : 0;
  const valorFinal = total + taxa;

  document.getElementById("valorTotalConfirmacao").innerHTML =
    (taxa > 0 ? `<span class="block text-sm font-normal text-gray-400">Produtos ${fmtR(total)} + entrega ${fmtR(taxa)}</span>` : "") +
    `Total: ${fmtR(valorFinal)}`;

  document.getElementById("modalDadosEntrega").classList.add("hidden");
  document.getElementById("modalConfirmacao").classList.remove("hidden");
};

// ----------------------
// Envio Pedido (Firestore + WhatsApp)
// Trava contra pedido duplicado: o botão bloqueia enquanto envia e o código do pedido é gerado
// uma vez só; se o cliente tentar de novo depois de um erro, grava no mesmo pedido em vez de criar outro.
let enviandoPedido = false;
let idPedidoPendente = null;
let tentativasPedido = 0;

document
  .getElementById("btnConfirmarPedido")
  .addEventListener("click", async () => {
    if (enviandoPedido) return;
    if (tipoPedidoSelecionado === "entrega" && entregaPausada) return mostrarAlerta(AVISO_SEM_ENTREGA);
    const nome = document.getElementById("confNomeCliente").textContent;
    const tel = document.getElementById("confTelefoneCliente").textContent;
    const endereco = document.getElementById("confEnderecoCliente").textContent;
    const formaPagamento = document.getElementById("formaPagamento").value;

    const precisaTroco = document.getElementById("precisaTroco").checked;
    const valorTroco = precisaTroco
      ? parseFloat(document.getElementById("valorTroco").value || 0)
      : null;

    const taxa = tipoPedidoSelecionado === "entrega" ? taxaEntregaFixa : 0;
    const totalProdutos = carrinho.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );
    const valorFinal = totalProdutos + taxa;

    // chamada depois que o pedido está gravado: abre o WhatsApp e limpa o carrinho
    const pedidoEnviado = () => {
      idPedidoPendente = null;
      tentativasPedido = 0;

      // --- WhatsApp ---
      const mensagem = mensagemPedidoWhats({
        loja: "Gab's Pizzaria & Esfiharia", coracao: "❤️", tipo: tipoPedidoSelecionado, itens: carrinho,
        produtos: totalProdutos, taxa, total: valorFinal, pagamento: formaPagamento,
        troco: precisaTroco && valorTroco ? valorTroco : null,
        nome, tel, endereco
      });

      const telefoneLoja = "5511937293763"; // 👈 coloque o número da loja
      const url = `https://wa.me/${telefoneLoja}?text=${encodeURIComponent(mensagem)}`;
      window.open(url, "_blank");

      // Resetar carrinho
      carrinho = [];
      total = 0;
      atualizarCarrinho();

      // Fechar modal do carrinho também
      fecharCarrinho();

      // Limpar todos os campos do modal
      document.getElementById("formaPagamento").value = "";
      document.getElementById("precisaTroco").checked = false;
      document.getElementById("valorTroco").value = "";
      atualizarBlocoPix();

      document.getElementById("modalConfirmacao").classList.add("hidden");
      document.getElementById("modalSucessoPedido").classList.remove("hidden");
    };

    const btn = document.getElementById("btnConfirmarPedido");
    const textoBtn = btn.innerHTML;
    enviandoPedido = true;
    btn.disabled = true;
    btn.style.opacity = "0.6";
    btn.innerHTML = "Enviando...";

    try {
      if (!idPedidoPendente) { idPedidoPendente = doc(collection(db, "orders")).id; tentativasPedido = 0; }
      tentativasPedido++;

      await setDoc(doc(db, "orders", idPedidoPendente), {
        items: carrinho,
        totalProdutos: totalProdutos.toFixed(2),
        taxaEntrega: taxa,
        totalFinal: valorFinal.toFixed(2),
        precisaTroco: precisaTroco,
        valorTroco: valorTroco,
        status: "pendente",
        createdAt: serverTimestamp(),
        formaPagamento,
        nomeCliente: nome,
        telefoneCliente: tel,
        enderecoCliente: tipoPedidoSelecionado === "entrega" ? endereco : "",
        tipo: tipoPedidoSelecionado,
      });

      pedidoEnviado();
    } catch (e) {
      console.error(e);
      // Nova tentativa do MESMO pedido recusada: o primeiro envio já tinha chegado (só a resposta se perdeu).
      if (tentativasPedido > 1 && e?.code === "permission-denied") {
        pedidoEnviado();
      } else {
        mostrarAlerta("Erro ao enviar pedido. Verifique a internet e toque em Confirmar de novo (não duplica).");
      }
    } finally {
      enviandoPedido = false;
      btn.disabled = false;
      btn.style.opacity = "";
      btn.innerHTML = textoBtn;
    }
  });

window.fecharModalSucesso = function () {
  document.getElementById("modalSucessoPedido").classList.add("hidden");
};

// ----------------------
// Notificação
// ----------------------
function exibirNotificacao(nome) {
  const notificacao = document.createElement("div");

  notificacao.className = `
    fixed bottom-4 right-4
    bg-[#161616]/95
    border border-red-800/30
    text-white
    px-5 py-3
    rounded-2xl
    shadow-[0_0_30px_rgba(200,16,46,0.18)]
    backdrop-blur-sm
    z-50
    animate-bounce
  `;

  notificacao.innerHTML = `
    <div class="flex items-center gap-3">
      <span class="text-2xl">🍕</span>
      <div>
        <p class="font-semibold text-yellow-400">
          Adicionado ao carrinho
        </p>
        <p class="text-sm text-gray-300">
          ${nome}
        </p>
      </div>
    </div>
  `;

  document.body.appendChild(notificacao);

  setTimeout(() => {
    notificacao.classList.add(
      "opacity-0",
      "translate-y-2",
      "transition",
      "duration-300",
    );

    setTimeout(() => notificacao.remove(), 300);
  }, 2200);
}
// ----------------------
// PWA
// ----------------------
let deferredPrompt;
const installButton = document.getElementById("install-button");
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installButton.style.display = "block";
});
installButton.addEventListener("click", async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installButton.style.display = "none";
  }
});
window.addEventListener("appinstalled", () => {
  installButton.style.display = "none";
});
// ----------------------
// Aviso aberto/fechado
// ----------------------
const estadoRef = doc(db, "config", "estadoPedidos");
onSnapshot(estadoRef, (snap) => {
  const recebendo = snap.exists() ? snap.data().recebendo : true;
  const aviso = document.getElementById("aviso-fechado");
  const chip = document.querySelector(".chip-aberto");
  if (chip) { chip.innerHTML = recebendo ? "<i></i> Aberto agora" : "Fechado agora"; chip.classList.toggle("fechado", !recebendo); }
  atualizarEntregaPausada(snap, recebendo);
  if (!aviso) return;
  aviso.classList.toggle("hidden", recebendo);
});

// ----------------------
// Alertas
// ----------------------
function mostrarAlerta(msg) {
  document.getElementById("mensagemAlerta").textContent = msg;
  document.getElementById("modalAlerta").classList.remove("hidden");
}
window.fecharModalAlerta = function () {
  document.getElementById("modalAlerta").classList.add("hidden");
};

document
  .getElementById("btnCancelarConfirmacao")
  .addEventListener("click", () => {
    // Fecha o modal de confirmação
    document.getElementById("modalConfirmacao").classList.add("hidden");

    // Reabre o modal de dados para edição
    document.getElementById("modalDadosEntrega").classList.remove("hidden");
  });

// ----------------------
// Expor globalmente
// ----------------------
window.adicionarAoCarrinho = adicionarAoCarrinho;
window.removerDoCarrinho = removerDoCarrinho;
window.abrirCarrinho = abrirCarrinho;
window.fecharCarrinho = fecharCarrinho;
window.mostrarSecao = mostrarSecao;
window.confirmarDadosEntrega = confirmarDadosEntrega;
window.confirmarEntrega = confirmarDadosEntrega;

let pizzaSelecionada = null;
let saboresPizza = [];

window.abrirModalPizza = async function (produto) {
  pizzaSelecionada = produto;

  document.getElementById("pizzaNome").textContent = produto.nome;

  document.getElementById("precoP").textContent =
    `R$ ${produto["preco P"].toFixed(2).replace(".", ",")}`;

  let precoG = Number(produto["preco G"]);

  if (produto.promocao && produto.categoria === "pizzas-salgadas") {
    precoG *= 0.8;

    // arredonda para terminar em ,99
    precoG = Math.ceil(precoG) - 0.01;
    precoG = Number(precoG.toFixed(2));
  }

  document.getElementById("precoG").textContent =
    `R$ ${precoG.toFixed(2).replace(".", ",")}`;

  document.getElementById("modalPizza").classList.remove("hidden");

  document.getElementById("obsPizza").value = "";

  // já abre com Grande + Pizza inteira marcados (o cliente só troca se quiser)
  document.querySelector('input[name="tamanhoPizza"][value="G"]').checked = true;
  document.querySelector('input[name="tipoPizza"][value="inteira"]').checked = true;
  document.getElementById("tipoPizzaBox").classList.remove("hidden");
  document.getElementById("segundoSaborBox").classList.add("hidden");

  saboresPizza = [produto];
};

window.fecharModalPizza = function () {
  // fecha modal
  document.getElementById("modalPizza").classList.add("hidden");

  // esconde seções
  document.getElementById("segundoSaborBox").classList.add("hidden");

  document.getElementById("tipoPizzaBox").classList.add("hidden");

  // limpa tamanho
  document.querySelectorAll('input[name="tamanhoPizza"]').forEach((input) => {
    input.checked = false;
  });

  // limpa tipo pizza
  document.querySelectorAll('input[name="tipoPizza"]').forEach((input) => {
    input.checked = false;
  });

  // limpa segundo sabor
  document.querySelectorAll('input[name="segundoSabor"]').forEach((input) => {
    input.checked = false;
  });

  // limpa lista carregada
  document.getElementById("listaSabores").innerHTML = "";

  // limpa adicionais
  document.querySelectorAll('input[name="adicionalPizza"]').forEach((input) => {
    input.checked = false;
  });

  // limpa observação
  document.getElementById("obsPizza").value = "";

  // limpa referência atual
  pizzaSelecionada = null;
};
// Gab's não trabalha com adicionais na pizza: a pergunta foi tirada do modal
function perguntarAdicionais() {}

// botão SIM
// botão SIM
document
  .getElementById("btnComAdicional")
  ?.addEventListener("click", async () => {
    // esconde a pergunta
    document.getElementById("perguntaAdicionais")?.classList.add("hidden");

    // carrega adicionais novamente
    await carregarAdicionaisPizza();

    // mostra a box dos adicionais
    document.getElementById("boxAdicionaisPizza")?.classList.remove("hidden");

    scrollParaElemento("boxAdicionaisPizza");
  });

// botão NÃO
document.getElementById("btnSemAdicional")?.addEventListener("click", () => {
  document.getElementById("perguntaAdicionais")?.classList.add("hidden");

  document.getElementById("boxAdicionaisPizza")?.classList.add("hidden");
});

function scrollParaElemento(id) {
  setTimeout(() => {
    const el = document.getElementById(id);

    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, 250);
}

document.addEventListener("change", async (e) => {
  // tamanho
  if (e.target.name === "tamanhoPizza") {
    const tamanho = e.target.value;

    document.getElementById("tipoPizzaBox").classList.remove("hidden");

scrollParaElemento("tipoPizzaBox");

document.getElementById("segundoSaborBox").classList.add("hidden");

document.getElementById("perguntaAdicionais")?.classList.add("hidden");

document.getElementById("boxAdicionaisPizza")?.classList.add("hidden");

  }

  // tipo pizza
  if (e.target.name === "tipoPizza") {
    const tipo = e.target.value;

    // reset
    document.getElementById("boxAdicionaisPizza")?.classList.add("hidden");

    document.getElementById("perguntaAdicionais")?.classList.add("hidden");

    // MEIO A MEIO
    if (tipo === "meio") {
      const lista = document.getElementById("listaSabores");

      lista.innerHTML = "Carregando...";

      document.getElementById("segundoSaborBox").classList.remove("hidden");

      scrollParaElemento("segundoSaborBox");

      const q = query(
        collection(db, "produtos"),
        where("status", "==", "ativo"),
      );

      const snap = await getDocs(q);

      lista.innerHTML = "";

    const pizzas = [];

snap.forEach((docSnap) => {
  const pizza = docSnap.data();

  if (!pizza.categoria?.startsWith("pizzas")) return;
  if (pizza.nome === pizzaSelecionada.nome) return;

  pizzas.push(pizza);
});

pizzas.sort((a, b) => a.nome.localeCompare(b.nome));

lista.innerHTML = "";

pizzas.forEach((pizza) => {
  lista.innerHTML += `
    <label class="flex items-center bg-[#222] p-3 rounded-xl cursor-pointer">
      <input
        type="radio"
        name="segundoSabor"
        value="${pizza.nome}"
        class="mr-2">

      ${pizza.nome}
    </label>
  `;
});

    }

    // INTEIRA
    else {
      document.getElementById("segundoSaborBox").classList.add("hidden");

      perguntarAdicionais();

      setTimeout(() => {
        scrollParaElemento("perguntaAdicionais");
      }, 200);
    }
  }

  if (e.target.name === "segundoSabor") {
    perguntarAdicionais();

    setTimeout(() => {
      scrollParaElemento("perguntaAdicionais");
    }, 200);
  }
});

async function carregarAdicionaisPizza() {
  const container = document.getElementById("listaAdicionaisPizza");

  container.innerHTML = "Carregando adicionais...";

  const q = query(
    collection(db, "opcoesLanche"),
    where("grupo", "==", "extras"),
    where("status", "==", "ativo"),
  );

  const snap = await getDocs(q);

  let adicionais = [];

  snap.forEach((docSnap) => {
    adicionais.push(docSnap.data());
  });

  // ordenação
  adicionais.sort((a, b) => {
    const aBorda = a.nome.toLowerCase().includes("borda");

    const bBorda = b.nome.toLowerCase().includes("borda");

    // bordas primeiro
    if (aBorda && !bBorda) return -1;
    if (!aBorda && bBorda) return 1;

    // depois ordem alfabética
    return a.nome.localeCompare(b.nome, "pt-BR");
  });

  container.innerHTML = "";

  adicionais.forEach((item) => {
    container.innerHTML += `
      <label class="flex items-center justify-between bg-[#2a2a2a] p-3 rounded-xl cursor-pointer hover:bg-[#333] transition">

        <div class="flex items-center">

          <input
            type="checkbox"
            name="adicionalPizza"
            value="${item.nome}|${item.valor}"
            class="mr-3 accent-red-600">

          ${item.nome}

        </div>

        <span class="text-yellow-400 font-semibold">
          +R$ ${parseFloat(item.valor).toFixed(2).replace(".", ",")}
        </span>

      </label>
    `;
  });
}

window.confirmarPizza = async function () {
  const tamanho = document.querySelector('input[name="tamanhoPizza"]:checked');

  if (!tamanho) {
    mostrarAlerta("Escolha um tamanho.");
    return;
  }

  const tamanhoSelecionado = tamanho.value;

  let precoFinal;

  if (tamanhoSelecionado === "P") {
    precoFinal = parseFloat(pizzaSelecionada["preco P"]);
  } else {
    precoFinal = parseFloat(pizzaSelecionada["preco G"]);

    // desconto apenas na G
    if (pizzaSelecionada.promocao) {
      precoFinal *= 0.8;
    }
  }

  let nomeFinal = `🍕 Pizza ${tamanhoSelecionado}`;

  const tipo = document.querySelector(
  'input[name="tipoPizza"]:checked',
)?.value;

// MEIO A MEIO
if (tipo === "meio") {
  const sabor2Input = document.querySelector(
    'input[name="segundoSabor"]:checked',
  );

  if (!sabor2Input) {
    mostrarAlerta("Escolha o 2º sabor.");
    return;
  }

  const q = query(
    collection(db, "produtos"),
    where("nome", "==", sabor2Input.value),
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    mostrarAlerta("Erro ao localizar sabor.");
    return;
  }

  const pizza2 = snap.docs[0].data();

  const campoPreco =
    tamanhoSelecionado === "P"
      ? "preco P"
      : "preco G";

  let preco1 = parseFloat(pizzaSelecionada[campoPreco]);
  let preco2 = parseFloat(pizza2[campoPreco]);

  if (
    tamanhoSelecionado === "G" &&
    pizzaSelecionada.promocao &&
    pizzaSelecionada.categoria === "pizzas-salgadas"
  ) {
    preco1 *= 0.8;
  }

  if (
    tamanhoSelecionado === "G" &&
    pizza2.promocao &&
    pizza2.categoria === "pizzas-salgadas"
  ) {
    preco2 *= 0.8;
  }

  precoFinal = preco1 / 2 + preco2 / 2;

  nomeFinal += `
1/2 ${pizzaSelecionada.nome}
1/2 ${pizza2.nome}`;
} else {
  nomeFinal += ` - ${pizzaSelecionada.nome}`;
}
  // -------------------------
  // ADICIONAIS
  // -------------------------
  const adicionais = [];

  document
    .querySelectorAll('input[name="adicionalPizza"]:checked')
    .forEach((item) => {
      const [nome, valor] = item.value.split("|");

      adicionais.push(nome);

      precoFinal += parseFloat(valor);
    });

  // arredonda sempre para terminar em ,99
  precoFinal = Math.ceil(precoFinal) - 0.01;

  // evita problemas de casas decimais
  precoFinal = Number(precoFinal.toFixed(2));

  if (adicionais.length) {
    nomeFinal += `\n+ ${adicionais.join(", ")}`;
  }

  // -------------------------
  // OBSERVAÇÃO
  // -------------------------
  const obs = document.getElementById("obsPizza").value.trim();

  adicionarAoCarrinho(nomeFinal, precoFinal, obs);

  fecharModalPizza();
};

document.getElementById("perguntaAdicionais")?.classList.add("hidden");

document.getElementById("boxAdicionaisPizza")?.classList.add("hidden");

let entradaSelecionada = null;

window.abrirModalEntrada = function (produto) {
  entradaSelecionada = produto;

  document.getElementById("entradaNome").textContent = produto.nome;

  document.getElementById("entradaPrecoP").textContent = `R$ ${produto[
    "preco P"
  ]
    .toFixed(2)
    .replace(".", ",")}`;

  document.getElementById("entradaPrecoG").textContent = `R$ ${produto[
    "preco G"
  ]
    .toFixed(2)
    .replace(".", ",")}`;

  document.getElementById("modalEntrada").classList.remove("hidden");
};

window.fecharModalEntrada = function () {
  document.getElementById("modalEntrada").classList.add("hidden");

  document.querySelectorAll('input[name="tamanhoEntrada"]').forEach((i) => {
    i.checked = false;
  });

  document.getElementById("obsEntrada").value = "";

  entradaSelecionada = null;
};

window.confirmarEntrada = function () {
  const tamanho = document.querySelector(
    'input[name="tamanhoEntrada"]:checked',
  );

  if (!tamanho) {
    alert("Escolha um tamanho.");
    return;
  }

  const tamanhoSelecionado = tamanho.value;

  const preco =
    tamanhoSelecionado === "P"
      ? entradaSelecionada["preco P"]
      : entradaSelecionada["preco G"];

  const nome = `${entradaSelecionada.nome} ${tamanhoSelecionado}`;

  const obs = document.getElementById("obsEntrada").value.trim();

  adicionarAoCarrinho(nome, preco, obs);

  fecharModalEntrada();
};

document.getElementById("precisaTroco").addEventListener("change", function () {
  const campo = document.getElementById("valorTroco");

  if (this.checked) {
    campo.classList.remove("hidden");
    campo.focus();
  } else {
    campo.classList.add("hidden");
    campo.value = "";
  }
});

// ----------------------
// PIX no checkout: chave de config/pix (a mesma do botão "Enviar PIX" do painel)
// ----------------------
let chavePixLoja = "";
onSnapshot(doc(db, "config", "pix"), (s) => {
  chavePixLoja = s.exists() ? String(s.data().chave || "").trim() : "";
  atualizarBlocoPix();
});

function atualizarBlocoPix() {
  const bloco = document.getElementById("blocoPix");
  if (!bloco) return;
  const ehPix = document.getElementById("formaPagamento").value === "PIX";
  bloco.classList.toggle("hidden", !ehPix);
  document.getElementById("pixChave").textContent = chavePixLoja || "(a loja cadastra a chave no painel)";
  document.getElementById("pixChave").classList.toggle("vazia", !chavePixLoja);
  document.getElementById("btnCopiarPix").classList.toggle("hidden", !chavePixLoja);
  // troco não faz sentido no PIX
  const troco = document.getElementById("precisaTroco");
  troco.closest(".space-y-2")?.classList.toggle("hidden", ehPix);
  if (ehPix) { troco.checked = false; document.getElementById("valorTroco").classList.add("hidden"); }
}
document.getElementById("formaPagamento").addEventListener("change", atualizarBlocoPix);

document.getElementById("btnCopiarPix").addEventListener("click", async () => {
  const btn = document.getElementById("btnCopiarPix");
  try {
    await navigator.clipboard.writeText(chavePixLoja);
  } catch {
    const t = document.createElement("textarea");
    t.value = chavePixLoja; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); } catch {}
    t.remove();
  }
  btn.textContent = "✅ Chave copiada!";
  setTimeout(() => (btn.textContent = "📋 Copiar chave PIX"), 2000);
});

// 🔥 Buscar tempo de entrega do Firestore
// 🔥 Listener em tempo real para tempo de entrega
function iniciarListenerTempoEntrega() {
  const entregaRef = doc(db, "config", "entrega");

  onSnapshot(entregaRef, (snap) => {
    if (snap.exists()) {
      window.tempoEntregaGlobal = snap.data().tempoEntrega || "";
    } else {
      window.tempoEntregaGlobal = "";
    }

    const infoTempo = document.getElementById("infoTempoEntrega");
    if (infoTempo) infoTempo.textContent = window.tempoEntregaGlobal ? ` · ${window.tempoEntregaGlobal}` : "";

    // Atualiza o texto no carrinho se já existir o elemento
    const tempoEntregaEl = document.getElementById("tempoEntregaInfo");
    if (tempoEntregaEl) {
      tempoEntregaEl.textContent = window.tempoEntregaGlobal
        ? `⏱ Tempo de entrega estimado: ${window.tempoEntregaGlobal}`
        : "";
    }
  });
}

iniciarListenerTempoEntrega();

// ----------------------
// Mensagem do pedido no WhatsApp (modelo MsSoftware: itens primeiro, valores em R$ 0,00, dados do cliente no fim)
// ----------------------
function mensagemPedidoWhats(p) {
  const r = (v) => "R$ " + Number(v || 0).toFixed(2).replace(".", ",");
  const ent = p.tipo === "entrega";
  const LINHA = "─────────────";
  const l = [`Olá, *${p.loja}*! 👋`, "Acabei de fazer um pedido pelo cardápio digital:", "",
    `*${ent ? "🛵 PEDIDO PARA ENTREGA" : "🛍️ PEDIDO PARA RETIRADA"}*`, LINHA];
  (p.itens || []).forEach((i) => {
    l.push(`*${i.quantidade || 1}x ${i.nome}*  ·  ${r(i.subtotal)}`);
    const grupos = new Map();
    (i.complementos || []).forEach((c) => {
      const k = c.grupo || "Extras";
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k).push(c.preco > 0 ? `${c.nome} (+${r(c.preco)})` : c.nome);
    });
    grupos.forEach((lista, g) => l.push(`      _${g}: ${lista.join(", ")}_`));
    if (i.observacao) l.push(`      _Obs.: ${i.observacao}_`);
  });
  l.push(LINHA);
  if (ent) l.push(`Subtotal: ${r(p.produtos)}`, `Entrega: ${r(p.taxa)}`);
  l.push(`*Total: ${r(p.total)}*`, "", `💳 *Pagamento:* ${p.pagamento || "-"}`);
  if (p.troco) l.push(`      _Troco para ${r(p.troco)} (levar ${r(p.troco - p.total)})_`);
  if (/pix/i.test(p.pagamento || "")) l.push("      _Envio o comprovante do PIX em seguida._");
  l.push("", `👤 *${p.nome}*`, `📞 ${p.tel}`);
  if (ent && p.endereco) l.push(`📍 ${p.endereco}`);
  l.push("", `Obrigado! ${p.coracao}`);
  return l.join("\n");
}
