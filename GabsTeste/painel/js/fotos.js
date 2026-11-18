// FOTOS DOS PRODUTOS: reduz a foto no próprio navegador e envia para o Firebase Storage.
// O link gerado é gravado no campo "imagem" do produto — o cardápio já usa esse campo direto.
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { app } from "./base.js?v=1.0.3";
import { FOTOS } from "./config.js?v=1.0.3";

const storage = getStorage(app);

// Reduz a foto (celular tira fotos de 3–5 MB; o cardápio precisa de ~100 KB).
// Devolve { blob, url } — url é uma prévia local para mostrar na tela antes de enviar.
export async function prepararFoto(arquivo) {
  if (!arquivo?.type?.startsWith("image/")) throw new Error("O arquivo escolhido não é uma imagem.");
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, FOTOS.larguraMaxima / bitmap.width, FOTOS.larguraMaxima / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; // PNG com fundo transparente fica com fundo branco
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise((ok) => canvas.toBlob(ok, "image/webp", FOTOS.qualidade));
  if (!blob) throw new Error("Não foi possível processar a foto.");
  return { blob, url: URL.createObjectURL(blob) };
}

// Nome do arquivo: "produtos/esfiha-de-carne-1727300000000.webp"
const nomeArquivo = (nomeProduto) => {
  const base = String(nomeProduto || "produto").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "produto";
  return `${FOTOS.pasta}/${base}-${Date.now()}.webp`;
};

// Envia e devolve o link público da foto
export async function enviarFoto(blob, nomeProduto) {
  const destino = ref(storage, nomeArquivo(nomeProduto));
  await uploadBytes(destino, blob, {
    contentType: "image/webp",
    cacheControl: "public, max-age=31536000" // cada tablet baixa a foto uma vez só
  });
  return getDownloadURL(destino);
}

// A foto foi enviada pelo painel? (fotos antigas, como "img/esfiha.png", ficam no site e não são apagadas)
export const fotoDoPainel = (url) =>
  typeof url === "string" && url.includes("firebasestorage.googleapis.com") && url.includes(encodeURIComponent(FOTOS.pasta + "/"));

// Apaga uma foto enviada pelo painel (troca de foto ou produto excluído). Falha não atrapalha o resto.
export async function apagarFoto(url) {
  if (!fotoDoPainel(url)) return;
  try {
    await deleteObject(ref(storage, url));
  } catch (e) {
    console.warn("Não foi possível apagar a foto antiga:", e);
  }
}
