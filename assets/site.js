// Site MsSoftware: o conteúdo editável vem do painel (Firebase sitemssoftware-adm, documento site/conteudo).
// Se o banco não responder, a página continua com o HTML que já está no index.html (nada fica em branco).
// O painel (/adm) importa PADRAO e PROJETO daqui para editar com os mesmos campos.

export const PROJETO = { id: "sitemssoftware-adm", apiKey: "AIzaSyBSeAInxEC1rH959NAF3QztB3nhPqRp8tU" };

// Conteúdo de fábrica = o que está hoje no index.html
export const PADRAO = {
  contato: {
    whatsapp: "5517996045305",
    mensagem: "Olá! Gostaria de um orçamento com a MsSoftware.",
    whatsappTexto: "(17) 99604-5305",
    email: "msouzasoftware@gmail.com",
    instagram: ""
  },
  topo: {
    chip: "Sites · Sistemas · Aplicativos · Cardápios digitais",
    titulo: "Transformamos ideias em",
    destaque: "soluções digitais",
    subtitulo: "Desenvolvimento web e mobile sob medida, rápido e sem enrolação — para o seu negócio vender mais e trabalhar melhor.",
    botao: "💬 Pedir orçamento",
    botao2: "Ver projetos no ar"
  },
  diferenciais: [
    { icone: "💡", titulo: "Feito sob medida", texto: "Cada projeto nasce da necessidade do seu negócio, com foco na experiência de quem vai usar." },
    { icone: "⚡", titulo: "Rápido e moderno", texto: "Páginas leves, que abrem bem no celular e funcionam em qualquer aparelho." },
    { icone: "🤝", titulo: "Parceria de verdade", texto: "Acompanhamos do início ao fim e seguimos juntos depois da entrega, com suporte e melhorias." }
  ],
  servicos: {
    etiqueta: "Serviços", titulo: "O que fazemos", subtitulo: "Da página de apresentação ao sistema completo da sua empresa.",
    itens: [
      { icone: "🌐", titulo: "Sites institucionais", texto: "Sites profissionais que passam confiança e levam o cliente direto para o seu WhatsApp." },
      { icone: "🧩", titulo: "Sistemas web", texto: "Painéis administrativos, controle de pedidos, relatórios e o que a sua rotina precisar." },
      { icone: "📱", titulo: "Aplicativos", texto: "Apps Android e WebApps que se instalam no celular, com a cara da sua marca." },
      { icone: "🍽️", titulo: "Cardápios digitais", texto: "Cardápio online com pedidos pelo WhatsApp e painel para a loja acompanhar tudo." },
      { icone: "🔧", titulo: "Manutenção e suporte", texto: "Atualizações, correções e melhorias contínuas nos seus sistemas." },
      { icone: "🚀", titulo: "SEO e performance", texto: "Site mais rápido e mais bem posicionado no Google." }
    ]
  },
  projetos: {
    etiqueta: "Projetos no ar", titulo: "Veja funcionando", subtitulo: "Cardápios digitais que desenvolvemos e que estão recebendo pedidos agora.",
    itens: [
      { nome: "La Brasa Steakhouse", texto: "Cardápio delivery, tablets nas mesas e painel de pedidos", link: "https://labrasa.site", imagem: "assets/cli-labrasa-card.jpg" },
      { nome: "Esfirras em Casa", texto: "Cardápio delivery com pedidos no WhatsApp e painel de pedidos", link: "EsfirrasEmCasa/", imagem: "assets/cli-esfirras.jpg" },
      { nome: "Pizzaria Fiorella", texto: "Cardápio delivery, montagem de pizza e painel com nota fiscal", link: "PizzariaFiorella/", imagem: "assets/cli-fiorella.jpg" },
      { nome: "Gatini", texto: "Cardápio digital com pedidos online", link: "Gatini/", imagem: "assets/cli-gatini.png" },
      { nome: "Nosso Açaí", texto: "Cardápio para montar o açaí e painel de pedidos", link: "NossoAcai/", imagem: "assets/cli-nossoacai.jpg" }
    ]
  },
  planos: {
    mostrar: false, // seção nova: só aparece no site quando ligada no painel
    etiqueta: "Planos", titulo: "Cardápio digital com painel", subtitulo: "Mensalidade fixa, sem taxa de implantação.",
    itens: [
      { nome: "Básico", preco: "R$ 179,90", periodo: "/mês", destaque: false, itens: ["Cardápio digital com pedidos", "Painel de pedidos e produtos", "Suporte pelo WhatsApp"] },
      { nome: "Com NF-e", preco: "R$ 279,90", periodo: "/mês", destaque: true, itens: ["Tudo do Básico", "Emissão de nota fiscal (NFC-e)", "Relatórios de vendas"] },
      { nome: "Plus", preco: "Consulte", periodo: "", destaque: false, itens: ["Tudo do Com NF-e", "Tablets nas mesas", "Projeto sob medida"] }
    ]
  },
  passos: {
    etiqueta: "Como trabalhamos", titulo: "Simples, do começo ao fim",
    itens: [
      { titulo: "Conversa", texto: "Você conta a ideia e o que precisa resolver. Pode ser pelo WhatsApp." },
      { titulo: "Proposta", texto: "Enviamos o orçamento com o que será feito e o prazo combinado." },
      { titulo: "Desenvolvimento", texto: "Você acompanha versões de teste e aprova antes de ir ao ar." },
      { titulo: "Entrega e suporte", texto: "Colocamos no ar e seguimos com suporte e melhorias." }
    ]
  },
  clientes: {
    etiqueta: "Clientes", titulo: "Empresas que confiam na MsSoftware",
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
  perguntas: {
    etiqueta: "Dúvidas", titulo: "Perguntas frequentes",
    itens: [
      { pergunta: "Quanto custa um projeto?", resposta: "Cada projeto é orçado conforme o que o seu negócio precisa. Chame no WhatsApp e receba um orçamento sem compromisso." },
      { pergunta: "Quanto tempo leva para ficar pronto?", resposta: "Depende do tamanho do projeto. O prazo é combinado já no orçamento, e você acompanha cada etapa." },
      { pergunta: "Funciona no celular?", resposta: "Sim. Tudo é feito para funcionar bem no celular, no tablet e no computador." },
      { pergunta: "Consigo alterar informações sozinho?", resposta: "Nos sistemas com painel administrativo, você mesmo altera produtos, preços, fotos e configurações." },
      { pergunta: "E depois que o projeto é entregue?", resposta: "Seguimos juntos: oferecemos suporte, correções e melhorias contínuas." }
    ]
  },
  chamada: { titulo: "Pronto para tirar a sua ideia do papel?", texto: "Conte o que você precisa e receba um orçamento sem compromisso.", botao: "💬 Falar no WhatsApp" },
  rodape: { texto: "Sites, sistemas e aplicativos sob medida para a sua empresa." }
};

// ---------- utilitários ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lista = (v) => (Array.isArray(v) ? v : []);
// mistura o conteúdo salvo com o padrão (campo que faltar no banco usa o de fábrica)
export function completar(salvo) {
  const out = {};
  for (const [k, v] of Object.entries(PADRAO)) {
    const s = salvo?.[k];
    out[k] = Array.isArray(v) ? (Array.isArray(s) ? s : v)
      : (v && typeof v === "object") ? { ...v, ...(s && typeof s === "object" ? s : {}) } : (s ?? v);
  }
  return out;
}
const linkZap = (c) => `https://wa.me/${String(c.whatsapp || "").replace(/\D/g, "")}${c.mensagem ? `?text=${encodeURIComponent(c.mensagem)}` : ""}`;

// ---------- desenho das seções ----------
const cab = (s, extra = "") => `
  <div class="text-center max-w-2xl mx-auto mb-12 surgir ${extra}">
    ${s.etiqueta ? `<span class="etiqueta">${esc(s.etiqueta)}</span>` : ""}
    <h2 class="text-3xl sm:text-4xl font-extrabold mt-2">${esc(s.titulo)}</h2>
    ${s.subtitulo ? `<p class="suave mt-3">${esc(s.subtitulo)}</p>` : ""}
  </div>`;

const SECOES = {
  inicio: (d) => `
    <div class="grade-fundo absolute inset-0 pointer-events-none"></div>
    <div class="relative max-w-6xl mx-auto px-5 text-center">
      ${d.topo.chip ? `<span class="chip inline-block mb-6">${esc(d.topo.chip)}</span>` : ""}
      <h1 class="font-extrabold tracking-tight leading-tight" style="font-size:clamp(1.9rem, 8.4vw, 3.75rem)">
        ${esc(d.topo.titulo)}<br class="hidden sm:block">
        <span style="color:var(--destaque)">${esc(d.topo.destaque)}</span>
      </h1>
      <p class="suave-topo text-lg sm:text-xl max-w-2xl mx-auto mt-6">${esc(d.topo.subtitulo)}</p>
      <div class="flex flex-wrap justify-center gap-3 mt-10">
        <a href="${esc(linkZap(d.contato))}" target="_blank" rel="noopener" class="btn btn-primario text-lg">${esc(d.topo.botao)}</a>
        ${d.topo.botao2 ? `<a href="#projetos" class="btn btn-contorno text-lg">${esc(d.topo.botao2)}</a>` : ""}
      </div>
    </div>`,
  diferenciais: (d) => `
    <div class="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
      ${lista(d.diferenciais).map((x) => `
      <div class="cartao p-7 surgir"><div class="icone mb-4">${esc(x.icone)}</div>
        <h3 class="text-lg font-bold mb-2">${esc(x.titulo)}</h3><p class="suave">${esc(x.texto)}</p></div>`).join("")}
    </div>`,
  servicos: (d) => `
    <div class="max-w-6xl mx-auto">${cab(d.servicos)}
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        ${lista(d.servicos.itens).map((x) => `
        <div class="cartao cartao-hover p-7 surgir"><div class="icone mb-4">${esc(x.icone)}</div>
          <h3 class="text-lg font-bold mb-2">${esc(x.titulo)}</h3><p class="suave">${esc(x.texto)}</p></div>`).join("")}
      </div></div>`,
  projetos: (d) => {
    const it = lista(d.projetos.itens);
    const col = it.length >= 5 ? "lg:grid-cols-5" : it.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";
    return `
    <div class="max-w-6xl mx-auto">${cab(d.projetos)}
      <div class="grid sm:grid-cols-2 ${col} gap-5">
        ${it.map((x) => `
        <a href="${esc(x.link || "#")}" target="_blank" rel="noopener" class="cartao cartao-hover p-4 block surgir">
          <div class="projeto-logo">${x.imagem ? `<img src="${esc(x.imagem)}" alt="${esc(x.nome)}" loading="lazy">` : ""}</div>
          <h3 class="font-bold mt-4">${esc(x.nome)}</h3>
          <p class="suave text-sm">${esc(x.texto)}</p>
          <p class="link-projeto text-sm mt-3">${esc(x.chamada || "Ver cardápio →")}</p>
        </a>`).join("")}
      </div></div>`;
  },
  planos: (d) => `
    <div class="max-w-6xl mx-auto">${cab(d.planos)}
      <div class="grid md:grid-cols-3 gap-6 items-stretch">
        ${lista(d.planos.itens).map((x) => `
        <div class="cartao p-7 surgir flex flex-col" ${x.destaque ? 'style="border:2px solid var(--primaria)"' : ""}>
          ${x.destaque ? '<span class="etiqueta mb-2">Mais escolhido</span>' : ""}
          <h3 class="text-xl font-bold">${esc(x.nome)}</h3>
          <p class="mt-3"><span class="text-3xl font-extrabold">${esc(x.preco)}</span><span class="suave">${esc(x.periodo || "")}</span></p>
          <ul class="mt-5 space-y-2 suave flex-1">${lista(x.itens).map((i) => `<li>✓ ${esc(i)}</li>`).join("")}</ul>
          <a href="${esc(linkZap({ ...d.contato, mensagem: `Olá! Tenho interesse no plano ${x.nome}.` }))}" target="_blank" rel="noopener"
             class="btn ${x.destaque ? "btn-primario" : "border"} mt-6" ${x.destaque ? "" : 'style="border-color:var(--borda)"'}>Quero este</a>
        </div>`).join("")}
      </div></div>`,
  "como-trabalhamos": (d) => `
    <div class="max-w-6xl mx-auto">${cab(d.passos)}
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        ${lista(d.passos.itens).map((x, i) => `
        <div class="cartao p-7 surgir"><div class="num mb-4">${i + 1}</div>
          <h3 class="font-bold mb-1">${esc(x.titulo)}</h3><p class="suave text-sm">${esc(x.texto)}</p></div>`).join("")}
      </div></div>`,
  clientes: (d) => `
    ${cab(d.clientes, "mb-10 px-5").replace("mb-12 ", "")}
    <div class="faixa-logos py-4"><div class="trilho" id="trilho">
      ${lista(d.clientes.logos).map((x) => `<img src="${esc(x.imagem)}" alt="${esc(x.nome)}" loading="lazy"${x.inteira ? ' style="object-fit:contain;padding:6px"' : ""}>`).join("")}
    </div></div>`,
  perguntas: (d) => `
    <div class="max-w-3xl mx-auto">${cab(d.perguntas, "mb-10").replace("mb-12 ", "")}
      <div class="space-y-3">
        ${lista(d.perguntas.itens).map((x) => `
        <details class="cartao p-5 surgir">
          <summary class="flex items-center justify-between gap-4 font-semibold">${esc(x.pergunta)}<span class="seta">+</span></summary>
          <p class="suave mt-3">${esc(x.resposta)}</p></details>`).join("")}
      </div></div>`,
  chamada: (d) => `
    <h2 class="text-3xl font-extrabold">${esc(d.chamada.titulo)}</h2>
    <p class="mt-3 opacity-80">${esc(d.chamada.texto)}</p>
    <a href="${esc(linkZap(d.contato))}" target="_blank" rel="noopener" class="btn mt-8 bg-white text-blue-700 hover:bg-blue-50 text-lg">${esc(d.chamada.botao)}</a>`
};

function aplicar(d) {
  for (const [id, fn] of Object.entries(SECOES)) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = fn(d);
  }
  document.getElementById("planos")?.classList.toggle("hidden", !d.planos.mostrar);
  document.querySelectorAll("[data-menu-planos]").forEach((a) => a.classList.toggle("hidden", !d.planos.mostrar));
  // contatos espalhados pela página (cabeçalho, menu, botão flutuante, rodapé)
  document.querySelectorAll("[data-zap]").forEach((a) => (a.href = linkZap(d.contato)));
  const zt = document.getElementById("rodapeZap");
  if (zt) { zt.href = `https://wa.me/${String(d.contato.whatsapp).replace(/\D/g, "")}`; zt.textContent = `💬 WhatsApp ${d.contato.whatsappTexto || ""}`; }
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
  if (!trilho) return;
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
