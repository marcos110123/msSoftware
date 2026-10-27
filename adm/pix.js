// PIX "copia e cola" (BR Code estático, padrão EMV do Banco Central) já com o valor.

const campo = (id, valor) => id + String(valor.length).padStart(2, "0") + valor;

// sem acento e só caracteres aceitos pelos bancos no nome/cidade do recebedor
const limpar = (s, max) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^A-Za-z0-9 .\-]/g, "").trim().toUpperCase().slice(0, max);

// CRC16-CCITT (polinômio 0x1021, início 0xFFFF), exigido no fim do código
function crc16(txt) {
  let crc = 0xffff;
  for (let i = 0; i < txt.length; i++) {
    crc ^= txt.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// Chave do jeito que o PIX espera. O tipo vem da configuração (CPF sem pontos e celular podem ter os mesmos 11 dígitos).
export function normalizarChave(chave, tipo) {
  const c = String(chave || "").trim();
  const n = c.replace(/\D/g, "");
  if (tipo === "celular") return "+" + (n.length <= 11 ? "55" + n : n);   // +55 DDD número
  if (tipo === "cpf" || tipo === "cnpj") return n;
  return c.toLowerCase(); // e-mail ou chave aleatória
}

/**
 * gerarPix({ chave, tipo, nome, cidade, valor, id }) -> texto do copia e cola
 * tipo: "celular" | "cpf" | "cnpj" | "email" | "aleatoria"
 * id: identificador da cobrança (até 25 letras/números), aparece no extrato do banco
 */
export function gerarPix({ chave, tipo, nome, cidade, valor, id = "***" }) {
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", normalizarChave(chave, tipo));
  const txid = String(id).replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  let p = campo("00", "01")
    + campo("26", conta)
    + campo("52", "0000")
    + campo("53", "986")
    + (Number(valor) > 0 ? campo("54", Number(valor).toFixed(2)) : "")
    + campo("58", "BR")
    + campo("59", limpar(nome, 25) || "RECEBEDOR")
    + campo("60", limpar(cidade, 15) || "BRASIL")
    + campo("62", campo("05", txid))
    + "6304";
  return p + crc16(p);
}
