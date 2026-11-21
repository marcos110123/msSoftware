// =====================================================================
// CONFIGURAÇÕES DO CARDÁPIO — Quintal do Pastel (Sales/SP)
// =====================================================================

// Firebase do cliente (projeto quintaldopastel-a765c, criado pelo usuário em 19/11/2026)
export const firebaseConfig = {
  apiKey: "AIzaSyDYWhMJOmIg8mG3tBLA0bryGjH_709NXhY",
  authDomain: "quintaldopastel-a765c.firebaseapp.com",
  projectId: "quintaldopastel-a765c",
  storageBucket: "quintaldopastel-a765c.firebasestorage.app",
  messagingSenderId: "855920040539",
  appId: "1:855920040539:web:91672a842b8f8dc1a73d7e",
};

export const LOJA = {
  nome: "Quintal do Pastel",
  subtitulo: "Pastelaria e dogueria gourmet",
  whats: "5517996322658",                       // WhatsApp da loja (do site comercio.top) — CONFIRMAR
  endereco: "Av. Ramilo Sales, 942 · Centro · Sales/SP",
  instagram: "quintaldopastel_sales",
  coracao: "🧡",
  taxaPadrao: 3,              // só se config/entrega.taxaEntrega sumir (no Firebase: R$ 3,00)
  // taxa por região (mesmas regiões da La Brasa; Cidade R$ 3 — pedido do usuário 20/11).
  // Valem enquanto o painel não salvar config/entrega.bairros (lá o dono edita).
  bairrosPadrao: [
    { nome: "Cidade", taxa: 3 }, { nome: "Cervinho", taxa: 10 }, { nome: "Irapuã", taxa: 15 },
    { nome: "Baobá", taxa: 20 }, { nome: "Eco Park", taxa: 20 }, { nome: "Lago Azul", taxa: 20 },
    { nome: "Richileu", taxa: 20 }, { nome: "Riviera", taxa: 20 }, { nome: "Torres", taxa: 20 },
    { nome: "Morumbi", taxa: 25 },
  ],
  tempoPadrao: "40–60 min",   // usada enquanto config/entrega.tempoEntrega não for gravada
  pixPadrao: "",              // usada enquanto config/pix.chave não for gravada
  destaqueId: "", // cartão grande "Destaque da casa" DESLIGADO (21/11, pedido do usuário); fica só o carrossel dos mais pedidos. Para voltar: "lanches-x-gaucho"
  totalMesas: 20,             // QR code das mesas: ?mesa=1 até ?mesa=20 (número fora disso é ignorado)
};
