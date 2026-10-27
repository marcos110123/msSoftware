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

// Clientes que já estavam no site (botão "Importar meus clientes"; valores ficam para preencher)
const SITE = "https://mssoftware.com.br/";
const PAINEIS = "https://mssoftwarepaineisadm.netlify.app/";
const CLIENTES_INICIAIS = [
  { id: "labrasa", nome: "La Brasa Steakhouse", logo: "assets/cli-labrasa-logo.jpg", imagemProjeto: "assets/cli-labrasa-card.jpg", textoSite: "Cardápio delivery, tablets nas mesas e painel de pedidos", cardapio: "https://labrasa.site", painel: PAINEIS + "labrasa", site: true, projeto: true },
  { id: "esfirras", nome: "Esfirras em Casa", logo: "assets/cli-esfirras.jpg", textoSite: "Cardápio delivery com pedidos no WhatsApp e painel de pedidos", cardapio: SITE + "EsfirrasEmCasa/", painel: PAINEIS + "esfirras", site: true, projeto: true },
  { id: "fiorella", nome: "Pizzaria Fiorella", logo: "assets/cli-fiorella.jpg", textoSite: "Cardápio delivery, montagem de pizza e painel com nota fiscal", cardapio: SITE + "PizzariaFiorella/", painel: PAINEIS + "fiorella", site: true, projeto: true },
  { id: "gatini", nome: "Gatini", logo: "assets/cli-gatini.png", inteira: true, textoSite: "Cardápio digital com pedidos online", cardapio: SITE + "Gatini/", painel: PAINEIS + "gatini", site: true, projeto: true },
  { id: "nossoacai", nome: "Nosso Açaí", logo: "assets/cli-nossoacai.jpg", textoSite: "Cardápio para montar o açaí e painel de pedidos", cardapio: SITE + "NossoAcai/", obs: "Painel roda no computador da loja (bat, Windows 7).", site: true, projeto: true },
  { id: "reidoacai", nome: "Rei do Açaí", logo: "assets/cli-acai.jpg", cardapio: SITE + "ReidoAcai/", site: true },
  { id: "resulthair", nome: "Result Hair", logo: "assets/cli-resulthair.jpg", inteira: true, site: true },
  { id: "pousada3deabril", nome: "Pousada 3 de Abril", logo: "assets/cli-pousada.jpg", site: true },
  { id: "joyce", nome: "Joyce Maurieli Ateliê das Unhas", logo: "assets/cli-joyce.jpg", site: true },
  { id: "binus", nome: "Flutuante Binu's", logo: "assets/cli-binus.jpg", site: true },
  { id: "acaijm", nome: "Açaí JM", responsavel: "Izabela", cardapio: SITE + "AcaiJM/", painel: PAINEIS + "acaijm", obs: "Cliente DISCRETO: não divulgar no site nem no Instagram.", site: false }
];

// ----------------------
// Utilitários
// ----------------------
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const brl = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const lerValor = (v) => { const s = String(v ?? "").replace(/[R$\s]/g, ""); if (!s) return 0; const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; };
const hoje = () => new Date().toLocaleDateString("sv-SE"); // AAAA-MM-DD no fuso do aparelho
const mesAtual = () => hoje().slice(0, 7);
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const nomeMes = (m) => { const [a, n] = m.split("-"); return `${MESES[Number(n) - 1]}/${a}`; };
const dataBR = (d) => (d ? d.split("-").reverse().join("/") : "");
const soDigitos = (s) => String(s || "").replace(/\D/g, "");
const zapNumero = (s) => { const n = soDigitos(s); return n.length <= 11 ? "55" + n : n; };
// imagem do site (assets/…) vista de dentro de /adm
const imgUrl = (s) => (!s ? "" : /^(https?:|data:)/.test(s) ? s : "../" + s);
const iniciais = (n) => String(n || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
let avisoTimer;
function avisar(msg) {
  $("aviso").textContent = msg; $("aviso").classList.remove("oculto");
  clearTimeout(avisoTimer); avisoTimer = setTimeout(() => $("aviso").classList.add("oculto"), 2800);
}
async function copiar(txt) {
  try { await navigator.clipboard.writeText(txt); }
  catch (_) { const t = document.createElement("textarea"); t.value = txt; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); }
}
// imagem enviada do aparelho: reduzida (até 500 px) e guardada como texto (data URL)
function reduzirFoto(arquivo) {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => {
      const f = Math.min(1, 500 / Math.max(img.width, img.height));
      const cv = document.createElement("canvas"); cv.width = Math.round(img.width * f); cv.height = Math.round(img.height * f);
      const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(img.src); ok(cv.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = erro; img.src = URL.createObjectURL(arquivo);
  });
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
$("btnSair2").addEventListener("click", () => signOut(auth));

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
function irPara(aba) {
  abaAtual = aba;
  document.querySelectorAll("[data-aba]").forEach((x) => x.classList.toggle("on", x.dataset.aba === aba));
  document.querySelectorAll("[data-tela]").forEach((s) => s.classList.toggle("oculto", s.dataset.tela !== aba));
  window.scrollTo(0, 0);
  render();
}
$("abas").addEventListener("click", (e) => { const b = e.target.closest("[data-aba]"); if (b) irPara(b.dataset.aba); });

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
const SELO = { pago: "✓ Pago", atrasado: "⚠ Atrasado", aberto: "● A vencer" };

// ----------------------
// Vitrine do site: os clientes marcados aparecem na faixa de logos e em "Projetos no ar"
// ----------------------
const ordemSite = (a, b) => (Number(a.ordemSite) || 999) - (Number(b.ordemSite) || 999) || String(a.nome).localeCompare(String(b.nome), "pt-BR");
async function sincronizarVitrine() {
  if (!siteDados) {
    const s = await getDoc(doc(db, "site", "conteudo"));
    siteDados = completar(s.exists() && s.data().dados ? JSON.parse(s.data().dados) : PADRAO);
  }
  const vis = [...clientes].sort(ordemSite);
  siteDados.clientes.logos = vis.filter((c) => c.site && c.logo).map((c) => ({ nome: c.nome, imagem: c.logo, inteira: !!c.inteira }));
  siteDados.projetos.itens = vis.filter((c) => c.projeto).map((c) => ({
    nome: c.nome, texto: c.textoSite || "", link: c.cardapio || "#", imagem: c.imagemProjeto || c.logo || ""
  }));
  await setDoc(doc(db, "site", "conteudo"), { dados: JSON.stringify(siteDados), atualizadoEm: serverTimestamp() });
}

async function importarClientes() {
  const existentes = new Set(clientes.map((c) => c.id));
  const novos = CLIENTES_INICIAIS.filter((c) => !existentes.has(c.id));
  if (!novos.length) return avisar("Todos os clientes do site já estão cadastrados.");
  for (const c of novos) {
    await setDoc(doc(db, "clientes", c.id), {
      responsavel: "", whatsapp: "", plano: "", valor: 0, diaVencimento: 10, ativo: true, inicio: "",
      cardapio: "", painel: "", obs: "", logo: "", inteira: false, site: false, projeto: false, textoSite: "", imagemProjeto: "",
      ordemSite: CLIENTES_INICIAIS.indexOf(c) + 1, ...c, criadoEm: serverTimestamp()
    });
  }
  avisar(`${novos.length} cliente(s) importado(s). Agora é só preencher os valores.`);
}

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
  const semValor = ativos.filter((c) => !(Number(c.valor) > 0)).length;
  const faltaGerar = ativos.filter((c) => Number(c.valor) > 0 && !cobrancas.some((x) => x.id === `${c.id}_${mes}`)).length;
  const stat = (r, v, s, cor) => `<div class="stat" style="background:${cor}"><p class="r">${r}</p><p class="v">${v}</p><p class="s">${s}</p></div>`;
  $("resumo").innerHTML = `
    <h1 class="titulo-tela">Olá! 👋</h1>
    <p class="sub-tela mb-6">Resumo de ${nomeMes(mes)}</p>
    ${!clientes.length ? `
      <div class="cartao p-8 text-center mb-6">
        <p class="text-4xl mb-2">👥</p><p class="font-extrabold text-lg">Nenhum cliente cadastrado ainda</p>
        <p class="sub-tela mb-4">Traga para cá os clientes que já estão no site. Depois é só preencher os valores.</p>
        <button class="btn btn-pri" data-importar>Importar meus clientes</button>
      </div>` : ""}
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      ${stat("Clientes ativos", ativos.length, `${clientes.length - ativos.length} inativo(s)`, "linear-gradient(135deg,#2563eb,#1e3a8a)")}
      ${stat("Mensalidades / mês", brl(prevista), semValor ? `${semValor} sem valor definido` : "soma dos ativos", "linear-gradient(135deg,#7c3aed,#4c1d95)")}
      ${stat("Recebido no mês", brl(recebido), `${doMes.filter((c) => c.status === "pago").length} pagamento(s)`, "linear-gradient(135deg,#16a34a,#14532d)")}
      ${stat("A receber no mês", brl(aReceber), `${doMes.filter((c) => c.status !== "pago").length} em aberto`, "linear-gradient(135deg,#f59e0b,#b45309)")}
    </div>
    ${faltaGerar ? `<div class="cartao p-5 mt-5 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm">🧾 Faltam gerar <b>${faltaGerar}</b> cobrança(s) de ${nomeMes(mes)}.</p><button class="btn btn-pri" data-gerar-mes="${mes}">Gerar agora</button></div>` : ""}
    ${semValor && clientes.length ? `<div class="cartao p-5 mt-5 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm">✏️ <b>${semValor}</b> cliente(s) ativo(s) ainda sem valor de mensalidade.</p><button class="btn btn-sec" data-ir="clientes">Preencher</button></div>` : ""}
    <div class="cartao p-5 mt-5">
      <h2 class="font-extrabold mb-3">Atrasados ${atrasadas.length ? `<span class="selo atrasado ml-1">${atrasadas.length} · ${brl(atrasadas.reduce((s, c) => s + Number(c.valor || 0), 0))}</span>` : ""}</h2>
      ${atrasadas.length ? `<div class="space-y-2">${atrasadas.map(linhaCobranca).join("")}</div>` : '<p class="text-sm text-slate-500">Ninguém atrasado. 🎉</p>'}
    </div>`;
}

// ----------------------
// Clientes
// ----------------------
$("buscaCliente").addEventListener("input", renderClientes);
const avatar = (c) => (c.logo ? `<img src="${esc(imgUrl(c.logo))}" alt="" class="avatar ${c.inteira ? "inteira" : ""}">` : `<div class="avatar-vazio">${esc(iniciais(c.nome))}</div>`);
function renderClientes() {
  const q = $("buscaCliente").value.trim().toLowerCase();
  const lista = clientes.filter((c) => !q || `${c.nome} ${c.responsavel} ${c.plano}`.toLowerCase().includes(q));
  const ativos = clientes.filter((c) => c.ativo !== false).length;
  $("contaClientes").textContent = clientes.length ? `${clientes.length} cliente(s) · ${ativos} ativo(s) · ${clientes.filter((c) => c.site).length} aparecendo no site` : "";
  if (!clientes.length) {
    $("listaClientes").innerHTML = `<div class="cartao p-8 text-center md:col-span-2"><p class="text-4xl mb-2">👥</p>
      <p class="font-extrabold text-lg">Nenhum cliente ainda</p><p class="sub-tela mb-4">Importe os clientes que já estão no site ou cadastre um novo.</p>
      <button class="btn btn-pri" data-importar>Importar meus clientes</button></div>`;
    return;
  }
  $("listaClientes").innerHTML = lista.map((c) => {
    const atras = cobrancas.filter((x) => x.clienteId === c.id && situacao(x) === "atrasado").length;
    const temValor = Number(c.valor) > 0;
    return `<div class="cartao p-5 flex flex-col gap-4 ${c.ativo === false ? "opacity-70" : ""}">
      <div class="flex gap-4">
        ${avatar(c)}
        <div class="flex-1 min-w-0">
          <p class="font-extrabold text-[15px] leading-tight">${esc(c.nome)}</p>
          <p class="text-sm text-slate-500 truncate">${esc(c.responsavel || "Sem responsável")}${c.whatsapp ? ` · ${esc(c.whatsapp)}` : ""}</p>
          <div class="flex flex-wrap gap-1.5 mt-2">
            ${c.ativo === false ? '<span class="selo inativo">Inativo</span>' : ""}
            ${c.site ? '<span class="selo site">🌐 No site</span>' : ""}
            ${c.projeto ? '<span class="selo site">⭐ Projetos</span>' : ""}
            ${temValor ? "" : '<span class="selo semvalor">Sem valor</span>'}
            ${atras ? `<span class="selo atrasado">${atras} atrasada(s)</span>` : ""}
          </div>
        </div>
      </div>
      <div class="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <p class="text-sm">${temValor ? `<b class="text-base">${brl(c.valor)}</b><span class="text-slate-500">/mês · dia ${esc(c.diaVencimento || 10)}</span>` : '<span class="text-slate-400">Mensalidade não definida</span>'}${c.plano ? `<br><span class="text-xs text-slate-500">${esc(c.plano)}</span>` : ""}</p>
        <div class="flex items-center gap-2">
          <label class="chave" title="Aparece na faixa de clientes do site"><input type="checkbox" data-vis-site="${c.id}" ${c.site ? "checked" : ""}><span class="trilho"></span></label>
          ${c.whatsapp ? `<a class="btn btn-sec btn-ic" href="https://wa.me/${zapNumero(c.whatsapp)}" target="_blank" title="WhatsApp">💬</a>` : ""}
          <button class="btn btn-sec" data-editar-cliente="${c.id}">Editar</button>
        </div>
      </div>
    </div>`;
  }).join("");
}

let clienteEditando = null, logoNova = "";
function previaLogo() {
  const v = logoNova || $("cLogo").value.trim();
  $("cLogoPrevia").innerHTML = avatar({ logo: v, inteira: $("cInteira").checked, nome: $("cNome").value });
}
function abrirCliente(c = null) {
  clienteEditando = c; logoNova = "";
  $("tituloCliente").textContent = c ? c.nome : "Novo cliente";
  const v = (id, x) => ($(id).value = x ?? "");
  v("cNome", c?.nome); v("cResp", c?.responsavel); v("cZap", c?.whatsapp); v("cPlano", c?.plano);
  v("cValor", c && Number(c.valor) > 0 ? String(c.valor).replace(".", ",") : ""); v("cDia", c?.diaVencimento || "");
  v("cInicio", c?.inicio); v("cCardapio", c?.cardapio); v("cPainel", c?.painel); v("cObs", c?.obs);
  const logo = c?.logo || "";
  if (logo.startsWith("data:")) { logoNova = logo; v("cLogo", ""); } else v("cLogo", logo);
  v("cTextoSite", c?.textoSite); v("cImagemProjeto", c?.imagemProjeto); v("cOrdem", c?.ordemSite || "");
  $("cAtivo").checked = c ? c.ativo !== false : true;
  $("cSite").checked = !!c?.site; $("cProjeto").checked = !!c?.projeto; $("cInteira").checked = !!c?.inteira;
  $("btnExcluirCliente").classList.toggle("oculto", !c);
  previaLogo();
  $("modalCliente").classList.remove("oculto");
}
["cLogo", "cNome"].forEach((id) => $(id).addEventListener("input", () => { if (id === "cLogo") logoNova = ""; previaLogo(); }));
$("cInteira").addEventListener("change", previaLogo);
$("cLogoArquivo").addEventListener("change", async () => {
  const f = $("cLogoArquivo").files[0]; if (!f) return;
  try { logoNova = await reduzirFoto(f); $("cLogo").value = ""; previaLogo(); }
  catch (_) { avisar("Não consegui abrir essa imagem."); }
  $("cLogoArquivo").value = "";
});
$("btnNovoCliente").addEventListener("click", () => abrirCliente());
$("modalCliente").addEventListener("click", (e) => { if (e.target === $("modalCliente") || e.target.closest("[data-fechar]")) $("modalCliente").classList.add("oculto"); });
$("formCliente").addEventListener("submit", async (e) => {
  e.preventDefault();
  const dados = {
    nome: $("cNome").value.trim(), responsavel: $("cResp").value.trim(), whatsapp: $("cZap").value.trim(),
    plano: $("cPlano").value.trim(), valor: lerValor($("cValor").value),
    diaVencimento: Math.min(28, Math.max(1, Number($("cDia").value) || 10)),
    inicio: $("cInicio").value, ativo: $("cAtivo").checked,
    cardapio: $("cCardapio").value.trim(), painel: $("cPainel").value.trim(), obs: $("cObs").value.trim(),
    logo: logoNova || $("cLogo").value.trim(), inteira: $("cInteira").checked, site: $("cSite").checked, projeto: $("cProjeto").checked,
    textoSite: $("cTextoSite").value.trim(), imagemProjeto: $("cImagemProjeto").value.trim(), ordemSite: Number($("cOrdem").value) || 0
  };
  if (!dados.nome) return avisar("Preencha o nome do cliente.");
  if (dados.whatsapp && soDigitos(dados.whatsapp).length < 10) return avisar("WhatsApp precisa ter DDD + número.");
  if (dados.site && !dados.logo) return avisar("Para aparecer na faixa do site, coloque a logo.");
  const id = clienteEditando?.id || dados.nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
  const mexeuSite = !clienteEditando || ["site", "projeto", "logo", "inteira", "nome", "textoSite", "imagemProjeto", "cardapio", "ordemSite"].some((k) => (clienteEditando[k] ?? "") !== (dados[k] ?? ""));
  await setDoc(doc(db, "clientes", id), { ...dados, atualizadoEm: serverTimestamp() }, { merge: true });
  $("modalCliente").classList.add("oculto");
  if (mexeuSite) { const i = clientes.findIndex((c) => c.id === id); if (i >= 0) clientes[i] = { ...clientes[i], ...dados }; else clientes.push({ id, ...dados }); await sincronizarVitrine(); }
  avisar(mexeuSite ? "Cliente salvo e site atualizado!" : "Cliente salvo!");
});
$("btnExcluirCliente").addEventListener("click", async () => {
  if (!clienteEditando || !confirm(`Excluir ${clienteEditando.nome}? As cobranças já geradas continuam no histórico.`)) return;
  await deleteDoc(doc(db, "clientes", clienteEditando.id));
  clientes = clientes.filter((c) => c.id !== clienteEditando.id);
  $("modalCliente").classList.add("oculto");
  await sincronizarVitrine();
  avisar("Cliente excluído.");
});
$("listaClientes").addEventListener("click", (e) => {
  const b = e.target.closest("[data-editar-cliente]");
  if (b) abrirCliente(clientes.find((c) => c.id === b.dataset.editarCliente));
});
$("listaClientes").addEventListener("change", async (e) => {
  const id = e.target.dataset.visSite; if (!id) return;
  const c = clientes.find((x) => x.id === id);
  if (e.target.checked && !c.logo) { e.target.checked = false; avisar("Coloque a logo do cliente (Editar) antes de mostrar no site."); return; }
  c.site = e.target.checked;
  await updateDoc(doc(db, "clientes", id), { site: c.site });
  await sincronizarVitrine();
  avisar(c.site ? `${c.nome} aparece no site.` : `${c.nome} saiu do site.`);
});

// ----------------------
// Cobranças
// ----------------------
$("mesCobranca").addEventListener("change", renderCobrancas);
async function gerarMes(mes) {
  const ativos = clientes.filter((c) => c.ativo !== false);
  const semValor = ativos.filter((c) => !(Number(c.valor) > 0));
  let n = 0;
  for (const c of ativos.filter((x) => Number(x.valor) > 0)) {
    const id = `${c.id}_${mes}`; // um por cliente por mês: gerar de novo não duplica
    if (cobrancas.some((x) => x.id === id)) continue;
    await setDoc(doc(db, "cobrancas", id), {
      clienteId: c.id, cliente: c.nome, responsavel: c.responsavel || "", whatsapp: c.whatsapp || "", plano: c.plano || "",
      valor: Number(c.valor || 0), mes, vencimento: `${mes}-${String(c.diaVencimento || 10).padStart(2, "0")}`,
      status: "aberto", criadoEm: serverTimestamp()
    });
    n++;
  }
  avisar((n ? `${n} cobrança(s) gerada(s) para ${nomeMes(mes)}.` : "Nenhuma cobrança nova para gerar.")
    + (semValor.length ? ` ${semValor.length} cliente(s) sem valor ficaram de fora.` : ""));
}
$("btnGerar").addEventListener("click", () => gerarMes($("mesCobranca").value || mesAtual()));

function linhaCobranca(c) {
  const st = situacao(c);
  const cli = clientes.find((x) => x.id === c.clienteId) || { nome: c.cliente };
  return `<div class="cartao p-4 flex flex-wrap items-center gap-4">
    <div class="flex items-center gap-3 flex-1 min-w-[220px]">
      ${avatar(cli).replace("avatar ", "avatar !w-11 !h-11 ").replace("avatar-vazio", "avatar-vazio !w-11 !h-11 !text-base")}
      <div class="min-w-0"><p class="font-bold leading-tight">${esc(c.cliente)} <span class="selo ${st} ml-1">${SELO[st]}</span></p>
        <p class="text-xs text-slate-500 mt-0.5">${nomeMes(c.mes)} · vence ${dataBR(c.vencimento)}${c.pagoEm ? ` · pago em ${dataBR(c.pagoEm)}` : ""}${c.enviadoEm ? " · cobrança enviada" : ""}</p></div>
    </div>
    <p class="text-lg font-extrabold">${brl(c.valor)}</p>
    <div class="flex flex-wrap gap-2">
      ${st !== "pago" ? `<button class="btn btn-zap" data-cobrar="${c.id}">💬 Cobrar</button><button class="btn btn-sec btn-ic" data-copiar-pix="${c.id}" title="Copiar PIX copia e cola">📋</button>
        <button class="btn btn-sec" data-pagar="${c.id}">✓ Pago</button>` : `<button class="btn btn-sec" data-desfazer="${c.id}">Desfazer</button>`}
      <button class="btn btn-perigo btn-ic" data-apagar="${c.id}" title="Excluir cobrança">✕</button>
    </div></div>`;
}

function renderCobrancas() {
  const mes = $("mesCobranca").value || mesAtual();
  const doMes = cobrancas.filter((c) => c.mes === mes).sort((a, b) => a.vencimento.localeCompare(b.vencimento) || String(a.cliente).localeCompare(String(b.cliente)));
  const soma = (f) => doMes.filter(f).reduce((s, c) => s + Number(c.valor || 0), 0);
  const t = (r, v, cor) => `<div class="cartao p-4"><p class="text-xs font-bold uppercase tracking-wide text-slate-500">${r}</p><p class="text-xl font-extrabold mt-1" style="color:${cor}">${brl(v)}</p></div>`;
  $("totaisCobranca").innerHTML = t("Total do mês", soma(() => true), "#0f172a") + t("Recebido", soma((c) => c.status === "pago"), "#15803d")
    + t("A vencer", soma((c) => situacao(c) === "aberto"), "#b45309") + t("Atrasado", soma((c) => situacao(c) === "atrasado"), "#b91c1c");
  $("listaCobrancas").innerHTML = doMes.length ? doMes.map(linhaCobranca).join("")
    : `<div class="cartao p-8 text-center"><p class="text-4xl mb-2">🧾</p><p class="font-extrabold">Nenhuma cobrança em ${nomeMes(mes)}</p>
       <p class="sub-tela">Clique em <b>Gerar cobranças do mês</b> para criar a de cada cliente ativo com valor definido.</p></div>`;
}

function pixDe(c) {
  if (!config.chave || !config.nome || !config.cidade) return null;
  return gerarPix({ chave: config.chave, tipo: config.tipo, nome: config.nome, cidade: config.cidade, valor: c.valor,
    id: ("MS" + c.mes.replace("-", "") + String(c.clienteId).replace(/[^A-Za-z0-9]/g, "")).slice(0, 25) });
}
function mensagemDe(c, pix) {
  return (config.mensagem || MSG_PADRAO)
    .replaceAll("{responsavel}", c.responsavel || c.cliente).replaceAll("{cliente}", c.cliente)
    .replaceAll("{plano}", c.plano || "mensalidade").replaceAll("{mes}", nomeMes(c.mes))
    .replaceAll("{valor}", brl(c.valor)).replaceAll("{vencimento}", dataBR(c.vencimento)).replaceAll("{pix}", pix);
}

document.body.addEventListener("click", async (e) => {
  if (e.target.closest("[data-importar]")) return importarClientes();
  const ir = e.target.closest("[data-ir]"); if (ir) return irPara(ir.dataset.ir);
  const g = e.target.closest("[data-gerar-mes]"); if (g) return gerarMes(g.dataset.gerarMes);
  const pegar = (attr) => { const b = e.target.closest(`[data-${attr}]`); return b ? cobrancas.find((c) => c.id === b.dataset[attr.replace(/-(\w)/g, (_, l) => l.toUpperCase())]) : null; };
  let c;
  if ((c = pegar("cobrar"))) {
    const pix = pixDe(c);
    if (!pix) { avisar("Cadastre sua chave PIX em ⚙️ PIX e mensagem."); return; }
    const cli = clientes.find((x) => x.id === c.clienteId);
    const zap = cli?.whatsapp || c.whatsapp;
    if (!zap) { avisar("Cadastre o WhatsApp do responsável no cliente."); return; }
    window.open(`https://wa.me/${zapNumero(zap)}?text=${encodeURIComponent(mensagemDe({ ...c, responsavel: cli?.responsavel || c.responsavel }, pix))}`, "_blank");
    updateDoc(doc(db, "cobrancas", c.id), { enviadoEm: serverTimestamp() });
  } else if ((c = pegar("copiar-pix"))) {
    const pix = pixDe(c);
    if (!pix) return avisar("Cadastre sua chave PIX em ⚙️ PIX e mensagem.");
    await copiar(pix); avisar("PIX copia e cola copiado!");
  } else if ((c = pegar("pagar"))) {
    await updateDoc(doc(db, "cobrancas", c.id), { status: "pago", pagoEm: hoje() }); avisar(`${c.cliente}: pago! ✓`);
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
  contato: ["📞", "Contato e WhatsApp"], topo: ["🏠", "Topo da página"], diferenciais: ["✨", "Diferenciais (3 cartões)"], servicos: ["🧰", "Serviços"],
  projetos: ["⭐", "Projetos no ar"], planos: ["💳", "Planos e preços"], passos: ["🪜", "Como trabalhamos"], clientes: ["🤝", "Clientes (faixa de logos)"],
  perguntas: ["❓", "Perguntas frequentes"], chamada: ["📣", "Chamada final"], rodape: ["⬇️", "Rodapé"]
};
// listas que vêm da aba Clientes (não se edita aqui)
const DA_ABA_CLIENTES = new Set(["projetos.itens", "clientes.logos"]);
const ROTULOS = {
  diferenciais: "Cartões",
  whatsapp: "WhatsApp (com DDD)", mensagem: "Mensagem inicial do WhatsApp", whatsappTexto: "WhatsApp como aparece no rodapé", email: "E-mail", instagram: "Instagram (@)",
  chip: "Faixa pequena", titulo: "Título", destaque: "Título em destaque (azul)", subtitulo: "Subtítulo", botao: "Botão", botao2: "Segundo botão",
  etiqueta: "Etiqueta (acima do título)", itens: "Itens", icone: "Ícone (emoji)", texto: "Texto", nome: "Nome", link: "Link", imagem: "Imagem",
  chamada: "Texto do link", preco: "Preço", periodo: "Período", mostrar: "Mostrar esta seção no site", logos: "Logos", inteira: "Logo inteira (sem cortar)",
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
  if (DA_ABA_CLIENTES.has(caminho)) return `<div class="rounded-2xl bg-blue-50 text-blue-900 text-sm p-4">
    Esta lista vem da aba <b>Clientes</b>: ligue <b>${caminho === "projetos.itens" ? "“Destaque em Projetos no ar”" : "“Aparece no site”"}</b> no cliente para ele aparecer aqui.
    <button type="button" class="underline font-semibold ml-1" data-ir="clientes">Ir para Clientes →</button></div>`;
  if (typeof valor === "boolean") return `<label class="chave"><input type="checkbox" data-caminho="${caminho}" ${valor ? "checked" : ""}><span class="trilho"></span>${rot(chave)}</label>`;
  if (Array.isArray(valor)) {
    if (typeof modeloItem(caminho) === "string") // lista de textos: um por linha
      return `<div><label class="rot">${rot(chave)} (um por linha)</label><textarea class="campo" rows="4" data-caminho="${caminho}" data-linhas>${esc(valor.join("\n"))}</textarea></div>`;
    return `<div><p class="rot">${rot(chave)}</p><div class="space-y-2">
      ${valor.map((it, i) => `<div class="border border-slate-200 rounded-2xl p-3 bg-slate-50/70">
        <div class="flex justify-between items-center mb-2"><p class="text-xs font-bold text-slate-500">#${i + 1}</p>
          <div class="flex gap-1"><button type="button" class="btn btn-sec btn-ic !w-8 !h-8" data-mover="${caminho}|${i}|-1">↑</button><button type="button" class="btn btn-sec btn-ic !w-8 !h-8" data-mover="${caminho}|${i}|1">↓</button><button type="button" class="btn btn-perigo btn-ic !w-8 !h-8" data-remover="${caminho}|${i}">✕</button></div></div>
        <div class="grid sm:grid-cols-2 gap-2">${Object.entries(it).map(([k, v]) => `<div class="${LONGO.has(k) || Array.isArray(v) ? "sm:col-span-2" : ""}">${campoHTML(k, v, `${caminho}.${i}.${k}`)}</div>`).join("")}</div>
      </div>`).join("")}
      <button type="button" class="btn btn-sec" data-adicionar="${caminho}">+ Adicionar</button></div></div>`;
  }
  if (chave === "imagem") return `<div><label class="rot">${rot(chave)}</label>
    <div class="flex gap-2 items-center">${valor ? `<img src="${esc(imgUrl(valor))}" class="w-11 h-11 rounded-lg object-cover border" alt="">` : ""}
      <input class="campo" data-caminho="${caminho}" value="${esc(String(valor).startsWith("data:") ? "" : valor)}" placeholder="${String(valor).startsWith("data:") ? "Imagem enviada do aparelho" : "assets/… ou https://…"}">
      <label class="btn btn-sec cursor-pointer">📷<input type="file" accept="image/*" class="hidden" data-foto="${caminho}"></label></div></div>`;
  return LONGO.has(chave)
    ? `<div><label class="rot">${rot(chave)}</label><textarea class="campo" rows="3" data-caminho="${caminho}">${esc(valor)}</textarea></div>`
    : `<div><label class="rot">${rot(chave)}</label><input class="campo" data-caminho="${caminho}" value="${esc(valor)}"></div>`;
}

const abertos = new Set(["contato"]);
function renderSite() {
  if (!siteDados) { $("editorSite").innerHTML = '<p class="text-slate-500">Carregando…</p>'; return; }
  $("editorSite").innerHTML = Object.entries(siteDados).map(([k, v]) => `
    <details class="bloco-site cartao" data-secao="${k}" ${abertos.has(k) ? "open" : ""}>
      <summary class="px-5 py-4 font-bold flex items-center justify-between"><span class="flex items-center gap-3"><span class="text-xl">${(SECOES[k] || ["•"])[0]}</span>${(SECOES[k] || [0, k])[1]}</span><span class="seta">›</span></summary>
      <div class="px-5 pb-5 pt-1 space-y-3 border-t border-slate-100">${Array.isArray(v) ? campoHTML(k, v, k) : Object.entries(v).map(([c, x]) => campoHTML(c, x, `${k}.${c}`)).join("")}</div>
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
$("btnSalvarSite").addEventListener("click", async () => {
  const dados = JSON.stringify(siteDados);
  if (dados.length > 900000) return avisar("Conteúdo grande demais (muitas imagens enviadas). Use imagens da pasta assets.");
  $("btnSalvarSite").disabled = true;
  try { await setDoc(doc(db, "site", "conteudo"), { dados, atualizadoEm: serverTimestamp() }); avisar("Site publicado! ✅"); }
  catch (e) { avisar("Erro ao publicar: " + e.code); }
  finally { $("btnSalvarSite").disabled = false; }
});
