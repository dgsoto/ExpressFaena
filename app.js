
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp, doc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURACIÓN ---
const firebaseConfig = {
    apiKey: "AIzaSyAP2RBfMX8qB1FcBbjBZoTvAnxQxY5_IYM",
    authDomain: "express-faena-tienda.firebaseapp.com",
    projectId: "express-faena-tienda",
    storageBucket: "express-faena-tienda.firebasestorage.app",
    messagingSenderId: "1009353188382",
    appId: "1:1009353188382:web:10765ffed9fc9d26767a0f",
};
const ADMIN_PHONE_NUMBER = "56966840210";
const DELIVERY_COST = 1500;

// --- INICIALIZACIÓN Y ESTADO GLOBAL ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let carrito = JSON.parse(localStorage.getItem('newCart')) || [];
let allProducts = [];
let mediaItems = [];
let deliveryCost = 0;

// --- FUNCIONES HELPER DE PRECIOS ---
const calculateItemPrice = (product, quantity) => {
    if (!product) return 0;
    const basePrice = parseFloat(product.precio) || 0;

    if (product.precios_por_volumen && product.precios_por_volumen.length > 0) {
        let applicableTier = null;
        for (const tier of product.precios_por_volumen) {
            if (quantity >= tier.cantidad) {
                applicableTier = tier;
            }
        }
        if (applicableTier) {
            return parseFloat(applicableTier.precio_unitario);
        }
    }

    const discountPercentage = parseFloat(product.descuento) || 0;
    return discountPercentage > 0
        ? Math.round(basePrice * (1 - discountPercentage / 100))
        : basePrice;
};

document.addEventListener('DOMContentLoaded', () => {

    // --- CACHE DE ELEMENTOS DEL DOM ---
    const get = (id) => document.getElementById(id);
    const catalogoContainer = get('catalogo-container');
    const messageTickerContainer = get('message-ticker-container');
    const totalPedidoDisplay = get('total-pedido-display');
    const sendSuggestionBtn = get('send-suggestion-button');
    const productModal = get('product-modal');
    const productModalContent = get('product-modal-content');
    const productMediaContainer = get('product-media-container');
    const productDetailsContainer = get('product-details-container');
    const closeProductModalBtn = get('close-product-modal');
    const checkoutModal = get('checkout-modal');
    const verPedidoBtn = get('ver-pedido-btn');
    const closeModalBtn = get('close-modal-btn');
    const checkoutCartItems = get('checkout-cart-items');
    const checkoutName = get('checkout-name');
    const checkoutPhone = get('checkout-phone');
    const checkoutObservations = get('checkout-observations');
    const summarySubtotal = get('summary-subtotal');
    const summaryDelivery = get('summary-delivery');
    const summaryTotal = get('summary-total');
    const sendWhatsappBtn = get('send-whatsapp-btn');

    // --- CARGA DE DATOS DE FIREBASE ---
    onSnapshot(collection(db, "productos"), (snapshot) => {
        allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAllProducts();
    });
    onSnapshot(collection(db, "mensajes"), (snapshot) => {
        const messages = snapshot.docs.map(doc => doc.data().texto).filter(Boolean);
        if (messages.length > 0) {
            let i = 0;
            messageTickerContainer.textContent = messages[i];
            setInterval(() => { i = (i + 1) % messages.length; messageTickerContainer.textContent = messages[i]; }, 5000);
            messageTickerContainer.style.display = 'block';
        } else {
            messageTickerContainer.style.display = 'none';
        }
    });

    // --- RENDERIZADO DE LA UI ---
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
        let isFirstCategory = true;
        categoryOrder.forEach(category => {
            if (groupedByCategory[category] && groupedByCategory[category].length > 0) {
                const section = document.createElement('section');
                if (!isFirstCategory) {
                    section.classList.add('mt-6');
                }
                section.innerHTML = `<h2 class="text-2xl font-bold text-white mb-4 border-l-4 border-yellow-400 pl-3">${category}</h2>`;
                const container = document.createElement('div');
                container.className = 'grid grid-cols-2 gap-4';
                groupedByCategory[category].forEach(p => container.appendChild(createProductCard(p)));
                section.appendChild(container);
                catalogoContainer.appendChild(section);
                isFirstCategory = false;
            }
        });
    }

    function createProductCard(p) {
        const card = document.createElement('div');
        const initialStock = parseInt(p.stock) || 0;
        const itemsInCart = carrito.filter(id => id === p.id).length;
        const effectiveStock = initialStock - itemsInCart;

        const isOutOfStock = effectiveStock <= 0;
        const isLowStock = effectiveStock > 0 && effectiveStock <= 3;

        card.className = `bg-[#1f2937] rounded-2xl shadow-lg flex flex-col relative overflow-hidden transition-transform duration-300 ease-in-out hover:scale-105 ${isOutOfStock ? 'opacity-60' : ''}`;
        
        const originalPrice = parseFloat(p.precio) || 0;
        const hasDiscount = (p.descuento || 0) > 0;
        const hasVolumePricing = p.precios_por_volumen && p.precios_por_volumen.length > 0;

        let tags = [];
        const rawTags = p.etiqueta || p.etiquetas || p.tags;
        if (Array.isArray(rawTags)) {
            tags = rawTags.map(t => String(t).trim()).filter(t => t);
        } else if (rawTags && typeof rawTags === 'string') {
            tags = rawTags.split(',').map(t => t.trim()).filter(t => t);
        }

        const tagColors = { "NUEVO": "bg-blue-500", "OFERTA": "bg-green-500", "MAS VENDIDO": "bg-red-600", "MÁS VENDIDO": "bg-red-600", "CYBER": "bg-purple-600" };
        const badgesContainerHTML = `
            <div class="absolute top-2 left-2 flex flex-wrap gap-1 z-10">
                ${tags.map(tag => `
                    <div class="${tagColors[tag.toUpperCase()] || 'bg-gray-700'} text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                        ${tag.toUpperCase() === 'MAS VENDIDO' || tag.toUpperCase() === 'MÁS VENDIDO' ? '🔥 ' : ''}${tag}
                    </div>
                `).join('')}
            </div>`;

        let scarcityBadgeHTML = '';
        if (isLowStock) {
            scarcityBadgeHTML = `
                <div class="mb-1">
                    <span class="bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-md animate-pulse">
                        <i class="fas fa-exclamation-triangle fa-xs mr-1"></i>¡SÓLO QUEDAN ${effectiveStock}!
                    </span>
                </div>`;
        }

        let priceHTML = '';
        if (hasVolumePricing) {
            const lowestPriceTier = p.precios_por_volumen.slice(-1)[0];
            priceHTML = `
                <div class="flex flex-col">
                    <p class="text-sm text-gray-500 line-through">$${originalPrice.toLocaleString('es-CL')} c/u</p>
                    <p class="text-lg font-bold text-yellow-400">Desde $${lowestPriceTier.precio_unitario.toLocaleString('es-CL')} c/u</p>
                    <p class="text-xs text-gray-400">(Llevando ${lowestPriceTier.cantidad} o más)</p>
                </div>`;
        } else if (hasDiscount) {
            const finalPrice = calculateItemPrice(p, 1);
            priceHTML = `<div class="flex items-baseline gap-2"><p class="text-xl font-bold text-yellow-400">$${finalPrice.toLocaleString('es-CL')}</p><p class="text-sm text-gray-500 line-through">$${originalPrice.toLocaleString('es-CL')}</p><span class="text-xs font-bold text-green-400 bg-green-900/50 px-1.5 py-0.5 rounded-md">-${p.descuento}%</span></div>`;
        } else {
            priceHTML = `<p class="text-xl font-bold text-yellow-400">$${originalPrice.toLocaleString('es-CL')}</p>`;
        }

        card.innerHTML = `
            <div class="relative w-full cursor-pointer bg-white rounded-t-2xl" onclick="window.openProductModal('${p.id}')">
                <img src="${(p.images && p.images.length > 0) ? p.images[0] : 'https://via.placeholder.com/150'}" alt="Imagen de ${p.nombre}" class="w-full h-32 object-contain">
                ${badgesContainerHTML}
                ${isOutOfStock ? '<div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center"><span class="text-white font-bold text-lg">AGOTADO</span></div>' : ''}
            </div>
            <div class="p-3 flex-grow flex flex-col">
                ${scarcityBadgeHTML}
                <h4 class="text-base font-semibold text-white leading-tight mb-1 truncate">${p.nombre}</h4>
                ${renderStars(p.estrellas)}
                <div class="mt-auto pt-2">
                    ${priceHTML}
                    <button onclick="window.addToCart('${p.id}', event)" class="bg-gray-700 hover:bg-yellow-500 hover:text-black transition-colors w-full mt-2 py-2 rounded-lg font-bold uppercase tracking-wide active:scale-95 disabled:bg-gray-800 disabled:cursor-not-allowed" ${isOutOfStock ? 'disabled' : ''}>AGREGAR</button>
                </div>
            </div>`;
        return card;
    }

    function renderStars(rating = 0) {
        let stars = '';
        const numericRating = Math.max(0, Math.min(5, Number(rating)));
        for (let i = 1; i <= 5; i++) {
            stars += `<i class="fas fa-star ${i <= numericRating ? 'text-yellow-400' : 'text-gray-600'}"></i>`;
        }
        return `<div class="flex items-center justify-start text-xs mb-1">${stars}</div>`;
    }

    window.openProductModal = (productId) => {
        const p = allProducts.find(p => p.id === productId);
        if (!p) return;
        mediaItems = [];
        if (p.video) mediaItems.push({ type: 'video', src: p.video });
        if (p.images && p.images.length > 0) p.images.forEach(img => mediaItems.push({ type: 'image', src: img }));
        if (mediaItems.length === 0) mediaItems.push({ type: 'image', src: 'https://via.placeholder.com/400' });
        
        productMediaContainer.innerHTML = `<div class="w-full h-full bg-white flex items-center justify-center rounded-t-xl"><img src="${(p.images && p.images.length > 0) ? p.images[0] : 'https://via.placeholder.com/150'}" alt="Imagen de ${p.nombre}" class="max-w-full max-h-full object-contain"></div>`;

        const originalPrice = parseFloat(p.precio) || 0;
        const hasVolumePricing = p.precios_por_volumen && p.precios_por_volumen.length > 0;

        let priceHTML = '';
        if (hasVolumePricing) {
            priceHTML = `<p class="text-3xl font-bold text-yellow-400">$${originalPrice.toLocaleString('es-CL')} c/u</p>`;
            priceHTML += `<div class="mt-2 space-y-1">`;
            p.precios_por_volumen.forEach(tier => {
                priceHTML += `<p class="text-green-400 font-bold"><i class="fas fa-tag"></i> Llevando ${tier.cantidad} o más: $${tier.precio_unitario.toLocaleString('es-CL')} c/u</p>`;
            });
            priceHTML += `</div>`;
        } else {
             const finalPrice = calculateItemPrice(p, 1);
             const hasDiscount = (p.descuento || 0) > 0;
             if(hasDiscount) {
                priceHTML = `<div class="flex items-baseline gap-2"><p class="text-3xl font-bold text-yellow-400">$${finalPrice.toLocaleString('es-CL')}</p><p class="text-lg text-gray-500 line-through">$${originalPrice.toLocaleString('es-CL')}</p></div>`;
             } else {
                priceHTML = `<p class="text-3xl font-bold text-yellow-400">$${finalPrice.toLocaleString('es-CL')}</p>`;
             }
        }

        productDetailsContainer.innerHTML = `
            <h3 class="text-2xl font-bold text-white">${p.nombre}</h3>
            <div class="my-2">${renderStars(p.estrellas)}</div>
            <p class="text-gray-300 mb-4">${p.descripcion || ''}</p>
            ${priceHTML}
            <button onclick="window.addToCart('${p.id}', event); window.closeProductModal();" class="bg-yellow-400 text-black w-full mt-4 py-3 rounded-lg font-bold uppercase tracking-wide active:scale-95">Agregar y Cerrar</button>
        `;
        productModal.classList.remove('hidden');
        setTimeout(() => productModalContent.classList.remove('scale-95', 'opacity-0'), 10);
    };
    window.closeProductModal = () => {
        productModalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => productModal.classList.add('hidden'), 300);
    };

    window.addToCart = (productId, event) => {
        if (event) event.stopPropagation();
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;
        const initialStock = parseInt(product.stock) || 0;
        const itemsInCart = carrito.filter(id => id === productId).length;
        if (itemsInCart >= initialStock) {
            showToast(`Stock máximo alcanzado (${initialStock} unidades).`, 'info');
            return;
        }
        carrito.push(productId);
        saveCartAndRefreshVisuals();
        showToast(`${product.nombre} agregado.`, 'success');
    };
    
    window.increaseQuantityInCheckout = (productId) => window.addToCart(productId, null);
    window.decreaseQuantityInCheckout = (productId) => {
        const itemIndex = carrito.lastIndexOf(productId);
        if (itemIndex > -1) carrito.splice(itemIndex, 1);
        saveCartAndRefreshVisuals();
    };

    function saveCartAndRefreshVisuals() {
        localStorage.setItem('newCart', JSON.stringify(carrito));
        const groupedCart = getGroupedCart();
        updateCartVisuals(groupedCart);
        renderCartInCheckoutModal(groupedCart);
        renderAllProducts(); 
    }

    function getGroupedCart() {
        const grouped = carrito.reduce((acc, id) => {
            if (!acc[id]) {
                const productData = allProducts.find(p => p.id === id);
                if (!productData) return acc; 
                acc[id] = { ...productData, quantity: 0 };
            }
            acc[id].quantity++;
            return acc;
        }, {});
        
        // Recalculate price based on final quantity
        for(const id in grouped) {
            const item = grouped[id];
            item.precioFinal = calculateItemPrice(item, item.quantity);
        }
        return grouped;
    }

    function updateCartVisuals(groupedCart) {
        const subtotal = Object.values(groupedCart).reduce((sum, item) => {
            return sum + (item.precioFinal * item.quantity);
        }, 0);
        const total = subtotal + deliveryCost;
        const format = (val) => `$${val.toLocaleString('es-CL')}`;
        totalPedidoDisplay.innerText = format(subtotal);
        summarySubtotal.innerText = format(subtotal);
        summaryDelivery.innerText = format(deliveryCost);
        summaryTotal.innerText = format(total);
    }

    function renderCartInCheckoutModal(groupedCart) {
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
                        <p class="text-sm text-gray-400">${data.quantity} x $${data.precioFinal.toLocaleString('es-CL')} c/u</p>
                        <p class="text-sm text-yellow-400 font-bold">Total: $${itemTotal.toLocaleString('es-CL')}</p>
                    </div>
                    <div class="flex items-center gap-3"><button onclick="window.decreaseQuantityInCheckout('${id}')" class="w-8 h-8 bg-gray-600 rounded-full font-bold">-</button><span class="font-bold text-lg">${data.quantity}</span><button onclick="window.increaseQuantityInCheckout('${id}')" class="w-8 h-8 bg-gray-600 rounded-full font-bold">+</button></div>
                </div>`;
        }
    }

    verPedidoBtn.addEventListener('click', () => {
        deliveryCost = document.querySelector('input[name="delivery-option"]:checked').value === 'otro' ? DELIVERY_COST : 0;
        saveCartAndRefreshVisuals(); // Recalculates everything before showing
        checkoutModal.classList.remove('hidden');
    });
    closeModalBtn.addEventListener('click', () => checkoutModal.classList.add('hidden'));

    sendWhatsappBtn.addEventListener('click', async () => {
        const grouped = getGroupedCart();
        if (Object.keys(grouped).length === 0) return alert("Tu carrito está vacío.");
        const name = checkoutName.value.trim();
        const phone = checkoutPhone.value.trim();
        if (!name || !phone || phone.length < 12) return alert("Por favor, completa tu Nombre y Teléfono de WhatsApp válido (+569...).");
        const deliveryOption = document.querySelector('input[name="delivery-option"]:checked').value;
        const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
        const observations = checkoutObservations.value.trim();
        try {
            const batch = writeBatch(db);
            const subtotal = Object.values(grouped).reduce((s, i) => s + (i.precioFinal * i.quantity), 0);
            const total = subtotal + deliveryCost;
            Object.values(grouped).forEach(item => {
                const productRef = doc(db, "productos", item.id);
                const newStock = (parseInt(item.stock) || 0) - item.quantity;
                batch.update(productRef, { stock: newStock });
            });
            const orderRef = doc(collection(db, "pedidos_completos"));
            batch.set(orderRef, { customerName: name, customerPhone: phone, items: Object.values(grouped).map(i => ({id: i.id, nombre: i.nombre, quantity: i.quantity, precioFinal: i.precioFinal})), subtotal, deliveryCost, total, deliveryOption, paymentMethod, observations, createdAt: serverTimestamp(), status: 'Pendiente' });
            await batch.commit();
            let msg = `*-- NUEVO PEDIDO EXPRESS FAENA --*\n\n*CLIENTE:* ${name}\n*TELÉFONO:* ${phone}\n\n*PRODUCTOS:*\n${Object.values(grouped).map(item => `• ${item.quantity}x ${item.nombre} ($${item.precioFinal.toLocaleString('es-CL')} c/u)`).join('\n')}\n\n*ENTREGA:* ${deliveryOption === 'faena' ? 'En Faena' : 'Otra Dirección'}\n*PAGO:* ${paymentMethod}\n${observations ? `*OBS:* ${observations}\n` : ''}\n--------------------\n*Subtotal:* $${subtotal.toLocaleString('es-CL')}\n*Delivery:* $${deliveryCost.toLocaleString('es-CL')}\n*💰 TOTAL:* $${total.toLocaleString('es-CL')}`;
            window.open(`https://wa.me/${ADMIN_PHONE_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
            carrito = [];
            checkoutName.value = '';
            checkoutObservations.value = '';
            checkoutModal.classList.add('hidden');
            saveCartAndRefreshVisuals();
        } catch (error) {
            console.error("Error procesando el pedido: ", error);
            alert("Hubo un problema al procesar tu pedido. Por favor, inténtalo de nuevo.");
        }
    });
    document.querySelectorAll('input[name="delivery-option"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            deliveryCost = e.target.value === 'otro' ? DELIVERY_COST : 0;
            saveCartAndRefreshVisuals();
        });
    });

    function showToast(message, type = 'info', duration = 3000) {
        const container = get('toast-container-manual');
        if (!container) return;
        const toast = document.createElement('div');
        const types = { success: 'bg-green-500 text-white', info: 'bg-yellow-400 text-black' };
        toast.className = `flex items-center gap-2 p-3 rounded-lg shadow-lg transform transition-all duration-300 -translate-y-20 opacity-0 ${types[type]}`;
        toast.innerHTML = `<i class="fas fa-check-circle"></i><span class="font-semibold">${message}</span>`;
        container.appendChild(toast);
        toast.getBoundingClientRect();
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
        setTimeout(() => {
            toast.style.transform = '-translate-y-20';
            toast.style.opacity = '0';
            toast.addEventListener('transitionend', () => toast.remove());
        }, duration);
    }
    window.showToast = showToast;

    sendSuggestionBtn.addEventListener('click', async () => {
        const input = get('input-sugerencia');
        if (!input.value.trim()) return;
        try {
            await addDoc(collection(db, "sugerencias"), { texto: input.value.trim(), createdAt: serverTimestamp() });
            showToast('¡Gracias por tu sugerencia!', 'success');
            input.value = '';
        } catch (e) { showToast('Error al enviar sugerencia.', 'info'); }
    });
    
    closeProductModalBtn.addEventListener('click', window.closeProductModal);
    productModal.addEventListener('click', (e) => { if (e.target === productModal) window.closeProductModal(); });

    // Initial Load
    const initialGroupedCart = getGroupedCart();
    updateCartVisuals(initialGroupedCart);
    renderCartInCheckoutModal(initialGroupedCart);
});
