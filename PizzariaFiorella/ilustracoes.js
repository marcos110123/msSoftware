// Ilustrações dos produtos (estilo do Nosso Açaí): cada produto ganha um desenho em SVG
// montado a partir do nome + descrição. Não depende de foto; produto com foto própria fica com a foto.
(function () {
  // ---------- utilidades ----------
  function semAcento(t) { return (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function rng(seed) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const f = n => Math.round(n * 10) / 10;

  // espalha pontos dentro do círculo, evitando amontoar
  function espalhar(r, qtd, raio, dist, ocupados) {
    const pts = [];
    for (let k = 0; k < qtd; k++) {
      let melhor = null;
      for (let t = 0; t < 30; t++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * raio;
        const p = { x: 50 + Math.cos(a) * d, y: 50 + Math.sin(a) * d, a: r() * 180 };
        const ok = ocupados.every(o => Math.hypot(o.x - p.x, o.y - p.y) > (o.d + dist) / 2);
        if (ok) { melhor = p; break; }
        if (!melhor) melhor = p;
      }
      melhor.d = dist; ocupados.push(melhor); pts.push(melhor);
    }
    return pts;
  }

  // ---------- coberturas ----------
  const T = {
    calabresa: (p, r) => `<g transform="translate(${f(p.x)} ${f(p.y)})"><circle r="5.2" fill="#b4432c" stroke="#8a2d1c" stroke-width=".8"/><circle cx="-1.6" cy="-1" r=".8" fill="#e9a07c"/><circle cx="1.5" cy=".9" r=".7" fill="#e9a07c"/><circle cx=".4" cy="-2.3" r=".6" fill="#e9a07c"/><circle cx="-.6" cy="2.2" r=".6" fill="#e9a07c"/></g>`,
    pepperoni: (p) => `<g transform="translate(${f(p.x)} ${f(p.y)})"><circle r="4.6" fill="#9e2a1f" stroke="#6f1a12" stroke-width=".7"/><circle cx="-1.2" cy="-1" r=".7" fill="#d8735a"/><circle cx="1.3" cy="1.1" r=".6" fill="#d8735a"/><circle cx="1.4" cy="-1.5" r=".4" fill="#d8735a"/></g>`,
    tomate: (p) => `<g transform="translate(${f(p.x)} ${f(p.y)})"><circle r="4.8" fill="#e0402c"/><circle r="3.4" fill="#f27a5e"/><circle r="1.1" fill="#e0402c"/><circle cx="-1.8" cy=".6" r=".5" fill="#ffd9a8"/><circle cx="1.8" cy="-.5" r=".5" fill="#ffd9a8"/><circle cx=".2" cy="1.9" r=".5" fill="#ffd9a8"/></g>`,
    cereja: (p) => `<g transform="translate(${f(p.x)} ${f(p.y)})"><circle r="3" fill="#d8352a"/><circle cx="-.9" cy="-.9" r=".9" fill="#ff8a70"/></g>`,
    tomateSeco: (p) => `<ellipse cx="${f(p.x)}" cy="${f(p.y)}" rx="3.8" ry="2.3" transform="rotate(${f(p.a)} ${f(p.x)} ${f(p.y)})" fill="#8e1f1b" stroke="#5e1210" stroke-width=".5"/>`,
    azeitona: (p) => `<g transform="translate(${f(p.x)} ${f(p.y)})"><circle r="2.3" fill="#2a2420"/><circle r=".85" fill="#6b5a46"/></g>`,
    presunto: (p) => `<rect x="${f(p.x - 4.6)}" y="${f(p.y - 2)}" width="9.2" height="4" rx="1.6" transform="rotate(${f(p.a)} ${f(p.x)} ${f(p.y)})" fill="#eaa6a2" stroke="#d27f7b" stroke-width=".5"/>`,
    lombo: (p) => `<g transform="rotate(${f(p.a)} ${f(p.x)} ${f(p.y)})"><ellipse cx="${f(p.x)}" cy="${f(p.y)}" rx="4.4" ry="3.3" fill="#d88a7c" stroke="#b56658" stroke-width=".6"/><ellipse cx="${f(p.x - 1)}" cy="${f(p.y)}" rx="1.6" ry="1" fill="#f2c2b5"/></g>`,
    peru: (p) => `<rect x="${f(p.x - 4.4)}" y="${f(p.y - 2.2)}" width="8.8" height="4.4" rx="2" transform="rotate(${f(p.a)} ${f(p.x)} ${f(p.y)})" fill="#ecc0a6" stroke="#cf9a7c" stroke-width=".5"/>`,
    bacon: (p) => `<g transform="rotate(${f(p.a)} ${f(p.x)} ${f(p.y)})"><rect x="${f(p.x - 5)}" y="${f(p.y - 1.6)}" width="10" height="3.2" rx="1" fill="#b4513a"/><rect x="${f(p.x - 5)}" y="${f(p.y - .4)}" width="10" height=".9" fill="#f1c8ae"/></g>`,
    frango: (p, r) => `<path d="M${f(p.x - 2.6)} ${f(p.y)} q${f(1 + r())} -${f(2 + r())} ${f(3 + r())} -.6 q1.6 1.6 -.4 ${f(2.4 + r())} q-2 .6 -2.6 -1.8z" fill="#ecd3a0" stroke="#c9a462" stroke-width=".5"/>`,
    carne: (p, r) => `<path d="M${f(p.x - 2.8)} ${f(p.y - .5)} q${f(1.5 + r())} -${f(2.2)} ${f(3.4 + r())} -.4 q1.4 1.8 -.6 ${f(2.6)} q-2.4 .6 -2.8 -2.2z" fill="#7b3d22" stroke="#4f2412" stroke-width=".5"/>`,
    file: (p) => `<g transform="rotate(${f(p.a)} ${f(p.x)} ${f(p.y)})"><rect x="${f(p.x - 3.4)}" y="${f(p.y - 2.4)}" width="6.8" height="4.8" rx="1.4" fill="#8a4a2c" stroke="#5a2c18" stroke-width=".5"/><path d="M${f(p.x - 2.6)} ${f(p.y - 1)} h5.2 M${f(p.x - 2.6)} ${f(p.y + 1)} h5.2" stroke="#4a2212" stroke-width=".6"/></g>`,
    atum: (p, r) => `<path d="M${f(p.x - 2.4)} ${f(p.y)} q1.2 -${f(1.8 + r())} 3 -.8 q1 1.4 -.8 2.2 q-1.8 .4 -2.2 -1.4z" fill="#d7b7a0" stroke="#b08c74" stroke-width=".4"/>`,
    aliche: (p) => `<rect x="${f(p.x - 4.5)}" y="${f(p.y - .9)}" width="9" height="1.8" rx=".9" transform="rotate(${f(p.a)} ${f(p.x)} ${f(p.y)})" fill="#6b4a3a"/>`,
    milho: (p) => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="1.35" fill="#f6c51c" stroke="#d9a20a" stroke-width=".3"/>`,
    ervilha: (p) => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="1.45" fill="#6aa84f" stroke="#4c8a35" stroke-width=".3"/>`,
    cebola: (p) => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="3.4" fill="none" stroke="#f3eadb" stroke-width="1"/>`,
    cebolaRoxa: (p) => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="3.4" fill="none" stroke="#b56aa8" stroke-width="1"/>`,
    ovo: (p) => `<g transform="translate(${f(p.x)} ${f(p.y)})"><ellipse rx="5.4" ry="4.6" fill="#fdfbf4"/><circle r="2.2" fill="#f6b21b"/></g>`,
    brocolis: (p) => `<g transform="translate(${f(p.x)} ${f(p.y)})"><rect x="-.7" y="0" width="1.4" height="3" fill="#7fae5a"/><circle cx="-1.5" cy="-.4" r="1.7" fill="#3f7d3a"/><circle cx="1.5" cy="-.4" r="1.7" fill="#3f7d3a"/><circle cy="-1.8" r="1.8" fill="#4d8f43"/></g>`,
    palmito: (p) => `<g transform="translate(${f(p.x)} ${f(p.y)})"><circle r="3" fill="#f3ead0" stroke="#d6c696" stroke-width=".6"/><circle r="1.4" fill="none" stroke="#e2d4a8" stroke-width=".5"/></g>`,
    folha: (p) => `<path d="M${f(p.x - 3.6)} ${f(p.y)} q3.6 -3.4 7.2 0 q-3.6 3.4 -7.2 0z" transform="rotate(${f(p.a)} ${f(p.x)} ${f(p.y)})" fill="#3f8a3a" stroke="#2c6a28" stroke-width=".4"/>`,
    abobrinha: (p) => `<g transform="translate(${f(p.x)} ${f(p.y)})"><circle r="3.6" fill="#e9eccd" stroke="#5d8a3a" stroke-width="1"/><circle r=".5" fill="#c9cf9c"/><circle cx="1.3" cy=".8" r=".4" fill="#c9cf9c"/><circle cx="-1.2" cy=".9" r=".4" fill="#c9cf9c"/></g>`,
    banana: (p) => `<g transform="translate(${f(p.x)} ${f(p.y)})"><circle r="3.4" fill="#f5e5a8" stroke="#e0c878" stroke-width=".6"/><circle r=".9" fill="#d9c27a"/></g>`,
    alho: (p) => `<ellipse cx="${f(p.x)}" cy="${f(p.y)}" rx="1.6" ry="1" transform="rotate(${f(p.a)} ${f(p.x)} ${f(p.y)})" fill="#f2dca0" stroke="#d1b56a" stroke-width=".3"/>`,
    oregano: (p) => `<rect x="${f(p.x)}" y="${f(p.y)}" width=".9" height=".6" transform="rotate(${f(p.a)} ${f(p.x)} ${f(p.y)})" fill="#4d6a2c"/>`,
    parmesao: (p) => `<rect x="${f(p.x)}" y="${f(p.y)}" width="2.2" height=".7" rx=".3" transform="rotate(${f(p.a)} ${f(p.x)} ${f(p.y)})" fill="#fff6d8"/>`,
    // doces
    morango: (p) => `<g transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.a)})"><path d="M0 4 C-4 1 -3.6 -3 0 -2.6 C3.6 -3 4 1 0 4z" fill="#d7263d"/><path d="M-1.6 -2.7 l1.6 -1.3 1.6 1.3z" fill="#3f8a3a"/><circle cx="-1" cy="0" r=".3" fill="#ffd36e"/><circle cx="1" cy=".6" r=".3" fill="#ffd36e"/><circle cx="0" cy="2" r=".3" fill="#ffd36e"/></g>`,
    uva: (p) => `<g transform="translate(${f(p.x)} ${f(p.y)})"><circle r="2.5" fill="#a5c94a" stroke="#7fa22e" stroke-width=".4"/><circle cx="-.8" cy="-.8" r=".7" fill="#d6ec9a"/></g>`,
    cerejaDoce: (p) => `<g transform="translate(${f(p.x)} ${f(p.y)})"><path d="M0 -2 q2 -3 4 -4" stroke="#5b3a1a" stroke-width=".6" fill="none"/><circle r="2.6" fill="#c3102a"/><circle cx="-.8" cy="-.8" r=".8" fill="#ff7b86"/></g>`,
    coco: (p) => `<rect x="${f(p.x)}" y="${f(p.y)}" width="2.6" height=".8" rx=".4" transform="rotate(${f(p.a)} ${f(p.x)} ${f(p.y)})" fill="#ffffff"/>`,
    granulado: (p) => `<rect x="${f(p.x)}" y="${f(p.y)}" width="1.8" height=".6" rx=".3" transform="rotate(${f(p.a)} ${f(p.x)} ${f(p.y)})" fill="#3a1d10"/>`,
    ninho: (p) => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r=".7" fill="#fffdf6"/>`,
    canela: (p) => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r=".45" fill="#8a4b20"/>`,
    pacoca: (p) => `<rect x="${f(p.x)}" y="${f(p.y)}" width="2.2" height="1.8" rx=".5" transform="rotate(${f(p.a)} ${f(p.x)} ${f(p.y)})" fill="#d4a86a" stroke="#b8894a" stroke-width=".3"/>`
  };
  // manchas cremosas (requeijão, catupiry, cheddar, chocolate, goiabada...)
  function manchas(r, cor, borda, qtd, raio) {
    let s = '';
    const pts = espalhar(r, qtd, raio, 9, []);
    pts.forEach(p => {
      const a = 3 + r() * 2.4, b = 2.4 + r() * 2;
      s += `<ellipse cx="${f(p.x)}" cy="${f(p.y)}" rx="${f(a)}" ry="${f(b)}" transform="rotate(${f(p.a)} ${f(p.x)} ${f(p.y)})" fill="${cor}"${borda ? ` stroke="${borda}" stroke-width=".5"` : ''}/>`;
    });
    return s;
  }
  function fio(r, cor, largura, voltas) {
    let d = '';
    for (let k = 0; k < voltas; k++) {
      const y = 26 + k * (48 / Math.max(1, voltas - 1)) + (r() - .5) * 4;
      const x0 = 20 + r() * 6, x1 = 80 - r() * 6;
      d += `M${f(x0)} ${f(y)} C${f(35)} ${f(y - 6 - r() * 4)} ${f(60)} ${f(y + 6 + r() * 4)} ${f(x1)} ${f(y)} `;
    }
    return `<path d="${d}" stroke="${cor}" stroke-width="${largura}" fill="none" stroke-linecap="round" opacity=".95"/>`;
  }

  // ---------- pizza ----------
  function pizza(nome, desc, doce) {
    const t = semAcento(nome + ' ' + desc);
    const r = rng(nome);
    const tem = (...k) => k.some(x => t.includes(x));
    let base = '#f3c766', luz = '#f8dc8c', torr = '#d9a441';
    if (doce) {
      if (tem('nutella', 'chocolate ao leite', 'prestig')) { base = '#5a321e'; luz = '#7a4a2e'; torr = '#3e1f10'; }
      else if (tem('doce de leite', 'banoffee')) { base = '#cf9350'; luz = '#e0ad6e'; torr = '#a86c30'; }
      else if (tem('creme de morango', 'sensacao') && !tem('ninho')) { base = '#f0a9b4'; luz = '#f7c6cd'; torr = '#d98593'; }
      else if (tem('mussarela')) { /* mineirinha / romeu e julieta: queijo */ }
      else { base = '#f6eedf'; luz = '#fffaf0'; torr = '#e6d8bf'; }
    }
    const id = 'p' + Math.floor(r() * 1e6);
    let s = `<defs><radialGradient id="${id}b" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#e8b06a"/><stop offset=".8" stop-color="#c7853f"/><stop offset="1" stop-color="#9c5f26"/></radialGradient></defs>`;
    s += `<circle cx="51" cy="53" r="46" fill="rgba(0,0,0,.35)"/>`;
    s += `<circle cx="50" cy="50" r="46" fill="url(#${id}b)"/>`;
    for (let k = 0; k < 10; k++) { const a = r() * 6.28; s += `<circle cx="${f(50 + Math.cos(a) * 43)}" cy="${f(50 + Math.sin(a) * 43)}" r="${f(1 + r())}" fill="#8f5420" opacity=".45"/>`; }
    if (!doce) s += `<circle cx="50" cy="50" r="39.5" fill="#b8391f"/>`;
    s += `<circle cx="50" cy="50" r="38" fill="${base}"/>`;
    s += manchas(r, luz, null, 7, 30);
    for (let k = 0; k < 8; k++) { const a = r() * 6.28, d = r() * 33; s += `<circle cx="${f(50 + Math.cos(a) * d)}" cy="${f(50 + Math.sin(a) * d)}" r="${f(.8 + r() * 1.4)}" fill="${torr}" opacity=".6"/>`; }

    const oc = [];
    const por = (nomeT, qtd, dist, raio = 31) => espalhar(r, qtd, raio, dist, oc).forEach(p => { s += T[nomeT](p, r); });

    if (doce) {
      if (tem('chocolate branco') && base !== '#f6eedf') s += fio(r, '#f7efe0', 1.6, 4);
      if (tem('nutella') && base !== '#5a321e') s += manchas(r, '#4a2414', '#2e140a', 6, 28);
      if (tem('chocolate ao leite') && base !== '#5a321e') s += fio(r, '#5a321e', 1.8, 5);
      if (tem('doce de leite') && base !== '#cf9350') s += fio(r, '#c27c3a', 1.8, 4);
      if (tem('creme de morango')) s += manchas(r, '#f19aab', null, 5, 28);
      if (tem('goiabada')) s += manchas(r, '#b3283a', '#8a1a28', 6, 28);
      if (tem('cream cheese')) s += manchas(r, '#fffaf2', '#eadfcb', 4, 28);
      if (tem('requeijao')) s += manchas(r, '#fffaf2', '#eadfcb', 4, 28);
      if (tem('morango')) por('morango', 7, 8);
      if (tem('uva')) por('uva', 10, 5);
      if (tem('banana')) por('banana', 7, 7);
      if (tem('cereja')) por('cerejaDoce', 5, 8);
      if (tem('pacoq')) por('pacoca', 14, 3);
      if (tem('coco')) por('coco', 34, 1);
      if (tem('granulado')) por('granulado', 40, 1);
      if (tem('ninho polvilhado', 'leite ninho')) por('ninho', 30, 1);
      if (tem('canela')) por('canela', 40, 1);
    } else {
      if (tem('requeijao', 'catupiry', 'cream cheese')) s += manchas(r, '#fffaf2', '#eadfcb', 5, 28);
      if (tem('cheddar')) s += manchas(r, '#f39a1e', '#d47d0c', 4, 28);
      if (tem('gorgonzola')) s += manchas(r, '#eef1e6', '#9fb3a0', 4, 28);
      if (tem('barbecue')) s += fio(r, '#5a2a14', 1.4, 4);
      if (tem('tare')) s += fio(r, '#3a2416', 1.2, 4);
      if (tem('calabresa')) por('calabresa', 8, 10);
      if (tem('pepperoni')) por('pepperoni', 9, 9);
      if (tem('lombo')) por('lombo', 6, 9);
      if (tem('presunto')) por('presunto', 6, 9);
      if (tem('peito de peru')) por('peru', 6, 9);
      if (tem('fil')) por('file', 7, 8);
      if (tem('costela', 'cupim', 'carne')) por('carne', 10, 7);
      if (tem('frango')) por('frango', 10, 6);
      if (tem('atum')) por('atum', 10, 6);
      if (tem('aliche')) por('aliche', 6, 9);
      if (tem('tomate seco')) por('tomateSeco', 6, 8);
      else if (tem('tomate cereja')) por('cereja', 7, 7);
      else if (tem('tomate')) por('tomate', 6, 10);
      if (tem('abobrinha')) por('abobrinha', 7, 8);
      if (tem('banana')) por('banana', 7, 7);
      if (/\bovos?\b/.test(t)) por('ovo', 3, 12);
      if (tem('palmito')) por('palmito', 6, 7);
      if (tem('brocolis')) por('brocolis', 6, 7);
      if (tem('bacon')) por('bacon', 6, 8);
      if (tem('cebola roxa')) por('cebolaRoxa', 5, 7);
      else if (tem('cebola')) por('cebola', 5, 7);
      if (tem('milho')) por('milho', 16, 3);
      if (tem('ervilha')) por('ervilha', 14, 3);
      if (tem('azeitona')) por('azeitona', 6, 6);
      if (tem('alho')) por('alho', 10, 3);
      if (tem('rucula', 'manjeric')) por('folha', 6, 7);
      if (tem('parmes', 'provolone', 'brie')) por('parmesao', 16, 2);
      if (tem('oregano')) por('oregano', 24, 1, 34);
    }
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 4 + .2;
      s += `<line x1="${f(50 - Math.cos(a) * 38)}" y1="${f(50 - Math.sin(a) * 38)}" x2="${f(50 + Math.cos(a) * 38)}" y2="${f(50 + Math.sin(a) * 38)}" stroke="rgba(110,55,15,.28)" stroke-width=".8"/>`;
    }
    return s;
  }

  // ---------- massas (prato visto de cima) ----------
  function massa(nome) {
    const t = semAcento(nome);
    const r = rng(nome);
    let s = `<circle cx="51" cy="53" r="46" fill="rgba(0,0,0,.35)"/><circle cx="50" cy="50" r="46" fill="#f4f1ea"/><circle cx="50" cy="50" r="38" fill="#e8e3d8"/>`;
    // metade sugo, metade bechamel
    s += `<path d="M50 14 A36 36 0 0 0 50 86 Z" fill="#c23a22"/><path d="M50 14 A36 36 0 0 1 50 86 Z" fill="#f2e7cf"/>`;
    if (t.includes('canelone')) {
      [[30, 32], [30, 50], [30, 68]].forEach(([x, y], i) => {
        s += `<g transform="rotate(-8 50 ${y})"><rect x="${x - 6}" y="${y - 5.5}" width="52" height="11" rx="5.5" fill="#f1d48a" stroke="#c9a14a" stroke-width=".8"/><ellipse cx="${x - 1}" cy="${y}" rx="3" ry="5" fill="#fff4d6" stroke="#c9a14a" stroke-width=".6"/></g>`;
      });
    } else if (t.includes('conchiglione')) {
      [[34, 34], [62, 34], [30, 58], [56, 60], [44, 46]].forEach(([x, y], i) => {
        s += `<g transform="translate(${x} ${y}) rotate(${f(r() * 90 - 45)})"><path d="M-9 0 C-9 -9 9 -9 9 0 C9 6 -9 6 -9 0z" fill="#f1d48a" stroke="#c9a14a" stroke-width=".8"/><path d="M-6 -1 q6 -6 12 0 M-4 2 q4 -3 8 0" stroke="#c9a14a" stroke-width=".7" fill="none"/></g>`;
      });
    } else {
      [[36, 36], [64, 36], [36, 64], [64, 64], [50, 50]].forEach(([x, y]) => {
        s += `<g transform="translate(${x} ${y})"><circle r="10" fill="#f1d48a" stroke="#c9a14a" stroke-width=".8"/><path d="M0 0 m0 -1.5 a1.5 1.5 0 1 1 -1.5 1.5 a3.5 3.5 0 1 1 3.5 3.5 a5.8 5.8 0 1 1 -5.8 -5.8 a8 8 0 1 1 8 8" stroke="#d08a3a" stroke-width="1.1" fill="none"/></g>`;
      });
    }
    if (t.includes('rucula')) espalhar(r, 4, 26, 10, []).forEach(p => { s += T.folha(p); });
    if (t.includes('tomate seco')) espalhar(r, 4, 26, 10, []).forEach(p => { s += T.tomateSeco(p); });
    espalhar(r, 16, 30, 2, []).forEach(p => { s += T.parmesao(p); });
    s += `<path d="M62 18 q6 -4 10 2 q-6 2 -10 -2z" fill="#3f8a3a"/>`;
    return s;
  }

  // ---------- bebidas ----------
  function lata(cor, faixa, texto) {
    return `<ellipse cx="50" cy="92" rx="22" ry="4" fill="rgba(0,0,0,.35)"/>` +
      `<rect x="30" y="14" width="40" height="76" rx="7" fill="${cor}"/>` +
      `<rect x="30" y="14" width="40" height="76" rx="7" fill="url(#brilho)"/>` +
      `<rect x="32" y="10" width="36" height="7" rx="3" fill="#cfd3d8"/><rect x="32" y="86" width="36" height="6" rx="3" fill="#b7bcc2"/>` +
      (faixa ? `<path d="M30 54 q20 -10 40 0 v8 q-20 -10 -40 0z" fill="${faixa}"/>` : '') +
      (texto ? `<text x="50" y="46" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="${texto.length > 6 ? 8 : 10}" fill="#fff">${texto}</text>` : '');
  }
  function pet(liquido, rotulo, tampa, texto) {
    return `<ellipse cx="50" cy="94" rx="20" ry="3.5" fill="rgba(0,0,0,.35)"/>` +
      `<rect x="44" y="4" width="12" height="7" rx="2" fill="${tampa}"/>` +
      `<path d="M45 11 h10 l2 8 q12 6 12 18 v48 q0 7 -7 7 h-24 q-7 0 -7 -7 v-48 q0 -12 12 -18z" fill="${liquido}"/>` +
      `<path d="M45 11 h10 l2 8 q12 6 12 18 v48 q0 7 -7 7 h-24 q-7 0 -7 -7 v-48 q0 -12 12 -18z" fill="url(#brilho)"/>` +
      `<rect x="31" y="46" width="38" height="20" fill="${rotulo}"/>` +
      (texto ? `<text x="50" y="59.5" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="${texto.length > 6 ? 7 : 8.5}" fill="#fff">${texto}</text>` : '');
  }
  function garrafaVidro(vidro, rotulo, texto, tampa = '#c9a227') {
    return `<ellipse cx="50" cy="94" rx="16" ry="3" fill="rgba(0,0,0,.35)"/>` +
      `<rect x="45" y="4" width="10" height="5" rx="1.5" fill="${tampa}"/>` +
      `<path d="M45.5 9 h9 v14 q9 8 9 20 v44 q0 5 -5 5 h-17 q-5 0 -5 -5 v-44 q0 -12 9 -20z" fill="${vidro}"/>` +
      `<path d="M45.5 9 h9 v14 q9 8 9 20 v44 q0 5 -5 5 h-17 q-5 0 -5 -5 v-44 q0 -12 9 -20z" fill="url(#brilho)"/>` +
      `<rect x="36.5" y="52" width="27" height="22" rx="2" fill="${rotulo}"/>` +
      (texto ? `<text x="50" y="66" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="${texto.length > 6 ? 5.6 : 7}" fill="#fff">${texto}</text>` : '');
  }
  function bebida(nome) {
    const t = semAcento(nome);
    if (t.includes('monster')) return lata('#121212', null, '') + `<path d="M40 30 l3 26 M48 28 l2 28 M56 30 l1 26" stroke="#7bd23a" stroke-width="3" stroke-linecap="round"/>`;
    if (t.includes('d. valle') || t.includes('d.valle')) {
      const cor = t.includes('maracuja') ? '#e3a400' : t.includes('pessego') ? '#ef8f4a' : '#6b2d6b';
      if (t.includes('lata')) return lata(cor, '#ffffff55', 'DEL VALLE');
      return garrafaVidro(cor, '#ffffffcc', '', '#2f6b2f') + `<text x="50" y="65.5" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="4.4" fill="${cor}">DEL VALLE</text>`;
    }
    if (t.includes('suco') && t.includes('laranja')) {
      return `<ellipse cx="50" cy="93" rx="22" ry="4" fill="rgba(0,0,0,.35)"/><path d="M28 22 h44 l-5 66 q-1 4 -5 4 h-24 q-4 0 -5 -4z" fill="#ffffff22" stroke="#ffffff88" stroke-width="1.2"/><path d="M30.5 34 h39 l-4 52 q-.6 3 -3.6 3 h-23.8 q-3 0 -3.6 -3z" fill="#f59b1c"/><g transform="translate(68 24)"><circle r="11" fill="#f7b733"/><circle r="9" fill="#ffd36b"/><path d="M0 -9 V9 M-9 0 H9 M-6.4 -6.4 L6.4 6.4 M6.4 -6.4 L-6.4 6.4" stroke="#f7b733" stroke-width="1"/></g>`;
    }
    if (t.includes('agua')) {
      const gas = t.includes('com gas');
      return pet('#cfe8f7', gas ? '#d1342b' : '#1e7bc4', gas ? '#d1342b' : '#1e7bc4', 'ÁGUA') + (gas ? `<circle cx="42" cy="78" r="1.4" fill="#fff"/><circle cx="56" cy="82" r="1.2" fill="#fff"/><circle cx="50" cy="74" r="1" fill="#fff"/><circle cx="58" cy="40" r="1.2" fill="#fff"/>` : '');
    }
    if (t.includes('coca')) {
      const zero = t.includes('zero');
      if (t.includes('vidro') || t.includes('retornav')) return garrafaVidro('#3a1a0f', '#d1121c', 'Coca-Cola', '#d1121c');
      return pet('#3a1a0f', zero ? '#111111' : '#d1121c', zero ? '#111' : '#d1121c', zero ? 'ZERO' : 'Coca-Cola');
    }
    if (t.includes('sprite')) return pet('#d9f2d8', '#1f9a4a', '#1f9a4a', 'Sprite');
    if (t.includes('poty')) return pet('#8a3a12', '#0f7a3a', '#0f7a3a', 'POTY');
    if (t.includes('roller')) return pet('#9a4a12', '#e35d0a', '#e35d0a', 'ROLLER');
    if (t.includes('lata')) return lata('#d1121c', '#ffffff44', 'REFRI');
    return lata('#c8102e', null, '');
  }
  function cerveja(nome) {
    const t = semAcento(nome);
    if (t.includes('taca')) {
      return `<ellipse cx="50" cy="93" rx="16" ry="3" fill="rgba(0,0,0,.35)"/><path d="M33 10 h34 q2 30 -17 40 q-19 -10 -17 -40z" fill="#ffffff1f" stroke="#ffffff99" stroke-width="1.2"/><path d="M35 26 h30 q-1 18 -15 24 q-14 -6 -15 -24z" fill="#7a0f24"/><rect x="48.8" y="50" width="2.4" height="36" fill="#ffffffaa"/><ellipse cx="50" cy="88" rx="13" ry="3" fill="#ffffffaa"/>`;
    }
    if (t.includes('vinho')) return garrafaVidro('#2a0f14', '#efe6d2', '', '#6b0f22') + `<text x="50" y="64" text-anchor="middle" font-family="Georgia" font-style="italic" font-size="6" fill="#6b0f22">Vinho</text><text x="50" y="70" text-anchor="middle" font-family="Arial" font-size="3.6" fill="#6b0f22">TINTO SUAVE</text>`;
    if (t.includes('heineken')) return lata('#0b6b2e', '#ffffff33', 'Heineken') + `<path d="M50 24 l1.6 4.2 h4.4 l-3.6 2.6 1.4 4.2 -3.8 -2.6 -3.8 2.6 1.4 -4.2 -3.6 -2.6 h4.4z" fill="#d1121c"/>`;
    if (t.includes('budweiser')) return lata('#c8102e', '#ffffff55', 'Budweiser');
    if (t.includes('skol')) return lata('#f2c200', '#1b4fa8', 'SKOL');
    if (t.includes('antarctica')) {
      if (t.includes('garrafa')) return garrafaVidro('#5a2e0c', '#1d3f8f', 'Antarctica');
      return lata('#1d3f8f', '#ffffff44', 'Antarctica');
    }
    return garrafaVidro('#5a2e0c', '#d8b24a', 'CERVEJA');
  }
  function entrada(nome, desc) {
    const t = semAcento(nome);
    if (t.includes('amendoim')) {
      let s = `<ellipse cx="50" cy="78" rx="38" ry="10" fill="rgba(0,0,0,.35)"/><path d="M12 52 q38 44 76 0z" fill="#7a3e1c"/><ellipse cx="50" cy="52" rx="38" ry="11" fill="#9a5a2a"/>`;
      const r = rng(nome);
      for (let k = 0; k < 22; k++) { const x = 20 + r() * 60, y = 46 + r() * 10; s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="3.2" ry="2.2" transform="rotate(${f(r() * 180)} ${f(x)} ${f(y)})" fill="#d9a35c" stroke="#b07a3a" stroke-width=".4"/>`; }
      return s;
    }
    if (t.includes('limao')) {
      return `<ellipse cx="50" cy="93" rx="20" ry="3.5" fill="rgba(0,0,0,.35)"/><path d="M30 16 h40 l-4 72 q-.5 4 -4.5 4 h-23 q-4 0 -4.5 -4z" fill="#ffffff1c" stroke="#ffffff99" stroke-width="1.2"/><rect x="36" y="36" width="12" height="12" rx="2" fill="#e6f6ff" opacity=".85" transform="rotate(12 42 42)"/><rect x="50" y="46" width="12" height="12" rx="2" fill="#e6f6ff" opacity=".85" transform="rotate(-10 56 52)"/><rect x="40" y="58" width="12" height="12" rx="2" fill="#e6f6ff" opacity=".85" transform="rotate(20 46 64)"/><g transform="translate(66 18)"><circle r="11" fill="#5fa82e"/><circle r="9" fill="#c8e88a"/><path d="M0 -9 V9 M-9 0 H9 M-6.4 -6.4 L6.4 6.4 M6.4 -6.4 L-6.4 6.4" stroke="#5fa82e" stroke-width="1"/></g>`;
    }
    // corniccione: pão achatado comprido
    const r = rng(nome);
    let s = `<ellipse cx="51" cy="56" rx="46" ry="30" fill="rgba(0,0,0,.35)"/><ellipse cx="50" cy="52" rx="46" ry="30" fill="#d39a52"/><ellipse cx="50" cy="52" rx="39" ry="23" fill="#e9be74"/>`;
    for (let k = 0; k < 9; k++) { const x = 18 + r() * 64, y = 38 + r() * 28; s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="2.6" ry="1.6" transform="rotate(${f(r() * 180)} ${f(x)} ${f(y)})" fill="#f6e6b8" stroke="#d6b66e" stroke-width=".4"/>`; }
    if (semAcento(desc).includes('gorgonzola')) for (let k = 0; k < 5; k++) { const x = 22 + r() * 56, y = 40 + r() * 24; s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="4" ry="2.8" fill="#eef1e6" stroke="#9fb3a0" stroke-width=".5"/>`; }
    for (let k = 0; k < 5; k++) { const p = { x: 22 + r() * 56, y: 40 + r() * 24, a: r() * 180 }; s += T.folha(p); }
    for (let k = 0; k < 14; k++) { const p = { x: 18 + r() * 64, y: 36 + r() * 30, a: r() * 180 }; s += T.parmesao(p); }
    return s;
  }
  function combo(nome) {
    const t = semAcento(nome);
    const g = pizza(nome + ' g', /calabresa/.test(t) ? 'calabresa cebola azeitona oregano' : /frango/.test(t) ? 'frango catupiry milho oregano' : /portuguesa/.test(t) ? 'presunto ovo tomate cebola ervilha azeitona' : 'requeijao cheddar mussarela oregano', false);
    const dSab = /ninho/.test(t) ? 'leite ninho nutella' : /pacoq/.test(t) ? 'doce de leite pacoquinha' : 'chocolate ao leite chocolate branco granulado';
    const d = pizza(nome + ' d', dSab, true);
    const beb = bebida(/coca/.test(t) ? 'coca-cola 2l' : /roller/.test(t) ? 'roller 2l' : 'poty 2l');
    return `<g transform="translate(-2 6) scale(.72)">${g}</g><g transform="translate(46 50) scale(.46)">${d}</g><g transform="translate(58 -2) scale(.5)">${beb}</g>`;
  }

  const DEFS = `<defs><linearGradient id="brilho" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset=".22" stop-color="#fff" stop-opacity=".28"/><stop offset=".34" stop-color="#fff" stop-opacity=".0"/><stop offset=".8" stop-color="#000" stop-opacity=".0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient></defs>`;

  function desenhar(categoria, nome, desc) {
    let corpo;
    if (categoria === 'pizzas-salgadas') corpo = pizza(nome, desc, false);
    else if (categoria === 'pizzas-doces') corpo = pizza(nome, desc, true);
    else if (categoria === 'massas') corpo = massa(nome);
    else if (categoria === 'bebidas') corpo = bebida(nome);
    else if (categoria === 'cervejas') corpo = cerveja(nome);
    else if (categoria === 'combos') corpo = combo(nome);
    else if (categoria === 'entradas') corpo = entrada(nome, desc);
    else corpo = pizza(nome, desc, false);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${DEFS}${corpo}</svg>`;
  }
  // ---------- categorias (cartões deitados 160x100) ----------
  const g = (x, y, esc, corpo, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot} 50 50) scale(${esc})">${corpo}</g>`;
  function categoria(id) {
    const fundo = `<defs><radialGradient id="cf" cx=".72" cy=".45" r=".85"><stop offset="0" stop-color="#d81f3a"/><stop offset=".55" stop-color="#7d0f22"/><stop offset="1" stop-color="#2a070d"/></radialGradient></defs><rect width="160" height="100" fill="url(#cf)"/>` +
      Array.from({ length: 18 }, (_, k) => `<circle cx="${(k * 37) % 160}" cy="${(k * 53) % 100}" r="${1 + (k % 3) * .6}" fill="#fff" opacity=".07"/>`).join('');
    let c = '';
    if (id === 'pizzas-salgadas') c = g(70, 6, .9, pizza('Calabresa da casa', 'calabresa cebola azeitona oregano', false));
    else if (id === 'pizzas-doces') c = g(70, 6, .9, pizza('Nutella com morango doce', 'nutella morango', true));
    else if (id === 'massas') c = g(70, 6, .9, massa('canelone 4 queijos'), 12);
    else if (id === 'entradas') c = g(64, 8, .96, entrada('Corniccione Speciale', 'gorgonzola manjericao'));
    else if (id === 'combos') c = g(64, 4, .96, combo('1 calabresa com requeijao grande + 1 dois amores pequena + 1 coca cola 2l'));
    else if (id === 'bebidas') c = g(76, 14, .8, bebida('coca-cola 2l')) + g(100, 20, .74, bebida('sprite 2l')) + g(122, 30, .62, bebida('suco d.valle maracuja lata'));
    else if (id === 'cervejas') c = g(78, 26, .68, cerveja('heineken')) + g(98, 16, .8, cerveja('antarctica garrafa')) + g(122, 28, .66, cerveja('taca vinho'));
    else if (id === 'promocao') c = g(70, 6, .9, pizza('Portuguesa promo', 'presunto ovos milho ervilha tomate cebola azeitona', false)) +
      `<g transform="translate(84 20) rotate(-12)"><circle r="15" fill="#facc15"/><circle r="12.5" fill="none" stroke="#7d0f22" stroke-width="1" stroke-dasharray="2 2"/><text y="5.5" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="15" fill="#7d0f22">%</text></g>`;
    else c = g(70, 6, .9, pizza(id, 'mussarela tomate oregano', false));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100">${DEFS}${fundo}${c}</svg>`;
  }

  function dataUrl(svg) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }

  window.IlustracoesFiorella = { desenhar, dataUrl, categoria };

  // ---------- liga no cardápio: troca o logo repetido pelo desenho ----------
  function trocar(img) {
    const card = img.parentElement;
    const sec = card.closest('.section-produto');
    if (!sec) return;
    let cat = sec.id;
    if (cat === 'promocoes') { // cópia da promoção: descobre pela presença do P/G
      cat = card.querySelector(':scope > div:nth-child(4) span') ? 'pizzas-salgadas' : 'bebidas';
    }
    const nome = (card.querySelector('h3') || {}).textContent || '';
    const desc = (card.querySelector('h3 + p') || {}).textContent || '';
    img.src = dataUrl(desenhar(cat, nome.trim(), desc.trim()));
    img.classList.add('ilu');
  }
  function varrer() {
    document.querySelectorAll('.menu-item > img').forEach(img => {
      const s = img.getAttribute('src') || '';
      if (s === '' || s.includes('logo2')) trocar(img);
    });
  }
  function pronto(fn) { document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn(); }
  pronto(() => {
    if (!document.querySelector('.produtos-grid')) return;
    const obs = new MutationObserver(varrer);
    document.querySelectorAll('.produtos-grid').forEach(g => obs.observe(g, { childList: true }));
    varrer();
    // fotos das categorias -> ilustração no mesmo padrão
    document.querySelectorAll('nav [data-card] > img').forEach(img => {
      const card = img.parentElement;
      const m = (card.getAttribute('onclick') || '').match(/mostrarSecao\('([^']+)'\)/);
      const id = m ? (m[1] === 'promocoes' ? 'promocao' : m[1]) : '';
      if (!id) return;
      img.src = dataUrl(categoria(id));
      img.classList.add('ilu-cat');
    });
  });
})();
