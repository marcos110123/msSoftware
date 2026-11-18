// =====================================================================
// CONFIGURAÇÕES DA LOJA — altere aqui, sem mexer no resto do sistema
// =====================================================================

export const firebaseConfig = {
  apiKey: "AIzaSyCP2R5O1Fzm28U68jKCfJ0Mmt7r0boIIeA",
  authDomain: "gabs-teste.firebaseapp.com",
  projectId: "gabs-teste",
  storageBucket: "gabs-teste.firebasestorage.app",
  messagingSenderId: "80535000481",
  appId: "1:80535000481:web:b5081046e102f4c12127e0"
};

export const LOJA = {
  // senha pedida para abrir Relatórios e Vendas (como no painel antigo)
  senhaRelatorios: "1234",
  // senha pedida para abrir a Emissão de nota (NFC-e) (como no painel antigo)
  senhaNotaFiscal: "1234",
  nome: "Gab's Pizzaria & Esfiharia",
  subtitulo: "Painel de pedidos (teste)",
  logo: "img/logo-gabs.png",
  // links de cardápio que aparecem no menu do topo
  cardapios: [
    { nome: "Cardápio delivery", url: "https://mssoftware.com.br/GabsTeste/" }
  ],
  // usada enquanto nenhuma chave for salva no painel (config/pix)
  chavePixPadrao: "(chave PIX de teste)",
  // senha pedida para cancelar um pedido (como no painel antigo)
  senhaCancelamento: "1234",
  taxaServico: 0.05,       // 5% das mesas
  isentoTaxaPadrao: true,  // "Não cobrar taxa de serviço" já vem marcado (como no painel antigo)
  imprimirComprovanteBaixaParcial: false, // o painel antigo da pizzaria não imprimia
  historicoComandas: 20,   // quantas comandas aparecem no histórico das mesas
  // "dia" da tela de pedidos vai até 05:59 do dia seguinte (como no painel antigo)
  horaFimDoDia: 29
};

// Páginas do menu do topo (a ordem aqui é a ordem na tela)
export const PAGINAS = [
  { id: "pedidos",    nome: "Pedidos",      icone: "📋", href: "admin.html" },
  { id: "nfce",       nome: "Emitir nota",  icone: "🧾", href: "emissaonfc.html" },
  { id: "produtos",   nome: "Produtos",     icone: "📦", href: "admin-produtos.html" },
  { id: "relatorios", nome: "Relatórios",   icone: "📊", href: "relatorios.html" },
  { id: "historico",  nome: "Histórico",  icone: "🗂️", href: "historico.html" },
  { id: "vendas",     nome: "Vendas",       icone: "📈", href: "vendas-produtos.html" }
];

// Mensagens de WhatsApp enviadas pelo painel de pedidos
export const MENSAGENS = {
  delivery: "Olá! Recebemos seu pedido e ele está sendo preparado. Em breve sairá para entrega. Obrigado por escolher o GAB'S!",
  retirada: "Olá! Recebemos seu pedido e ele já está sendo preparado. Assim que estiver pronto, avisaremos para retirada no balcão!",
  saiu: "Olá! Seu pedido ACABA DE SAIR para entrega! Em breve chegará até você. Obrigado pela preferência!",
  pronto: "Olá! Seu pedido está PRONTO para retirada! Pode vir buscá-lo quando desejar.",
  pix: (chave) => `Segue a chave PIX para pagamento:\n\n${chave}\n\nEnvie o comprovante para liberação do pedido.`
};

// Categorias de produto (id gravado no Firebase → nome exibido)
// precosPG: a categoria usa preço P e G (campos "preco P" e "preco G") em vez de um preço só
export const CATEGORIAS = [
  { id: "entradas",        nome: "Esfihas" },
  { id: "massas",          nome: "Calzones" },
  { id: "combos",          nome: "Combos" },
  { id: "pizzas-salgadas", nome: "Pizzas", precosPG: true },
  { id: "pizzas-doces",    nome: "Pizzas Doces",    precosPG: true },
  { id: "bebidas",         nome: "Bebidas" },
  { id: "cervejas",        nome: "Cervejas" }
];

// Imagem usada quando um produto novo é cadastrado sem foto (como no painel antigo)
export const IMAGEM_PADRAO_PRODUTO = "img/logo-gabs.png";

// Nota fiscal (NFC-e)
export const NFCE = {
  urlEmissao: "",
  demonstracao: true, // amostra: a tela funciona, mas não emite nota nenhuma
  urlConsulta: "https://www.nfce.fazenda.sp.gov.br/consulta"
};

// Fotos dos produtos enviadas pelo painel (Firebase Storage)
// ativo: false esconde o botão de enviar foto (ex.: enquanto o Storage não estiver ligado no Firebase)
export const FOTOS = {
  ativo: false,
  pasta: "produtos",     // pasta no Storage (a mesma das regras de segurança)
  larguraMaxima: 900,    // px — a foto é reduzida antes de enviar
  qualidade: 0.8         // 0 a 1 (WebP)
};
