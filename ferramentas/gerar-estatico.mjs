// Gera o HTML de reserva do index.html a partir do conteúdo de fábrica (assets/site.js → PADRAO).
// É o que aparece para o Google e quando o banco do painel não responde.
// Uso (na pasta do site): node ferramentas/gerar-estatico.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const { PADRAO, SECOES } = await import(pathToFileURL(join(raiz, "assets", "site.js")).href);

const arq = join(raiz, "index.html");
let html = readFileSync(arq, "utf8");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

for (const [id, fn] of Object.entries(SECOES)) {
  const re = new RegExp(`<!--SECAO:${id}-->[\\s\\S]*?(<!--/SECAO:${id}-->|(?=</section>))`);
  if (!re.test(html)) { console.warn("sem marcador:", id); continue; }
  html = html.replace(re, `<!--SECAO:${id}-->${fn(PADRAO)}<!--/SECAO:${id}-->`);
}
html = html.replace(/<!--RODAPE:texto-->[\s\S]*?(<!--\/RODAPE:texto-->|(?=<\/p>))/, `<!--RODAPE:texto-->${esc(PADRAO.rodape.texto)}<!--/RODAPE:texto-->`);
// seções opcionais desligadas no padrão começam escondidas
for (const [id, chave] of [["planos", "planos"], ["depoimentos", "depoimentos"]]) {
  const ligado = !!PADRAO[chave].mostrar && (chave !== "depoimentos" || PADRAO.depoimentos.itens.some((x) => x.texto));
  html = html.replace(new RegExp(`<section id="${id}" class="([^"]*?)( hidden)?"`), (_, c) => `<section id="${id}" class="${c}${ligado ? "" : " hidden"}"`);
}
writeFileSync(arq, html);
console.log("index.html atualizado com o conteúdo padrão.");
