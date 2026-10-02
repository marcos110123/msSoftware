import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
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

// acompanhamento do pedido ao vivo (código guardado neste celular) — ver fim do arquivo
let tempoEntregaTxt = "";
let acomp = (() => { try { return JSON.parse(localStorage.getItem("acompanhamento") || "null"); } catch (_) { return null; } })();
let acompDados = null;
let pararAcomp = null;

// taxa de entrega: vem do painel (config/entrega); 2,00 até carregar
let taxaEntregaFixa = 2.0;

// ----------------------
// Carregar produtos
// ----------------------
// Produtos sem foto própria usam o logo: troca o arquivo de 2 MB pela versão leve (mesma imagem)
const FOTO_LEVE = { "img/logo2.jpeg": "img/logo2-leve.jpg", "img/logo2.png": "img/logo2-leve.jpg" };
const fotoDoProduto = (src) => FOTO_LEVE[src] || src || "img/logo2-leve.jpg";

// As seções ficam escondidas até o cliente abrir, e o navegador só baixaria a foto nessa hora.
// Então, com a página já carregada, baixamos as fotos em segundo plano: ao abrir a categoria, já estão prontas.
const fotosPreCarregadas = new Set();
function preCarregarFotos(lista) {
  const novas = [...new Set(lista)].filter((src) => src && !fotosPreCarregadas.has(src));
  if (!novas.length) return;
  const baixar = () => novas.forEach((src) => { fotosPreCarregadas.add(src); const im = new Image(); im.decoding = "async"; im.src = src; });
  if ("requestIdleCallback" in window) requestIdleCallback(baixar, { timeout: 2000 }); else setTimeout(baixar, 800);
}

function carregarProdutosDoFirestore() {
  const ref = collection(db, "produtos");
  const q = query(ref, orderBy("nome", "asc")); // ordena pelo campo "nome"

  onSnapshot(q, (snapshot) => {
    document
      .querySelectorAll(".produtos-grid")
      .forEach((grid) => (grid.innerHTML = ""));
    preCarregarFotos(snapshot.docs.filter((d) => d.data().status === "ativo").map((d) => fotoDoProduto(d.data().imagem)));

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
  <img src="${fotoDoProduto(produto.imagem)}" 
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
      // acompanhamento ao vivo: se falhar (ex.: regra ainda não publicada), o pedido segue normalmente
      let tokenAcomp = null;
      try {
        const refAcomp = doc(collection(db, "acompanhamento"));
        await setDoc(refAcomp, {
          status: "enviado", tipo: tipoPedidoSelecionado, total: valorFinal, pagamento: formaPagamento || "",
          valorTroco: precisaTroco && valorTroco ? valorTroco : null,
          resumo: resumoAcomp(carrinho), tempoEntrega: tempoEntregaTxt,
          criadoEm: serverTimestamp(), horarios: { enviado: serverTimestamp() }
        });
        tokenAcomp = refAcomp.id;
      } catch (e) { console.warn("Acompanhamento indisponível:", e); }

      await addDoc(collection(db, "orders"), {
        ...(tokenAcomp && { acompanhamento: tokenAcomp }),
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
      if (tokenAcomp) {
        acomp = { token: tokenAcomp, criado: Date.now() };
        try { localStorage.setItem("acompanhamento", JSON.stringify(acomp)); } catch (_) {}
        acompDados = null;
        escutarAcomp();
        abrirAcomp();
      } else {
        document.getElementById("modalSucessoPedido").classList.remove("hidden");
      }
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
  tempoEntregaTxt = tempo;
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


// ----------------------
// Acompanhamento do pedido ao vivo (mesmo modelo do Nosso Açaí)
// O cardápio cria "acompanhamento/{código aleatório}" (sem telefone/endereço) e guarda o código neste celular.
// O painel muda a etapa quando a loja clica "Pedido recebido", "Saiu p/ entrega"/"Pronto", "Concluir" ou "Cancelar".
// ----------------------
const DOZE_HORAS = 12 * 60 * 60 * 1000;

const acEsc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const acBrl = (v) => "R$ " + Number(v || 0).toFixed(2).replace(".", ",");
const acHora = (t) => (t?.toDate ? t.toDate() : null);
const acHHMM = (d) => (d ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "");
const acSoma = (d, m) => new Date(d.getTime() + m * 60000);

function resumoAcomp(itens) {
  const nomes = itens.slice(0, 3).map((i) => `${i.quantidade || 1}x ${i.nome}`).join(" · ");
  return itens.length > 3 ? `${nomes} · +${itens.length - 3} itens` : nomes;
}

function previsaoEntrega(d) {
  const nums = String(d.tempoEntrega || "").match(/\d+/g);
  const base = acHora(d.horarios?.enviado) || acHora(d.criadoEm);
  if (!nums || !base) return "";
  const a = Number(nums[0]), b = Number(nums[1] || nums[0]);
  return a === b ? acHHMM(acSoma(base, a)) : `${acHHMM(acSoma(base, a))} – ${acHHMM(acSoma(base, b))}`;
}

const AC_ILU_FORNO = `<svg width="180" height="140" viewBox="0 0 180 140" aria-hidden="true">
  <path class="ac-vapor" d="M70 34c-6-8 6-12 0-20" stroke="#b91c1c" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>
  <path class="ac-vapor b" d="M90 30c-6-8 6-12 0-20" stroke="#b91c1c" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>
  <path class="ac-vapor c" d="M110 34c-6-8 6-12 0-20" stroke="#b91c1c" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>
  <ellipse cx="90" cy="118" rx="74" ry="10" fill="#7a2a12" opacity=".18"/>
  <ellipse cx="90" cy="96" rx="78" ry="22" fill="#5b3a22"/><ellipse cx="90" cy="92" rx="78" ry="22" fill="#8a5a33"/>
  <g transform="translate(36 52)"><path d="M0 34 L28 0 L56 34 Q28 44 0 34Z" fill="#e7b46a"/><path d="M8 32 L28 8 L48 32 Q28 39 8 32Z" fill="#c2412d"/>
    <circle cx="22" cy="24" r="3" fill="#6b1d12"/><circle cx="32" cy="28" r="2.5" fill="#6b1d12"/><circle cx="28" cy="18" r="2" fill="#4d7c0f"/></g>
  <g transform="translate(90 50)"><ellipse cx="26" cy="22" rx="26" ry="19" fill="#e7b46a"/><ellipse cx="26" cy="21" rx="20" ry="14" fill="#f4e3b5"/>
    <circle cx="19" cy="18" r="3" fill="#6b1d12"/><circle cx="31" cy="24" r="3" fill="#6b1d12"/><circle cx="30" cy="15" r="2" fill="#4d7c0f"/></g>
  <g transform="translate(62 68)"><ellipse cx="28" cy="18" rx="28" ry="16" fill="#d99a4e"/><path d="M8 18c8-10 32-10 40 0" stroke="#5a2a0a" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M12 22c8-7 24-7 32 0" stroke="#f6e9cf" stroke-width="4" fill="none" stroke-linecap="round"/></g></svg>`;
const AC_ILU_MOTO = `<svg width="180" height="124" viewBox="0 0 170 120" aria-hidden="true"><g class="ac-anda">
  <path d="M8 104h154" stroke="#c9a77a" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 10"/>
  <circle cx="42" cy="88" r="17" fill="#2a0a0a"/><circle cx="42" cy="88" r="7" fill="#f6e9cf"/>
  <circle cx="128" cy="88" r="17" fill="#2a0a0a"/><circle cx="128" cy="88" r="7" fill="#f6e9cf"/>
  <path d="M40 86l20-30h40l14 30z" fill="#b91c1c"/><path d="M100 56l10-20h12" fill="none" stroke="#2a0a0a" stroke-width="6" stroke-linecap="round"/>
  <rect x="52" y="28" width="42" height="32" rx="6" fill="#e8b84a"/><path d="M60 40h26M60 48h18" stroke="#7a1a0a" stroke-width="3" stroke-linecap="round"/>
  <circle cx="104" cy="22" r="10" fill="#f2c99b"/><path d="M95 21a10 10 0 0 1 19-5" fill="#b91c1c"/>
  <path d="M150 60h14M146 72h18M152 48h10" stroke="#b91c1c" stroke-width="3" stroke-linecap="round" opacity=".45"/></g></svg>`;
const AC_ILU_SACOLA = `<svg width="150" height="140" viewBox="0 0 150 140" aria-hidden="true">
  <ellipse cx="75" cy="128" rx="52" ry="8" fill="#7a2a12" opacity=".18"/>
  <path d="M50 44c0-18 50-18 50 0" stroke="#7a1a0a" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M30 44h90l-8 80H38z" fill="#b91c1c"/><path d="M30 44h90l-2 14H32z" fill="#991b1b"/>
  <circle cx="75" cy="86" r="22" fill="#f6e9cf"/><text x="75" y="93" text-anchor="middle" font-size="20" font-weight="800" fill="#b91c1c">✓</text></svg>`;

function acEtapas(d) {
  const e = d.tipo === "entrega";
  return [
    { id: "enviado", nome: "Pedido enviado", desc: "Aguardando a loja confirmar" },
    { id: "preparando", nome: "No forno", desc: "Preparando suas esfirras" },
    { id: e ? "saiu" : "pronto", nome: e ? "Saiu para entrega" : "Pronto para retirar", desc: e ? "A caminho do seu endereço" : "Pode vir buscar no balcão" }];
}
function acTextos(d) {
  const e = d.tipo === "entrega";
  return {
    enviado: ["Pedido <i>enviado!</i>", "Assim que a loja confirmar, esta tela muda sozinha. Se ainda não enviou a mensagem no WhatsApp, finalize por lá."],
    preparando: ["Suas esfirras estão <i>no forno</i>", "A loja já recebeu seu pedido e está preparando tudo fresquinho."],
    saiu: ["Saiu para <i>entrega!</i>", "O entregador já está a caminho. Deixe o celular por perto."],
    pronto: ["Pronto para <i>retirar!</i>", "Seu pedido está esperando por você no balcão."],
    concluido: [e ? "Pedido <i>entregue</i>" : "Pedido <i>retirado</i>", "Obrigado pela preferência! Bom apetite. ❤️"],
    cancelado: ["Pedido <i>cancelado</i>", "Se tiver alguma dúvida, fale com a loja pelo WhatsApp."]
  }[d.status] || ["Acompanhe seu <i>pedido</i>", ""];
}

function renderAcomp() {
  const d = acompDados;
  if (!d) return;
  const [titulo, sub] = acTextos(d);
  const ordem = { enviado: 0, preparando: 1, saiu: 2, pronto: 2, concluido: 3 };
  const atual = ordem[d.status] ?? 0;
  const canc = d.status === "cancelado", fim = d.status === "concluido", ent = d.tipo === "entrega";
  const prev = ent && ["enviado", "preparando"].includes(d.status) ? previsaoEntrega(d) : "";
  const chip = canc || fim ? "" : prev ? `🛵 Previsão de entrega: <b>${prev}</b>`
    : d.status === "saiu" ? "🛵 A caminho · chega em breve" : d.status === "pronto" ? "🛍️ Pode vir buscar" : "";
  const ilu = d.status === "saiu" ? AC_ILU_MOTO : d.status === "pronto" || fim ? AC_ILU_SACOLA : AC_ILU_FORNO;
  const troco = d.valorTroco ? ` · troco para ${acBrl(d.valorTroco)}` : "";
  const criado = acHHMM(acHora(d.criadoEm));
  const msg = encodeURIComponent(`Olá! Sobre o meu pedido${d.num ? ` #${d.num}` : ""}…`);
  document.getElementById("telaAcomp").innerHTML = `
    <div class="ac-caixa ${canc ? "cancelado" : ""} ${fim ? "fim" : ""}">
      <div class="ac-topo"><img src="img/logo2-leve.jpg" alt=""><span>Esfirras em Casa</span>
        <button class="ac-fechar" data-sair-acomp aria-label="Fechar">✕</button></div>
      <div class="ac-palco"><span class="ac-onda b"></span><span class="ac-onda"></span>${ilu}</div>
      <p class="ac-num">${d.num ? `Pedido #${acEsc(d.num)}` : "Seu pedido"}${criado ? ` · ${criado}` : ""}</p>
      <h2 class="ac-titulo">${titulo}</h2>
      <p class="ac-sub">${acEsc(sub)}</p>
      ${chip ? `<div class="ac-chip"><span>${chip}</span></div>` : ""}
      ${canc ? "" : `<div class="ac-passos">${acEtapas(d).map((e, i) => {
        const cls = i < atual || (i === atual && fim) ? "ok" : i === atual ? "agora" : "fut";
        const h = acHHMM(acHora(d.horarios?.[e.id]));
        return `<div class="ac-p ${cls}"><span class="ac-bola">${cls === "ok" ? "✓" : ""}</span>
          <p class="ac-t">${cls === "agora" ? `<b>${e.nome}</b><small>${e.desc}</small>` : e.nome}</p><span class="ac-h">${h}</span></div>`;
      }).join("")}</div>`}
      <div class="ac-resumo"><span>${acEsc(d.resumo || "")}<small>${acEsc(d.pagamento || "")}${troco}</small></span><b>${acBrl(d.total)}</b></div>
      <div class="ac-acoes">
        <a class="ac-btn sec" href="https://wa.me/5517992362238?text=${msg}" target="_blank" rel="noopener">💬 Falar com a loja</a>
        <button class="ac-btn pri" data-sair-acomp>Voltar ao cardápio</button>
      </div>
    </div>`;
  renderBarraAcomp();
}

function acompAtivo() {
  return !!acomp?.token && Date.now() - (acomp.criado || 0) <= DOZE_HORAS;
}

function renderBarraAcomp() {
  const barra = document.getElementById("barraAcomp");
  const tela = document.getElementById("telaAcomp");
  const d = acompDados;
  const mostrar = acompAtivo() && d && !["concluido", "cancelado"].includes(d.status) && tela.classList.contains("hidden");
  barra.classList.toggle("hidden", !mostrar);
  if (!mostrar) return;
  const prev = d.tipo === "entrega" ? previsaoEntrega(d) : "";
  const txt = { enviado: ["📨", "Pedido enviado", "Aguardando a loja confirmar"],
    preparando: ["🔥", "Suas esfirras estão no forno", prev ? `Previsão: ${prev}` : "Toque para acompanhar"],
    saiu: ["🛵", "Seu pedido saiu para entrega", "Chega em breve"],
    pronto: ["🛍️", "Pronto para retirar", "Pode vir buscar no balcão"] }[d.status] || ["📦", "Acompanhe seu pedido", ""];
  barra.innerHTML = `<span class="ac-ic">${txt[0]}</span>
    <span class="ac-tx"><span class="ac-aovivo"></span>${d.num ? `#${acEsc(d.num)} · ` : ""}${txt[1]}<small>${txt[2]}</small></span><span class="ac-ver">Ver</span>`;
}

function escutarAcomp() {
  pararAcomp?.();
  pararAcomp = null;
  if (!acompAtivo()) { acompDados = null; renderBarraAcomp(); return; }
  pararAcomp = onSnapshot(doc(db, "acompanhamento", acomp.token), (snap) => {
    if (!snap.exists()) return;
    acompDados = snap.data();
    if (!document.getElementById("telaAcomp").classList.contains("hidden")) renderAcomp(); else renderBarraAcomp();
  }, (e) => console.warn("Acompanhamento indisponível:", e));
}

function abrirAcomp() {
  if (!acompAtivo()) return;
  const tela = document.getElementById("telaAcomp");
  if (acompDados) renderAcomp();
  else tela.innerHTML = '<div class="ac-caixa"><p class="ac-sub" style="padding-top:140px">Carregando seu pedido…</p></div>';
  tela.classList.remove("hidden");
  tela.scrollTop = 0;
  document.body.style.overflow = "hidden";
  renderBarraAcomp();
}

function fecharAcomp() {
  document.getElementById("telaAcomp").classList.add("hidden");
  document.body.style.overflow = "";
  renderBarraAcomp();
}

document.getElementById("telaAcomp").addEventListener("click", (e) => { if (e.target.closest("[data-sair-acomp]")) fecharAcomp(); });
document.getElementById("barraAcomp").addEventListener("click", abrirAcomp);
escutarAcomp();
