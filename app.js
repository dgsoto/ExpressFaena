
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
    const summaryDelivery = get('summary-delivery');
    const summaryTotal = get('summary-total');
    const sendWhatsappBtn = get('send-whatsapp-btn');

    // --- CARGA DE DATOS DE FIREBASE ---
    onSnapshot(collection(db, "productos"), (snapshot) => {
        allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(p => !p.estado || p.estado === 'activo');
        renderAllProducts();
    });
    onSnapshot(collection(db, "mensajes"), (snapshot) => {
        // Obtenemos solo los mensajes que están activos y su texto
        const activeMessages = snapshot.docs
            .map(doc => doc.data())
            .filter(data => data.active === true && data.text)
            .map(data => data.text);

        // Limpiamos cualquier intervalo anterior para evitar múltiples rotaciones si Firebase se actualiza
        if (window.messageTickerInterval) {
            clearInterval(window.messageTickerInterval);
        }

        if (activeMessages.length === 0) {
            // Si no hay mensajes, se oculta
            messageTickerContainer.style.display = 'none';
        } else if (activeMessages.length === 1) {
            // Si hay un solo mensaje, se muestra estático (sin transición)
            messageTickerContainer.style.display = 'block';
            messageTickerContainer.classList.remove('fade-out');
            messageTickerContainer.innerHTML = activeMessages[0];
        } else {
            // Si hay 2 o más, rotan cada 5 segundos
            messageTickerContainer.style.display = 'block';
            let i = 0;
            messageTickerContainer.innerHTML = activeMessages[i];
            messageTickerContainer.classList.remove('fade-out');

            window.messageTickerInterval = setInterval(() => {
                // 1. Iniciamos Fade Out
                messageTickerContainer.classList.add('fade-out');

                // 2. Esperamos a que la opacidad llegue a 0 (0.5s según index.html)
                setTimeout(() => {
                    // Cambiamos el texto estando invisible
                    i = (i + 1) % activeMessages.length;
                    messageTickerContainer.innerHTML = activeMessages[i];

                    // 3. Iniciamos Fade In quitando la clase fade-out
                    messageTickerContainer.classList.remove('fade-out');
                }, 500);

            }, 5000);
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

        // Initialize carousels after adding to DOM
        setTimeout(() => { if (window.initCarousels) window.initCarousels(); }, 100);
    }

    window.initCarousels = function () {
        document.querySelectorAll('.carousel-container').forEach(container => {
            if (container.dataset.initialized) return;
            container.dataset.initialized = 'true';

            const track = container.querySelector('.carousel-track');
            const slides = container.querySelectorAll('.carousel-slide');
            const dots = container.querySelectorAll('.carousel-dot');
            const prevBtn = container.querySelector('.carousel-button.prev');
            const nextBtn = container.querySelector('.carousel-button.next');

            if (!track || slides.length <= 1) return;

            let currentIndex = 0;
            let slideInterval;

            const updateCarousel = () => {
                track.style.transform = `translateX(-${currentIndex * 100}%)`;
                dots.forEach((dot, index) => {
                    dot.classList.toggle('active', index === currentIndex);
                });

                // Mute/pause all videos
                slides.forEach((slide, index) => {
                    const video = slide.querySelector('video');
                    if (video) {
                        if (index === currentIndex) {
                            video.play().catch(e => console.log('Autoplay prevented', e));
                        } else {
                            video.pause();
                        }
                    }
                });
            };

            const nextSlide = () => {
                currentIndex = (currentIndex + 1) % slides.length;
                updateCarousel();
            };

            const prevSlide = () => {
                currentIndex = (currentIndex - 1 + slides.length) % slides.length;
                updateCarousel();
            };

            const startInterval = () => {
                stopInterval();
                slideInterval = setInterval(nextSlide, 4000); // 4 seconds interval
            };

            const stopInterval = () => {
                if (slideInterval) clearInterval(slideInterval);
            };

            if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); prevSlide(); startInterval(); });
            if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); nextSlide(); startInterval(); });

            dots.forEach((dot, index) => {
                dot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    currentIndex = index;
                    updateCarousel();
                    startInterval();
                });
            });

            // Handle swipe/touch events for mobile
            let touchStartX = 0;
            let touchEndX = 0;

            container.addEventListener('touchstart', e => {
                touchStartX = e.changedTouches[0].screenX;
                stopInterval();
            }, { passive: true });

            container.addEventListener('touchend', e => {
                touchEndX = e.changedTouches[0].screenX;
                if (touchStartX - touchEndX > 50) nextSlide();
                if (touchEndX - touchStartX > 50) prevSlide();
                startInterval();
            }, { passive: true });

            updateCarousel();
            startInterval();
        });
    };

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

        let mediaItems = [];
        if (p.video) mediaItems.push({ type: 'video', src: p.video });
        if (p.images && p.images.length > 0) p.images.forEach(img => mediaItems.push({ type: 'image', src: img }));
        if (mediaItems.length === 0) mediaItems.push({ type: 'image', src: 'https://via.placeholder.com/150' });

        let mediaHTML = '';
        if (mediaItems.length === 1) {
            const item = mediaItems[0];
            if (item.type === 'video') {
                mediaHTML = `<video src="${item.src}" class="w-full h-32 object-cover" autoplay muted loop playsinline></video>`;
            } else {
                mediaHTML = `<img src="${item.src}" alt="Imagen de ${p.nombre}" class="w-full h-32 object-contain">`;
            }
        } else {
            const slidesHTML = mediaItems.map(item => {
                if (item.type === 'video') {
                    return `<div class="carousel-slide bg-black"><video src="${item.src}" class="w-full h-full object-cover" autoplay muted loop playsinline></video></div>`;
                } else {
                    return `<div class="carousel-slide bg-white"><img src="${item.src}" alt="Imagen" class="w-full h-full object-contain"></div>`;
                }
            }).join('');

            const dotsHTML = mediaItems.map((_, i) => `<div class="carousel-dot ${i === 0 ? 'active' : ''} shadow-md border border-gray-400"></div>`).join('');

            mediaHTML = `
                <div class="carousel-container h-32 w-full">
                    <div class="carousel-track">
                        ${slidesHTML}
                    </div>
                    <button class="carousel-button prev rounded-r-lg rounded-l-none !w-6 !h-8 !p-0 shadow-md"><i class="fas fa-chevron-left text-xs"></i></button>
                    <button class="carousel-button next rounded-l-lg rounded-r-none !w-6 !h-8 !p-0 shadow-md"><i class="fas fa-chevron-right text-xs"></i></button>
                    <div class="carousel-dots">
                        ${dotsHTML}
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="relative w-full cursor-pointer bg-white rounded-t-2xl overflow-hidden" onclick="window.openProductModal('${p.id}')">
                ${mediaHTML}
                ${badgesContainerHTML}
                ${isOutOfStock ? '<div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30"><span class="text-white font-bold text-lg">AGOTADO</span></div>' : ''}
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

        if (mediaItems.length === 1) {
            const item = mediaItems[0];
            if (item.type === 'video') {
                productMediaContainer.innerHTML = `<div class="w-full h-full bg-black flex items-center justify-center rounded-t-xl"><video src="${item.src}" controls autoplay playsinline class="max-w-full max-h-full"></video></div>`;
            } else {
                productMediaContainer.innerHTML = `<div class="w-full h-full bg-white flex items-center justify-center rounded-t-xl"><img src="${item.src}" alt="Imagen" class="max-w-full max-h-full object-contain"></div>`;
            }
        } else {
            const slidesHTML = mediaItems.map(item => {
                if (item.type === 'video') {
                    return `<div class="carousel-slide bg-black"><video src="${item.src}" controls autoplay playsinline class="w-full h-full object-contain"></video></div>`;
                } else {
                    return `<div class="carousel-slide bg-white"><img src="${item.src}" alt="Imagen" class="w-full h-full object-contain"></div>`;
                }
            }).join('');

            const dotsHTML = mediaItems.map((_, i) => `<div class="carousel-dot ${i === 0 ? 'active' : ''} shadow-md border border-gray-400"></div>`).join('');

            productMediaContainer.innerHTML = `
                <div class="carousel-container h-full w-full rounded-t-xl">
                    <div class="carousel-track">
                        ${slidesHTML}
                    </div>
                    <button class="carousel-button prev rounded-r-xl rounded-l-none"><i class="fas fa-chevron-left"></i></button>
                    <button class="carousel-button next rounded-l-xl rounded-r-none"><i class="fas fa-chevron-right"></i></button>
                    <div class="carousel-dots">
                        ${dotsHTML}
                    </div>
                </div>
             `;
            setTimeout(() => { if (window.initCarousels) window.initCarousels(); }, 100);
        }

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
            if (hasDiscount) {
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
        for (const id in grouped) {
            const item = grouped[id];
            item.precioFinal = calculateItemPrice(item, item.quantity);
        }
        return grouped;
    }

    function updateCartVisuals(groupedCart) {
        const subtotal = Object.values(groupedCart).reduce((sum, item) => {
            return sum + (item.precioFinal * item.quantity);
        }, 0);
        let total = subtotal + deliveryCost;
        const currentPaymentMethod = document.querySelector('input[name="payment-method"]:checked');
        if (currentPaymentMethod && currentPaymentMethod.value === 'Link Mercado Pago') {
            total = Math.ceil(total * 1.04);
        }
        const format = (val) => `$${val.toLocaleString('es-CL')}`;
        totalPedidoDisplay.innerText = format(subtotal);
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
        if (Object.keys(grouped).length === 0) return showToast("Tu carrito está vacío.", "error");
        const name = checkoutName.value.trim();
        const phone = checkoutPhone.value.trim();
        if (!name || !phone || phone.length < 12) return showToast("Por favor, completa tu Nombre y Teléfono de WhatsApp válido (+569...).", "error");
        const deliveryOption = document.querySelector('input[name="delivery-option"]:checked').value;
        const customAddress = deliveryOption === 'otro' ? (get('custom-address')?.value.trim() || '') : '';
        if (deliveryOption === 'otro' && !customAddress) return showToast("Por favor, ingresa la dirección exacta de entrega.", "error");

        const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
        const observations = checkoutObservations.value.trim();

        let extraPaymentInfo = "";
        let finalPaymentMethodStr = paymentMethod;

        if (paymentMethod === 'Transferencia') {
            const transferBank = document.querySelector('input[name="transfer-bank"]:checked').value;
            finalPaymentMethodStr = `Transferencia (${transferBank})`;
            if (transferBank === 'Banco Estado') {
                extraPaymentInfo = `\n\n*Datos para Transferencia (Banco Estado)*\nNombre: Diego Gonzales Soto\nRUT: 28.805.519-K\nBanco: BancoEstado\nTipo de cuenta: Cuenta Corriente\nN° de cuenta: 1700093367`;
            } else {
                extraPaymentInfo = `\n\n*Datos para Transferencia (Mercado Pago)*\nNombre: Diego Gonzales Soto\nRUT: 28.805.519-K\nTipo de cuenta: Cuenta Vista\nN° de cuenta: 1166287302`;
            }
        } else if (paymentMethod === 'Link Mercado Pago') {
            extraPaymentInfo = `\n\n*Link de Pago:*\nlink.mercadopago.cl/expressfaena`;
        }

        try {
            const batch = writeBatch(db);
            const subtotal = Object.values(grouped).reduce((s, i) => s + (i.precioFinal * i.quantity), 0);
            let total = subtotal + deliveryCost;
            if (paymentMethod === 'Link Mercado Pago') {
                total = Math.ceil(total * 1.04);
            }
            Object.values(grouped).forEach(item => {
                const productRef = doc(db, "productos", item.id);
                const newStock = (parseInt(item.stock) || 0) - item.quantity;
                batch.update(productRef, { stock: newStock });
            });
            const orderRef = doc(collection(db, "pedidos_completos"));
            batch.set(orderRef, { customerName: name, customerPhone: phone, items: Object.values(grouped).map(i => ({ id: i.id, nombre: i.nombre, quantity: i.quantity, precioFinal: i.precioFinal })), subtotal, deliveryCost, total, deliveryOption, deliveryAddress: customAddress, paymentMethod: finalPaymentMethodStr, observations, createdAt: serverTimestamp(), status: 'Pendiente' });
            await batch.commit();
            let msg = `*-- NUEVO PEDIDO EXPRESS FAENA --*\n\n*CLIENTE:* ${name}\n*TELÉFONO:* ${phone}\n\n*PRODUCTOS:*\n${Object.values(grouped).map(item => `• ${item.quantity}x ${item.nombre} ($${item.precioFinal.toLocaleString('es-CL')} c/u)`).join('\n')}\n\n*ENTREGA:* ${deliveryOption === 'faena' ? 'En Faena' : `Otra Dirección (${customAddress})`}\n*PAGO:* ${finalPaymentMethodStr}\n${observations ? `*OBS:* ${observations}\n` : ''}\n--------------------\n*Delivery:* $${deliveryCost.toLocaleString('es-CL')}\n*💰 TOTAL:* $${total.toLocaleString('es-CL')}${extraPaymentInfo}`;
            window.open(`https://wa.me/${ADMIN_PHONE_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
            carrito = [];
            checkoutName.value = '';
            checkoutObservations.value = '';
            checkoutModal.classList.add('hidden');
            saveCartAndRefreshVisuals();
        } catch (error) {
            console.error("Error procesando el pedido: ", error);
            showToast("Hubo un problema al procesar tu pedido. Por favor, inténtalo de nuevo.", "error");
        }
    });
    const customAddressInput = get('custom-address');
    document.querySelectorAll('input[name="delivery-option"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            deliveryCost = e.target.value === 'otro' ? DELIVERY_COST : 0;
            if (e.target.value === 'otro') {
                customAddressInput.classList.remove('hidden');
                customAddressInput.focus();
            } else {
                customAddressInput.classList.add('hidden');
                customAddressInput.value = '';
            }
            saveCartAndRefreshVisuals();
        });
    });

    const transferenciaOptions = get('transferencia-options');
    document.querySelectorAll('input[name="payment-method"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'Transferencia') {
                transferenciaOptions.classList.remove('hidden');
                transferenciaOptions.classList.add('flex');
            } else {
                transferenciaOptions.classList.add('hidden');
                transferenciaOptions.classList.remove('flex');
            }
            saveCartAndRefreshVisuals();
        });
    });

    function showToast(message, type = 'info', duration = 3000) {
        const container = get('toast-container-manual');
        if (!container) return;
        const toast = document.createElement('div');
        const types = { success: 'bg-green-500 text-white', info: 'bg-yellow-400 text-black', error: 'bg-red-500 text-white', warning: 'bg-orange-500 text-white' };
        const icons = { success: 'fa-check-circle', info: 'fa-info-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle' };
        const iconClass = icons[type] || 'fa-info-circle';
        toast.className = `flex items-center gap-2 p-3 rounded-lg shadow-lg transform transition-all duration-300 -translate-y-20 opacity-0 z-[100] ${types[type] || types.info}`;
        toast.innerHTML = `<i class="fas ${iconClass}"></i><span class="font-semibold">${message}</span>`;
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
        const sugerenciaTexto = input.value.trim();
        if (!sugerenciaTexto) return;
        try {
            await addDoc(collection(db, "sugerencias"), {
                texto: sugerenciaTexto,
                item: sugerenciaTexto,
                createdAt: serverTimestamp()
            });

            const feedbackEl = get('sugerencia-feedback');
            if (feedbackEl) {
                feedbackEl.innerHTML = `<i class="fa-solid fa-check-circle mr-1"></i> Sugerencia "${sugerenciaTexto}" recibida. ¡Gracias!`;
                feedbackEl.classList.remove('hidden');
                setTimeout(() => feedbackEl.classList.remove('opacity-0'), 10);
                setTimeout(() => {
                    feedbackEl.classList.add('opacity-0');
                    setTimeout(() => feedbackEl.classList.add('hidden'), 300);
                }, 4000);
            }
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
