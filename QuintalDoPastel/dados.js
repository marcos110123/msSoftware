// =====================================================================
// Cardápio do Quintal do Pastel (Sales/SP) — tirado de comercio.top/sp/quintaldopastelsales em 19/11/2026
// Fonte única: usado pelo carregar-cardapio.html (grava no Firebase) e pelo teste com Firebase simulado.
// Erros de digitação do site corrigidos. Itens a confirmar com a loja estão marcados com "CONFIRMAR".
// =====================================================================

// Categorias na ordem do cardápio. foto = imagem do topo da seção.
// adicionais: aceita os adicionais (opcoesLanche grupo "extras").
// direto: tocar no produto já põe 1 na sacola, sem a tela de opções/observação (pedido do usuário, 19/11).
export const CATEGORIAS = [
  { id: "lanches",           nome: "Lanches",          icone: "🍔", foto: "img/xgaucho.jpg", adicionais: true },
  { id: "hotdogs",           nome: "Hot dogs",         icone: "🌭", foto: "img/dog.jpg",     adicionais: true },
  { id: "pasteis-grandes",   nome: "Pastéis grandes",  icone: "🥟", foto: "img/pastel.jpg",  adicionais: true },
  { id: "pasteis-especiais", nome: "Pastéis especiais",icone: "⭐", foto: "img/pastel.jpg",  adicionais: true },
  { id: "pasteis-pequenos",  nome: "Pastéis pequenos", icone: "🥟", foto: "img/pastel.jpg",  adicionais: true },
  { id: "pasteis-doces",     nome: "Pastéis doces",    icone: "🍫", foto: "img/chocolate.jpg", direto: true },
  { id: "panquecas",         nome: "Panquecas",        icone: "🥞", foto: "", direto: true },
  { id: "porcoes",           nome: "Porções",          icone: "🍟", foto: "", direto: true },
  { id: "sucos",             nome: "Sucos naturais",   icone: "🍊", foto: "", direto: true },
  { id: "bebidas",           nome: "Bebidas",          icone: "🥤", foto: "", direto: true },
];

const CARNE = { titulo: "Escolha a carne", opcoes: ["Carne", "Frango", "Misto"] };

// [nome, descrição, preço, extras opcionais]
const L = {
  "lanches": [
    ["X-Gaúcho", "Pão gigante, hambúrguer artesanal, costela desfiada, bacon, ovos, presunto, molho especial da casa, mussarela, catupiry, ervilha, cebola, alface e tomate.", 90, { imagem: "img/xgaucho.jpg", maisVendido: true, selo: "GIGANTE" }],
    ["X-Podrão", "2 hambúrgueres, 2 salsichas, calabresa, carne seca, frango desfiado, presunto, mussarela, tomate, milho, batata palha, maionese, ketchup e mostarda Heinz.", 46, { maisVendido: true }],
    ["X-Dose Duplo", "Pão, 2 hambúrgueres, 2 ovos, bacon em dobro, alface, tomate, milho, 2 presuntos e 2 queijos.", 37],
    ["X-Tudo", "Pão, hambúrguer, bacon, ovo, alface, tomate, milho, presunto e queijo.", 31],
    ["X-Salada Bacon", "Pão, hambúrguer, bacon, alface, tomate, milho, presunto e queijo.", 29.5],
    ["X-Salada Egg", "Pão, hambúrguer, ovo, alface, tomate, milho, presunto e queijo.", 28.5],
    ["X-Egg Bacon", "Pão, hambúrguer, ovo, bacon, presunto e queijo.", 28],
    ["X-Egg", "Pão, hambúrguer, ovo, presunto e queijo.", 26.5],
    ["X-Bacon", "Pão, hambúrguer, bacon, presunto e queijo.", 26.5],
    ["X-Salada", "Pão, hambúrguer, alface, tomate, milho, presunto e queijo.", 25.5],
    ["X-Burguer", "Pão, hambúrguer, presunto e queijo.", 23.5],
    ["X-Catupiry", "Pão, hambúrguer, catupiry, milho, presunto e queijo.", 23],
    ["Combo Kids", "Pão, hambúrguer, batata frita e refrigerante.", 30],
  ],
  "hotdogs": [
    ["Hot Dog Quintal Gigante", "Pão de 80 cm, salsicha Perdigão, carne, frango, cupim, cheddar, alface, tomate, batata palha, maionese, ketchup e mostarda Heinz.", 90, { imagem: "img/doggigante.jpg", maisVendido: true, selo: "80 CM" }],
    ["Hot Dog Tradicional", "Pão 20 cm, salsicha Perdigão, carne, frango ou misto, batata palha, ketchup, maionese e mostarda Heinz.", 24, { imagem: "img/dog.jpg", escolha: CARNE, maisVendido: true }],
    ["Hot Dog Paulista", "Pão 20 cm, salsicha Perdigão, vinagrete, purê de batata, batata palha, ketchup, maionese e mostarda Heinz.", 24],
    ["Hot Dog Explosão", "Pão 20 cm, salsicha Perdigão, carne, frango ou misto, cheddar Polenghi, bacon e Doritos, ketchup, maionese e mostarda Heinz.", 32, { escolha: CARNE }],
    ["Hot Dog Supremo", "Pão 20 cm, salsicha Perdigão, catupiry, bacon, batata palha, ketchup, maionese e mostarda Heinz.", 32],
    ["Hot Burger", "Pão 20 cm, salsicha Perdigão, hambúrguer artesanal 150 g, mussarela, alface e batata palha.", 32],
    ["Dog Of King", "Pão 20 cm, salsicha Perdigão, hambúrguer artesanal 150 g, mussarela, bacon, catupiry, alface e batata palha.", 35],
    ["Hot Dog Palmito", "Pão 20 cm, palmito, salsicha Perdigão, catupiry, alho frito, ketchup e maionese Heinz.", 35],
    ["Hot Dog Realeza", "Pão 20 cm, salsicha Perdigão, hambúrguer artesanal 150 g, barbecue Heinz, cheddar, mussarela e anéis de cebola empanados.", 37],
    ["Dog Of Queen", "Pão 20 cm, 2 salsichas Perdigão, hambúrguer artesanal 150 g, mussarela, bacon, catupiry e alho frito.", 37],
    ["Hot Dog Carne Seca", "Pão 20 cm, salsicha Perdigão, carne seca desfiada, catupiry, alho frito, ketchup e maionese Heinz.", 37],
    ["Hot Dog Costela", "Pão 20 cm, salsicha Perdigão, costela desfiada, mussarela, batata palha, ketchup e maionese Heinz.", 37],
    ["Hot Dog Cupim", "Pão 20 cm, salsicha Perdigão, cupim desfiado, mussarela, batata palha, ketchup e maionese Heinz.", 37],
    ["Hot Dog Calabresa Especial", "Pão 20 cm, calabresa, salsicha Perdigão, catupiry, alho frito, ketchup e maionese Heinz.", 37],
    ["Hot Dog Big Crock", "Crosta de queijo com catupiry, salsicha Perdigão, costela, barbecue, ketchup, mostarda Heinz e molho da casa.", 40],
    ["Hot Dog Podrão", "2 hambúrgueres, 2 salsichas, calabresa, carne seca, frango desfiado, presunto, mussarela, alface, tomate, milho e batata palha.", 47],
  ],
  "pasteis-grandes": [
    ["Carne", "", 23.99, { imagem: "img/pastel.jpg" }],
    ["Carne com Queijo", "", 26.99, { maisVendido: true }], ["Carne com Requeijão", "", 26.99], ["Carne com Calabresa", "", 26.99],
    ["Carne com Frango", "", 26.99], ["Carne com Palmito", "", 26.99], ["Carne com Pizza", "", 26.99], ["Carne com Carne Seca", "", 26.99],
    ["Frango", "", 22.99], ["Frango com Queijo", "", 24.99], ["Frango com Requeijão", "", 24.99], ["Frango com Calabresa", "", 24.99],
    ["Frango com Carne", "", 25.99], ["Frango com Palmito", "", 24.99], ["Frango com Pizza", "", 24.99], ["Frango com Carne Seca", "", 24.99],
    ["Calabresa", "", 22.99], ["Calabresa com Queijo", "", 23.99], ["Calabresa com Requeijão", "", 23.99], ["Calabresa com Costela", "", 28.99],
    ["Calabresa com Carne", "", 25.99], ["Calabresa com Palmito", "", 24.99], ["Calabresa com Pizza", "", 24.99], ["Calabresa com Carne Seca", "", 25.99],
    ["Queijo", "", 27.99], ["Queijo com Requeijão", "", 26.99],
    ["Pizza", "Presunto, mussarela, orégano e tomate.", 24.99], ["Pizza com Requeijão", "Presunto, mussarela, orégano, tomate e requeijão.", 26.99],
    ["Brócolis com Queijo", "", 24.99], ["Brócolis com Requeijão", "", 26.99], ["Brócolis com Costela", "", 26.99], ["Brócolis com Carne", "", 26.99],
    ["Brócolis com Palmito", "", 26.99], ["Brócolis com Pizza", "", 26.99], ["Brócolis com Carne Seca", "", 26.99],
    ["Palmito", "", 22.99], ["Palmito com Queijo", "", 24.99], ["Palmito com Requeijão", "", 24.99], ["Palmito com Costela", "", 24.99],
    ["Palmito com Frango", "", 24.99], ["Palmito com Carne", "", 24.99], ["Palmito com Pizza", "", 24.99], ["Palmito com Carne Seca", "", 24.99],
    ["Pastel de Vento", "", 9.99],
  ],
  "pasteis-especiais": [
    ["Pastel Burguer", "Hambúrguer artesanal, presunto, mussarela, bacon, ovo, milho, alface, tomate, maionese, ketchup e mostarda Heinz.", 37.99, { maisVendido: true }],
    ["Costela Americana", "Costela, requeijão, salsicha, presunto, queijo, bacon, ovo cozido e azeitona.", 37.99],
    ["Cupim com Pizza", "Cupim, requeijão, salsicha, presunto, queijo, bacon, ovo cozido e azeitona.", 37.99],
    ["Portuguesa", "Carne, queijo, presunto, orégano, ovo cozido, milho, azeitona e tomate.", 35.99],
    ["Pastel da Casa", "Frango, queijo, bacon, requeijão, tomate e orégano.", 34.99],
    ["Costela Suprema", "Costela, cream cheese, bacon, cebola e molho.", 34.99],
    ["Brócolis Suprema", "Brócolis, frango, catupiry, bacon, tomate e milho.", 34.99],
    ["Carne Seca Suprema", "Carne seca, catupiry, tomate, cebola, milho e bacon.", 34.99],
    ["Frango Americano", "Frango, queijo, batata palha, requeijão, tomate, ovo cozido e azeitona.", 32.99],
    ["Vegetariano", "Brócolis, tomate seco, orégano e azeitona.", 26.99],
    ["Corinthiano", "Presunto, queijo e orégano.", 24.99],
    ["4 Queijos", "Mussarela, requeijão, cheddar e provolone.", 30.99],
    ["4 Queijos Portuguesa", "4 queijos, presunto, orégano, ovo cozido, milho, azeitona e tomate.", 35.99],
    ["4 Queijos Frango Americano", "4 queijos, frango, batata palha, tomate, milho, ovo cozido e azeitona.", 37.99],
    ["4 Queijos Vegetariano", "4 queijos, brócolis, tomate seco, orégano e azeitona.", 35.99],
    ["4 Queijos da Casa", "4 queijos, frango, bacon, azeitona, tomate e orégano.", 35.99],
    ["4 Queijos Corinthiano", "4 queijos, presunto e orégano.", 35.99],
    ["4 Queijos com Carne", "Mussarela, requeijão, cheddar, provolone e carne.", 30.99],
    ["4 Queijos com Calabresa", "Mussarela, requeijão, cheddar, provolone e calabresa fatiada.", 30.99],
    ["4 Queijos com Frango", "Mussarela, requeijão, cheddar, provolone e frango.", 30.99],
    ["4 Queijos com Carne Seca", "Mussarela, requeijão, cheddar, provolone e carne seca.", 30.99],
    ["4 Queijos com Costela", "Mussarela, requeijão, cheddar e costela desfiada.", 30.99],
    ["4 Queijos com Brócolis", "Mussarela, requeijão, provolone e brócolis.", 30.99],
    ["4 Queijos com Palmito", "Mussarela, requeijão, cheddar, provolone e palmito.", 30.99],
    ["4 Queijos com Cachorro-Quente", "4 queijos, salsicha, mussarela, maionese e batata palha (carne, frango ou misto).", 33.99, { escolha: CARNE }],
    ["Costela", "", 28.99], ["Costela com Queijo", "", 32.99], ["Costela com Requeijão", "", 30.99], ["Costela com Calabresa", "", 30.99],
    ["Costela com Carne", "", 30.99], ["Costela com Palmito", "", 30.99], ["Costela com Pizza", "", 30.99], ["Costela com Carne Seca", "", 30.99],
    ["Cupim", "", 28.99], ["Cupim com Queijo", "", 30.99], ["Cupim com Requeijão", "", 30.99], ["Cupim com Calabresa", "", 30.99],
    ["Cupim com Frango", "", 30.99], ["Cupim com Carne", "", 30.99], ["Cupim com Palmito", "", 30.99],
    ["Carne Seca", "", 28.99], ["Carne Seca com Queijo", "", 30.99], ["Carne Seca com Requeijão", "", 30.99], ["Carne Seca com Calabresa", "", 30.99],
    ["Carne Seca com Frango", "", 30.99], ["Carne Seca com Carne", "", 30.99], ["Carne Seca com Palmito", "", 30.99], ["Carne Seca com Pizza", "", 30.99],
  ],
  "pasteis-pequenos": [
    ["Carne (pequeno)", "", 18.99], ["Carne com Queijo (pequeno)", "", 23.99], ["Carne com Requeijão (pequeno)", "", 23.99],
    ["Carne com Pizza (pequeno)", "", 23.99], ["Carne com Palmito (pequeno)", "", 23.99], ["Frango (pequeno)", "", 19.99],
    ["Frango com Queijo (pequeno)", "", 22.99], ["Frango com Catupiry (pequeno)", "", 22.99], ["Frango com Pizza (pequeno)", "", 22.99],
    ["Calabresa (pequeno)", "", 18.99], ["Queijo (pequeno)", "", 20.99],
  ],
  "pasteis-doces": [
    ["Chocolate ao Leite", "", 20.99, { imagem: "img/chocolate.jpg", maisVendido: true }],
    ["Brigadeiro", "Chocolate ao leite e granulado preto.", 25.99], ["Prestígio", "Chocolate com coco ralado.", 25.99],
    ["Brigadeiro Mix", "Chocolate ao leite, granulado preto, granulado colorido e amendoim.", 25.99],
    ["Brigadeiro da Casa", "Chocolate ao leite, granulado preto, granulado colorido, coco ralado, confete e leite condensado.", 29.99],
    ["Romeu e Julieta", "", 22.99], ["Banana", "Banana, queijo, canela e açúcar.", 24.99],
    ["Banana Nevada", "Banana, doce de leite e mussarela.", 27.99], ["Morango Nevado", "Morango, chocolate branco e mussarela.", 28.99],
    ["Doce de Leite", "", 22.99], ["Doce de Leite com Confete", "", 24.99], ["Doce de Leite com Granulado", "", 24.99],
    ["Doce de Leite com Granulado Colorido", "", 24.99], ["Doce de Leite com Amendoim", "", 24.99],
    ["Doce de Leite com Leite Condensado", "", 24.99], ["Doce de Leite com Banana e Canela", "", 24.99],
    ["Nutella", "", 27.99], ["Nutella com Coco Ralado", "", 26], ["Nutella com Granulado Preto", "", 26],
    ["Nutella com Granulado Colorido", "", 26], ["Nutella, Banana, Açúcar e Canela", "", 28.99], ["Nutella com Morango", "", 30.99],
    ["Avelã", "", 23.4], ["Avelã com Coco Ralado", "", 24.99], ["Avelã com Granulado Preto", "", 24.99],
    ["Avelã com Granulado Colorido", "", 24.99], ["Avelã, Banana, Açúcar e Canela", "", 24.99], ["Avelã com Morango", "", 27.99],
  ],
  "panquecas": [
    ["Panqueca Costela da Casa", "Costela desfiada, mussarela, tomate, milho, catupiry, bacon, molho da casa, batata palha, ketchup, alface, palmito e alho frito.", 34],
    ["Panqueca Frango Especial", "Frango desfiado, mussarela, tomate, milho, catupiry, molho da casa, batata palha, ketchup, alface e palmito.", 34],
    ["Panqueca Moda da Casa", "Calabresa, mussarela, tomate, milho, cheddar, bacon, ovo, molho da casa, batata frita, ketchup, alface e palmito.", 34],
    ["Panqueca Carne Seca", "Carne seca, mussarela e tomate.", 34],
    ["Panqueca Bolonhesa", "Presunto, mussarela, tomate, milho, catupiry, molho da casa, batata palha, ketchup, alface e tomate.", 34],
    ["Panqueca Pizza", "Presunto, mussarela, tomate, milho, catupiry, molho da casa, batata palha, ketchup, alface e palmito.", 34],
    ["Panqueca Calabresa", "Calabresa, mussarela, tomate, milho, catupiry, molho da casa, batata palha, ketchup, alface e palmito.", 34],
    ["Panqueca Vegetariana", "Brócolis, tomate seco, mussarela, molho da casa, batata palha, ketchup, alface e tomate.", 34],
    ["Panqueca Avelã com Morango", "Creme de avelã e morangos.", 34],
    ["Panqueca Banana Nevada", "Banana, chocolate branco, doce de leite, queijo e canela.", 34],
  ],
  "porcoes": [
    ["Batata Simples · Meia", "", 24], ["Batata Simples · Inteira", "", 35],
    ["Batata com Queijo · Meia", "", 29], ["Batata com Queijo · Inteira", "", 40],
    ["Batata com Queijo e Bacon · Meia", "", 34], ["Batata com Queijo e Bacon · Inteira", "", 45],
    ["Batata com Cheddar e Bacon · Meia", "", 36], ["Batata com Cheddar e Bacon · Inteira", "", 47],
    ["Batata com Queijo, Cheddar e Bacon · Meia", "", 39], ["Batata com Queijo, Cheddar e Bacon · Inteira", "", 50],
  ],
  "sucos": [
    ["Suco de Laranja 1 litro", "Natural.", 20], ["Suco de Acerola 1 litro", "Natural.", 20],
    ["Suco de Abacaxi com Hortelã 1 litro", "Natural.", 20], ["Suco de Maracujá 1 litro", "Natural.", 20],
  ],
  "bebidas": [
    ["Coca-Cola lata", "", 7], ["Guaraná Antarctica lata", "", 7], ["Fanta lata", "", 7], ["Sprite lata", "", 7],
    ["Schweppes Citrus lata", "", 7], ["H2OH! Citrus", "", 7], ["Coca-Cola 1 litro", "", 10], ["Coca-Cola 1 litro (vidro)", "", 10],
    ["Guaraná Antarctica 1 litro", "", 10], ["Coca-Cola 2 litros", "", 16],
    ["Guaraná Antarctica 2 litros", "Preço a confirmar com a loja.", 0, { status: "esgotado" }], // CONFIRMAR: site mostra 0,00
    ["Poty 2 litros", "", 10], ["Energético", "", 15], ["Água mineral", "", 4.5], ["Água mineral com gás", "", 5],
  ],
};

// Adicionais (coleção opcoesLanche, grupo "extras")
export const ADICIONAIS = [
  ["Cheddar", 8], ["Catupiry", 7], ["Bacon", 6], ["Mussarela", 6], ["Hambúrguer", 7], ["Calabresa", 5], ["Doritos", 5],
  ["Purê de batata", 4], ["Vinagrete", 4], ["Alface e tomate", 4], ["Salsicha", 2.5], ["Ovo", 2], ["Cebola", 2], ["Batata palha", 2],
].map(([nome, valor], i) => ({ id: "extra-" + slug(nome), nome, valor, grupo: "extras", status: "ativo", ordem: i }));

export function slug(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Lista final de produtos (id → documento do Firestore "produtos")
export const PRODUTOS = Object.entries(L).flatMap(([categoria, itens]) =>
  itens.map(([nome, descricao, preco, extra = {}], ordem) => ({
    id: slug(categoria + "-" + nome),
    nome, categoria, descricao, preco, ordem,
    imagem: extra.imagem || "",
    status: extra.status || "ativo",
    promocao: false,
    maisVendido: !!extra.maisVendido,
    ...(extra.selo && { selo: extra.selo }),
    ...(extra.escolha && { escolha: extra.escolha }),
  }))
);
