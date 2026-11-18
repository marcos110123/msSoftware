// =====================================================================
// IMPRESSÃO DAS COMANDAS
// ---------------------------------------------------------------------
// Código COPIADO SEM ALTERAÇÕES do painel antigo (admin.html e pedidos.html),
// para que a cozinha e o caixa recebam exatamente o mesmo formato de sempre.
// Únicas mudanças: "export", e as chamadas a loadOrders() foram removidas
// (na v2 a lista de pedidos se atualiza sozinha em tempo real).
// Para mudar o layout do papel, edite os templates HTML abaixo.
// Segurança: o texto do pedido passa por protegerParaImpressao() (fim do arquivo).
// =====================================================================
export const mapaCategoriasFixas = {
          
          "🔔 Chamou o Garçom": "🙋‍♂️🙋‍♂️🙋‍♂️",
         
        };

export const detectarCategoria = (nome) => {
 const base = nome.split(" - ")[0].trim();

  // Primeiro tenta pelo mapa fixo
  if (mapaCategoriasFixas[base]) {
    return mapaCategoriasFixas[base];
  }

  // Regras dinâmicas (nomes compostos, personalizados etc)
  const lower = base.toLowerCase();

   // 🍕 PIZZA
  if (base.startsWith("Pizza")) return "🍕 PIZZA";

  // 🍔 LANCHE
  if (base.startsWith("Hambúrguer") || base.startsWith("Lanche"))
    return "🍔 LANCHE";

    // 🌭 DOG
  if (base.startsWith("Dog") || base.startsWith("Hot Dog")) 
    return "🌭 DOG";

  // 🥃 DOSE — apenas se tiver explicitamente "dose" ou "shot"
  if (lower.includes("dose") || lower.includes("shot")) {
    return "🥃 DOSE";
  }

  // 🍹 DRINK — se contiver termos alcoólicos mas **sem** "dose"/"shot"
  if (
    lower.includes("gin") ||
    lower.includes("vodka") ||
    lower.includes("saquê") ||
    lower.includes("pinga") ||
    lower.includes("rum") ||
    lower.includes("cachaça") ||
    lower.includes("batida") ||
    lower.includes("drink") ||
    lower.includes("caipirinha") ||
    lower.includes("caipiroska") ||
    lower.includes("spritz") ||
    lower.includes("mojito")
  ) {
    return "🍹 DRINK";
  }

 

  // 🥤 BEBIDA
  if (
    lower.startsWith("refrigerante") ||
    lower.startsWith("suco") ||
    lower.startsWith("água")
  )
    return "🥤 BEBIDA";

  // 🍽️ JANTAR
  if (
    lower.startsWith("jantar") ||
    lower.startsWith("prato") ||
    lower.startsWith("filé") ||
    lower.startsWith("picanha")
  )
    return "🍽️ JANTAR";

  // 🍨 SOBREMESA
  if (lower.startsWith("sobremesa") || lower.includes("milkshake"))
    return "🍨 SOBREMESA";

  // 📦 OUTRO
  return "📦 OUTRO";
};

function imprimirPedidoOriginal(pedido, pedidoId) {
  const mesa = pedido.mesa || "";
  const time = new Date(pedido.createdAt?.toDate?.()).toLocaleString();
  const itemsList = pedido.items || [];
  
// ===============================
// CONTADOR DE COMANDAS DO DIA
// ===============================
const hoje = new Date().toISOString().split("T")[0];

const dataContador = localStorage.getItem("dataContadorComandas");

if (dataContador !== hoje) {
  localStorage.setItem("dataContadorComandas", hoje);
  localStorage.setItem("contadorComandas", "0");
  localStorage.setItem("mapaComandas", JSON.stringify({}));
}

let mapaComandas = JSON.parse(
  localStorage.getItem("mapaComandas") || "{}"
);

let numeroComanda;

// Se já existe número para esse pedido, reutiliza
if (mapaComandas[pedidoId]) {
  numeroComanda = mapaComandas[pedidoId];
} else {
  let contadorComandas = parseInt(
    localStorage.getItem("contadorComandas") || "0"
  );

  contadorComandas++;

  localStorage.setItem(
    "contadorComandas",
    contadorComandas.toString()
  );

  numeroComanda = contadorComandas;

  mapaComandas[pedidoId] = numeroComanda;

  localStorage.setItem(
    "mapaComandas",
    JSON.stringify(mapaComandas)
  );
}


const comandaFmt = String(numeroComanda).padStart(3, "0");


  const nomeCliente = pedido.nomeCliente || pedido.cliente || "";
  const telefoneCliente = pedido.telefoneCliente || pedido.telefone || "";
  const enderecoCliente = pedido.enderecoCliente || pedido.endereco || "";

  let tipoPedido = "🏃‍♂️ RETIRADA BALCÃO";
  if (enderecoCliente) {
    tipoPedido = "📦 DELIVERY";
  } else if (mesa) {
    tipoPedido = `🍽️ MESA ${mesa}`;
  }

  const linhaNome = nomeCliente ? `<p class="info">👤 ${nomeCliente}</p>` : "";
  const linhaTelefone = telefoneCliente ? `<p class="info">📞 ${telefoneCliente}</p>` : "";
  const linhaEndereco = enderecoCliente ? `<p class="info">📍 ${enderecoCliente}</p>` : "";

  const formaPagamento = pedido.formaPagamento
    ? `<p class="info">💳 Pagamento: ${pedido.formaPagamento}</p>` : "";

  const precisaTroco = pedido.precisaTroco === true && pedido.valorTroco
    ? `<p class="info">💵 Troco para: R$ ${parseFloat(pedido.valorTroco).toFixed(2)}</p>`
    : pedido.precisaTroco === false
      ? `<p class="info">💵 Sem troco</p>` 
      : "";

  const regiao = pedido.bairro || pedido.regiao
    ? `<p class="info">📌 Região: ${pedido.bairro || pedido.regiao}</p>` : "";

    function formatarNomeProduto(nome) {
  return (nome || "")
    .replace(/\bPizza\s+G\b/gi, "Pizza Grande")
    .replace(/\bPizza\s+P\b/gi, "Pizza Pequena")
    .trim();
}

function parseIngredientesComQuantidade(nomePrincipal) {
  let ingredientesExtra = [];
  const match = nomePrincipal.match(/\((.*)\)/);
  if (match) {
    const conteudo = match[1].trim();
    let atual = "";
    let nivelParenteses = 0;

    for (let char of conteudo) {
      if (char === "(") {
        nivelParenteses++;
        atual += char;
      } else if (char === ")") {
        nivelParenteses--;
        atual += char;
      } else if (char === "," && nivelParenteses === 0) {
        ingredientesExtra.push(atual.trim());
        atual = "";
      } else {
        atual += char;
      }
    }

    if (atual.trim()) ingredientesExtra.push(atual.trim());
    nomePrincipal = nomePrincipal.replace(match[0], "").trim();
  }

  // Extrai quantidade de cada ingrediente se existir
  const ingredientesComQtd = ingredientesExtra.map(ing => {
    const matchQtd = ing.match(/(.+)\s+x(\d+)/i);
    if (matchQtd) {
      return { nome: matchQtd[1].trim(), quantidade: parseInt(matchQtd[2]) };
    } else {
      return { nome: ing, quantidade: 1 };
    }
  });

  return { nomePrincipal, ingredientesExtra: ingredientesComQtd };
}


if (mesa) {

  const itensHTML = itemsList.map(item => {
    const qtd = parseInt(item.quantidade) || 1;
    const subtotal = parseFloat(item.subtotal || 0).toFixed(2);

   
  const nome = formatarNomeProduto(item.nome);
  const obs = (item.observacao || "").trim();

    return `
      <div style="margin-bottom:6px;">
        <div style="font-weight:bold;">
          ${qtd}x ${nome}
        </div>

        ${obs ? `
  <div style="
    font-size:20px;
    font-weight:900;
    border:1px dashed #000;
    padding:2px 4px;
    margin:2px 0;
    display:inline-block;
  ">
    OBS: ${obs}
  </div>
` : ""}

        <div style="font-size:14px;">
          R$ ${subtotal}
        </div>
      </div>
    `;
  }).join("");

  const totalMesa = itemsList.reduce((acc, item) => {
  return acc + (parseFloat(item.subtotal) || 0);
}, 0).toFixed(2);

  const conteudo = `
  <html>
  <head>
    <style>
      @page { margin: 0; }
     body { 
  font-family: monospace; 
  width: 300px; 
  margin: 0;
  padding: 0 0 0 5px;   /* 👈 puxa tudo levemente pra esquerda */
  font-size: 21px;
}

h2 { 
  text-align: left;      /* 👈 tira centralização */
  margin:8px 0; 
  font-size:16px; 
  font-weight:bold;
}


      hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
      .center { text-align: center; }
    </style>
  </head>
  <body>

    <h2>GAB'S PIZZARIA & ESFIHARIA</h2>

 <p style="
  font-size:16px;
  font-weight:bold;
  margin:2px 0;
">
  COMANDA #${comandaFmt}
</p>
    <hr>

    <p><strong>🍽️ MESA ${mesa}</strong></p>
<p>${time}</p>


    <hr>

    ${itensHTML}

    <hr>

    <p style="font-size:19px; font-weight:bold;">
      TOTAL: R$ ${totalMesa}
    </p>

  </body>
  </html>
  `;


  const win = window.open("", "", "width=250,height=350");
  win.document.write(conteudo);
  win.document.close();

  win.onload = () => {
    win.focus();
    win.print();
    win.close();
  };

  /* (v2: a lista se atualiza sozinha) */
  return;
}
// 📦 DELIVERY / 🏃‍♂️ RETIRADA 

// 💰 Total produtos
const totalProdutos = itemsList.reduce((acc, item) => {
  return acc + (parseFloat(item.subtotal) || 0);
}, 0);

const taxa = parseFloat(pedido.taxaEntrega) || 0;
const totalFinal = (totalProdutos + taxa).toFixed(2);

// 💳 Forma de pagamento
const formaPagamentoHTML = pedido.formaPagamento
  ? `
    <p style="font-weight:bold;">
      💳 PAGAMENTO: ${pedido.formaPagamento}
    </p>
  `
  : "";

// 🧾 Lista itens
const itensHTML = itemsList.map(item => {

  const qtd = parseInt(item.quantidade) || 1;
  const subtotal = parseFloat(item.subtotal || 0).toFixed(2);

  const nome = formatarNomeProduto(item.nome);
  const obs = (item.observacao || "").trim();

  return `
    <div style="margin-bottom:6px;">
      <div style="font-weight:bold;">
        ${qtd}x ${nome}
      </div>

     ${obs ? `
  <div style="
    font-size:20px;
    font-weight:900;
    border:1px dashed #000;
    padding:2px 4px;
    margin:2px 0;
    display:inline-block;
  ">
    OBS: ${obs}
  </div>
` : ""}

      <div style="font-size:14px;">
        R$ ${subtotal}
      </div>
    </div>
  `;
}).join("");

// 💵 Troco
let linhaTroco = "";
if (pedido.precisaTroco && pedido.valorTroco) {

  const valorPago = parseFloat(pedido.valorTroco);
  const troco = (valorPago - totalFinal).toFixed(2);

  if (!isNaN(troco) && troco >= 0) {
    linhaTroco = `
      <p>Troco para: R$ ${valorPago.toFixed(2)}</p>
<p><strong>TROCO: R$ ${troco}</strong></p>

    `;
  }
}
const conteudoFinal = `
<html>
<head>
<style>
  @page { margin:0; }

  body{
    font-family: monospace;
    width:320px;
    margin:0;
    padding:4px;
    font-size:21px;
    color:#000;
  }

  h2{
    text-align:center;
    margin:2px 0;
    font-size:18px;
    font-weight:bold;
    letter-spacing:1px;
  }

  hr{
    border:none;
    border-top:1px dashed #000;
    margin:6px 0;
  }

  p{
    margin:2px 0;
  }

  .comanda{
    text-align:center;
    font-size:18px;
    font-weight:bold;
    border:2px solid #000;
    padding:4px 0;
    margin:6px 0;
  }

  .tipo{
    border:2px solid #000;
    text-align:center;
    font-weight:bold;
    font-size:20px;
    padding:4px 0;
    margin-bottom:6px;
  }

  .info{
    font-size:18px;
    line-height:1.3;
  }

  .pagamento{
    font-size:15px;
    margin-top:6px;
  }

  table{
    width:100%;
    border-collapse:collapse;
  }

  td{
    padding:2px 0;
  }

  .right{
    text-align:right;
  }

  .total{
    display:flex;
    justify-content:space-between;
    align-items:center;

    margin-top:10px;
    padding:10px 0;

    border-top:2px solid #000;
    border-bottom:2px solid #000;

    font-size:20px;
    font-weight:bold;
  }

  .troco{
    margin-top:10px;
    border:2px solid #000;
    padding:8px;
    text-align:center;
    font-size:22px;
    font-weight:bold;
  }

</style>
</head>

<body>

<h2>GAB'S PIZZARIA & ESFIHARIA</h2>

<div class="comanda">
    COMANDA #${comandaFmt}
</div>

<div class="tipo">
    ${tipoPedido}
</div>

<div class="info">

    <p>${time}</p>

    ${linhaNome}
    ${linhaTelefone}
    ${linhaEndereco}

</div>

<hr>

${itensHTML}

${taxa > 0 ? `
<hr>

<table>
    <tr>
        <td><strong>Taxa Entrega</strong></td>
        <td class="right">R$ ${taxa.toFixed(2)}</td>
    </tr>
</table>
` : ""}

${formaPagamentoHTML ? `
<hr>

<div class="pagamento">
    ${formaPagamentoHTML}
</div>
` : ""}

<div class="total">
    <span>TOTAL</span>
    <span>R$ ${totalFinal}</span>
</div>

${linhaTroco ? `
<div class="troco">
    💰 ${linhaTroco}
</div>
` : ""}

</body>
</html>
`;

const win = window.open("", "", "width=250,height=350");
win.document.write(conteudoFinal);
win.document.close();
win.onload = () => {
  win.focus();
  win.print();
  win.close();
};
/* (v2: a lista se atualiza sozinha) */

}

// Comanda da mesa (tela de Mesas)
function imprimirComandaOriginal(comandaAtual) {
          const texto = comandaAtual.replace(/_/g, " ").trim();

          const linhas = texto.split("\n");
          const linhasComSeparador = [];

          for (let linha of linhas) {
            linhasComSeparador.push(linha);
            if (
              linha.startsWith("-") &&
              !linha.toLowerCase().includes("total") &&
              !linha.toLowerCase().includes("pagamento") &&
              !linha.toLowerCase().includes("taxa") &&
              !linha.toLowerCase().includes("desconto")
            ) {
              linhasComSeparador.push("-------------");
            }
          }

          const textoFormatado = linhasComSeparador.join("\n");

          const conteudo = `
    <html>
      <head>
        <title>Comanda</title>
        <style>
          @page {
            size: auto;
            margin: 0;
          }

          * {
            font-family: monospace;
            font-size: 13px;
          }

          body {
            width: 170px;
            padding-left: 5px;
            padding-right: 5px;
            margin: 0 auto;
          }

          pre {
            white-space: pre-wrap;
            word-break: break-word;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <pre>
   Gab's Pizzaria & Esfiharia
─────── COMANDA ───────

${textoFormatado}

──────────────────────
        </pre>
      </body>
    </html>
  `;

          const win = window.open("", "", "width=250,height=600");
          win.document.write(conteudo);
          win.document.close();
          win.focus();
          win.print();
          win.close();
        }


// Comprovante da baixa parcial (tela de Mesas)
function imprimirComprovanteBaixaParcialOriginal(dados) {
          const dataFormatada = dados.data.toLocaleString("pt-BR");

          let linhasItens = "";
          dados.itens.forEach((item) => {
            linhasItens += `- ${item.nome ?? "(Sem nome)"} x${item.quantidade} - R$ ${item.subtotal.toFixed(2)}\n`;
          });

          let linhasPagamento = "";
          if (dados.formaPagamento.cartao > 0) {
            linhasPagamento += `- Cartão: R$ ${dados.formaPagamento.cartao.toFixed(2)}\n`;
          }
          if (dados.formaPagamento.pix > 0) {
            linhasPagamento += `- Pix: R$ ${dados.formaPagamento.pix.toFixed(2)}\n`;
          }
          if (dados.formaPagamento.dinheiro > 0) {
            linhasPagamento += `- Dinheiro: R$ ${dados.formaPagamento.dinheiro.toFixed(2)}\n`;
          }

          let texto = `Mesa ${dados.mesa}\n`;
          texto += `${dataFormatada}\n\n`;
          texto += linhasItens;
          texto += `-------------\n`;
          texto += `Subtotal: R$ ${dados.subtotal.toFixed(2)}\n`;
          if (dados.taxaServico > 0) {
            texto += `Taxa de Serviço (5%): R$ ${dados.taxaServico.toFixed(2)}\n`;
          }
          if (dados.desconto > 0) {
            texto += `Desconto: - R$ ${dados.desconto.toFixed(2)}\n`;
          }
          texto += `TOTAL: R$ ${dados.total.toFixed(2)}\n`;
          if (linhasPagamento) {
            texto += `\nPagamento:\n${linhasPagamento}`;
          }

          const conteudo = `
    <html>
      <head>
        <title>Comprovante - Baixa Parcial</title>
        <style>
          @page {
            size: auto;
            margin: 0;
          }

          * {
            font-family: monospace;
            font-size: 13px;
          }

          body {
            width: 170px;
            padding-left: 5px;
            padding-right: 5px;
            margin: 0 auto;
          }

          pre {
            white-space: pre-wrap;
            word-break: break-word;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <pre>
   Gab's Pizzaria & Esfiharia
── BAIXA PARCIAL ──

${texto}
──────────────────────
        </pre>
      </body>
    </html>
  `;

          const win = window.open("", "", "width=250,height=600");
          win.document.write(conteudo);
          win.document.close();
          win.focus();
          win.print();
          win.close();
        }

// =====================================================================
// PROTEÇÃO DA IMPRESSÃO
// ---------------------------------------------------------------------
// Nome, endereço e observações são digitados pelo cliente no cardápio.
// Antes de imprimir, todo texto do pedido é convertido em "entidades HTML"
// (ex.: "<" vira "&#60;"): no papel sai exatamente igual, mas um texto
// malicioso nunca é executado como código dentro do painel.
// Usa códigos numéricos, que continuam válidos mesmo após .toUpperCase().
// =====================================================================
const escaparTexto = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function protegerParaImpressao(valor) {
  if (typeof valor === "string") return escaparTexto(valor);
  if (Array.isArray(valor)) return valor.map(protegerParaImpressao);
  // só objetos simples; Timestamp do Firebase, Date etc. passam como estão
  if (valor && typeof valor === "object" && Object.getPrototypeOf(valor) === Object.prototype) {
    const copia = {};
    for (const [chave, v] of Object.entries(valor)) copia[chave] = protegerParaImpressao(v);
    return copia;
  }
  return valor;
}

// Funções usadas pelo painel: protegem o texto e chamam a impressão original
export function imprimirPedido(pedido, pedidoId) {
  return imprimirPedidoOriginal(protegerParaImpressao(pedido), pedidoId);
}
export function imprimirComanda(comandaAtual) {
  return imprimirComandaOriginal(protegerParaImpressao(comandaAtual));
}
export function imprimirComprovanteBaixaParcial(dados) {
  return imprimirComprovanteBaixaParcialOriginal(protegerParaImpressao(dados));
}
