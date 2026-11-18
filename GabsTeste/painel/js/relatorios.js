// RELATÓRIOS: mesmas contas do painel antigo (comandas de mesa + pedidos concluídos).
import {
  collection, getDocs, query, where, Timestamp, addDoc, updateDoc, doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, iniciarPagina, $, reaisPonto, dataISO, alerta, avisar, exigirSenha } from "./base.js?v=20261118b";
import { LOJA } from "./config.js?v=20261118b";

const linha = (rotulo, valor, extra = "") => `<div><span>${rotulo}</span><b class="num">${valor}</b></div>${extra}`;
const semAcento = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// O relatório é do dia de calendário (00:00 às 23:59:59), como no painel antigo
async function carregar(dataInicio = dataISO(), dataFim = dataInicio) {
  $("dataInicio").value = dataInicio;
  $("dataFim").value = dataFim;
  $("periodo").textContent = dataInicio === dataFim
    ? new Date(`${dataInicio}T12:00:00`).toLocaleDateString("pt-BR")
    : `${new Date(`${dataInicio}T12:00:00`).toLocaleDateString("pt-BR")} a ${new Date(`${dataFim}T12:00:00`).toLocaleDateString("pt-BR")}`;

  const vendasPorDia = {};
  const pagamentos = { cartao: 0, pix: 0, dinheiro: 0 };
  let totalTaxaGarcom = 0;
  let totalDelivery = 0, totalRetirada = 0, valorDelivery = 0, valorRetirada = 0, totalTaxaEntrega = 0;
  let totalComandas = 0;

  const ini = Timestamp.fromDate(new Date(`${dataInicio}T00:00:00`));
  const fimTs = Timestamp.fromDate(new Date(`${dataFim}T23:59:59.999`));

  try {
    // Comandas de mesa
    const comandas = await getDocs(query(collection(db, "comandasHistorico"), where("abertaEm", ">=", ini), where("abertaEm", "<=", fimTs)));
    comandas.forEach((d) => {
      const c = d.data();
      const dia = c.abertaEm?.toDate().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const total = (c.pagamentos?.cartao || 0) + (c.pagamentos?.pix || 0) + (c.pagamentos?.dinheiro || 0);
      totalComandas += total;
      vendasPorDia[dia] = (vendasPorDia[dia] || 0) + total;
      pagamentos.cartao += c.pagamentos?.cartao || 0;
      pagamentos.pix += c.pagamentos?.pix || 0;
      pagamentos.dinheiro += c.pagamentos?.dinheiro || 0;
      totalTaxaGarcom += c.taxaGarcom || 0;
    });

    // Pedidos concluídos (delivery, retirada e mesa)
    const pedidos = await getDocs(query(collection(db, "orders"),
      where("status", "==", "concluido"), where("createdAt", ">=", ini), where("createdAt", "<=", fimTs)));
    pedidos.forEach((d) => {
      const p = d.data();
      const total = Number(p.totalFinal ?? p.total ?? 0);
      const dia = p.createdAt?.toDate().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const forma = semAcento(p.formaPagamento ?? p.pagamento ?? "");

      // pedidos de mesa já entram pela comanda
      if (!p.mesa) vendasPorDia[dia] = (vendasPorDia[dia] || 0) + total;

      if (forma.includes("pix")) pagamentos.pix += total;
      else if (forma.includes("cartao") || forma.includes("credito") || forma.includes("debito")) pagamentos.cartao += total;
      else if (forma.includes("dinheiro") || forma.includes("especie") || /\bdin\b/.test(forma)) pagamentos.dinheiro += total;

      totalTaxaGarcom += Number(p.taxaGarcom ?? 0);

      const isDelivery = Boolean(p.endereco || p.enderecoCliente);
      const isRetirada = !isDelivery && !p.mesa;
      if (isDelivery) { totalDelivery++; valorDelivery += total; totalTaxaEntrega += Number(p.taxaEntrega ?? 0); }
      else if (isRetirada) { totalRetirada++; valorRetirada += total; }
    });

    // Troco inicial do caixa (só quando é um único dia)
    let trocoInicial = 0;
    if (dataInicio === dataFim) {
      const abertura = await getDocs(query(collection(db, "caixa"), where("data", "==", dataInicio)));
      if (!abertura.empty) {
        trocoInicial = abertura.docs[0].data().trocoInicial || 0;
        pagamentos.dinheiro += trocoInicial;
      }
    }

    $("porDia").innerHTML = Object.entries(vendasPorDia).map(([dia, t]) => linha(dia, reaisPonto(t))).join("")
      || '<p class="pagina-sub">Sem vendas no período.</p>';
    $("porPagamento").innerHTML =
      linha("💳 Cartão", reaisPonto(pagamentos.cartao)) +
      linha("⚡ Pix", reaisPonto(pagamentos.pix)) +
      linha("💵 Dinheiro", reaisPonto(pagamentos.dinheiro),
        trocoInicial > 0 ? `<p class="pagina-sub" style="padding:0 0 6px">Inclui troco inicial de ${reaisPonto(trocoInicial)}</p>` : "") +
      linha("💸 Taxa dos garçons (5%)", reaisPonto(totalTaxaGarcom));
    $("entregas").innerHTML =
      linha("🍽️ Mesas (comandas)", reaisPonto(totalComandas)) +
      linha(`📦 Delivery · ${totalDelivery} pedidos`, reaisPonto(valorDelivery)) +
      linha(`🛍️ Retirada · ${totalRetirada} pedidos`, reaisPonto(valorRetirada)) +
      linha("🚚 Taxa de entrega (já somada no delivery)", reaisPonto(totalTaxaEntrega));
    $("totalGeral").textContent = reaisPonto(Object.values(vendasPorDia).reduce((a, b) => a + b, 0));
  } catch (e) {
    console.error(e);
    avisar("Erro ao carregar o relatório.", "erro");
  }
}

async function abrirCaixa() {
  const valor = parseFloat($("valorAbertura").value);
  if (isNaN(valor) || valor <= 0) return alerta("Informe um valor válido para abertura.");
  const hoje = dataISO();
  try {
    const snap = await getDocs(query(collection(db, "caixa"), where("data", "==", hoje)));
    if (snap.empty) {
      await addDoc(collection(db, "caixa"), { data: hoje, trocoInicial: valor, abertoEm: Timestamp.now(), abertoPor: "admin" });
      avisar("✅ Caixa aberto com sucesso!", "ok");
    } else {
      await updateDoc(doc(db, "caixa", snap.docs[0].id), { trocoInicial: valor, atualizadoEm: Timestamp.now() });
      avisar("🔄 Valor de abertura atualizado.", "ok");
    }
    $("valorAbertura").value = "";
    carregar();
  } catch (e) {
    console.error("Erro ao registrar caixa:", e);
    alerta("Erro ao abrir ou atualizar caixa.");
  }
}

iniciarPagina("relatorios", async () => {
  if (LOJA.senhaRelatorios && !(await exigirSenha(LOJA.senhaRelatorios, "os Relatórios"))) return;
  $("btnFiltrar").addEventListener("click", () => {
    const inicio = $("dataInicio").value, fim = $("dataFim").value;
    if (!inicio || !fim) return alerta("Preencha ambas as datas.");
    carregar(inicio, fim);
  });
  $("btnHoje").addEventListener("click", () => carregar());
  $("btnAbrirCaixa").addEventListener("click", abrirCaixa);
  carregar();
});
