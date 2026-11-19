// Ponte com o Firebase (no teste local este arquivo é trocado por um Firebase simulado)
export { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
export {
  getFirestore, collection, doc, setDoc, onSnapshot, serverTimestamp, query, where,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
