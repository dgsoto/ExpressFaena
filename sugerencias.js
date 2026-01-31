
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- FIREBASE CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyAP2RBfMX8qB1FcBbjBZoTvAnxQxY5_IYM",
    authDomain: "express-faena-tienda.firebaseapp.com",
    projectId: "express-faena-tienda",
    storageBucket: "express-faena-tienda.firebasestorage.app",
    messagingSenderId: "1009353188382",
    appId: "1:1009353188382:web:10765ffed9fc9d26767a0f",
    measurementId: "G-KH92E5K2TS"
};

// --- INITIALIZE APP ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- DOM ELEMENTS ---
const sugerenciasLista = document.getElementById('sugerencias-lista');
const sugerenciaInput = document.getElementById('input-sugerencia');
const notificationBanner = document.getElementById('notification-banner');

// --- REALTIME SUGGESTIONS LISTENER ---
function listenForSugerencias() {
    const q = query(collection(db, "sugerencias"), orderBy("date", "desc"));

    onSnapshot(q, (querySnapshot) => {
        const sugerencias = {};
        querySnapshot.forEach((doc) => {
            const item = doc.data().item.trim();
            if (item) { // Ensure item is not empty
                 sugerencias[item] = (sugerencias[item] || 0) + 1;
            }
        });
        renderSugerencias(sugerencias);
    }, (error) => {
        sugerenciasLista.innerHTML = "<p class='text-center text-red-500'>Error al cargar sugerencias.</p>";
        console.error("Error listening for suggestions: ", error);
    });
}

// --- RENDER SUGGESTIONS ---
function renderSugerencias(sugerencias) {
    if (!sugerenciasLista) return;
    sugerenciasLista.innerHTML = "";

    // Sort suggestions by count descending
    const sortedSugerencias = Object.entries(sugerencias).sort(([,a],[,b]) => b-a);

    if (sortedSugerencias.length === 0) {
        sugerenciasLista.innerHTML = "<p class='text-center text-gray-500'>Aún no hay sugerencias.</p>";
        return;
    }

    for (const [item, count] of sortedSugerencias) {
        sugerenciasLista.innerHTML += `
            <div class="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center animate-fade-in">
                <span class="font-semibold capitalize">${item}</span>
                <span class="bg-gray-200 text-gray-800 text-sm font-bold px-3 py-1 rounded-full">Votos: ${count}</span>
            </div>
        `;
    }
}

// --- SEND SUGGESTION ---
window.enviarSugerencia = async () => {
    const val = sugerenciaInput.value.trim();
    if (!val) return;

    try {
        await addDoc(collection(db, "sugerencias"), { 
            item: val, 
            date: serverTimestamp() 
        });
        
        sugerenciaInput.value = "";
        showNotification();

    } catch (e) {
        alert("No se pudo enviar la sugerencia. Intenta de nuevo.");
        console.error("Error adding document: ", e);
    }
};

// --- NOTIFICATION ---
function showNotification() {
    notificationBanner.classList.remove('hidden');
    notificationBanner.classList.add('animate-fade-in');
    
    setTimeout(() => {
        notificationBanner.classList.add('hidden');
        notificationBanner.classList.remove('animate-fade-in');
    }, 3000);
}

// --- INITIAL LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    listenForSugerencias();
});
