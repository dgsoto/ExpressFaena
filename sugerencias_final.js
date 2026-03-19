console.log("Executing sugerencias.js vFINAL - TIMESTAMP_BUST");

import "./auth_guard.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, deleteDoc, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAP2RBfMX8qB1FcBbjBZoTvAnxQxY5_IYM",
    authDomain: "express-faena-tienda.firebaseapp.com",
    projectId: "express-faena-tienda",
    storageBucket: "express-faena-tienda.firebasestorage.app",
    messagingSenderId: "1009353188382",
    appId: "1:1009353188382:web:10765ffed9fc9d26767a0f",
    measurementId: "G-KH92E5K2TS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const sugerenciasLista = document.getElementById('sugerencias-lista');
const q = query(collection(db, "sugerencias"));
onSnapshot(q, (snapshot) => {
    const suggestions = {};
    snapshot.docs.forEach((docSnapshot, index) => {
        try {
            const data = docSnapshot.data();
            if (data && typeof data.item === 'string' && data.item.trim() !== '') {
                const item = data.item.trim().toLowerCase();
                if (!suggestions[item]) {
                    suggestions[item] = { count: 0, ids: [] };
                }
                suggestions[item].count++;
                suggestions[item].ids.push(docSnapshot.id);
            } else {
                console.warn(`Skipping malformed suggestion doc at index ${index}:`, docSnapshot.id, data);
            }
        } catch (error) {
            console.error(`An unexpected error occurred while processing document at index ${index} (${docSnapshot.id}). Skipping.`, error);
        }
    });

    const sortedSuggestions = Object.entries(suggestions).sort(([, a], [, b]) => b.count - a.count);

    sugerenciasLista.innerHTML = "";
    if (sortedSuggestions.length === 0) {
        sugerenciasLista.innerHTML = `<p class="text-center text-gray-500">No hay sugerencias por el momento.</p>`;
        return;
    }

    sortedSuggestions.forEach(([item, data]) => {
        const capitalItem = item.charAt(0).toUpperCase() + item.slice(1);
        const escapedItem = capitalItem.replace(/"/g, '&quot;').replace(/'/g, "\\'");

        sugerenciasLista.innerHTML += `
            <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                <div class="flex items-center gap-4">
                    <span class="font-bold text-lg text-gray-700">${data.count}x</span>
                    <p class="font-semibold text-gray-800">${capitalItem}</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.convertToProduct('${escapedItem}')" class="bg-green-500 text-white px-3 py-1 rounded-md text-sm font-semibold flex items-center gap-1.5 hover:bg-green-600 active:scale-95 transition-all" title="Convertir a Producto">
                        <i class="fas fa-plus"></i> Producto
                    </button>
                    <button onclick="window.deleteSuggestion('${data.ids.join(',')}', '${escapedItem}')" class="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-semibold flex items-center gap-1.5 hover:bg-red-600 active:scale-95 transition-all" title="Eliminar Sugerencia">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
    });
});

window.convertToProduct = (itemName) => {
    localStorage.setItem('newProductNameFromSuggestion', itemName);
    window.location.href = 'admin.html';
};

window.deleteSuggestion = async (idString, suggestionText) => {
    const ids = idString.split(',');
    if (confirm(`¿Estás seguro de que quieres eliminar TODAS las sugerencias de \"${suggestionText}\"? (${ids.length} en total)`)) {
        try {
            const deletePromises = ids.map(id => deleteDoc(doc(db, "sugerencias", id)));
            await Promise.all(deletePromises);
        } catch (error) {
            console.error("Error al eliminar las sugerencias: ", error);
            alert("Hubo un error al eliminar las sugerencias. Revisa la consola para más detalles.");
        }
    }
};
