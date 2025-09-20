import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  getDocs,
  orderBy 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ----------------------
// Firebase Config
// ----------------------
  const firebaseConfig = {
    apiKey: "AIzaSyCIsSp3_D0fwHz1_K0jvuU6wsbyXBG0bHw",
    authDomain: "rei-do-acai-26fdb.firebaseapp.com",
    projectId: "rei-do-acai-26fdb",
    storageBucket: "rei-do-acai-26fdb.firebasestorage.app",
    messagingSenderId: "1092500174203",
    appId: "1:1092500174203:web:b3c08d476ebb3df384b9de"
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

const taxaEntregaFixa = 2.00;

// ----------------------
// Carregar produtos
// ----------------------
function carregarProdutosDoFirestore() {
  const ref = collection(db, "produtos");
  const q = query(ref, orderBy("nome", "asc")); // ordena pelo campo "nome"

  onSnapshot(q, (snapshot) => {
    document.querySelectorAll(".produtos-grid").forEach(grid => grid.innerHTML = "");


    snapshot.forEach((docSnap) => {
      const produto = docSnap.data();
      if (produto.status !== "ativo") return;

      const secao = document.getElementById(produto.categoria);
      if (!secao) return;

      const container = secao.querySelector(".produtos-grid");
      if (!container) return;

      const card = document.createElement("div");
      card.className = "menu-item bg-gray-800 rounded-lg shadow-lg p-4";
card.innerHTML = `
  <img src="${produto.imagem || ""}" 
       alt="${produto.nome}" 
       class="w-full h-48 object-cover rounded-md shadow-lg" 
       loading="lazy" 
       decoding="async">
  <h3 class="text-xl font-semibold mt-4 text-white">${produto.nome}</h3>
  <p class="text-gray-300">${produto.descricao || ""}</p>
  <p class="text-white font-bold mt-2">R$ ${Number(produto.preco).toFixed(2)}</p>
  <button 
  onclick="${produto.categoria === 'acai' 
    ? `abrirModalOpcoes('acai', '${produto.nome}', ${produto.preco})` 
    : produto.categoria === 'sorvete'
      ? `abrirModalOpcoes('sorvete', '${produto.nome}', ${produto.preco})`
      : `adicionarAoCarrinho('${produto.nome}', ${produto.preco}, '')`}"
  class="mt-4 bg-purple-800 text-white px-4 py-2 rounded hover:bg-purple-900 w-full font-semibold shadow-md transition">
  Adicionar ao Carrinho
</button>
`;



      container.appendChild(card);
      // Se for marcado como mais vendido, também mostra na seção "mais-vendidas"
if (produto.maisVendido) {
  const maisVendidosSecao = document.getElementById("mais-vendidas");
  if (maisVendidosSecao) {
    const maisVendidosContainer = maisVendidosSecao.querySelector(".produtos-grid");
    if (maisVendidosContainer) {
      const clone = card.cloneNode(true); // clona o card
      maisVendidosContainer.appendChild(clone);
    }
  }
}
    });
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

function adicionarAoCarrinho(nome, precoBase, complementos = [], extrasValor = 0, observacao = "") {
  const precoFinal = precoBase + extrasValor;

  carrinho.push({ 
    nome, 
    precoBase, 
    complementos, 
    preco: precoFinal, 
    quantidade: 1, 
    subtotal: precoFinal,
    observacao
  });

  total += precoFinal;
  atualizarCarrinho();
  exibirNotificacao(nome);
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
    carrinhoItens.innerHTML = '<p class="text-gray-300">Nenhum item no carrinho.</p>';
  } else {
    carrinho.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "flex justify-between items-center py-2 border-b";
      div.innerHTML = `
  <div class="flex-1">
    <span>${item.nome} x${item.quantidade}</span> - 
    <span>R$ ${item.subtotal.toFixed(2)}</span>

    ${item.complementos && item.complementos.length > 0 
      ? `<br><small class="text-gray-400">Extras: ${item.complementos.map(c => 
          c.preco > 0 ? `${c.nome} (+R$ ${c.preco.toFixed(2)})` : c.nome
        ).join(", ")}</small>` 
      : ""}

    ${item.observacao 
      ? `<br><small class="text-gray-400">Obs: ${item.observacao}</small>` 
      : ""}
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

  document.getElementById("total").textContent = total.toFixed(2);
  document.getElementById("totalComEntregaPreview").textContent =
    (total + taxaEntrega).toFixed(2).replace(".", ",");

  localStorage.setItem("carrinho", JSON.stringify(carrinho));
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
document.getElementById("orderForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const estadoRef = doc(db, "config", "estadoPedidos");
  const snap = await getDoc(estadoRef);
  const recebendo = snap.exists() ? snap.data().recebendo : true;

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

window.selecionarTipoPedido = function(tipo) {
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

 if (!nome || !tel || (tipoPedidoSelecionado === "entrega" && (!endereco || !formaPagamento))) {
    mostrarAlerta("Preencha todos os dados obrigatórios.");
    return;
  }

  // Preenche confirmação
  document.getElementById("confNomeCliente").textContent = nome;
  document.getElementById("confTelefoneCliente").textContent = tel;
  document.getElementById("confEnderecoCliente").textContent = endereco;
  document.getElementById("linhaEndereco").style.display = tipoPedidoSelecionado === "entrega" ? "block" : "none";

  const listaItens = document.getElementById("listaItensConfirmacao");
  listaItens.innerHTML = "";
carrinho.forEach(item => {
  const li = document.createElement("li");
  li.innerHTML = `${item.nome} x${item.quantidade} - R$ ${item.subtotal.toFixed(2)}`;

  // Complementos
  if (item.complementos && item.complementos.length > 0) {
    li.innerHTML += `<br><small>Extras: ${item.complementos.map(c => 
      c.preco > 0 ? `${c.nome} (+R$ ${c.preco.toFixed(2)})` : c.nome
    ).join(", ")}</small>`;
  }

  // Observação
  if (item.observacao) {
    li.innerHTML += `<br><small>Obs: ${item.observacao}</small>`;
  }

  listaItens.appendChild(li);
});



 const taxa = tipoPedidoSelecionado === "entrega" ? taxaEntregaFixa : 0;
const valorFinal = total + taxa;

  document.getElementById("valorTotalConfirmacao").textContent = `Total: R$ ${valorFinal.toFixed(2)}`;

  document.getElementById("modalDadosEntrega").classList.add("hidden");
  document.getElementById("modalConfirmacao").classList.remove("hidden");
};

// ----------------------
// Envio Pedido (Firestore + WhatsApp)
document.getElementById("btnConfirmarPedido").addEventListener("click", async () => {
  const nome = document.getElementById("confNomeCliente").textContent;
  const tel = document.getElementById("confTelefoneCliente").textContent;
  const endereco = document.getElementById("confEnderecoCliente").textContent;
  const formaPagamento = document.getElementById("formaPagamento").value;

  const precisaTroco = document.getElementById("precisaTroco").checked;
  const valorTroco = precisaTroco ? parseFloat(document.getElementById("valorTroco").value || 0) : null;

  const taxa = tipoPedidoSelecionado === "entrega" ? taxaEntregaFixa : 0;
  const totalProdutos = carrinho.reduce((sum, item) => sum + item.subtotal, 0);
  const valorFinal = totalProdutos + taxa;

  try {
    await addDoc(collection(db, "orders"), {
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
      tipo: tipoPedidoSelecionado
    });

 // --- WhatsApp ---
let mensagem = `📦 *Novo Pedido* (${tipoPedidoSelecionado.toUpperCase()})\n\n👤 Cliente: ${nome}\n📞 Tel: ${tel}`;
if (tipoPedidoSelecionado === "entrega") {
  mensagem += `\n🏠 Endereço: ${endereco}`;
  mensagem += `\n🚚 Taxa de entrega: R$ ${taxa.toFixed(2)}`;
}

mensagem += `\n\n🛒 *Itens:*\n`;
carrinho.forEach(item => {
  mensagem += `- ${item.nome} x${item.quantidade} - R$ ${item.subtotal.toFixed(2)}`;
  if (item.observacao) {
    mensagem += ` (Obs: ${item.observacao})`;
  }
  mensagem += `\n`;
});

mensagem += `\n💳 Pagamento: ${formaPagamento}\n💰 Total: R$ ${valorFinal.toFixed(2)}`;

if (precisaTroco && valorTroco) {
  const troco = (valorTroco - valorFinal).toFixed(2);
  mensagem += `\n💵 Troco para: R$ ${valorTroco.toFixed(2)} (Troco: R$ ${troco})`;
}

// 👇 Agradecimento no final
mensagem += `\n\n🙏 Obrigado pela preferência!\n🍴 *Rei do Açai*`;


    const telefoneLoja = "5517996045305"; // 👈 coloque o número da loja
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


    document.getElementById("modalConfirmacao").classList.add("hidden");
    document.getElementById("modalSucessoPedido").classList.remove("hidden");
  } catch (e) {
    mostrarAlerta("Erro ao enviar pedido. Tente novamente.");
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
  notificacao.className = "fixed bottom-4 right-4 bg-purple-800 text-white px-4 py-2 rounded shadow-lg z-50 font-semibold";
  notificacao.textContent = `${nome} adicionado ao carrinho!`;
  document.body.appendChild(notificacao);
  setTimeout(() => notificacao.remove(), 2500);
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


document.getElementById("btnCancelarConfirmacao").addEventListener("click", () => {
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
window.abrirModalOpcoes = abrirModalOpcoes;

let produtoSelecionado = null;
let precoSelecionado = 0;

window.abrirModalObservacao = function(nome, preco) {
  produtoSelecionado = nome;
  precoSelecionado = preco;

  document.getElementById("modalProdutoNome").textContent = nome;
  document.getElementById("observacaoInput").value = "";

  document.getElementById("modalObservacao").classList.remove("hidden");
};

window.fecharModalObservacao = function() {
  document.getElementById("modalObservacao").classList.add("hidden");
};

window.confirmarObservacao = function() {
  const obs = document.getElementById("observacaoInput").value.trim();

  adicionarAoCarrinho(produtoSelecionado, precoSelecionado, obs);
  fecharModalObservacao();
};
window.fecharModalTipoPedido = function () {
  document.getElementById("modalTipoPedido").classList.add("hidden");
};

async function abrirModalOpcoes(tipo, nomeProduto, precoProduto) {
  // pega a coleção certa
  const colecao = tipo === "acai" ? "opcoesAcai" : "opcoesSorvete";
  const querySnap = await getDocs(collection(db, colecao));

  let grupos = [];
  querySnap.forEach(doc => grupos.push({ id: doc.id, ...doc.data() }));

  // monta o HTML do modal
  const modal = document.createElement("div");
  modal.id = "modalOpcoes";
  modal.className = "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm";

  modal.innerHTML = `
    <div class="bg-white text-gray-800 rounded-2xl p-6 max-w-lg w-11/12 max-h-[90vh] overflow-y-auto shadow-2xl animate-fadeIn scale-95">
      <!-- Cabeçalho -->
      <div class="bg-gradient-to-r from-purple-800 to-black text-white -mx-6 -mt-6 px-6 py-4 rounded-t-2xl shadow-md">
        <h2 class="text-2xl font-bold text-center flex items-center justify-center gap-2">
          🍨 Personalize seu ${tipo}
        </h2>
      </div>

      <!-- Produto -->
      <p class="text-center text-sm text-gray-600 mt-4 mb-6">${nomeProduto} 
        <span class="font-semibold text-purple-800">R$ ${precoProduto.toFixed(2)}</span>
      </p>

      <!-- Grupos -->
      <div id="gruposContainer" class="space-y-8"></div>

      <!-- Observação -->
<div class="mt-6">
  <label for="obsProduto" class="block text-sm font-medium text-gray-700 mb-2">📝 Observação</label>
  <textarea id="obsProduto" 
            class="w-full p-2 border border-gray-300 rounded resize-none focus:ring focus:ring-purple-200"
            placeholder="Ex: sem granola, calda à parte..."
            rows="2"></textarea>
</div>


      <!-- Ações -->
      <div class="flex justify-between gap-4 mt-8">
        <button onclick="document.getElementById('modalOpcoes').remove()" 
                class="w-1/2 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-semibold transition transform hover:scale-105 shadow">
          Cancelar
        </button>
        <button id="btnConfirmarOpcoes" 
                class="w-1/2 bg-purple-800 hover:bg-purple-900 text-white py-3 rounded-lg font-semibold transition transform hover:scale-105 shadow">
          ➕ Adicionar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const container = modal.querySelector("#gruposContainer");

  // 🔹 Define a ordem fixa
  const ordemGrupos = {
    "Escolha seu açaí": 1,
    "Acompanhamentos grátis": 2,
    "Acompanhamentos extras": 3,
    "Recheio especial": 4
  };

  // 🔹 Ordena os grupos
  const gruposOrdenados = [...grupos].sort((a, b) => {
    return (ordemGrupos[a.grupo] || 999) - (ordemGrupos[b.grupo] || 999);
  });

  // 🔹 Monta grupos na ordem correta
  gruposOrdenados.forEach(grupo => {
    let opcoes = grupo.itens.map(item => {
      const precoExtra = item.preco && item.preco > 0 
        ? ` <span class="text-sm text-gray-500">(+R$ ${item.preco})</span>` 
        : "";

      return `
        <label class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition">
          <input type="checkbox" 
                 value="${item.nome}" 
                 data-preco="${item.preco}" 
                 class="opcaoItem accent-purple-700 scale-125"
                 data-grupo="${grupo.grupo}"
                 ${grupo.obrigatorio ? "required" : ""}>
          <span class="font-medium">${item.nome}${precoExtra}</span>
        </label>
      `;
    }).join("");

    container.innerHTML += `
      <div class="pb-4 border-b border-gray-200 last:border-0">
        <h3 class="font-bold mb-3 text-purple-800">${grupo.grupo} 
          <span class="text-xs text-gray-500">(máx: ${grupo.maximo})</span>
        </h3>
        <div class="space-y-2">${opcoes}</div>
      </div>
    `;
  });

 modal.querySelector("#btnConfirmarOpcoes").onclick = () => {
  let selecionados = [...modal.querySelectorAll(".opcaoItem:checked")].map(i => ({
    nome: i.value,
    preco: Number(i.dataset.preco),
    grupo: i.dataset.grupo
  }));

  // calcula valor extra
  const extrasValor = selecionados.reduce((sum, s) => sum + (s.preco || 0), 0);

  // pega observação
  const observacao = modal.querySelector("#obsProduto").value.trim();

  // chama carrinho com complementos + obs
  adicionarAoCarrinho(nomeProduto, precoProduto, selecionados, extrasValor, observacao);
  modal.remove();
};



}
