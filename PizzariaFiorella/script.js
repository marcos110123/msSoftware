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
  apiKey: "AIzaSyDoQdr9IOehfDoyeemrTJjrAVurr72re2U",
  authDomain: "pizzaria-fiorella-a1a98.firebaseapp.com",
  projectId: "pizzaria-fiorella-a1a98",
  storageBucket: "pizzaria-fiorella-a1a98.firebasestorage.app",
  messagingSenderId: "268430312700",
  appId: "1:268430312700:web:bb300ad881ee1dfc2cc379",
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

const taxaEntregaFixa = 0.0;

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

    snapshot.forEach((docSnap) => {
      const produto = docSnap.data();
      if (produto.status !== "ativo") return;

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
        P: R$ ${Number(produto["preco P"] || 0)
          .toFixed(2)
          .replace(".", ",")}
      </span>

      <span class="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg font-semibold">
        G: R$ ${Number(produto["preco G"] || 0)
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

  <button 
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
function adicionarAoCarrinho(nome, preco, observacao = "") {
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
    carrinhoItens.innerHTML =
      '<p class="text-gray-300">Nenhum item no carrinho.</p>';
  } else {
    carrinho.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "flex justify-between items-center py-2 border-b";
      div.innerHTML = `
  <div class="flex-1">
    <span>${item.quantidade}x ${item.nome}</span> - 
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

  document.getElementById("valorTotalConfirmacao").textContent =
    `Total: R$ ${valorFinal.toFixed(2)}`;

  document.getElementById("modalDadosEntrega").classList.add("hidden");
  document.getElementById("modalConfirmacao").classList.remove("hidden");
};

// ----------------------
// Envio Pedido (Firestore + WhatsApp)
document
  .getElementById("btnConfirmarPedido")
  .addEventListener("click", async () => {
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
        mensagem += `- ${item.quantidade}x ${item.nome} - R$ ${item.subtotal.toFixed(2)}`;
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
      mensagem += `\n\n🙏 Obrigado pela preferência!\n🍴 *Fiorella Pizzaria *`;

      const telefoneLoja = "5517992451988"; // 👈 coloque o número da loja
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

  // reset visual
  document.getElementById("perguntaAdicionais")?.classList.add("hidden");

  document.getElementById("boxAdicionaisPizza")?.classList.add("hidden");

  saboresPizza = [produto];

  await carregarAdicionaisPizza();
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
function perguntarAdicionais() {
  document.getElementById("perguntaAdicionais")?.classList.remove("hidden");

  document.getElementById("boxAdicionaisPizza")?.classList.add("hidden");
}

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

    if (tamanho === "G") {
      document.getElementById("tipoPizzaBox").classList.remove("hidden");

      scrollParaElemento("tipoPizzaBox");

      document.getElementById("segundoSaborBox").classList.add("hidden");

      document.getElementById("perguntaAdicionais")?.classList.add("hidden");

      document.getElementById("boxAdicionaisPizza")?.classList.add("hidden");
    } else {
      document.getElementById("tipoPizzaBox").classList.add("hidden");
      document.getElementById("segundoSaborBox").classList.add("hidden");

      perguntarAdicionais();
    }
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

      snap.forEach((docSnap) => {
        const pizza = docSnap.data();

        if (!pizza.categoria?.startsWith("pizzas")) return;
        if (pizza.nome === pizzaSelecionada.nome) return;

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

  // -------------------------
  // PIZZA GRANDE
  // -------------------------
  if (tamanhoSelecionado === "G") {
    const tipo = document.querySelector(
      'input[name="tipoPizza"]:checked',
    )?.value;

    // -------------------------
    // MEIO A MEIO
    // -------------------------
    if (tipo === "meio") {
      const sabor2Input = document.querySelector(
        'input[name="segundoSabor"]:checked',
      );

      if (!sabor2Input) {
        mostrarAlerta("Escolha o 2º sabor.");
        return;
      }

      // busca o segundo sabor
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

      const preco1 = parseFloat(pizzaSelecionada["preco G"]);
      const preco2 = parseFloat(pizza2["preco G"]);

      let metade1 = preco1 / 2;
      let metade2 = preco2 / 2;

      // desconto apenas nas pizzas salgadas em promoção
      if (
        pizzaSelecionada.promocao &&
        pizzaSelecionada.categoria === "pizzas-salgadas"
      ) {
        metade1 *= 0.8;
      }

      if (pizza2.promocao && pizza2.categoria === "pizzas-salgadas") {
        metade2 *= 0.8;
      }

      precoFinal = metade1 + metade2;

      nomeFinal += ` 
1/2 ${pizzaSelecionada.nome}
1/2 ${pizza2.nome}`;
    }

    // -------------------------
    // INTEIRA
    // -------------------------
    else {
      nomeFinal += ` - ${pizzaSelecionada.nome}`;
    }
  }

  // -------------------------
  // PIZZA PEQUENA
  // -------------------------
  else {
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
