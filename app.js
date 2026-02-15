
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDoc, doc, onSnapshot, query, where, serverTimestamp, writeBatch, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- STORE CONFIG ---
const ADMIN_PHONE_NUMBER = "56966840210"; // Reemplaza con tu número

// --- INITIALIZE APP & STATE ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let carrito = JSON.parse(localStorage.getItem('cart')) || [];
let allProducts = [];

// --- DOM ELEMENTS ---
const catalogoContainer = document.getElementById('catalogo-container');
const totalCarritoDisplay = document.getElementById('total-carrito');
const cartModal = document.getElementById('cart-modal');
const cartItemsContainer = document.getElementById('cart-items');
const checkoutNameInput = document.getElementById('checkout-name');
const checkoutPhoneInput = document.getElementById('checkout-phone');
const summaryTotalEl = document.getElementById('summary-total');

// --- DATA LOADING ---
onSnapshot(query(collection(db, "productos")), (snapshot) => {
    allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderAllProducts();
    // Si el carrito está abierto, volver a renderizarlo con el stock actualizado
    if (!cartModal.classList.contains('hidden')) {
        renderCart();
    }
});

function renderAllProducts() {
    if (!catalogoContainer) return;
    const groupedByCategory = allProducts.reduce((acc, product) => {
        const category = product.categoria || 'Otros';
        if (!acc[category]) acc[category] = [];
        acc[category].push(product);
        return acc;
    }, {});
    const categoryOrder = ['Combos', 'Bebidas', 'Snacks', 'Cigarros', 'Energéticas', 'Otros'];
    catalogoContainer.innerHTML = '';
    for (const category of categoryOrder) {
        if (groupedByCategory[category]) {
            const section = document.createElement('section');
            section.id = `category-${category.toLowerCase()}`;
            section.innerHTML = `<h2 class="text-2xl font-bold text-white mb-4 border-l-4 border-yellow-400 pl-3">${category}</h2>`;
            const grid = document.createElement('div');
            grid.className = 'grid grid-cols-2 gap-4';
            groupedByCategory[category].forEach(p => grid.appendChild(createProductCard(p)));
            section.appendChild(grid);
            catalogoContainer.appendChild(section);
        }
    }
}

function createProductCard(p) {
    const card = document.createElement('div');
    const isOutOfStock = p.stock <= 0;
    card.className = `bg-gray-800 rounded-2xl shadow-lg p-3 flex flex-col text-center relative ${isOutOfStock ? 'opacity-50' : ''}`;

    const finalPrice = p.descuento > 0 ? p.precio * (1 - p.descuento / 100) : p.precio;
    const thumbnailUrl = (p.images && p.images.length > 0) ? p.images[0] : 'https://via.placeholder.com/150';

    let stockBadge = '';
    if (isOutOfStock) {
        stockBadge = `<div class="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">AGOTADO</div>`;
    } else if (p.stock > 0 && p.stock <= 10) {
        stockBadge = `<div class="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">¡QUEDAN ${p.stock}!</div>`;
    }

    card.innerHTML = `
        ${stockBadge}
        <img src="${thumbnailUrl}" alt="${p.nombre}" class="w-full h-24 object-cover rounded-lg mb-2 cursor-pointer">
        <div class="flex-grow flex flex-col justify-between">
            <div>
                <h4 class="text-sm font-bold text-white leading-tight">${p.nombre}</h4>
            </div>
            <div>
                <p class="text-lg font-black text-yellow-400">$${finalPrice.toLocaleString('es-CL')}</p>
                <button onclick="addToCart('${p.id}')" class="bg-gray-700 w-full mt-2 py-2 rounded-lg font-bold uppercase tracking-wide active:scale-95 transition-transform ${isOutOfStock ? 'cursor-not-allowed bg-gray-600' : ''}" ${isOutOfStock ? 'disabled' : ''}>
                    ${isOutOfStock ? 'Agotado' : 'Agregar'}
                </button>
            </div>
        </div>
    `;
    return card;
}

// --- CART LOGIC ---
window.addToCart = (productId) => {
    const productInDB = allProducts.find(p => p.id === productId);
    if (!productInDB || productInDB.stock <= 0) {
        alert("Este producto está agotado.");
        return;
    }

    const itemsInCart = carrito.filter(p => p.id === productId).length;
    if (itemsInCart >= productInDB.stock) {
        alert(`No puedes agregar más de ${productInDB.stock} unidades de este producto.`);
        return;
    }

    const finalPrice = productInDB.descuento > 0 ? productInDB.precio * (1 - productInDB.descuento / 100) : productInDB.precio;
    carrito.push({ ...productInDB, precioFinal: finalPrice });
    saveCartAndRefresh();
};

function saveCartAndRefresh() {
    localStorage.setItem('cart', JSON.stringify(carrito));
    updateTotals();
    if (!cartModal.classList.contains('hidden')) {
        renderCart();
    }
}

function updateTotals() {
    const total = carrito.reduce((sum, item) => sum + item.precioFinal, 0);
    summaryTotalEl.innerText = `$${total.toLocaleString('es-CL')}`;
    totalCarritoDisplay.innerText = `$${total.toLocaleString('es-CL')}`;
}

function getGroupedCart() {
    return carrito.reduce((acc, item) => {
        if (!acc[item.id]) {
            const productData = allProducts.find(p => p.id === item.id) || item;
            acc[item.id] = { ...productData, quantity: 0 };
        }
        acc[item.id].quantity++;
        return acc;
    }, {});
}

window.increaseQuantity = (productId) => { addToCart(productId); };
window.decreaseQuantity = (productId) => {
    const itemIndex = carrito.findIndex(p => p.id === productId);
    if (itemIndex > -1) carrito.splice(itemIndex, 1);
    saveCartAndRefresh();
};

function renderCart() {
    const groupedCart = getGroupedCart();
    cartItemsContainer.innerHTML = "";
    if (Object.keys(groupedCart).length === 0) {
        cartItemsContainer.innerHTML = "<p class='text-center text-gray-500'>Tu carrito está vacío.</p>";
        return;
    }
    for (const [id, data] of Object.entries(groupedCart)) {
        const isStockExceeded = data.quantity > data.stock;
        cartItemsContainer.innerHTML += `
            <div class="flex justify-between items-center bg-gray-700 p-3 rounded-lg ${isStockExceeded ? 'border-2 border-red-500' : ''}">
                <div>
                    <p class="font-bold text-white">${data.nombre}</p>
                    <p class="text-sm text-gray-400">$${(data.precioFinal * data.quantity).toLocaleString('es-CL')}</p>
                    ${isStockExceeded ? `<p class="text-xs text-red-400 font-bold">Stock insuficiente (disponible: ${data.stock})</p>` : ''}
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="decreaseQuantity('${id}')" class="w-8 h-8 bg-gray-600 rounded-full font-bold text-lg">-</button>
                    <span class="font-bold text-lg text-white">${data.quantity}</span>
                    <button onclick="increaseQuantity('${id}')" class="w-8 h-8 bg-gray-600 rounded-full font-bold text-lg ${data.quantity >= data.stock ? 'opacity-50 cursor-not-allowed' : ''}" ${data.quantity >= data.stock ? 'disabled' : ''}>+</button>
                </div>
            </div>
        `;
    }
}

// --- CHECKOUT LOGIC ---
window.enviarWhatsApp = async () => {
    const groupedCart = getGroupedCart();
    if (Object.keys(groupedCart).length === 0) return alert("Tu carrito está vacío.");

    const name = checkoutNameInput.value.trim();
    const phone = checkoutPhoneInput.value.trim();
    if (!name || !phone) return alert("Por favor, completa tu Nombre y Teléfono.");

    // -- VERIFICACIÓN DE STOCK ANTES DE ENVIAR --
    let stockError = false;
    for (const [id, item] of Object.entries(groupedCart)) {
        const productInDB = allProducts.find(p => p.id === id);
        if (!productInDB || item.quantity > productInDB.stock) {
            stockError = true;
            alert(`¡Ups! El producto "${item.nombre}" se acaba de agotar o no tienes suficiente stock. Por favor, ajusta tu carrito.`);
            break;
        }
    }
    if (stockError) {
        renderCart(); // Re-render para mostrar el error
        return;
    }

    // -- INICIO DE TRANSACCIÓN ATÓMICA --
    try {
        const batch = writeBatch(db);
        
        // 1. Descontar stock de cada producto
        for (const [id, item] of Object.entries(groupedCart)) {
            const productRef = doc(db, "productos", id);
            const newStock = item.stock - item.quantity;
            batch.update(productRef, { stock: newStock });
        }

        // 2. Crear el registro del pedido
        const total = carrito.reduce((s, i) => s + i.precioFinal, 0);
        const orderData = {
            customerName: name,
            customerPhone: phone,
            items: Object.values(groupedCart).map(i => ({id: i.id, nombre: i.nombre, quantity: i.quantity, precioFinal: i.precioFinal})),
            total,
            createdAt: serverTimestamp(),
            status: 'Pendiente' // Estado inicial
        };
        const orderRef = doc(collection(db, "pedidos_completos"));
        batch.set(orderRef, orderData);

        // 3. Ejecutar la transacción
        await batch.commit();

        // 4. Si todo va bien, construir y enviar mensaje de WhatsApp
        let msg = `*-- NUEVO PEDIDO EXPRESS FAENA --*\n\n*Cliente:* ${name}\n*Teléfono:* ${phone}\n\n*PRODUCTOS:*\n`;
        for (const item of Object.values(groupedCart)) {
            msg += `• ${item.quantity}x ${item.nombre}\n`;
        }
        msg += `\n*💰 TOTAL A PAGAR: $${total.toLocaleString('es-CL')}*`;
        window.open(`https://wa.me/${ADMIN_PHONE_NUMBER}?text=${encodeURIComponent(msg)}`);

        // 5. Limpiar todo
        carrito = [];
        checkoutNameInput.value = '';
        checkoutPhoneInput.value = '';
        saveCartAndRefresh();
        hideCart();

    } catch (error) {
        console.error("Error al procesar el pedido: ", error);
        alert("Hubo un problema al procesar tu pedido. Por favor, inténtalo de nuevo. Si el problema persiste, contacta al administrador.");
    }
};

// --- UI & MODALS ---
window.showCart = () => {
    renderCart();
    updateTotals();
    cartModal.classList.remove('hidden');
};
window.hideCart = () => cartModal.classList.add('hidden');

// --- INITIAL LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    updateTotals();
});