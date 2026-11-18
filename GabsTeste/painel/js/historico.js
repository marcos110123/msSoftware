// Tela de HISTÓRICO (historico.html): pedidos de qualquer período, com filtro, busca e reimpressão.
import {
  collection, query, where, orderBy, getDocs, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, iniciarPagina, $, esc, reaisPonto, dataISO, janelaDoDia, diaDeTrabalho, avisar, exigirSenha } from "./base.js";
import { LOJA } from "./config.js";
import { imprimirPedido } from "./impressao.js";

// ----------------------------------------------------------------------
// Estado
// ----------------------------------------------------------------------
let pedidos = [];          // do mais novo para o mais antigo
let filtroStatus = "todos";
let filtroTipo = "todos";
let busca = "";
const abertos = new Set();
const MAX_DIAS = 7;        // no máximo 7 dias por consulta (menos leituras no Firebase)

const STATUS = [
  { id: "todos",     nome: "Todos" },
  { id: "concluido", nome: "Concluídos" },
  { id: "cancelado", nome: "Cancelados" },
  { id: "pendente",  nome: "Pendentes" }
];
const TIPOS = [
  { id: "todos",    nome: "Todos" },
  { id: "delivery", nome: "📦 Delivery" },
  { id: "retirada", nome: "🏃 Retirada" },
  { id: "mesa",     nome: "🍽️ Mesa" }
];

// Regras do pedido (iguais às da tela de Pedidos)
const endereco = (o) => o.enderecoCliente || o.endereco || "";
const telefone = (o) => o.telefoneCliente || o.telefone || "";
const nomeCliente = (o) => o.nomeCliente || o.cliente || "";
const tipoDe = (o) => (endereco(o) ? "delivery" : o.mesa ? "mesa" : "retirada");
const totalDe = (o) => Number(o.totalFinal ?? o.total ?? 0);
const horaDe = (o) => o.createdAt?.toDate?.() || null;
const hhmm = (d) => d ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--";
const somaDias = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return dataISO(d); };
// dia de trabalho do pedido: até as 05:59 conta como o dia anterior
const diaDoPedido = (o) => { const d = horaDe(o); if (!d) return ""; const x = new Date(d); if (x.getHours() < 6) x.setDate(x.getDate() - 1); return dataISO(x); };

function rotuloTipo(o) {
  const t = tipoDe(o);
  if (t === "delivery") return "📦 Delivery";
  if (t === "mesa") return `🍽️ Mesa ${esc(o.mesa)}`;
  return "🏃 Retirada";
}

const ATALHOS = [
  { id: "hoje",  nome: "Hoje",     periodo: () => { const h = diaDeTrabalho(); return [h, h]; } },
  { id: "ontem", nome: "Ontem",    periodo: () => { const o = somaDias(diaDeTrabalho(), -1); return [o, o]; } },
  { id: "7dias", nome: "7 dias",   periodo: () => [somaDias(diaDeTrabalho(), -6), diaDeTrabalho()] }
];
let atalhoAtivo = "hoje";

// ----------------------------------------------------------------------
// Busca no Firebase
// ----------------------------------------------------------------------
async function carregar() {
  const ini = $("dataInicio").value, fim = $("dataFim").value;
  if (!ini || !fim) return avisar("Escolha as duas datas.", "erro");
  if (ini > fim) return avisar("A data inicial é depois da final.", "erro");
  const dias = Math.round((new Date(`${fim}T12:00:00`) - new Date(`${ini}T12:00:00`)) / 86400000) + 1;
  if (dias > MAX_DIAS) return avisar(`Escolha no máximo ${MAX_DIAS} dias por vez.`, "erro");

  $("carregando").classList.remove("oculto");
  $("lista").innerHTML = "";
  $("resumo").textContent = "";
  try {
    const { inicio, fim: ate } = janelaDoDia(ini, fim);
    const snap = await getDocs(query(
      collection(db, "orders"),
      where("createdAt", ">=", Timestamp.fromDate(inicio)),
      where("createdAt", "<=", Timestamp.fromDate(ate)),
      orderBy("createdAt", "desc")
    ));
    pedidos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    abertos.clear();
    render();
  } catch (e) {
    console.error(e);
    avisar("Não foi possível carregar os pedidos. Verifique a internet.", "erro");
  } finally {
    $("carregando").classList.add("oculto");
  }
}

// ----------------------------------------------------------------------
// Tela
// ----------------------------------------------------------------------
function passaFiltros(o) {
  if (filtroStatus !== "todos" && o.status !== filtroStatus) return false;
  if (filtroTipo !== "todos" && tipoDe(o) !== filtroTipo) return false;
  if (busca) {
    const tel = telefone(o);
    const alvo = `${nomeCliente(o)} ${tel} ${tel.replace(/\D/g, "")} mesa ${o.mesa || ""} #${o.num || ""}`.toLowerCase();
    if (!alvo.includes(busca)) return false;
  }
  return true;
}

function selo(o) {
  return {
    concluido: '<span class="selo selo-ok">CONCLUÍDO</span>',
    cancelado: '<span class="selo selo-perigo">CANCELADO</span>',
    pendente:  '<span class="selo selo-pendente">PENDENTE</span>'
  }[o.status] || "";
}

function linha(o) {
  const aberto = abertos.has(o.id);
  const troco = o.precisaTroco === true && o.valorTroco
    ? `<p>💵 Troco para: <b>${reaisPonto(parseFloat(o.valorTroco))}</b></p>`
    : o.precisaTroco === false ? "<p>💵 Sem troco</p>" : "";
  const regiao = o.bairro || o.regiao;
  return `
    <article class="card pedido st-${esc(o.status)} hist-pedido" data-id="${esc(o.id)}">
      <button class="hist-linha" data-abrir>
        <span class="hist-hora">${hhmm(horaDe(o))}</span>
        <span class="hist-nome"><b>${esc(nomeCliente(o) || (o.mesa ? "Mesa " + o.mesa : "Cliente"))}</b>
          <small>${rotuloTipo(o)}${o.formaPagamento ? " · " + esc(o.formaPagamento) : ""}</small></span>
        <span class="hist-total"><b>${reaisPonto(totalDe(o))}</b>${selo(o)}</span>
        <span class="hist-seta">${aberto ? "▲" : "▼"}</span>
      </button>
      ${aberto ? `
        <div class="pedido-info" style="padding-top:4px">
          ${telefone(o) ? `<p>📞 ${esc(telefone(o))}</p>` : ""}
          ${endereco(o) ? `<p>📍 ${esc(endereco(o))}</p>` : ""}
          ${regiao ? `<p>📌 Região: ${esc(regiao)}</p>` : ""}
          ${troco}
          ${o.status === "cancelado" && o.motivoCancelamento ? `<p style="color:var(--perigo)">🚫 Motivo do cancelamento: <b>${esc(o.motivoCancelamento)}</b></p>` : ""}
        </div>
        <ul class="pedido-itens">
          ${(o.items || []).map((i) => `
            <li><span><span class="qtd">${esc(i.quantidade ?? 1)}x</span>${esc(i.nome)}${i.observacao ? `<br><small>📝 ${esc(i.observacao)}</small>` : ""}</span><span class="num">${reaisPonto(i.subtotal)}</span></li>`).join("")}
        </ul>
        ${o.ajuste?.valor ? `<p style="display:flex;justify-content:space-between;gap:10px;padding:8px 16px 0;font-size:14px;color:var(--texto-2)">
          <span>${o.ajuste.tipo === "desconto" ? "Desconto" : "Acréscimo"}${o.ajuste.motivo ? ` · ${esc(o.ajuste.motivo)}` : ""}</span>
          <span class="num">${o.ajuste.tipo === "desconto" ? "−" : "+"} ${reaisPonto(o.ajuste.valor)}</span></p>` : ""}
        <div class="pedido-total"><span>Total</span><span>${reaisPonto(totalDe(o))}</span></div>
        <div class="pedido-acoes">
          <button class="btn btn-p" data-acao="imprimir">🖨️ Reimprimir</button>
          ${telefone(o) ? `<button class="btn btn-p btn-whats" data-acao="whats">💬 WhatsApp do cliente</button>` : ""}
        </div>` : ""}
    </article>`;
}

function render() {
  $("atalhos").innerHTML = ATALHOS.map((a) => `<button data-atalho="${a.id}" class="${a.id === atalhoAtivo ? "ativo" : ""}">${a.nome}</button>`).join("");
  const conta = (s) => pedidos.filter((o) => (s === "todos" || o.status === s) && (filtroTipo === "todos" || tipoDe(o) === filtroTipo)).length;
  $("filtroStatus").innerHTML = STATUS.map((s) =>
    `<button data-status="${s.id}" class="${s.id === filtroStatus ? "ativo" : ""}">${s.nome}<span class="contagem">${conta(s.id)}</span></button>`).join("");
  $("filtroTipo").innerHTML = TIPOS.map((t) =>
    `<button data-tipo="${t.id}" class="${t.id === filtroTipo ? "ativo" : ""}">${t.nome}</button>`).join("");

  const lista = pedidos.filter(passaFiltros);
  const concl = lista.filter((o) => o.status === "concluido");
  $("resumo").innerHTML = lista.length
    ? `<b>${lista.length}</b> pedido${lista.length === 1 ? "" : "s"} · <b>${concl.length}</b> concluído${concl.length === 1 ? "" : "s"} somando <b>${reaisPonto(concl.reduce((s, o) => s + totalDe(o), 0))}</b>`
    : "";
  if (!lista.length) {
    $("lista").innerHTML = `<p class="vazio">${pedidos.length ? "Nenhum pedido com esse filtro." : "Nenhum pedido nesse período."}</p>`;
    return;
  }
  const porDia = new Map();
  lista.forEach((o) => { const k = diaDoPedido(o); if (!porDia.has(k)) porDia.set(k, []); porDia.get(k).push(o); });
  $("lista").innerHTML = [...porDia].map(([dia, itens]) => {
    const soma = itens.filter((o) => o.status === "concluido").reduce((s, o) => s + totalDe(o), 0);
    const titulo = dia ? new Date(`${dia}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }) : "Sem data";
    return `
      <section class="hist-dia">
        <div class="hist-dia-cab"><h2>${esc(titulo)}</h2><span>${itens.length} pedido${itens.length === 1 ? "" : "s"} · concluídos <b>${reaisPonto(soma)}</b></span></div>
        <div class="hist-itens">${itens.map(linha).join("")}</div>
      </section>`;
  }).join("");
}

// ----------------------------------------------------------------------
// Eventos
// ----------------------------------------------------------------------
function aplicarAtalho(id) {
  const a = ATALHOS.find((x) => x.id === id);
  if (!a) return;
  atalhoAtivo = id;
  const [ini, fim] = a.periodo();
  $("dataInicio").value = ini;
  $("dataFim").value = fim;
  carregar();
}

function abrirWhats(tel) {
  const limpo = String(tel).replace(/\D/g, "");
  if (!limpo) return;
  window.open(`https://wa.me/55${limpo}`, "_blank");
}

function ligarEventos() {
  $("atalhos").addEventListener("click", (e) => { const b = e.target.closest("[data-atalho]"); if (b) aplicarAtalho(b.dataset.atalho); });
  $("btnBuscar").addEventListener("click", () => { atalhoAtivo = ""; carregar(); });
  $("filtroStatus").addEventListener("click", (e) => { const b = e.target.closest("[data-status]"); if (b) { filtroStatus = b.dataset.status; render(); } });
  $("filtroTipo").addEventListener("click", (e) => { const b = e.target.closest("[data-tipo]"); if (b) { filtroTipo = b.dataset.tipo; render(); } });
  $("busca").addEventListener("input", (e) => { busca = e.target.value.trim().toLowerCase(); render(); });
  $("lista").addEventListener("click", (e) => {
    const card = e.target.closest("[data-id]");
    if (!card) return;
    const o = pedidos.find((x) => x.id === card.dataset.id);
    if (!o) return;
    const acao = e.target.closest("[data-acao]")?.dataset.acao;
    if (acao === "imprimir") {
      try { imprimirPedido(o, o.id); } catch (err) { console.error(err); avisar("Não foi possível imprimir.", "erro"); }
      return;
    }
    if (acao === "whats") return abrirWhats(telefone(o));
    if (e.target.closest("[data-abrir]")) { abertos.has(o.id) ? abertos.delete(o.id) : abertos.add(o.id); render(); }
  });
}

iniciarPagina("historico", async () => {
  // mesma senha dos Relatórios (o histórico mostra valores)
  if (LOJA.senhaRelatorios && !(await exigirSenha(LOJA.senhaRelatorios, "o Histórico"))) return;
  ligarEventos();
  aplicarAtalho("hoje");
});
