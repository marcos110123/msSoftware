// Site MsSoftware: o conteúdo editável vem do painel (Firebase sitemssoftware-adm, documento site/conteudo).
// Se o banco não responder, a página continua com o HTML que já está no index.html (nada fica em branco).
// O painel (/adm) importa PADRAO daqui para editar com os mesmos campos.
// O HTML de reserva do index.html é gerado a partir do PADRAO (node gerar-estatico.mjs).

export const PROJETO = { id: "sitemssoftware-adm", apiKey: "AIzaSyBSeAInxEC1rH959NAF3QztB3nhPqRp8tU" };
export const VERSAO = 2; // conteúdo salvo em versão anterior: só as listas de clientes são aproveitadas

// Conteúdo de fábrica (foco: cardápio digital + painel)
export const PADRAO = {
  versao: VERSAO,
  contato: {
    whatsapp: "5517996165997",
    mensagem: "Olá! Quero conhecer o cardápio digital da MsSoftware.",
    whatsappTexto: "(17) 99616-5997",
    email: "msouzasoftware@gmail.com",
    instagram: "mssoftware.cardapios"
  },
  topo: {
    chip: "Cardápio digital + painel para a sua loja",
    titulo: "Seu cardápio digital,",
    destaque: "pedidos organizados.",
    subtitulo: "O cliente pede pelo celular, o pedido chega no seu painel, a comanda sai impressa e o cliente acompanha tudo pelo WhatsApp.",
    botao: "💬 Quero uma demonstração",
    botao2: "Ver cardápios no ar",
    vantagens: ["Sem taxa por pedido", "Painel no computador e no celular", "Suporte pelo WhatsApp"],
    imagem: "assets/mock-fiorella.jpg",
    imagem2: "assets/mock-gatini.jpg"
  },
  clientes: {
    etiqueta: "Quem já usa", titulo: "Lojas que vendem com a MsSoftware",
    logos: [
      { nome: "La Brasa Steakhouse", imagem: "assets/cli-labrasa-logo.jpg" },
      { nome: "Esfirras em Casa", imagem: "assets/cli-esfirras.jpg" },
      { nome: "Pizzaria Fiorella", imagem: "assets/cli-fiorella.jpg" },
      { nome: "Gatini", imagem: "assets/cli-gatini.png", inteira: true },
      { nome: "Nosso Açaí", imagem: "assets/cli-nossoacai.jpg" },
      { nome: "Rei do Açaí", imagem: "assets/cli-acai.jpg" },
      { nome: "Result Hair", imagem: "assets/cli-resulthair.jpg", inteira: true },
      { nome: "Pousada 3 de Abril", imagem: "assets/cli-pousada.jpg" },
      { nome: "Joyce Maurieli Ateliê das Unhas", imagem: "assets/cli-joyce.jpg" },
      { nome: "Flutuante Binu's", imagem: "assets/cli-binus.jpg" }
    ]
  },
  recursos: {
    etiqueta: "Recursos", titulo: "Tudo o que a sua loja precisa para vender online", subtitulo: "Feito para delivery, retirada e consumo no local.",
    itens: [
      { icone: "📱", titulo: "Cardápio no celular", texto: "Seu cardápio com fotos, tamanhos, adicionais e combos, num link que abre em qualquer celular — sem baixar aplicativo." },
      { icone: "🖥️", titulo: "Painel de pedidos", texto: "Os pedidos chegam na hora, com alerta sonoro, no computador ou no celular da loja." },
      { icone: "🖨️", titulo: "Comanda impressa", texto: "Impressão automática na impressora térmica, sem precisar clicar em imprimir." },
      { icone: "💬", titulo: "Avisos no WhatsApp", texto: "Um toque envia ao cliente: pedido recebido, saiu para entrega e a chave PIX." },
      { icone: "📍", titulo: "Acompanhamento ao vivo", texto: "O cliente vê o andamento do pedido em tempo real, do preparo até a entrega." },
      { icone: "⭐", titulo: "Promoções e combos", texto: "Destaque promoções, monte combos e pause produtos que acabaram em segundos." },
      { icone: "📊", titulo: "Relatórios e histórico", texto: "Fechamento do dia, vendas por forma de pagamento e histórico de pedidos." },
      { icone: "🧾", titulo: "Nota fiscal e mesas", texto: "Emissão de NFC-e e tablets nas mesas nos planos maiores." }
    ]
  },
  comoFunciona: {
    etiqueta: "Como funciona", titulo: "Do pedido à entrega, sem bagunça", subtitulo: "Nada de anotar pedido no papel ou perder mensagem no WhatsApp.",
    itens: [
      { icone: "🛒", titulo: "O cliente monta o pedido", texto: "Escolhe os produtos pelo link do seu cardápio e informa entrega, endereço e pagamento." },
      { icone: "🔔", titulo: "O pedido chega no painel", texto: "Toca o alerta, aparece na tela e a comanda sai impressa automaticamente." },
      { icone: "👨‍🍳", titulo: "Você prepara e avisa", texto: "Com um toque, o cliente recebe no WhatsApp que o pedido está sendo feito ou saiu para entrega." },
      { icone: "✅", titulo: "Tudo registrado", texto: "Vendas, formas de pagamento e histórico ficam guardados para o fechamento do caixa." }
    ]
  },
  projetos: {
    etiqueta: "Projetos no ar", titulo: "Veja funcionando", subtitulo: "Cardápios que desenvolvemos e que estão recebendo pedidos agora. Toque para abrir.",
    itens: [
      { nome: "La Brasa Steakhouse", texto: "Cardápio delivery, tablets nas mesas e painel de pedidos", link: "https://labrasa.site", imagem: "assets/cli-labrasa-card.jpg" },
      { nome: "Esfirras em Casa", texto: "Cardápio delivery com pedidos no WhatsApp e painel de pedidos", link: "EsfirrasEmCasa/", imagem: "assets/cli-esfirras.jpg" },
      { nome: "Pizzaria Fiorella", texto: "Cardápio delivery, montagem de pizza e painel com nota fiscal", link: "PizzariaFiorella/", imagem: "assets/cli-fiorella.jpg" },
      { nome: "Gatini", texto: "Cardápio digital com pedidos online", link: "Gatini/", imagem: "assets/cli-gatini.png" },
      { nome: "Nosso Açaí", texto: "Cardápio para montar o açaí e painel de pedidos", link: "NossoAcai/", imagem: "assets/cli-nossoacai.jpg" }
    ]
  },
  planos: {
    mostrar: true,
    etiqueta: "Planos", titulo: "Mensalidade fixa, sem surpresas", subtitulo: "Sem taxa de implantação e sem taxa por pedido.",
    itens: [
      { nome: "Básico", preco: "R$ 179,90", periodo: "/mês", destaque: false, itens: ["Cardápio digital com pedidos", "Painel de pedidos e produtos", "Comanda impressa", "Suporte pelo WhatsApp"] },
      { nome: "Com NF-e", preco: "R$ 279,90", periodo: "/mês", destaque: true, itens: ["Tudo do Básico", "Emissão de nota fiscal (NFC-e)", "Relatórios de vendas"] },
      { nome: "Plus", preco: "Consulte", periodo: "", destaque: false, itens: ["Tudo do Com NF-e", "Tablets nas mesas", "Ajustes sob medida para a sua loja"] }
    ]
  },
  depoimentos: {
    mostrar: false, // ligue no painel quando cadastrar depoimentos reais de clientes
    etiqueta: "Depoimentos", titulo: "Quem usa, recomenda",
    itens: [{ nome: "", loja: "", texto: "" }]
  },
  passos: {
    etiqueta: "Como começar", titulo: "Seu cardápio no ar em poucos dias",
    itens: [
      { titulo: "Conversa", texto: "Você chama no WhatsApp e conta como a sua loja funciona." },
      { titulo: "Montamos tudo", texto: "Cadastramos o cardápio, as fotos e deixamos com a cara da sua marca." },
      { titulo: "Treinamento", texto: "Mostramos o painel e configuramos a impressora na sua loja." },
      { titulo: "No ar e suporte", texto: "Você divulga o link e segue com a gente para ajustes e melhorias." }
    ]
  },
  servicos: {
    etiqueta: "Outros serviços", titulo: "Também fazemos", subtitulo: "Além do cardápio digital, desenvolvemos sob medida.",
    itens: [
      { icone: "🌐", titulo: "Sites", texto: "Sites profissionais que passam confiança e levam o cliente para o seu WhatsApp." },
      { icone: "🧩", titulo: "Sistemas web", texto: "Painéis, controles e relatórios para a rotina da sua empresa." },
      { icone: "📲", titulo: "Aplicativos", texto: "Apps que se instalam no celular, com a cara da sua marca." }
    ]
  },
  perguntas: {
    etiqueta: "Dúvidas", titulo: "Perguntas frequentes",
    itens: [
      { pergunta: "Tem taxa por pedido?", resposta: "Não. Você paga só a mensalidade do plano, sem taxa de implantação e sem porcentagem sobre as vendas." },
      { pergunta: "O cliente precisa baixar algum aplicativo?", resposta: "Não. O cardápio abre por um link no navegador do celular. Se quiser, o cliente pode instalar na tela inicial como um app." },
      { pergunta: "Como eu recebo os pedidos?", resposta: "No painel da loja, no computador ou no celular, com alerta sonoro e a comanda impressa automaticamente na impressora térmica." },
      { pergunta: "Consigo mudar preços e produtos sozinho?", resposta: "Sim. Pelo painel você altera produtos, preços, fotos e promoções, e o cardápio atualiza na hora." },
      { pergunta: "Emite nota fiscal?", resposta: "Sim, no plano Com NF-e o painel emite a NFC-e dos pedidos." },
      { pergunta: "Quanto tempo leva para ficar pronto?", resposta: "Em poucos dias depois de recebermos o cardápio, os preços e as fotos da sua loja." }
    ]
  },
  chamada: { titulo: "Vamos colocar o seu cardápio no ar?", texto: "Peça uma demonstração pelo WhatsApp e veja funcionando na prática.", botao: "💬 Falar no WhatsApp" },
  rodape: { texto: "Cardápio digital com painel de pedidos para restaurantes, lanchonetes, pizzarias e açaiterias. Também fazemos sites, sistemas e aplicativos." }
};

// ---------- utilitários ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lista = (v) => (Array.isArray(v) ? v : []);
// mistura o conteúdo salvo com o padrão (campo que faltar no banco usa o de fábrica)
export function completar(salvo) {
  // conteúdo de uma versão anterior do site: aproveita só as listas que vêm da aba Clientes
  if (salvo && (Number(salvo.versao) || 1) < VERSAO) {
    salvo = { clientes: { logos: salvo.clientes?.logos }, projetos: { itens: salvo.projetos?.itens } };
  }
  const out = {};
  for (const [k, v] of Object.entries(PADRAO)) {
    const s = salvo?.[k];
    if (Array.isArray(v)) out[k] = Array.isArray(s) ? s : v;
    else if (v && typeof v === "object") {
      out[k] = { ...v };
      for (const [c, x] of Object.entries(s && typeof s === "object" ? s : {})) if (x !== undefined && x !== null) out[k][c] = x;
    } else out[k] = s ?? v;
  }
  out.versao = VERSAO;
  return out;
}
const linkZap = (c, msg = c.mensagem) => `https://wa.me/${String(c.whatsapp || "").replace(/\D/g, "")}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;

// ---------- desenho das seções ----------
const cab = (s, classe = "mb-12") => `
  <div class="text-center max-w-2xl mx-auto ${classe} surgir">
    ${s.etiqueta ? `<span class="etiqueta">${esc(s.etiqueta)}</span>` : ""}
    <h2 class="titulo-secao mt-3">${esc(s.titulo)}</h2>
    ${s.subtitulo ? `<p class="suave mt-4 text-lg">${esc(s.subtitulo)}</p>` : ""}
  </div>`;

export const SECOES = {
  inicio: (d) => `
    <div class="grade-fundo absolute inset-0 pointer-events-none"></div>
    <div class="relative max-w-6xl mx-auto px-5 grid lg:grid-cols-2 gap-14 items-center">
      <div class="text-center lg:text-left">
        ${d.topo.chip ? `<span class="chip inline-flex items-center gap-2 mb-6"><span class="ponto"></span>${esc(d.topo.chip)}</span>` : ""}
        <h1 class="titulo-topo">${esc(d.topo.titulo)}<br><span class="destaque-topo">${esc(d.topo.destaque)}</span></h1>
        <p class="suave-topo text-lg sm:text-xl mt-6 max-w-xl mx-auto lg:mx-0">${esc(d.topo.subtitulo)}</p>
        <div class="flex flex-wrap justify-center lg:justify-start gap-3 mt-9">
          <a href="${esc(linkZap(d.contato))}" target="_blank" rel="noopener" class="btn btn-primario text-lg">${esc(d.topo.botao)}</a>
          ${d.topo.botao2 ? `<a href="#projetos" class="btn btn-contorno text-lg">${esc(d.topo.botao2)}</a>` : ""}
        </div>
        ${lista(d.topo.vantagens).length ? `<ul class="vantagens mt-8 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2">
          ${lista(d.topo.vantagens).map((v) => `<li>✓ ${esc(v)}</li>`).join("")}</ul>` : ""}
      </div>
      <div class="vitrine-celulares" aria-hidden="true">
        ${d.topo.imagem2 ? `<div class="celular celular-tras"><img src="${esc(d.topo.imagem2)}" alt="" loading="lazy"></div>` : ""}
        ${d.topo.imagem ? `<div class="celular celular-frente"><img src="${esc(d.topo.imagem)}" alt=""></div>` : ""}
        <div class="aviso-pedido"><span class="sino">🔔</span><div><b>Novo pedido!</b><small>Entrega · PIX · comanda impressa</small></div></div>
      </div>
    </div>`,
  clientes: (d) => `
    <p class="text-center text-sm font-semibold uppercase tracking-widest suave mb-6 px-5">${esc(d.clientes.titulo)}</p>
    <div class="faixa-logos"><div class="trilho" id="trilho">
      ${lista(d.clientes.logos).map((x) => `<img src="${esc(x.imagem)}" alt="${esc(x.nome)}" title="${esc(x.nome)}" loading="lazy"${x.inteira ? ' style="object-fit:contain;padding:6px"' : ""}>`).join("")}
    </div></div>`,
  recursos: (d) => `
    <div class="max-w-6xl mx-auto">${cab(d.recursos)}
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        ${lista(d.recursos.itens).map((x) => `
        <div class="cartao cartao-hover p-5 sm:p-6 surgir flex sm:block gap-4"><div class="icone shrink-0 sm:mb-4">${esc(x.icone)}</div>
          <div><h3 class="text-lg font-bold mb-1 sm:mb-2">${esc(x.titulo)}</h3><p class="suave text-[15px]">${esc(x.texto)}</p></div></div>`).join("")}
      </div></div>`,
  "como-funciona": (d) => `
    <div class="max-w-6xl mx-auto">${cab(d.comoFunciona)}
      <div class="fluxo grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        ${lista(d.comoFunciona.itens).map((x, i) => `
        <div class="passo surgir">
          <div class="passo-ic"><span>${esc(x.icone)}</span><b>${i + 1}</b></div>
          <h3 class="font-bold text-lg mt-5 mb-2">${esc(x.titulo)}</h3><p class="suave text-[15px]">${esc(x.texto)}</p>
        </div>`).join("")}
      </div></div>`,
  projetos: (d) => {
    const it = lista(d.projetos.itens);
    const col = it.length >= 5 ? "lg:grid-cols-5" : it.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";
    return `
    <div class="max-w-6xl mx-auto">${cab(d.projetos)}
      <div class="grid grid-cols-2 sm:grid-cols-3 ${col} gap-4 sm:gap-5">
        ${it.map((x) => `
        <a href="${esc(x.link || "#")}" target="_blank" rel="noopener" class="cartao cartao-hover projeto p-3 block surgir">
          <div class="projeto-logo">${x.imagem ? `<img src="${esc(x.imagem)}" alt="${esc(x.nome)}" loading="lazy">` : ""}</div>
          <div class="px-1 pb-1">
            <h3 class="font-bold mt-3 leading-tight">${esc(x.nome)}</h3>
            <p class="suave text-sm mt-1">${esc(x.texto)}</p>
            <p class="link-projeto text-sm mt-3">${esc(x.chamada || "Abrir cardápio →")}</p>
          </div>
        </a>`).join("")}
      </div></div>`;
  },
  planos: (d) => `
    <div class="max-w-6xl mx-auto">${cab(d.planos)}
      <div class="grid md:grid-cols-3 gap-6 items-stretch">
        ${lista(d.planos.itens).map((x) => `
        <div class="cartao plano p-8 surgir flex flex-col ${x.destaque ? "plano-destaque" : ""}">
          ${x.destaque ? '<span class="selo-plano">Mais escolhido</span>' : ""}
          <h3 class="text-xl font-bold">${esc(x.nome)}</h3>
          <p class="mt-4"><span class="text-4xl font-extrabold tracking-tight">${esc(x.preco)}</span><span class="suave">${esc(x.periodo || "")}</span></p>
          <ul class="mt-6 space-y-3 flex-1">${lista(x.itens).map((i) => `<li class="flex gap-2"><span class="certo">✓</span><span>${esc(i)}</span></li>`).join("")}</ul>
          <a href="${esc(linkZap(d.contato, `Olá! Tenho interesse no plano ${x.nome} do cardápio digital.`))}" target="_blank" rel="noopener"
             class="btn ${x.destaque ? "btn-primario" : "btn-claro"} mt-8">Quero este plano</a>
        </div>`).join("")}
      </div></div>`,
  depoimentos: (d) => `
    <div class="max-w-6xl mx-auto">${cab(d.depoimentos)}
      <div class="grid md:grid-cols-3 gap-6">
        ${lista(d.depoimentos.itens).filter((x) => x.texto).map((x) => `
        <figure class="cartao p-7 surgir"><p class="aspas">“</p><blockquote class="text-[15px] leading-relaxed">${esc(x.texto)}</blockquote>
          <figcaption class="mt-5"><b>${esc(x.nome)}</b>${x.loja ? `<span class="suave text-sm block">${esc(x.loja)}</span>` : ""}</figcaption></figure>`).join("")}
      </div></div>`,
  "como-comecar": (d) => `
    <div class="max-w-6xl mx-auto">${cab(d.passos)}
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        ${lista(d.passos.itens).map((x, i) => `
        <div class="cartao p-7 surgir"><div class="num mb-4">${i + 1}</div>
          <h3 class="font-bold mb-1 text-lg">${esc(x.titulo)}</h3><p class="suave text-[15px]">${esc(x.texto)}</p></div>`).join("")}
      </div></div>`,
  servicos: (d) => `
    <div class="max-w-6xl mx-auto">${cab(d.servicos, "mb-10")}
      <div class="grid md:grid-cols-3 gap-6">
        ${lista(d.servicos.itens).map((x) => `
        <div class="cartao cartao-hover p-7 surgir flex gap-4"><div class="icone shrink-0">${esc(x.icone)}</div>
          <div><h3 class="text-lg font-bold mb-1">${esc(x.titulo)}</h3><p class="suave text-[15px]">${esc(x.texto)}</p></div></div>`).join("")}
      </div></div>`,
  perguntas: (d) => `
    <div class="max-w-3xl mx-auto">${cab(d.perguntas, "mb-10")}
      <div class="space-y-3">
        ${lista(d.perguntas.itens).map((x) => `
        <details class="cartao pergunta px-6 py-5 surgir">
          <summary class="flex items-center justify-between gap-4 font-semibold text-[16px]">${esc(x.pergunta)}<span class="seta">+</span></summary>
          <p class="suave mt-3 leading-relaxed">${esc(x.resposta)}</p></details>`).join("")}
      </div></div>`,
  chamada: (d) => `
    <div class="relative max-w-3xl mx-auto">
      <h2 class="titulo-secao text-white">${esc(d.chamada.titulo)}</h2>
      <p class="mt-4 text-lg opacity-85">${esc(d.chamada.texto)}</p>
      <a href="${esc(linkZap(d.contato))}" target="_blank" rel="noopener" class="btn mt-9 bg-white text-blue-700 hover:bg-blue-50 text-lg shadow-xl">${esc(d.chamada.botao)}</a>
    </div>`
};

// seções que podem ser desligadas no painel (e o link do menu correspondente)
const OPCIONAIS = { planos: "planos", depoimentos: "depoimentos" };

function aplicar(d) {
  for (const [id, fn] of Object.entries(SECOES)) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = fn(d);
  }
  for (const [id, chave] of Object.entries(OPCIONAIS)) {
    const ligado = !!d[chave].mostrar && (chave !== "depoimentos" || lista(d.depoimentos.itens).some((x) => x.texto));
    document.getElementById(id)?.classList.toggle("hidden", !ligado);
    document.querySelectorAll(`[data-menu="${id}"]`).forEach((a) => a.classList.toggle("hidden", !ligado));
  }
  // contatos espalhados pela página (cabeçalho, menu, botão flutuante, rodapé)
  document.querySelectorAll("[data-zap]").forEach((a) => (a.href = linkZap(d.contato)));
  const zt = document.getElementById("rodapeZap");
  if (zt) { zt.href = linkZap(d.contato, ""); zt.textContent = `💬 WhatsApp ${d.contato.whatsappTexto || ""}`; }
  const em = document.getElementById("rodapeEmail");
  if (em) { em.href = `mailto:${d.contato.email}`; em.textContent = `📧 ${d.contato.email}`; em.parentElement.classList.toggle("hidden", !d.contato.email); }
  const ig = document.getElementById("rodapeInsta");
  if (ig) { const u = String(d.contato.instagram || "").replace(/^@/, ""); ig.href = `https://instagram.com/${u}`; ig.textContent = `📸 @${u}`; ig.parentElement.classList.toggle("hidden", !u); }
  const rt = document.getElementById("rodapeTexto");
  if (rt) rt.textContent = d.rodape.texto;
}

// ---------- comportamento da página ----------
let observador;
function animar() {
  observador?.disconnect();
  observador = new IntersectionObserver((itens) => {
    itens.forEach((i) => { if (i.isIntersecting) { i.target.classList.add("visivel"); observador.unobserve(i.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".surgir:not(.visivel)").forEach((el) => observador.observe(el));
}
function carrossel() {
  // carrossel sem emendas: duplica as logos uma vez
  const trilho = document.getElementById("trilho");
  if (!trilho || trilho.dataset.duplicado) return;
  trilho.dataset.duplicado = "1";
  [...trilho.children].forEach((img) => {
    const copia = img.cloneNode(true);
    copia.alt = "";
    copia.setAttribute("aria-hidden", "true");
    trilho.appendChild(copia);
  });
}

// lê site/conteudo pela API REST (sem carregar o SDK do Firebase no site)
async function lerConteudo() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJETO.id}/databases/(default)/documents/site/conteudo?key=${PROJETO.apiKey}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return null;
  const j = await r.json();
  const txt = j?.fields?.dados?.stringValue;
  return txt ? JSON.parse(txt) : null;
}

export async function iniciarSite() {
  carrossel();
  animar();
  try {
    const salvo = await lerConteudo();
    if (salvo) { aplicar(completar(salvo)); carrossel(); animar(); }
  } catch (e) {
    console.warn("Conteúdo do painel indisponível; mantendo o padrão.", e);
  }
}

// prévia do painel: desenha a página com o conteúdo que está sendo editado
export function previsualizar(dados) { aplicar(completar(dados)); carrossel(); document.querySelectorAll(".surgir").forEach((e) => e.classList.add("visivel")); }
