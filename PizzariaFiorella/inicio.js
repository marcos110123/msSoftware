// Tela inicial (aprovada em 22/11): topo com logo + destaques passando, status da loja,
// categorias compactas com quantidade. Só visual: os botões chamam as funções originais.
(function () {
  const root = document.documentElement;
  root.classList.add('pv-b');

  function pronto(fn) { document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn(); }
  const nomeBonito = t => t.trim().toLowerCase().replace(/(^|\s)\S/g, s => s.toUpperCase());
  const brl = v => 'R$ ' + v;

  pronto(function () {
    // linha de status abaixo do logo
    const conteudo = document.querySelector('header > .relative.z-10');
    const st = document.createElement('div');
    st.className = 'pv-status';
    conteudo.appendChild(st);
    const aviso = document.getElementById('aviso-fechado');
    function status() {
      const fechado = aviso && !aviso.classList.contains('hidden');
      st.classList.toggle('fechado', fechado);
      const mesas = !!document.getElementById('numeroMesaTexto');
      const avEnt = document.getElementById('aviso-entrega');
      const soRetirada = avEnt && !avEnt.classList.contains('hidden');
      const extra = mesas ? 'Pedido direto na mesa' : (soRetirada ? 'Só retirada no balcão' : 'Entrega ou retirada<span class="pv-sep">•</span>~40 min');
      st.innerHTML = `<span class="pv-pt"></span><b>${fechado ? 'Fechado agora' : 'Aberto agora'}</b><span class="pv-sep">•</span>${extra}`;
    }
    status();
    if (aviso) new MutationObserver(status).observe(aviso, { attributes: true });
    const avEnt2 = document.getElementById('aviso-entrega');
    if (avEnt2) new MutationObserver(status).observe(avEnt2, { attributes: true });

    // título e nomes/contagem das categorias
    const nav = document.querySelector('nav');
    const grade = nav.querySelector('.grid');
    const tit = document.createElement('div');
    tit.className = 'pv-titulo';
    tit.textContent = 'Escolha uma categoria';
    grade.before(tit);
    const cards = [...nav.querySelectorAll('[data-card]')];
    cards.forEach(c => {
      const rot = c.querySelector(':scope > div');
      const nome = nomeBonito(rot.textContent);
      rot.dataset.orig = rot.innerHTML;
      rot.innerHTML = `<span class="pv-nome">${nome}</span><span class="pv-qtd"></span>`;
    });
    function contar() {
      cards.forEach(c => {
        const m = (c.getAttribute('onclick') || '').match(/mostrarSecao\('([^']+)'\)/);
        const sec = m && document.getElementById(m[1]);
        const n = sec ? sec.querySelectorAll('.menu-item').length : 0;
        c.querySelector('.pv-qtd').textContent = n ? n + (n === 1 ? ' opção' : ' opções') : '';
      });
    }

    // carrossel (opção B): logo + sabores em promoção + combos
    const car = document.createElement('div');
    car.className = 'pv-car';
    car.innerHTML = '<div class="pv-trilho"></div><div class="pv-pontos"></div>';
    conteudo.prepend(car);
    const trilho = car.querySelector('.pv-trilho');
    const pontos = car.querySelector('.pv-pontos');
    let assinatura = null;
    function montarCarrossel() {
      const itens = [];
      document.querySelectorAll('#pizzas-salgadas .menu-item').forEach(m => {
        const nome = m.querySelector('h3').textContent.trim();
        if (!/promo/i.test(nome)) return;
        const precos = [...m.querySelectorAll(':scope > div:nth-child(4) span')].map(s => s.textContent.trim());
        const desc = (m.querySelector('h3 + p') || {}).textContent || '';
        const ilu = window.IlustracoesFiorella ? IlustracoesFiorella.dataUrl(IlustracoesFiorella.desenhar('pizzas-salgadas', nome, desc)) : 'img/pizzasalgada2-leve.jpg';
        itens.push({ sec: 'pizzas-salgadas', h3: nome, nome: nome.replace(/^\s*\d+\s*-\s*promo(ç|c)ão\s*-\s*/i, ''), pr: precos.join('  ·  '), img: ilu, selo: 'Promoção' });
      });
      document.querySelectorAll('#combos .menu-item').forEach((m, i) => {
        if (i > 1) return;
        const preco = m.querySelector(':scope > p:nth-child(4)');
        const nmC = m.querySelector('h3').textContent;
        const iluC = window.IlustracoesFiorella ? IlustracoesFiorella.dataUrl(IlustracoesFiorella.desenhar('combos', nmC.trim(), '')) : 'img/combos-leve.jpg';
        itens.push({ sec: 'combos', h3: nmC.trim(), nome: nomeBonito(nmC), pr: preco ? preco.textContent.trim() : '', img: iluC, selo: 'Combo' });
      });
      // só refaz quando muda algo (sabor pausado/esgotado some, promoção nova entra)
      const ass = JSON.stringify(itens.map(it => [it.h3, it.pr]));
      if (ass === assinatura) return;
      assinatura = ass;
      const atual = trilho.clientWidth ? Math.round(trilho.scrollLeft / trilho.clientWidth) : 0;
      trilho.innerHTML = '<div class="pv-slide pv-logo"><img src="img/logo2.jpeg" alt="Pizzaria Fiorella"></div>' +
        itens.map((it, i) => `<button type="button" class="pv-slide${it.selo === 'Combo' ? ' pv-combo' : ''}" data-i="${i}"><img src="${it.img}" alt=""><span class="pv-tx"><span class="pv-selo">${it.selo}</span><span class="pv-nm">${it.nome}</span><span class="pv-pr">${it.pr}</span><span class="pv-bt">Pedir agora</span></span></button>`).join('');
      pontos.innerHTML = '<i class="on"></i>' + itens.map(() => '<i></i>').join('');
      trilho.querySelectorAll('button.pv-slide').forEach(b => b.addEventListener('click', () => {
        const it = itens[+b.dataset.i];
        // procura o produto na lista ATUAL (se foi pausado nesse meio tempo, não faz nada)
        const card = [...document.querySelectorAll('#' + it.sec + ' .menu-item')].find(m => (m.querySelector('h3') || {}).textContent.trim() === it.h3);
        if (card) card.querySelector(':scope > button:last-child').click(); // abre a janela original (Monte sua Pizza / adiciona)
      }));
      const ir = Math.min(atual, trilho.children.length - 1);
      trilho.scrollLeft = ir * trilho.clientWidth;
      pontos.querySelectorAll('i').forEach((p, k) => p.classList.toggle('on', k === ir));
    }
    trilho.addEventListener('scroll', () => {
      const i = Math.round(trilho.scrollLeft / trilho.clientWidth);
      pontos.querySelectorAll('i').forEach((p, k) => p.classList.toggle('on', k === i));
    }, { passive: true });
    let parado = false;
    car.addEventListener('pointerdown', () => { parado = true; setTimeout(() => parado = false, 8000); });
    setInterval(() => {
      if (parado || !root.classList.contains('pv-b') || !trilho.children.length) return;
      const n = trilho.children.length, i = Math.round(trilho.scrollLeft / trilho.clientWidth);
      trilho.scrollTo({ left: ((i + 1) % n) * trilho.clientWidth, behavior: 'smooth' });
    }, 4500);

    // produtos chegam do Firebase depois: atualiza contagem e carrossel
    let espera;
    const obs = new MutationObserver(() => { clearTimeout(espera); espera = setTimeout(() => { contar(); montarCarrossel(); }, 120); });
    document.querySelectorAll('.produtos-grid').forEach(g => obs.observe(g, { childList: true }));
    contar(); montarCarrossel();
  });
})();
