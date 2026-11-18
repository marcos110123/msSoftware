// Tela de PRODUTOS (admin-produtos.html): produtos (preço único ou P/G), promoção e adicionais das pizzas.
import {
  collection, getDocs, doc, getDoc, updateDoc, setDoc, deleteDoc, addDoc, query, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, iniciarPagina, $, esc, reais, reaisPonto, abrirJanela, confirmar, alerta, avisar } from "./base.js";
import { CATEGORIAS, IMAGEM_PADRAO_PRODUTO, FOTOS } from "./config.js";
import { prepararFoto, enviarFoto, apagarFoto } from "./fotos.js";

let aba = "produtos";          // "produtos" | "adicionais"
let produtos = [];
let filtroCategoria = "";
let busca = "";

const nomeCategoria = (id) => CATEGORIAS.find((c) => c.id === id)?.nome || id || "—";
const usaPrecosPG = (categoriaId) => !!CATEGORIAS.find((c) => c.id === categoriaId)?.precosPG;
const statusSelo = (s) => s === "ativo"
  ? '<span class="selo selo-ok">ATIVO</span>'
  : `<span class="selo selo-perigo">${esc(String(s || "—").toUpperCase())}</span>`;

// ----------------------------------------------------------------------
// Navegação lateral
// ----------------------------------------------------------------------
function renderNav() {
  const item = (id, texto) => `<button data-aba="${id}" class="${aba === id ? "ativo" : ""}">${texto}</button>`;
  $("navLateral").innerHTML = `
    <h3>Cardápio</h3>
    ${item("produtos", "🍕 Produtos")}
    <h3>Opções</h3>
    ${item("adicionais", "➕ Adicionais pizza")}`;
}

function irPara(novaAba) {
  aba = novaAba;
  renderNav();
  if (aba === "produtos") telaProdutos();
  else telaAdicionais();
}

// ======================================================================
// PRODUTOS
// ======================================================================
async function carregarProdutos() {
  const snap = await getDocs(collection(db, "produtos"));
  produtos = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => String(a.nome || "").toLowerCase().localeCompare(String(b.nome || "").toLowerCase()));
}

// Pizzas usam os campos "preco P" e "preco G" (com espaço, como no cardápio)
function precoTexto(p) {
  if (p["preco P"] || p["preco G"]) return `P ${reaisPonto(p["preco P"] || 0)} · G ${reaisPonto(p["preco G"] || 0)}`;
  return reaisPonto(p.preco ?? 0);
}

function cardProduto(p) {
  return `
    <article class="card" data-id="${esc(p.id)}" style="padding:0; overflow:hidden; ${p.status === "ativo" ? "" : "opacity:.7"}">
      ${p.imagem ? `<img src="${esc(p.imagem)}" alt="" style="width:100%; height:130px; object-fit:cover; display:block; background:var(--superficie-2)" onerror="this.style.display='none'">` : ""}
      <div style="padding:14px">
        <div class="linha" style="justify-content:space-between; align-items:flex-start">
          <h3 style="font-size:16px; font-weight:700">${esc(p.nome)}</h3>
          ${statusSelo(p.status)}
        </div>
        ${p.promocao ? '<span class="selo selo-pendente" style="margin-top:6px">🔥 Em promoção</span>' : ""}
        <p class="pagina-sub" style="margin-top:4px">${esc(p.descricao || "")}</p>
        <p style="font-weight:800; color:var(--marca-escura); margin-top:8px">${precoTexto(p)}</p>
        <p class="pagina-sub" style="margin-top:4px">${esc(nomeCategoria(p.categoria))}${p.tipo ? " · " + esc(p.tipo) : ""}</p>
        <div class="linha" style="margin-top:12px">
          <button class="btn btn-p" data-acao="editar">✏️ Editar</button>
          <button class="btn btn-p ${p.status === "ativo" ? "btn-leve-perigo" : "btn-ok"}" data-acao="status">
            ${p.status === "ativo" ? "❌ Esgotar" : "✅ Ativar"}</button>
          <button class="btn btn-p btn-fantasma" data-acao="excluir" title="Excluir">🗑️</button>
        </div>
      </div>
    </article>`;
}

function listaFiltrada() {
  return produtos.filter((p) =>
    (!filtroCategoria || p.categoria === filtroCategoria) &&
    (!busca || String(p.nome || "").toLowerCase().includes(busca)));
}

function renderProdutos() {
  const lista = listaFiltrada();
  $("gradeProdutos").innerHTML = lista.map(cardProduto).join("") ||
    '<p class="vazio">Nenhum produto encontrado.</p>';
  $("contagemProdutos").textContent = `${lista.length} produto(s) · ${lista.filter((p) => p.status === "ativo").length} ativo(s)`;
}

async function recarregarProdutos() {
  try {
    await carregarProdutos();
    if (aba === "produtos") renderProdutos();
  } catch (e) {
    console.error(e);
    avisar("Erro ao carregar produtos.", "erro");
  }
}

async function telaProdutos() {
  $("area").innerHTML = `
    <div class="pagina-topo">
      <div><h1 class="pagina-titulo">Produtos</h1><p class="pagina-sub" id="contagemProdutos">Carregando…</p></div>
      <button class="btn btn-primario btn-g" id="btnNovo">➕ Novo produto</button>
    </div>
    <div class="card linha" style="margin-bottom:10px">
      <select class="campo" id="filtroCategoria" style="max-width:220px">
        <option value="">Todas as categorias</option>
        ${CATEGORIAS.map((c) => `<option value="${c.id}" ${c.id === filtroCategoria ? "selected" : ""}>${esc(c.nome)}</option>`).join("")}
      </select>
      <input class="campo" id="buscaProduto" type="search" placeholder="🔍 Buscar produto…" value="${esc(busca)}" style="max-width:260px">
    </div>
    <div class="card linha" style="margin-bottom:16px">
      <span class="pagina-sub" style="font-weight:600">Na categoria escolhida:</span>
      <button class="btn btn-p btn-leve-perigo" id="btnEsgotarCat">❌ Esgotar</button>
      <button class="btn btn-p btn-ok" id="btnAtivarCat">✅ Ativar</button>
      <span class="espaco"></span>
      <button class="btn btn-p btn-alerta" id="btnPromoCat">🔥 Ativar promoção</button>
      <button class="btn btn-p" id="btnTirarPromoCat">🚫 Remover promoção</button>
    </div>
    <div class="grade" id="gradeProdutos"><p class="vazio">Carregando…</p></div>`;

  $("filtroCategoria").addEventListener("change", (e) => { filtroCategoria = e.target.value; renderProdutos(); });
  $("buscaProduto").addEventListener("input", (e) => { busca = e.target.value.trim().toLowerCase(); renderProdutos(); });
  $("btnNovo").addEventListener("click", () => abrirProduto(null));
  $("btnEsgotarCat").addEventListener("click", () => statusCategoria("esgotado"));
  $("btnAtivarCat").addEventListener("click", () => statusCategoria("ativo"));
  $("btnPromoCat").addEventListener("click", () => promocaoCategoria(true));
  $("btnTirarPromoCat").addEventListener("click", () => promocaoCategoria(false));
  $("gradeProdutos").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-acao]");
    if (!b) return;
    const p = produtos.find((x) => x.id === b.closest("[data-id]").dataset.id);
    if (!p) return;
    if (b.dataset.acao === "editar") abrirProduto(p);
    if (b.dataset.acao === "status") {
      await updateDoc(doc(db, "produtos", p.id), { status: p.status === "ativo" ? "esgotado" : "ativo" });
      await recarregarProdutos();
    }
    if (b.dataset.acao === "excluir") {
      if (!(await confirmar(`Tem certeza que deseja excluir "${p.nome}"?`, { titulo: "Excluir produto", ok: "Excluir", perigo: true }))) return;
      await deleteDoc(doc(db, "produtos", p.id));
      apagarFoto(p.imagem); // só apaga se a foto foi enviada pelo painel
      avisar("Produto excluído.", "ok");
      await recarregarProdutos();
    }
  });

  await recarregarProdutos();
}

async function statusCategoria(novoStatus) {
  if (!filtroCategoria) return alerta("Selecione uma categoria primeiro.");
  const atual = novoStatus === "ativo" ? "esgotado" : "ativo";
  const alvo = produtos.filter((p) => p.categoria === filtroCategoria && p.status === atual);
  if (!alvo.length) return alerta(novoStatus === "ativo" ? "Nenhum produto esgotado encontrado nesta categoria." : "Nenhum produto ativo encontrado nesta categoria.");
  const verbo = novoStatus === "ativo" ? "ativar" : "esgotar";
  if (!(await confirmar(`Deseja ${verbo} ${alvo.length} produtos da categoria "${nomeCategoria(filtroCategoria)}"?`,
    { ok: verbo[0].toUpperCase() + verbo.slice(1), perigo: novoStatus !== "ativo" }))) return;
  await Promise.all(alvo.map((p) => updateDoc(doc(db, "produtos", p.id), { status: novoStatus })));
  avisar(novoStatus === "ativo" ? "Produtos ativados com sucesso!" : "Produtos esgotados com sucesso!", "ok");
  await recarregarProdutos();
}

// Marca/desmarca promoção em todos os produtos da categoria (como no painel antigo)
async function promocaoCategoria(ativar) {
  if (!filtroCategoria) return alerta("Selecione uma categoria primeiro.");
  const alvo = produtos.filter((p) => p.categoria === filtroCategoria);
  if (!alvo.length) return alerta("Nenhum produto encontrado nesta categoria.");
  const pergunta = ativar
    ? `Deseja marcar ${alvo.length} produtos da categoria como promoção?`
    : `Deseja remover a promoção de ${alvo.length} produtos?`;
  if (!(await confirmar(pergunta, { ok: ativar ? "🔥 Ativar promoção" : "Remover promoção" }))) return;
  await Promise.all(alvo.map((p) => updateDoc(doc(db, "produtos", p.id), { promocao: ativar })));
  avisar(ativar ? "Categoria marcada como promoção!" : "Promoções removidas!", "ok");
  await recarregarProdutos();
}

// "4,50", "4.50" ou "4" → 4.5 (vazio ou inválido → NaN)
function lerPreco(texto) {
  const t = String(texto || "").trim().replace(/\s|R\$/g, "");
  if (!t) return NaN;
  return parseFloat(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
}
const precoCampo = (n) => (n == null || n === "" || isNaN(n) ? "" : Number(n).toFixed(2).replace(".", ","));

// Janela de EDITAR / NOVO produto: foto à esquerda (clique, arraste ou Ctrl+V), campos à direita.
// opcoes.categoria: categoria já escolhida (ex.: "Salvar e criar outro")
function abrirProduto(p, opcoes = {}) {
  const v = (x) => (x == null ? "" : esc(x));
  let categoria = p?.categoria || opcoes.categoria || filtroCategoria || "";
  const listaCategorias = [...CATEGORIAS];
  if (p?.categoria && !CATEGORIAS.some((c) => c.id === p.categoria)) listaCategorias.push({ id: p.categoria, nome: p.categoria });
  let imagemAtual = p ? (p.imagem || "") : IMAGEM_PADRAO_PRODUTO; // produto novo começa com a logo (como no painel antigo)
  let fotoNova = null;                // { blob, url } escolhida no computador e ainda não enviada

  const j = abrirJanela({
    larga: true,
    titulo: p ? "✏️ Editar produto" : "➕ Novo produto",
    corpo: `
      <div class="form-produto">
        <div>
          <div class="zona-foto" id="pZona" tabindex="0" title="${FOTOS.ativo ? "Clique para escolher a foto" : ""}">
            <img id="pFoto" alt="" style="display:none">
            <div class="dica-foto" id="pDica">
              <b>📷</b>${FOTOS.ativo ? "Clique para escolher a foto<br><small>ou arraste o arquivo aqui · ou cole com Ctrl+V</small>" : "Sem foto<br><small>use o link abaixo</small>"}
            </div>
          </div>
          <input type="file" id="pArquivo" accept="image/*" hidden>
          <div class="info-foto" id="pFotoInfo"></div>
          <div class="linha" style="gap:6px; margin-top:4px">
            <button type="button" class="btn btn-p btn-fantasma" id="pRemoverFoto">🗑️ Tirar foto</button>
          </div>
          <details style="margin-top:6px" ${FOTOS.ativo ? "" : "open"}>
            <summary class="pagina-sub" style="cursor:pointer">Usar link ou caminho de imagem</summary>
            <input class="campo" id="pImagem" placeholder="https://... ou img/pizza1.jpg" value="${v(imagemAtual)}" style="margin-top:6px">
          </details>
          <div class="previa-cardapio">
            <div class="rotulo-previa">Assim aparece no cardápio</div>
            <div class="item">
              <span id="pvFoto"></span>
              <div style="min-width:0"><b id="pvNome"></b><p id="pvDesc"></p><span class="preco" id="pvPreco"></span></div>
            </div>
          </div>
        </div>

        <div>
          <div class="grupo-campo">
            <label class="rotulo" for="pNome">Nome do produto</label>
            <input class="campo" id="pNome" style="font-size:17px; font-weight:600" placeholder="Ex: Pizza Calabresa" value="${v(p?.nome)}" autocomplete="off">
            <div class="erro-campo" id="erNome"></div>
          </div>
          <div class="grupo-campo">
            <span class="rotulo">Categoria</span>
            <div class="escolhas ${listaCategorias.length > 8 ? "compactas" : ""}" id="pCategorias">
              ${listaCategorias.map((c) => `<button type="button" data-categoria="${esc(c.id)}" class="${c.id === categoria ? "ativo" : ""}">${esc(c.nome)}</button>`).join("")}
            </div>
            <div class="erro-campo" id="erCategoria"></div>
          </div>
          <div class="grupo-campo" id="blocoPreco">
            <label class="rotulo" for="pPreco">Preço</label>
            <div class="campo-prefixo" style="max-width:200px"><span>R$</span>
              <input class="campo" id="pPreco" inputmode="decimal" placeholder="0,00" value="${precoCampo(p?.preco)}" autocomplete="off"></div>
          </div>
          <div class="grupo-campo" id="blocoPrecosPG">
            <div class="linha" style="gap:12px; align-items:flex-start">
              <div><label class="rotulo" for="pPrecoP">Preço P (pequena)</label>
                <div class="campo-prefixo" style="width:170px"><span>R$</span>
                  <input class="campo" id="pPrecoP" inputmode="decimal" placeholder="0,00" value="${precoCampo(p?.["preco P"])}" autocomplete="off"></div></div>
              <div><label class="rotulo" for="pPrecoG">Preço G (grande)</label>
                <div class="campo-prefixo" style="width:170px"><span>R$</span>
                  <input class="campo" id="pPrecoG" inputmode="decimal" placeholder="0,00" value="${precoCampo(p?.["preco G"])}" autocomplete="off"></div></div>
            </div>
          </div>
          <div class="erro-campo" id="erPreco"></div>
          <div class="grupo-campo">
            <label class="rotulo" for="pDesc">Descrição <span style="font-weight:400; color:var(--texto-3)">(opcional)</span></label>
            <textarea class="campo" id="pDesc" rows="3" placeholder="Ex: Calabresa, cebola e azeitona">${v(p?.descricao)}</textarea>
          </div>
          <div class="grupo-campo">
            <label class="interruptor">
              <span><b>✅ Disponível no cardápio</b><small>Desligado = aparece como esgotado</small></span>
              <input type="checkbox" id="pDisponivel" ${!p || p.status === "ativo" ? "checked" : ""}>
            </label>
            <label class="interruptor">
              <span><b>🔥 Promoção</b><small>Aparece como promoção no cardápio</small></span>
              <input type="checkbox" id="pPromocao" ${p?.promocao ? "checked" : ""}>
            </label>
          </div>
        </div>
      </div>`,
    rodape: `<button class="btn" data-fechar>Cancelar</button>
             ${p ? "" : '<button class="btn" data-salvar-outro>Salvar e criar outro</button>'}
             <button class="btn btn-primario" data-salvar>💾 Salvar</button>`,
    aoFechar: () => document.removeEventListener("paste", colar)
  });
  const el = j.el;
  const q = (id) => el.querySelector("#" + id);

  // ---- preços: pizzas usam P e G; o resto, um preço só ----
  const camposPreco = ["pPreco", "pPrecoP", "pPrecoG"];
  function atualizarCamposPreco() {
    const pg = usaPrecosPG(categoria);
    q("blocoPreco").style.display = pg ? "none" : "";
    q("blocoPrecosPG").style.display = pg ? "" : "none";
  }
  function textoPreco() {
    if (usaPrecosPG(categoria)) {
      const pp = lerPreco(q("pPrecoP").value), pgr = lerPreco(q("pPrecoG").value);
      const partes = [];
      if (pp > 0) partes.push(`P ${reais(pp)}`);
      if (pgr > 0) partes.push(`G ${reais(pgr)}`);
      return partes.join(" · ") || "R$ --";
    }
    const preco = lerPreco(q("pPreco").value);
    return isNaN(preco) ? "R$ --" : reais(preco);
  }

  // ---- prévia da foto e do cartão do cardápio ----
  const fotoMostrada = () => fotoNova?.url || imagemAtual;
  function atualizarFoto() {
    const url = fotoMostrada();
    q("pFoto").style.display = url ? "" : "none";
    if (url) q("pFoto").src = url;
    q("pDica").style.display = url ? "none" : "";
    q("pZona").classList.toggle("tem-foto", !!url);
    q("pRemoverFoto").style.display = url ? "" : "none";
    atualizarPrevia();
  }
  function atualizarPrevia() {
    const url = fotoMostrada();
    q("pvFoto").innerHTML = url ? `<img src="${esc(url)}" alt="">` : '<span class="sem-foto">📷</span>';
    q("pvNome").textContent = q("pNome").value.trim() || "Nome do produto";
    q("pvDesc").textContent = q("pDesc").value.trim();
    q("pvPreco").textContent = textoPreco();
  }
  q("pFoto").addEventListener("error", () => {
    if (!fotoNova && imagemAtual) q("pFotoInfo").textContent = "⚠️ Não foi possível abrir a imagem atual.";
  });

  // ---- escolher foto: clique, arrastar, colar ----
  async function usarArquivo(arquivo) {
    if (!FOTOS.ativo || !arquivo) return;
    try {
      q("pFotoInfo").textContent = "Preparando foto…";
      const preparada = await prepararFoto(arquivo);
      if (fotoNova) URL.revokeObjectURL(fotoNova.url);
      fotoNova = preparada;
      q("pFotoInfo").textContent = `✔ Foto nova pronta (${Math.round(fotoNova.blob.size / 1024)} KB) — será enviada ao salvar.`;
      atualizarFoto();
    } catch (erro) {
      console.error(erro);
      q("pFotoInfo").textContent = "Não foi possível usar essa foto.";
      alerta(erro.message || "Não foi possível usar essa foto.");
    }
  }
  function colar(e) {
    const arquivo = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith("image/"));
    if (arquivo) { e.preventDefault(); usarArquivo(arquivo); }
  }
  if (FOTOS.ativo) {
    document.addEventListener("paste", colar);
    q("pZona").addEventListener("click", () => q("pArquivo").click());
    q("pZona").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); q("pArquivo").click(); } });
    q("pArquivo").addEventListener("change", (e) => { usarArquivo(e.target.files[0]); e.target.value = ""; });
    q("pZona").addEventListener("dragover", (e) => { e.preventDefault(); q("pZona").classList.add("arrastando"); });
    q("pZona").addEventListener("dragleave", () => q("pZona").classList.remove("arrastando"));
    q("pZona").addEventListener("drop", (e) => {
      e.preventDefault();
      q("pZona").classList.remove("arrastando");
      usarArquivo(e.dataTransfer.files[0]);
    });
  }
  q("pRemoverFoto").addEventListener("click", () => {
    if (fotoNova) URL.revokeObjectURL(fotoNova.url);
    fotoNova = null;
    imagemAtual = "";
    q("pImagem").value = "";
    q("pFotoInfo").textContent = "Produto ficará sem foto.";
    atualizarFoto();
  });
  q("pImagem").addEventListener("change", () => {
    if (fotoNova) URL.revokeObjectURL(fotoNova.url);
    fotoNova = null; // digitou um link: vale o link
    imagemAtual = q("pImagem").value.trim();
    q("pFotoInfo").textContent = "";
    atualizarFoto();
  });

  // ---- campos ----
  const limparErro = (campo, erro) => { q(erro).textContent = ""; campo?.classList.remove("com-erro"); };
  const mostrarErro = (campo, erro, msg) => { q(erro).textContent = msg; campo?.classList.add("com-erro"); campo?.focus(); };
  q("pCategorias").addEventListener("click", (e) => {
    const b = e.target.closest("[data-categoria]");
    if (!b) return;
    categoria = b.dataset.categoria;
    q("pCategorias").querySelectorAll("button").forEach((x) => x.classList.toggle("ativo", x === b));
    limparErro(null, "erCategoria");
    atualizarCamposPreco();
    atualizarPrevia();
  });
  q("pNome").addEventListener("input", () => { limparErro(q("pNome"), "erNome"); atualizarPrevia(); });
  camposPreco.forEach((id) => {
    q(id).addEventListener("input", () => { camposPreco.forEach((c) => limparErro(q(c), "erPreco")); atualizarPrevia(); });
    q(id).addEventListener("blur", () => { const n = lerPreco(q(id).value); if (!isNaN(n)) q(id).value = precoCampo(n); });
  });
  q("pDesc").addEventListener("input", atualizarPrevia);
  ["pNome", ...camposPreco].forEach((id) => q(id).addEventListener("keydown", (e) => { if (e.key === "Enter") salvar(false); }));

  // ---- salvar ----
  async function salvar(criarOutro) {
    const nome = q("pNome").value.trim();
    if (!nome) return mostrarErro(q("pNome"), "erNome", "Informe o nome do produto.");
    if (!categoria) return mostrarErro(null, "erCategoria", "Escolha uma categoria.");

    // Preços (mesmas regras do painel antigo)
    let precos;
    if (usaPrecosPG(categoria)) {
      const precoP = lerPreco(q("pPrecoP").value) || 0;
      const precoG = lerPreco(q("pPrecoG").value) || 0;
      if (precoP <= 0 && precoG <= 0) return mostrarErro(q("pPrecoP"), "erPreco", "Informe o preço P ou G.");
      precos = { "preco P": precoP, "preco G": precoG };
    } else {
      const preco = lerPreco(q("pPreco").value);
      if (isNaN(preco) || preco < 0) return mostrarErro(q("pPreco"), "erPreco", "Informe um preço válido (ex: 4,50).");
      precos = { preco };
    }

    // Mesmo formato de sempre. Id do produto novo = nome (como no painel antigo).
    const id = p?.id || nome;
    const ref = doc(db, "produtos", id);
    let base = {};
    if (p) {
      // edição: mantém os demais campos que o produto já tinha
      base = (await getDoc(ref)).data() || {};
    } else if ((await getDoc(ref)).exists()) {
      if (!(await confirmar(`Já existe um produto chamado "${nome}". Substituir?`, { ok: "Substituir", perigo: true }))) return;
    }
    const disponivel = q("pDisponivel").checked;
    const dados = {
      ...base,
      nome,
      descricao: q("pDesc").value.trim(),
      categoria,
      imagem: imagemAtual,
      // desligar "disponível" = esgotado; religar = ativo (outros status que já existiam são mantidos)
      status: disponivel ? "ativo" : (base.status && base.status !== "ativo" ? base.status : "esgotado"),
      promocao: q("pPromocao").checked
    };
    // troca de categoria pizza ↔ outra: remove o tipo de preço que não vale mais
    delete dados.preco;
    delete dados["preco P"];
    delete dados["preco G"];
    Object.assign(dados, precos);

    const botoes = el.querySelectorAll("[data-salvar], [data-salvar-outro]");
    const botaoSalvar = el.querySelector("[data-salvar]");
    botoes.forEach((b) => { b.disabled = true; });
    let urlEnviada = null;
    try {
      // foto escolhida no computador/celular: envia primeiro e usa o link gerado
      if (fotoNova) {
        botaoSalvar.textContent = "Enviando foto…";
        urlEnviada = await enviarFoto(fotoNova.blob, nome);
        dados.imagem = urlEnviada;
      }
      botaoSalvar.textContent = "Salvando…";
      await setDoc(ref, dados);
      // trocou/tirou a foto: apaga a antiga do Storage (só as enviadas pelo painel)
      if (base.imagem && base.imagem !== dados.imagem) apagarFoto(base.imagem);
      if (fotoNova) URL.revokeObjectURL(fotoNova.url);
      j.fechar();
      avisar(`"${nome}" salvo!`, "ok");
      await recarregarProdutos();
      if (criarOutro) abrirProduto(null, { categoria });
    } catch (e) {
      console.error(e);
      if (urlEnviada) apagarFoto(urlEnviada); // não deixa foto solta se o produto não foi salvo
      botoes.forEach((b) => { b.disabled = false; });
      botaoSalvar.textContent = "💾 Salvar";
      alerta(urlEnviada || !fotoNova
        ? "Erro ao salvar o produto."
        : "Erro ao enviar a foto. Verifique a internet (e se o Storage está ativado no Firebase).");
    }
  }
  el.querySelector("[data-salvar]").addEventListener("click", () => salvar(false));
  el.querySelector("[data-salvar-outro]")?.addEventListener("click", () => salvar(true));

  atualizarCamposPreco();
  atualizarFoto();
  q("pNome").focus();
}

// ======================================================================
// ADICIONAIS DA PIZZA (coleção opcoesLanche, grupo "extras")
// ======================================================================
async function telaAdicionais() {
  $("area").innerHTML = `
    <div class="pagina-topo">
      <div><h1 class="pagina-titulo">➕ Adicionais pizza</h1><p class="pagina-sub" id="contagemAdicionais">Carregando…</p></div>
      <button class="btn btn-primario btn-g" id="btnNovoAdicional">➕ Novo adicional</button>
    </div>
    <div class="card"><div class="lista-linhas" id="listaAdicionais"><p class="vazio">Carregando…</p></div></div>`;

  let itens = [];
  const carregar = async () => {
    const snap = await getDocs(query(collection(db, "opcoesLanche"), where("grupo", "==", "extras")));
    itens = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    $("contagemAdicionais").textContent = `${itens.length} adicional(is) · ${itens.filter((i) => i.status === "ativo").length} ativo(s)`;
    $("listaAdicionais").innerHTML = itens.map((i) => `
      <div data-id="${esc(i.id)}" style="align-items:center">
        <span><b>${esc(i.nome)}</b><br><span class="pagina-sub">${reaisPonto(i.valor)}</span></span>
        <span class="linha" style="gap:4px">
          ${statusSelo(i.status)}
          <button class="btn btn-p ${i.status === "ativo" ? "btn-leve-perigo" : "btn-ok"}" data-acao="status">${i.status === "ativo" ? "❌ Esgotar" : "✅ Ativar"}</button>
          <button class="btn btn-p" data-acao="editar">✏️ Editar</button>
        </span>
      </div>`).join("") || '<p class="vazio">Nenhum adicional cadastrado.</p>';
  };

  $("btnNovoAdicional").addEventListener("click", () => abrirAdicional(null, carregar));
  $("listaAdicionais").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-acao]");
    if (!b) return;
    const i = itens.find((x) => x.id === b.closest("[data-id]").dataset.id);
    if (!i) return;
    if (b.dataset.acao === "status") {
      await updateDoc(doc(db, "opcoesLanche", i.id), { status: i.status === "ativo" ? "esgotado" : "ativo" });
      carregar();
    }
    if (b.dataset.acao === "editar") abrirAdicional(i, carregar);
  });

  carregar().catch((e) => { console.error(e); $("listaAdicionais").innerHTML = '<p class="vazio">Erro ao carregar.</p>'; });
}

function abrirAdicional(item, aoSalvar) {
  const j = abrirJanela({
    titulo: item ? "Editar adicional" : "🍕 Novo adicional",
    corpo: `
      <div class="grupo-campo"><label class="rotulo" for="aNome">Nome</label><input class="campo" id="aNome" placeholder="Ex: Borda de Cheddar" value="${esc(item?.nome || "")}"></div>
      <div class="grupo-campo"><label class="rotulo" for="aValor">Valor (R$)</label><input class="campo" id="aValor" type="number" step="0.01" value="${esc(item?.valor ?? "")}"></div>`,
    rodape: `<button class="btn" data-fechar>Cancelar</button><button class="btn btn-primario" data-salvar>💾 Salvar</button>`
  });
  j.el.querySelector("[data-salvar]").addEventListener("click", async () => {
    const nome = j.el.querySelector("#aNome").value.trim();
    const valor = parseFloat(j.el.querySelector("#aValor").value);
    if (!nome) return alerta("Informe o nome do adicional.");
    if (isNaN(valor)) return alerta("Informe um valor válido.");
    try {
      if (item) {
        // edição: mantém o status atual
        await updateDoc(doc(db, "opcoesLanche", item.id), { nome, valor, grupo: "extras" });
      } else {
        await addDoc(collection(db, "opcoesLanche"), { nome, valor, grupo: "extras", status: "ativo" });
      }
      j.fechar();
      aoSalvar();
    } catch (e) {
      console.error(e);
      alerta("Erro ao salvar o adicional.");
    }
  });
}

// ----------------------------------------------------------------------
iniciarPagina("produtos", () => {
  $("navLateral").addEventListener("click", (e) => {
    const b = e.target.closest("[data-aba]");
    if (b) irPara(b.dataset.aba);
  });
  irPara("produtos");
});
