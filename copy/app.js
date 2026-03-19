
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, onSnapshot, doc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURACIÓN ---
const firebaseConfig = {
    apiKey: "AIzaSyAP2RBfMX8qB1FcBbjBZoTvAnxQxY5_IYM",
    authDomain: "express-faena-tienda.firebaseapp.com",
    projectId: "express-faena-tienda",
    storageBucket: "express-faena-tienda.firebasestorage.app",
    messagingSenderId: "1009353188382",
    appId: "1:1009353188382:web:10765ffed9fc9d26767a0f",
    measurementId: "G-KH92E5K2TS"
};

const ADMIN_PHONE_NUMBER = "56966840210";
const DELIVERY_COST = 1500; // Costo por delivery

// --- INICIALIZACIÓN Y ESTADO ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let carrito = JSON.parse(localStorage.getItem('cart')) || [];
let allProducts = [];
let messages = [];
let deliveryCost = 0;

// --- ELEMENTOS DEL DOM ---
const catalogoContainer = document.getElementById('catalogo-container');
const totalPedidoDisplay = document.getElementById('total-pedido-display');
const verPedidoBtn = document.getElementById('ver-pedido-btn');
const checkoutModal = document.getElementById('checkout-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const checkoutCartItems = document.getElementById('checkout-cart-items');
const checkoutName = document.getElementById('checkout-name');
const checkoutPhone = document.getElementById('checkout-phone');
const checkoutObservations = document.getElementById('checkout-observations');
const summarySubtotal = document.getElementById('summary-subtotal');
const summaryDelivery = document.getElementById('summary-delivery');
const summaryTotal = document.getElementById('summary-total');
const sendWhatsappBtn = document.getElementById('send-whatsapp-btn');
const messageTickerContainer = document.getElementById('message-ticker-container');

// --- CARGA DE DATOS ---
// Cargar productos
onSnapshot(collection(db, "productos"), (snapshot) => {
    allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderAllProducts();
    updateTotals(); 
});

// Cargar mensajes
async function loadMessages() {
    const querySnapshot = await getDocs(collection(db, "mensajes"));
    messages = querySnapshot.docs.map(doc => doc.data().texto).filter(Boolean);
    if (messages.length > 0) {
        if (messages.length === 1) {
            messageTickerContainer.textContent = messages[0];
        } else {
            let currentMessage = 0;
            setInterval(() => {
                messageTickerContainer.style.opacity = 0;
                setTimeout(() => {
                    currentMessage = (currentMessage + 1) % messages.length;
                    messageTickerContainer.textContent = messages[currentMessage];
                    messageTickerContainer.style.opacity = 1;
                }, 500); // fade out duration
            }, 5000); // time per message
        }
    }
}

// --- RENDERIZADO DE PRODUCTOS ---
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
    categoryOrder.forEach(category => {
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
    });
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
        <img src="${thumbnailUrl}" alt="${p.nombre}" class="w-full h-24 object-cover rounded-lg mb-2">
        <div class="flex-grow flex flex-col justify-between">
            <div><h4 class="text-sm font-bold text-white leading-tight">${p.nombre}</h4></div>
            <div>
                <p class="text-lg font-black text-yellow-400">$${finalPrice.toLocaleString('es-CL')}</p>
                <button onclick="window.addToCart('${p.id}')" class="bg-gray-700 w-full mt-2 py-2 rounded-lg font-bold uppercase tracking-wide active:scale-95 transition-transform ${isOutOfStock ? 'cursor-not-allowed bg-gray-600' : ''}" ${isOutOfStock ? 'disabled' : ''}>
                    ${isOutOfStock ? 'Agotado' : 'AGREGAR'}
                </button>
            </div>
        </div>
    `;
    return card;
}

// --- LÓGICA DEL CARRITO ---
window.addToCart = (productId) => {
    const productInDB = allProducts.find(p => p.id === productId);
    if (!productInDB || productInDB.stock <= 0) return alert("Este producto está agotado.");

    const itemsInCart = carrito.filter(p => p.id === productId).length;
    if (itemsInCart >= productInDB.stock) return alert(`No puedes agregar más de ${productInDB.stock} unidades de este producto.`);

    const finalPrice = productInDB.descuento > 0 ? productInDB.precio * (1 - productInDB.descuento / 100) : productInDB.precio;
    carrito.push({ ...productInDB, precioFinal: finalPrice });
    saveCartAndRefresh();
};

window.increaseQuantity = (productId) => { window.addToCart(productId); };

window.decreaseQuantity = (productId) => {
    const itemIndex = carrito.findIndex(p => p.id === productId);
    if (itemIndex > -1) carrito.splice(itemIndex, 1);
    saveCartAndRefresh();
};

function saveCartAndRefresh() {
    localStorage.setItem('cart', JSON.stringify(carrito));
    updateTotals();
    if (!checkoutModal.classList.contains('hidden')) {
        renderCartInModal();
    }
}

function getGroupedCart() {
    return carrito.reduce((acc, item) => {
        const key = item.id;
        if (!acc[key]) {
            const productData = allProducts.find(p => p.id === item.id) || item;
            acc[key] = { ...productData, quantity: 0, precioFinal: item.precioFinal };
        }
        acc[key].quantity++;
        return acc;
    }, {});
}

function updateTotals() {
    const subtotal = carrito.reduce((sum, item) => sum + item.precioFinal, 0);
    const total = subtotal + deliveryCost;
    const format = (val) => `$${val.toLocaleString('es-CL')}`;

    totalPedidoDisplay.innerText = format(total);
    summarySubtotal.innerText = format(subtotal);
    summaryDelivery.innerText = format(deliveryCost);
    summaryTotal.innerText = format(total);
}

// --- LÓGICA DEL MODAL DE CHECKOUT ---
function renderCartInModal() {
    const groupedCart = getGroupedCart();
    checkoutCartItems.innerHTML = "";
    if (Object.keys(groupedCart).length === 0) {
        checkoutCartItems.innerHTML = "<p class='text-center text-gray-500'>Tu carrito está vacío.</p>";
        return;
    }
    for (const [id, data] of Object.entries(groupedCart)) {
        const itemTotal = data.precioFinal * data.quantity;
        checkoutCartItems.innerHTML += `
            <div class="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
                <div>
                    <p class="font-bold text-white">${data.nombre}</p>
                    <p class="text-sm text-yellow-400 font-bold">$${itemTotal.toLocaleString('es-CL')}</p>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="window.decreaseQuantity('${id}')" class="w-8 h-8 bg-gray-600 rounded-full font-bold text-lg">-</button>
                    <span class="font-bold text-lg text-white">${data.quantity}</span>
                    <button onclick="window.increaseQuantity('${id}')" class="w-8 h-8 bg-gray-600 rounded-full font-bold text-lg">+</button>
                </div>
            </div>
        `;
    }
}

verPedidoBtn.addEventListener('click', () => {
    renderCartInModal();
    updateTotals();
    checkoutModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => checkoutModal.classList.add('hidden'));

// --- LÓGICA DE ENVÍO ---
document.querySelectorAll('input[name="delivery-option"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        deliveryCost = e.target.value === 'otro' ? DELIVERY_COST : 0;
        updateTotals();
    });
});

sendWhatsappBtn.addEventListener('click', async () => {
    const groupedCart = getGroupedCart();
    if (Object.keys(groupedCart).length === 0) return alert("Tu carrito está vacío.");

    const name = checkoutName.value.trim();
    const phone = checkoutPhone.value.trim();
    if (!name || !phone || phone.length < 12) return alert("Por favor, completa tu Nombre y Teléfono de WhatsApp válido (+569...).");
    
    const deliveryOption = document.querySelector('input[name="delivery-option"]:checked').value;
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
    const observations = checkoutObservations.value.trim();

    // Verificación de stock
    let stockError = false;
    for (const [id, item] of Object.entries(groupedCart)) {
        const productInDB = allProducts.find(p => p.id === id);
        if (!productInDB || item.quantity > productInDB.stock) {
            stockError = true;
            alert(`¡Ups! El producto "${item.nombre}" tiene stock insuficiente. Por favor, ajusta tu carrito.`);
            break;
        }
    }
    if (stockError) return;

    // Transacción Atómica
    try {
        const batch = writeBatch(db);
        const subtotal = carrito.reduce((s, i) => s + i.precioFinal, 0);
        const total = subtotal + deliveryCost;

        // 1. Descontar stock
        Object.values(groupedCart).forEach(item => {
            const productRef = doc(db, "productos", item.id);
            const newStock = item.stock - item.quantity;
            batch.update(productRef, { stock: newStock });
        });

        // 2. Crear registro del pedido
        const orderRef = doc(collection(db, "pedidos_completos"));
        batch.set(orderRef, {
            customerName: name,
            customerPhone: phone,
            items: Object.values(groupedCart).map(i => ({id: i.id, nombre: i.nombre, quantity: i.quantity, precioFinal: i.precioFinal})),
            subtotal, deliveryCost, total,
            deliveryOption, paymentMethod, observations,
            createdAt: serverTimestamp(),
            status: 'Pendiente'
        });

        await batch.commit();

        // 3. Enviar a WhatsApp
        let msg = `*-- NUEVO PEDIDO EXPRESS FAENA --*\n\n`;
        msg += `*CLIENTE:* ${name}\n`;
        msg += `*TELÉFONO:* ${phone}\n\n`;
        msg += `*PRODUCTOS:*\n`;
        Object.values(groupedCart).forEach(item => {
            msg += `• ${item.quantity}x ${item.nombre}\n`;
        });
        msg += `\n*ENTREGA:* ${deliveryOption === 'faena' ? 'En Faena' : 'Otra Dirección'}\n`;
        msg += `*PAGO:* ${paymentMethod}\n`;
        if (observations) msg += `*OBS:* ${observations}\n`;
        msg += `\n--------------------\n`;
        msg += `*Subtotal:* $${subtotal.toLocaleString('es-CL')}\n`;
        msg += `*Delivery:* $${deliveryCost.toLocaleString('es-CL')}\n`;
        msg += `*💰 TOTAL:* $${total.toLocaleString('es-CL')}\n`;

        window.open(`https://wa.me/${ADMIN_PHONE_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');

        // 4. Limpiar estado
        carrito = [];
        checkoutName.value = '';
        checkoutObservations.value = '';
        checkoutModal.classList.add('hidden');
        saveCartAndRefresh();

    } catch (error) {
        console.error("Error procesando el pedido: ", error);
        alert("Hubo un problema al procesar tu pedido. Por favor, inténtalo de nuevo.");
    }
});

// --- INICIO --- 
document.addEventListener('DOMContentLoaded', () => {
    updateTotals();
    loadMessages();
    // Restaurar el estado de delivery por si se recarga la página
    deliveryCost = document.querySelector('input[name="delivery-option"]:checked').value === 'otro' ? DELIVERY_COST : 0;
    updateTotals();
});
