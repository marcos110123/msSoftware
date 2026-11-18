// VENDAS POR PRODUTO: mesma limpeza de nomes e mesma separação produtos x bebidas do painel antigo.
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, iniciarPagina, $, esc, diaDeTrabalho, janelaDoDia, alerta, exigirSenha } from "./base.js?v=1.0.2";
import { LOJA } from "./config.js?v=1.0.2";

let pedidosCarregados = []; // guardados para a busca filtrar sem consultar de novo

// Limpa o nome do item (tira observações e adicionais) — igual ao antigo
function limparNome(original) {
  let nome = original || "Sem Nome";
  const posObs = nome.toLowerCase().indexOf("- obs");
  if (posObs !== -1) nome = nome.substring(0, posObs);
  nome = nome.replace(/\s*\+\s*\(.*?\)/g, "");
  nome = nome.replace(/[()]/g, "");
  nome = nome.replace(/[-|]+$/, "");
  nome = nome.replace(/\s+/g, " ").trim();
  const lower = nome.toLowerCase();
  if (lower.includes("chamou o garçom") || lower.includes("chamou o garcom")) return null;
  if (lower.includes("hamburguer personalizado") || lower.includes("hambúrguer personalizado") || lower.includes("monte seu lanche")) {
    return "🍔 Hambúrguer Personalizado";
  }
  if (lower.includes("pizza") || lower.includes("pizza montada") || lower.includes("pizza personalizada") || lower.includes("monte sua pizza")) {
    return "🍕 Pizza";
  }
  return nome;
}

// Regra de bebida — copiada do antigo (inclusive a precedência dos operadores)
function ehBebida(nome) {
  const f = nome.toLowerCase();
  return (
    (nome !== "🍕 Pizza" && nome !== "🍔 Hambúrguer Personalizado" && f.includes("coca")) ||
    f.includes("guarana") || f.includes("guaraná") || f.includes("fanta") || f.includes("sprite") ||
    f.includes("pepsi") || f.includes("kuat") || f.includes("h2o") || f.includes("suco") ||
    f.includes("agua") || f.includes("água") || f.includes("chopp") || f.includes("cerveja") ||
    f.includes("heineken") || f.includes("amstel") || f.includes("budweiser") || f.includes("antarctica") ||
    f.includes("antartica") || f.includes("original") || f.includes("corona") || f.includes("stella") ||
    f.includes("vinho") || f.includes("taça") || f.includes("vodka") || f.includes("gin") ||
    f.includes("campari") || f.includes("caipirinha") || f.includes("red label") || f.includes("black label") ||
    f.includes("whisky") || f.includes("dose") || f.includes("energetico") || f.includes("energético") ||
    f.includes("monster") || f.includes("red bull") || f.includes("refrigerante") || f.includes("copo") ||
    f.includes("cdb") || f.includes("espanhola") || f.includes("milkshake") ||
    f.includes("roller") || f.includes("skol") || f.includes("poty") || f.includes("suvo") || f.includes("barreiro")
  );
}

const linhaMsg = (msg) => `<tr><td colspan="2" class="vazio">${msg}</td></tr>`;

async function carregar() {
  const inicio = $("dataInicio").value, fim = $("dataFim").value;
  if (!inicio || !fim) return alerta("Informe as duas datas.");
  $("tabelaProdutos").innerHTML = linhaMsg("Carregando vendas…");
  $("tabelaBebidas").innerHTML = linhaMsg("Carregando vendas…");
  try {
    const janela = janelaDoDia(inicio, fim); // até 05:59 do dia seguinte, como antes
    const snap = await getDocs(query(collection(db, "orders"),
      where("status", "==", "concluido"), where("createdAt", ">=", janela.inicio), where("createdAt", "<=", janela.fim)));
    pedidosCarregados = snap.docs.map((d) => d.data()).filter((p) => p.status === "concluido");
    montar();
  } catch (e) {
    console.error(e);
    $("tabelaProdutos").innerHTML = linhaMsg("Erro ao carregar vendas");
    $("tabelaBebidas").innerHTML = linhaMsg("Erro ao carregar vendas");
  }
}

function montar() {
  const busca = $("busca").value.toLowerCase();
  const produtos = {}, bebidas = {};
  let totalItens = 0;
  pedidosCarregados.forEach((pedido) => (pedido.items || []).forEach((item) => {
    const nome = limparNome(item.nome);
    if (!nome) return;
    if (busca && !nome.toLowerCase().includes(busca)) return;
    const destino = ehBebida(nome) ? bebidas : produtos;
    destino[nome] = (destino[nome] || 0) + (Number(item.quantidade) || 1);
    totalItens += Number(item.quantidade) || 1;
  }));

  const ranking = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);
  const rp = ranking(produtos), rb = ranking(bebidas);
  const medalha = (i) => ["🥇 ", "🥈 ", "🥉 "][i] || "";
  const linhas = (r) => r.map(([nome, qtd], i) =>
    `<tr><td style="font-weight:600">${medalha(i)}${esc(nome)}</td><td class="num" style="font-weight:800">${Math.floor(qtd)}</td></tr>`).join("");

  const vazio = !rp.length && !rb.length;
  $("tabelaProdutos").innerHTML = vazio ? linhaMsg("Nenhuma venda encontrada.") : linhas(rp);
  $("tabelaBebidas").innerHTML = vazio ? linhaMsg("Nenhuma venda encontrada.") : linhas(rb);
  $("produtosDiferentes").textContent = Object.keys(produtos).length + Object.keys(bebidas).length;
  $("totalItens").textContent = Math.floor(totalItens);
  $("produtoCampeao").textContent = rp[0]?.[0] || "-";
}

iniciarPagina("vendas", async () => {
  if (LOJA.senhaRelatorios && !(await exigirSenha(LOJA.senhaRelatorios, "as Vendas"))) return;
  const hoje = diaDeTrabalho();
  $("dataInicio").value = hoje;
  $("dataFim").value = hoje;
  $("btnAtualizar").addEventListener("click", carregar);
  $("busca").addEventListener("input", montar);
  carregar();
});
