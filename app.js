
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
let carrito = JSON.parse(localStorage.getItem('cart')) || [];

// --- DOM ELEMENTS ---
const catalogoGrid = document.getElementById('catalogo');
const totalCarritoDisplay = document.getElementById('total-carrito');
const cartModal = document.getElementById('cart-modal');
const cartItemsContainer = document.getElementById('cart-items');
const pedidoEspecialTextarea = document.getElementById('pedido-especial');
const sugerenciaInput = document.getElementById('input-sugerencia');
const sugerenciaNotification = document.getElementById('sugerencia-notification');
const headerMessagesContainer = document.getElementById('header-messages');
const productDetailModal = document.getElementById('product-detail-modal');
const mediaCarousel = document.getElementById('media-carousel');
const carouselIndicators = document.getElementById('carousel-indicators');
const detailProductName = document.getElementById('detail-product-name');
const detailProductPrice = document.getElementById('detail-product-price');

// --- HEADER MESSAGES ---
function manageHeaderMessages() {
    const q = query(collection(db, "mensajes"), where("active", "==", true));
    onSnapshot(q, (snapshot) => {
        const activeMessages = snapshot.docs.map(doc => doc.data().text);
        if (!headerMessagesContainer) return;

        headerMessagesContainer.innerHTML = ''; // Clear previous messages
        let currentMessageIndex = 0;

        if (activeMessages.length === 0) {
            headerMessagesContainer.innerHTML = `<p class="text-[10px] bg-black text-white px-2 py-0.5 rounded-full w-max mx-auto font-bold uppercase tracking-widest">Entrega Mañana 08:00 AM</p>`;
            return;
        }

        if (activeMessages.length === 1) {
            headerMessagesContainer.innerHTML = `<p class="text-[10px] bg-black text-white px-2 py-0.5 rounded-full w-max mx-auto font-bold uppercase tracking-widest">${activeMessages[0]}</p>`;
            return;
        }

        // Cycle through messages if more than one
        const displayMessage = () => {
            const messageP = document.createElement('p');
            messageP.className = 'text-[10px] bg-black text-white px-2 py-0.5 rounded-full w-max mx-auto font-bold uppercase tracking-widest';
            messageP.textContent = activeMessages[currentMessageIndex];
            
            headerMessagesContainer.innerHTML = '';
            headerMessagesContainer.appendChild(messageP);
            messageP.classList.add('fade-in');

            setTimeout(() => {
                messageP.classList.remove('fade-in');
                messageP.classList.add('fade-out');
            }, 4500); // Start fade out before next message

            currentMessageIndex = (currentMessageIndex + 1) % activeMessages.length;
        };

        displayMessage(); // Show first message immediately
        setInterval(displayMessage, 5000);
    });
}

// --- PRODUCT LOADING ---
async function loadProducts() {
    if (!catalogoGrid) return;
    try {
        const snap = await getDocs(collection(db, "productos"));
        catalogoGrid.innerHTML = "";
        snap.forEach(doc => {
            const p = doc.data();
            const productId = doc.id;
            const thumbnailUrl = (p.images && p.images.length > 0) ? p.images[0] : 'https://via.placeholder.com/150';

            catalogoGrid.innerHTML += `
                <div class="bg-white rounded-2xl shadow-md p-4 flex flex-col items-center text-center">
                    <img src="${thumbnailUrl}" 
                         alt="${p.nombre}" 
                         class="w-full h-28 object-cover rounded-lg mb-3 cursor-pointer shadow-sm"
                         onclick="showProductDetail('${productId}')">
                    <h4 class="text-sm font-bold text-gray-800 leading-tight">${p.nombre}</h4>
                    <p class="text-lg font-black text-gray-900 mt-1">$${p.precio.toLocaleString('es-CL')}</p>
                     <div class="flex gap-2 w-full mt-3">
                        <button onclick="showProductDetail('${productId}')" class="bg-gray-200 w-1/2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide active:scale-95 transition-transform shadow-sm">Ver</button>
                        <button onclick="addToCart('${p.nombre}', ${p.precio})" class="bg-[#facc15] w-1/2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide active:scale-95 transition-transform shadow-sm">Agregar</button>
                    </div>
                </div>
            `;
        });
    } catch (e) {
        catalogoGrid.innerHTML = "<p class='col-span-2 text-center text-red-500'>Error de conexión al cargar productos.</p>";
        console.error(e);
    }
}

// --- PRODUCT DETAIL MODAL --- 
window.showProductDetail = async (productId) => {
    const docRef = doc(db, "productos", productId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const product = docSnap.data();
        
        detailProductName.textContent = product.nombre;
        detailProductPrice.textContent = `$${product.precio.toLocaleString('es-CL')}`;
        
        let mediaItems = [];
        if (product.video) {
            mediaItems.push({ type: 'video', src: product.video });
        }
        if (product.images) {
            mediaItems = [...mediaItems, ...product.images.map(img => ({ type: 'image', src: img }))];
        }

        mediaCarousel.innerHTML = '';
        carouselIndicators.innerHTML = '';
        
        mediaItems.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = `carousel-item ${index === 0 ? 'active' : ''}`;
            itemDiv.style.opacity = index === 0 ? '1' : '0'; // Animation style

            if (item.type === 'video') {
                itemDiv.innerHTML = `<video controls class="w-full h-auto rounded-t-2xl"><source src="${item.src}" type="video/mp4"></video>`;
            } else {
                itemDiv.innerHTML = `<img src="${item.src}" class="w-full h-auto rounded-t-2xl">`;
            }
            mediaCarousel.appendChild(itemDiv);

            const indicator = document.createElement('button');
            indicator.className = `w-3 h-3 rounded-full ${index === 0 ? 'bg-black' : 'bg-gray-300'}`;
            indicator.onclick = () => showMediaItem(index);
            carouselIndicators.appendChild(indicator);
        });

        productDetailModal.classList.remove('hidden');
    }
};

window.hideProductDetail = () => {
    productDetailModal.classList.add('hidden');
    // Stop any playing video when closing the modal
    const video = mediaCarousel.querySelector('video');
    if (video) {
        video.pause();
    }
};

window.showMediaItem = (index) => {
    const items = mediaCarousel.querySelectorAll('.carousel-item');
    const indicators = carouselIndicators.querySelectorAll('button');

    items.forEach((item, i) => {
        item.style.opacity = i === index ? '1' : '0';
    });

    indicators.forEach((indicator, i) => {
        indicator.className = `w-3 h-3 rounded-full ${i === index ? 'bg-black' : 'bg-gray-300'}`;
    });
};

// --- CART LOGIC ---
window.addToCart = (nombre, precio) => {
    carrito.push({ nombre, precio });
    saveCartAndRefresh();
};

window.increaseQuantity = (nombre) => {
    const item = carrito.find(p => p.nombre === nombre);
    if (item) {
        carrito.push({ nombre: item.nombre, precio: item.precio });
    }
    saveCartAndRefresh();
};

window.decreaseQuantity = (nombre) => {
    const itemIndex = carrito.findIndex(p => p.nombre === nombre);
    if (itemIndex > -1) {
        carrito.splice(itemIndex, 1);
    }
    saveCartAndRefresh();
};

function saveCartAndRefresh() {
    localStorage.setItem('cart', JSON.stringify(carrito));
    updateTotal();
    renderCart();
}

function updateTotal() {
    const total = carrito.reduce((sum, item) => sum + item.precio, 0);
    totalCarritoDisplay.innerText = `$${total.toLocaleString('es-CL')}`;
}

function getGroupedCart() {
    return carrito.reduce((acc, item) => {
        if (!acc[item.nombre]) {
            acc[item.nombre] = {
                precio: item.precio,
                quantity: 0
            };
        }
        acc[item.nombre].quantity++;
        return acc;
    }, {});
}

// --- UI RENDERING & INTERACTIONS ---
function renderCart() {
    const groupedCart = getGroupedCart();
    cartItemsContainer.innerHTML = "";

    if (Object.keys(groupedCart).length === 0) {
        cartItemsContainer.innerHTML = "<p class='text-center text-gray-500'>Tu carrito está vacío.</p>";
        return;
    }

    for (const [nombre, data] of Object.entries(groupedCart)) {
        cartItemsContainer.innerHTML += `
            <div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <div>
                    <p class="font-bold">${nombre}</p>
                    <p class="text-sm text-gray-600">$${(data.precio * data.quantity).toLocaleString('es-CL')}</p>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="decreaseQuantity('${nombre}')" class="w-8 h-8 bg-gray-200 rounded-full font-bold text-lg">-</button>
                    <span class="font-bold text-lg">${data.quantity}</span>
                    <button onclick="increaseQuantity('${nombre}')" class="w-8 h-8 bg-gray-200 rounded-full font-bold text-lg">+</button>
                </div>
            </div>
        `;
    }
}

window.showCart = () => {
    renderCart();
    cartModal.classList.remove('hidden');
};

window.hideCart = () => {
    cartModal.classList.add('hidden');
};

window.enviarSugerencia = async () => {
    const val = sugerenciaInput.value.trim();
    if (!val) return;
    try {
        await addDoc(collection(db, "sugerencias"), { item: val, date: serverTimestamp() });
        sugerenciaInput.value = "";
        sugerenciaNotification.classList.remove('hidden');
        setTimeout(() => {
            sugerenciaNotification.classList.add('hidden');
        }, 3000);
    } catch (e) {
        alert("No se pudo enviar la sugerencia. Intenta de nuevo.");
        console.error(e);
    }
};

window.enviarWhatsApp = () => {
    const groupedCart = getGroupedCart();
    const esp = pedidoEspecialTextarea.value.trim();

    if (Object.keys(groupedCart).length === 0 && !esp) {
        return alert("Tu carrito está vacío.");
    }

    let msg = "👷‍♂️ *NUEVO PEDIDO FAENA*\n\n";

    for (const [name, data] of Object.entries(groupedCart)) {
        msg += `• ${data.quantity}x ${name}\n`;
    }

    if (esp) {
        msg += `\n🎁 *ESPECIAL:* ${esp}\n`;
    }

    const total = carrito.reduce((s, i) => s + i.precio, 0);
    msg += `\n💰 *TOTAL: $${total.toLocaleString('es-CL')}*`;
    msg += `\n\n🏦 *PAGO: CUENTA RUT 28.805.519-K*`;

    // Open WhatsApp
    window.open(`https://wa.me/56966840210?text=${encodeURIComponent(msg)}`);
    
    // Clear cart and UI
    carrito = [];
    pedidoEspecialTextarea.value = "";
    saveCartAndRefresh();
    hideCart();
};


// --- INITIAL LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    updateTotal();
    manageHeaderMessages();
});
