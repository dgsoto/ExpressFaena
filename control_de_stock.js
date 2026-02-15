
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, runTransaction, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- INITIALIZE APP & DOM ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const stockTableBody = document.getElementById('stock-table-body');
const loadingState = document.getElementById('loading-state');
const searchInput = document.getElementById('search-input');
const filterSelect = document.getElementById('filter-select');

let allProducts = [];

// --- REAL-TIME DATA LISTENER ---
const q = query(collection(db, "productos"), orderBy("nombre"));
onSnapshot(q, (snapshot) => {
    allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderTable();
    loadingState.style.display = 'none';
}, (error) => {
    console.error("Error al cargar productos: ", error);
    loadingState.innerHTML = `<p class="text-red-500">Error al cargar el inventario. Revise la consola.</p>`;
});

// --- TABLE RENDERING ---
function renderTable() {
    const searchTerm = searchInput.value.toLowerCase();
    const filterValue = filterSelect.value;

    const filteredProducts = allProducts.filter(p => {
        // Filtro por búsqueda
        const nameMatch = p.nombre.toLowerCase().includes(searchTerm);

        // Filtro por estado
        const stock = p.stock || 0;
        let statusMatch = false;
        if (filterValue === 'all') {
            statusMatch = true;
        } else if (filterValue === 'saludable' && stock > 10) {
            statusMatch = true;
        } else if (filterValue === 'bajo' && stock > 0 && stock <= 10) {
            statusMatch = true;
        } else if (filterValue === 'critico' && stock <= 0) {
            statusMatch = true;
        }

        return nameMatch && statusMatch;
    });

    stockTableBody.innerHTML = '';
    if (filteredProducts.length === 0) {
        stockTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-gray-500">No se encontraron productos que coincidan con los filtros.</td></tr>`;
        return;
    }

    filteredProducts.forEach(p => {
        const row = document.createElement('tr');
        row.className = "bg-white border-b hover:bg-gray-50";

        const stock = p.stock !== undefined && p.stock !== null ? p.stock : 0;

        // --- Status Badge Logic ---
        let statusBadge;
        if (stock > 10) {
            statusBadge = `<span class="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Saludable</span>`;
        } else if (stock > 0 && stock <= 10) {
            statusBadge = `<span class="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Bajo</span>`;
        } else {
            statusBadge = `<span class="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Crítico</span>`;
        }

        const thumbnailUrl = (p.images && p.images.length > 0) ? p.images[0] : 'https://via.placeholder.com/40';

        row.innerHTML = `
            <td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap flex items-center gap-3">
                <img src="${thumbnailUrl}" class="w-10 h-10 rounded-md object-cover">
                <span>${p.nombre}</span>
            </td>
            <td class="px-6 py-4 text-center text-lg font-bold text-gray-800">${stock}</td>
            <td class="px-6 py-4 text-center">${statusBadge}</td>
            <td class="px-6 py-4 text-center">
                <div class="flex justify-center items-center gap-2">
                    <button onclick="window.adjustStock('${p.id}', -1)" class="w-8 h-8 bg-red-500 text-white rounded-full font-bold text-lg hover:bg-red-600 transition disabled:opacity-50" ${stock <= 0 ? 'disabled' : ''}>-</button>
                    <button onclick="window.adjustStock('${p.id}', 1)" class="w-8 h-8 bg-green-500 text-white rounded-full font-bold text-lg hover:bg-green-600 transition">+</button>
                </div>
            </td>
        `;
        stockTableBody.appendChild(row);
    });
}

// --- STOCK ADJUSTMENT ---
window.adjustStock = async (productId, amount) => {
    const productRef = doc(db, "productos", productId);

    try {
        await runTransaction(db, async (transaction) => {
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists()) {
                throw "El producto no existe!";
            }

            const currentStock = productDoc.data().stock || 0;
            const newStock = currentStock + amount;

            if (newStock < 0) {
                // Esto previene que el stock se vuelva negativo con el botón de restar.
                transaction.update(productRef, { stock: 0 });
            } else {
                transaction.update(productRef, { stock: newStock });
            }
        });
        // El listener onSnapshot se encargará de re-renderizar la tabla, no es necesario llamar a renderTable() aquí.
        showToast(`Stock ajustado.`, 'bg-blue-500');

    } catch (error) {
        console.error("Error al ajustar el stock: ", error);
        showToast("Error al ajustar el stock.", 'bg-red-600');
    }
};

// --- UI EVENT LISTENERS ---
searchInput.addEventListener('input', renderTable);
filterSelect.addEventListener('change', renderTable);

// --- TOAST NOTIFICATION ---
function showToast(message, bgColor) {
    const toast = document.getElementById('toast-notification');
    toast.textContent = message;
    toast.className = `fixed top-24 right-8 ${bgColor} text-white text-sm font-bold px-4 py-3 rounded-lg shadow-lg z-50`;
    toast.classList.remove('hidden');
    setTimeout(() => { toast.classList.add('hidden'); }, 3000);
}
