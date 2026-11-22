// Lista compacta (1.0.9) — mesmo padrão do labrasa.site 1.3.2.
// Não muda nenhuma função do cardápio: cada botão novo só aperta o botão original.
(function () {
  const root = document.documentElement;
  root.classList.add('sk');

  function pronto(fn) { document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn(); }

  pronto(function () {
    // ---- barra do carrinho embaixo ----
    const orig = document.getElementById('btnAbrirCarrinho');
    const bar = document.createElement('button');
    bar.id = 'skBar';
    bar.type = 'button';
    bar.innerHTML = '<span><span class="sk-qtd">0</span>Ver carrinho</span><span class="sk-total"></span>';
    document.body.appendChild(bar);
    bar.addEventListener('click', () => orig && orig.click());

    // O cardápio grava o carrinho no localStorage mas não o recupera ao abrir a página;
    // então só confia nele depois que o cardápio gravar de novo nesta visita.
    const inicial = localStorage.getItem('carrinho');
    let valendo = false;
    let ultimo = 0;
    function lerCarrinho() {
      const atual = localStorage.getItem('carrinho');
      if (!valendo && atual !== inicial) valendo = true;
      let itens = [];
      if (valendo) { try { itens = JSON.parse(atual || '[]'); } catch (e) {} }
      let qtd = 0, total = 0;
      itens.forEach(i => {
        const q = Number(i.quantidade || 1);
        qtd += q;
        total += i.subtotal != null ? Number(i.subtotal) : q * Number(i.preco || 0);
      });
      bar.querySelector('.sk-qtd').textContent = qtd;
      bar.querySelector('.sk-total').textContent = total ? total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
      bar.classList.toggle('on', qtd > 0);
      if (qtd > ultimo) { bar.classList.add('pulo'); setTimeout(() => bar.classList.remove('pulo'), 220); }
      ultimo = qtd;
    }
    lerCarrinho();
    setInterval(lerCarrinho, 400);

    // ---- faixa de categorias que gruda no topo ----
    const nav = document.querySelector('nav');
    const cards = [...nav.querySelectorAll('[data-card]')];
    const chips = document.createElement('div');
    chips.id = 'skChips';
    chips.innerHTML = '<div class="sk-trilho"></div>';
    const trilho = chips.firstChild;
    const pares = cards.map(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = c.innerText.trim().toLowerCase().replace(/(^|\s)\S/g, s => s.toUpperCase());
      const m = (c.getAttribute('onclick') || '').match(/mostrarSecao\('([^']+)'\)/);
      b.dataset.secao = m ? m[1] : '';
      b.addEventListener('click', () => {
        const sec = b.dataset.secao && document.getElementById(b.dataset.secao);
        if (sec && sec.style.display === 'block') { sec.scrollIntoView({ behavior: 'smooth' }); return; } // já aberta: não fecha
        c.click();
      });
      trilho.appendChild(b);
      return [c, b];
    });
    nav.after(chips);

    // Promoção/Combos somem quando não têm produto: a faixa acompanha
    function sincronizar() { pares.forEach(([c, b]) => { b.hidden = c.classList.contains('hidden'); }); }
    sincronizar();
    pares.forEach(([c]) => new MutationObserver(sincronizar).observe(c, { attributes: true, attributeFilter: ['class'] }));

    // mostra a faixa só depois que a grade de categorias sai da tela; marca a categoria aberta
    new IntersectionObserver(([e]) => chips.classList.toggle('escondido', e.isIntersecting)).observe(nav);
    function marcarAtiva() {
      pares.forEach(([, b]) => {
        const sec = b.dataset.secao && document.getElementById(b.dataset.secao);
        const ativa = !!(sec && sec.style.display === 'block');
        b.setAttribute('aria-current', String(ativa));
        if (ativa && b.getAttribute('data-vista') !== '1') { b.setAttribute('data-vista', '1'); b.scrollIntoView({ inline: 'center', block: 'nearest' }); }
        if (!ativa) b.removeAttribute('data-vista');
      });
    }
    document.querySelectorAll('.section-produto').forEach(s => new MutationObserver(marcarAtiva).observe(s, { attributes: true, attributeFilter: ['style'] }));

    // ---- retorno no botão Adicionar: vira verde com ✓ quando o item entra mesmo ----
    document.addEventListener('click', e => {
      const b = e.target.closest('.menu-item > button:last-child');
      if (!b || b.classList.contains('sk-ok')) return;
      if (!/^\s*adicionarAoCarrinho\(/.test(b.getAttribute('onclick') || '')) return; // pizza/entrada abrem janela
      const antes = localStorage.getItem('carrinho');
      setTimeout(() => {
        if (localStorage.getItem('carrinho') === antes) return; // não entrou (loja fechada etc.)
        b.classList.add('sk-ok');
        setTimeout(() => b.classList.remove('sk-ok'), 1100);
      }, 50);
    }, true);
  });
})();
