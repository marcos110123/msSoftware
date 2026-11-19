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
  tempoPadrao: "40–60 min",   // usada enquanto config/entrega.tempoEntrega não for gravada
  pixPadrao: "",              // usada enquanto config/pix.chave não for gravada
  destaqueId: "lanches-x-gaucho", // produto do cartão grande "Destaque da casa"
  totalMesas: 20,             // QR code das mesas: ?mesa=1 até ?mesa=20 (número fora disso é ignorado)
};
