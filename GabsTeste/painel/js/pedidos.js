// Tela de PEDIDOS (admin.html): pedidos do dia, impressão automática e ações.
import {
  collection, query, where, orderBy, onSnapshot, doc, updateDoc, setDoc, Timestamp, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  db, iniciarPagina, $, esc, reaisPonto, diaDeTrabalho, janelaDoDia,
  abrirJanela, confirmar, alerta, avisar
} from "./base.js?v=1.0.3";
import { LOJA, MENSAGENS } from "./config.js?v=1.0.3";
import { imprimirPedido } from "./impressao.js?v=1.0.3";

// Cancelar pedido pede o MOTIVO (obrigatório) e a senha de autorização (LOJA.senhaCancelamento), como no painel antigo.
// Resolve { motivo } só com motivo preenchido e senha certa; senha errada avisa e deixa tentar de novo. Voltar = null.
// O campo NÃO é type="password": o Chrome trataria como login e preencheria o usuário salvo
// na busca de pedidos, escondendo todos os pedidos da tela. Os caracteres ficam ocultos por CSS.
function pedirSenhaCancelamento() {
  const buscaAntes = $("busca").value;
  return new Promise((resolve) => {
    let ok = null;
    const pedeSenha = !!LOJA.senhaCancelamento;
    const j = abrirJanela({
      titulo: "🔐 Cancelar pedido",
      corpo: `<label class="rotulo" for="motivoCancelamento">Motivo do cancelamento</label>
              <textarea class="campo" id="motivoCancelamento" rows="3" maxlength="200" placeholder="Ex.: cliente desistiu, endereço errado, pedido duplicado..."></textarea>
              <p id="erroMotivoCancelamento" class="oculto" style="color:var(--perigo); font-weight:600; margin-top:6px">Informe o motivo do cancelamento.</p>
              ${pedeSenha ? `<label class="rotulo" for="senhaCancelamento" style="margin-top:12px">Senha de autorização</label>
              <input class="campo" id="senhaCancelamento" type="text" inputmode="numeric" autocomplete="off" autocorrect="off" spellcheck="false"
                placeholder="Senha" style="-webkit-text-security: disc">
              <p id="erroSenhaCancelamento" class="oculto" style="color:var(--perigo); font-weight:600; margin-top:8px">❌ Senha incorreta!</p>` : ""}`,
      rodape: `<button class="btn" data-fechar>Voltar</button>
               <button class="btn btn-perigo" data-ok>🔴 Confirmar cancelamento</button>`,
      aoFechar: () => {
        // se algo (ex.: preenchimento automático do navegador) mexeu na busca, volta como estava
        if ($("busca").value !== buscaAntes) {
          $("busca").value = buscaAntes;
          busca = buscaAntes.trim().toLowerCase();
          render();
        }
        resolve(ok);
      }
    });
    const campoMotivo = j.el.querySelector("#motivoCancelamento");
    const campoSenha = j.el.querySelector("#senhaCancelamento");
    const conferir = () => {
      const motivo = campoMotivo.value.trim();
      j.el.querySelector("#erroMotivoCancelamento").classList.toggle("oculto", !!motivo);
      if (!motivo) { campoMotivo.focus(); return; }
      if (!pedeSenha || campoSenha.value === LOJA.senhaCancelamento) { ok = { motivo }; j.fechar(); return; }
      j.el.querySelector("#erroSenhaCancelamento").classList.remove("oculto");
      campoSenha.value = "";
      campoSenha.focus();
    };
    j.el.querySelector("[data-ok]").addEventListener("click", conferir);
    campoSenha?.addEventListener("keydown", (e) => { if (e.key === "Enter") conferir(); });
    setTimeout(() => campoMotivo.focus(), 50);
  });
}

// ----------------------------------------------------------------------
// Estado
// ----------------------------------------------------------------------
let pedidos = [];               // [{ id, ...dados }] do dia, mais recente primeiro
let filtroStatus = "pendente";
let filtroTipo = "todos";
let busca = "";
let recebendo = false;
let entregaPausada = false; // config/estadoPedidos.entregaPausada: cardápio só aceita retirada
let tempoEntrega = "";
let chavePix = LOJA.chavePixPadrao;
let somLiberado = false;

// Pedidos já impressos neste computador (mesma chave do painel antigo,
// assim a troca de versão não reimprime nada).
const impressos = (() => {
  try { return JSON.parse(localStorage.getItem("pedidosImpressos")) || {}; } catch { return {}; }
})();
const marcarImpresso = (id) => {
  impressos[id] = true;
  try { localStorage.setItem("pedidosImpressos", JSON.stringify(impressos)); } catch {}
};

// ----------------------------------------------------------------------
// Regras do pedido (iguais às do painel antigo)
// ----------------------------------------------------------------------
const endereco = (o) => o.enderecoCliente || o.endereco || "";
const telefone = (o) => o.telefoneCliente || o.telefone || "";
const nomeCliente = (o) => o.nomeCliente || o.cliente || "";
const tipoDe = (o) => (endereco(o) ? "delivery" : o.mesa ? "mesa" : "retirada");
const totalDe = (o) => Number(o.totalFinal ?? o.total ?? 0);

function rotuloTipo(o) {
  const t = tipoDe(o);
  if (t === "delivery") return "📦 Delivery";
  if (t === "mesa") return `🍽️ Mesa ${esc(o.mesa)}`;
  return "🏃 Retirada balcão";
}

// ----------------------------------------------------------------------
// Tempo real + impressão automática
// ----------------------------------------------------------------------
function escutarPedidos() {
  const { inicio, fim } = janelaDoDia(diaDeTrabalho());
  const q = query(
    collection(db, "orders"),
    where("createdAt", ">=", Timestamp.fromDate(inicio)),
    where("createdAt", "<=", Timestamp.fromDate(fim)),
    orderBy("createdAt", "asc")
  );

  onSnapshot(q, (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type !== "added") return;
      const id = change.doc.id;
      if (impressos[id]) return;
      avisarNovoPedido();
      imprimir(change.doc.data(), id);
      marcarImpresso(id);
    });
    pedidos = snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();
    render();
  }, (erro) => {
    console.error("Erro ao escutar pedidos:", erro);
    avisar("Erro ao carregar pedidos. Verifique a internet.", "erro");
  });
}

// Uma falha na impressão (ex.: pop-up bloqueado) não pode travar a lista de pedidos
function imprimir(pedido, id) {
  try {
    imprimirPedido(pedido, id);
  } catch (e) {
    console.error("Falha ao imprimir o pedido", id, e);
    avisar("Não foi possível imprimir. Verifique se o navegador permite pop-ups.", "erro");
  }
}

function avisarNovoPedido() {
  const el = $("alertaNovo");
  el.classList.remove("oculto");
  clearTimeout(avisarNovoPedido.t);
  avisarNovoPedido.t = setTimeout(() => el.classList.add("oculto"), 5000);
  if (somLiberado) $("alertaSom").play().catch((e) => console.warn("Erro ao tocar som:", e));
}

// O navegador só deixa tocar som depois do primeiro clique na página.
// Aberto pelo LABRASA.bat (opção de autoplay), o som já fica liberado sozinho.
function prepararSom() {
  const som = $("alertaSom");
  const liberado = () => {
    som.pause();
    som.currentTime = 0;
    som.volume = 1;
    somLiberado = true;
    $("avisoSom").classList.add("oculto");
    document.removeEventListener("click", liberarNoClique);
  };
  function liberarNoClique() {
    som.volume = 0;
    som.play().then(liberado).catch(() => {});
  }
  document.addEventListener("click", liberarNoClique);
  som.volume = 0; // teste silencioso
  som.play().then(liberado).catch(() => { som.volume = 1; });
}

// ----------------------------------------------------------------------
// Configurações da loja (recebimento, tempo de entrega, PIX)
// ----------------------------------------------------------------------
const refEstado = doc(db, "config", "estadoPedidos");
const refEntrega = doc(db, "config", "entrega");
const refPix = doc(db, "config", "pix");

function escutarConfig() {
  onSnapshot(refEstado, (s) => {
    recebendo = s.exists() && !!s.data().recebendo;
    const b = $("btnRecebimento");
    b.textContent = recebendo ? "🛑 Parar de receber" : "✅ Ativar recebimento";
    b.className = `btn btn-g ${recebendo ? "btn-perigo" : "btn-ok"}`;
    entregaPausada = s.exists() && s.data().entregaPausada === true;
    const e = $("btnEntregas");
    e.textContent = entregaPausada ? "▶️ Reativar entregas" : "⏸️ Pausar entregas";
    e.className = `btn btn-g ${entregaPausada ? "btn-ok" : "btn-perigo"}`;
  });
  onSnapshot(refEntrega, (s) => {
    tempoEntrega = s.exists() ? s.data().tempoEntrega || "" : "";
    $("txtTempo").textContent = tempoEntrega ? `Entrega: ${tempoEntrega}` : "Tempo de entrega";
  });
  onSnapshot(refPix, (s) => {
    const salva = s.exists() ? String(s.data().chave || "").trim() : "";
    chavePix = salva || LOJA.chavePixPadrao;
  });
}

async function alternarRecebimento() {
  const novo = !recebendo;
  const ok = await confirmar(
    novo ? "Voltar a receber pedidos pelo cardápio?" : "Parar de receber pedidos pelo cardápio?",
    { titulo: novo ? "Ativar recebimento" : "Parar recebimento", ok: novo ? "Ativar" : "Parar", perigo: !novo }
  );
  if (!ok) return;
  try {
    await setDoc(refEstado, { recebendo: novo }, { merge: true });
  } catch (e) {
    console.error(e);
    alerta("Não foi possível alterar o recebimento.");
  }
}

async function alternarEntregas() {
  const pausar = !entregaPausada;
  const ok = await confirmar(
    pausar ? "Pausar as entregas? O cardápio vai aceitar só pedidos para retirada." : "Voltar a aceitar pedidos de entrega pelo cardápio?",
    { titulo: pausar ? "Pausar entregas" : "Reativar entregas", ok: pausar ? "Pausar" : "Reativar", perigo: pausar }
  );
  if (!ok) return;
  try {
    await setDoc(refEstado, { entregaPausada: pausar }, { merge: true });
  } catch (e) {
    console.error(e);
    alerta("Não foi possível alterar as entregas.");
  }
}

function editarTempoEntrega() {
  const j = abrirJanela({
    titulo: "⏱️ Tempo de entrega",
    corpo: `<label class="rotulo" for="inpTempo">Aparece no cardápio para o cliente</label>
            <input class="campo" id="inpTempo" placeholder="Ex: 40 a 60 minutos" value="${esc(tempoEntrega)}">`,
    rodape: `<button class="btn" data-fechar>Cancelar</button><button class="btn btn-primario" data-salvar>💾 Salvar</button>`
  });
  j.el.querySelector("[data-salvar]").addEventListener("click", async () => {
    try {
      await setDoc(refEntrega, { tempoEntrega: j.el.querySelector("#inpTempo").value.trim() }, { merge: true });
      j.fechar();
      avisar("✔ Tempo de entrega atualizado!", "ok");
    } catch (e) {
      console.error(e);
      alerta("Erro ao salvar o tempo de entrega.");
    }
  });
}

function editarChavePix() {
  const j = abrirJanela({
    titulo: "⚡ Chave PIX",
    corpo: `<label class="rotulo" for="inpPix">Enviada ao cliente pelo botão “Enviar chave Pix”</label>
            <textarea class="campo" id="inpPix" rows="3">${esc(chavePix)}</textarea>`,
    rodape: `<button class="btn" data-fechar>Cancelar</button><button class="btn btn-primario" data-salvar>💾 Salvar</button>`
  });
  j.el.querySelector("[data-salvar]").addEventListener("click", async () => {
    const valor = j.el.querySelector("#inpPix").value.trim();
    if (!valor) return alerta("Informe a chave PIX.");
    try {
      await setDoc(refPix, { chave: valor }, { merge: true });
      j.fechar();
      avisar("✔ Chave PIX atualizada!", "ok");
    } catch (e) {
      console.error(e);
      alerta("Erro ao salvar a chave PIX.");
    }
  });
}

// ----------------------------------------------------------------------
// Ações do pedido
// ----------------------------------------------------------------------
function abrirWhats(tel, mensagem) {
  const limpo = String(tel).replace(/\D/g, "");
  window.open(`https://wa.me/55${limpo}?text=${encodeURIComponent(mensagem)}`, "_blank");
}

async function mudarStatus(id, dados) {
  try {
    await updateDoc(doc(db, "orders", id), dados);
    return true;
  } catch (e) {
    console.error("Erro ao atualizar pedido:", e);
    alerta("Não foi possível atualizar o pedido.");
    return false;
  }
}

function concluirComPagamento(o) {
  const j = abrirJanela({
    titulo: "Forma de pagamento",
    corpo: `<p class="pagina-sub" style="margin-bottom:12px">Total: <b>${reaisPonto(totalDe(o))}</b></p>
      <div class="grade-2" style="grid-template-columns:repeat(3,1fr)">
        <button class="btn btn-g" data-forma="dinheiro">💵 Dinheiro</button>
        <button class="btn btn-g" data-forma="cartao">💳 Cartão</button>
        <button class="btn btn-g" data-forma="pix">⚡ Pix</button>
      </div>`
  });
  j.el.querySelectorAll("[data-forma]").forEach((b) => b.addEventListener("click", async () => {
    j.fechar();
    // mesmos valores gravados pelo painel antigo: "dinheiro" | "cartao" | "pix"
    if (await mudarStatus(o.id, { status: "concluido", formaPagamento: b.dataset.forma })) avisar("✅ Pedido concluído!", "ok");
  }));
}

async function acao(nome, o) {
  const tel = telefone(o);
  switch (nome) {
    case "imprimir":
      imprimir(o, o.id);
      return;
    case "cancelar":
      if (!(await confirmar("Tem certeza que deseja cancelar este pedido?", { titulo: "⚠️ Cancelar pedido", ok: "Continuar", perigo: true }))) return;
      {
        const r = await pedirSenhaCancelamento();
        if (!r) return;
        mudarStatus(o.id, { status: "cancelado", motivoCancelamento: r.motivo, canceladoEm: serverTimestamp() });
      }
      return;
    case "concluir":
      concluirComPagamento(o);
      return;
    case "delivery":
    case "retirada":
    case "pronto":
      abrirWhats(tel, MENSAGENS[nome]);
      return;
    case "saiu":
      abrirWhats(tel, MENSAGENS.saiu);
      mudarStatus(o.id, { status: "concluido" });
      return;
    case "pix":
      abrirWhats(tel, MENSAGENS.pix(chavePix));
      return;
    case "reabrir":
      if (await confirmar("Deseja realmente voltar este pedido para pendente?", { titulo: "Voltar para pendente", ok: "Voltar" })
          && await mudarStatus(o.id, { status: "pendente" }))
        avisar("✅ Pedido voltou para pendente!", "ok");
      return;
  }
}

// ----------------------------------------------------------------------
// Tela
// ----------------------------------------------------------------------
const STATUS = [
  { id: "pendente",  nome: "Pendentes" },
  { id: "concluido", nome: "Concluídos" },
  { id: "cancelado", nome: "Cancelados" }
];
const TIPOS = [
  { id: "todos",    nome: "Todos" },
  { id: "delivery", nome: "📦 Delivery" },
  { id: "retirada", nome: "🏃 Retirada" }
];

function botoes(o) {
  const b = (acaoNome, texto, classe) => `<button class="btn btn-p ${classe}" data-acao="${acaoNome}">${texto}</button>`;
  const tipo = tipoDe(o);
  let h = "";
  if (o.status !== "cancelado") h += b("cancelar", "Cancelar", "btn-leve-perigo");
  h += b("imprimir", "🖨️ Imprimir", "");
  if (telefone(o)) {
    if (o.status === "pendente") {
      // "Concluir pedido" vale para retirada e delivery (como no painel antigo)
      if (tipo === "retirada" || tipo === "delivery") h += b("concluir", "✅ Concluir pedido", "btn-ok");
      if (tipo === "retirada") {
        h += b("retirada", "💬 Recebido", "btn-whats");
        h += b("pronto", "🛍️ Pronto p/ retirar", "btn-whats");
      }
      if (tipo === "delivery") {
        h += b("delivery", "💬 Recebido", "btn-whats");
        h += b("saiu", "🛵 Saiu p/ entrega", "btn-whats");
      }
    }
    h += b("pix", "⚡ Enviar chave Pix", "btn-pix");
    if (o.status === "concluido" || o.status === "cancelado") h += b("reabrir", "↩ Voltar p/ pendente", "");
  }
  return h;
}

function cardPedido(o) {
  const selo = {
    pendente: '<span class="selo selo-pendente">PENDENTE</span>',
    concluido: '<span class="selo selo-ok">CONCLUÍDO</span>',
    cancelado: '<span class="selo selo-perigo">CANCELADO</span>'
  }[o.status] || "";
  const d = o.createdAt?.toDate?.();
  const troco = o.precisaTroco === true && o.valorTroco
    ? `<p>💵 Troco para: <b>${reaisPonto(parseFloat(o.valorTroco))}</b></p>`
    : o.precisaTroco === false ? "<p>💵 Sem troco</p>" : "";
  const regiao = o.bairro || o.regiao;

  return `
    <article class="card pedido st-${esc(o.status)}" data-id="${esc(o.id)}">
      <div class="pedido-cab">
        <div>${selo}<div class="pedido-tipo">${rotuloTipo(o)}</div></div>
        <div class="pedido-hora"><b>${d ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "?"}</b>${d ? d.toLocaleDateString("pt-BR") : ""}</div>
      </div>
      <div class="pedido-info">
        ${nomeCliente(o) ? `<p>👤 <b>${esc(nomeCliente(o))}</b></p>` : ""}
        ${telefone(o) ? `<p>📞 ${esc(telefone(o))}</p>` : ""}
        ${endereco(o) ? `<p>📍 ${esc(endereco(o))}</p>` : ""}
        ${regiao ? `<p>📌 Região: ${esc(regiao)}</p>` : ""}
        ${o.formaPagamento ? `<p>💳 ${esc(o.formaPagamento)}</p>` : ""}
        ${troco}
        ${o.status === "cancelado" && o.motivoCancelamento ? `<p style="color:var(--perigo)">🚫 Motivo do cancelamento: <b>${esc(o.motivoCancelamento)}</b></p>` : ""}
      </div>
      <ul class="pedido-itens">
        ${(o.items || []).map((i) => `
          <li><span><span class="qtd">${esc(i.quantidade)}x</span>${esc(i.nome)}</span><span class="num">${reaisPonto(i.subtotal)}</span></li>`).join("")}
      </ul>
      <div class="pedido-total"><span>Total</span><span>${reaisPonto(totalDe(o))}</span></div>
      <div class="pedido-acoes">${botoes(o)}</div>
    </article>`;
}

function passaFiltros(o) {
  if (o.status !== filtroStatus) return false;
  if (filtroTipo !== "todos" && tipoDe(o) !== filtroTipo) return false;
  if (busca && !String(o.mesa || "").toLowerCase().includes(busca) && !nomeCliente(o).toLowerCase().includes(busca)) return false;
  return true;
}

function render() {
  $("filtroStatus").innerHTML = STATUS.map((s) => `
    <button data-status="${s.id}" class="${s.id === filtroStatus ? "ativo" : ""}">
      ${s.nome}<span class="contagem">${pedidos.filter((o) => o.status === s.id).length}</span>
    </button>`).join("");
  $("filtroTipo").innerHTML = TIPOS.map((t) =>
    `<button data-tipo="${t.id}" class="${t.id === filtroTipo ? "ativo" : ""}">${t.nome}</button>`).join("");

  const lista = pedidos.filter(passaFiltros);
  $("listaPedidos").innerHTML = lista.map(cardPedido).join("");
  $("vazio").classList.toggle("oculto", lista.length > 0);
}

function ligarEventos() {
  $("filtroStatus").addEventListener("click", (e) => {
    const b = e.target.closest("[data-status]");
    if (b) { filtroStatus = b.dataset.status; render(); }
  });
  $("filtroTipo").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tipo]");
    if (b) { filtroTipo = b.dataset.tipo; render(); }
  });
  $("busca").addEventListener("input", (e) => { busca = e.target.value.trim().toLowerCase(); render(); });
  $("listaPedidos").addEventListener("click", (e) => {
    const b = e.target.closest("[data-acao]");
    if (!b) return;
    const o = pedidos.find((x) => x.id === b.closest("[data-id]").dataset.id);
    if (o) acao(b.dataset.acao, o);
  });
  $("btnRecebimento").addEventListener("click", alternarRecebimento);
  $("btnEntregas").addEventListener("click", alternarEntregas);
  $("btnTempo").addEventListener("click", editarTempoEntrega);
  $("btnPix").addEventListener("click", editarChavePix);
}

// ----------------------------------------------------------------------
// Início
// ----------------------------------------------------------------------
iniciarPagina("pedidos", () => {
  const dia = diaDeTrabalho();
  $("dataDia").textContent = new Date(`${dia}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  ligarEventos();
  prepararSom();
  escutarConfig();
  escutarPedidos();
  render();
  // às 06:00 começa um novo dia de trabalho: recarrega para escutar o dia novo
  setInterval(() => { if (diaDeTrabalho() !== dia) location.reload(); }, 60000);
});
