import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { PADRAO, completar } from "../assets/site.js?v=1";
import { gerarPix } from "./pix.js?v=1";

// ----------------------
// Firebase (projeto só da MsSoftware; não tem nada dos clientes)
// ----------------------
const app = initializeApp({
  apiKey: "AIzaSyBSeAInxEC1rH959NAF3QztB3nhPqRp8tU",
  authDomain: "sitemssoftware-adm.firebaseapp.com",
  projectId: "sitemssoftware-adm",
  storageBucket: "sitemssoftware-adm.firebasestorage.app",
  messagingSenderId: "133967214847",
  appId: "1:133967214847:web:10e2cf402138cc9a0d74ca"
});
const auth = getAuth(app);
const db = getFirestore(app);

// ----------------------
// Utilitários
// ----------------------
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const brl = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const lerValor = (v) => { const s = String(v ?? "").replace(/[R$\s]/g, ""); const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; };
const hoje = () => new Date().toLocaleDateString("sv-SE"); // AAAA-MM-DD no fuso do aparelho
const mesAtual = () => hoje().slice(0, 7);
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const nomeMes = (m) => { const [a, n] = m.split("-"); return `${MESES[Number(n) - 1]}/${a}`; };
const dataBR = (d) => (d ? d.split("-").reverse().join("/") : "");
const soDigitos = (s) => String(s || "").replace(/\D/g, "");
const zapNumero = (s) => { const n = soDigitos(s); return n.length <= 11 ? "55" + n : n; };
let avisoTimer;
function avisar(msg) {
  $("aviso").textContent = msg; $("aviso").classList.remove("oculto");
  clearTimeout(avisoTimer); avisoTimer = setTimeout(() => $("aviso").classList.add("oculto"), 2600);
}
async function copiar(txt) {
  try { await navigator.clipboard.writeText(txt); }
  catch (_) { const t = document.createElement("textarea"); t.value = txt; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); }
}

// ----------------------
// Login
// ----------------------
$("formLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("erroLogin").classList.add("oculto");
  try { await signInWithEmailAndPassword(auth, $("email").value.trim(), $("senha").value); }
  catch (_) { $("erroLogin").textContent = "E-mail ou senha inválidos."; $("erroLogin").classList.remove("oculto"); }
});
$("btnSair").addEventListener("click", () => signOut(auth));

let parar = [];
onAuthStateChanged(auth, (u) => {
  $("telaLogin").classList.toggle("oculto", !!u);
  $("telaPainel").classList.toggle("oculto", !u);
  parar.forEach((f) => f()); parar = [];
  if (u) iniciar();
});

// ----------------------
// Abas
// ----------------------
let abaAtual = "resumo";
$("abas").addEventListener("click", (e) => {
  const b = e.target.closest("[data-aba]"); if (!b) return;
  abaAtual = b.dataset.aba;
  document.querySelectorAll("[data-aba]").forEach((x) => x.classList.toggle("on", x === b));
  document.querySelectorAll("[data-tela]").forEach((s) => s.classList.toggle("oculto", s.dataset.tela !== abaAtual));
  render();
});

// ----------------------
// Dados
// ----------------------
let clientes = [], cobrancas = [], config = {}, siteDados = null;
const MSG_PADRAO = "Olá, {responsavel}! Tudo bem? 😊\n\nSegue a mensalidade da MsSoftware ({plano}) referente a *{mes}*:\n\n💰 Valor: *{valor}*\n📅 Vencimento: {vencimento}\n\n*PIX copia e cola:*\n{pix}\n\nÉ só copiar o código acima e colar no app do banco, em PIX > Copia e Cola. Qualquer dúvida, estou à disposição. Obrigado!";

function iniciar() {
  $("mesCobranca").value ||= mesAtual();
  parar.push(onSnapshot(collection(db, "clientes"), (s) => {
    clientes = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
    render();
  }, (e) => avisar("Sem acesso aos clientes: " + e.code)));
  parar.push(onSnapshot(collection(db, "cobrancas"), (s) => {
    cobrancas = s.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
  }, (e) => avisar("Sem acesso às cobranças: " + e.code)));
  parar.push(onSnapshot(doc(db, "config", "cobranca"), (s) => { config = s.exists() ? s.data() : {}; preencherConfig(); }));
  getDoc(doc(db, "site", "conteudo")).then((s) => {
    siteDados = completar(s.exists() && s.data().dados ? JSON.parse(s.data().dados) : PADRAO);
    if (abaAtual === "site") renderSite();
  });
}

function render() {
  if (abaAtual === "resumo") renderResumo();
  if (abaAtual === "clientes") renderClientes();
  if (abaAtual === "cobrancas") renderCobrancas();
  if (abaAtual === "site") renderSite();
}

// situação de uma cobrança
const situacao = (c) => (c.status === "pago" ? "pago" : c.vencimento < hoje() ? "atrasado" : "aberto");
const SELO = { pago: "✅ Pago", atrasado: "⚠️ Atrasado", aberto: "🕒 A vencer" };

// ----------------------
// Resumo
// ----------------------
function renderResumo() {
  const ativos = clientes.filter((c) => c.ativo !== false);
  const mes = mesAtual();
  const doMes = cobrancas.filter((c) => c.mes === mes);
  const recebido = doMes.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.valor || 0), 0);
  const aReceber = doMes.filter((c) => c.status !== "pago").reduce((s, c) => s + Number(c.valor || 0), 0);
  const atrasadas = cobrancas.filter((c) => situacao(c) === "atrasado").sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const prevista = ativos.reduce((s, c) => s + Number(c.valor || 0), 0);
  const faltaGerar = ativos.filter((c) => !cobrancas.some((x) => x.id === `${c.id}_${mes}`)).length;
  const card = (t, v, sub, cor = "") => `<div class="cartao p-5"><p class="text-xs font-bold uppercase tracking-wide text-slate-500">${t}</p><p class="text-2xl font-extrabold mt-1 ${cor}">${v}</p><p class="text-xs text-slate-500 mt-1">${sub}</p></div>`;
  $("resumo").innerHTML = `
    <h1 class="text-2xl font-extrabold mb-4">Resumo de ${nomeMes(mes)}</h1>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      ${card("Clientes ativos", ativos.length, `${clientes.length - ativos.length} inativo(s)`)}
      ${card("Mensalidades por mês", brl(prevista), "soma dos clientes ativos")}
      ${card("Recebido no mês", brl(recebido), `${doMes.filter((c) => c.status === "pago").length} pagamento(s)`, "text-green-700")}
      ${card("A receber no mês", brl(aReceber), faltaGerar ? `⚠️ ${faltaGerar} cobrança(s) ainda não gerada(s)` : `${doMes.filter((c) => c.status !== "pago").length} em aberto`, "text-amber-700")}
    </div>
    <div class="cartao p-5 mt-4">
      <h2 class="font-extrabold mb-3">⚠️ Atrasados ${atrasadas.length ? `(${atrasadas.length} · ${brl(atrasadas.reduce((s, c) => s + Number(c.valor || 0), 0))})` : ""}</h2>
      ${atrasadas.length ? atrasadas.map(linhaCobranca).join("") : '<p class="text-sm text-slate-500">Ninguém atrasado. 🎉</p>'}
    </div>
    ${faltaGerar ? `<div class="cartao p-5 mt-4 flex flex-wrap items-center justify-between gap-3"><p class="text-sm">Faltam gerar <b>${faltaGerar}</b> cobrança(s) de ${nomeMes(mes)}.</p><button class="btn btn-pri" data-gerar-mes="${mes}">Gerar agora</button></div>` : ""}`;
}

// ----------------------
// Clientes
// ----------------------
$("buscaCliente").addEventListener("input", renderClientes);
function renderClientes() {
  const q = $("buscaCliente").value.trim().toLowerCase();
  const lista = clientes.filter((c) => !q || `${c.nome} ${c.responsavel} ${c.plano}`.toLowerCase().includes(q));
  $("listaClientes").innerHTML = lista.length ? lista.map((c) => {
    const abertas = cobrancas.filter((x) => x.clienteId === c.id && x.status !== "pago");
    const atras = abertas.filter((x) => situacao(x) === "atrasado").length;
    return `<div class="cartao p-4 flex flex-wrap items-center gap-3">
      <div class="flex-1 min-w-[200px]">
        <p class="font-extrabold">${esc(c.nome)} ${c.ativo === false ? '<span class="selo inativo">Inativo</span>' : ""} ${atras ? `<span class="selo atrasado">${atras} atrasada(s)</span>` : ""}</p>
        <p class="text-sm text-slate-500">${esc(c.responsavel || "")}${c.responsavel ? " · " : ""}${esc(c.whatsapp || "")}</p>
        <p class="text-sm"><b>${brl(c.valor)}</b>/mês · ${esc(c.plano || "—")} · vence dia ${esc(c.diaVencimento)}</p>
        <p class="text-xs mt-1 space-x-3">${c.cardapio ? `<a class="text-blue-600" href="${esc(c.cardapio)}" target="_blank">Cardápio ↗</a>` : ""}${c.painel ? `<a class="text-blue-600" href="${esc(c.painel)}" target="_blank">Painel ↗</a>` : ""}</p>
      </div>
      <div class="flex gap-2">
        <a class="btn btn-sec" href="https://wa.me/${zapNumero(c.whatsapp)}" target="_blank">💬</a>
        <button class="btn btn-sec" data-editar-cliente="${c.id}">Editar</button>
      </div></div>`;
  }).join("") : '<p class="text-slate-500">Nenhum cliente cadastrado ainda. Clique em <b>+ Novo cliente</b>.</p>';
}

let clienteEditando = null;
function abrirCliente(c = null) {
  clienteEditando = c;
  $("tituloCliente").textContent = c ? `Editar: ${c.nome}` : "Novo cliente";
  const v = (id, x) => ($(id).value = x ?? "");
  v("cNome", c?.nome); v("cResp", c?.responsavel); v("cZap", c?.whatsapp); v("cPlano", c?.plano);
  v("cValor", c ? String(c.valor).replace(".", ",") : ""); v("cDia", c?.diaVencimento ?? 10);
  v("cInicio", c?.inicio); v("cCardapio", c?.cardapio); v("cPainel", c?.painel); v("cObs", c?.obs);
  $("cAtivo").checked = c ? c.ativo !== false : true;
  $("btnExcluirCliente").classList.toggle("oculto", !c);
  $("modalCliente").classList.remove("oculto");
}
$("btnNovoCliente").addEventListener("click", () => abrirCliente());
$("modalCliente").addEventListener("click", (e) => { if (e.target === $("modalCliente") || e.target.closest("[data-fechar]")) $("modalCliente").classList.add("oculto"); });
$("formCliente").addEventListener("submit", async (e) => {
  e.preventDefault();
  const dados = {
    nome: $("cNome").value.trim(), responsavel: $("cResp").value.trim(), whatsapp: $("cZap").value.trim(),
    plano: $("cPlano").value.trim(), valor: lerValor($("cValor").value),
    diaVencimento: Math.min(28, Math.max(1, Number($("cDia").value) || 10)),
    inicio: $("cInicio").value, ativo: $("cAtivo").checked,
    cardapio: $("cCardapio").value.trim(), painel: $("cPainel").value.trim(), obs: $("cObs").value.trim()
  };
  if (!dados.nome || !dados.valor) return avisar("Preencha o nome e a mensalidade.");
  if (soDigitos(dados.whatsapp).length < 10) return avisar("WhatsApp precisa ter DDD + número.");
  const id = clienteEditando?.id || dados.nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
  await setDoc(doc(db, "clientes", id), { ...dados, atualizadoEm: serverTimestamp() }, { merge: true });
  $("modalCliente").classList.add("oculto");
  avisar("Cliente salvo!");
});
$("btnExcluirCliente").addEventListener("click", async () => {
  if (!clienteEditando || !confirm(`Excluir ${clienteEditando.nome}? As cobranças já geradas continuam no histórico.`)) return;
  await deleteDoc(doc(db, "clientes", clienteEditando.id));
  $("modalCliente").classList.add("oculto");
  avisar("Cliente excluído.");
});
$("listaClientes").addEventListener("click", (e) => {
  const b = e.target.closest("[data-editar-cliente]");
  if (b) abrirCliente(clientes.find((c) => c.id === b.dataset.editarCliente));
});

// ----------------------
// Cobranças
// ----------------------
$("mesCobranca").addEventListener("change", renderCobrancas);
async function gerarMes(mes) {
  const ativos = clientes.filter((c) => c.ativo !== false);
  let n = 0;
  for (const c of ativos) {
    const id = `${c.id}_${mes}`; // um por cliente por mês: gerar de novo não duplica
    if (cobrancas.some((x) => x.id === id)) continue;
    await setDoc(doc(db, "cobrancas", id), {
      clienteId: c.id, cliente: c.nome, responsavel: c.responsavel || "", whatsapp: c.whatsapp, plano: c.plano || "",
      valor: Number(c.valor || 0), mes, vencimento: `${mes}-${String(c.diaVencimento || 10).padStart(2, "0")}`,
      status: "aberto", criadoEm: serverTimestamp()
    });
    n++;
  }
  avisar(n ? `${n} cobrança(s) gerada(s) para ${nomeMes(mes)}.` : "Todas as cobranças desse mês já existem.");
}
$("btnGerar").addEventListener("click", () => gerarMes($("mesCobranca").value || mesAtual()));

function linhaCobranca(c) {
  const st = situacao(c);
  return `<div class="cartao p-4 mb-2 flex flex-wrap items-center gap-3">
    <div class="flex-1 min-w-[200px]">
      <p class="font-extrabold">${esc(c.cliente)} <span class="selo ${st}">${SELO[st]}</span></p>
      <p class="text-sm text-slate-500">${nomeMes(c.mes)} · vence ${dataBR(c.vencimento)}${c.pagoEm ? ` · pago em ${dataBR(c.pagoEm)}` : ""}${c.enviadoEm ? " · cobrança enviada" : ""}</p>
    </div>
    <p class="text-lg font-extrabold w-28 text-right">${brl(c.valor)}</p>
    <div class="flex flex-wrap gap-2">
      ${st !== "pago" ? `<button class="btn btn-zap" data-cobrar="${c.id}">💬 Cobrar</button><button class="btn btn-sec" data-copiar-pix="${c.id}" title="Copiar PIX copia e cola">📋 PIX</button>
        <button class="btn btn-sec" data-pagar="${c.id}">✅ Pago</button>` : `<button class="btn btn-sec" data-desfazer="${c.id}">Desfazer</button>`}
      <button class="btn btn-perigo" data-apagar="${c.id}" title="Excluir cobrança">✕</button>
    </div></div>`;
}

function renderCobrancas() {
  const mes = $("mesCobranca").value || mesAtual();
  const doMes = cobrancas.filter((c) => c.mes === mes).sort((a, b) => a.vencimento.localeCompare(b.vencimento) || String(a.cliente).localeCompare(String(b.cliente)));
  const soma = (f) => doMes.filter(f).reduce((s, c) => s + Number(c.valor || 0), 0);
  const t = (r, v, cor) => `<div class="cartao p-4"><p class="text-xs font-bold uppercase text-slate-500">${r}</p><p class="text-xl font-extrabold ${cor}">${brl(v)}</p></div>`;
  $("totaisCobranca").innerHTML = t("Total do mês", soma(() => true), "") + t("Recebido", soma((c) => c.status === "pago"), "text-green-700")
    + t("A vencer", soma((c) => situacao(c) === "aberto"), "text-amber-700") + t("Atrasado", soma((c) => situacao(c) === "atrasado"), "text-red-700");
  $("listaCobrancas").innerHTML = doMes.length ? doMes.map(linhaCobranca).join("")
    : `<p class="text-slate-500">Nenhuma cobrança em ${nomeMes(mes)}. Clique em <b>Gerar cobranças do mês</b> para criar a de cada cliente ativo.</p>`;
}

function pixDe(c) {
  if (!config.chave || !config.nome || !config.cidade) return null;
  return gerarPix({ chave: config.chave, tipo: config.tipo, nome: config.nome, cidade: config.cidade, valor: c.valor,
    id: ("MS" + c.mes.replace("-", "") + soDigitos(c.clienteId) + String(c.cliente).replace(/[^A-Za-z]/g, "")).slice(0, 25) });
}
function mensagemDe(c, pix) {
  return (config.mensagem || MSG_PADRAO)
    .replaceAll("{responsavel}", c.responsavel || c.cliente).replaceAll("{cliente}", c.cliente)
    .replaceAll("{plano}", c.plano || "mensalidade").replaceAll("{mes}", nomeMes(c.mes))
    .replaceAll("{valor}", brl(c.valor)).replaceAll("{vencimento}", dataBR(c.vencimento)).replaceAll("{pix}", pix);
}

document.body.addEventListener("click", async (e) => {
  const g = e.target.closest("[data-gerar-mes]"); if (g) return gerarMes(g.dataset.gerarMes);
  const pegar = (attr) => { const b = e.target.closest(`[data-${attr}]`); return b ? cobrancas.find((c) => c.id === b.dataset[attr.replace(/-(\w)/g, (_, l) => l.toUpperCase())]) : null; };
  let c;
  if ((c = pegar("cobrar"))) {
    const pix = pixDe(c);
    if (!pix) { avisar("Cadastre sua chave PIX em ⚙️ PIX e mensagem."); return; }
    window.open(`https://wa.me/${zapNumero(c.whatsapp)}?text=${encodeURIComponent(mensagemDe(c, pix))}`, "_blank");
    updateDoc(doc(db, "cobrancas", c.id), { enviadoEm: serverTimestamp() });
  } else if ((c = pegar("copiar-pix"))) {
    const pix = pixDe(c);
    if (!pix) return avisar("Cadastre sua chave PIX em ⚙️ PIX e mensagem.");
    await copiar(pix); avisar("PIX copia e cola copiado!");
  } else if ((c = pegar("pagar"))) {
    await updateDoc(doc(db, "cobrancas", c.id), { status: "pago", pagoEm: hoje() }); avisar(`${c.cliente}: pago!`);
  } else if ((c = pegar("desfazer"))) {
    await updateDoc(doc(db, "cobrancas", c.id), { status: "aberto", pagoEm: null });
  } else if ((c = pegar("apagar"))) {
    if (confirm(`Excluir a cobrança de ${c.cliente} (${nomeMes(c.mes)})?`)) await deleteDoc(doc(db, "cobrancas", c.id));
  }
});

// ----------------------
// PIX e mensagem
// ----------------------
function preencherConfig() {
  $("cfgTipo").value = config.tipo || "celular";
  $("cfgChave").value = config.chave || ""; $("cfgNome").value = config.nome || ""; $("cfgCidade").value = config.cidade || "";
  $("cfgMensagem").value = config.mensagem || MSG_PADRAO;
}
$("formConfig").addEventListener("submit", async (e) => {
  e.preventDefault();
  await setDoc(doc(db, "config", "cobranca"), {
    tipo: $("cfgTipo").value, chave: $("cfgChave").value.trim(), nome: $("cfgNome").value.trim(),
    cidade: $("cfgCidade").value.trim(), mensagem: $("cfgMensagem").value
  });
  avisar("Configuração salva!");
});
$("btnTestarPix").addEventListener("click", async () => {
  const pix = gerarPix({ chave: $("cfgChave").value, tipo: $("cfgTipo").value, nome: $("cfgNome").value, cidade: $("cfgCidade").value, valor: 1, id: "TESTE" });
  $("pixTeste").value = pix; $("pixTeste").classList.remove("oculto");
  await copiar(pix); avisar("PIX de R$ 1,00 copiado: cole no app do banco para conferir o nome.");
});

// ----------------------
// Editor do site
// ----------------------
// nomes das seções (o mesmo nome pode ser campo dentro de outra seção, ex.: "chamada")
const SECOES = {
  contato: "Contato e WhatsApp", topo: "Topo da página", diferenciais: "Diferenciais (3 cartões)", servicos: "Serviços",
  projetos: "Projetos no ar", planos: "Planos e preços", passos: "Como trabalhamos", clientes: "Clientes (logos)",
  perguntas: "Perguntas frequentes", chamada: "Chamada final", rodape: "Rodapé"
};
const ROTULOS = {
  diferenciais: "Cartões",
  whatsapp: "WhatsApp (com DDD)", mensagem: "Mensagem inicial do WhatsApp", whatsappTexto: "WhatsApp como aparece no rodapé", email: "E-mail", instagram: "Instagram (@)",
  chip: "Faixa pequena", titulo: "Título", destaque: "Título em destaque (azul)", subtitulo: "Subtítulo", botao: "Botão", botao2: "Segundo botão",
  etiqueta: "Etiqueta (acima do título)", itens: "Itens", icone: "Ícone (emoji)", texto: "Texto", nome: "Nome", link: "Link", imagem: "Imagem",
  chamada: "Texto do link", preco: "Preço", periodo: "Período", mostrar: "Mostrar esta seção no site", logos: "Logos", inteira: "Mostrar logo inteira (sem cortar)",
  pergunta: "Pergunta", resposta: "Resposta"
};
const rot = (k) => ROTULOS[k] || k;
const LONGO = new Set(["texto", "subtitulo", "resposta", "mensagem"]);
const pegarCaminho = (o, p) => p.split(".").reduce((x, k) => x?.[k], o);
function porCaminho(o, p, v) { const ks = p.split("."); const ult = ks.pop(); const alvo = ks.reduce((x, k) => x[k], o); alvo[ult] = v; }
// modelo de item novo de cada lista (copiado do conteúdo de fábrica)
function modeloItem(caminho) {
  const base = pegarCaminho(PADRAO, caminho.replace(/\.\d+(?=\.|$)/g, ".0"));
  const ex = Array.isArray(base) && base[0];
  if (typeof ex === "string") return "";
  const novo = {}; for (const [k, v] of Object.entries(ex || {})) novo[k] = typeof v === "boolean" ? false : Array.isArray(v) ? [] : "";
  return novo;
}

function campoHTML(chave, valor, caminho) {
  if (typeof valor === "boolean") return `<label class="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" data-caminho="${caminho}" ${valor ? "checked" : ""} class="w-5 h-5"> ${rot(chave)}</label>`;
  if (Array.isArray(valor)) {
    if (typeof modeloItem(caminho) === "string") // lista de textos: um por linha
      return `<div><label class="rot">${rot(chave)} (um por linha)</label><textarea class="campo" rows="4" data-caminho="${caminho}" data-linhas>${esc(valor.join("\n"))}</textarea></div>`;
    return `<div><p class="rot">${rot(chave)}</p><div class="space-y-2">
      ${valor.map((it, i) => `<div class="border border-slate-200 rounded-2xl p-3 bg-slate-50">
        <div class="flex justify-between items-center mb-2"><p class="text-xs font-bold text-slate-500">#${i + 1}</p>
          <div class="flex gap-1"><button type="button" class="btn btn-sec !px-2 !py-1" data-mover="${caminho}|${i}|-1">↑</button><button type="button" class="btn btn-sec !px-2 !py-1" data-mover="${caminho}|${i}|1">↓</button><button type="button" class="btn btn-perigo !px-2 !py-1" data-remover="${caminho}|${i}">✕</button></div></div>
        <div class="grid sm:grid-cols-2 gap-2">${Object.entries(it).map(([k, v]) => `<div class="${LONGO.has(k) || Array.isArray(v) ? "sm:col-span-2" : ""}">${campoHTML(k, v, `${caminho}.${i}.${k}`)}</div>`).join("")}</div>
      </div>`).join("")}
      <button type="button" class="btn btn-sec" data-adicionar="${caminho}">+ Adicionar</button></div></div>`;
  }
  if (valor && typeof valor === "object") return Object.entries(valor).map(([k, v]) => campoHTML(k, v, `${caminho}.${k}`)).join("");
  if (chave === "imagem") return `<div><label class="rot">${rot(chave)}</label>
    <div class="flex gap-2 items-center">${valor ? `<img src="${esc(valor)}" class="w-12 h-12 rounded-lg object-cover border" alt="">` : ""}
      <input class="campo" data-caminho="${caminho}" value="${esc(String(valor).startsWith("data:") ? "" : valor)}" placeholder="${String(valor).startsWith("data:") ? "Imagem enviada do aparelho" : "assets/… ou https://…"}">
      <label class="btn btn-sec cursor-pointer whitespace-nowrap">📷<input type="file" accept="image/*" class="hidden" data-foto="${caminho}"></label></div></div>`;
  return LONGO.has(chave)
    ? `<div><label class="rot">${rot(chave)}</label><textarea class="campo" rows="3" data-caminho="${caminho}">${esc(valor)}</textarea></div>`
    : `<div><label class="rot">${rot(chave)}</label><input class="campo" data-caminho="${caminho}" value="${esc(valor)}"></div>`;
}

const abertos = new Set(["contato"]);
function renderSite() {
  if (!siteDados) { $("editorSite").innerHTML = '<p class="text-slate-500">Carregando…</p>'; return; }
  $("editorSite").innerHTML = Object.entries(siteDados).map(([k, v]) => `
    <details class="bloco-site cartao" data-secao="${k}" ${abertos.has(k) ? "open" : ""}>
      <summary class="p-4 font-extrabold flex justify-between"><span>${SECOES[k] || k}</span><span class="seta">›</span></summary>
      <div class="px-4 pb-4 space-y-3">${Array.isArray(v) ? campoHTML(k, v, k) : Object.entries(v).map(([c, x]) => campoHTML(c, x, `${k}.${c}`)).join("")}</div>
    </details>`).join("");
}
$("editorSite").addEventListener("toggle", (e) => { const d = e.target.closest("[data-secao]"); if (d) d.open ? abertos.add(d.dataset.secao) : abertos.delete(d.dataset.secao); }, true);
$("editorSite").addEventListener("input", (e) => {
  const c = e.target.dataset.caminho; if (!c) return;
  const v = e.target.type === "checkbox" ? e.target.checked : "linhas" in e.target.dataset ? e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) : e.target.value;
  porCaminho(siteDados, c, v);
});
$("editorSite").addEventListener("click", (e) => {
  const a = e.target.closest("[data-adicionar]"), r = e.target.closest("[data-remover]"), m = e.target.closest("[data-mover]");
  if (a) { pegarCaminho(siteDados, a.dataset.adicionar).push(modeloItem(a.dataset.adicionar)); renderSite(); }
  if (r) { const [c, i] = r.dataset.remover.split("|"); if (confirm("Remover este item?")) { pegarCaminho(siteDados, c).splice(Number(i), 1); renderSite(); } }
  if (m) { const [c, i, d] = m.dataset.mover.split("|"); const l = pegarCaminho(siteDados, c), a2 = Number(i), b = a2 + Number(d); if (b >= 0 && b < l.length) { [l[a2], l[b]] = [l[b], l[a2]]; renderSite(); } }
});
$("editorSite").addEventListener("change", async (e) => {
  const c = e.target.dataset.foto; if (!c || !e.target.files[0]) return;
  try { porCaminho(siteDados, c, await reduzirFoto(e.target.files[0])); renderSite(); }
  catch (_) { avisar("Não consegui abrir essa imagem."); }
});
// imagem enviada do aparelho: reduzida (até 500 px) e guardada junto com o conteúdo do site
function reduzirFoto(arquivo) {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => {
      const esc2 = Math.min(1, 500 / Math.max(img.width, img.height));
      const cv = document.createElement("canvas"); cv.width = Math.round(img.width * esc2); cv.height = Math.round(img.height * esc2);
      const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(img.src); ok(cv.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = erro; img.src = URL.createObjectURL(arquivo);
  });
}
$("btnSalvarSite").addEventListener("click", async () => {
  const dados = JSON.stringify(siteDados);
  if (dados.length > 900000) return avisar("Conteúdo grande demais (muitas imagens enviadas). Use imagens da pasta assets.");
  $("btnSalvarSite").disabled = true;
  try { await setDoc(doc(db, "site", "conteudo"), { dados, atualizadoEm: serverTimestamp() }); avisar("Site publicado! ✅"); }
  catch (e) { avisar("Erro ao publicar: " + e.code); }
  finally { $("btnSalvarSite").disabled = false; }
});
