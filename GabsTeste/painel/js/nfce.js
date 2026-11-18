// Tela EMITIR NOTA (emissaonfc.html): NFC-e de pedidos concluídos e comandas de mesa do dia.
// A lógica de busca, emissão (Cloud Function), gravação no Firebase, DANFE e conferência
// foi copiada do painel antigo sem alterações — só a tela foi refeita.
import {
  collection, getDocs, query, where, doc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, iniciarPagina, esc, abrirJanela, confirmar, exigirSenha } from "./base.js?v=20261118b";
import { NFCE, LOJA } from "./config.js?v=20261118b";

window.todosPedidos = [];
window.pedidoSelecionado = null;
window.pedidosSelecionados = new Set();

let carregandoPedidos = false;
let autoRefresh = null;

const tabelaPedidos = document.getElementById("tabelaPedidos");
const resultadoNfce = document.getElementById("resultadoNfce");
const totalPendentesEl = document.getElementById("totalPendentes");
const totalEmitidasEl = document.getElementById("totalEmitidas");
const valorTotalEl = document.getElementById("valorTotal");

// ----------------------------------------------------------------------
// Log da SEFAZ e mensagens
// ----------------------------------------------------------------------
function adicionarLog(texto) {
  const hora = new Date().toLocaleTimeString("pt-BR");
  resultadoNfce.textContent += `[${hora}] ${texto}\n`;
  resultadoNfce.scrollTop = resultadoNfce.scrollHeight;
}

// Uma mensagem por vez (como no painel antigo): a nova substitui a anterior,
// assim a emissão em lote não empilha várias janelas de "Ok".
let janelaMensagem = null;
function mostrarMensagem({ tipo = "info", titulo = "Aviso", mensagem = "" }) {
  const emoji = { success: "✅", error: "❌", warning: "⚠️" }[tipo] || "ℹ️";
  janelaMensagem?.fechar();
  const j = abrirJanela({
    titulo: `${emoji} ${esc(titulo)}`,
    corpo: `<p style="color:var(--texto-2); white-space:pre-line">${esc(mensagem)}</p>`,
    rodape: `<button class="btn btn-primario" data-fechar>Ok</button>`,
    aoFechar: () => { if (janelaMensagem === j) janelaMensagem = null; }
  });
  janelaMensagem = j;
}

function confirmarModal({ titulo = "Confirmação", mensagem = "" }) {
  return confirmar(mensagem, { titulo, ok: "Emitir" });
}

// ----------------------------------------------------------------------
// Tabela
// ----------------------------------------------------------------------
function getBadgeStatus(pedido) {
  return pedido.nfceEmitida
    ? '<span class="selo selo-ok">EMITIDA</span>'
    : '<span class="selo selo-pendente">PENDENTE</span>';
}

const nomeOrigem = { mesa: "🍽️ Mesa", entrega: "🛵 Delivery", delivery: "🛵 Delivery", retirada: "🛍️ Retirada" };

function renderizarTabela() {
  let pedidos = [...window.todosPedidos];
  const filtroStatus = document.getElementById("filterStatus").value;
  const filtroTipo = document.getElementById("filterTipo").value;
  const pesquisa = document.getElementById("searchInput").value.toLowerCase().trim();

  if (filtroStatus === "pendente") pedidos = pedidos.filter((p) => !p.nfceEmitida);
  if (filtroStatus === "emitida") pedidos = pedidos.filter((p) => p.nfceEmitida);
  if (filtroTipo !== "todos") pedidos = pedidos.filter((p) => p.origem === filtroTipo);
  if (pesquisa) {
    pedidos = pedidos.filter((pedido) =>
      String(pedido.cliente || "").toLowerCase().includes(pesquisa) ||
      String(pedido.mesa || "").toLowerCase().includes(pesquisa) ||
      String(pedido.id || "").toLowerCase().includes(pesquisa));
  }

  if (pedidos.length === 0) {
    tabelaPedidos.innerHTML = '<tr><td colspan="7" class="vazio">Nenhum pedido encontrado</td></tr>';
    return;
  }

  tabelaPedidos.innerHTML = pedidos.map((pedido) => `
    <tr data-id="${esc(pedido.id)}">
      <td style="text-align:center">
        ${!pedido.nfceEmitida
          ? `<input type="checkbox" data-acao="marcar" ${window.pedidosSelecionados.has(pedido.id) ? "checked" : ""} style="width:18px; height:18px; cursor:pointer">`
          : "—"}
      </td>
      <td>${esc(nomeOrigem[pedido.origem] || pedido.origem)}</td>
      <td><b>${esc(pedido.cliente)}</b></td>
      <td>${esc(pedido.origem === "mesa" ? formatarPagamentoMesa(pedido.pagamento || pedido.pagamentos) : pedido.pagamento)}</td>
      <td class="num" style="font-weight:800">${pedido.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
      <td>${getBadgeStatus(pedido)}</td>
      <td>
        ${!pedido.nfceEmitida
          ? '<button class="btn btn-p btn-ok" data-acao="cpf">🧾 Emitir com CPF/CNPJ</button>'
          : '<button class="btn btn-p btn-primario" data-acao="danfe">🖨️ Imprimir DANFE</button>'}
      </td>
    </tr>`).join("");
}

      async function carregarPedidos() {
        if (carregandoPedidos) return;

        carregandoPedidos = true;

        try {
          adicionarLog("Buscando pedidos do dia...");

          const pedidos = [];

          // início do dia
          const inicioHoje = new Date();

          inicioHoje.setHours(0, 0, 0, 0);

          // fim do dia
          const fimHoje = new Date();

          fimHoje.setHours(23, 59, 59, 999);

          /* ==========================
       DELIVERY / RETIRADA
    ========================== */

          const snapshotOrders = await getDocs(
            query(
              collection(db, "orders"),

              where("status", "==", "concluido"),

              where("createdAt", ">=", inicioHoje),

              where("createdAt", "<=", fimHoje),
            ),
          );

          snapshotOrders.forEach((docSnap) => {
            const data = docSnap.data();

            // Pedidos de mesa são emitidos pelo comandasHistorico
            if (data.tipo === "mesa") return;

            // ignorar pedidos vazios/zerados
            const total = Number(data.totalFinal) || 0;
            const items = data.items || [];

            if (total <= 0) return;

            if (!Array.isArray(items) || items.length === 0) return;

            pedidos.push({
              id: docSnap.id,

              origem: data.tipo || "retirada",

              cliente: data.nomeCliente || "Sem Nome",

              telefone: data.telefoneCliente || "",

              endereco: data.enderecoCliente || "",

              pagamento: data.formaPagamento || "Cartão",

              total: Number(data.totalFinal) || 0,

              taxaEntrega: Number(data.taxaEntrega) || 0,

              items: data.items || [],

              collection: "orders",

              nfceEmitida: data.nfceEmitida || false,

              nfcePdfBase64: data.nfcePdfBase64 || "",

              nfceXmlBase64: data.nfceXmlBase64 || "",

              createdAt: data.createdAt,
            });
          });
          /* ==========================
       MESAS
    ========================== */

          const snapshotComandas = await getDocs(
            query(
              collection(db, "comandasHistorico"),

              where("status", "==", "concluido"),

              where("fechadaEm", ">=", inicioHoje),

              where("fechadaEm", "<=", fimHoje),
            ),
          );

          snapshotComandas.forEach((docSnap) => {
            const data = docSnap.data();

            const totalMesaCalculado = (data.pedidos || []).reduce(
              (soma, pedido) => soma + (Number(pedido.totalFinal) || 0),
              0,
            );

            pedidos.push({
              id: docSnap.id,

              origem: "mesa",

              mesa: data.mesa,

              cliente: `Mesa ${data.mesa}`,

              pagamento: data.pagamentos || {},

              total: Number(data.pedidos?.[0]?.totalFinal) || 0,

              pedidos: data.pedidos || [],

              collection: "comandasHistorico",

              nfceEmitida: data.nfceEmitida || false,

              nfcePdfBase64: data.nfcePdfBase64 || "",

              nfceXmlBase64: data.nfceXmlBase64 || "",

              createdAt: data.fechadaEm,
            });
          });

          window.todosPedidos = pedidos;

          atualizarDashboard();

          renderizarTabela();

          adicionarLog(`${pedidos.length} pedidos pendentes carregados`);
        } catch (error) {
          console.error(error);

          adicionarLog(`❌ ${error.message}`);
        } finally {
          carregandoPedidos = false;
        }
      }

      function atualizarDashboard() {
        let pedidos = [...window.todosPedidos];

        const filtroStatus = document.getElementById("filterStatus").value;

        // ==========================================
        // TOTAL EMITIDAS HOJE
        // ==========================================

        const totalEmitidas = window.todosPedidos.filter(
          (p) => p.nfceEmitida,
        ).length;

        totalEmitidasEl.textContent = totalEmitidas;

        // ==========================================
        // FILTRO STATUS
        // ==========================================

        if (filtroStatus === "pendente") {
          pedidos = pedidos.filter((p) => !p.nfceEmitida);
        }

        if (filtroStatus === "emitida") {
          pedidos = pedidos.filter((p) => p.nfceEmitida);
        }

        // ==========================================
        // PENDENTES
        // ==========================================

        const pendentes = window.todosPedidos.filter(
          (p) => !p.nfceEmitida,
        ).length;

        totalPendentesEl.textContent = pendentes;

        // ==========================================
        // TOTAL VALOR
        // ==========================================

        const total = pedidos.reduce(
          (soma, pedido) => soma + (pedido.total || 0),
          0,
        );

        valorTotalEl.textContent = total.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });
      }

      function togglePedidoSelecionado(id) {
        if (window.pedidosSelecionados.has(id)) {
          window.pedidosSelecionados.delete(id);
        } else {
          window.pedidosSelecionados.add(id);
        }

        atualizarBotaoLote();
      }

      function atualizarBotaoLote() {
        const btn = document.getElementById("btnEmitirSelecionadas");

        const total = window.pedidosSelecionados.size;

        btn.innerHTML = `Emitir selecionadas (${total})`;

        btn.classList.toggle("hidden", total === 0);
      }

      function selecionarTodosPedidos() {
        const checked = document.getElementById("selectAllPedidos").checked;

        window.pedidosSelecionados.clear();

        if (checked) {
          window.todosPedidos
            .filter((p) => !p.nfceEmitida)
            .forEach((pedido) => {
              window.pedidosSelecionados.add(pedido.id);
            });
        }

        renderizarTabela();
        atualizarBotaoLote();
      }

      // ==========================================
      // EMITIR SELECIONADAS
      // ==========================================
      async function emitirSelecionadas() {
        const ids = Array.from(window.pedidosSelecionados);

        if (!ids.length) return;

        const confirmar = await confirmarModal({
          titulo: "Emitir NFC-e",
          mensagem: `Deseja emitir ${ids.length} NFC-e(s)?`,
        });

        if (!confirmar) return;

        const btn = document.getElementById("btnEmitirSelecionadas");

        try {
          btn.disabled = true;
          btn.innerHTML = "Emitindo notas...";

          for (const id of ids) {
            try {
              const pedido = window.todosPedidos.find((p) => p.id === id);

              if (!pedido) continue;

              // define o pedido global
              window.pedidoSelecionado = pedido;

              // limpa CPF (lote não usa CPF)
              document.getElementById("cpfInput").value = "";

              await emitirPedido();
            } catch (err) {
              console.error(`Erro pedido ${id}`, err);

              adicionarLog(`❌ Erro ao emitir ${id}`);
            }
          }

          window.pedidosSelecionados.clear();

          document.getElementById("selectAllPedidos").checked = false;

          atualizarBotaoLote();

          await carregarPedidos();
        } catch (err) {
          console.error(err);

          mostrarMensagem({
            tipo: "error",
            titulo: "Erro",
            mensagem: "Erro ao emitir notas.",
          });
        } finally {
          btn.disabled = false;

          btn.innerHTML = `Emitir selecionadas (${window.pedidosSelecionados.size})`;
        }
      }

      function formatarPagamentoMesa(pagamentos) {
        if (!pagamentos) return "Não informado";

        const lista = [];

        const cartao = Number(pagamentos.cartao || pagamentos.cartão || 0);
        const pix = Number(pagamentos.pix || 0);
        const dinheiro = Number(pagamentos.dinheiro || 0);

        if (cartao > 0) {
          lista.push("Cartão");
        }

        if (pix > 0) {
          lista.push("PIX");
        }

        if (dinheiro > 0) {
          lista.push("Dinheiro");
        }

        return lista.join(" + ");
      }

      function abrirModalCpf(pedidoId) {
        const pedido = window.todosPedidos.find((p) => p.id === pedidoId);

        if (!pedido) return;

        window.pedidoSelecionado = pedido;

        document.getElementById("cpfInput").value = "";

        document.getElementById("cpfModal").classList.remove("hidden");
      }

      function mapearPagamento(forma) {
        if (!forma) return "01";

        forma = forma
          .toString()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        console.log("Pagamento recebido:", forma);

        // PIX
        if (forma.includes("pix")) {
          return "17";
        }

        // DINHEIRO
        if (forma.includes("dinheiro") || forma.includes("especie")) {
          return "01";
        }

        // CARTÃO (crédito ou débito)
        if (
          forma.includes("cartao") ||
          forma.includes("cartão") ||
          forma.includes("credito") ||
          forma.includes("debito")
        ) {
          return "03";
        }

        // fallback
        return "01";
      }

      function ehBebida(nome) {
        const texto = String(nome || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();

        return (
          // Refrigerantes
          texto.includes("coca-cola") ||
          texto.includes("coca cola") ||
          texto.includes("poty") ||
          texto.includes("roller") ||
          texto.includes("sprite") ||
          texto.includes("refrigerante lata") ||
          // Sucos
          texto.includes("suco") ||
          texto.includes("suvo") ||
          // Águas
          texto.includes("agua") ||
          // Energético
          texto.includes("energetico monster") ||
          // Cervejas
          texto.includes("antarctica") ||
          texto.includes("budweiser") ||
          texto.includes("heineken") ||
          texto.includes("skol") ||
          // Vinhos
          texto.includes("taca vinho") ||
          texto.includes("vinho tinto suave")
        );
      }

      function obterCest(nome) {
        const texto = String(nome || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();

        // ==========================================
        // COCA-COLA
        // ==========================================
        if (texto.includes("coca-cola 2l") || texto.includes("coca cola 2l")) {
          return "0301001";
        }

        // ==========================================
        // POTY
        // ==========================================
        if (texto.includes("poty")) {
          if (texto.includes("lata")) {
            return "0301002";
          }

          return "0301001";
        }

        // ==========================================
        // ROLLER
        // ==========================================
        if (texto.includes("roller")) {
          if (texto.includes("lata")) {
            return "0301002";
          }

          return "0301001";
        }

        // ==========================================
        // SPRITE
        // ==========================================
        if (texto.includes("sprite")) {
          if (texto.includes("lata")) {
            return "0301002";
          }

          return "0301001";
        }

        // ==========================================
        // ENERGÉTICO MONSTER
        // ==========================================
        if (texto.includes("energetico monster") || texto.includes("monster")) {
          return "0301300";
        }

        // ==========================================
        // ANTARCTICA LATA
        // ==========================================
        if (texto.includes("antarctica lata")) {
          return "0302103";
        }

        // ==========================================
        // BUDWEISER LATA
        // ==========================================
        if (texto.includes("budweiser lata")) {
          return "0302103";
        }

        // ==========================================
        // HEINEKEN LATA
        // ==========================================
        if (texto.includes("heineken lata")) {
          return "0302103";
        }

        // ==========================================
        // SKOL LATA
        // ==========================================
        if (texto.includes("skol lata")) {
          return "0302103";
        }

        // ==========================================
        // NENHUM CEST ESPECÍFICO
        // ==========================================
        return "";
      }


      async function emitirPedido() {
        const btnEmitir = document.getElementById("btnConfirmarCpf");

        try {
          const pedido = window.pedidoSelecionado;

          if (!pedido) return;

          // evita clique duplo
          btnEmitir.disabled = true;

          btnEmitir.textContent = "Emitindo...";

          document.getElementById("cpfModal").classList.add("hidden");

          const documento = document
            .getElementById("cpfInput")
            .value.replace(/\D/g, "");

          adicionarLog(`Emitindo NFC-e ${pedido.id}`);

          let itens = [];
          let pagamentos = [];

          /* ==========================================
    /* ==========================================
   MESA
========================================== */

          if (pedido.origem === "mesa") {
            pedido.pedidos.forEach((pedidoMesa) => {
              // ==========================
              // ITENS RESTANTES DA MESA
              // ==========================
              (pedidoMesa.items || []).forEach((item) => {
                const quantidade = Number(item.quantidade) || 1;

                const subtotal = Number(item.subtotal) || 0;

                itens.push({
                  nome: (item.nome || "Item")
                    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "") // remove emojis
                    .replace(/\s+/g, " ")
                    .trim(),

                  quantidade,

                  valor: Number(subtotal / quantidade),

                  ncm: item.ncm || "00000000",

                  cest: item.cest || obterCest(item.nome),

                  cfop: ehBebida(item.nome) ? "5405" : "5101",

                  cst: ehBebida(item.nome) ? "500" : item.cst || "102",
                });
              });

              // ==========================
              // BAIXAS PARCIAIS
              // ==========================
              (pedidoMesa.pagamentosParciais || []).forEach((parcial) => {
                (parcial.itens || []).forEach((item) => {
                  const quantidade = Number(item.quantidade) || 1;

                  const subtotal = Number(item.subtotal) || 0;

                  itens.push({
                    nome: (item.nome || "Item")
                      .replace(/[\u{1F300}-\u{1FAFF}]/gu, "") // remove emojis
                      .replace(/\s+/g, " ")
                      .trim(),

                    quantidade,

                    valor: Number(subtotal / quantidade),

                    ncm: item.ncm || "00000000",

                    cest: item.cest || obterCest(item.nome),

                    cfop: ehBebida(item.nome) ? "5405" : "5101",

                    cst: ehBebida(item.nome) ? "500" : item.cst || "102",
                  });
                });
              });
            });

            const p = pedido.pagamento || pedido.pagamentos || {};

            console.log("Pagamento mesa:", p);

            if (Number(p.cartao || p.cartão) > 0) {
              pagamentos.push({
                tipo: "03",
                valor: Number(Number(p.cartao || p.cartão).toFixed(2)),
              });
            }

            if (Number(p.pix) > 0) {
              pagamentos.push({
                tipo: "17",
                valor: Number(Number(p.pix).toFixed(2)),
              });
            }

            if (Number(p.dinheiro) > 0) {
              pagamentos.push({
                tipo: "01",
                valor: Number(Number(p.dinheiro).toFixed(2)),
              });
            }
          } else {
            /* ==========================================
       DELIVERY / RETIRADA
    ========================================== */
            itens = (pedido.items || []).map((item) => {
              const quantidade = Number(item.quantidade) || 1;

              const subtotal = Number(item.subtotal) || 0;

              const valor =
                subtotal > 0 ? subtotal / quantidade : Number(item.preco) || 0;

              return {
                nome: (item.nome || "Item")
                  .replace(/[\u{1F300}-\u{1FAFF}]/gu, "") // remove emojis
                  .replace(/\s+/g, " ")
                  .trim(),

                quantidade,

                valor,

                ncm: item.ncm || "00000000",

                cest: item.cest || obterCest(item.nome),

                cfop: ehBebida(item.nome) ? "5405" : "5101",

                cst: ehBebida(item.nome) ? "500" : item.cst || "102",
              };
            });

            // ==========================
            // TAXA DE ENTREGA
            // ==========================

            if (Number(pedido.taxaEntrega) > 0) {
              itens.push({
                nome: "Taxa de Entrega",

                quantidade: 1,

                valor: Number(Number(pedido.taxaEntrega).toFixed(2)),
              });
            }

            pagamentos.push({
              tipo: mapearPagamento(pedido.pagamento),

              valor: Number(pedido.total) || 0,
            });
          }

          // ==========================
          // CONFERÊNCIA
          // ==========================

          const somaItens = itens.reduce(
            (soma, item) => soma + Number(item.valor) * Number(item.quantidade),
            0,
          );

          const somaPagamentos = Number(
            pagamentos
              .reduce((soma, p) => soma + Number(p.valor || 0), 0)
              .toFixed(2),
          );

          console.log("SOMA ITENS:", somaItens.toFixed(2));

          console.log("TOTAL PEDIDO:", Number(pedido.total).toFixed(2));

          console.log("SOMA PAGAMENTOS:", somaPagamentos.toFixed(2));

          console.log(
            "DIFERENÇA ITENS:",
            (Number(pedido.total) - somaItens).toFixed(2),
          );

          console.log(
            "DIFERENÇA PAGAMENTOS:",
            Number((somaPagamentos - Number(pedido.total)).toFixed(2)),
          );

          /* ==========================================
       PAYLOAD
    ========================================== */

          const payload = {
            total: Number(Number(pedido.total).toFixed(2)),

            cpf: documento || "",

            pagamentos: pagamentos.map((p) => ({
              tipo: p.tipo,

              valor: Number(Number(p.valor).toFixed(2)),
            })),

            itens: itens.map((item) => ({
              nome: item.nome,

              quantidade: Number(item.quantidade),

              valor: Number(Number(item.valor).toFixed(2)),

              ncm: item.ncm || "00000000",

              cest: item.cest || obterCest(item.nome),

              cfop: ehBebida(item.nome) ? "5405" : "5101",

              cst: ehBebida(item.nome) ? "500" : item.cst || "102",
            })),
          };

          console.log("Payload:", payload);

          // AMOSTRA: em modo demonstração nada é enviado para a Sefaz
          if (NFCE.demonstracao) {
            adicionarLog("🧪 MODO DEMONSTRAÇÃO: aqui a nota seria enviada para a Sefaz.");
            adicionarLog(`Itens: ${payload.itens.length} · Pagamento: ${payload.pagamentos.map((p) => p.tipo).join(" + ")}`);
            adicionarLog("Nenhuma nota foi emitida (versão de teste).");
            return;
          }

          adicionarLog("Enviando para Cloud Function...");

          /* ==========================================
       REQUEST
    ========================================== */

          const response = await fetch(
            NFCE.urlEmissao,

            {
              method: "POST",

              headers: {
                "Content-Type": "application/json",
              },

              body: JSON.stringify(payload),
            },
          );

          const texto = await response.text();

          console.log("STATUS:", response.status);
          console.log("RESPOSTA DA CLOUD:", texto);

          if (!response.ok) {
            throw new Error(texto || `Erro HTTP ${response.status}`);
          }

          const data = JSON.parse(texto);

          /* ==========================================
   SUCESSO / RETORNO SEFAZ
========================================== */

          if (data?.sucesso) {
            const retorno = data?.retorno?.ReturnNF;

            if (!retorno) {
              throw new Error("Retorno da NFC-e inválido");
            }

            const codigoSefaz = String(retorno.CodStatusRespostaSefaz || "");

            const statusSefaz = retorno.DsStatusRespostaSefaz || "";

            console.log("Código SEFAZ:", codigoSefaz);

            console.log("Status SEFAZ:", statusSefaz);

            /* ==========================================
     NFC-E AUTORIZADA
  ========================================== */

            if (codigoSefaz === "100") {
              await updateDoc(doc(db, pedido.collection, pedido.id), {
                nfceEmitida: true,

                nfcePdfBase64: data?.retorno?.Base64File || "",

                nfceXmlBase64: data?.retorno?.Base64Xml || "",

                nfceNumero: retorno.Numero || "",

                nfceSerie: retorno.Serie || "",

                nfceChave: retorno.ChaveNF || "",

                nfceStatus: statusSefaz,

                nfceCodigo: codigoSefaz,

                nfcecpf: documento || "",

                nfceDanfeUrl:
                  retorno.UrlDanfe || retorno.UrlPDF || retorno.LinkDanfe || "",

                nfceXmlUrl: retorno.UrlXml || retorno.LinkXml || "",

                nfceRejeitada: false,

                nfceEmitidaEm: serverTimestamp(),
              });

              adicionarLog(`✅ NFC-e ${retorno.Numero} emitida`);

              pedido.nfceEmitida = true;

              pedido.nfcePdfBase64 = data?.retorno?.Base64File || "";

              pedido.nfceXmlBase64 = data?.retorno?.Base64Xml || "";

              pedido.nfceDanfeUrl =
                retorno.UrlDanfe || retorno.UrlPDF || retorno.LinkDanfe || "";

              pedido.nfceXmlUrl = retorno.UrlXml || retorno.LinkXml || "";

              atualizarDashboard();
              renderizarTabela();

              // limpa seleção
              window.pedidoSelecionado = null;

              mostrarMensagem({
                tipo: "success",
                titulo: "NFC-e Emitida",
                mensagem: `NFC-e ${retorno.Numero} emitida com sucesso!`,
              });
            } else {
              /* ==========================================
   NFC-E REJEITADA
========================================== */
              await updateDoc(doc(db, pedido.collection, pedido.id), {
                nfceEmitida: false,

                nfceRejeitada: true,

                nfceStatus: statusSefaz,

                nfceCodigo: codigoSefaz,

                nfceMotivo: statusSefaz,

                nfceErroEm: serverTimestamp(),
              });

              // atualiza pedido local
              pedido.nfceEmitida = false;
              pedido.nfceRejeitada = true;
              pedido.nfceCodigo = codigoSefaz;
              pedido.nfceStatus = statusSefaz;

              adicionarLog(
                `❌ NFC-e rejeitada (${codigoSefaz}) - ${statusSefaz}`,
              );

              atualizarDashboard();
              renderizarTabela();

              mostrarMensagem({
                tipo: "error",
                titulo: "Erro na NFC-e",
                mensagem:
                  data?.retorno?.Error ||
                  data?.Error ||
                  statusSefaz ||
                  "Falha na emissão",
              });
            }
          } else {
            /* ==========================================
       ERRO API
    ========================================== */
            const mensagemErro =
              data?.mensagem || data?.erro || "Falha na emissão";

            adicionarLog(`❌ ${mensagemErro}`);

            console.error(data);
          }
        } catch (error) {
          console.error(error);

          adicionarLog(`❌ ${error.message}`);
        } finally {
          btnEmitir.disabled = false;

          btnEmitir.textContent = "Emitir";
        }
      }

      function baixarXml(base64) {
        const xml = atob(base64);

        const blob = new Blob([xml], {
          type: "application/xml",
        });

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");

        a.href = url;

        a.download = "nfce.xml";

        a.click();

        URL.revokeObjectURL(url);
      }

      function abrirDanfe(xmlBase64) {
        try {
          if (!xmlBase64) {
            mostrarMensagem({
              tipo: "warning",
              titulo: "XML",
              mensagem: "XML não encontrado",
            });
            return;
          }

          // decodifica XML
          const xmlBytes = Uint8Array.from(atob(xmlBase64), (c) =>
            c.charCodeAt(0),
          );

          const xmlString = new TextDecoder("utf-8").decode(xmlBytes);

          // parser XML
          const parser = new DOMParser();

          const xml = parser.parseFromString(xmlString, "text/xml");

          console.log(xmlString);
          console.log("tPag:", xml.getElementsByTagName("tPag"));
          console.log("vPag:", xml.getElementsByTagName("vPag"));

          // helpers
          const get = (tag) =>
            esc(xml.getElementsByTagName(tag)[0]?.textContent || ""); // esc: proteção da impressão

          // dados principais
          const numero = get("nNF");

          const serie = get("serie");

          const data = get("dhRecbto") || get("dhEmi");

          const infNFe = xml.getElementsByTagName("infNFe")[0];

          const chave = infNFe?.getAttribute("Id")?.replace("NFe", "") || "";

          const total = get("vNF");

          const cpf = get("CPF");

          const qrCodeNode = xml.getElementsByTagName("qrCode")[0];

          const qrCode = qrCodeNode ? qrCodeNode.textContent : "";
          // pagamento NFC-e
          const pags = xml.getElementsByTagName("detPag");

          let pagamentosHtml = "";

          Array.from(pags).forEach((pag) => {
            const tipo = pag.getElementsByTagName("tPag")[0]?.textContent || "";

            const valor =
              pag.getElementsByTagName("vPag")[0]?.textContent || "0";

            let descricao = "Outros";

            switch (tipo) {
              case "01":
                descricao = "Dinheiro";
                break;

              case "03":
                descricao = "Cartão";
                break;

              case "04":
                descricao = "Cartão Débito";
                break;

              case "17":
                descricao = "PIX";
                break;
            }

            pagamentosHtml += `
<tr>
  <td>${descricao}</td>
  <td class="right">
    R$ ${Number(valor).toFixed(2)}
  </td>
</tr>
`;
          });

          const emitente = get("xNome");

          const cnpj = get("CNPJ");

          const endereco = get("xLgr");

          const numeroEndereco = get("nro");

          const bairro = get("xBairro");

          const cidade = get("xMun");

          const uf = get("UF");

          const cep = get("CEP");

          const tributos = get("vTotTrib");

          const troco = get("vTroco");

          // itens
          const dets = xml.getElementsByTagName("det");

          let itensHtml = "";

          Array.from(dets).forEach((det, index) => {
            const nome =
              esc(det.getElementsByTagName("xProd")[0]?.textContent || "");

            const qtd = esc(det.getElementsByTagName("qCom")[0]?.textContent || "1");

            const valor =
              det.getElementsByTagName("vProd")[0]?.textContent || "0";

            itensHtml += `
<tr>
  <td>${index + 1}</td>

  <td>
    ${nome}
  </td>

  <td class="right">
    ${Number(qtd).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}
  </td>

  <td class="right">
    ${Number(valor / qtd).toFixed(2)}
  </td>

  <td class="right">
    ${Number(valor).toFixed(2)}
  </td>
</tr>
`;
          });

          // janela impressão
          const win = window.open("", "_blank");

          win.document.write(`
<html>
<head>
  <title>DANFE NFC-e</title>

  <style>

    @page{ margin:0; }
    *{ box-sizing:border-box; }
    body{
      font-family: Arial, sans-serif;
      width: 250px;              /* mesma largura da comanda: cabe na térmica sem cortar os valores */
      margin:0;
      padding:0 0 0 5px;
      color:#000;
      font-size:11px;
      word-wrap:break-word;
    }

    .center{
      text-align:center;
    }

    .bold{
      font-weight:bold;
    }

    .line{
      border-top:1px solid #000;
      margin:8px 0;
    }

    .small{
      font-size:11px;
    }

    .tiny{
      font-size:10px;
    }

    table{
      width:100%;
      border-collapse:collapse;
      table-layout:fixed;
      font-size:10px;
    }
    table.itens th:nth-child(1), table.itens td:nth-child(1){ width:14px; }
    table.itens th:nth-child(3), table.itens td:nth-child(3){ width:24px; }
    table.itens th:nth-child(4), table.itens td:nth-child(4){ width:40px; }
    table.itens th:nth-child(5), table.itens td:nth-child(5){ width:46px; }
    td.right, th.right{ white-space:nowrap; }

    th{
      border-bottom:1px solid #000;
      padding:4px 0;
      text-align:left;
    }

    td{
      padding:3px 0;
      vertical-align:top;
    }

    .right{
      text-align:right;
    }

    .total{
      font-size:13px;
      font-weight:bold;
    }

    .qrcode{
      text-align:center;
      margin-top:10px;
    }

    .qrcode img{
      width:150px;
      height:150px;
    }

    .chave{
      word-break:break-all;
      text-align:center;
      font-size:10px;
      margin-top:5px;
    }

  </style>
</head>

<body>

  <!-- EMPRESA -->
  <div class="center">

    <div class="bold" style="font-size:18px;">
      NFC-e
    </div>

    <br>

    <div class="bold">
      ${emitente}
    </div>

   <div>
  CNPJ: ${cnpj || "Não informado"}
</div>

<div>
  ${endereco}, ${numeroEndereco}
</div>

<div>
  ${bairro} - ${cidade}/${uf}
</div>

<div>
  CEP: ${cep}
</div>

  </div>

  <div class="line"></div>

  <!-- TITULO -->
  <div class="center small">

    <div class="bold">
      DANFE NFC-e
    </div>

    <div>
      Documento Auxiliar da Nota Fiscal
      de Consumidor Eletrônica
    </div>

    <div class="bold">
      Não permite aproveitamento de crédito de ICMS
    </div>

  </div>

  <div class="line"></div>

  <!-- PRODUTOS -->
  <table class="itens">

    <thead>
      <tr>
        <th>#</th>
        <th>DESCRIÇÃO</th>
        <th class="right">QTD</th>
        <th class="right">UNIT.</th>
        <th class="right">TOTAL</th>
      </tr>
    </thead>

    <tbody>
      ${itensHtml}
    </tbody>

  </table>

  <div class="line"></div>

  <!-- TOTAIS -->
  <table>

    <tr>
      <td>QTD. TOTAL DE ITENS</td>
      <td class="right">${dets.length}</td>
    </tr>

    <tr>
      <td>VALOR TOTAL</td>
      <td class="right">R$ ${Number(total).toFixed(2)}</td>
    </tr>

    <tr>
      <td>DESCONTO</td>
      <td class="right">R$ 0,00</td>
    </tr>

    <tr class="bold total">
      <td>VALOR A PAGAR</td>
      <td class="right">
        R$ ${Number(total).toFixed(2)}
      </td>
    </tr>

  </table>

  <div class="line"></div>

  <!-- PAGAMENTO -->
  <table>

  <tr>
    <td>FORMA DE PAGAMENTO</td>
    <td class="right">
      VALOR PAGO
    </td>
  </tr>

  ${pagamentosHtml}

  ${
    Number(troco) > 0
      ? `
<tr>
  <td><strong>TROCO</strong></td>
  <td class="right">
    R$ ${Number(troco).toFixed(2)}
  </td>
</tr>
`
      : ""
  }

</table>

  <br>

 
  <div class="line"></div>

  <!-- CONSULTA -->
  <div class="center small">

    Consulte pela Chave de Acesso em

    <br>

   https://www.nfce.fazenda.sp.gov.br/consulta

  </div>

  <div class="chave">
    ${chave}
  </div>

  <br>

  <!-- CONSUMIDOR -->
  <div class="center small">

    CONSUMIDOR - CPF/CNPJ:
    ${cpf || "Não informado"}

  </div>


  <br>

  <!-- DADOS -->
  <div class="center small">

    NFC-e n° ${numero}
    &nbsp;&nbsp;
    Série: ${serie}

  </div>

  <div class="center small">
    ${new Date(data).toLocaleString("pt-BR")}
  </div>

  <div class="center small">
    Data de autorização:
    ${new Date(data).toLocaleString("pt-BR")}
  </div>

  <!-- QR -->
  <div class="qrcode">

    <img
      src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrCode)}"
    />

  </div>

  

  <script>
    window.onload = () => {
      window.print();
    };
  <\/script>

</body>
</html>
`);

          win.document.close();
        } catch (error) {
          console.error(error);

          alert("Erro ao gerar DANFE");
        }
      }


      function imprimirRelatorioEmitidas() {
        const emitidas = window.todosPedidos.filter(
          (p) => p.nfceEmitida === true,
        );

        if (!emitidas.length) {
          mostrarMensagem({
            tipo: "warning",
            titulo: "Nenhuma NFC-e encontrada",
            mensagem: "Não existem NFC-es emitidas para conferência hoje.",
          });

          return;
        }

        let totalGeral = 0;

        const linhas = emitidas
          .map((pedido, index) => {
            totalGeral += Number(pedido.total || 0);

            const formaPagamento =
              pedido.origem === "mesa"
                ? formatarPagamentoMesa(
                    pedido.pagamento ||
                      pedido.pagamentos ||
                      pedido.pagamentosParciais,
                  )
                : pedido.pagamento || "-";

            return `
      <div class="linha">
        <div>
          <strong>${String(index + 1).padStart(3, "0")}</strong>
          | ${esc(pedido.origem?.toUpperCase() || "-")}
        </div>

        <div>${esc(pedido.cliente || "-")}</div>

        <div>${esc(formaPagamento)}</div>

        <div class="valor">
          R$ ${Number(pedido.total || 0).toFixed(2)}
        </div>

        <hr>
      </div>
    `;
          })
          .join("");

        const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">

<style>
@page{ margin:0; }
body{
  font-family: "Courier New", monospace;
  width: 250px;
  margin: 0;
  padding: 0 0 0 5px;
  color: #000;
}

.cabecalho{
  text-align: center;
  margin-bottom: 10px;
}

.logo{
  font-size: 20px;
  font-weight: bold;
}

.subtitulo{
  font-size: 13px;
  margin-top: 2px;
}

.datahora{
  margin-top: 8px;
  font-size: 11px;
}

.separador{
  border-top: 2px solid #000;
  margin: 8px 0;
}

.linha{
  padding: 6px 0;
  font-size: 12px;
}

.cliente{
  font-weight: bold;
}

.valor{
  text-align: right;
  font-weight: bold;
  margin-top: 3px;
}

hr{
  border: none;
  border-top: 1px dashed #000;
  margin: 6px 0;
}

.resumo{
  margin-top: 10px;
  border-top: 2px solid #000;
  padding-top: 10px;
  font-size: 13px;
  font-weight: bold;
}

.resumo-item{
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.rodape{
  margin-top: 15px;
  text-align: center;
  border-top: 1px dashed #000;
  padding-top: 10px;
  font-size: 11px;
}

.destaque{
  font-size: 15px;
  font-weight: bold;
}
</style>

</head>

<body>

<div class="cabecalho">

  <div class="logo">
    Gab's Pizzaria & Esfiharia
  </div>

  <div class="subtitulo">
    RELATÓRIO DE NFC-e EMITIDAS
  </div>

  <div class="datahora">
    Data: ${new Date().toLocaleDateString("pt-BR")}<br>
    Hora: ${new Date().toLocaleTimeString("pt-BR")}
  </div>

</div>

<div class="separador"></div>

${linhas}

<div class="resumo">

  <div class="resumo-item">
    <span>QTD NFC-e:</span>
    <span>${emitidas.length}</span>
  </div>

  <div class="resumo-item destaque">
    <span>TOTAL GERAL:</span>
    <span>R$ ${totalGeral.toFixed(2)}</span>
  </div>

</div>

<div class="rodape">
  Conferência de Notas<br>
  Gab's Pizzaria & Esfiharia
</div>

</body>
</html>
`;
        const win = window.open("", "_blank");

        win.document.open();
        win.document.write(html);
        win.document.close();

        win.onload = () => {
          win.print();
        };
      }

// ----------------------------------------------------------------------
iniciarPagina("nfce", async () => {
  if (LOJA.senhaNotaFiscal && !(await exigirSenha(LOJA.senhaNotaFiscal, "a Emissão de nota"))) return;
  adicionarLog("Usuário autenticado");

  document.getElementById("btnLimparLog").addEventListener("click", () => { resultadoNfce.textContent = ""; });
  document.getElementById("btnAtualizar").addEventListener("click", carregarPedidos);
  document.getElementById("btnConferencia").addEventListener("click", imprimirRelatorioEmitidas);
  document.getElementById("btnEmitirSelecionadas").addEventListener("click", emitirSelecionadas);
  document.getElementById("filterStatus").addEventListener("change", () => { atualizarDashboard(); renderizarTabela(); });
  document.getElementById("filterTipo").addEventListener("change", renderizarTabela);
  document.getElementById("searchInput").addEventListener("input", renderizarTabela);
  document.getElementById("selectAllPedidos").addEventListener("change", selecionarTodosPedidos);

  document.getElementById("btnCancelarCpf").addEventListener("click", () => {
    document.getElementById("cpfModal").classList.add("hidden");
    window.pedidoSelecionado = null;
  });
  document.getElementById("btnConfirmarCpf").addEventListener("click", emitirPedido);

  tabelaPedidos.addEventListener("click", (e) => {
    const b = e.target.closest("[data-acao]");
    if (!b) return;
    const id = b.closest("[data-id]").dataset.id;
    if (b.dataset.acao === "marcar") togglePedidoSelecionado(id);
    if (b.dataset.acao === "cpf") abrirModalCpf(id);
    if (b.dataset.acao === "danfe") abrirDanfe(window.todosPedidos.find((p) => p.id === id)?.nfceXmlBase64);
  });

  await carregarPedidos();
  if (autoRefresh) clearInterval(autoRefresh);
  autoRefresh = setInterval(carregarPedidos, 60000);
});
