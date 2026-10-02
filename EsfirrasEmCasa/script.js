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
  orderBy,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ----------------------
// Firebase Config
// ----------------------
const firebaseConfig = {
  apiKey: "AIzaSyBQKDj9xDHvGZkVx1hOU-MV3drnfN6uU70",
  authDomain: "esfihas-em-casa.firebaseapp.com",
  projectId: "esfihas-em-casa",
  storageBucket: "esfihas-em-casa.firebasestorage.app",
  messagingSenderId: "1095184776226",
  appId: "1:1095184776226:web:c5d9f67a479a5646859e7b",
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

// taxa de entrega: vem do painel (config/entrega); 2,00 até carregar
let taxaEntregaFixa = 2.0;

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

  <h3 class="text-xl font-semibold mt-4 text-white">
    ${produto.nome}
  </h3>

  <p class="text-gray-300">
    ${produto.descricao || ""}
  </p>

  <p class="text-red-500 font-bold mt-2">
    R$ ${Number(produto.preco).toFixed(2)}
  </p>

  <button 
    onclick="${
      produto.categoria && produto.categoria.startsWith("esfihas")
        ? `abrirModalObservacao(
            '${produto.nome}',
            ${produto.preco},
            '${produto.categoria}'
          )`
        : `adicionarAoCarrinho(
            '${produto.nome}',
            ${produto.preco},
            ''
          )`
    }"

    class="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">

    Adicionar ao Carrinho

  </button>
`;

      container.appendChild(card);
      // Se for marcado como mais vendido, também mostra na seção "mais-vendidas"
      if (produto.maisVendido) {
        const maisVendidosSecao = document.getElementById("mais-vendidas");
        if (maisVendidosSecao) {
          const maisVendidosContainer =
            maisVendidosSecao.querySelector(".produtos-grid");
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

// ----------------------
// Carrinho
function adicionarAoCarrinho(
  nome,
  preco,
  observacao = "",
  quantidade = 1
) {
  const itemExistente = carrinho.find(
    (item) => item.nome === nome && item.observacao === observacao
  );

  if (itemExistente) {
    itemExistente.quantidade += quantidade;
    itemExistente.subtotal += preco * quantidade;
  } else {
    carrinho.push({
      nome,
      preco,
      quantidade,
      subtotal: preco * quantidade,
      observacao
    });
  }

  total += preco * quantidade;
  atualizarCarrinho();

  exibirNotificacao(
    quantidade > 1
      ? `${quantidade}x ${nome}`
      : nome
  );
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
    <span>${item.nome} x${item.quantidade}</span> - 
    <span>R$ ${item.subtotal.toFixed(2)}</span>
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

  document.getElementById("total").textContent = total.toFixed(2);
  document.getElementById("totalComEntregaPreview").textContent = (
    total + taxaEntrega
  )
    .toFixed(2)
    .replace(".", ",");

  localStorage.setItem("carrinho", JSON.stringify(carrinho));


  // pulinho no botão do carrinho a cada mudança
  const btnCarrinho = document.getElementById("btnAbrirCarrinho");
  if (btnCarrinho) {
    btnCarrinho.classList.remove("pulou");
    void btnCarrinho.offsetWidth;
    btnCarrinho.classList.add("pulou");
  }
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
// Telefone: obriga o padrão (DDD) 9XXXX-XXXX para a loja conseguir avisar pelo WhatsApp
// ----------------------
function digitosTelefone(valor) {
  let d = String(valor || "").replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2); // colou com +55
  if (d.length > 11 && d.startsWith("0")) d = d.replace(/^0+/, ""); // colou com 0 na frente
  return d.slice(0, 11);
}
function formatarTelefone(valor) {
  const d = digitosTelefone(valor);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
// celular com DDD: 11 dígitos, DDD de 11 a 99 e começando com 9
function telefoneValido(valor) {
  return /^[1-9][1-9]9\d{8}$/.test(digitosTelefone(valor));
}
document.getElementById("telCliente")?.addEventListener("input", (e) => {
  e.target.value = formatarTelefone(e.target.value);
  e.target.classList.remove("border-red-500");
});

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

  if (!telefoneValido(tel)) {
    const campoTel = document.getElementById("telCliente");
    campoTel.classList.add("border-red-500");
    campoTel.focus();
    mostrarAlerta("Informe o celular com DDD. Ex.: (17) 99999-9999");
    return;
  }

  // Preenche confirmação
  document.getElementById("confNomeCliente").textContent = nome;
  document.getElementById("confTelefoneCliente").textContent = formatarTelefone(tel);
  document.getElementById("confEnderecoCliente").textContent = endereco;
  document.getElementById("linhaEndereco").style.display =
    tipoPedidoSelecionado === "entrega" ? "block" : "none";

  const listaItens = document.getElementById("listaItensConfirmacao");
  listaItens.innerHTML = "";
  carrinho.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.nome} x${item.quantidade} - R$ ${item.subtotal.toFixed(2)}`;
    if (item.observacao) {
      li.innerHTML += `<br><small>Obs: ${item.observacao}</small>`;
    }
    listaItens.appendChild(li);
  });

  const taxa = tipoPedidoSelecionado === "entrega" ? taxaEntregaFixa : 0;
  const valorFinal = total + taxa;

  // troco: precisa ser maior que o total do pedido
  if (tipoPedidoSelecionado === "entrega" && document.getElementById("precisaTroco").checked) {
    const valorTroco = parseFloat(
      String(document.getElementById("valorTroco").value).replace(",", ".")
    );
    if (!valorTroco || valorTroco <= valorFinal) {
      mostrarAlerta(
        `Informe para quanto precisa de troco. O valor deve ser maior que o total do pedido (R$ ${valorFinal.toFixed(2).replace(".", ",")}).`
      );
      return;
    }
  }

  document.getElementById("valorTotalConfirmacao").textContent =
    `Total: R$ ${valorFinal.toFixed(2)}`;

  document.getElementById("modalDadosEntrega").classList.add("hidden");
  document.getElementById("modalConfirmacao").classList.remove("hidden");
};

// ----------------------
// Envio Pedido (Firestore + WhatsApp)
let enviandoPedido = false;
document
  .getElementById("btnConfirmarPedido")
  .addEventListener("click", async () => {
    // evita pedido duplicado com dois toques no botão
    if (enviandoPedido) return;
    enviandoPedido = true;
    const btnConfirmar = document.getElementById("btnConfirmarPedido");
    const textoBotao = btnConfirmar.textContent;
    btnConfirmar.disabled = true;
    btnConfirmar.classList.add("opacity-60", "cursor-not-allowed");
    btnConfirmar.textContent = "Enviando...";

    // abre a aba do WhatsApp já no toque (o iPhone bloqueia se abrir depois de salvar)
    let janelaWhats = null;
    try {
      janelaWhats = window.open("", "_blank");
      if (janelaWhats) {
        janelaWhats.document.write(
          '<p style="font-family:sans-serif;text-align:center;margin-top:40vh">Abrindo o WhatsApp…</p>'
        );
      }
    } catch (e) {}

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
        tipo: tipoPedidoSelecionado,
      });

      // --- WhatsApp ---
      let mensagem = `📦 *Novo Pedido* (${tipoPedidoSelecionado.toUpperCase()})\n\n👤 Cliente: ${nome}\n📞 Tel: ${tel}`;
      if (tipoPedidoSelecionado === "entrega") {
        mensagem += `\n🏠 Endereço: ${endereco}`;
        mensagem += `\n🚚 Taxa de entrega: R$ ${taxa.toFixed(2)}`;
      }

      mensagem += `\n\n🛒 *Itens:*\n`;
      carrinho.forEach((item) => {
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
      mensagem += `\n\n🙏 Obrigado pela preferência!\n🍴 *Esfirras em Casa*`;

      const telefoneLoja = "5517992362238"; // 👈 coloque o número da loja
      const url = `https://wa.me/${telefoneLoja}?text=${encodeURIComponent(mensagem)}`;
      if (janelaWhats && !janelaWhats.closed) {
        janelaWhats.location.href = url;
      } else {
        const aberta = window.open(url, "_blank");
        if (!aberta) window.location.href = url;
      }

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
      try { if (janelaWhats && !janelaWhats.closed) janelaWhats.close(); } catch (_) {}
      mostrarAlerta("Erro ao enviar pedido. Tente novamente.");
    } finally {
      enviandoPedido = false;
      btnConfirmar.disabled = false;
      btnConfirmar.classList.remove("opacity-60", "cursor-not-allowed");
      btnConfirmar.textContent = textoBotao;
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
  notificacao.className =
    "aviso-adicionado fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50";
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
// Tempo de entrega (definido no painel)
// ----------------------
onSnapshot(doc(db, "config", "entrega"), (snap) => {
  const tempo = snap.exists() ? String(snap.data().tempoEntrega || "").trim() : "";
  const info = document.getElementById("tempoEntregaInfo");
  const taxa = snap.exists() ? Number(snap.data().taxaEntrega) : NaN;
  if (Number.isFinite(taxa) && taxa >= 0 && taxa !== taxaEntregaFixa) {
    taxaEntregaFixa = taxa;
    atualizarCarrinho();
  }
  if (!info) return;
  info.textContent = tempo ? `🛵 Tempo de entrega: ${tempo}` : "";
  info.classList.toggle("hidden", !tempo);
});

// ----------------------
// Adicionais (lidos uma vez e atualizados sozinhos)
// ----------------------
let adicionaisCache = null;
onSnapshot(
  query(collection(db, "opcoesLanche"), where("status", "==", "ativo")),
  (snapshot) => {
    adicionaisCache = snapshot.docs.map((d) => d.data());
  }
);

// ----------------------
// Recupera o carrinho salvo (ex.: página recarregada)
// ----------------------
try {
  const salvo = JSON.parse(localStorage.getItem("carrinho") || "[]");
  if (Array.isArray(salvo)) {
    carrinho = salvo.filter(
      (i) =>
        i && typeof i.nome === "string" &&
        Number.isFinite(i.preco) && Number.isFinite(i.subtotal) &&
        Number.isInteger(i.quantidade) && i.quantidade > 0
    ).map((i) => ({ ...i, observacao: i.observacao || "" }));
  }
} catch (e) {
  carrinho = [];
}
atualizarCarrinho();

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
let produtoSelecionado = null;
let precoSelecionado = 0;
let quantidadeSelecionada = 1;

window.abrirModalObservacao = async function (nome, preco, categoria) {
  produtoSelecionado = nome;
  precoSelecionado = preco;

  quantidadeSelecionada = 1;

  document.getElementById("quantidadeEsfirra").value = quantidadeSelecionada;
  document.getElementById("totalEsfirraModal").textContent = Number(preco)
    .toFixed(2)
    .replace(".", ",");

  document.getElementById("modalProdutoNome").textContent = nome;
  document.getElementById("observacaoInput").value = "";

  const container = document.getElementById("listaAdicionais");
  container.innerHTML = "Carregando adicionais...";

document.getElementById("modalObservacao").classList.remove("hidden");

  // usa os adicionais já carregados; só busca no banco se ainda não chegaram
  let itens = adicionaisCache;
  if (!itens) {
    const snapshot = await getDocs(
      query(collection(db, "opcoesLanche"), where("status", "==", "ativo"))
    );
    itens = snapshot.docs.map((d) => d.data());
  }

  container.innerHTML = "";

  // organizar por grupo
  const grupos = {};

  itens.forEach((item) => {
    if (!grupos[item.grupo]) {
      grupos[item.grupo] = [];
    }

    grupos[item.grupo].push(item);
  });

  // definir grupos conforme categoria
  let ordemGrupos = [];

  if (categoria === "esfihas-doces") {
    ordemGrupos = ["extrasDoces"];
  } else if (categoria === "esfihas-salgadas") {
    ordemGrupos = ["extras"];
  }

  // criar grupos na tela
  ordemGrupos.forEach((grupo) => {
    if (!grupos[grupo]) return;

    const titulo = document.createElement("p");

    titulo.textContent = grupo === "extrasDoces" ? "EXTRAS DOCES" : "EXTRAS";

    titulo.className = "font-bold text-sm mt-3 mb-1 text-gray-700";

    container.appendChild(titulo);

    grupos[grupo].forEach((item) => {
      const label = document.createElement("label");

      label.className =
        "flex items-center justify-between py-1 text-sm text-gray-800 cursor-pointer";

      const esquerda = document.createElement("div");
      esquerda.className = "flex items-center gap-2";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "adicional";
      checkbox.value = `${item.nome}|${item.valor}`;
      checkbox.className = "accent-red-500";

      checkbox.addEventListener("change", atualizarTotalEsfirraModal);

      const texto = document.createElement("span");
      texto.textContent = item.nome;

      esquerda.appendChild(checkbox);
      esquerda.appendChild(texto);

      const preco = document.createElement("span");
      preco.textContent = `+ R$ ${parseFloat(item.valor).toFixed(2)}`;

      preco.className = "text-gray-600 text-xs";

      label.appendChild(esquerda);
      label.appendChild(preco);

      container.appendChild(label);
    });
  });

  document.getElementById("modalObservacao").classList.remove("hidden");
};

window.fecharModalObservacao = function () {
  document.getElementById("modalObservacao").classList.add("hidden");
};

window.confirmarObservacao = function () {
  const obs = document.getElementById("observacaoInput").value.trim();

  const selecionados = document.querySelectorAll(
    'input[name="adicional"]:checked',
  );

  let precoFinal = precoSelecionado;
  const adicionais = [];

  selecionados.forEach((item) => {
    const [nome, valor] = item.value.split("|");

    adicionais.push(nome);
    precoFinal += parseFloat(valor);
  });

  let nomeFinal = produtoSelecionado;

  if (adicionais.length > 0) {
    nomeFinal += ` + (${adicionais.join(", ")})`;
  }

 adicionarAoCarrinho(
  nomeFinal,
  precoFinal,
  obs,
  quantidadeSelecionada
);

  fecharModalObservacao();
};

window.alterarQuantidade = function (valor) {
  quantidadeSelecionada += valor;

  if (quantidadeSelecionada < 1) {
    quantidadeSelecionada = 1;
  }

  document.getElementById("quantidadeEsfirra").value = quantidadeSelecionada;

  atualizarTotalEsfirraModal();
};

// quantidade digitada no campo (final=true ao sair do campo: corrige vazio/0)
window.definirQuantidade = function (valor, final) {
  const campo = document.getElementById("quantidadeEsfirra");
  let n = parseInt(valor, 10);
  if (!Number.isFinite(n) || n < 1) {
    if (!final) return;
    n = 1;
  }
  if (n > 999) n = 999;
  quantidadeSelecionada = n;
  if (final || String(campo.value) !== String(n)) campo.value = n;
  atualizarTotalEsfirraModal();
};

function atualizarTotalEsfirraModal() {
  let precoUnitario = precoSelecionado;

  const selecionados = document.querySelectorAll(
    'input[name="adicional"]:checked',
  );

  selecionados.forEach((item) => {
    const [, valor] = item.value.split("|");
    precoUnitario += parseFloat(valor);
  });

  const totalModal = precoUnitario * quantidadeSelecionada;

  document.getElementById("totalEsfirraModal").textContent = totalModal
    .toFixed(2)
    .replace(".", ",");
}
